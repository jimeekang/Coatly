# V1 Task 5 — Scope Builder, Clause Library, PDF/Public Rendering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** COMPLETED as of 2026-05-24.

**Goal:** Wire Task 4 quote form structure into the quote editor, public quote, and PDF so painters can save customer-visible scope sections, maintenance job packs, and clauses without creating another pricing source.

**Architecture:** Task 5 keeps pricing deterministic. `quote_scope_sections`, `quote_scope_steps`, and `quote_clause_items` store customer-visible wording; `quote_estimate_items` and `quote_line_items` remain the only priced row sources. PDF/public rendering must show the quote document in this order: business/customer details, job description, customer-visible scope, pricing summary, optional add-ons, clauses, totals, and deposit/payment details when present.

**Tech Stack:** Next.js App Router, React controlled forms, Server Actions, Supabase Postgres/RLS via existing tables, `@react-pdf/renderer`, TypeScript, Vitest/Testing Library.

---

## Decision: Scope Text vs Price Rows

| Option                                                                | Pros                                                                                      | Cons                                                                    | Decision                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------- |
| Render scope text from Task 4 tables and keep prices in existing rows | Matches v1 AI boundary, avoids double-charging, supports report-style maintenance wording | Requires clear UI separation between scope wording and pricing controls | **Use this**            |
| Add price controls inside Scope Builder                               | Looks compact                                                                             | Creates a second pricing source and bypasses Task 1-3 calculator guards | Do not add in Task 5    |
| Build a separate maintenance report product/PDF                       | Could fit future strata/property manager workflows                                        | Bigger v1.1+ product surface and separate approval workflow             | Do not add in v1 Task 5 |

**Implementation decision:** Scope sections and clauses can be edited and rendered, but they never contain unit price, rate, GST, subtotal, or total fields. Maintenance job packs provide labels, prep/risk defaults, and clauses only. PDF totals always come from stored quote totals and selected optional line items, not scope wording.

## PDF Required Content Standard

The quote PDF must render all customer-facing quote content that can be authored in the quote form:

- Business identity: logo, business name, ABN, phone, email, and business address when saved.
- Customer identity: customer/company name, contact name, site address, email, and phone when saved.
- Quote identity: quote number, title, date, valid-until date, booking duration, status where useful.
- Job description: quote title and client-visible notes.
- Customer-visible scope sections: title, area label, description, visible steps, optional/included/to-confirm status, and maintenance summary band when `report_context` is set.
- Pricing summary: deterministic estimate rows, rooms/surfaces, included materials/services, optional add-ons, discount, GST, manual adjustment, total, and deposit requirement when present.
- Clauses/terms: selected customer-visible inclusions, exclusions, risk disclosures, warranty, payment, validity, access, colour-match, water damage, mould, strata/common area, and before/after photo notes.

## Scope

### In

- Add a controlled `ScopeBuilder` to quote create/edit.
- Add a controlled `ClauseLibraryPicker` to quote create/edit.
- Add quote job type selection including `Maintenance / touch-up`.
- Let maintenance quotes select the existing painting-adjacent job packs.
- Save `job_type`, `scope_sections`, nested `steps`, and `clause_items` from the quote form.
- Hydrate `scope_sections`, `steps`, and `clause_items` in private quote detail, edit defaults, public quote, and PDF route.
- Render scope sections before pricing in public quote and PDF.
- Render clauses after optional add-ons in public quote and PDF.
- Ensure PDF includes logo, business details, customer details, quote details, quote authored fields, pricing rows, totals, and deposit details.
- Add tests for maintenance scope payload, public rendering, PDF data hydration, and no scope-created prices.

### Out

- No new Price Rates maintenance tab.
- No new Supabase tables or migrations.
- No AI provider call.
- No property manager portal, tenant/owner approval workflow, or standalone maintenance report product.
- No plumbing/electrical/structural/roofing maintenance automation.
- No scope-builder price, GST, or rate inputs.

## Files

- Create: `docs/features/ai/V1-TASK5-SCOPE-BUILDER-CLAUSE-PDF-PUBLIC.md`
- Create: `components/quotes/ScopeBuilder.tsx`
- Create: `components/quotes/ClauseLibraryPicker.tsx`
- Create: `lib/quote-form-structure.ts`
- Create: `lib/quote-form-structure.test.ts`
- Modify: `components/quotes/QuoteForm.tsx`
- Modify: `components/quotes/QuoteCreateScreen.tsx`
- Modify: `app/(dashboard)/quotes/[id]/edit/page.tsx`
- Modify: `app/actions/quote-templates.ts`
- Modify: `app/actions/quotes.ts`
- Modify: `lib/quotes.ts`
- Modify: `lib/businesses.ts`
- Modify: `lib/pdf/quote-template.tsx`
- Modify: `app/api/pdf/quote/route.ts`
- Modify: `components/quotes/public/PublicQuoteClient.tsx`
- Test: `components/quotes/QuoteForm.test.tsx`
- Test: `components/quotes/public/PublicQuoteClient.test.tsx`
- Test: `app/api/pdf/quote/route.test.ts`

---

## Task 5.1: Quote Form Scope And Clause Authoring

- [x] **Step 1: Add failing QuoteForm test**

  Add a test proving a painter can select `Maintenance / touch-up`, add a water-damage scope section with a customer-visible prep step, add `source_repair_excluded`, and submit a payload containing `job_type`, `scope_sections`, and `clause_items` without price fields in scope metadata.

- [x] **Step 2: Add `ScopeBuilder`**

  `ScopeBuilder` must expose section title, description, area label, section kind, optional state, pricing status, measurement status, maintenance job pack, visible defects, and visible steps. It must not expose price, rate, GST, subtotal, or total inputs.

- [x] **Step 3: Add `ClauseLibraryPicker`**

  `ClauseLibraryPicker` must use `QUOTE_FORM_CLAUSE_LIBRARY` and include maintenance keys: `source_repair_excluded`, `water_damage_best_effort`, `mould_recurrence_risk`, `touch_up_colour_match_limit`, `tenant_owner_access_required`, `strata_common_area_access`, and `before_after_photo_note`.

- [x] **Step 4: Wire `QuoteForm` payload**

  Add `job_type`, `scope_sections`, and `clause_items` to the quote form state and payload. Existing price preview must stay unchanged when only scope/clauses change.

## Task 5.2: Hydrated Quote Form Structure Read Model

- [x] **Step 1: Add failing structure mapper test**

  Add a test that maps section metadata into `maintenance_job_pack`, `visible_defects`, `priority`, `report_context`, and nested visible steps while preserving sort order.

- [x] **Step 2: Add `lib/quote-form-structure.ts`**

  Centralise mapping helpers for scope sections, scope steps, and clause items so server actions, public quote, and PDF use the same data shape.

- [x] **Step 3: Hydrate private quote detail**

  Update `getQuote()` relation loading so edit pages receive existing `scope_sections` and `clause_items`.

- [x] **Step 4: Hydrate public quote detail**

  Update `getPublicQuoteByToken()` relation loading so public quote rendering can use the same sections and clauses without exposing internal-only notes.

## Task 5.3: Public Quote Rendering

- [x] **Step 1: Add failing PublicQuoteClient test**

  Add a test that renders maintenance scope, selected clause text, optional line item status, and canonical totals from the same quote fixture.

- [x] **Step 2: Render scope sections first**

  Public quote must render customer-visible scope sections before pricing rows. It should show maintenance report-style summary when any visible section has `report_context`.

- [x] **Step 3: Render clauses last**

  Public quote must render customer-visible clauses after optional add-ons and before approval.

## Task 5.4: PDF Rendering And Data Completeness

- [x] **Step 1: Add failing PDF route test**

  Add a test proving the PDF route loads `quote_estimate_items`, scope sections, scope steps, and clauses, then passes business logo/details and customer details to the PDF template.

- [x] **Step 2: Hydrate PDF route data**

  PDF route must load `quote_estimate_items`, `quote_scope_sections`, `quote_scope_steps`, and `quote_clause_items` in addition to rooms/surfaces/line items.

- [x] **Step 3: Render PDF content standard**

  Update `QuoteTemplate` to render logo, full business details, customer details, quote details, scope sections, pricing rows, optional add-ons, clauses, totals, and deposit requirement.

## Task 5.5: Verification

- [x] **Step 1: Focused red/green tests**

  Run:

  ```bash
  npm run test:run -- lib/quote-form-structure.test.ts components/quotes/QuoteForm.test.tsx components/quotes/public/PublicQuoteClient.test.tsx app/api/pdf/quote/route.test.ts
  ```

- [x] **Step 2: Quote action regression**

  Run:

  ```bash
  npm run test:run -- app/actions/quotes.test.ts components/quotes/QuoteForm.test.tsx app/api/pdf/quote/route.test.ts
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

- [x] Task 5 plan document exists and records the scope-vs-price decision.
- [x] Quote create/edit can save customer-visible scope sections, visible steps, maintenance job pack, and selected clauses.
- [x] Scope Builder exposes no price/rate/GST/total controls.
- [x] Public quote renders scope sections first, pricing summary second, optional add-ons third, and clauses last.
- [x] PDF route loads all quote authored content needed for the PDF.
- [x] PDF template renders logo, business details, customer details, quote details, job description, scope, pricing rows, optional add-ons, clauses, totals, and deposit details.
- [x] Maintenance fixtures for water damage, end-of-lease touch-up, and strata/common area can be represented without maintenance-specific rates.
- [x] Focused tests, quote regression tests, full test suite, lint, build, and diff check pass.

## Verification Record

- `npm run test:run -- lib/quote-form-structure.test.ts components/quotes/QuoteForm.test.tsx components/quotes/public/PublicQuoteClient.test.tsx app/api/pdf/quote/route.test.ts app/actions/quotes.test.ts` passed: 5 files, 76 tests.
- `npm run test:run` passed: 64 files, 427 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
