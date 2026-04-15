/**
 * concept.md 를 읽어 LangChain / Worker 가 따를 **소설 설계 문서**를 design/ 에 생성합니다.
 * pnpm design
 *
 * 생성 순서 (의존성 반영):
 *   03-characters.md      — 주인공·핵심 조연·대립 축
 *   04-chapters-outline.md — 제1장~제N장(기본 13) 장별 주제·사건·복선
 *   00-goals.md           — 분량·품질 목표 (위 설계와 정합)
 *   01-plan.md            — 실행 계획 (위 설계 경로 명시)
 *   02-langchain-brief.md — go.md / Worker 가 설계를 어떻게 쓰는지
 *
 * 마지막에 go.md 를 design/*.md 로 재생성합니다.
 *
 * 환경: DESIGN_AI (claude|gemini|codex|copilot)
 *       DESIGN_CHAPTER_COUNT — 장 개요 장 수 (기본 13)
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
const CHAPTER_COUNT = Math.max(
  1,
  Math.min(99, Number(process.env.DESIGN_CHAPTER_COUNT ?? 13) || 13)
);

/**
 * @typedef {{ file: string; instruction: string; injectFiles?: string[] }} DesignSpec
 */

/** @type {DesignSpec[]} */
const SPECS = [
  {
    file: '03-characters.md',
    injectFiles: [],
    instruction:
      `**등장인물 설계서**를 작성하세요. 출력은 한국어 마크다운입니다.\n` +
      `반드시 포함할 것:\n` +
      `- **주인공**: 가명(작품용 이름), 역할, 겉모습 요약, 핵심 욕망·결핍, 내적 갈등, 이야기에서의 목표\n` +
      `- **주요 조연** 3~6명: 이름(가제), 주인공과의 관계, 역할(정보/유머/대립/멘토 등)\n` +
      `- **대립 축**: 인물 또는 세력·규칙(개념 수준이어도 됨)으로 갈등이 생기게\n` +
      `- **관계도** 한 줄 요약 또는 표\n` +
      `concept에 인명이 없으면 작품 전개에 필요한 최소한으로 **일관된 가명**을 새로 짓되, 실존 작가·작품명은 넣지 마세요.\n` +
      `서문/맺음말 없이 본문만. 첫 줄은 \`# 등장인물 설계\` 같은 제목으로 시작하세요.`,
  },
  {
    file: '04-chapters-outline.md',
    injectFiles: ['03-characters.md'],
    instruction:
      `**제1장부터 제${CHAPTER_COUNT}장까지** 장별 개요를 작성하세요. 출력은 한국어 마크다운입니다.\n` +
      `위에 붙은 **등장인물 설계**와 컨셉의 세계관을 **모순 없이** 반영하세요.\n` +
      `각 장마다 다음 항목을 **표 또는 동일한 소제목 구조**로 빠짐없이 적으세요:\n` +
      `- 장 번호·가제 제목\n` +
      `- **이 장의 주제**(한 줄)\n` +
      `- 핵심 사건(2~4문장)\n` +
      `- 초점 인물\n` +
      `- 감정 톤·분위기\n` +
      `- 복선·정보 공개(독자에게 주는 것 / 숨기는 것)\n` +
      `정확히 ${CHAPTER_COUNT}개 장을 모두 채우세요. 첫 줄은 \`# 제1~${CHAPTER_COUNT}장 개요\` 형태로 시작해도 됩니다.`,
  },
  {
    file: '00-goals.md',
    injectFiles: ['03-characters.md', '04-chapters-outline.md'],
    instruction:
      `이 프로젝트의 **측정 가능한 집필 목표**와 비목표, 품질 기준을 bullet 위주로 정리하세요. 한국어.\n` +
      `위에 붙은 **등장인물 설계**·**장 개요**를 전제로, 다음을 반드시 언급하세요:\n` +
      `- result/NNNN.md·분량(예: 총 45만 자, 파일당 4만 자 등)은 concept와 맞출 것\n` +
      `- 집필 시 **design/03-characters.md**, **design/04-chapters-outline.md**를 준수할 것\n` +
      `- 산출물은 **소설 본문**(장면·대화), 장르 교과서형 메타 금지\n` +
      `첫 줄은 \`# 집필 목표\` 등 명확한 H1로 시작하세요.`,
  },
  {
    file: '01-plan.md',
    injectFiles: ['03-characters.md', '04-chapters-outline.md'],
    instruction:
      `concept와 붙은 설계를 실행 가능한 **단계별 계획**으로 나누세요. 한국어.\n` +
      `반드시 포함:\n` +
      `- 마일스톤(예: 설계 확정 → manuscript 또는 result 초안 → 검수 → 분량 보정)\n` +
      `- **design/03-characters.md**, **design/04-chapters-outline.md** 를 언제·어떻게 따를지\n` +
      `- 산출물 경로: \`result/\`, 필요 시 \`manuscript/chapter-NNN.md\`, \`novel-brain.json\`\n` +
      `- \`npm run stats\` 검증 시점\n` +
      `표나 번호 목록을 써도 됩니다.`,
  },
  {
    file: '02-langchain-brief.md',
    injectFiles: ['03-characters.md', '04-chapters-outline.md'],
    instruction:
      `저장소 루트의 집필 러너(go.md + LangGraph + Worker CLI)용 **실행 요약**을 작성하세요. 한국어.\n` +
      `반드시 명시:\n` +
      `- Worker는 **go.md**와 함께 **design/03-characters.md**, **design/04-chapters-outline.md**를 인물·전개의 기준으로 삼는다\n` +
      `- Supervisor/Worker 역할, go.md 태스크 순서\n` +
      `- DESIGN_DIR 번들과 concept.md 주입 관계\n` +
      `- 집필 후 novel-brain.json 갱신·npm run stats 시점\n` +
      `장황한 수사 없이 실행 가능한 지시만.`,
  },
];

/**
 * @param {string} rel
 */
async function readDesignFile(rel) {
  const p = path.join(DESIGN_DIR, rel);
  const text = await fs.readFile(p, 'utf-8');
  return text.trim();
}

/**
 * @param {DesignSpec} spec
 * @param {string} conceptRaw
 */
async function buildPrompt(spec, conceptRaw) {
  const parts = [
    `아래 "프로젝트 컨셉"을 **단일 진실 소스**로 삼고, 요청한 문서만 작성하세요.\n`,
    `출력은 **마크다운 본문만**. 서문/맺음말/코드펜스로 전체 감싸기 금지.\n\n`,
    `## 프로젝트 컨셉\n\n${conceptRaw}\n`,
  ];

  if (spec.injectFiles?.length) {
    for (const rel of spec.injectFiles) {
      try {
        const body = await readDesignFile(rel);
        parts.push(`\n\n## (이미 생성된 설계) design/${rel}\n\n${body}\n`);
      } catch (e) {
        console.error(`[design] 필요한 선행 파일을 읽을 수 없습니다: ${rel} (${e.message})`);
        throw e;
      }
    }
  }

  parts.push(`\n\n## 작성 요청\n\n${spec.instruction}\n\n`, `파일 이름(저장 예정): design/${spec.file}`);

  return parts.join('');
}

async function main() {
  const conceptRaw = await fs.readFile(CONCEPT_FILE, 'utf-8').catch(() => '');
  if (!conceptRaw.trim()) {
    console.error('[design] concept.md 가 비어 있습니다.');
    process.exit(1);
  }

  await fs.mkdir(DESIGN_DIR, { recursive: true });

  const run = (p, cwd) => runAi(AI, p, cwd);

  console.log(`[design] 장 개요 장 수: ${CHAPTER_COUNT} (DESIGN_CHAPTER_COUNT)`);
  console.log(`[design] 생성 순서: ${SPECS.map((s) => s.file).join(' → ')}`);

  for (const spec of SPECS) {
    const prompt = await buildPrompt(spec, conceptRaw);
    console.log(`\n[design] 작성 중 → design/${spec.file} (AI=${AI})`);
    const { text } = await withOllamaFallback(run, prompt, ROOT);
    const out = stripLeadingFence(text);
    const dest = path.join(DESIGN_DIR, spec.file);
    await fs.writeFile(dest, `${out.trim()}\n`, 'utf-8');
  }

  const goFile = path.join(ROOT, 'go.md');
  await generateGoFromDesign({ root: ROOT, designDir: DESIGN_DIR, goFilePath: goFile });
  console.log(`\n[design] 완료 → ${DESIGN_DIR}`);
  console.log(`[design] go.md 갱신 → ${goFile}`);
}

main().catch((e) => {
  console.error('[design]', e);
  process.exit(1);
});
