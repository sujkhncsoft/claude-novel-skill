/**
 * concept.md 를 읽고, 저장소 내 마크다운 문서를 컨셉에 맞게 갱신합니다.
 * pnpm concept
 *
 * 환경: CONCEPT_AI (claude|gemini|codex|copilot, 기본 claude)
 *       CONCEPT_LIMIT — 처리할 최대 파일 수 (기본 무제한, 숫자)
 *       CONCEPT_DRY_RUN=1 — 파일 쓰기 없이 로그만
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { runAi, withOllamaFallback } from './lib/aiCli.js';
import { stripLeadingFence } from './lib/markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const CONCEPT_FILE = path.join(ROOT, 'concept.md');
const AI = process.env.CONCEPT_AI ?? 'claude';
const DRY = process.env.CONCEPT_DRY_RUN === '1' || process.argv.includes('--dry-run');
const LIMIT = process.env.CONCEPT_LIMIT ? Number(process.env.CONCEPT_LIMIT) : 0;

const IGNORE_GLOB = [
  '**/node_modules/**',
  '**/handoff/**',
  '**/.git/**',
];

function shouldSkipRel(rel) {
  if (rel === 'concept.md') return true;
  if (rel.startsWith('design/') && process.env.CONCEPT_INCLUDE_DESIGN !== '1') {
    return true;
  }
  return false;
}

async function main() {
  const conceptRaw = await fs.readFile(CONCEPT_FILE, 'utf-8').catch(() => '');
  if (!conceptRaw.trim()) {
    console.error('[concept] concept.md 가 비어 있습니다. 컨셉을 먼저 작성하세요.');
    process.exit(1);
  }

  const pattern = path.join('**', '*.md').split(path.sep).join('/');
  const all = await glob(pattern, {
    cwd: ROOT,
    ignore: IGNORE_GLOB,
    nodir: true,
    windowsPathsNoEscape: true,
  });

  const files = all
    .map((p) => p.split(path.sep).join('/'))
    .filter((rel) => !shouldSkipRel(rel))
    .sort((a, b) => a.localeCompare(b));

  const targets = LIMIT > 0 ? files.slice(0, LIMIT) : files;

  console.log(`[concept] 컨셉 길이: ${conceptRaw.length}자`);
  console.log(`[concept] 대상 .md: ${targets.length}개 (glob ${all.length}개 → 필터 후 ${files.length}개)`);
  if (DRY) console.log('[concept] DRY_RUN — 디스크에 쓰지 않습니다.');

  for (let i = 0; i < targets.length; i += 1) {
    const rel = targets[i];
    const full = path.join(ROOT, rel);
    const body = await fs.readFile(full, 'utf-8');

    const prompt =
      `당신은 문서 편집자입니다. 아래 "프로젝트 컨셉"에 맞게 주어진 마크다운 파일 내용을 수정하세요.\n` +
      `- 구조(헤딩 계층)는 가능하면 유지하되, 컨셉과 충돌하면 조정해도 됩니다.\n` +
      `- 불필요한 서문/맺음말 없이 **수정된 마크다운 본문만** 출력하세요.\n` +
      `- 코드 블록 펜스(\`\`\`)로 전체를 감싸지 마세요.\n\n` +
      `## 프로젝트 컨셉\n\n${conceptRaw}\n\n` +
      `## 파일 경로\n\n${rel}\n\n` +
      `## 현재 내용\n\n${body}`;

    console.log(`\n[concept] (${i + 1}/${targets.length}) ${rel}`);

    const run = (p, cwd) => runAi(AI, p, cwd);
    const { text } = await withOllamaFallback(run, prompt, ROOT);
    const out = stripLeadingFence(text);

    if (!DRY) {
      await fs.writeFile(full, `${out.trim()}\n`, 'utf-8');
    }
  }

  console.log('\n[concept] 완료');
}

main().catch((e) => {
  console.error('[concept]', e);
  process.exit(1);
});
