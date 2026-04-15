/**
 * design/*.md 를 읽어 저장소 루트 go.md 초안을 생성합니다.
 * goReader 가 ### 줄만 태스크로 쓰므로, 임베드 본문의 ### 은 #### 로 올립니다.
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/** @param {string} line */
function bumpMarkdownHeading(line) {
  if (/^####+\s/.test(line)) return line;
  if (/^###\s/.test(line)) return `#${line}`;
  return line;
}

/** @param {string} text */
function sanitizeEmbeddedMarkdown(text) {
  return text
    .split('\n')
    .map((line) => bumpMarkdownHeading(line))
    .join('\n');
}

/**
 * @param {{ root: string; designDir: string; goFilePath: string }} opts
 * @returns {Promise<{ written: boolean; goFilePath: string }>}
 */
export async function generateGoFromDesign({ root, designDir, goFilePath }) {
  const resolvedDesign = path.resolve(designDir);
  let stat;
  try {
    stat = await fs.stat(resolvedDesign);
  } catch {
    throw new Error(`DESIGN_DIR 없음: ${resolvedDesign}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`DESIGN_DIR 가 폴더가 아님: ${resolvedDesign}`);
  }

  const pattern = process.env.DESIGN_GLOB ?? '**/*.md';
  const files = await glob(pattern, {
    cwd: resolvedDesign,
    nodir: true,
    windowsPathsNoEscape: true,
  });
  const sorted = [...files].sort((a, b) => a.localeCompare(b, 'en'));

  if (sorted.length === 0) {
    throw new Error(`${resolvedDesign} 에서 glob "${pattern}" 에 맞는 .md 가 없습니다.`);
  }

  let title = 'Design 기반 프로젝트';
  const goalsPath = path.join(resolvedDesign, '00-goals.md');
  try {
    const goalsRaw = await fs.readFile(goalsPath, 'utf-8');
    const m = goalsRaw.match(/^#\s+(.+)/m);
    if (m) title = m[1].trim();
  } catch {
    // ignore
  }

  const chunks = [];
  for (const rel of sorted) {
    const full = path.join(resolvedDesign, rel);
    let text = await fs.readFile(full, 'utf-8');
    const label = rel.split(path.sep).join('/');
    chunks.push(`## DESIGN: ${label}\n\n${sanitizeEmbeddedMarkdown(text).trim()}\n`);
  }

  const body = [
    '<!-- generated-from-design: design 본문이 아래에 포함됨 → DESIGN_DIR 자동 번들 생략 -->',
    '',
    `# ${title}`,
    '',
    '> 이 파일은 `design/` 마크다운을 바탕으로 자동 생성되었습니다. 태스크만 수정해도 됩니다.',
    '',
    '## 태스크',
    '',
    '### 프로젝트 구조·SKILL·novel-brain 확인',
    '### design 목표·계획에 따른 장편 집필 진행',
    '### 분량·검증(npm run stats) 및 기록 갱신',
    '',
    '---',
    '',
    '## design 문서 원문 (자동 포함)',
    '',
    chunks.join('\n---\n\n'),
    '',
  ].join('\n');

  const resolvedGo = path.resolve(goFilePath);
  await fs.mkdir(path.dirname(resolvedGo), { recursive: true });
  await fs.writeFile(resolvedGo, body, 'utf-8');
  return { written: true, goFilePath: resolvedGo };
}
