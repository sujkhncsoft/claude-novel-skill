/**
 * WorkerAgent: 소설 집필 태스크 실행 (CLI 기반)
 */

import path from 'path';
import { AIMessage } from '@langchain/core/messages';
import { withOllamaFallback } from '../cliRunner.js';
import { getAgentRunner } from '../agentConfig.js';
import { contextMonitor } from '../contextMonitor.js';
import { getCompletionKeyword } from '../goReader.js';

function novelPreamble() {
  const novelRoot = process.env.NOVEL_ROOT ?? '';
  const targetMin = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  const chapterGuide = Number(process.env.TYPICAL_CHAPTER_CHARS ?? 10_000);
  const abs = novelRoot ? path.resolve(process.cwd(), novelRoot) : '(NOVEL_ROOT 미설정)';

  return (
    `【소설 자율 집필 모드】\n` +
    `- 프로젝트 루트(NOVEL_ROOT): ${abs}\n` +
    `- 전체 목표: 원고 합계 최소 약 ${targetMin.toLocaleString()}자 (한글, JS 문자열 길이 기준)\n` +
    `- 챕터당 가이드: 약 ${chapterGuide.toLocaleString()}자 (태스크 설명에 따름)\n` +
    `- 원고 파일: \`manuscript/chapter-NNN.md\` (3자리 번호)\n` +
    `- 집필 후: \`novel-brain.json\` 의 plotTracking.structure, structureTracking 등을 갱신\n` +
    `- 이전 챕터와 인물/지명/시제/POV 일관성 유지. 아웃라인(03-plot)과 충돌하지 말 것.\n` +
    `- 한 태스크에서 한 번에 긴 API 출력이 어렵다면, 파일에 **추가/이어쓰기** 방식으로 분할해도 됨.\n\n`
  );
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

  const isCompleted =
    output.toLowerCase().includes(completionKeyword.toLowerCase()) ||
    output.includes('완료') ||
    output.includes('complete');

  const isIterationDone = workerCount >= workerIterations;

  console.log(`[WorkerAgent] 출력 (앞 200자): ${output.slice(0, 200)}...`);
  console.log(`[WorkerAgent] 완료 감지: ${isCompleted}, 반복 완료: ${isIterationDone}`);

  const filePattern = /(?:created?|wrote?|saved?|생성|저장|수정)\s*[:\s]*([^\s,\n]+\.[a-zA-Z0-9]+)/gi;
  const detectedFiles = [...output.matchAll(filePattern)].map((m) => m[1]);

  const newCompletedTasks = isCompleted || isIterationDone ? [...completedTasks, currentTask] : completedTasks;

  const newPendingTasks = isCompleted || isIterationDone ? pendingTasks.slice(1) : pendingTasks;

  if (isCompleted || isIterationDone) {
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
