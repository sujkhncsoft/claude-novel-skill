/**
 * go.md 파싱 (ai_template 와 동일)
 */

import fs from 'fs/promises';
import path from 'path';

const AUTO_SEPARATOR = '<!-- AUTO-GENERATED:';

export async function readGoFile(goFilePath) {
  const resolved = path.resolve(goFilePath);

  let content;
  try {
    content = await fs.readFile(resolved, 'utf-8');
  } catch (err) {
    throw new Error(`go.md 파일을 읽을 수 없습니다: ${resolved}\n${err.message}`);
  }

  const sepIdx = content.indexOf(AUTO_SEPARATOR);
  const userContent = sepIdx >= 0 ? content.slice(0, sepIdx) : content;
  const autoContent = sepIdx >= 0 ? content.slice(sepIdx) : '';

  const title = extractTitle(userContent);
  const tasks = extractTasks(userContent);

  const completedTasks = extractCompletedTasks(autoContent);
  const pendingTasks = tasks.filter((t) => !completedTasks.includes(t));

  return {
    content,
    userContent,
    tasks,
    completedTasks,
    pendingTasks,
    title,
    filePath: resolved,
  };
}

function extractTitle(userContent) {
  const match = userContent.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'go.md 작업';
}

function extractTasks(userContent) {
  const tasks = [];
  const lines = userContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      tasks.push(match[1].trim());
    }
  }

  if (tasks.length === 0) {
    const IGNORE_HEADERS = ['프로젝트', '기술', '주의', '태스크', '개요', '설정'];
    for (const line of lines) {
      const match = line.match(/^##\s+(.+)/);
      if (match && !IGNORE_HEADERS.some((kw) => match[1].includes(kw))) {
        tasks.push(match[1].trim());
      }
    }
  }

  if (tasks.length === 0) {
    tasks.push('전체 작업 실행');
  }

  return tasks;
}

function extractCompletedTasks(autoContent) {
  if (!autoContent) return [];

  const progressSection = extractSection(autoContent, '## 진행 상황');
  if (!progressSection) return [];

  const completed = [];
  const lines = progressSection.split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s+\[x\]\s+(.+)/i);
    if (match) {
      completed.push(match[1].trim());
    }
  }
  return completed;
}

function extractSection(content, header) {
  const startIdx = content.indexOf(header);
  if (startIdx < 0) return '';

  const afterHeader = content.slice(startIdx + header.length);

  const nextSection = afterHeader.search(/\n##\s/);
  return nextSection >= 0 ? afterHeader.slice(0, nextSection) : afterHeader;
}

export function getCompletionKeyword(taskName) {
  const numbered = taskName.match(/^태스크\s*(\d+)/i);
  if (numbered) return `태스크${numbered[1]} 완료`;

  const numberedEn = taskName.match(/^task\s*(\d+)/i);
  if (numberedEn) return `task${numberedEn[1]} complete`;

  return `${taskName} 완료`;
}
