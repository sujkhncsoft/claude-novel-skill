# 빠른 참조 카드

## 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `/novel init` | 새 프로젝트 초기화 |
| `/novel continue` | 이어쓰기 |
| `/novel status` | 진행 대시보드 |
| `/novel write [ch] [sc]` | 씬 집필 |
| `/novel outline` | 아웃라인 관리 |
| `/novel character [name]` | 캐릭터 조회/편집 |
| `/novel item [name]` | 아이템 조회/편집 |
| `/novel foreshadow` | 복선 추적 |
| `/novel theme` | 테마 분석 |
| `/novel knowledge` | 지식 매트릭스 |
| `/novel check [ch]` | 일관성 검증 |
| `/novel prose [ch]` | 문체 분석 |
| `/novel pacing` | 텐션 곡선 |
| `/novel suggest` | AI 전개 제안 |
| `/novel voice [name]` | 대사 생성 |
| `/novel serialize` | 연재 관리 |
| `/novel publish` | 출판 관리 |
| `/novel synopsis` | 시놉시스 생성 |

## 씬 작성 전 체크

1. 캐릭터 프로필 확인
2. 소지품/아이템 확인
3. 활성 복선 확인
4. 독자 지식 상태 확인
5. 텐션 목표 설정
6. 테마 반영점 확인

## 씬 작성 후 업데이트

1. 아이템 위치/상태
2. 복선 추적기
3. 지식 매트릭스
4. 테마 추적기
5. 감정 곡선
6. 단어 수

## 텐션 등급

1=이완 / 2=낮음 / 3=보통 / 4=높음 / 5=극한

## 파일 구조

```
novel-brain.json     -- 중앙 추적 데이터
00-core/             -- 대시보드, 컨텍스트, 스타일
01-world/            -- 세계관, 지리, 감각
02-characters/       -- 캐릭터 프로필
03-plot/             -- 플롯, 복선, 아이템, 테마
04-manuscript/       -- 원고
05-psychology/       -- 감정 곡선
06-research/         -- 참고 자료
07-business/         -- 시놉시스, 피드백
08-feedback/         -- 베타 리더 등
09-productivity/     -- 집필 생산성
10-visuals/          -- 이미지 프롬프트
11-templates/        -- 창작 도구
```
