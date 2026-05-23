# V1 Task 4 — Quote Form Structure Schema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** COMPLETE as of 2026-05-23.

**Goal:** Add the quote form structure foundation that separates customer-visible scope/clauses from deterministic priced rows, with `maintenance` supported as a painting-adjacent job type.

**Architecture:** Do not add a separate Maintenance Price Rates tab in Task 4. Maintenance quotes reuse existing Quick/Advanced/exterior/manual pricing sources, while `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, and `quote_ai_intake_snapshots` store the customer-visible form structure. Maintenance-specific detail lives in typed job packs and section metadata, not in hidden price tables.

**Tech Stack:** Next.js App Router, Server Actions, Supabase Postgres/RLS, TypeScript, Zod, Vitest.

---

## Decision: Quick Rates vs Maintenance Rates

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Keep Quick/Advanced as the only price-rate source | Reuses completed Task 2/3 safety work, avoids duplicate anchors, existing quote calculators already snapshot rates | Maintenance copy must explain that job packs are scope templates, not price tables | **Use this** |
| Add a separate Maintenance rates section to Price Rates | Looks product-specific for maintenance | Creates another authoritative price source and increases double-charge risk for the same walls/ceiling/trim/prep work | Do not add in v1 Task 4 |
| Add generic maintenance/tradie rates | Broad future expansion | Breaks painting-first boundary, creates liability for plumbing/electrical/structural categories | Explicitly blocked |

**Implementation decision:** A maintenance quote can select a job pack such as `water_damage_repaint`, but the subtotal still comes from existing deterministic pricing: Quick room library, Advanced room/surface pricing, exterior surfaces, day rate, or manual service add-ons. Job packs can recommend likely pricing methods but cannot contain cents, rates, GST, or totals.

## Scope

### In

- Add Supabase schema for quote scope sections, nested steps, selected clauses, and AI intake snapshots.
- Add `quotes.job_type` with `interior`, `exterior`, `both`, and `maintenance`.
- Add nullable `scope_section_id` links on `quote_estimate_items` and `quote_line_items` for later Task 5 UI wiring.
- Add typed quote form taxonomy config with no price values.
- Add painting-adjacent maintenance job packs with no price values.
- Allow quote create payloads to save scope sections, steps, clauses, and AI intake snapshots.
- Add tests proving maintenance scope data is accepted/saved and job packs contain no price fields.

### Out

- No new Price Rates maintenance tab.
- No property manager portal, tenant/owner workflow, request queue, or recurring maintenance table.
- No plumbing, electrical, HVAC, structural, roofing repair, pest, asbestos, or waterproofing quote automation.
- No AI provider call in Task 4.
- No PDF/public rendering of scope sections yet. That is Task 5.

## Files

- Create: `docs/features/ai/V1-TASK4-QUOTE-FORM-STRUCTURE-SCHEMA.md`
- Create: `supabase/migrations/050_quote_form_structure.sql`
- Create: `config/quote-form-taxonomy.ts`
- Create: `config/maintenance-job-packs.ts`
- Create: `config/maintenance-job-packs.test.ts`
- Modify: `types/quote.ts`
- Modify: `types/database.ts`
- Modify: `types/app-database.ts`
- Modify: `lib/supabase/types.ts`
- Modify: `lib/supabase/validators.ts`
- Modify: `lib/supabase/validators.test.ts`
- Modify: `lib/quotes.ts`
- Modify: `app/actions/quotes.ts`
- Modify: `app/actions/quotes.test.ts`

---

## Task 4.1: Schema And RLS

- [x] **Step 1: Create migration**

  Add `supabase/migrations/050_quote_form_structure.sql` with:

  - `quotes.job_type` check: `interior`, `exterior`, `both`, `maintenance`
  - `quote_scope_sections`
  - `quote_scope_steps`
  - `quote_clause_items`
  - `quote_ai_intake_snapshots`
  - Nullable `scope_section_id` on `quote_estimate_items` and `quote_line_items`
  - RLS policies that allow access only through the parent quote owner
  - `authenticated` grants for the new Data API tables

- [x] **Step 2: Confirm schema constraints**

  The migration must:

  - Allow `section_kind = maintenance`.
  - Allow `pricing_status = unpriced | priced | included | excluded | allowance | to_confirm`.
  - Allow AI intake `job_type = maintenance`.
  - Prevent obvious top-level price fields in customer-visible metadata/output JSON.

## Task 4.2: Price-Free Taxonomy And Packs

- [x] **Step 1: Add quote form taxonomy**

  `config/quote-form-taxonomy.ts` must include:

  - Section kinds
  - Pricing statuses
  - Measurement statuses
  - Interior areas/surfaces
  - Exterior surfaces
  - Prep/paint/condition tags
  - Clause library keys including maintenance clauses
  - `FORBIDDEN_QUOTE_FORM_PRICE_FIELDS`

- [x] **Step 2: Add maintenance job packs**

  `config/maintenance-job-packs.ts` must include only:

  - `wall_patch_repaint`
  - `water_damage_repaint`
  - `end_of_lease_touch_up`
  - `pre_sale_refresh`
  - `exterior_maintenance_repaint`
  - `deck_stain_maintenance`
  - `mould_treatment_repaint`
  - `strata_common_area_touch_up`

  Each pack may define labels, allowed surfaces, common prep steps, risk clause keys, likely pricing methods, visible defect tags, and required confirmation questions. It must not define rates, cents, subtotal, GST, totals, day rates, or unit prices.

- [x] **Step 3: Add pack safety tests**

  Add recursive tests that fail if any taxonomy or pack contains forbidden price fields.

## Task 4.3: Types And Validation

- [x] **Step 1: Add app/domain types**

  Add quote job type, scope section, scope step, clause item, AI intake snapshot, and maintenance job pack types.

- [x] **Step 2: Add generated database type shims**

  Since this repo keeps generated Supabase types checked in, manually add new table shapes to `types/database.ts`, `types/app-database.ts`, and `lib/supabase/types.ts`.

- [x] **Step 3: Extend quote create validation**

  `quoteCreateSchema` must accept:

  - `job_type`
  - `scope_sections[]` with nested `steps[]`
  - `clause_items[]`
  - `ai_intake_snapshot`

  It must reject unsupported maintenance packs and obvious price fields in scope metadata or AI output JSON.

## Task 4.4: Server Action Persistence

- [x] **Step 1: Save job type on quote create/update**

  Resolve `job_type` from explicit input first, then from selected estimate type. Maintenance can be explicit even when pricing method is manual/day-rate/quick.

- [x] **Step 2: Save quote form structure on create**

  If a quote payload includes scope sections, save:

  - sections to `quote_scope_sections`
  - nested steps to `quote_scope_steps`
  - clauses to `quote_clause_items`
  - AI intake snapshot to `quote_ai_intake_snapshots`

- [x] **Step 3: Save quote form structure on update when supplied**

  Task 4 only needs backend support. The Task 5 UI will decide when to send full replacement payloads.

- [x] **Step 4: Keep price rows deterministic**

  No new code path can write price/rate/GST/total fields from scope sections, clauses, or AI intake output.

## Task 4.5: Verification

- [x] **Step 1: Red/green focused tests**

  Run:

  ```bash
  npm run test:run -- config/maintenance-job-packs.test.ts lib/supabase/validators.test.ts app/actions/quotes.test.ts
  ```

- [x] **Step 2: Existing Task 2/3 regression**

  Run:

  ```bash
  npm run test:run -- utils/calculations.test.ts lib/rate-settings.test.ts lib/room-price-library.test.ts lib/rate-setup-diagnostics.test.ts lib/interior-estimates.test.ts lib/quote-pricing-scopes.test.ts app/actions/quotes.test.ts components/rates/PriceRatesForm.test.tsx components/quotes/QuoteForm.test.tsx
  ```

- [x] **Step 3: Full verification**

  Run:

  ```bash
  npm run test:run
  npm run lint
  npm run build
  git diff --check
  ```

## Completion Criteria

- [x] Task 4 plan document exists and records the Quick-vs-maintenance-rate decision.
- [x] Migration adds quote form structure tables, RLS, grants, and `maintenance` job type support.
- [x] Maintenance job packs are price-free and limited to painting-adjacent work.
- [x] Quote create can persist maintenance scope sections, steps, clauses, and AI intake snapshots without creating prices from them.
- [x] Existing Quick/Advanced/Room Price Library tests still pass.
- [x] Full tests, lint, build, and diff check pass.

## Implementation Snapshot

- Created `supabase/migrations/050_quote_form_structure.sql` with `quotes.job_type`, quote form structure tables, RLS, authenticated grants, service role grants, and nullable `scope_section_id` links for deterministic priced rows.
- Added `config/quote-form-taxonomy.ts` and `config/maintenance-job-packs.ts`. Maintenance packs are scope templates only; they include no cents/rate/GST/total fields.
- Extended quote validation to accept `job_type`, `scope_sections`, `clause_items`, and `ai_intake_snapshot`, while rejecting unsupported maintenance packs and AI output price fields.
- Extended quote create/update server actions to persist quote form structure only when supplied. Existing Quick/Advanced/manual pricing remains the only subtotal authority.
- Updated app/database type shims for the new schema.

## Verification Record

- Red check: initial focused run failed because taxonomy/config, validator fields, and quote form persistence were not implemented.
- Green focused run: `npm run test:run -- config/maintenance-job-packs.test.ts lib/supabase/validators.test.ts app/actions/quotes.test.ts` passed 3 files / 47 tests.
- Task 2/3 regression: `npm run test:run -- utils/calculations.test.ts lib/rate-settings.test.ts lib/room-price-library.test.ts lib/rate-setup-diagnostics.test.ts lib/interior-estimates.test.ts lib/quote-pricing-scopes.test.ts app/actions/quotes.test.ts components/rates/PriceRatesForm.test.tsx components/quotes/QuoteForm.test.tsx` passed 9 files / 149 tests.
- Full suite: `npm run test:run` passed 63 files / 422 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
