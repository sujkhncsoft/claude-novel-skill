/**
 * 에이전트별 AI CLI 설정
 */

import { runClaude, runCodex, runGemini } from './cliRunner.js';

const RUNNERS = {
  claude: runClaude,
  codex: runCodex,
  gemini: runGemini,
};

function normalizeAi(value, fallback) {
  const key = (value ?? fallback ?? '').toString().trim().toLowerCase();
  return RUNNERS[key] ? key : fallback;
}

export const agentAiConfig = {
  supervisor: normalizeAi(process.env.SUPERVISOR_AI, 'gemini'),
  worker: normalizeAi(process.env.WORKER_AI, 'claude'),
};

export function getAgentRunner(agent) {
  const ai = agentAiConfig[agent];
  const run = RUNNERS[ai];
  if (!run) {
    throw new Error(`지원하지 않는 AI 설정: ${agent}=${ai}`);
  }
  return { ai, run };
}

export function getWorkerIterations() {
  /** 한 태스크당 worker CLI 최대 호출 횟수(미완료 시 같은 태스크 유지). 기본 1은 거짓 완료를 유발하므로 상향 */
  return Number(process.env.WORKER_ITERATIONS ?? 12);
}

export function getConfigSummary() {
  return `supervisor(${agentAiConfig.supervisor}) → worker(${agentAiConfig.worker}) x${getWorkerIterations()}`;
}
