/**
 * go.md 진행 상황 기록 (ai_template 와 동일)
 */

import fs from 'fs/promises';
import path from 'path';

const SEPARATOR = '<!-- AUTO-GENERATED: 아래 내용은 자동 생성됩니다. 수정하지 마세요. -->';

export async function writeGoProgress({
  goFilePath,
  completedTasks,
  pendingTasks,
  allTasks,
  changedFiles,
  contextMonitor,
  exitReason,
  sessionNumber,
}) {
  const resolved = path.resolve(goFilePath);
  const raw = await fs.readFile(resolved, 'utf-8');

  const separatorIdx = raw.indexOf(SEPARATOR);
  const userContent = separatorIdx >= 0 ? raw.slice(0, separatorIdx).trimEnd() : raw.trimEnd();

  const now = new Date();
  const timestamp = now.toLocaleString('ko-KR');
  const sessionLabel = `세션 ${sessionNumber}`;

  const completedLines =
    completedTasks.length > 0 ? completedTasks.map((t) => `- [x] ${t}`).join('\n') : '- (없음)';

  const pendingLines =
    pendingTasks.length > 0 ? pendingTasks.map((t) => `- [ ] ${t}`).join('\n') : '- (모든 태스크 완료 ✅)';

  const existingLog = extractExistingLog(raw);

  const contextSummary = buildContextSummary(contextMonitor);
  const changedFilesSummary = changedFiles.length > 0 ? changedFiles.slice(0, 10).join(', ') : '없음';

  const newLogEntry = [
    `### ${sessionLabel} — ${timestamp}`,
    `- **종료 사유**: ${exitReason}`,
    `- **완료 태스크**: ${completedTasks.join(', ') || '없음'}`,
    `- **남은 태스크**: ${pendingTasks.join(', ') || '없음'}`,
    `- **컨텍스트**: ${contextSummary}`,
    `- **변경 파일**: ${changedFilesSummary}`,
  ].join('\n');

  const sessionLog = existingLog ? `${existingLog}\n\n${newLogEntry}` : newLogEntry;

  const autoSection = [
    SEPARATOR,
    '',
    '## 진행 상황',
    '',
    `> 마지막 업데이트: ${timestamp} (${sessionLabel})`,
    '',
    '### ✅ 완료된 태스크',
    '',
    completedLines,
    '',
    '### ⏳ 남은 태스크',
    '',
    pendingLines,
    '',
    '---',
    '',
    '## 세션 로그',
    '',
    sessionLog,
    '',
  ].join('\n');

  const newContent = `${userContent}\n\n${autoSection}`;
  await fs.writeFile(resolved, newContent, 'utf-8');

  console.log(`[GoWriter] go.md 업데이트 완료: ${resolved}`);
  console.log(`[GoWriter] 완료: ${completedTasks.length}개 / 남음: ${pendingTasks.length}개`);

  return resolved;
}

function extractExistingLog(raw) {
  const logStart = raw.indexOf('## 세션 로그');
  if (logStart < 0) return '';

  const afterHeader = raw.slice(logStart + '## 세션 로그'.length).trimStart();
  return afterHeader.trim();
}

function buildContextSummary(contextMonitor) {
  if (!contextMonitor) return '정보 없음';
  try {
    return (
      Object.entries(contextMonitor.usage ?? {})
        .filter(([, used]) => used > 0)
        .map(([key]) => `${key} ${contextMonitor.getPercent(key)}%`)
        .join(' / ') || '0%'
    );
  } catch {
    return '정보 없음';
  }
}

export async function getNextSessionNumber(goFilePath) {
  try {
    const raw = await fs.readFile(path.resolve(goFilePath), 'utf-8');
    const matches = [...raw.matchAll(/### 세션 (\d+)/g)];
    if (matches.length === 0) return 1;
    const nums = matches.map((m) => Number(m[1]));
    return Math.max(...nums) + 1;
  } catch {
    return 1;
  }
}
