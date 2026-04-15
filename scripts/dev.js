/**
 * design/ 마크다운을 DESIGN_DIR 로 주입하여 novel-agent(LangGraph)를 실행합니다.
 * pnpm dev
 *
 * novel-agent/.env 및 루트 .env 를 로드합니다.
 * DESIGN_DIR 은 항상 저장소 루트의 design/ 절대 경로로 설정됩니다(덮어씀).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESIGN_DIR = path.join(ROOT, 'design');
const NOVEL_AGENT = path.join(ROOT, 'novel-agent');
const ENTRY = path.join(NOVEL_AGENT, 'src', 'index.js');

dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(NOVEL_AGENT, '.env') });

async function main() {
  try {
    await fs.access(path.join(DESIGN_DIR, '00-goals.md'));
  } catch {
    console.error('[dev] design/ 문서가 없습니다. 먼저 `pnpm design` 을 실행하세요.');
    process.exit(1);
  }

  const env = {
    ...process.env,
    DESIGN_DIR,
    DESIGN_GLOB: process.env.DESIGN_GLOB ?? '**/*.md',
  };

  console.log(`[dev] DESIGN_DIR=${DESIGN_DIR}`);
  console.log(`[dev] NOVEL_ROOT=${env.NOVEL_ROOT ?? '(미설정 — novel-agent/.env 확인)'}`);
  console.log(`[dev] GO_FILE=${env.GO_FILE ?? '(미설정)'}`);
  console.log(`[dev] 실행: node ${path.relative(ROOT, ENTRY)}\n`);

  const child = spawn(process.execPath, [ENTRY], {
    cwd: NOVEL_AGENT,
    env,
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('[dev]', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error('[dev]', e);
  process.exit(1);
});
