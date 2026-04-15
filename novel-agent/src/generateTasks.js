/**
 * TARGET_MIN_CHARS / TYPICAL_CHAPTER_CHARS 로 챕터 수를 계산하고
 * go.md 사용자 영역의 ### 태스크 목록을 재생성합니다.
 *
 * 사용: npm run generate-tasks
 * 옵션: --dry-run (파일 쓰기 없이 stdout만)
 */

import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const SEPARATOR = '<!-- AUTO-GENERATED:';

function buildTaskList({ targetMin, chapterChars }) {
  const n = Math.max(1, Math.ceil(targetMin / chapterChars));
  const tasks = [];

  tasks.push('태스크 01 — 프로젝트 폴더·novel-brain 메타·스타일 가이드 확정');
  tasks.push('태스크 02 — 캐릭터/세계관 SSOT(02-characters, 01-world) 정리');
  tasks.push('태스크 03 — 전체 챕터 아웃라인(03-plot/chapter-outline.md) 작성');

  let num = 4;
  for (let c = 1; c <= n; c += 1) {
    tasks.push(
      `태스크 ${String(num).padStart(2, '0')} — 제${c}챕터 본문 집필 (목표 약 ${chapterChars}자, manuscript/chapter-${String(c).padStart(3, '0')}.md)`
    );
    num += 1;
  }

  tasks.push(
    `태스크 ${String(num).padStart(2, '0')} — 원고 통합·글자수 검증(npm run stats)·novel-brain 최종 갱신`
  );

  return { tasks, chapterCount: n, targetMin, chapterChars };
}

function renderUserSection(title, introLines, taskStrings) {
  const lines = [
    `# ${title}`,
    '',
    ...introLines,
    '',
    '## 태스크',
    '',
    ...taskStrings.map((t) => `### ${t}`),
    '',
  ];
  return lines.join('\n').trimEnd();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const cwd = process.cwd();
  const goFile = process.env.GO_FILE ?? './go.md';
  const targetMin = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  const chapterChars = Number(process.env.TYPICAL_CHAPTER_CHARS ?? 10_000);

  const resolvedGo = path.resolve(cwd, goFile);
  let raw;
  try {
    raw = await fs.readFile(resolvedGo, 'utf-8');
  } catch (e) {
    console.error(`[generate-tasks] go.md 읽기 실패: ${resolvedGo}\n${e.message}`);
    process.exit(1);
  }

  const sepIdx = raw.indexOf(SEPARATOR);
  const userContent = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
  const autoPart = sepIdx >= 0 ? raw.slice(sepIdx) : '';

  const titleMatch = userContent.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : '장편 소설 자율 집필';

  const introLines = [
    '> 이 목록은 `npm run generate-tasks` 로 재생성할 수 있습니다.',
    '',
    `- 목표 최소 글자 수: **${targetMin.toLocaleString()}자**`,
    `- 챕터당 목표(가이드): **약 ${chapterChars.toLocaleString()}자**`,
    '',
    '작업 디렉터리는 `.env` 의 `NOVEL_ROOT` 입니다.',
  ];

  const { tasks, chapterCount } = buildTaskList({ targetMin, chapterChars });
  const newUser = renderUserSection(title, introLines, tasks);

  const out = autoPart ? `${newUser}\n\n${autoPart}` : `${newUser}\n`;

  console.log(`[generate-tasks] 챕터 수(추정): ${chapterCount}, 총 태스크: ${tasks.length}`);

  if (dryRun) {
    console.log('\n---\n');
    console.log(newUser);
    return;
  }

  await fs.writeFile(resolvedGo, out, 'utf-8');
  console.log(`[generate-tasks] 갱신 완료: ${resolvedGo}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
