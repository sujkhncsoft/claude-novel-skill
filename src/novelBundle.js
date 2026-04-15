/**
 * NOVEL_ROOT 및 스킬 루트에서 집필 에이전트용 컨텍스트 번들을 만듭니다.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { REPO_ROOT } from './loadEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function truncate(text, max) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max)}\n\n… (길이 제한으로 잘림)`;
}

/**
 * 상위 디렉터리에서 claude-novel-skill 루트를 추정합니다.
 */
export async function resolveSkillRoot(cwd) {
  const env = process.env.NOVEL_SKILL_ROOT;
  if (env) return path.resolve(cwd, env);

  let dir = path.resolve(cwd);
  for (let i = 0; i < 8; i += 1) {
    const skillMd = path.join(dir, 'SKILL.md');
    try {
      await fs.access(skillMd);
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.resolve(__dirname, '..');
}

/**
 * @param {{ cwd: string }} options
 * @returns {Promise<string>}
 */
export async function loadNovelBundle({ cwd }) {
  const novelRoot = process.env.NOVEL_ROOT;
  if (!novelRoot) {
    return '';
  }

  const resolvedNovel = path.isAbsolute(novelRoot)
    ? novelRoot
    : path.resolve(REPO_ROOT, novelRoot);
  const skillRoot = await resolveSkillRoot(cwd);

  const chunks = [];

  chunks.push(
    `## 소설 프로젝트 (NOVEL_ROOT)\n\n` +
      `> 경로: \`${resolvedNovel}\`\n\n` +
      `원고는 \`manuscript/chapter-NNN.md\` (3자리) 에 저장합니다.\n` +
      `집필 후 \`novel-brain.json\` 의 진행 필드(챕터, structureTracking)를 반드시 갱신합니다.\n`
  );

  const brainPath = path.join(resolvedNovel, 'novel-brain.json');
  try {
    const raw = await fs.readFile(brainPath, 'utf-8');
    chunks.push(`### novel-brain.json\n\n\`\`\`json\n${truncate(raw, 80_000)}\n\`\`\``);
  } catch (e) {
    chunks.push(`### novel-brain.json\n\n*(없음 또는 읽기 실패: ${e.message})*`);
  }

  const optionalMd = [
    ['00-core/active_context.md', '활성 컨텍스트'],
    ['00-core/style-guide.md', '스타일 가이드'],
    ['03-plot/main-plot.md', '메인 플롯'],
    ['03-plot/chapter-outline.md', '챕터 아웃라인'],
  ];

  for (const [rel, label] of optionalMd) {
    const full = path.join(resolvedNovel, rel);
    try {
      const text = await fs.readFile(full, 'utf-8');
      chunks.push(`### ${label} (${rel})\n\n${truncate(text, 60_000)}`);
    } catch {
      /* skip */
    }
  }

  const skillSnippetPath = path.join(skillRoot, 'SKILL.md');
  try {
    const skillTop = await fs.readFile(skillSnippetPath, 'utf-8');
    chunks.push(
      `### SKILL.md 발췌 (원칙)\n\n${truncate(skillTop, 25_000)}`
    );
  } catch {
    chunks.push(`### SKILL.md\n\n*(읽기 실패: ${skillSnippetPath})*`);
  }

  console.log(`[NovelBundle] 주입: ${resolvedNovel} + skill ${skillRoot}`);

  return `\n\n---\n\n## Novel 번들 (자동 주입)\n\n${chunks.join('\n\n---\n\n')}\n`;
}

/**
 * @param {string} userContent
 * @param {string} bundle
 */
export function augmentNovelContent(userContent, bundle) {
  if (!bundle) return userContent;
  return userContent + bundle;
}
