/**
 * concept.md 를 바탕으로 LangChain 에이전트가 사용할 설계 문서를 design/ 에 생성합니다.
 * pnpm design
 *
 * 생성: design/00-goals.md, design/01-plan.md, design/02-langchain-brief.md
 * 환경: DESIGN_AI (claude|gemini|codex|copilot)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runAi, withOllamaFallback } from './lib/aiCli.js';
import { stripLeadingFence } from './lib/markdown.js';
import { generateGoFromDesign } from './genGoFromDesign.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const CONCEPT_FILE = path.join(ROOT, 'concept.md');
const DESIGN_DIR = path.join(ROOT, 'design');
const AI = process.env.DESIGN_AI ?? process.env.CONCEPT_AI ?? 'claude';

const SPECS = [
  {
    file: '00-goals.md',
    instruction:
      '이 프로젝트의 **측정 가능한 목표**(예: 최소 글자 수, 완결 조건, 품질 기준)와 비목표를 bullet 위주로 정리하세요. 한국어로 작성.',
  },
  {
    file: '01-plan.md',
    instruction:
      'concept 를 실행 가능한 **단계별 계획**(마일스톤, 순서, 의존성, 산출물 경로 예: manuscript/, novel-brain.json)으로 나누세요. 표나 번호 목록을 사용해도 됩니다.',
  },
  {
    file: '02-langchain-brief.md',
    instruction:
      '저장소 루트의 집필 러너(go.md + LangGraph + Worker CLI)가 **실제로 수행할 작업**을 구체화하세요.\n' +
      '- Supervisor/Worker 역할\n' +
      '- go.md 태스크를 어떻게 쪼길지\n' +
      '- DESIGN_DIR 문서를 어떻게 참조할지\n' +
      '- 검증(npm run stats)과 novel-brain 갱신 시점\n' +
      '실행 가능한 지시만 쓰고 장황한 수사는 피하세요.',
  },
];

async function main() {
  const conceptRaw = await fs.readFile(CONCEPT_FILE, 'utf-8').catch(() => '');
  if (!conceptRaw.trim()) {
    console.error('[design] concept.md 가 비어 있습니다.');
    process.exit(1);
  }

  await fs.mkdir(DESIGN_DIR, { recursive: true });

  const run = (p, cwd) => runAi(AI, p, cwd);

  for (const spec of SPECS) {
    const prompt =
      `아래 "프로젝트 컨셉"만을 단일 진실 소스로 삼아, 요청한 문서를 작성하세요.\n` +
      `출력은 **마크다운 본문만**. 서문/맺음말/코드펜스로 전체 감싸기 금지.\n\n` +
      `## 프로젝트 컨셉\n\n${conceptRaw}\n\n` +
      `## 작성 요청\n\n${spec.instruction}\n\n` +
      `파일 이름(참고): ${spec.file}`;

    console.log(`\n[design] 작성 중 → design/${spec.file} (AI=${AI})`);
    const { text } = await withOllamaFallback(run, prompt, ROOT);
    const out = stripLeadingFence(text);
    const dest = path.join(DESIGN_DIR, spec.file);
    await fs.writeFile(dest, `${out.trim()}\n`, 'utf-8');
  }

  const goFile = path.join(ROOT, 'go.md');
  await generateGoFromDesign({ root: ROOT, designDir: DESIGN_DIR, goFilePath: goFile });
  console.log(`\n[design] 완료 → ${DESIGN_DIR}`);
  console.log(`[design] go.md 생성 → ${goFile}`);
}

main().catch((e) => {
  console.error('[design]', e);
  process.exit(1);
});
