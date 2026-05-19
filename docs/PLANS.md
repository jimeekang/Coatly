# Coatly — Roadmap & Progress

> Phase/progress의 단일 소스입니다. 기준일: 2026-05-17.

## Ownership

| 영역 | 담당 |
|------|------|
| 플랜, 우선순위, 디자인, 앱 구성, progress 정리 | Claude Code |
| 구현, 버그 수정, DB, 테스트, 배포, git | Codex |

## Phase Overview

| Phase | 이름 | 상태 | 요약 |
|-------|------|------|------|
| 0 | Foundation | 완료 | 프로젝트, Supabase, Auth, Stripe, Vercel |
| 1 | Core Features | 완료 | 고객, 견적, PDF, invoice, billing |
| 2 | AI & Operations | 진행 중 | AI, schedule, email, public quote, jobs 고도화 |
<<<<<<< HEAD
| **v1 AI Quote Writer push** | **wedge 재정의** | **GREEN / build ready** | **AI Quote Writer = Basic A$29 + Pro A$59 wedge. validation 완료 → build 6–8주 → Pro 1개월 무료 trial + paid conversion 4주. 자세한 건 [features/ai/V1-PLAN.md](./features/ai/V1-PLAN.md)** |
=======
| **v1 AI Quote Writer push** | **wedge 재정의** | **Phase 0 GREEN / build 진행 중** | **AI Quote Writer = Basic A$29 limited AI + Pro A$59 full AI wedge. Task 1 pricing foundation, Task 2 Quick/Advanced rate boundary, Task 3 Room Price Library redesign 완료. 다음은 Task 4 quote form structure. 자세한 건 [features/ai/V1-PLAN.md](./features/ai/V1-PLAN.md)** |
>>>>>>> phrase0
| 3 | Integrations & Scale | 계획 | accounting sync, 운영/분석 고도화 |

## Implemented Progress

### Phase 0 — Foundation

- [x] Next.js 16 App Router + TypeScript strict
- [x] Supabase Auth, Postgres, RLS, Storage
- [x] Stripe subscription scaffold
- [x] Vercel deployment baseline
- [x] Vitest + Testing Library setup

### Phase 1 — Core Features

- [x] Customer CRUD, archive, detail/history
- [x] Quote CRUD, room/surface breakdown, status workflow
- [x] Quote PDF with business branding
- [x] Invoice CRUD, line items, invoice types, partial payment
- [x] Invoice PDF with bank/business defaults
- [x] Business onboarding, ABN lookup, logo upload
- [x] Stripe checkout, portal, webhook sync, plan gating
<<<<<<< HEAD
- [x] Basic/legacy Starter active quote limit and Pro unlimited behavior
=======
- [x] subscription scaffold, active quote limit, Pro behavior
>>>>>>> phrase0
- [x] Materials & services catalogue with CSV import/export
- [x] Price/rate settings and profitability display

### Phase 2 — Implemented So Far

- [x] Workspace Assistant on dashboard, Pro gated
- [x] AI quote drafting panel on quote create screen
<<<<<<< HEAD
- [x] Quote templates with Basic/Pro limits
=======
- [x] Quote templates with plan limits
>>>>>>> phrase0
- [x] Quote email send via Resend
- [x] Public quote link `/q/[token]`
- [x] Public approve/reject with typed signature
- [x] Public quote optional items and PDF access
- [x] Approved quote public booking flow
- [x] Jobs workspace folded into Schedule list view
- [x] Multi-day job scheduling with `job_schedule_days`
- [x] Google Calendar OAuth connection and settings
- [x] Schedule page showing jobs, internal events, and Google events
- [x] Invoice customer email with public PDF token
- [x] Invoice reminder cron with idempotency event table
- [x] Dashboard KPI cards and quote pipeline summary
- [x] DB hardening migrations through 049

## v1 AI Quote Writer Push (2026-05-16)

<<<<<<< HEAD
> Wedge 재정의(2026-05-15 office-hours): AI Quote Writer가 A$59 Pro paying user 확보의 본질. Phase 0은 2026-05-17 GREEN. Phase 2 AI 시드 위에 production-grade AI Draft + Rate Library/price_rates deterministic pricing + Qwen provider adapter + usage governance를 build하고, Pro 1개월 무료 trial 후 paid conversion을 측정한다.

| Step | 기간 | 상태 | 산출물 |
|------|------|------|--------|
| Phase 0 validation (인터뷰 5명, cost spreadsheet, golden set) | 2주 | GREEN 완료 | Basic/Pro pricing, Qwen model direction, quote form structure, trial 후보 확보 |
| v1 build (pricing-first — T0~T14) | 6–8주 | 시작 가능 | Rate Library, Average Property Prices, canonical totals, AI Quote Form Builder, ai_usage_logs, AU prompt, validator |
| Production deploy + integration | 1주 | post-build | Vercel prod, Qwen provider env, Supabase migrations, pilot onboarding |
| Free Pro trial + paid conversion | 4주 | post-deploy | Pro 1개월 무료 trial 후 ≥1 paid conversion |
=======
> Wedge 재정의(2026-05-15 office-hours): AI Quote Writer가 paid user 확보의 본질. Basic A$29는 제한된 AI로 entry value를 만들고, Pro A$59는 full AI Quote Form Builder + photo AI + Today Assistant AI summary + Follow-up Writer로 확장한다. 범용 Workspace Assistant 채팅은 v1에서 끈다. Phase 2 AI 시드 위에 production-grade AI Draft + price_rates deterministic pricing + scoped operations helpers + usage governance를 ship한 뒤 Free Pro Trial → paid conversion을 측정한다.

| Step | 기간 | 상태 | 산출물 |
|------|------|------|--------|
| Phase 0 validation (인터뷰 5명, cost spreadsheet, golden set) | 2주 | GREEN 완료 | Basic/Pro 가격, Pro trial 정책, Qwen model, quote form structure 확정 |
| v1 build (pricing-first — T0~T14) | 6–8주 | 진행 중 | Task 1 canonical quote totals + invoice preset parity + duplicate priced scope guard 완료. Task 2 Quick/Advanced metadata/snapshot/setup diagnostics/stale-rate hardening 완료. Task 3 Room Price Library redesign 완료. 다음은 Task 4 quote form structure, 이후 AI Draft, ai_usage_logs, AU prompt, validator, manual edit UX, Today Assistant, Follow-up Writer |
| Production deploy + integration | 1주 | post-build | Vercel prod, Qwen API key, 3 migrations |
| Free Pro Trial + paid conversion tracking | 4주 | post-deploy | Pro 1개월 무료 trial, ≥1 A$59 Pro conversion, cancel reason 기록 |
>>>>>>> phrase0

자세한 work item / GREEN gate kill criteria / worktree lane 매핑은 [features/ai/V1-PLAN.md](./features/ai/V1-PLAN.md).

## Current P1 Work

| Priority | 작업 | 현재 상태 | 담당 |
|----------|------|-----------|------|
| P1 | Quote/Invoice 저장 원자성 | 다중 쿼리 경로 존재, RPC transaction 검토 필요 | Codex |
| P1 | v1 Task 4 quote form structure schema | Task 1-3 pricing boundary 완료. 다음은 customer-visible scope/clause schema와 deterministic AI candidate review path 설계/구현 | Codex |
| P1 | Google Calendar booking fail-closed | 연결/표시는 구현, write 실패 정책 보강 필요 | Codex |
<<<<<<< HEAD
| P1 | AI usage governance | Basic/Pro/Pro trial limits, `ai_usage_logs`, Qwen cost metadata 보강 | Codex |
| P1 | Rate Library expansion | Average Property Prices, Room Prices surface split, Prep/Access modifiers, duplicate anchor guard | Codex |
=======
| P1 | AI usage governance | Basic/Pro/Pro trial limit 정책 확정, v1 plan T4 (`ai_usage_logs`)로 `quote_draft`, `today_assistant`, `follow_up_writer` cost+limit 보강 | Codex |
>>>>>>> phrase0
| P1 | Exterior estimate 회귀 | 기능 존재, edit/PDF/detail 일관성 테스트 강화 필요 | Codex |
| P1 | Design legacy token cleanup | 대부분 정리, 일부 badge/detail 컴포넌트 잔여 | Codex |

## Current P2 Work

| Priority | 작업 | 현재 상태 | 담당 |
|----------|------|-----------|------|
| P2 | Dashboard analytics trend charts | KPI/pipeline은 구현, 월별 추이 차트는 미구현 | Claude plan → Codex |
| P2 | Public quote event reporting | event table 존재, 운영 UI 미구현 | Claude plan → Codex |
| P2 | Invoice reminder operations view | event table 존재, 실패/재시도 UI 미구현 | Claude plan → Codex |
| P2 | Smart pricing suggestions | rate settings 존재, 히스토리 기반 제안 미구현 | Claude plan → Codex |
| P2 | Job costing | variations/quote 비교 일부 존재, 실비 대비 리포트 미완성 | Claude plan → Codex |

## v1.1 / v2 Backlog (post v1 wedge validation)

> v1 Free Pro Trial + paid conversion tracking 통과(PASS) 후 단계적 stack. 각 phase 별도 design doc + office-hours.

<<<<<<< HEAD
- [ ] Stronger photo takeoff model eval → surface hint / takeoff (v1.1)
- [ ] Learning-based pricing recommendation (v1.2)
- [ ] Customer portal one-click accept + Stripe deposit (v2.0)
- [ ] Interior/Exterior 빌더 분리 (v2.1)
- [ ] Workspace Assistant 재논의 (v2.0+ post validation)
- [ ] Productize Stripe Pro trial + paid conversion funnel (trial/cancel/current period webhook + idempotency layer)
- [ ] Stale `price_rates` race condition snapshot immutability (자세한 건 [/TODOS.md](../TODOS.md))
=======
- [ ] Stronger photo takeoff model eval → surface hint/sqm assist (v1.1; v1 Qwen3-VL-Flash는 scope 보조만)
- [ ] Learning-based pricing recommendation (v1.2)
- [ ] Customer portal one-click accept + Stripe deposit (v2.0)
- [ ] Interior/Exterior 빌더 분리 (v2.1)
- [ ] Generic Workspace Assistant 재논의 (v2.0+ post validation; v1은 Today Assistant / Follow-up Writer만 허용)
- [ ] Productize Pro trial, cancel reason, and paid conversion tracking
- [ ] AI draft-time `price_rates` race indicator (saved quotes are snapshot-immutable; AI draft UI still needs rate snapshot timestamp. 자세한 건 [/TODOS.md](../TODOS.md))
>>>>>>> phrase0

## Phase 3 Backlog

- [ ] Xero/MYOB accounting sync
- [ ] Google Calendar one-way/two-way sync 정책 확장
- [ ] Advanced observability dashboard
- [ ] AI monthly usage full dashboard (v1은 simple page만)
- [ ] Public client portal beyond quote approval/booking

## Out Of Scope

- GPS tracking
- Team scheduling
- Supplier integrations
- Native app
- Multi-language

## Progress Update Rules

- 구현 완료는 코드, 테스트, 빌드 또는 명확한 파일 근거가 있을 때만 `[x]`로 표시합니다.
- UI만 존재하고 workflow/test가 부족하면 "부분"으로 둡니다.
- DB 변경은 [`docs/generated/DB-SCHEMA.md`](./generated/DB-SCHEMA.md)와 migration 번호를 함께 갱신합니다.
- 배포 후 Notion은 append-only로 업데이트합니다.
