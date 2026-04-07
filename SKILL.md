---
name: novel
description: "체계적 소설 작성 AI 협업 스킬. 캐릭터/플롯/세계관/아이템/테마 추적 + 장르별 프리셋 + 웹소설 연재 + 출판 파이프라인. 범용 창작 시스템."
context_requires:
  must: []
  optional: [skills/novel/guides/character-system.md, skills/novel/guides/plot-structure.md, skills/novel/guides/worldbuilding.md, skills/novel/guides/item-tracking.md, skills/novel/guides/theme-symbolism.md, skills/novel/guides/pacing-tension.md, skills/novel/guides/reader-experience.md, skills/novel/guides/serialization.md, skills/novel/guides/prose-craft.md, skills/novel/guides/genre-presets.md, skills/novel/guides/publishing-pipeline.md, skills/novel/guides/ai-collaboration.md]
version: "1.0.0"
---

# Novel -- 소설 창작 AI 협업 스킬

체계적 소설 작성을 위한 통합 시스템.
캐릭터/플롯/세계관/아이템/테마를 구조화하여 추적하고,
AI와의 협업 워크플로우를 통해 일관성 있는 장편 소설을 완성한다.

---

## 1. 빠른 시작

### 1-1. 새 프로젝트 초기화

```
/novel init
```

실행 시 다음 인터뷰를 진행한다:

| 순서 | 질문 | 목적 |
|------|------|------|
| Q1 | 장르 선택 (판타지/SF/로맨스/스릴러/문학/웹소설/기타) | 장르 프리셋 적용 |
| Q2 | 분량 목표 (단편/중편/장편/웹소설 연재) | 구조 템플릿 결정 |
| Q3 | 핵심 전제 1줄 (로그라인) | 플롯 시드 생성 |
| Q4 | 작업 모드 (Full Auto / Collaborative / Directed) | AI 협업 깊이 설정 |

인터뷰 완료 후 자동 생성되는 항목:
- `novel-brain.json` -- 프로젝트 메타데이터 + 추적 상태
- `00-core/` -- 대시보드, 활성 컨텍스트, 스타일 가이드
- `03-plot/` -- 메인 플롯 구조, 챕터 아웃라인 초안
- `.novel-config` -- 장르 프리셋 설정 파일

### 1-2. 기존 프로젝트 이어쓰기

```
/novel continue
```

`novel-brain.json`을 읽어 마지막 작업 위치와 활성 컨텍스트를 복원한다.

### 1-3. 빠른 씬 작성

```
/novel write [챕터번호] [씬번호]
```

해당 씬의 체크리스트를 자동 로드하고, 연관 캐릭터/아이템/복선 상태를 주입한다.

---

## 2. 핵심 원칙

### 2-1. 일관성 (Consistency)

- 모든 설정, 캐릭터 특성, 세계관 규칙은 단일 진실 소스(SSOT)에 기록한다
- 씬 작성 전 반드시 관련 추적 데이터를 참조한다
- 변경 발생 시 모든 연관 문서를 동기화한다

### 2-2. 독자 우선 (Reader-First)

- 독자의 정보 상태를 추적한다 (지식 매트릭스)
- 감정 곡선을 의식적으로 설계한다
- 페이지 터너 체크리스트로 매 씬의 견인력을 검증한다

### 2-3. 체계적 관리 (Systematic Management)

- 캐릭터, 아이템, 복선, 테마를 각각 독립 추적 시스템으로 관리한다
- 자동화된 검증으로 모순과 누락을 탐지한다
- 정량 지표로 집필 진행 상황을 측정한다

### 2-4. 장르 존중 (Genre Awareness)

- 장르별 독자 기대치를 이해하고 프리셋으로 반영한다
- 장르 관습(trope)을 의식적으로 활용하거나 전복한다
- 클리셰 감시 목록으로 무의식적 반복을 방지한다

---

## 3. 워크플로우

### 3-1. 일일 집필 루틴

```
[시작] novel-brain.json 로드
  -> 활성 컨텍스트 확인 (어디까지 썼는가)
  -> 오늘 작업할 씬 결정
  -> 씬 체크리스트 생성/검토
  -> 집필 (AI 협업 모드에 따라)
  -> 씬 완료 후 추적 데이터 업데이트
[종료] 활성 컨텍스트 저장
```

### 3-2. 주간 점검

| 항목 | 검증 내용 |
|------|----------|
| 플롯 진행도 | 전체 구조 대비 현재 위치 |
| 캐릭터 등장 빈도 | 주요 캐릭터 소외 여부 |
| 복선 상태 | 심은 복선 중 미회수 항목 |
| 아이템 위치 | 소지품/위치 일관성 |
| 감정 곡선 | 텐션 단조로움 여부 |
| 테마 반영도 | 핵심 테마 각 장 반영 비율 |

### 3-3. 마일스톤 점검 (10장 단위 / 에피소드 완결 시)

- 전체 플롯 구조 재검토
- 캐릭터 아크 진행도 확인
- 세계관 일관성 종합 검증
- 독자 지식 매트릭스 정합성 확인
- 프로즈 분석 (문체 일관성, 클리셰 비율)

### 3-4. 웹소설 연재 루틴 (선택)

```
버퍼 관리 -> 회차 작성 -> 편집 -> 예약 발행 -> 독자 피드백 수집
```

상세: `guides/serialization.md`

---

## 4. 명령어 레퍼런스

### 4-1. 프로젝트 관리

| 명령어 | 설명 |
|--------|------|
| `/novel init` | 새 소설 프로젝트 초기화 (인터뷰 시작) |
| `/novel continue` | 기존 프로젝트 이어쓰기 |
| `/novel status` | 현재 진행 상황 대시보드 |
| `/novel config` | 장르 프리셋/설정 변경 |

### 4-2. 집필

| 명령어 | 설명 |
|--------|------|
| `/novel write [ch] [scene]` | 특정 씬 집필 시작 |
| `/novel outline` | 챕터/씬 아웃라인 생성/수정 |
| `/novel brainstorm [주제]` | 브레인스토밍 세션 |
| `/novel rewrite [ch] [scene]` | 기존 씬 재작성 |

### 4-3. 추적 시스템

| 명령어 | 설명 |
|--------|------|
| `/novel character [이름]` | 캐릭터 프로필 조회/편집 |
| `/novel item [이름]` | 아이템 상태 조회/편집 |
| `/novel foreshadow` | 복선 추적기 열기 |
| `/novel theme` | 테마/상징 분석 |
| `/novel knowledge` | 독자 지식 매트릭스 |
| `/novel timeline` | 작품 내 시간축 확인 |

### 4-4. 분석/검증

| 명령어 | 설명 |
|--------|------|
| `/novel check [ch]` | 챕터 일관성 검증 |
| `/novel prose [ch]` | 문체 분석 (수사 밀도, 리듬, 클리셰) |
| `/novel pacing` | 전체 페이싱/텐션 곡선 분석 |
| `/novel consistency` | 종합 일관성 검증 |

### 4-5. 출판/연재

| 명령어 | 설명 |
|--------|------|
| `/novel serialize` | 웹소설 연재 관리 |
| `/novel publish` | 출판 파이프라인 (공모전/투고) |
| `/novel synopsis` | 시놉시스/기획서 생성 |
| `/novel query` | 출판사 투고용 쿼리 레터 |

### 4-6. AI 협업

| 명령어 | 설명 |
|--------|------|
| `/novel suggest` | AI가 다음 전개 3안 제시 |
| `/novel challenge` | AI가 현재 방향에 도전/반론 |
| `/novel fill [gap]` | 부족한 설정/디테일 AI 보충 |
| `/novel voice [캐릭터]` | 특정 캐릭터 목소리로 대사 생성 |

---

## 5. 모듈 인덱스

13개 가이드 문서가 각 전문 영역을 담당한다.

| 모듈 | 파일 | 설명 |
|------|------|------|
| 캐릭터 시스템 | `guides/character-system.md` | 캐릭터 프로필, 관계도, 아크 추적, 대화 음성 관리 |
| 플롯 구조 | `guides/plot-structure.md` | 3막/5막/기승전결/웹소설 구조, 복선, 서브플롯 |
| 세계관 구축 | `guides/worldbuilding.md` | 세계관 규칙, 지리, 문화, 마법/기술 체계 |
| 아이템 추적 | `guides/item-tracking.md` | 물건/소지품 위치 추적, 상태 변화, 씬별 인벤토리 |
| 테마/상징 | `guides/theme-symbolism.md` | 주제 추적, 모티프, 상징 체계, 반복 이미지 |
| 페이싱/텐션 | `guides/pacing-tension.md` | 긴장 곡선, 씬 리듬, 챕터 엔딩 훅, 휴식 배치 |
| 독자 경험 | `guides/reader-experience.md` | 독자 지식 매트릭스, 감정 여정, 서스펜스 관리 |
| 웹소설 연재 | `guides/serialization.md` | 연재 버퍼, 회차 구조, 독자 유지율, 수익화 |
| 산문 기법 | `guides/prose-craft.md` | 문체 분석, 수사법, 문장 리듬, 클리셰 감지 |
| 장르 프리셋 | `guides/genre-presets.md` | 장르별 독자 기대, trope 관리, 장르 혼합 전략 |
| 초보자 가이드 | `guides/beginner-guide.md` | 처음 소설 쓰는 사용자를 위한 단계별 안내 |
| 출판 파이프라인 | `guides/publishing-pipeline.md` | 공모전, 출판사 투고, 자가출판, 포맷팅 |
| AI 협업 | `guides/ai-collaboration.md` | AI 활용 전략, 프롬프트 패턴, 창작 주도권 |

---

## 6. 템플릿 인덱스

프로젝트 초기화 시 복사되는 템플릿 파일들.

### 6-1. 핵심 (00-core)

| 파일 | 용도 |
|------|------|
| `dashboard.md` | 프로젝트 전체 현황 대시보드 |
| `active-context.md` | 현재 작업 위치, 최근 변경, 다음 할 일 |
| `style-guide.md` | 문체 규칙, 용어 사전, 표기법 통일 |

### 6-2. 세계관 (01-world)

| 파일 | 용도 |
|------|------|
| `rules.md` | 세계관 핵심 규칙 (마법/기술/사회 법칙) |
| `geography.md` | 지리, 지도, 장소 목록 |
| `location-sensory.md` | 장소별 오감 묘사 데이터 |

### 6-3. 캐릭터 (02-characters)

| 파일 | 용도 |
|------|------|
| `_template.md` | 캐릭터 프로필 템플릿 (복사하여 사용) |

### 6-4. 플롯 (03-plot)

| 파일 | 용도 |
|------|------|
| `main-plot.md` | 메인 플롯 구조 (3막/5막/기승전결) |
| `foreshadow-tracker.md` | 복선 심기/회수 추적표 |
| `thread-tracker.md` | 서브플롯/스레드 진행 추적 |
| `item-tracker.md` | 아이템 위치/상태 추적표 |
| `theme-tracker.md` | 테마/모티프 등장 추적표 |
| `knowledge-matrix.md` | 캐릭터별 정보 보유 매트릭스 |
| `scene-checklist.md` | 씬 작성 전 체크리스트 템플릿 |
| `chapter-outline.md` | 챕터 아웃라인 템플릿 |

### 6-5. 심리 (05-psychology)

| 파일 | 용도 |
|------|------|
| `emotion-graph.md` | 감정 곡선 설계/추적 |

### 6-6. 비즈니스 (07-business)

| 파일 | 용도 |
|------|------|
| `synopsis-query.md` | 시놉시스 + 출판사 쿼리 레터 템플릿 |
| `beta-feedback.md` | 베타 리더 피드백 수집 양식 |

### 6-7. 비주얼 (10-visuals)

| 파일 | 용도 |
|------|------|
| `image-prompts.md` | 캐릭터/장소/씬 이미지 생성 프롬프트 |

### 6-8. 창작 도구 (11-templates)

| 파일 | 용도 |
|------|------|
| `creative-prompts.md` | 막힘 돌파용 창작 프롬프트 모음 |

---

## 7. 성공 지표

### 7-1. 정량 지표

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| 일일 작성량 | novel-brain.json 자동 기록 | 목표 분량의 80%+ 달성 |
| 일관성 오류 | `/novel consistency` 검증 | 장당 0건 |
| 복선 회수율 | foreshadow-tracker 기준 | 100% (의도적 미회수 제외) |
| 아이템 추적 정확도 | item-tracker 기준 | 100% |
| 클리셰 비율 | prose 분석 | 5% 이하 |
| 연재 버퍼 | serialization 기준 | 3회분 이상 |

### 7-2. 정성 지표

| 지표 | 평가 방법 |
|------|----------|
| 캐릭터 설득력 | 대사/행동이 프로필과 일치하는가 |
| 세계관 몰입도 | 오감 묘사와 규칙 일관성 |
| 감정 곡선 효과 | 텐션 변화가 의도대로 작동하는가 |
| 테마 깊이 | 주제가 장면에 유기적으로 녹아 있는가 |
| 독자 만족 | 베타 리더 피드백 / 연재 반응 |

---

## 8. 마스터 체크리스트

### 8-1. 씬 작성 전

- [ ] 관련 캐릭터 프로필 확인
- [ ] 해당 씬의 캐릭터별 아이템/소지품 확인
- [ ] 이전 씬에서 심은 복선 중 이 씬에서 회수할 것 확인
- [ ] 이 씬에서 새로 심을 복선 계획
- [ ] 독자가 현재 알고 있는 정보 확인 (지식 매트릭스)
- [ ] 텐션 레벨 목표 설정
- [ ] 테마 반영 포인트 확인

### 8-2. 씬 작성 후

- [ ] 캐릭터 행동이 프로필과 일치하는가
- [ ] 아이템 위치/상태가 정확한가
- [ ] 시간 경과가 자연스러운가
- [ ] 공간 이동이 세계관 지리와 일치하는가
- [ ] 새로 등장한 정보를 지식 매트릭스에 반영했는가
- [ ] 복선 추적기를 업데이트했는가
- [ ] 테마 추적기를 업데이트했는가
- [ ] 챕터 엔딩 훅이 있는가 (마지막 씬인 경우)

### 8-3. 챕터 완료 후

- [ ] 챕터 아웃라인 대비 실제 내용 비교
- [ ] 전체 플롯 진행도 업데이트
- [ ] 캐릭터 아크 진행도 업데이트
- [ ] 감정 곡선 점검
- [ ] 대시보드 업데이트

### 8-4. 1부/시즌 완료 후

- [ ] 전체 일관성 검증 (`/novel consistency`)
- [ ] 문체 분석 (`/novel prose`)
- [ ] 미회수 복선 목록 확인
- [ ] 캐릭터별 등장 빈도 분석
- [ ] 테마 반영도 종합 분석
- [ ] 다음 부/시즌 아웃라인 초안

---

## 9. novel-brain.json 구조

프로젝트 루트의 `novel-brain.json`이 모든 추적 데이터의 중앙 허브 역할을 한다.
상세 스키마: `references/novel-brain.json`

주요 섹션:
- `metadata` -- 프로젝트 기본 정보
- `settings` -- 장르 프리셋, AI 협업 모드
- `characterTracking` -- 캐릭터 상태, 관계도
- `plotTracking` -- 플롯 진행, 복선, 서브플롯
- `worldState` -- 세계관 현재 상태
- `itemTracking` -- 아이템 위치/상태
- `themeTracking` -- 테마/모티프/상징
- `knowledgeMatrix` -- 캐릭터별 정보 보유 상태
- `proseAnalysis` -- 문체 분석 결과
- `genrePreset` -- 장르 규칙/trope 감시
- `serializationTracking` -- 연재 관리
- `publishingPipeline` -- 출판/공모전 추적
- `validation` -- 자동 검증 규칙

---

## 10. 장르 프리셋 요약

| 장르 | 핵심 규칙 | 주의 trope |
|------|----------|-----------|
| 판타지 | 마법 체계 일관성, 세계관 깊이 | 선택받은 자, 예언, 멘토 사망 |
| SF | 과학적 개연성, 기술 영향 탐구 | 디스토피아 클리셰, 기술 만능 |
| 로맨스 | 감정선 밀도, 관계 발전 단계 | 삼각관계 남용, 강제 갈등 |
| 스릴러 | 텐션 유지, 정보 비대칭 | 과도한 반전, 데우스 엑스 마키나 |
| 문학 | 내면 탐구, 산문 품질 | 과잉 서술, 서사 부재 |
| 웹소설 | 회차별 훅, 빠른 전개 | 파워 인플레, 하렘 남용 |

상세: `guides/genre-presets.md`

---

## 부록: 관련 스킬 연계

| 상황 | 연계 스킬 |
|------|----------|
| 소설 표지/삽화 생성 | `canvas-design` |
| 캐릭터 비주얼 참조 | `html-to-image` |
| 세계관 지도 제작 | `diagram` |
| 소설 기반 프레젠테이션 | `slides` |
| 소설 홍보 콘텐츠 | `sns` |
| 소설 웹사이트 | `frontend-design` |
| 시장 조사 (장르 트렌드) | `research` |
