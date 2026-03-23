---
name: doc-sync
description: >
  코드 변경사항을 PRD(Notion)와 동기화. 새 기능 구현 후 PRD 업데이트,
  "PRD 업데이트해줘", "Notion에 반영해줘", "스펙 문서 갱신해줘",
  "phase 완료 표시해줘" 요청에 반드시 이 skill을 사용할 것.
---

# Doc Sync Skill

## 작업 순서 (agent loop)

1. `git diff HEAD~1` 또는 변경 파일 목록 파악
2. 변경 유형 분류 (신규 기능 / 버그픽스 / 스키마 변경 / 의존성 업데이트)
3. Notion PRD 페이지에서 관련 섹션 찾기
4. 업데이트 내용 작성 → Notion API 호출
5. AGENTS.md의 `## Current Phase` 체크리스트 업데이트

## Notion 페이지 ID
- PRD 메인: `3289ccac-a102-819f-a0e4-ce578509d683`
- Phase 0 DB: `3c613f77fc57483799caddbbb94394e3`

## 업데이트 규칙

| 변경 유형 | 업데이트 위치 |
|-----------|--------------|
| 신규 기능 구현 | PRD Feature Priority Matrix의 상태 변경 |
| DB schema 변경 | PRD Technical Architecture 섹션 |
| Phase 완료 | Phase 0 DB의 해당 Task → ✅ Done |
| 범위 변경 | PRD Out of Scope 섹션 |

## 절대 하지 말 것
- PRD에 구현 상세 코드 넣기 (링크만)
- 아직 구현 안 된 것을 Done으로 표시
- 기존 내용 삭제 (append-only 원칙)
