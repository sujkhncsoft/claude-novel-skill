/**
 * WorkerAgent: 소설 집필 태스크 실행 (CLI 기반)
 */

import path from 'path';
import { AIMessage } from '@langchain/core/messages';
import { REPO_ROOT } from '../loadEnv.js';
import { withOllamaFallback } from '../cliRunner.js';
import { getAgentRunner } from '../agentConfig.js';
import { contextMonitor } from '../contextMonitor.js';
import { getCompletionKeyword } from '../goReader.js';
import { validateDesignResultGoals, hasResultChapterProgress } from '../statsReport.js';

function novelPreamble() {
  const novelRoot = process.env.NOVEL_ROOT ?? '';
  const targetMin = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  const perFileMin = Number(process.env.TARGET_MIN_PER_RESULT_FILE ?? 40_000);
  const chapterGuide = Number(process.env.TYPICAL_CHAPTER_CHARS ?? 10_000);
  const abs = novelRoot
    ? path.isAbsolute(novelRoot)
      ? novelRoot
      : path.resolve(REPO_ROOT, novelRoot)
    : '(NOVEL_ROOT 미설정 — 저장소 루트 기준)';

  return (
    `【집필·산출 모드 — 출판 목적 판타지 소설】\n` +
    `- 프로젝트 루트(NOVEL_ROOT): ${abs}\n` +
    `- 산출물은 **허구 소설 원고**다. 장르 총론·메타 분석·취향 백과가 아니다. 장면·대화·갈등이 본문을 이끈다.\n` +
    `- design/00-goals + 루트 \`concept.md\` 기준: \`result/0001.md\`, \`result/0002.md\` … (\`result/NNNN.md\`, N은 4자리 숫자)\n` +
    `- 전체 합계 최소 약 ${targetMin.toLocaleString()}자, 각 결과 파일 최소 약 ${perFileMin.toLocaleString()}자 (JS 문자열 길이)\n` +
    `- 장 단위 초안: \`manuscript/chapter-NNN.md\` (3자리), 챕터당 가이드 약 ${chapterGuide.toLocaleString()}자\n` +
    `- 집필 후 \`novel-brain.json\` plot/characterTracking 등을 갱신\n` +
    `- 한 번에 긴 출력이 어렵면 파일에 **추가·이어쓰기**로 나누어 저장\n\n`
  );
}

function isVerificationTask(name) {
  return /검증|npm\s*run\s*stats|\bstats\b/i.test(name);
}

function isWritingTask(name) {
  return /집필|작성/.test(name) && !isVerificationTask(name);
}

export async function workerAgentNode(state) {
  const { ai, run } = getAgentRunner('worker');
  const pendingTasks = state.pendingTasks ?? [];
  const completedTasks = state.completedTasks ?? [];
  const workerCount = (state.workerCount ?? 0) + 1;
  const workerIterations = Number(process.env.WORKER_ITERATIONS ?? 1);

  if (pendingTasks.length === 0) {
    console.log('[WorkerAgent] 남은 태스크 없음 → 건너뜀');
    return { messages: [], workerCount };
  }

  const currentTask = pendingTasks[0];
  const completionKeyword = getCompletionKeyword(currentTask);

  console.log(`\n[WorkerAgent] ${ai} CLI — 태스크 실행 (${workerCount}/${workerIterations} 회차)`);
  console.log(`[WorkerAgent] 현재 태스크: "${currentTask}"`);
  console.log(`[WorkerAgent] 완료 키워드: "${completionKeyword}"`);

  const recentContext = (state.messages ?? [])
    .slice(-4)
    .map((m) => {
      const role = m._getType?.() ?? m.type ?? 'message';
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${role}]: ${content.slice(0, 200)}`;
    })
    .join('\n');

  const prompt =
    novelPreamble() +
    `당신은 자율 실행 에이전트입니다.\n` +
    `현재 작업 디렉토리: ${process.cwd()}\n\n` +
    `─── go.md + 참조 번들 (전체 지시) ───\n` +
    `${state.goContent ?? '(내용 없음)'}\n` +
    `─────────────────────────────\n\n` +
    `완료된 태스크: ${completedTasks.join(', ') || '없음'}\n` +
    `현재 실행할 태스크: ${currentTask}\n\n` +
    `이전 작업 컨텍스트:\n${recentContext || '(없음)'}\n\n` +
    `임무:\n` +
    `1. 위 내용에서 "${currentTask}" 태스크를 수행하세요.\n` +
    `2. 실제 파일을 생성하거나 수정하는 작업이면 디스크에 반영하세요.\n` +
    `3. 작업이 끝나면 반드시 정확히 "${completionKeyword}" 라는 문구를 출력하세요.\n` +
    `4. 이전 태스크 결과물이 있으면 이어서 사용하세요.\n\n` +
    `지금 바로 태스크를 실행하세요.`;

  const { text: output, usedFallback } = await withOllamaFallback(run, ai, prompt);
  contextMonitor.update(usedFallback ? 'ollama' : ai, [{ content: output }], `${prompt}\n\n${output}`);

  const novelRoot = process.env.NOVEL_ROOT ?? '.';
  let isCompleted = false;

  if (isVerificationTask(currentTask)) {
    const v = await validateDesignResultGoals(novelRoot);
    isCompleted = v.ok;
    console.log(`[WorkerAgent] 측정 검증(npm run stats와 동일 기준): ${v.ok ? '통과' : '미달 — ' + v.summary}`);
  } else {
    const keywordMatch = output.toLowerCase().includes(completionKeyword.toLowerCase());
    if (isWritingTask(currentTask)) {
      const progress = await hasResultChapterProgress(novelRoot);
      isCompleted = Boolean(keywordMatch && progress.ok);
      if (!progress.ok) console.log(`[WorkerAgent] 집필 산출물: ${progress.reason}`);
      if (!keywordMatch) console.log(`[WorkerAgent] 완료 문구 미포함 — 정확히 "${completionKeyword}" 출력 필요`);
    } else {
      isCompleted = keywordMatch;
    }
  }

  const hitIterationCap = workerCount >= workerIterations;
  if (hitIterationCap && !isCompleted) {
    console.warn(
      `[WorkerAgent] WORKER_ITERATIONS(${workerIterations}) 소진 — 태스크를 완료로 넘기지 않습니다. .env에서 WORKER_ITERATIONS를 늘리거나 실제 파일을 채운 뒤 다시 실행하세요.`
    );
  }

  console.log(`[WorkerAgent] 출력 (앞 200자): ${output.slice(0, 200)}...`);
  console.log(`[WorkerAgent] 완료 감지: ${isCompleted}`);

  const filePattern = /(?:created?|wrote?|saved?|생성|저장|수정)\s*[:\s]*([^\s,\n]+\.[a-zA-Z0-9]+)/gi;
  const detectedFiles = [...output.matchAll(filePattern)].map((m) => m[1]);

  const newCompletedTasks = isCompleted ? [...completedTasks, currentTask] : completedTasks;

  const newPendingTasks = isCompleted ? pendingTasks.slice(1) : pendingTasks;

  if (isCompleted) {
    console.log(`[WorkerAgent] 태스크 완료: "${currentTask}"`);
    console.log(`[WorkerAgent] 남은 태스크: ${newPendingTasks.length}개`);
  }

  return {
    messages: [
      new AIMessage(
        `[WorkerAgent/${ai}] 태스크: "${currentTask}" (${workerCount}/${workerIterations} 회차)\n${output}`
      ),
    ],
    workerCount,
    completedTasks: newCompletedTasks,
    pendingTasks: newPendingTasks,
    changedFiles: [...(state.changedFiles ?? []), ...detectedFiles],
  };
}
