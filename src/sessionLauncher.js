/**
 * 다음 세션 Node 프로세스 스폰
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function launchNextSession({ sessionNumber = 1, delayMs = 2000 } = {}) {
  console.log(`\n[SessionLauncher] ${delayMs / 1000}초 후 세션 ${sessionNumber} 시작...`);

  setTimeout(() => {
    const entryPoint = path.join(__dirname, 'index.js');

    const env = { ...process.env };
    delete env.HANDOFF_FILE;

    console.log(`[SessionLauncher] 새 세션 프로세스 시작: node ${entryPoint}`);
    console.log('─'.repeat(60));
    console.log(`  세션 ${sessionNumber} 시작`);
    console.log('─'.repeat(60) + '\n');

    const child = spawn(process.execPath, [entryPoint], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      detached: false,
    });

    child.on('error', (err) => {
      console.error(`[SessionLauncher] 새 세션 시작 실패: ${err.message}`);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[SessionLauncher] 세션 ${sessionNumber} 비정상 종료 (exit ${code})`);
      }
    });

    process.exit(0);
  }, delayMs);
}
