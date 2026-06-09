# Features Documentation Index

기능별 설계 문서. 각 기능은 단일 md 파일로 통합 — 데이터 모델, UX, 빌드 순서, AC가 한 자리에.

## v1 Workflow Replacement + Deferred AI

| 파일 | 내용 |
|------|------|
| [V1-PLAN.md](./ai/V1-PLAN.md) | **current v1 plan** — 기존 Excel 가격표 참고 → 앱 내 simple price book setup → quote → PDF/email → follow-up → invoice/schedule workflow replacement. AI-first plan은 superseded |
| [V1-APP-BUILD-PLAN.md](./ai/V1-APP-BUILD-PLAN.md) | **core workflow build order before AI** — A의 실제 가격표를 앱 안 simple price book으로 세팅한 뒤 quote PDF/email 재현, release gate, post-core AI 재개 조건 |
| [V1-TASK1-RATE-SOURCE-AUDIT.md](./ai/V1-TASK1-RATE-SOURCE-AUDIT.md) | **Task 1 detailed plan/status** — Task 1A canonical quote totals/invoice parity 구현 완료, Task 1B duplicate priced scope guard/full verification 남음 |
| [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./ai/V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md) | **Task 2 detailed plan/status** — Quick/Advanced rate boundary, snapshot immutability, setup warnings, duplicate scope guard dependency, stale-rate tests |
| [PHASE0-CHECKLIST.md](./ai/PHASE0-CHECKLIST.md) | Phase 0 실행 체크리스트 — 날짜별 validation plan, interview log, golden set, cost economics, Pro trial conversion, gate result 기록장 |
| [AI-ASSISTANT.md](./ai/AI-ASSISTANT.md) | **deferred AI rules** — core workflow release 전 AI/photo/Qwen/usage 작업 금지, post-core admin layer 허용 범위 |

> ⚠️ AI/photo analysis is deferred until the core workflow release gate in [PLANS.md](../PLANS.md) passes.

## Quote

| 파일 | 내용 |
|------|------|
| [QUOTE.md](./quote/QUOTE.md) | 견적 빌더 — 데이터 모델, Interior/Quick/Day rate/Manual/Exterior 5 modes, status workflow, pricing rules, public approval, AC, active risks |
| [PRICE-BOOK-TEMPLATE.md](./quote/PRICE-BOOK-TEMPLATE.md) | Coatly simple price book setup — 앱 내 직접 추가 우선, Excel/CSV 템플릿은 선택적 bulk input, arbitrary Excel import 금지 |
| [AI-QUOTE-FORM-STRUCTURE.md](./quote/AI-QUOTE-FORM-STRUCTURE.md) | Post-core reference — legacy quote form 분석, scope section/pricing row/clause library 구조. AI 확장은 core workflow release 후 |

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
| [BILLING.md](./billing/BILLING.md) | Starter A$39 / Pro A$59 현재 billing 기준, AI-first Basic A$29 가정은 superseded |

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
| [AUDIT.md](./audit/AUDIT.md) | 활성 findings(A1–A8 포함 workflow release gate, deferred AI governance), 해결 이력, tech debt 트래커, 운영 검증 체크리스트, KPI |
