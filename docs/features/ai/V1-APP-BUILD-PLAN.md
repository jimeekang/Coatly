# Coatly v1 App Build Before Usage Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-08-03 Free Pro Trial + Paid Conversion Tracking 전에 AI-assisted painting-first maintenance Quote Form Builder, pricing safety, photo helper, auxiliary AI, and usage/cost logging을 pilot 가능한 상태로 완성한다.

**Architecture:** v1은 pricing-first architecture다. AI는 `scope_sections`, `pricing_candidates`, `clauses` 초안을 만들고, 금액은 painter `price_rates` snapshot과 canonical quote calculator가 만든다. 사진은 자동 면적/가격 산출이 아니라 scope, condition, assumptions, exclusions 작성 보조로만 사용한다. Maintenance는 별도 all-trade product가 아니라 `job_type = maintenance` + painting-adjacent job packs로 제한한다.

**Tech Stack:** Next.js App Router, React, Server Actions, Supabase Postgres/RLS/Storage, Vitest, Testing Library, PDF route, Alibaba Cloud / Qwen `qwen3-vl-flash` behind provider adapter.

---

## Source Documents

| 문서 | 역할 |
|------|------|
| [PHASE0-CHECKLIST.md](./PHASE0-CHECKLIST.md) | validation 일정, 인터뷰 결과, gate decision 기록 |
| [V1-PLAN.md](./V1-PLAN.md) | v1 wedge, AI boundary, success criteria |
| [AI-ASSISTANT.md](./AI-ASSISTANT.md) | AI 기능 범위, Qwen model policy, usage log 요약 |
| [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md) | Task 1 detailed implementation plan for rate source audit, canonical quote totals, optional add-ons, public quote, and invoice parity |
| [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md) | Task 2 detailed implementation plan for Quick/Advanced rate separation, snapshot immutability, setup warnings, and duplicate scope protection |
| [V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md](./V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md) | Task 3 detailed design for making Quick Estimate room prices the canonical Room Price Library and removing Detailed Estimate Anchors from the user-facing Price Rates UI |
| [V1-TASK4-QUOTE-FORM-STRUCTURE-SCHEMA.md](./V1-TASK4-QUOTE-FORM-STRUCTURE-SCHEMA.md) | Task 4 detailed implementation plan for quote form structure schema, maintenance job packs, price-free taxonomy, and server persistence |
| [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md) | quote form data model, AI output contract, legacy quote form 분석 |
| [QUOTE.md](../quote/QUOTE.md) | 현재 quote builder 구조, pricing modes, active risks |
| [BILLING.md](../billing/BILLING.md) | 기존 Stripe checkout, portal, webhook, subscription cache 구조 |

## Current Decision Snapshot

| 항목 | 결정 |
|------|------|
| Phase 0 gate | GREEN. 2026-05-17 기준 build start approved |
| 첫 구현 순서 | AI 연동이 아니라 `price_rates`, quote calculation boundary, Room Price Library, quote form structure 먼저 |
| 가격 정책 | Basic A$29/month, Pro A$59/month |
| 첫 사용자 offer | Pro 1개월 무료 trial. trial 후 A$59/month conversion 측정 |
| 취소 정책 | 언제든지 cancel 가능. cancel reason 기록 |
| 2026-05-23 positioning | Paint-only SaaS가 아니라 painting-first maintenance quote intelligence. Jobber/ServiceM8/Buildxact류와 scheduling/CRM 정면승부를 피하고, scope/quote/report intelligence layer에 집중 |
| Basic AI limit | AI quote draft 5/month, photo AI 15 photos/month, quote당 사진 3장 |
| Pro AI limit | AI quote draft 25/month, photo AI 100 photos/month, quote당 사진 5장, follow-up 50/month |
| Trial limit | 첫 cohort는 Pro trial 기간 동안 Pro limit 사용 |
| AI model | Alibaba Cloud / Qwen `qwen3-vl-flash`, provider adapter 뒤에 고정 |
| 아직 남은 validation 기록 | D11 cost spreadsheet 숫자 확정, painter별 anonymized quote 추가 회수, W4 numeric golden set fixture |
| Task 1 implementation review | 2026-05-17 기준 COMPLETE. canonical quote totals/invoice parity, deterministic duplicate priced scope guard, rollback/lock edge tests, PDF route regression, full test suite, build, lint 통과 |
| Task 2 implementation review | 2026-05-17 기준 COMPLETE. Quick row metadata completeness, Advanced numeric snapshot immutability, setup diagnostics, A$0 selected-source blocking, invalid surface blocking, door/window explicit item boundary, stale-rate tests, full suite/build/lint 통과 |
| Task 3 implementation review | 2026-05-18 기준 COMPLETE. Quick Estimate room matrix를 canonical Room Price Library로 승격했고, Advanced room presets/quote payload/server metadata가 template id/version/label/size/per-surface snapshot을 저장한다. Detailed Estimate Anchors는 Price Rates UI에서 제거됐고 내부 호환 데이터로만 남는다 |

## Build Rule

1. Phase 0 gate는 GREEN으로 기록됐다. v1 build는 시작해도 된다.
2. 첫 작업은 AI 연동이 아니다. `price_rates`, quote item boundary, subtotal/GST/total parity, quote form data model이 먼저 안정되어야 한다.
3. AI output에는 `rate`, `unit_price_cents`, `subtotal_cents`, `gst_cents`, `total_cents`가 들어가면 안 된다.
4. 같은 priced scope는 quick item, advanced room source, room/surface estimate, custom line item 중 하나에서만 subtotal을 만든다.
5. Interior room pricing의 primary editable source는 Quick Estimate room matrix다. UI에서는 이를 Room Price Library로 취급한다.
6. Detailed Estimate Anchors는 사용자에게 별도 bedroom/living room 가격표를 다시 입력시키는 UI가 아니다. 새 detailed room preset은 Room Price Library template을 참조하고, anchors는 기존 데이터 파싱을 위한 내부 fallback으로만 유지한다.
7. Photo helper는 visible condition과 scope wording을 돕는다. 사진만 보고 sqm/lm/price를 확정하지 않는다.
8. 모든 AI call은 provider, model, prompt version, token/cost, photo count, cache hit 여부를 `ai_usage_logs`에 남긴다.
9. Free Pro Trial + Paid Conversion Tracking은 build, deploy, painter onboarding, price rate setup, 첫 draft smoke test가 끝난 뒤에만 시작한다.
10. Basic에도 제한된 AI를 제공한다. Pro는 full AI Quote Form Builder, photo AI, Today AI summary, Follow-up Writer 확장을 제공한다.
11. Maintenance는 v1에서 painting-adjacent job packs만 허용한다. Wall patch + repaint, water damage repaint, end-of-lease touch-up, pre-sale refresh, exterior maintenance repaint, deck/stain maintenance, mould treatment + repaint, strata/common area touch-up은 포함한다.
12. Plumbing, electrical, HVAC, structural repair, roofing repair, pest, asbestos, waterproofing diagnosis는 v1 quote automation 범위 밖이다. AI는 이런 요청을 quote로 만들지 않고 `unsupported_scope` 또는 `refer_to_specialist` question으로 돌린다.
13. v1은 property manager portal이 아니다. Customer properties, quote, PDF/public quote, job, invoice를 재사용해 report-style quote artifact까지만 만든다. Request queue, tenant/owner approval workflow, multi-property manager dashboard는 v1.1+ validation 뒤로 미룬다.

## File Ownership Map

| 영역 | 주요 파일 |
|------|-----------|
| Quote calculation | `lib/quotes.ts`, `lib/interior-estimates.ts`, `lib/exterior-estimates.ts`, `lib/detailed-estimate-anchors.ts`, `lib/quick-quote-mapper.ts`, `lib/room-price-library.ts` |
| Quote server actions | `app/actions/quotes.ts`, `app/actions/quotes.test.ts` |
| Quote UI | `components/quotes/QuoteCreateScreen.tsx`, `components/quotes/QuoteEditScreen.tsx`, `components/quotes/QuoteForm.tsx`, `components/quotes/QuickQuoteBuilder.tsx`, `components/quotes/QuickEstimateBuilder.tsx`, `components/quotes/InteriorEstimateBuilder.tsx`, `components/quotes/ExteriorEstimateBuilder.tsx`, `components/quotes/LineItemsSection.tsx`, `components/quotes/QuoteExtraLineItems.tsx` |
| Price Rates | `app/(dashboard)/price-rates/page.tsx`, `components/rates/PriceRatesForm.tsx`, `components/rates/QuickEstimateTab.tsx`, `lib/rate-settings.ts`, `config/paint-rates.ts` |
| PDF/public quote | `app/api/pdf/quote/route.ts`, `lib/pdf/quote-template.tsx`, `app/q/[token]/page.tsx`, `components/quotes/public/*` |
| AI quote draft | `app/actions/ai-drafts.ts`, `lib/ai/drafts.ts`, `lib/ai/draft-types.ts`, `components/ai/AIDraftPanel.tsx` |
| Existing assistant to reduce | `components/dashboard/WorkspaceAssistant.tsx`, `app/actions/workspace-assistant.ts` |
| New AI provider layer | `lib/ai/providers/qwen.ts`, `lib/ai/providers/types.ts`, `lib/ai/validator.ts`, `lib/ai/apply-deterministic-pricing.ts`, `lib/ai/photo-cache.ts` |
| Usage/cost | `supabase/migrations/051_ai_usage_logs.sql`, `app/(dashboard)/settings/ai-usage/page.tsx`, `lib/ai/usage.ts` |
| Plan/trial gating | `config/plans.ts`, `lib/subscription/access.ts`, `lib/subscription/server.ts`, `components/subscription/UpgradePrompt.tsx`, `app/(dashboard)/settings/billing/page.tsx` |
| Stripe billing | `app/api/stripe/checkout/route.ts`, `app/api/stripe/portal/route.ts`, `app/api/stripe/renew/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/stripe/plans.ts`, `lib/stripe/subscription-sync.ts`, `lib/stripe/webhook-handler.ts` |
| Quote form schema | `supabase/migrations/050_quote_form_structure.sql`, `types/quote.ts`, `lib/supabase/types.ts` |
| Photo helper | `supabase/migrations/052_quote_photos.sql`, `components/quotes/QuotePhotoUploader.tsx`, `lib/supabase/storage.ts` |

## Week-by-Week Sequence

| Week | 날짜 | 목표 | 완료 기준 |
|------|------|------|-----------|
| W1 | 2026-06-01 ~ 2026-06-05 | Pricing source audit + canonical total path | 완료. canonical calculator, optional add-on/public quote, invoice preset parity, duplicate priced scope guard, full safety verification 통과 |
| W2 | 2026-06-08 ~ 2026-06-12 | Price Rates setup + Room Price Library boundary | 완료. Task 2 Quick/Advanced rate boundary와 Task 3 Room Price Library redesign 모두 구현 |
| W3 | 2026-06-15 ~ 2026-06-19 | Quote form schema + Scope/Clause builder UI | Task 4 quote form structure schema 완료. 다음은 Task 5 Scope Builder, Clause Library, PDF/Public rendering |
| W4 | 2026-06-22 ~ 2026-06-26 | Regression suite + legacy/maintenance quote reconstruction | Winchester, Edgar, Paint Buddy quote form + 3 maintenance scenarios를 scope/pricing/clause 구조로 재현하고 가격 회귀 테스트가 통과한다 |
| W5 | 2026-06-29 ~ 2026-07-03 | AI input schema + Qwen adapter + Basic/Pro usage logging | Qwen call이 adapter 뒤에 있고, AI output이 price-free schema를 통과하며, plan/trial별 cost log가 남는다. Maintenance unsupported trade rejection도 validator에 포함한다 |
| W6 | 2026-07-06 ~ 2026-07-10 | AI Quote Form Builder core | quote create flow에서 AI draft를 만들고, user review 후 deterministic pricing pass로만 금액을 만든다. Maintenance / touch-up start path를 포함한다 |
| W7 | 2026-07-13 ~ 2026-07-17 | Photo helper + Today Assistant + Follow-up Writer | 사진 분석은 scope helper로 동작하고, 보조 AI는 자동 발송/상태 변경 없이 초안만 만든다. Maintenance photo hints and report-style follow-up wording을 포함한다 |
| W8 | 2026-07-20 ~ 2026-07-24 | Pilot readiness + production hardening | 5명 pilot account, rate setup, first draft, PDF/public quote, Pro trial state, usage logging smoke test, maintenance smoke tests가 끝난다 |

## Task 0: Build Scope Gate

**Files:**
- Modify: `docs/features/ai/PHASE0-CHECKLIST.md`
- Modify: `docs/features/ai/V1-PLAN.md`
- Modify: `docs/features/ai/V1-APP-BUILD-PLAN.md`

- [x] **Step 1: Confirm gate result before implementation**

  2026-05-17 기준 Phase 0 `Gate Decision`은 GREEN이다. Full W1-W8을 진행한다. 단, D11 cost spreadsheet와 W4 numeric golden set fixture는 build 중 계속 보완한다.

- [x] **Step 2: Freeze v1 non-negotiables**

  `V1-PLAN.md`에 pricing-first, Qwen behind adapter, AI price-free output, photo helper not auto takeoff, usage logging before trial, Basic/Pro plan limits가 반영됐다.

- [x] **Step 3: Record build start condition**

  `PHASE0-CHECKLIST.md` Final Gate Notes에 GREEN, Basic A$29, Pro A$59, Pro 1개월 무료 trial, anytime cancel, P1/P2/P3 trial 후보를 기록했다.

## Task 1: Rate Source Audit and Canonical Quote Totals

**Detailed plan:** [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md)

**Status:** COMPLETE. Task 1A canonical quote totals and quote-to-invoice preset parity, Task 1B duplicate priced scope guard, linked-invoice/rollback edge tests, PDF route regression, full `npm run test:run`, `npm run build`, and `npm run lint` passed on 2026-05-17.

**Goal:** AI 기능을 붙이기 전에 quote 가격 출처, subtotal/GST/total 계산, optional add-on, public quote, invoice preset이 모두 같은 규칙으로 동작하게 만든다.

**Files:**
- Modify: `lib/quotes.ts`
- Modify: `lib/quote-pricing-scopes.ts`
- Modify: `app/actions/quotes.ts`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `components/quotes/public/PublicQuoteClient.tsx`
- Modify: `lib/invoices.ts`
- Modify: `components/invoices/InvoiceForm.tsx`
- Modify: `lib/quotes.test.ts`
- Modify: `lib/quote-pricing-scopes.test.ts`
- Modify: `app/actions/quotes.test.ts`
- Modify: `lib/invoices.test.ts`
- Modify: `app/actions/invoices.test.ts`
- Modify: `components/quotes/QuoteForm.test.tsx`
- Modify: `components/invoices/InvoiceForm.test.tsx`
- Read: `components/quotes/LineItemsSection.tsx`
- Read: `components/quotes/QuoteExtraLineItems.tsx`
- Read: `supabase/migrations/014_quote_estimate_items_and_context.sql`
- Read: `supabase/migrations/018_pricing_methods.sql`
- Read: `supabase/migrations/019_material_items_and_quote_line_items.sql`
- Read: `supabase/migrations/024_quote_optional_line_items.sql`
- Read: `supabase/migrations/041_detailed_quick_estimate.sql`
- Read: `supabase/migrations/042_allow_quick_estimate_items.sql`

**Summary:**

- Make `calculateQuoteTotals()` the single quote total authority.
- Fix create/update, optional add-on selection, public quote preview, and invoice preset parity.
- Preserve current Supabase tables. Task 1 duplicate scope protection is payload validation only; no schema migration was introduced.
- Keep AI and photo analysis out of all price-writing paths.

**Implementation snapshot (2026-05-17):**

- Done: `calculateQuoteTotals()` + compatibility wrapper, calculator tests, shared create/update pricing resolver, optional add-on recalculation with discount/manual adjustment, public quote canonical preview, invoice preset base scope/selected optional/discount/manual adjustment handling, deterministic duplicate priced scope guard, same-fixture create/update parity test, optional linked-invoice/rollback tests, QuoteForm canonical fixture parity, fuzzy duplicate scope warning.
- Verified: focused quote/invoice/UI/PDF/scope tests passed, `npm run test:run` passed 59 files / 366 tests, `npm run build` passed, `npm run lint` passed.
- Still required before AI pricing candidates: Task 4 quote form structure schema and deterministic AI candidate review path.

**Completion criteria:**

- Quote create, edit, optional add-on selection, public optional add-on selection, public approval, PDF quote display, and invoice preset generation explain the same total.
- No code path writes `subtotal_cents`, `gst_cents`, or `total_cents` without going through `calculateQuoteTotals()` or a documented invoice-only calculator.
- Focused quote/invoice/UI tests and full build verification pass as defined in the detailed plan.

## Task 2: Quick and Advanced Rate Boundary

**Detailed plan:** [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)

**Status:** COMPLETE. 2026-05-17 기준 Quick rate schema/UI/snapshot behavior, complete Quick estimate row metadata, Advanced room item source copy, numeric anchor/opening/trim snapshots, setup diagnostics, selected-source A$0 blocking, invalid surface validation, door/window explicit item boundary, duplicate scope guard, and stale-rate tests가 구현됐다.

**Goal:** Quick estimate와 Advanced detailed estimate의 pricing source를 분리하고, rate 변경 이후 기존 quote가 저장 당시 snapshot 기준으로 유지되게 만든다.

**Files:**
- Modify: `components/rates/PriceRatesForm.tsx`
- Modify: `components/rates/QuickEstimateTab.tsx`
- Modify: `lib/rate-settings.ts`
- Create: `lib/rate-setup-diagnostics.ts`
- Create/Modify: `lib/quote-pricing-scopes.ts`
- Modify: `lib/detailed-estimate-anchors.ts`
- Modify: `lib/interior-estimates.ts`
- Modify: `components/quotes/QuickEstimateBuilder.tsx`
- Modify: `components/quotes/QuickQuoteBuilder.tsx`
- Modify: `components/quotes/InteriorEstimateBuilder.tsx`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `app/actions/quotes.ts`
- Modify: `lib/rate-settings.test.ts`
- Modify: `lib/interior-estimates.test.ts`
- Modify: `utils/calculations.test.ts`
- Modify: `app/actions/quotes.test.ts`
- Modify: `components/rates/PriceRatesForm.test.tsx`
- Modify: `components/quotes/QuoteForm.test.tsx`

**Method:**

- [x] **Step 1: Audit current Quick/Advanced implementation**

  Current audit is captured in [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md). Task 2 is complete as of 2026-05-17.

- [x] **Step 2: Finish duplicate priced scope guard dependency**

  Reuse or create structured priced scope keys so Quick/Advanced estimate rows and custom line items cannot charge the same room/surface/opening/trim scope twice.

- [x] **Step 3: Add shared setup diagnostics**

  `lib/rate-setup-diagnostics.ts` reports missing/zero Quick and Advanced rate sources. Price Rates shows setup status; Quote Builder blocks accidental A$0 selected sources.

- [x] **Step 4: Complete Quick snapshot row metadata**

  `pricing_method_inputs` keeps the Quick room snapshot. `quote_estimate_items.metadata` also includes source id/version/label, snapshot version, selected surfaces, per-surface cents, and multipliers.

- [x] **Step 5: Complete Advanced numeric snapshot immutability**

  Advanced source id/version/label plus numeric anchor/opening/trim snapshots are saved so `detailed_estimate_anchors` changes do not alter existing quote totals.

- [x] **Step 6: Block invalid Advanced surface states**

  A room with all `include_walls`, `include_ceiling`, and `include_trim` false is invalid. The calculator no longer falls back to global scope for that room.

- [x] **Step 7: Remove or wire door/window room toggles**

  For v1, doors and windows are explicit opening items only. Room-level `include_doors` / `include_windows` toggles were removed from the priced surface row.

- [x] **Step 8: Add stale-rate and save-shape tests**

  Quote A/B stale-rate tests, create/update save-shape tests, duplicate scope tests, setup warning tests, and quote/PDF/invoice regression tests are in place.

**Completion criteria:**

- Quick and Advanced rate setup are visibly separate and warning-gated.
- Existing Quick/Advanced quotes keep saved snapshot totals after rate changes.
- New quotes use current rates.
- Duplicate priced scopes are blocked in create and update.
- Quick/Advanced accidental A$0 selected sources are blocked before save.
- Focused tests, full test suite, build, and `git diff --check` pass.

**Implementation snapshot (2026-05-17):**

- Done: shared rate setup diagnostics, Price Rates setup summary, Quote Builder blocking warnings, complete Quick metadata, Advanced numeric snapshot helper, server-side snapshot before save, invalid surface blocking, door/window explicit opening boundary, duplicate advanced trim guard, stale-rate fixtures.
- DB: local migration `20260517020123_quote_estimate_item_task2_categories.sql` updates `quote_estimate_items.category` constraint for Task 2 generated categories.
- Verified: focused Task 2 suites, quote/PDF/invoice regression, full `npm run test:run`, `npm run lint`, and `npm run build` passed.
- Next: Task 4 quote form schema and deterministic AI candidate review path.

## Task 3: Room Price Library and Detailed Anchor Redesign

**Detailed plan:** [V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md](./V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md)

**Status:** COMPLETE. 2026-05-17 기준 Room Price Library helper, rate settings schema, Price Rates UI, Advanced quote builder, server-side snapshot metadata, diagnostics, duplicate scope guard, focused tests가 구현됐다.

**Goal:** Quick Estimate에 이미 존재하는 room/size/surface 가격 matrix를 v1의 canonical Room Price Library로 승격하고, Detailed Estimate Anchors를 user-facing duplicate price source가 아니라 derived adapter 또는 legacy fallback으로 낮춘다.

**Files:**
- Create: `lib/room-price-library.ts`
- Modify: `lib/rate-settings.ts`
- Modify: `components/rates/PriceRatesForm.tsx`
- Modify: `components/rates/QuickEstimateTab.tsx`
- Modify: `lib/interior-estimates.ts`
- Modify: `components/quotes/InteriorEstimateBuilder.tsx`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `app/actions/quotes.ts`
- Modify: `lib/rate-setup-diagnostics.ts`
- Test: `lib/rate-settings.test.ts`
- Test: `lib/room-price-library.test.ts`
- Test: `lib/rate-setup-diagnostics.test.ts`
- Test: `lib/interior-estimates.test.ts`
- Test: `lib/quote-pricing-scopes.test.ts`
- Test: `components/rates/PriceRatesForm.test.tsx`
- Test: `components/quotes/QuoteForm.test.tsx`
- Test: `app/actions/quotes.test.ts`

**Method:**

- [x] **Step 1: Treat Quick Estimate as Room Price Library**

  Keep `quick_estimate.rooms` in JSONB for backward compatibility, but domain/UI wording should treat it as the single editable interior room price library.

- [x] **Step 2: Add room price library helpers**

  Add pure helpers to list room templates, resolve a template by id, sum selected surfaces for small/medium/large, and derive an internal anchor range from the same template when the old calculator path still needs one.

- [x] **Step 3: Change Advanced Room Presets to reference room templates**

  New advanced room presets store `source_room_template_id`, `source_room_template_version`, `default_room_size`, and default selected surfaces. They are optional quote-entry shortcuts over the Room Price Library, not another room price table. Legacy `anchor_room_type` stays as fallback only.

- [x] **Step 4: Reorder Price Rates UI**

  Room price setup becomes the primary interior pricing source. Detailed Estimate Anchors are removed from the Price Rates UI so painters cannot maintain two Bedroom prices.

- [x] **Step 5: Snapshot advanced rooms from room template source**

  Advanced quote rooms must save template id/version/label/size/surface prices so existing quotes remain stable after Room Price Library changes.

- [x] **Step 6: Update diagnostics and AI candidate boundary**

  Missing anchors should not block when a valid room template exists. AI pricing candidates should target room template label/id, size, surfaces, and condition, never anchor names or price fields.

**Completion criteria:**

- Price Rates has one primary editable interior room price source.
- Quick Estimate and Detailed Estimate both use the same Room Price Library prices.
- New advanced room presets do not require a separate room anchor list.
- Existing quotes and legacy anchor-backed settings remain readable.
- AI quote form schema can map candidates to room template id/size/surfaces without seeing price fields.

**Implementation snapshot (2026-05-17):**

- Done: Advanced room item schema accepts `source_room_template_id`, `source_room_template_version`, and `default_size`; legacy `anchor_room_type` remains readable.
- Done: `lib/room-price-library.ts` resolves templates, selected surfaces, derived ranges, and typed missing/disabled-source issues.
- Done: Price Rates shows Room Price Library setup and Advanced presets choose a template/default size. Legacy anchor editing is removed from the UI.
- Done: Advanced preset empty state now shows a single add button, and the section copy clarifies that presets reuse Room Price Library prices instead of creating separate anchors.
- Done: Advanced quote builder copies template source fields and allows manual rooms to select a template directly.
- Done: Quote payload/server save rows snapshot template id/version/label/size, per-surface cents, derived range, and multiplier metadata.
- Verified: focused Task 3 suites passed 7 files / 109 tests. Full suite/build/lint verification is tracked at branch completion.

## Task 4: Quote Form Structure Schema

**Detailed plan:** [V1-TASK4-QUOTE-FORM-STRUCTURE-SCHEMA.md](./V1-TASK4-QUOTE-FORM-STRUCTURE-SCHEMA.md)

**Status:** COMPLETE. 2026-05-23 기준 `quotes.job_type`, scope section/step/clause/AI intake snapshot schema, RLS/grants, price-free taxonomy, painting-adjacent maintenance job packs, quote create/update persistence, focused tests, Task 2/3 regression, full tests, lint, and build passed.

**Files:**
- Create: `supabase/migrations/050_quote_form_structure.sql`
- Modify: `types/quote.ts`
- Regenerate: `lib/supabase/types.ts`
- Create: `config/quote-form-taxonomy.ts`
- Create: `config/maintenance-job-packs.ts`
- Test: `app/actions/quotes.test.ts`

**Method:**

- [x] **Step 1: Add scope section tables**

  Add `quote_scope_sections` with `id`, `quote_id`, `section_kind`, `title`, `description`, `area_type`, `surface_type`, `is_optional`, `pricing_status`, `source`, `sort_order`, `metadata`, `created_at`, and `updated_at`. `section_kind` must allow `interior`, `exterior`, `maintenance`, `general`, and `optional`.

  For maintenance sections, store these values in `metadata` rather than adding broad new tables:
  - `maintenance_job_pack`
  - `visible_defects`
  - `priority`: `urgent`, `soon`, `cosmetic`, or `to_confirm`
  - `report_context`: optional flag for report-style PDF/public rendering
  - `unsupported_scope`: optional string when AI/user notes mention work outside v1 scope

- [x] **Step 2: Add scope step table**

  Add `quote_scope_steps` with `id`, `section_id`, `label`, `description`, `prep_type`, `paint_system`, `coats`, `product_name`, `colour_status`, `sheen`, `is_customer_visible`, `sort_order`, and `metadata`.

- [x] **Step 3: Add clause table**

  Add `quote_clause_items` with `id`, `quote_id`, `section_id`, `clause_key`, `title`, `body`, `category`, `source`, `is_customer_visible`, `sort_order`, and `metadata`.

- [x] **Step 4: Add AI intake snapshot table**

  Add `quote_ai_intake_snapshots` with `id`, `quote_id`, `painter_user_id`, `job_type`, `maintenance_job_pack`, `provider`, `model`, `prompt_version`, `input_json`, `output_json`, `photo_refs`, `price_rates_snapshot_id`, `created_at`, and `metadata`. `job_type` must allow `interior`, `exterior`, `both`, and `maintenance`.

- [x] **Step 5: Add RLS**

  Each table must be readable and writable only by the owner of the parent quote. Service role access stays available for server-side operations.

- [x] **Step 6: Seed taxonomy in code, not as hidden prices**

  `config/quote-form-taxonomy.ts` should define interior areas, interior surfaces, exterior surfaces, prep/coating options, condition/risk tags, and clause keys. It must not contain price values.

- [x] **Step 7: Add maintenance job packs without creating a generic trade schema**

  `config/maintenance-job-packs.ts` should define only painting-adjacent packs:
  - `wall_patch_repaint`
  - `water_damage_repaint`
  - `end_of_lease_touch_up`
  - `pre_sale_refresh`
  - `exterior_maintenance_repaint`
  - `deck_stain_maintenance`
  - `mould_treatment_repaint`
  - `strata_common_area_touch_up`

  Each pack may define allowed surfaces, common prep steps, risk clauses, likely pricing methods, and required confirmation questions. It must not define prices.

- [x] **Step 8: Explicitly reject all-trade maintenance scope**

**Implementation snapshot (2026-05-23):**

- Done: `supabase/migrations/050_quote_form_structure.sql` adds quote form structure tables, `quotes.job_type`, nullable priced-row section links, RLS policies, and grants.
- Done: `config/quote-form-taxonomy.ts` and `config/maintenance-job-packs.ts` keep maintenance as painting-adjacent scope templates with no hidden price values.
- Done: quote create validation rejects unsupported maintenance packs and AI output price fields.
- Done: quote create/update can persist scope sections, nested steps, selected clauses, and AI intake snapshots when supplied.
- Verified: focused Task 4 tests passed 3 files / 47 tests, Task 2/3 regression passed 9 files / 149 tests, full `npm run test:run` passed 63 files / 422 tests, `npm run lint` passed, and `npm run build` passed.

  Do not add property manager request tables, tenant/owner permission tables, plumbing/electrical/carpentry item libraries, or generic maintenance rates in Task 4. Those belong to v1.1+ after a separate validation gate.

## Task 5: Scope Builder, Clause Library, PDF/Public Rendering

**Files:**
- Create: `components/quotes/ScopeBuilder.tsx`
- Create: `components/quotes/ClauseLibraryPicker.tsx`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `components/quotes/QuoteCreateScreen.tsx`
- Modify: `components/quotes/QuoteEditScreen.tsx`
- Modify: `app/actions/quotes.ts`
- Modify: `lib/pdf/quote-template.tsx`
- Modify: `app/api/pdf/quote/route.ts`
- Modify: `components/quotes/public/PublicQuoteClient.tsx`
- Test: `components/quotes/QuoteForm.test.tsx`
- Test: `app/api/pdf/quote/route.test.ts`

**Method:**

- [ ] **Step 1: Add customer-visible scope editor**

  `ScopeBuilder` lets the painter edit section title, section description, scope steps, optional state, and pricing status. It must not expose unit price or GST fields.

- [ ] **Step 2: Add clause library picker**

  `ClauseLibraryPicker` lets the painter add inclusions, exclusions, warranty, payment, validity, colour/sheen confirmation, water damage, peeling paint, efflorescence, wet area, furniture moving, difficult access, and attachment notes.

  Maintenance-specific clause keys must include:
  - `source_repair_excluded`
  - `water_damage_best_effort`
  - `mould_recurrence_risk`
  - `touch_up_colour_match_limit`
  - `tenant_owner_access_required`
  - `strata_common_area_access`
  - `before_after_photo_note`

- [ ] **Step 3: Connect sections to priced rows carefully**

  Scope sections may link to one authoritative priced row, but they can also be included/unpriced. Optional customer-visible scope can connect to a selected optional line item only when that item is the single source of price.

- [ ] **Step 4: Update PDF/public quote**

  PDF and public quote must render scope sections first, pricing summary second, optional items third, clauses last. Totals come from quote calculated fields, not from scope text.

  If `quote_scope_sections.metadata.report_context` is true, the same data can render a "Maintenance summary" band before the quote price summary. This is still a quote artifact, not a separate property manager report product.

- [ ] **Step 5: Add reconstruction tests**

  Add anonymized fixture scenarios for Winchester interior, Edgar checklist, and Paint Buddy exterior. Tests should confirm section order, optional item handling, clauses, PDF/public rendering, and no duplicate priced scope.

- [ ] **Step 6: Add maintenance reconstruction tests**

  Add fixture scenarios for:
  - end-of-lease touch-up with colour-match limitation clause
  - water damage repaint with source-repair-excluded and stain-blocking steps
  - strata/common area touch-up with access note and optional extra-area add-on

  Each scenario must assert section order, clause presence, optional item behavior, and preview/save/detail/PDF/public quote total parity.

## Task 6: AI Input Schema and Qwen Provider Adapter

**Files:**
- Modify: `lib/ai/draft-types.ts`
- Modify: `lib/ai/drafts.ts`
- Create: `lib/ai/providers/types.ts`
- Create: `lib/ai/providers/qwen.ts`
- Create: `lib/ai/validator.ts`
- Create: `lib/ai/apply-deterministic-pricing.ts`
- Modify: `app/actions/ai-drafts.ts`
- Modify: `app/actions/ai-drafts.test.ts`
- Modify: `components/ai/AIDraftPanel.test.tsx`

**Method:**

- [ ] **Step 1: Replace freeform draft output with quote form draft output**

  AI draft output type must be `job_type`, `maintenance_job_pack`, `scope_sections`, `pricing_candidates`, `clauses`, `assumptions`, and `questions_for_user`. It must reject price/rate/GST/total fields.

- [ ] **Step 2: Add Qwen adapter boundary**

  `lib/ai/providers/qwen.ts` owns Alibaba/Qwen request construction, response parsing, retry classification, and token/cost metadata mapping. The rest of the app calls provider-neutral functions from `lib/ai/providers/types.ts`.

- [ ] **Step 3: Keep Qwen configuration server-only**

  Provider credentials stay server-side only. The UI receives status and draft chunks, never API keys or provider request details.

- [ ] **Step 4: Add validator repair layer**

  `lib/ai/validator.ts` removes forbidden price fields, normalizes missing arrays, caps section count, marks uncertain photo-derived claims as `to_confirm`, and rejects hidden damage or unsupported scope.

  Unsupported scope examples:
  - plumbing, electrical, HVAC, structural, roofing repair, pest, asbestos, waterproofing diagnosis
  - statements that claim hidden moisture source has been repaired without user notes
  - photo-only exact sqm/lm or fixed price

  When unsupported work appears in notes/photos, return a non-priced section or `questions_for_user` entry that tells the painter to confirm/exclude or refer to a specialist. Do not create a priced row.

- [ ] **Step 5: Apply deterministic pricing after validation**

  `lib/ai/apply-deterministic-pricing.ts` maps accepted `pricing_candidates` to painter price rate snapshots and quote estimate items. If no matching rate exists, candidate stays `to_confirm` and does not affect subtotal.

  Maintenance candidates must map only to existing painting pricing paths: Room Price Library, Advanced room/opening/trim, exterior estimate, day rate, manual/service add-on, or optional add-on. There is no generic maintenance rate table in v1.

- [ ] **Step 6: Update tests away from legacy provider wording**

  Tests should describe provider configuration generically or as Qwen. Any remaining legacy-provider-specific failure message should be replaced when the implementation moves to Qwen.

## Task 7: AI Usage Logs, Limits, and Cost Controls

**Files:**
- Create: `supabase/migrations/051_ai_usage_logs.sql`
- Create: `lib/ai/usage.ts`
- Modify: `config/plans.ts`
- Modify: `lib/subscription/access.ts`
- Modify: `lib/subscription/server.ts`
- Modify: `components/subscription/UpgradePrompt.tsx`
- Modify: `app/actions/ai-drafts.ts`
- Create: `app/(dashboard)/settings/ai-usage/page.tsx`
- Modify: `components/dashboard/Sidebar.tsx`
- Test: `app/actions/ai-drafts.test.ts`

**Method:**

- [ ] **Step 1: Add `ai_usage_logs`**

  Table fields: `id`, `painter_user_id`, `feature`, `attempt_status`, `input_tokens`, `output_tokens`, `cost_cents`, `quote_id`, `metadata`, `created_at`, and generated `billing_month`. Add index on `(painter_user_id, billing_month)`.

- [ ] **Step 2: Log every attempt**

  Success, failure, retry, cancellation, and partial generation each write a log row. Metadata includes provider `alibaba-qwen`, model `qwen3-vl-flash`, prompt version, photo count, image bytes, cache hit, and validation outcome.

- [ ] **Step 3: Enforce Basic, Pro, and trial limits**

  Enforce these limits server-side:

  | Feature | Basic | Pro / Pro trial |
  |---------|-------|------------------|
  | AI quote draft | 5/month | 25/month |
  | Photos per quote | 3 | 5 |
  | Monthly photo AI | 15 photos/month | 100 photos/month |
  | Follow-up Writer | 10/month | 50/month |
  | Today Assistant | deterministic list only | deterministic list + AI summary |
  | Advanced scope/clause builder | limited wording helper | full scope/clause builder |

  If projected AI cost crosses 30% of plan ARPU, reduce photo count or monthly draft cap before trial starts.

- [ ] **Step 4: Align plan definitions and upgrade copy**

  `config/plans.ts` and subscription access helpers must expose Basic A$29/month and Pro A$59/month behavior. If the existing code still uses `starter` as an internal plan id, either migrate it to `basic` or keep the internal id with customer-facing label `Basic`; do not leave user-visible "Starter" copy in v1 AI surfaces.

- [ ] **Step 5: Add AI usage page**

  Settings page shows current plan, trial state, current month draft count, photo draft count, assistant count, estimated AI cost, and remaining limit. It must use aggregate server data, not client-side calculation from raw logs.

## Task 8: AI Quote Form Builder UI

**Files:**
- Modify: `components/ai/AIDraftPanel.tsx`
- Modify: `components/quotes/QuoteCreateScreen.tsx`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `app/actions/ai-drafts.ts`
- Test: `components/ai/AIDraftPanel.test.tsx`
- Test: `components/quotes/QuoteCreateScreen.test.tsx`

**Method:**

- [ ] **Step 1: Put AI entry point in quote creation**

  Quote create flow offers three starts: AI draft, template, manual. AI draft is plan-aware and clearly marked as draft before review. Basic gets limited notes-based AI draft usage. Pro and Pro trial get full AI Quote Form Builder, photo helper, and advanced scope/clause review.

- [ ] **Step 2: Collect safe AI inputs**

  Inputs are job type, interior/exterior/maintenance selection, optional `maintenance_job_pack`, scope notes, rough measurements, known surfaces, colour/sheen status, access notes, customer-visible tone, and optional photos. Avoid sending unrelated customer history unless needed for the selected draft.

- [ ] **Step 3: Review before save**

  AI draft populates Scope Builder and Clause Library first. Painter can edit sections, remove uncertain claims, and map pricing candidates before any quote is sent.

  Maintenance drafts must show unsupported or specialist work separately from included scope. The painter must explicitly exclude, rewrite, or remove unsupported work before sending.

- [ ] **Step 4: Show price snapshot**

  UI shows the rate snapshot timestamp used for deterministic pricing. If rates changed after draft generation, the user must choose whether to keep the snapshot or reprice.

- [ ] **Step 5: Track edit ratio**

  Store draft metadata for generated section count, edited section count, removed clauses, and accepted pricing candidates. This is used in Pro trial quality tracking and trial-to-paid conversion review.

- [ ] **Step 6: Add maintenance start path**

  Quote create start choices should include `Maintenance / touch-up`. The next choice should be a compact job pack picker:
  - Wall patch + repaint
  - Water damage repaint
  - End-of-lease touch-up
  - Pre-sale refresh
  - Exterior maintenance repaint
  - Deck/stain maintenance
  - Mould treatment + repaint
  - Strata/common area touch-up

  This picker sets AI context only. It does not choose prices or skip review.

## Task 9: Photo Helper and Qwen Vision Input

**Files:**
- Create: `supabase/migrations/052_quote_photos.sql`
- Create: `components/quotes/QuotePhotoUploader.tsx`
- Create: `lib/ai/photo-cache.ts`
- Modify: `lib/ai/providers/qwen.ts`
- Modify: `components/ai/AIDraftPanel.tsx`
- Modify: `app/actions/ai-drafts.ts`
- Modify: `lib/supabase/storage.ts`
- Test: `app/actions/ai-drafts.test.ts`
- Test: `components/ai/AIDraftPanel.test.tsx`

**Method:**

- [ ] **Step 1: Add private quote photo storage**

  Use a private Supabase Storage bucket for quote photos. Access is limited to the quote owner and server-side signed URL generation.

- [ ] **Step 2: Add photo metadata**

  Store quote id, uploader user id, storage path, image hash, original bytes, compressed bytes, width, height, and created timestamp. Do not store customer-visible claims directly on the photo row.

- [ ] **Step 3: Resize and cap photos**

  Cap Basic at 3 photos per quote and 15 photo AI inputs/month. Cap Pro and Pro trial at 5 photos per quote and 100 photo AI inputs/month. Compress to 1920px max dimension and JPEG quality 85 before model input. Record final bytes in usage metadata.

- [ ] **Step 4: Cache repeat analysis**

  If image hash, prompt version, and selected draft purpose match a prior successful analysis, reuse the structured photo hints and log `cache_hit = true`.

- [ ] **Step 5: Restrict photo output**

  Qwen vision output may include visible surface candidates, condition hints, access/prep hints, defect/photo refs, and questions. It may not include exact sqm/lm, price, GST, hidden damage statements, or claims that a moisture/mould source has been fixed.

  For maintenance drafts, photo-derived condition should default to `measurement_status = photo_hint` or `to_confirm`, not `confirmed`.

- [ ] **Step 6: Provide manual fallback**

  If upload, compression, signed URL, or provider call fails, the quote builder remains usable with notes and measurements only.

## Task 10: Streaming Spike and Response UX

**Files:**
- Modify: `app/actions/ai-drafts.ts`
- Modify: `components/ai/AIDraftPanel.tsx`
- Test: `app/actions/ai-drafts.test.ts`

**Method:**

- [ ] **Step 1: Run a 1-day Qwen streaming spike**

  Test whether Qwen streaming can be wrapped through a Next.js Server Action `ReadableStream` in the target runtime. Record result in `V1-PLAN.md`.

- [ ] **Step 2: Pick response pattern**

  If the spike works, stream sections as they become available. If it does not work reliably, ship non-streaming draft generation with a clear progress state and keep streaming deferred.

- [ ] **Step 3: Keep partial output safe**

  Partial draft chunks cannot be saved as a quote until the final validator pass completes.

## Task 11: Today Assistant

**Files:**
- Create: `lib/ai/today-assistant.ts`
- Create: `app/actions/today-assistant.ts`
- Create: `components/ai/TodayAssistantCard.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Test: `app/actions/today-assistant.test.ts`
- Test: `components/ai/TodayAssistantCard.test.tsx`

**Method:**

- [ ] **Step 1: Build deterministic task list first**

  Query sent quotes without response, overdue invoices, soon-due invoices, approved quotes needing booking, today/this-week jobs, approved maintenance quotes needing access confirmation, and maintenance jobs missing before/after photo follow-up. This list must work without AI.

- [ ] **Step 2: Add AI summary only for Pro**

  Basic users see the deterministic list only. Pro and Pro trial users can ask Qwen to write a short summary and priority wording from the deterministic list. It does not invent tasks or change status.

- [ ] **Step 3: Add action CTAs**

  Each item links to quote, invoice, customer, or job detail. The assistant should offer "Write follow-up" where relevant.

- [ ] **Step 4: Log usage**

  Use `ai_usage_logs.feature = today_assistant` for AI summary attempts. Deterministic list views can be tracked separately if product analytics exists.

## Task 12: Follow-up Writer

**Files:**
- Create: `lib/ai/follow-up-writer.ts`
- Create: `app/actions/follow-up-writer.ts`
- Create: `components/ai/FollowUpWriter.tsx`
- Modify: `components/quotes/QuoteActions.tsx`
- Modify: `components/invoices/InvoiceDetail.tsx`
- Modify: `components/customers/CustomerDetail.tsx`
- Test: `app/actions/follow-up-writer.test.ts`
- Test: `components/ai/FollowUpWriter.test.tsx`

**Method:**

- [ ] **Step 1: Support four message types**

  Message types are quote check-in, approved quote booking request, invoice reminder, and maintenance explanation. Each type has a narrow context schema.

  Maintenance explanation covers only painting-adjacent wording:
  - water damage repaint limitation
  - touch-up colour match limitation
  - mould recurrence risk
  - strata/common area access request

- [ ] **Step 2: Require user review**

  v1 never auto-sends. The writer creates an SMS/email draft, then the user sends through existing email flow or manual copy.

- [ ] **Step 3: Avoid operational side effects**

  The writer cannot change quote status, invoice status, job dates, due dates, or customer fields.

- [ ] **Step 4: Log usage and outcome**

  Log generation attempts. If the UI can detect copy/send action, store metadata so Pro trial can measure draft usefulness.

## Task 13: Workspace Assistant Off for v1

**Files:**
- Modify: `components/dashboard/WorkspaceAssistant.tsx`
- Modify: `components/dashboard/Sidebar.tsx`
- Modify: `app/actions/workspace-assistant.ts`
- Test: `components/dashboard/WorkspaceAssistant.test.tsx`
- Test: `app/actions/workspace-assistant.test.ts`

**Method:**

- [ ] **Step 1: Hide generic assistant from v1 navigation**

  The broad workspace assistant should not be a primary v1 product surface. Keep code behind a feature flag if needed.

- [ ] **Step 2: Preserve narrow assistants**

  Today Assistant and Follow-up Writer remain visible because interview results supported them and their actions are bounded.

- [ ] **Step 3: Update tests and copy**

  Remove v1-visible generic chatbot promises. Tests should verify scoped assistant entry points instead.

## Task 14: Pilot Onboarding and Free Pro Trial Readiness

**Files:**
- Modify: `config/plans.ts`
- Modify: `lib/stripe/plans.ts`
- Modify: `lib/stripe/subscription-sync.ts`
- Modify: `lib/stripe/webhook-handler.ts`
- Modify: `app/api/stripe/checkout/route.ts`
- Modify: `app/api/stripe/portal/route.ts`
- Modify: `app/(dashboard)/settings/billing/page.tsx`
- Modify: `docs/features/ai/PHASE0-CHECKLIST.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/features/ai/V1-PLAN.md`

**Method:**

- [ ] **Step 1: Prepare five pilot accounts**

  Each pilot account needs business profile, price rates, quote template defaults, maintenance clause defaults, plan state, trial start/end date, and AI usage limit. P1/P2/P3 are the strongest painter trial candidates. P4/P5 remain insight or adjacent-user candidates unless current quote volume changes.

- [ ] **Step 2: Run first quote smoke test per painter**

  For each painter, create one quote draft from notes, one quote draft with photos if enabled, preview PDF, open public quote, and confirm `ai_usage_logs` captured cost metadata.

  For Paint Buddy/internal validation, also create at least three maintenance-style drafts before pilot start:
  - wall patch + repaint
  - water damage repaint
  - end-of-lease or strata/common area touch-up

- [ ] **Step 3: Set trial baseline**

  Record initial quote volume, rate setup completion, expected monthly quote count, selected plan expectation, Pro trial start date, Pro trial end date, and any excluded features for each painter.

- [ ] **Step 4: Start Free Pro Trial + Paid Conversion Tracking only after readiness**

  `Free Pro Trial + Paid Conversion Tracking` starts only when quote draft, pricing parity, PDF/public quote, usage logs, cost limits, trial state, cancel path, and manual fallback all pass. Trial 종료 후 Pro A$59/month conversion and cancel reason을 측정한다.

- [ ] **Step 5: Verify billing and cancellation flow**

  Stripe checkout/portal/webhook sync must keep app subscription state aligned for Pro trial, active Pro, cancelled, cancel-at-period-end, and renewal resume. Settings/Billing should make cancel available and should show trial end date or current period end without implying lock-in.

## Test and Verification Matrix

| Risk | Required verification |
|------|-----------------------|
| Preview/save/detail/PDF/invoice total mismatch | `lib/quotes.test.ts`, `app/actions/quotes.test.ts`, `app/api/pdf/quote/route.test.ts`, invoice conversion tests |
| Duplicate priced scope | quote action validation tests for quick, advanced, manual line item, optional item |
| Stale rate after save | rate snapshot tests in quote create/update |
| AI creates price | `lib/ai/validator.ts` tests and `app/actions/ai-drafts.test.ts` forbidden field tests |
| Photo-only takeoff expectation | tests confirm photo hints cannot create sqm/lm/price without user input |
| Provider failure | AI action tests for retry once, failure log, manual fallback response |
| Usage cost leak | `ai_usage_logs` tests for success/failure/retry/cancelled attempts |
| Assistant overreach | Today/Follow-up tests confirm no status/date/send side effects |
| Legacy quote form coverage | fixture tests for Winchester interior, Edgar checklist, Paint Buddy exterior |
| Maintenance scope creep | validator tests reject unsupported plumbing/electrical/structural/roofing/pest/asbestos/waterproofing claims |
| Maintenance report-style quote coverage | fixture tests for water damage repaint, end-of-lease touch-up, strata/common area touch-up |

## Trial Start Checklist

- [x] Phase 0 gate recorded as GREEN.
- [ ] All pilot painters have `price_rates` setup complete.
- [ ] Quick/Advanced/Exterior quote totals match across preview, save, detail, PDF, public quote, and invoice conversion.
- [ ] AI draft output is price-free and validator enforced.
- [ ] Qwen provider adapter records provider/model/cost metadata.
- [ ] Basic/Pro/Pro trial AI limits are enforced server-side.
- [ ] Photo helper is capped by plan, compressed, cached, and clearly marked as scope support only.
- [ ] Maintenance job packs are limited to painting-adjacent work and unsupported trades are rejected or marked `to_confirm`.
- [ ] Today Assistant works with deterministic fallback.
- [ ] Follow-up Writer creates draft only and cannot auto-send.
- [ ] AI usage page shows current month counts and estimated cost.
- [ ] Trial state, trial end date, cancel path, and cancel reason capture work.
- [ ] Manual fallback path works when Qwen call fails.
- [ ] First pilot quote draft smoke test passed for each active pilot painter.

## Deferred Until After v1

| 항목 | 이유 |
|------|------|
| Photo-only sqm/lm takeoff | interview interest exists, but v1 accuracy and liability risk are too high |
| Learning-based price recommendation | requires usage history and accepted quote outcomes |
| AI chooses rate or overrides painter price | violates pricing boundary and creates trust risk |
| Automatic send/follow-up/status change | v1 must keep user review and operational control |
| Full billing dashboard | v1 needs Pro trial state, Stripe subscription mapping if used, cancel path, and conversion tracking; a polished billing dashboard can wait |
| Full AI analytics dashboard | v1 only needs limits, cost, and usage counts |
| Property manager portal / tenant-owner approval workflow | v1 only creates quote/report-style artifacts from existing quote data |
| Generic maintenance estimating across all trades | too broad and high-liability before painting-first wedge proves paid usage |
