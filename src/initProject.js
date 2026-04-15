/**
 * 새 소설 프로젝트 폴더를 스킬 템플릿으로 초기화합니다.
 *
 * 사용: pnpm run init-novel -- ../path/to/my-novel
 * 또는: NOVEL_OUT=./my-novel pnpm run init-novel
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

async function main() {
  const argPath = process.argv[2];
  const outDir = path.resolve(
    process.cwd(),
    argPath ?? process.env.NOVEL_OUT ?? './my-novel'
  );

  const skillRoot = path.resolve(__dirname, '..');
  const templateRoot = path.join(skillRoot, 'references', 'templates', 'project');
  const brainSrc = path.join(skillRoot, 'references', 'novel-brain.json');

  await fs.mkdir(outDir, { recursive: true });
  await copyDir(templateRoot, outDir);

  const brainDest = path.join(outDir, 'novel-brain.json');
  try {
    await fs.copyFile(brainSrc, brainDest);
  } catch (e) {
    console.warn(`[init-novel] novel-brain.json 복사 실패 (무시): ${e.message}`);
  }

  await fs.mkdir(path.join(outDir, 'manuscript'), { recursive: true });

  const goMd = [
    '# 새 소설 프로젝트',
    '',
    '> 저장소 루트에서 `pnpm run generate-tasks` 를 실행하면 이 파일의 태스크 목록이 목표 글자 수에 맞게 채워집니다.',
    '> `.env` 의 `GO_FILE` 이 이 파일을 가리키는지 확인하세요.',
    '',
    '## 태스크',
    '',
    '### (준비) generate-tasks 실행',
    '',
  ].join('\n');

  await fs.writeFile(path.join(outDir, 'go.md'), goMd, 'utf-8');

  const now = new Date().toISOString();
  let brainRaw = await fs.readFile(brainDest, 'utf-8');
  brainRaw = brainRaw.replace('"createdAt": ""', `"createdAt": "${now.slice(0, 10)}"`);
  brainRaw = brainRaw.replace('"lastModified": ""', `"lastModified": "${now.slice(0, 10)}"`);
  brainRaw = brainRaw.replace('"status": "기획"', '"status": "집필중"');
  await fs.writeFile(brainDest, brainRaw, 'utf-8');

  console.log(`[init-novel] 생성 완료: ${outDir}`);
  console.log('다음: .env 에 NOVEL_ROOT 를 이 경로로 맞추고, pnpm run generate-tasks 후 pnpm start');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
