# Tech Debt Tracker

## Active Debt

| ID | 영역 | 설명 | 우선순위 | Phase |
|----|------|------|----------|-------|
| TD-003 | Types | `types/app-database.ts` 확장 타입 — Supabase CLI 자동 생성으로 통합 가능 | 낮음 | 2 |
| TD-004 | Pages | Jobs, Schedule, Materials 워크플로우의 브라우저 QA와 문서화 부족 | 중간 | 2 |

## Resolved Debt

| ID | 영역 | 설명 | 해결 방법 | 해결일 |
|----|------|------|----------|--------|
| TD-001 | API | `/api/webhooks/stripe`와 `/api/stripe/webhook` 중복 라우트 | 공식 endpoint를 `/api/webhooks/stripe`로 고정하고 legacy route는 308 redirect로 전환 | 2026-04-25 |
| TD-002 | Pricing | CLAUDE.md 가격($29/$49)과 실제 코드($39/$59) 불일치 | CLAUDE.md에서 가격 테이블 제거 → `config/plans.ts`가 단일 소스 | 2026-03-30 |
| TD-005 | Harness | `.agents/skills/`와 `.claude/skills/` 99% 중복 | `.agents/` 디렉토리 전체 삭제, `.claude/skills/` 단일 위치로 통합 | 2026-03-30 |

## 부채 추가 규칙

1. 발견 즉시 이 파일에 기록
2. 우선순위: 높음(보안/정합성), 중간(UX/DX), 낮음(리팩터링)
3. 해결되면 Resolved 섹션으로 이동 + 해결일 기록
