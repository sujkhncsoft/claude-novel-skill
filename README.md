# Novel -- 소설 창작 AI 협업 스킬

SuperClaude v1.0.0 소설 창작 통합 시스템.

## 개요

장편 소설 집필을 체계적으로 관리하는 AI 협업 스킬.
캐릭터, 플롯, 세계관, 아이템, 테마를 각각 독립된 추적 시스템으로 관리하며,
장르별 프리셋과 웹소설 연재/출판 파이프라인을 지원한다.

## 구조

```
novel/
  SKILL.md                  -- 핵심 인덱스 + 원칙
  README.md                 -- 이 파일
  guides/                   -- 13개 전문 가이드
    character-system.md      -- 캐릭터 관리
    plot-structure.md        -- 플롯 구조
    worldbuilding.md         -- 세계관 구축
    item-tracking.md         -- 아이템 추적
    theme-symbolism.md       -- 테마/상징
    pacing-tension.md        -- 페이싱/텐션
    reader-experience.md     -- 독자 경험
    serialization.md         -- 웹소설 연재
    prose-craft.md           -- 산문 기법
    genre-presets.md         -- 장르 프리셋
    beginner-guide.md        -- 초보자 가이드
    publishing-pipeline.md   -- 출판 파이프라인
    ai-collaboration.md      -- AI 협업
  references/
    novel-brain.json         -- 추적 데이터 스키마
    quick-ref.md             -- 빠른 참조 카드
    image-prompts.md         -- 이미지 생성 프롬프트
    creative-prompts.md      -- 창작 프롬프트
    templates/project/       -- 프로젝트 초기화 템플릿
  src/                       -- LangGraph + go.md 자율 집필 러너 (Node)
```

## pnpm 워크플로 (`pnpm concept` / `design` / `dev`)

저장소 루트에 `package.json`이 있습니다. **pnpm**으로 설치 후:

| 명령 | 설명 |
|------|------|
| `pnpm concept` | `concept.md`를 읽고, `node_modules` 등을 제외한 **모든 `.md`**를 컨셉에 맞게 갱신 (기본: `design/` 제외, `CONCEPT_INCLUDE_DESIGN=1`로 포함) |
| `pnpm design` | `concept.md`만을 근거로 `design/00-goals.md`, `01-plan.md`, `02-langchain-brief.md` 생성 (LangChain 에이전트용 계획·목표) |
| `pnpm dev` | `design/**/*.md`를 `DESIGN_DIR`로 주입하고 **`src/index.js`** LangGraph 러너 실행 (루트 `.env`에 `NOVEL_ROOT`, `GO_FILE` 등) |

```bash
pnpm install
# concept.md 작성 후
pnpm concept
pnpm design
# 루트 .env 설정 후
pnpm dev
```

## LangGraph 자율 집필 (`src/`)

`ai_template`와 비슷하게 **go.md 태스크**를 순차 실행하고, **AUTO_RESTART**로 세션을 넘겨 장편을 이어 씁니다. Worker는 **Claude / Gemini / Codex CLI**로 로컬에서 돌며, `NOVEL_ROOT`의 `novel-brain.json`·`manuscript/`·스킬 `SKILL.md` 발췌를 프롬프트에 주입합니다.

**45만 자 이상**을 노리면 기본값(`TARGET_MIN_CHARS=450000`, `TYPICAL_CHAPTER_CHARS=10000`)으로 약 **45챕터 분량**의 태스크가 생성됩니다. `pnpm run generate-tasks`로 `go.md`의 `###` 목록을 재계산합니다.

```bash
pnpm install
copy .env.example .env   # Windows: NOVEL_ROOT, GO_FILE, WORKER_AI 등 설정
pnpm run init-novel -- ./path/to/my-novel
# .env: NOVEL_ROOT=./path/to/my-novel, GO_FILE=./path/to/my-novel/go.md
pnpm run generate-tasks
pnpm start
pnpm run stats -- --novel-root ./path/to/my-novel
```

## GitHub Copilot

VS Code·GitHub에서 Copilot을 쓸 때는 저장소 루트의 **`.github/copilot-instructions.md`** 가 자동 컨텍스트로 붙는다. 슬래시 명령 없이도 `SKILL.md`와 동일한 집필 원칙·구조를 따르도록 정리되어 있다.

## 사용법

```
/novel init        -- 새 프로젝트 시작
/novel continue    -- 이어쓰기
/novel status      -- 진행 현황
/novel write 3 2   -- 3장 2씬 집필
```

상세: `SKILL.md` 참조.

## 설치

```bash
# 1. 저장소 클론
git clone https://github.com/looki/claude-novel-skill.git

# 2. 스킬 디렉토리에 복사
cp -r claude-novel-skill/ ~/.claude/skills/novel/

# 3. skill-index.json에 등록 (수동)
# ~/.claude/skills/skill-index.json의 "skills" 객체에 아래 추가:
```

```json
"novel": {
  "path": "novel/SKILL.md",
  "tags": ["writing", "creative", "novel", "storytelling"],
  "priority": "high",
  "source": "custom",
  "slash_command": "novel",
  "auto_trigger": ["소설", "창작", "집필", "novel"],
  "features": ["캐릭터 관리", "플롯 구조", "세계관", "아이템 추적", "테마 추적", "장르 프리셋", "웹소설 연재", "출판 파이프라인"],
  "description": "소설 창작 집필 캐릭터 플롯 세계관 아이템 테마 복선 장르 웹소설 연재 출판 공모전",
  "synonyms": ["소설 써줘", "소설 도와줘", "창작 시작", "집필 시작"]
}
```

## 주요 기능

### 추적 시스템 (6종)
- **캐릭터**: 프로필, 감정 그래프, 아크, 지식 매트릭스
- **아이템**: 유형별 분류, 생명주기, 소유 이력
- **테마/상징**: 심화 5단계, 모티프 반복, 트로프 인식
- **장소**: 5감 프로파일, 시간대별 변화
- **갈등/페이싱**: 강도 추적, 장면 유형 비율
- **독자 경험**: 의도 감정 설계, 정보 상태

### 장르 프리셋 (4종)
- 판타지: 마법 시스템, 파워 스케일링
- 미스터리: 페어플레이 검증, 용의자 매트릭스
- 로맨스: 비트 시트, 감정 온도계
- 호러/스릴러: 공포 곡선, 생존자 추적

### 웹소설 연재
- 플랫폼 규격 (카카오페이지/네이버시리즈/문피아)
- 수익화 전략 (무료/기다무/유료)
- 연재 버퍼 관리

### 출판 파이프라인
- 한국 공모전/문학상 DB
- 원고 규격 변환
- 투고 추적기

### 초보 작가 지원
- 멘토 모드 (피드백에 "왜" 설명 추가)
- 질문형 아웃라인 스캐폴딩
- 작법 용어 사전
- 흔한 실수 Top 20

## 라이선스

MIT
