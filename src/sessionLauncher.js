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

    // Windows 환경에서 부모를 즉시 종료하면 자식 프로세스가 같이 종료될 수 있다.
    // 부모를 유지해 자식 세션이 실제로 실행/출력되도록 둔다.
  }, delayMs);
}
