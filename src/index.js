/**
 * 장편 소설 자율 집필 — 진입점 (LangGraph + go.md + novel 번들)
 */

import path from 'path';
import { REPO_ROOT } from './loadEnv.js';
import { buildGraph } from './graph.js';
import { readGoFile } from './goReader.js';
import { loadDesignBundle, augmentGoContent } from './designBundle.js';
import { loadNovelBundle, augmentNovelContent } from './novelBundle.js';
import { contextMonitor } from './contextMonitor.js';
import { writeGoProgress, getNextSessionNumber } from './goWriter.js';
import { launchNextSession } from './sessionLauncher.js';
import { getConfigSummary, getWorkerIterations } from './agentConfig.js';
import { HumanMessage } from '@langchain/core/messages';

async function main() {
  const goRaw = process.env.GO_FILE ?? './go.md';
  const goFilePath = path.isAbsolute(goRaw) ? goRaw : path.resolve(REPO_ROOT, goRaw);
  const autoRestart = process.env.AUTO_RESTART !== 'false';
  const recursionLimit = Number(process.env.RECURSION_LIMIT ?? 5000);

  const sessionNumber = await getNextSessionNumber(goFilePath);
  printBanner(sessionNumber);

  let goData;
  try {
    goData = await readGoFile(goFilePath);
  } catch (err) {
    console.error(`\n[ERROR] ${err.message}`);
    console.error('go.md 파일을 생성하거나 GO_FILE 환경변수를 올바른 경로로 설정하세요.');
    process.exit(1);
  }

  const skipDesignBundle = goData.userContent.includes('<!-- generated-from-design:');
  const designBundle = skipDesignBundle ? '' : await loadDesignBundle();
  const novelBundle = await loadNovelBundle({ cwd: process.cwd() });
  let augmentedGoContent = augmentGoContent(goData.userContent, designBundle);
  augmentedGoContent = augmentNovelContent(augmentedGoContent, novelBundle);

  console.log(`📄 go.md: ${goData.filePath}`);
  if (process.env.NOVEL_ROOT) {
    const nr = process.env.NOVEL_ROOT;
    console.log(`📁 NOVEL_ROOT: ${path.isAbsolute(nr) ? nr : path.resolve(REPO_ROOT, nr)}`);
  }
  if (process.env.DESIGN_DIR) {
    const dr = process.env.DESIGN_DIR;
    const d = path.isAbsolute(dr) ? dr : path.resolve(REPO_ROOT, dr);
    console.log(
      skipDesignBundle ? `📁 DESIGN_DIR: ${d} (본문은 go.md에 포함, 자동 번들 생략)` : `📁 DESIGN_DIR: ${d}`
    );
  }
  console.log(`📋 프로젝트: ${goData.title}`);
  console.log(`📝 전체 태스크: ${goData.tasks.length}개`);

  const previouslyCompleted = goData.completedTasks;
  if (previouslyCompleted.length > 0) {
    console.log(`\n[Resume] 이전 완료 태스크 (${previouslyCompleted.length}개):`);
    previouslyCompleted.forEach((t) => console.log(`   ✅ ${t}`));
  }

  const pendingTasks = goData.pendingTasks;

  if (pendingTasks.length === 0) {
    console.log('\n✅ go.md의 모든 태스크가 완료되었습니다.');
    console.log('   새로운 작업을 추가하려면 go.md를 수정하세요.');
    process.exit(0);
  }

  console.log(`\n📌 이번 세션 실행 태스크 (${pendingTasks.length}개):`);
  pendingTasks.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

  console.log(`\n⚙️  파이프라인: ${getConfigSummary()}`);
  console.log(`⚙️  AUTO_RESTART: ${autoRestart ? 'ON (완료/한도 후 새 세션 자동 시작)' : 'OFF'}`);
  console.log(`⚙️  Worker 반복: ${getWorkerIterations()}회`);
  console.log(`⚙️  컨텍스트 임계치: ${Math.round(Number(process.env.CONTEXT_THRESHOLD ?? 0.9) * 100)}%`);
  console.log(`⚙️  Recursion Limit: ${recursionLimit}\n`);
  console.log(`🚀 세션 ${sessionNumber} 시작\n`);

  const graph = buildGraph();

  const initialState = {
    messages: [
      new HumanMessage(
        `[세션 ${sessionNumber}] 장편 소설 자율 집필 시작.\n\n` +
          `전체 태스크:\n${goData.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n` +
          `이미 완료된 태스크: ${previouslyCompleted.join(', ') || '없음'}\n\n` +
          `이번 세션 실행 대상:\n` +
          pendingTasks.map((t, i) => `${i + 1}. ${t}`).join('\n') +
          '\n\n각 태스크를 순서대로 완료하세요.'
      ),
    ],
    goContent: augmentedGoContent,
    allTasks: goData.tasks,
    completedTasks: previouslyCompleted,
    pendingTasks,
  };

  const result = await graph.invoke(initialState, { recursionLimit });

  const finalCompleted = result.completedTasks ?? [];
  const finalPending = result.pendingTasks ?? [];
  const handoffTriggered = result.handoffTriggered ?? false;

  printResult({ handoffTriggered, finalCompleted, finalPending, changedFiles: result.changedFiles });

  const exitReason = handoffTriggered
    ? '컨텍스트 토큰 임계치 도달'
    : finalPending.length === 0
      ? '모든 태스크 완료'
      : '정상 종료';

  await writeGoProgress({
    goFilePath,
    completedTasks: finalCompleted,
    pendingTasks: finalPending,
    allTasks: goData.tasks,
    changedFiles: result.changedFiles ?? [],
    contextMonitor,
    exitReason,
    sessionNumber,
  });

  const hasMoreWork = finalPending.length > 0;

  if (hasMoreWork && autoRestart) {
    console.log(`\n[Main] 남은 태스크 ${finalPending.length}개 → 새 세션 자동 시작`);
    launchNextSession({ sessionNumber: sessionNumber + 1, delayMs: 3000 });
  } else if (!hasMoreWork) {
    console.log('\n🎉 go.md의 모든 태스크를 완료했습니다!');
    console.log('   `pnpm run stats` 로 원고 글자 수를 확인하세요.');
  } else {
    console.log('\n[Main] AUTO_RESTART=false — 자동 재시작 비활성화');
    console.log('   pnpm start를 다시 실행하면 남은 태스크를 이어서 진행합니다.');
  }
}

function printBanner(sessionNumber) {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log(`║   장편 소설 자율 집필 — 세션 ${String(sessionNumber).padEnd(19)}║`);
  console.log('║   go.md | LangGraph | novel-brain · manuscript ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
}

function printResult({ handoffTriggered, finalCompleted, finalPending, changedFiles }) {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  if (handoffTriggered) {
    console.log('║   ⚠️  컨텍스트 한도 도달 — go.md 기록 후 재시작   ║');
  } else if (finalPending.length === 0) {
    console.log('║   ✅ 모든 태스크 완료!                            ║');
  } else {
    console.log('║   🔄 사이클 종료 — go.md 기록 후 재시작          ║');
  }
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log('─── 컨텍스트 최종 사용량 ─────────────────────────');
  console.log('| AI     | 사용률     | 사용량                    |');
  console.log('|--------|------------|---------------------------|');
  console.log(contextMonitor.getSummary());

  console.log(`\n완료 태스크 (${finalCompleted.length}): ${finalCompleted.join(', ') || '없음'}`);
  console.log(`남은 태스크 (${finalPending.length}):   ${finalPending.join(', ') || '없음'}`);
  console.log(`변경 파일: ${(changedFiles ?? []).join(', ') || '없음'}`);
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
