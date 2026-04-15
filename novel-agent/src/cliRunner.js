/**
 * CLI Runner: 루트 scripts/lib/aiCli.js 와 동일 — 프롬프트는 임시 파일 → stdin 으로 전달
 */

import {
  runClaude as runClaudeAi,
  runCodex as runCodexAi,
  runGemini as runGeminiAi,
  runOllama as runOllamaAi,
} from '../../scripts/lib/aiCli.js';

const CWD = process.cwd();
const CLI_TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS ?? 600_000);

export function runClaude(prompt, timeoutMs = CLI_TIMEOUT_MS) {
  return runClaudeAi(prompt, CWD, timeoutMs);
}

export function runGemini(prompt, timeoutMs = CLI_TIMEOUT_MS) {
  return runGeminiAi(prompt, CWD, timeoutMs);
}

export function runCodex(prompt, timeoutMs = CLI_TIMEOUT_MS) {
  return runCodexAi(prompt, CWD, timeoutMs);
}

export function runOllama(prompt, timeoutMs = 300_000, model) {
  return runOllamaAi(prompt, timeoutMs, model);
}

export async function withOllamaFallback(primaryFn, label, prompt, timeoutMs) {
  try {
    const text = await primaryFn(prompt, timeoutMs);
    return { text, usedFallback: false };
  } catch (err) {
    console.warn(`[CLI] ${label} 실패 → Ollama 폴백: ${err.message}`);
    try {
      const text = await runOllama(prompt, timeoutMs);
      return { text, usedFallback: true };
    } catch (ollamaErr) {
      console.warn(`[Ollama] 폴백도 실패: ${ollamaErr.message} → 빈 응답으로 계속 진행`);
      return { text: '', usedFallback: true };
    }
  }
}
