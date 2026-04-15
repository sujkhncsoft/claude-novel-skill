/**
 * 긴 프롬프트를 임시 파일에 쓴 뒤 stdin으로 CLI에 넘깁니다 (명령줄·쉬 인용 한도 회피).
 */

import { createReadStream } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

/**
 * @param {{
 *   prompt: string,
 *   command: string,
 *   args: string[],
 *   cwd: string,
 *   env: NodeJS.ProcessEnv,
 *   label: string,
 *   timeoutMs: number,
 *   collectOutput: (proc: import('child_process').ChildProcess, label: string, timeoutMs: number, resolve: (v: string) => void, reject: (e: Error) => void) => void,
 * }} opts
 */
export async function pipePromptFileToSpawn(opts) {
  const { prompt, command, args, cwd, env, label, timeoutMs, collectOutput } = opts;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'novel-ai-prompt-'));
  const tmpFile = path.join(dir, 'prompt.md');
  await fs.writeFile(tmpFile, prompt, 'utf8');

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    const rs = createReadStream(tmpFile);
    rs.on('error', (err) => {
      void fs.rm(dir, { recursive: true, force: true });
      reject(err);
    });
    rs.pipe(proc.stdin);

    const done = (fn, arg) => {
      void fs.rm(dir, { recursive: true, force: true }).finally(() => fn(arg));
    };

    collectOutput(
      proc,
      label,
      timeoutMs,
      (out) => done(resolve, out),
      (err) => done(reject, err)
    );
  });
}
