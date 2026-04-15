/**
 * 장편 소설 자율 집필 — 진입점 (LangGraph + go.md + novel 번들)
 */

import fs from 'fs/promises';
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
import { validateDesignResultGoals } from './statsReport.js';

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
  augmentedGoContent = await appendConceptMd(augmentedGoContent);

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
    const goals = await validateDesignResultGoals(process.env.NOVEL_ROOT ?? '.');
    if (!goals.ok) {
      console.error(`\n[Main] 완료로 표시돼 있으나 측정 목표 미달: ${goals.summary}`);
      console.error('   go.md 진행 상황을 미완료로 되돌립니다. 이어서 `pnpm dev` 로 집필을 재개하세요.\n');
      await writeGoProgress({
        goFilePath,
        completedTasks: [],
        pendingTasks: goData.tasks,
        allTasks: goData.tasks,
        changedFiles: [],
        contextMonitor,
        exitReason: '측정 목표 미달 — 완료 표기 복구',
        sessionNumber,
      });
      process.exit(1);
    }
    console.log('\n✅ go.md의 모든 태스크가 완료되었고, 측정 목표도 충족됩니다.');
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

  const goals = await validateDesignResultGoals(process.env.NOVEL_ROOT ?? '.');

  let finalCompleted = result.completedTasks ?? [];
  let finalPending = result.pendingTasks ?? [];
  let revertedDueToGoals = false;

  if (finalPending.length === 0 && !goals.ok) {
    revertedDueToGoals = true;
    console.error(`\n[Main] 측정 목표 미달 — 세션에서 완료 처리된 태스크를 되돌립니다.\n   ${goals.summary}`);
    finalCompleted = previouslyCompleted;
    finalPending = goData.tasks.filter((t) => !previouslyCompleted.includes(t));
  }

  const handoffTriggered = result.handoffTriggered ?? false;

  printResult({
    handoffTriggered,
    finalCompleted,
    finalPending,
    changedFiles: result.changedFiles,
    revertedDueToGoals,
  });

  const exitReason = handoffTriggered
    ? '컨텍스트 토큰 임계치 도달'
    : revertedDueToGoals
      ? '측정 목표 미달 — 태스크 상태 되돌림'
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
  } else if (!hasMoreWork && !revertedDueToGoals) {
    console.log('\n🎉 go.md의 모든 태스크를 완료했습니다!');
    console.log('   `pnpm run stats` 로 result/NNNN.md 분량을 확인하세요.');
  } else if (revertedDueToGoals) {
    console.log('\n[Main] `pnpm dev` 또는 `pnpm start` 를 다시 실행해 남은 태스크를 이어서 진행하세요.');
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

function printResult({ handoffTriggered, finalCompleted, finalPending, changedFiles, revertedDueToGoals }) {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  if (handoffTriggered) {
    console.log('║   ⚠️  컨텍스트 한도 도달 — go.md 기록 후 재시작   ║');
  } else if (revertedDueToGoals) {
    console.log('║   ⚠️  측정 목표 미달 — 태스크 되돌림, 재실행 필요  ║');
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

/**
 * 루트 concept.md를 Worker 컨텍스트에 합친다. INCLUDE_CONCEPT_MD=false 로 끌 수 있다.
 */
async function appendConceptMd(base) {
  if (process.env.INCLUDE_CONCEPT_MD === 'false') return base;
  const rel = process.env.CONCEPT_FILE ?? 'concept.md';
  const p = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
  try {
    const text = await fs.readFile(p, 'utf-8');
    return `${base}\n\n---\n\n## concept.md (프로젝트 컨셉)\n\n${text}`;
  } catch {
    return base;
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
