/**
 * 원고·결과물 분량 집계 및 design/00-goals 기준 검증 (result/NNNN.md 또는 manuscript 모드)
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { REPO_ROOT } from './loadEnv.js';

function resolveNovelRoot(novelRoot) {
  const raw = novelRoot ?? process.env.NOVEL_ROOT ?? '.';
  return path.isAbsolute(raw) ? raw : path.resolve(REPO_ROOT, raw);
}

/**
 * design 산출물: result/0001.md … 형식만 집계 (index/checklist 등 제외)
 */
export async function collectResultChapterStats(novelRoot) {
  const root = resolveNovelRoot(novelRoot);
  const pattern = path.join(root, 'result', '[0-9][0-9][0-9][0-9].md').split(path.sep).join('/');
  const files = await glob(pattern, { nodir: true, windowsPathsNoEscape: true });
  const sorted = files.sort((a, b) => a.localeCompare(b));
  let totalChars = 0;
  const perFile = [];
  for (const file of sorted) {
    const text = await fs.readFile(file, 'utf-8');
    const n = text.length;
    totalChars += n;
    perFile.push({ file: path.relative(root, file), chars: n });
  }
  return { novelRoot: root, totalChars, files: perFile };
}

export async function collectManuscriptStats(novelRoot) {
  const root = resolveNovelRoot(novelRoot);
  const pattern = path.join(root, 'manuscript', '**/*.md').split(path.sep).join('/');
  const files = await glob(pattern, { nodir: true, windowsPathsNoEscape: true });
  let totalChars = 0;
  const perFile = [];
  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    const text = await fs.readFile(file, 'utf-8');
    const n = text.length;
    totalChars += n;
    perFile.push({ file: path.relative(root, file), chars: n });
  }
  return { novelRoot: root, totalChars, files: perFile };
}

/**
 * 00-goals: 누적 45만 자 이상, 파일당 4만 자 이상, result/NNNN.md
 * STATS_VALIDATION_MODE=manuscript 이면 manuscript 폴더 아래 md 합계만 검사 (기존 소설 파이프라인 호환)
 */
export async function validateDesignResultGoals(novelRoot) {
  const minTotal = Number(process.env.TARGET_MIN_CHARS ?? 450_000);
  const minPerFile = Number(process.env.TARGET_MIN_PER_RESULT_FILE ?? 40_000);
  const mode = (process.env.STATS_VALIDATION_MODE ?? 'result-chapters').toLowerCase();

  if (mode === 'manuscript') {
    const report = await collectManuscriptStats(novelRoot);
    const issues = [];
    if (report.files.length === 0) {
      issues.push('manuscript/**/*.md 파일이 없습니다.');
    }
    if (report.totalChars < minTotal) {
      issues.push(`원고 합계 ${report.totalChars.toLocaleString()}자 < 목표 ${minTotal.toLocaleString()}자`);
    }
    return {
      ok: issues.length === 0,
      issues,
      summary: issues.length ? issues.join(' ') : '측정 목표 충족',
      report,
      minTotal,
      minPerFile: null,
      mode,
    };
  }

  const report = await collectResultChapterStats(novelRoot);
  const issues = [];

  if (report.files.length === 0) {
    issues.push(`result/ 에 [0001.md] 형식(4자리 숫자)의 마크다운이 없습니다.`);
  }
  if (report.totalChars < minTotal) {
    issues.push(`누적 ${report.totalChars.toLocaleString()}자 < 목표 ${minTotal.toLocaleString()}자`);
  }
  for (const row of report.files) {
    if (row.chars < minPerFile) {
      issues.push(`${row.file}: ${row.chars.toLocaleString()}자 < 파일당 최소 ${minPerFile.toLocaleString()}자`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: issues.length ? issues.join(' ') : '측정 목표 충족',
    report,
    minTotal,
    minPerFile,
    mode,
  };
}

/** 집필 태스크용: 번호 결과 파일이 하나라도 있고 비어 있지 않은지 (또는 manuscript 모드일 때 원고 존재) */
export async function hasResultChapterProgress(novelRoot, minChars = 500) {
  const mode = (process.env.STATS_VALIDATION_MODE ?? 'result-chapters').toLowerCase();
  if (mode === 'manuscript') {
    const report = await collectManuscriptStats(novelRoot);
    if (report.files.length === 0) return { ok: false, reason: 'manuscript 원고 없음' };
    const maxChars = Math.max(...report.files.map((f) => f.chars));
    if (maxChars < minChars) {
      return { ok: false, reason: `가장 긴 원고가 ${maxChars}자 — 최소 ${minChars}자 이상 필요` };
    }
    return { ok: true, report };
  }

  const report = await collectResultChapterStats(novelRoot);
  if (report.files.length === 0) return { ok: false, reason: 'result/NNNN.md 파일 없음' };
  const maxChars = Math.max(...report.files.map((f) => f.chars));
  if (maxChars < minChars) {
    return { ok: false, reason: `가장 긴 결과 파일이 ${maxChars}자 — 최소 ${minChars}자 이상 필요` };
  }
  return { ok: true, report };
}
