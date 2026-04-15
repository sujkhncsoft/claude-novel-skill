/**
 * 분량 집계 CLI — STATS_VALIDATION_MODE 에 따라 통과 조건 결정
 */

import {
  validateDesignResultGoals,
  collectResultChapterStats,
  collectManuscriptStats,
} from './statsReport.js';

async function main() {
  const novelRoot = process.argv.includes('--novel-root')
    ? process.argv[process.argv.indexOf('--novel-root') + 1]
    : process.env.NOVEL_ROOT ?? '.';

  const min = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  const minPer = Number(process.env.TARGET_MIN_PER_RESULT_FILE ?? 40_000);

  const chapters = await collectResultChapterStats(novelRoot);
  const manuscript = await collectManuscriptStats(novelRoot);
  const goals = await validateDesignResultGoals(novelRoot);

  const payload = {
    novelRoot: chapters.novelRoot,
    validationMode: goals.mode ?? process.env.STATS_VALIDATION_MODE ?? 'result-chapters',
    targetMinChars: min,
    targetMinPerResultFile: minPer,
    resultChapters: {
      totalChars: chapters.totalChars,
      files: chapters.files,
    },
    manuscript: {
      totalChars: manuscript.totalChars,
      files: manuscript.files,
    },
    validation: {
      ok: goals.ok,
      summary: goals.summary,
    },
  };

  console.log(JSON.stringify(payload, null, 2));

  if (!goals.ok) {
    console.error(`\n[stats] 미달: ${goals.summary}`);
    process.exitCode = 1;
  } else {
    console.log(`\n[stats] 목표 달성 (${goals.summary})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
