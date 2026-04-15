/**
 * 루트 스크립트용 AI CLI (novel-agent/cliRunner 와 동일 패턴)
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { pipePromptFileToSpawn } from './promptPipe.js';

const CLI_TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS ?? 600_000);
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:12b';

const USAGE_LIMIT_PATTERNS = [
  /usage limit/i,
  /rate.?limit/i,
  /quota.?exceeded/i,
  /too many requests/i,
  /overloaded/i,
  /capacity exceeded/i,
  /billing/i,
  /out of credits/i,
  /insufficient_quota/i,
  /429/,
];

function hasUsageLimitError(text) {
  return USAGE_LIMIT_PATTERNS.some((p) => p.test(text));
}

function collectOutput(proc, label, timeoutMs, resolve, reject) {
  const stdoutChunks = [];
  const stderrChunks = [];

  proc.stdout.on('data', (d) => {
    process.stdout.write(d);
    stdoutChunks.push(d);
  });
  proc.stderr.on('data', (d) => {
    process.stderr.write(d);
    stderrChunks.push(d);
  });

  const timer = setTimeout(() => {
    proc.kill();
    reject(new Error(`[${label}] 타임아웃 (${timeoutMs / 1000}초)`));
  }, timeoutMs);

  proc.on('close', (code) => {
    clearTimeout(timer);
    const stdout = Buffer.concat(stdoutChunks).toString('utf8');
    const stderr = Buffer.concat(stderrChunks).toString('utf8');
    const out = stdout || stderr;
    if (code !== 0) {
      reject(new Error(`[${label}] 실패 (exit ${code}):\n${out.slice(0, 500)}`));
    } else if (hasUsageLimitError(out)) {
      reject(new Error(`[${label}] 사용량 초과 감지:\n${out.slice(0, 300)}`));
    } else {
      resolve(out);
    }
  });

  proc.on('error', (err) => {
    clearTimeout(timer);
    reject(err);
  });
}

/** Windows: 자식 프로세스·Node가 UTF-8 I/O 를 쓰도록 유도 */
function envWithWindowsUtf8(base) {
  const env = { ...base };
  if (process.platform !== 'win32') return env;
  env.PYTHONUTF8 = env.PYTHONUTF8 ?? '1';
  env.PYTHONIOENCODING = env.PYTHONIOENCODING ?? 'utf-8';
  return env;
}

/** IDE/배치 환경에서 npm / nvm / Node 가 PATH 에 빠진 경우 대비 (Windows) */
function envWithNpmGlobalPath(base) {
  const env = envWithWindowsUtf8({ ...base });
  if (process.platform !== 'win32') return env;
  const extra = [];
  if (env.NVM_SYMLINK) extra.push(env.NVM_SYMLINK);
  if (env.APPDATA) extra.push(path.join(env.APPDATA, 'npm'));
  if (env.LOCALAPPDATA) extra.push(path.join(env.LOCALAPPDATA, 'npm'));
  const pf = env.ProgramFiles || process.env.ProgramFiles;
  if (pf) extra.push(path.join(pf, 'nodejs'));
  if (extra.length === 0) return env;
  env.PATH = [...extra, env.PATH ?? ''].join(path.delimiter);
  return env;
}

/** 절대 경로 또는 `...\foo.cmd` 처럼 디렉터리를 포함하면 spawn 에 직접 사용 */
function looksLikeResolvedCli(cli) {
  if (!cli) return false;
  return path.isAbsolute(cli) || /[\\/]/.test(cli);
}

/** PATH 에 의존하지 않음 (IDE/최소 PATH 환경에서 spawn cmd.exe / powershell ENOENT 방지) */
function pathToWindowsPowerShellExe() {
  const root = process.env.SystemRoot || process.env.windir;
  if (root) {
    return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  }
  return 'powershell.exe';
}

function pathToWindowsCmdExe() {
  const root = process.env.SystemRoot || process.env.windir;
  if (root) {
    return path.join(root, 'System32', 'cmd.exe');
  }
  return 'cmd.exe';
}

/** `claude -p` 배치 실행 시 모델이 되묻지 않고 산출만 하도록 앞에 붙이는 지시 (YOLO) */
const DEFAULT_CLAUDE_YOLO_PREFIX =
  `[비대화형 파이프라인 / YOLO]\n` +
  `- 사용자에게 질문하거나 선택지·확인을 요청하지 마세요.\n` +
  `- 불명확하면 합리적으로 가정하고, 요청된 형식의 산출물만 즉시 완성하세요.\n` +
  `- "어떤 작업을 원하시나요?" 같은 메타 응답은 금지입니다.\n`;

/**
 * `CLAUDE_YOLO=0` 이면 접두 생략. `CLAUDE_YOLO_PREFIX` 로 전체 교체 가능(빈 문자열이면 접두 없음).
 * @param {string} prompt
 */
function applyClaudeYoloPrompt(prompt) {
  const off = process.env.CLAUDE_YOLO === '0' || process.env.CLAUDE_YOLO === 'false';
  if (off) return prompt;
  if (Object.prototype.hasOwnProperty.call(process.env, 'CLAUDE_YOLO_PREFIX')) {
    const p = process.env.CLAUDE_YOLO_PREFIX ?? '';
    return p.trim() === '' ? prompt : `${p.trimEnd()}\n\n${prompt}`;
  }
  return `${DEFAULT_CLAUDE_YOLO_PREFIX}\n${prompt}`;
}

/** Claude Code print 모드: 권한·출력 형식 (help: --permission-mode, --output-format) */
const CLAUDE_PRINT_EXTRA_ARGS = [
  '--dangerously-skip-permissions',
  '--permission-mode',
  'bypassPermissions',
  '--output-format',
  'text',
  '--no-session-persistence',
];

/**
 * Windows: pwdff workAgent.mjs 패턴 — 임시 md + PowerShell(ReadAllText → stdin 파이프).
 * `claude -p` 는 print 모드이며 프롬프트는 파이프로 전달하는 것이 안전합니다.
 */
async function runClaudeWindowsPowerShell(prompt, cwd, timeoutMs, env, configured) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'novel-ai-prompt-'));
  const tmpFile = path.join(dir, 'prompt.md');
  await fs.writeFile(tmpFile, prompt, 'utf8');

  const litFile = tmpFile.replace(/'/g, "''");
  const litCwd = cwd.replace(/'/g, "''");

  const claudeExe = looksLikeResolvedCli(configured)
    ? `& '${configured.replace(/'/g, "''")}'`
    : 'claude';

  const extra = CLAUDE_PRINT_EXTRA_ARGS.map((a) => `'${a.replace(/'/g, "''")}'`).join(' ');
  // chcp 는 일부 환경에서 실패하므로 쓰지 않음. UTF-8 은 Get-Content -Encoding utf8 + Node Buffer 로 처리.
  const psCmd =
    `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ` +
    `$OutputEncoding = [System.Text.Encoding]::UTF8; ` +
    `Set-Location -LiteralPath '${litCwd}'; ` +
    `Get-Content -LiteralPath '${litFile}' -Raw -Encoding utf8 | ${claudeExe} -p ${extra}`;

  return new Promise((resolve, reject) => {
    const proc = spawn(pathToWindowsPowerShellExe(), [
      '-ExecutionPolicy',
      'Bypass',
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psCmd,
    ], {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    const done = (fn, arg) => {
      void fs.rm(dir, { recursive: true, force: true }).finally(() => fn(arg));
    };

    collectOutput(
      proc,
      'claude',
      timeoutMs,
      (out) => done(resolve, out),
      (err) => done(reject, err)
    );
  });
}

/**
 * Claude Code CLI: 비 Windows 는 stdin 파이프. Windows 는 PowerShell + 임시 파일.
 * `CLAUDE_CLI` 에 `...\claude.cmd` 전체 경로 가능.
 */
export async function runClaude(prompt, cwd, timeoutMs = CLI_TIMEOUT_MS) {
  console.log('[CLI] claude 실행 중... (YOLO: bypassPermissions + 비질문 접두, 프롬프트 → 임시 파일)');
  const env = envWithNpmGlobalPath({ ...process.env, FORCE_COLOR: '0' });
  const configured = (process.env.CLAUDE_CLI ?? '').trim();
  const wrapped = applyClaudeYoloPrompt(prompt);

  if (process.platform === 'win32') {
    return runClaudeWindowsPowerShell(wrapped, cwd, timeoutMs, env, configured);
  }

  const name = configured || 'claude';
  return pipePromptFileToSpawn({
    prompt: wrapped,
    command: name,
    args: ['-p', ...CLAUDE_PRINT_EXTRA_ARGS],
    cwd,
    env,
    label: 'claude',
    timeoutMs,
    collectOutput,
  });
}

/**
 * `GEMINI_CLI` 기본 gemini. Windows 는 cmd /c 경유.
 */
export async function runGemini(prompt, cwd, timeoutMs = CLI_TIMEOUT_MS) {
  console.log('[CLI] gemini 실행 중... (프롬프트 → 임시 파일 → stdin)');
  const bin = (process.env.GEMINI_CLI ?? 'gemini').trim() || 'gemini';
  const env = envWithNpmGlobalPath({ ...process.env, FORCE_COLOR: '0' });
  if (process.platform === 'win32') {
    return pipePromptFileToSpawn({
      prompt,
      command: pathToWindowsCmdExe(),
      args: ['/c', bin, '-p', ' ', '--yolo'],
      cwd,
      env,
      label: 'gemini',
      timeoutMs,
      collectOutput,
    });
  }
  return pipePromptFileToSpawn({
    prompt,
    command: bin,
    args: ['-p', ' ', '--yolo'],
    cwd,
    env,
    label: 'gemini',
    timeoutMs,
    collectOutput,
  });
}

/**
 * `CODEX_CLI` 기본 codex. Windows 는 cmd /c 경유.
 */
export async function runCodex(prompt, cwd, timeoutMs = CLI_TIMEOUT_MS) {
  console.log('[CLI] codex 실행 중... (프롬프트 → 임시 파일 → stdin)');
  const bin = (process.env.CODEX_CLI ?? 'codex').trim() || 'codex';
  const env = envWithNpmGlobalPath({ ...process.env, FORCE_COLOR: '0' });
  if (process.platform === 'win32') {
    return pipePromptFileToSpawn({
      prompt,
      command: pathToWindowsCmdExe(),
      args: ['/c', bin, 'exec', '--full-auto', '--skip-git-repo-check', '-'],
      cwd,
      env,
      label: 'codex',
      timeoutMs,
      collectOutput,
    });
  }
  return pipePromptFileToSpawn({
    prompt,
    command: bin,
    args: ['exec', '--full-auto', '--skip-git-repo-check', '-'],
    cwd,
    env,
    label: 'codex',
    timeoutMs,
    collectOutput,
  });
}

/**
 * GitHub Copilot CLI (`npm i -g @github/copilot`)
 * `COPILOT_CLI` 로 실행 파일 지정 가능.
 */
export async function runCopilot(prompt, cwd, timeoutMs = CLI_TIMEOUT_MS) {
  console.log('[CLI] copilot 실행 중... (프롬프트 → 임시 파일 → stdin)');
  const configured = (process.env.COPILOT_CLI ?? '').trim();
  const name = configured || 'copilot';
  const env = envWithNpmGlobalPath({
    ...process.env,
    FORCE_COLOR: '0',
    COPILOT_ALLOW_ALL: process.env.COPILOT_ALLOW_ALL ?? 'true',
  });

  if (process.platform === 'win32' && !looksLikeResolvedCli(configured)) {
    return pipePromptFileToSpawn({
      prompt,
      command: pathToWindowsCmdExe(),
      args: ['/c', name, '-s', '--no-ask-user', '--allow-all'],
      cwd,
      env,
      label: 'copilot',
      timeoutMs,
      collectOutput,
    });
  }

  return pipePromptFileToSpawn({
    prompt,
    command: name,
    args: ['-s', '--no-ask-user', '--allow-all'],
    cwd,
    env,
    label: 'copilot',
    timeoutMs,
    collectOutput,
  });
}

export async function runOllama(prompt, timeoutMs = 300_000, model = OLLAMA_MODEL) {
  console.log(`[Ollama API] ${OLLAMA_URL} → ${model} 실행 중...`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama API 오류: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.response ?? '';
  } finally {
    clearTimeout(timer);
  }
}

const RUNNERS = {
  claude: runClaude,
  gemini: runGemini,
  codex: runCodex,
  copilot: runCopilot,
};

/**
 * @param {string} which claude | gemini | codex | copilot
 * @param {string} prompt
 * @param {string} cwd
 */
export async function runAi(which, prompt, cwd) {
  const key = (which ?? 'claude').toLowerCase();
  const fn = RUNNERS[key];
  if (!fn) throw new Error(`지원하지 않는 CONCEPT_AI/DESIGN_AI: ${which}`);
  return fn(prompt, cwd);
}

export async function withOllamaFallback(primaryFn, prompt, cwd) {
  try {
    const text = await primaryFn(prompt, cwd);
    return { text, usedFallback: false };
  } catch (err) {
    if (err?.message?.includes('지원하지 않는 CONCEPT_AI')) {
      throw err;
    }
    console.warn(`[CLI] 폴백(Ollama): ${err.message}`);
    try {
      const text = await runOllama(prompt);
      return { text, usedFallback: true };
    } catch (e2) {
      console.warn(`[Ollama] 실패: ${e2.message}`);
      throw err;
    }
  }
}
