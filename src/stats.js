/**
 * Collect character counts for markdown files under the manuscript directory.
 * Uses JS string length (UTF-16 code units), which matches the project target metric.
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { REPO_ROOT } from './loadEnv.js';

async function main() {
  const novelRoot = process.argv.includes('--novel-root')
    ? process.argv[process.argv.indexOf('--novel-root') + 1]
    : process.env.NOVEL_ROOT ?? './my-novel';

  const root = path.isAbsolute(novelRoot) ? novelRoot : path.resolve(REPO_ROOT, novelRoot);
  const pattern = path.join(root, 'manuscript', '**/*.md').split(path.sep).join('/');

  const files = await glob(pattern, { nodir: true, windowsPathsNoEscape: true });
  let total = 0;
  const perFile = [];

  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    const text = await fs.readFile(file, 'utf-8');
    const n = text.length;
    total += n;
    perFile.push({ file: path.relative(root, file), chars: n });
  }

  console.log(JSON.stringify({ novelRoot: root, totalChars: total, files: perFile }, null, 2));

  const min = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  if (total < min) {
    console.error(`\n[stats] 목표 ${min}자 미만 (현재 ${total}자, 부족 ${min - total}자)`);
    process.exitCode = 1;
  } else {
    console.log(`\n[stats] 목표 ${min}자 이상 달성`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
