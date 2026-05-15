# Coatly — Roadmap & Progress

> Phase/progress의 단일 소스입니다. 기준일: 2026-05-16.

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
| **v1 AI Quote Writer push** | **wedge 재정의** | **Phase 0 진행 중** | **AI Quote Writer = $59 wedge. validation 2주 → build 5–7주 → paid trial 4–6주. 자세한 건 [features/ai/V1-PLAN.md](./features/ai/V1-PLAN.md)** |
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
- [x] Starter active quote limit and Pro unlimited behavior
- [x] Materials & services catalogue with CSV import/export
- [x] Price/rate settings and profitability display

### Phase 2 — Implemented So Far

- [x] Workspace Assistant on dashboard, Pro gated
- [x] AI quote drafting panel on quote create screen
- [x] Quote templates with Starter/Pro limits
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

> Wedge 재정의(2026-05-15 office-hours): AI Quote Writer가 $59 paying user 확보의 본질. Phase 2 AI 시드 위에 production-grade AI Draft + price_rates deterministic pricing + streaming + usage governance를 12–16주에 ship + paid conversion 측정.

| Step | 기간 | 상태 | 산출물 |
|------|------|------|--------|
| Phase 0 validation (인터뷰 5명, cost spreadsheet, golden set) | 2주 | 진행 중 (섭외 ✓) | GREEN gate 통과 / pivot / kill |
| v1 build (5 lanes 병렬 — T1~T12) | 5–7주 | post-GREEN | streaming AI Draft, ai_usage_logs, AU prompt, validator, manual edit UX |
| Production deploy + integration | 1주 | post-build | Vercel prod, Gemini API key, 3 migrations |
| Paid trial (5 painter manual Stripe link) | 4–6주 | post-deploy | ≥1 paid conversion |

자세한 work item / GREEN gate kill criteria / worktree lane 매핑은 [features/ai/V1-PLAN.md](./features/ai/V1-PLAN.md).

## Current P1 Work

| Priority | 작업 | 현재 상태 | 담당 |
|----------|------|-----------|------|
| P1 | Quote/Invoice 저장 원자성 | 다중 쿼리 경로 존재, RPC transaction 검토 필요 | Codex |
| P1 | Google Calendar booking fail-closed | 연결/표시는 구현, write 실패 정책 보강 필요 | Codex |
| P1 | AI usage governance | Pro gating 구현, v1 plan T4 (`ai_usage_logs`)로 cost+limit 보강 | Codex (post-GREEN) |
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

> v1 paid trial 통과(PASS) 후 단계적 stack. 각 phase 별도 design doc + office-hours.

- [ ] Gemini Vision photo → surface hint (v1.1)
- [ ] Learning-based pricing recommendation (v1.2)
- [ ] Customer portal one-click accept + Stripe deposit (v2.0)
- [ ] Interior/Exterior 빌더 분리 (v2.1)
- [ ] Workspace Assistant 재논의 (v2.0+ post validation)
- [ ] Productize Stripe pre-order (v1 manual link → webhook + idempotency layer)
- [ ] Stale `price_rates` race condition snapshot immutability (자세한 건 [/TODOS.md](../TODOS.md))

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
