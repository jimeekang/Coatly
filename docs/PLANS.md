# Coatly — Roadmap & Progress

> Owner: **Claude** (Opus 4.8 · extra). Phase/progress의 단일 소스입니다. 기준일: 2026-07-05.

## Ownership

| 영역                                           | 담당        | 모델 |
| ---------------------------------------------- | ----------- | ---- |
| 플랜, 우선순위, 디자인, 앱 구성, progress 정리, 분석/QA 리포트 | Claude Code | Opus 4.8 · extra |
| 구현, 버그 수정, DB, 보안, 테스트, 배포, git   | Codex       | high |

## Current Product Decision

2026-06-03 방향 재정의:

**Coatly v1은 AI Quote Writer가 아니라 Excel quote workflow replacement다.**

실제 painter A의 현재 업무는 Excel 가격표 → PDF 변환 → 직접 이메일 발송 → 사람이 follow-up 체크다. A는 AI 없이도 이 흐름이 Coatly 안에서 안정적으로 끝나면 돈을 낼 수 있다고 답했다. 따라서 v1 release gate는 AI draft가 아니라 **기존 가격표 세팅부터 quote send, follow-up, invoice/schedule 전환까지 실제 업무를 대체하는지**다.

Price book setup의 v1 기준은 **앱 내 직접 추가 우선**이다. 사용자가 가진 아무 Excel 파일을 자동 해석하지 않고, 복잡한 Coatly Excel 템플릿을 시작 조건으로 만들지도 않는다. 기존 Excel은 source document이고, 사용자는 앱 안에서 `Service / Item`, `Unit`, `Price` 중심으로 필요한 price items를 직접 세팅한다. Excel/CSV 템플릿은 선택적 bulk input으로만 다룬다.

AI, 사진 분석, damage 판별, AI 가격 산출은 core workflow가 완성되고 릴리즈된 뒤에만 진행한다.

## Phase Overview

| Phase  | 이름                                | 상태              | 요약                                                                                                                                                                                          |
| ------ | ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Foundation                          | 완료              | 프로젝트, Supabase, Auth, Stripe, Vercel                                                                                                                                                      |
| 1      | Core Features                       | 완료              | 고객, 견적, PDF, invoice, billing                                                                                                                                                             |
| 2A     | Workflow Stabilization              | 진행 중           | DDD module refactor 안정화, DB/security reconciliation, preview 검증                                                                                                                          |
| **2B** | **v1 Workflow Replacement Release** | **현재 우선순위** | **A의 실제 Excel 가격표를 참고해 앱 안에서 simple price book을 세팅하고 quote PDF/email을 end-to-end 재현. saved price book → quote → PDF/email → follow-up → invoice/schedule release gate** |
| 2C     | AI Admin Layer                      | 보류              | core workflow 릴리즈 후 quote 설명, assumptions/exclusions, follow-up draft만 검토                                                                                                            |
| 3      | Integrations & Scale                | 계획              | accounting sync, 운영/분석 고도화                                                                                                                                                             |

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
- [x] subscription scaffold, active quote limit, Pro behavior
- [x] Materials & services catalogue with CSV import/export
- [x] Price Rates > Manual direct price item add and simple Excel CSV template/review/import/export for manual price book items
- [x] Price/rate settings and profitability display

### Phase 2 — Implemented So Far

- [x] Workspace Assistant on dashboard, Pro gated (now treated as dormant until post-core AI)
- [x] AI quote drafting panel seed (not v1 release gate)
- [x] Quote templates with plan limits
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
- [x] Quote form structure schema migration applied in live DB as `20260524022420 / 050_quote_form_structure`
- [x] Public quote durable rate-limit implementation added and verified in live DB as `20260626233104 / public_route_rate_limits`
- [x] Task 2 quote estimate category constraint repaired in live DB as `20260626233327 / quote_estimate_item_task2_categories`
- [x] Vercel Preview env parity for smoke added: Supabase, Stripe test, Resend sandbox/test recipient, cron, ABR, Google OAuth secret
- [x] Vercel Preview basic smoke passed on `https://coatly-2ir6cs2rb-kjm12081-3858s-projects.vercel.app`
- [x] Launch smoke scripts added for env check, tagged fixture seed, and authenticated preview workflow runner
- [x] Authenticated Preview workflow smoke passed with tagged fixture: login, dashboard, quote detail/edit/PDF, public quote, invoice detail/PDF, schedule, job detail

## Current Engineering Direction

현재 개발 방향은 새 AI 기능 추가가 아니라:

1. **DDD module refactor 안정화**
2. **DB/security reconciliation**
3. **A 실제 workflow 재현 테스트**
4. **preview/prod release 검증**
5. **core workflow 릴리즈 후 AI admin layer 재검토**

현재 런칭 가능 여부와 blockers는 [`docs/LAUNCH-READINESS.md`](./LAUNCH-READINESS.md)를 기준으로 확인합니다.

| Step | 목표                              | 완료 기준                                                                                           |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | DDD module refactor landing       | `modules/` 이동이 route wiring, tests, build, browser smoke에서 기존 기능을 깨지 않음               |
| 2    | Supabase migration reconciliation | live schema drift 해소, CLI token/link와 migration version bookkeeping 정리                         |
| 3    | Security hardening                | production Resend/cron verification, release security gate                                          |
| 4    | A workflow fixture 수집           | 실제 Excel price book + 최근 quote PDF/email 1개 + quote에 필요한 price items 확보                  |
| 5    | Simple price book setup           | A가 앱 안에서 service/unit/price 중심으로 필요한 price items를 세팅하고 saved price book으로 저장함 |
| 6    | Quote recreation                  | 같은 quote를 Coatly에서 만들고 Excel/PDF와 total/scope 차이를 기록                                  |
| 7    | Send/follow-up loop               | PDF/email 발송, public quote, follow-up due 상태가 정상 동작                                        |
| 8    | Conversion loop                   | 승인된 quote가 invoice와 schedule/job으로 이어짐                                                    |
| 9    | Release gate                      | lint/test/build + preview smoke + production deploy verification 통과                               |
| 10   | AI admin layer planning           | core workflow release 후에만 quote explanation / follow-up writer / photo hints 검토                |

## Current P1 Work

| Priority | 작업                                     | 현재 상태                                                                                                                                                                               | 담당                |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| P1       | DDD module refactor release gate         | `modules/` 계층으로 대규모 이동 중. lint/test/build와 Preview basic smoke는 2026-06-27 통과. authenticated workflow smoke 필요                                                          | Codex               |
| P1       | Supabase migration reconciliation        | MCP로 live history/schema 확인 완료. `public_route_rate_limits`와 `quote_estimate_item_task2_categories` 원격 적용 완료. 로컬 CLI token/link와 migration version bookkeeping 정리 필요 | Codex               |
| P1       | Public quote durable rate limit          | `proxy.ts` in-memory limiter 제거, Supabase RPC 기반 limiter와 테스트 추가. 원격 RPC/grant/allow-deny 검증 및 `/q/not-a-valid-token` smoke 통과                                           | Codex               |
| P1       | Production email/cron verification       | Preview는 Resend sandbox/test recipient와 cron secret으로 smoke 가능. Production은 customer-safe Resend sender/API config와 `CRON_SECRET` 검증 필요                                      | Codex               |
| P1       | Launch smoke gate automation             | `smoke:env`, `smoke:seed`, `smoke:preview` 추가. 실제 authenticated preview smoke는 smoke account env와 fixture seed 실행 후 통과 증거 필요                                             | Codex               |
| P1       | Quote/Invoice 저장 원자성                | 다중 쿼리 경로 존재, RPC transaction 필요 — AUDIT A1은 **P0**. 모바일 약한 네트워크에서 유령 견적 재현 가능, 첫 유료 고객 전 필수                                                       | Codex               |
| P1       | Simple price book setup                  | Price Rates > Manual 직접 추가와 Excel CSV template/review/import/export 구현. A fixture로 실제 setup friction 검증 필요                                                                | Claude plan → Codex |
| P1       | A price book onboarding test             | A의 Excel 가격표를 참고해 quote 하나에 필요한 price items를 앱 안에서 직접 저장하고 세팅 난이도 기록                                                                                    | Claude plan → Codex |
| P1       | A quote recreation test                  | 최근 quote PDF/email 1개를 Coatly에서 재현하고 total/scope/PDF/email 차이 기록                                                                                                          | Claude plan → Codex |
| P1       | Quote send/follow-up loop verification   | email send, public quote, viewed/open signal, follow-up due list, quote status가 end-to-end 동작                                                                                        | Codex               |
| P1       | Invoice/schedule conversion verification | approved quote에서 invoice와 schedule/job으로 전환되는 path smoke                                                                                                                       | Codex               |
| P1       | Google Calendar booking fail-closed      | 연결/표시는 구현, write 실패 정책 보강 필요                                                                                                                                             | Codex               |
| P1       | Exterior estimate 회귀                   | 기능 존재, edit/PDF/detail 일관성 테스트 강화 필요                                                                                                                                      | Codex               |
| P1       | Design legacy token cleanup              | `pm-*`는 프로덕션 0건 완료. 잔여: `bg-white` 하드코딩 다수, `ui/button.tsx` 44px 위반, input/FormField 이원화 (AUDIT A14)                                                               | Codex               |
| P1       | Quote follow-up reminder cron            | **미구현** — v1 core flow 명시 요구("send → follow-up reminder")이자 핵심 차별점. `invoice-reminders` 패턴 복제로 sent 후 D+3/D+7 미응답 리마인드 cron 추가 (AUDIT A9)                  | Claude plan → Codex |
| P1       | plans.ts AI 판매 카피 제거               | Pro features의 "AI Quote Drafting/AI Workspace Assistant" 2줄을 실제 core value(follow-up 등)로 교체 + `AIDraftPanel` gating 정합 (AUDIT A11)                                           | Codex               |
| P1       | Stripe webhook 하드닝                    | `event.id` 멱등 체크, `payment_failed` past_due 처리, 중복 webhook 라우트 1개 삭제 (AUDIT A10)                                                                                          | Codex               |
| P1       | 관측성(Sentry) 도입                      | 현재 `console.*`뿐 — 런칭 전 에러 트래킹 필수 (AUDIT A12)                                                                                                                               | Codex               |

## Current P2 Work

| Priority | 작업                             | 현재 상태                                                                                 | 담당                |
| -------- | -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| P2       | Public quote event reporting     | event table 존재, 운영 UI 미구현                                                          | Claude plan → Codex |
| P2       | Invoice reminder operations view | event table 존재, 실패/재시도 UI 미구현                                                   | Claude plan → Codex |
| P2       | Dashboard analytics trend charts | KPI/pipeline은 구현, 월별 추이 차트는 미구현                                              | Claude plan → Codex |
| P2       | Smart pricing suggestions        | rate settings 존재, 히스토리 기반 제안 미구현. core workflow release 전에는 시작하지 않음 | Claude plan → Codex |
| P2       | Job costing                      | variations/quote 비교 일부 존재, 실비 대비 리포트 미완성                                  | Claude plan → Codex |
| P2       | 랜딩/메타 카피 wedge 정렬        | 현재 "Job Management" 프레임 — "Excel 대체" wedge 언어로 교체 (마케팅 분석 2026-07-05)     | Claude plan → Codex |
| P2       | Stripe trial 활성화 검토         | `subscription-sync`가 `trialing`을 이미 active 취급 — checkout `trial_period_days` 설정만으로 무카드 체험 가능. 결제 게이트 soft화 검토 | Claude plan → Codex |
| P2       | IA 다이어트                      | 최상위 8섹션 → core 흐름(quote/invoice/schedule) 우선 노출, `/jobs` 스텁 직결, `/demo/schedule` gating (AUDIT A15) | Claude plan → Codex |

## Post-Core AI Backlog

아래 항목은 **core workflow가 완벽하게 완료되고 릴리즈된 후** 별도 plan/design/review를 거쳐 진행한다.

| 순서 | 항목                             | 조건                                                                                                                          |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Quote explanation helper         | manual quote + scope/clause workflow가 안정화된 뒤. AI는 가격을 만들지 않고 고객용 설명만 초안 작성                           |
| 2    | Follow-up Writer                 | follow-up due/status/email loop가 이미 동작한 뒤. AI는 자동 발송 없이 문구 초안만 생성                                        |
| 3    | Deterministic Today list summary | SQL 기반 task list가 먼저 완성된 뒤. AI는 summary만 작성                                                                      |
| 4    | Photo hints                      | photo upload/storage/manual attachment workflow가 안정화된 뒤. visible condition hint만 허용, damage diagnosis/price/sqm 금지 |
| 5    | Learning-based pricing           | pilot data와 quote outcome이 충분히 쌓인 뒤. 추천만 허용, rate 결정 금지                                                      |
| 6    | Generic Workspace Assistant      | core workflow와 scoped helpers가 검증된 뒤 재논의                                                                             |

## Explicitly Deferred

- AI quote automation as purchase reason
- AI photo/damage analysis
- photo-only takeoff
- AI-generated price/rate/GST/total
- automatic follow-up send or status changes
- property manager portal / tenant-owner approval workflow
- generic maintenance estimating across all trades
- supplier integrations
- GPS / team scheduling / native app / multi-language

## v1 Release Gate

v1 workflow replacement은 아래가 모두 통과해야 release-ready다.

- [ ] A의 실제 Excel 가격표 확보
- [ ] A의 실제 quote 1개에 필요한 service/unit/price 항목 확인
- [ ] A가 앱 안에서 필요한 price items를 직접 세팅 가능
- [x] Price Rates > Manual simple Excel CSV 입력은 누락/이상 값이 저장 전 표시됨
- [ ] A의 최근 quote PDF/email 1개 확보
- [ ] Coatly price rates/templates/service items 세팅 완료
- [ ] Excel total과 Coatly total이 의도한 차이 없이 일치
- [ ] Coatly PDF가 고객에게 보낼 수 있는 수준
- [ ] Resend email 발송 smoke 통과
- [ ] public quote link / approval smoke 통과
- [ ] follow-up due 상태가 quote list/dashboard에서 확인 가능
- [ ] quote follow-up reminder cron 동작 (sent 후 미응답 자동 리마인드 — 현재 미구현, AUDIT A9)
- [ ] approved quote → invoice conversion smoke 통과
- [ ] approved quote → schedule/job conversion smoke 통과
- [ ] invalid/expired/revoked public token regression 통과
- [x] public quote durable rate-limit migration 적용 및 RPC 429 smoke 통과
- [x] `npm run lint` (2026-06-27)
- [x] `npm run test:run` (2026-06-27, 76 files / 493 tests)
- [x] `npm run build` (2026-06-27)
- [x] Vercel preview basic smoke
- [ ] Vercel preview authenticated workflow smoke
- [ ] production deploy verification

## Progress Update Rules

- 구현 완료는 코드, 테스트, 빌드 또는 명확한 파일 근거가 있을 때만 `[x]`로 표시합니다.
- UI만 존재하고 workflow/test가 부족하면 "부분"으로 둡니다.
- DB 변경은 [`docs/generated/DB-SCHEMA.md`](./generated/DB-SCHEMA.md)와 migration 번호를 함께 갱신합니다.
- AI/photo 기능은 core workflow release 전에는 P1로 올리지 않습니다.
- arbitrary Excel auto-import는 v1 core 전에는 P1로 올리지 않습니다. 앱 내 직접 price item 추가가 기본이며, Excel/CSV 템플릿은 선택적 bulk input으로만 봅니다.
- 배포 후 Notion은 append-only로 업데이트합니다.
