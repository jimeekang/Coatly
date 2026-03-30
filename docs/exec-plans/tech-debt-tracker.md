# Tech Debt Tracker

## Active Debt

| ID | 영역 | 설명 | 우선순위 | Phase |
|----|------|------|----------|-------|
| TD-001 | API | `/api/webhooks/stripe`와 `/api/stripe/webhook` 중복 라우트 | 중간 | 1 |
| TD-002 | Pricing | CLAUDE.md 가격($29/$49)과 실제 코드($39/$59) 불일치 | 높음 | 1 |
| TD-003 | Types | `types/app-database.ts` 확장 타입 — Supabase CLI 자동 생성으로 통합 가능 | 낮음 | 2 |
| TD-004 | Pages | Jobs, Schedule, Materials 페이지 placeholder 상태 | 중간 | 2 |
| TD-005 | Harness | `.agents/skills/`와 `.claude/skills/` 99% 중복 → 이 PR에서 해결 | 높음 | 1 |

## Resolved Debt

| ID | 영역 | 설명 | 해결 방법 | 해결일 |
|----|------|------|----------|--------|
| — | — | 아직 없음 | — | — |

## 부채 추가 규칙

1. 발견 즉시 이 파일에 기록
2. 우선순위: 높음(보안/정합성), 중간(UX/DX), 낮음(리팩터링)
3. 해결되면 Resolved 섹션으로 이동 + 해결일 기록
