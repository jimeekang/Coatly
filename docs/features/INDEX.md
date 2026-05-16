# Features Documentation Index

기능별 설계 문서. 각 기능은 단일 md 파일로 통합 — 데이터 모델, UX, 빌드 순서, AC가 한 자리에.

## AI Quote Writer (v1 wedge)

| 파일 | 내용 |
|------|------|
| [V1-PLAN.md](./ai/V1-PLAN.md) | **v1 wedge build plan** — Phase 0 validation, GREEN gate, T1–T12 work items, AI 역할 boundary, ai_usage_logs schema, streaming pattern, worktree lanes, timeline |
| [PHASE0-CHECKLIST.md](./ai/PHASE0-CHECKLIST.md) | Phase 0 실행 체크리스트 — 날짜별 validation plan, interview log, golden set, cost economics, Stripe payment link, gate result 기록장 |
| [AI-ASSISTANT.md](./ai/AI-ASSISTANT.md) | AI Draft Panel + Workspace Assistant 현재 상태, v1 갭, status checklist |

> ⚠️ Stale `price_rates` race (v1.1 deferred) — [/TODOS.md](../../TODOS.md) 참조.

## Quote

| 파일 | 내용 |
|------|------|
| [QUOTE.md](./quote/QUOTE.md) | 견적 빌더 — 데이터 모델, Interior/Quick/Day rate/Manual/Exterior 5 modes, status workflow, pricing rules, public approval, AC, active risks |

## Invoice

| 파일 | 내용 |
|------|------|
| [INVOICE.md](./invoice/INVOICE.md) | 청구서 시스템 — 데이터 모델, 4 invoice types(full/deposit/progress/final), 상태 워크플로우, 부분 납부, public PDF token, reminder cron |

## Customer

| 파일 | 내용 |
|------|------|
| [CUSTOMER.md](./customer/CUSTOMER.md) | 고객 관리 — CRUD, 아카이브, 견적/청구 이력 |

## Auth & Onboarding

| 파일 | 내용 |
|------|------|
| [AUTH.md](./auth/AUTH.md) | 인증 플로우, 온보딩 단계, ABN autofill, 미들웨어 라우팅, 비밀번호 재설정 |

## Billing & Subscription

| 파일 | 내용 |
|------|------|
| [BILLING.md](./billing/BILLING.md) | Starter A$39 / Pro A$59 plan 정의, Stripe 연동, webhook 멱등성, 취소/갱신 |

## PDF Generation

| 파일 | 내용 |
|------|------|
| [PDF.md](./pdf/PDF.md) | React-PDF 선택 이유(Vercel serverless), API 라우트, 템플릿 구조, 브랜딩 |

## Schedule & Google Calendar

| 파일 | 내용 |
|------|------|
| [SCHEDULE.md](./schedule/SCHEDULE.md) | Schedule + Google Calendar 통합 현재 상태, Google write 실패 정책, multi-day jobs |

## Design System

| 파일 | 내용 |
|------|------|
| [DESIGN-SYSTEM.md](./design-system/DESIGN-SYSTEM.md) | Core beliefs(cents, RLS, server-first, mobile-first, serverless, type safety) + UI 일관성 감사 + 통합 계획 |

## Audit & Tech Debt

| 파일 | 내용 |
|------|------|
| [AUDIT.md](./audit/AUDIT.md) | 활성 findings(A1–A8 포함 v1 wedge governance, stale price_rates race), 해결 이력, tech debt 트래커, 운영 검증 체크리스트, KPI |
