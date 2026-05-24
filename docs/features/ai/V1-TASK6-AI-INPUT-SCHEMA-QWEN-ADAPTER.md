# V1 Task 6 — AI Input Schema + Qwen Adapter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** COMPLETED as of 2026-05-24.

**Goal:** Replace legacy price-bearing quote AI drafts with a Qwen-backed, price-free quote form draft boundary that can safely draft painting-adjacent maintenance scope.

**Architecture:** Task 6 keeps AI behind a provider-neutral adapter and validates the draft before the UI can apply it. AI may produce customer-visible scope sections, pricing candidates, clauses, assumptions, and questions; it must not produce rate, unit price, subtotal, GST, total, or hidden-damage certainty. Deterministic pricing remains a separate server-side mapping step from accepted candidates to the painter's existing Quick/Advanced/exterior/manual pricing paths.

**Tech Stack:** Next.js Server Actions, server-only TypeScript modules, Zod, Supabase read context, Qwen/DashScope compatible chat-completions API, Vitest, Testing Library.

---

## Decision: AI Draft Text vs Deterministic Pricing

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Let AI create priced quote rows | Looks fast in the UI | Breaks Task 1-5 price authority and can invent rates/GST/totals | Do not use |
| Let AI create scope plus review-only pricing candidates | Preserves deterministic pricing, supports maintenance wording, gives painters useful structure | Requires a validator and a later review/apply step | **Use this** |
| Disable pricing candidates entirely | Safest | Loses the main AI quote-builder value | Do not use in Task 6 |

**Implementation decision:** Qwen can suggest what should be priced, but accepted prices are created only by deterministic app code using existing rate settings. Maintenance candidates can only point at Quick room templates, advanced/interior measured rows, exterior surfaces, day rate, manual/service add-ons, or optional add-ons. There is no generic maintenance rate table.

## AI Boundary Standard

The quote AI output may contain only:

- `job_type`
- `maintenance_job_pack`
- `scope_sections`
- `pricing_candidates`
- `clauses`
- `assumptions`
- `questions_for_user`

The quote AI output must not contain:

- `rate`, `rates`, `rate_cents`
- `unit_price`, `unit_price_cents`
- `price`, `price_cents`
- `subtotal`, `subtotal_cents`
- `gst`, `gst_cents`
- `total`, `total_cents`
- `daily_rate`, `daily_rate_cents`

Unsupported or specialist work must become a non-priced question or excluded/to-confirm scope item. It must never become a priced candidate.

Unsupported examples:

- plumbing
- electrical
- HVAC
- structural repair
- roofing repair
- pest treatment
- asbestos work
- waterproofing diagnosis/repair
- photo-only exact measurement or fixed price
- hidden moisture source certainty without painter notes

## Scope

### In

- Add quote AI input fields: `job_type`, `maintenance_job_pack`, `property_context`, `visible_defects`, `access_notes`, `rough_measurements`, and optional photo refs.
- Add provider-neutral AI provider types.
- Add a server-only Qwen adapter using `QWEN_API_KEY`, `QWEN_MODEL`, and optional `QWEN_BASE_URL`.
- Replace quote AI draft output with the Task 6 quote form draft shape.
- Add a validator/repair layer that strips forbidden price fields, normalizes arrays, caps generated scope sections, and routes unsupported trade work to questions.
- Add deterministic pricing candidate mapping for existing pricing paths without writing quote totals.
- Update `generateAIDraft` configuration/usage metadata from Gemini to Qwen.
- Update Quote Create AI apply mapping so AI drafts populate quote form structure, not legacy priced rooms.
- Add tests for validator safety, Qwen adapter behavior, deterministic candidate mapping, server action input plumbing, and UI review disclosure.

### Out

- No new Supabase tables or migrations. Usage limits/log schema are Task 7.
- No live email sending.
- No photo upload/analyse UI. Photo helper is later.
- No public quote/PDF marker or AI disclaimer. That is Task 11.
- No generic workspace assistant redesign. Existing non-quote assistant behavior is only kept compiling.
- No automatic save/send from an AI draft.
- No plumbing/electrical/structural/roofing quote automation.

## Files

- Create: `docs/features/ai/V1-TASK6-AI-INPUT-SCHEMA-QWEN-ADAPTER.md`
- Create: `lib/ai/providers/types.ts`
- Create: `lib/ai/providers/qwen.ts`
- Create: `lib/ai/providers/qwen.test.ts`
- Create: `lib/ai/validator.ts`
- Create: `lib/ai/validator.test.ts`
- Create: `lib/ai/apply-deterministic-pricing.ts`
- Create: `lib/ai/apply-deterministic-pricing.test.ts`
- Modify: `lib/ai/draft-types.ts`
- Modify: `lib/ai/drafts.ts`
- Modify: `app/actions/ai-drafts.ts`
- Modify: `app/actions/ai-drafts.test.ts`
- Modify: `app/actions/workspace-assistant.ts`
- Modify: `app/actions/workspace-assistant.test.ts`
- Modify: `components/ai/AIDraftPanel.tsx`
- Modify: `components/ai/AIDraftPanel.test.tsx`
- Modify: `components/quotes/QuoteCreateScreen.tsx`

---

## Task 6.1: Quote AI Draft Schema And Validator

- [x] **Step 1: Add failing validator tests**

  Add tests proving:

  - price/rate/GST/total fields are removed recursively
  - maintenance job packs are limited to known painting-adjacent packs
  - unsupported trade notes become `refer_to_specialist` or `unsupported_scope` questions
  - photo-derived exact measurement claims are downgraded to `to_confirm`
  - output arrays are normalized and scope sections are capped

- [x] **Step 2: Add Task 6 quote AI types**

  Update `lib/ai/draft-types.ts` with quote input/output types for:

  - `AIQuoteDraftInput`
  - `AIQuoteDraft`
  - `AIQuotePricingCandidate`
  - `AIQuoteQuestion`
  - `AIQuoteValidationResult`

- [x] **Step 3: Implement `lib/ai/validator.ts`**

  The validator must accept unknown provider output, return the safe quote draft shape, and keep warnings/questions visible to the painter.

## Task 6.2: Provider-Neutral Qwen Adapter

- [x] **Step 1: Add failing Qwen adapter tests**

  Add tests proving:

  - missing `QWEN_API_KEY` reports unconfigured state
  - request payload is chat-completions compatible and uses `qwen3-vl-flash` by default
  - retryable HTTP status codes are classified without leaking API keys
  - JSON response content is parsed into provider-neutral output

- [x] **Step 2: Add provider contracts**

  Create `lib/ai/providers/types.ts` so app code depends on `AIProvider`, not Qwen-specific code.

- [x] **Step 3: Add `lib/ai/providers/qwen.ts`**

  The adapter owns Qwen base URL, model, request construction, response parsing, retry classification, token usage, and cost metadata. It must be `server-only`.

## Task 6.3: Draft Generation Wiring

- [x] **Step 1: Add failing draft/action tests**

  Update tests proving quote draft generation passes the Task 6 input fields and does not pass raw customer contact PII or quote totals to the quote AI context.

- [x] **Step 2: Replace quote draft generation path**

  Update `lib/ai/drafts.ts` so quote drafts call Qwen through the provider adapter and then pass output through the validator. Customer/invoice drafts may continue to use the same provider-neutral JSON flow, but quote output must use the Task 6 boundary.

- [x] **Step 3: Update `generateAIDraft` action**

  Update configuration copy, usage metadata, and optional quote input fields. The action must return validation warnings/questions without attempting to save or send anything.

## Task 6.4: Deterministic Candidate Mapping

- [x] **Step 1: Add failing deterministic pricing tests**

  Add tests proving:

  - a Quick room candidate maps to an existing room template snapshot
  - a missing rate/template leaves the candidate `to_confirm`
  - a maintenance candidate cannot create a generic maintenance price
  - generated items include deterministic app rates, not AI-provided fields

- [x] **Step 2: Implement `apply-deterministic-pricing.ts`**

  The module maps accepted candidates to reviewable deterministic pricing payloads. It does not insert rows, send email, or mutate quote totals.

## Task 6.5: Quote Create UI Application

- [x] **Step 1: Add/update UI tests**

  Update `AIDraftPanel` tests to describe provider configuration generically/Qwen and the price-review boundary.

- [x] **Step 2: Apply AI quote drafts to form defaults**

  Update `QuoteCreateScreen` so applying a quote AI draft sets `job_type`, `scope_sections`, `clause_items`, and `ai_intake_snapshot`. It must not populate legacy priced `rooms` from AI output.

## Task 6.6: Verification

- [x] **Step 1: Focused red/green tests**

  Run:

  ```bash
  npm run test:run -- lib/ai/validator.test.ts lib/ai/providers/qwen.test.ts lib/ai/apply-deterministic-pricing.test.ts app/actions/ai-drafts.test.ts components/ai/AIDraftPanel.test.tsx
  ```

- [x] **Step 2: AI regression tests**

  Run:

  ```bash
  npm run test:run -- app/actions/ai-drafts.test.ts app/actions/workspace-assistant.test.ts components/quotes/QuoteForm.test.tsx components/quotes/QuoteCreateScreen.test.tsx components/ai/AIDraftPanel.test.tsx
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

- [x] Task 6 plan document exists and records the AI-vs-deterministic-pricing decision.
- [x] Quote AI output is limited to `job_type`, `maintenance_job_pack`, `scope_sections`, `pricing_candidates`, `clauses`, `assumptions`, and `questions_for_user`.
- [x] Forbidden price/rate/GST/total fields are stripped or rejected before the UI can apply a draft.
- [x] Qwen provider details and API key stay server-side.
- [x] Unsupported trade and hidden-damage claims become non-priced questions or excluded/to-confirm scope, not priced rows.
- [x] Deterministic candidate mapping uses existing rate settings only and does not add a maintenance rate table.
- [x] Quote Create applies AI scope/clauses/intake snapshots without creating legacy AI-priced rooms.
- [x] Focused tests, AI regressions, full test suite, lint, build, and diff check pass.

## Implementation Snapshot

- Added Task 6 quote AI draft input/output types in `lib/ai/draft-types.ts`, while keeping dashboard assistant create-quote legacy form typing separate.
- Added `lib/ai/validator.ts` to normalize Qwen output, strip forbidden price fields, cap generated sections, preserve questions, and route unsupported trade/photo-only certainty into non-priced confirmation questions.
- Added provider-neutral contracts in `lib/ai/providers/types.ts` and a server-only Qwen adapter in `lib/ai/providers/qwen.ts`.
- Replaced quote draft generation in `lib/ai/drafts.ts` with Qwen provider output plus validator repair. Quote AI context now carries Task 6 fields and does not pass raw customer contact details or quote totals.
- Updated AI usage/configuration copy from Gemini to Qwen.
- Added `lib/ai/apply-deterministic-pricing.ts` as a pure review mapper from accepted pricing candidates to existing Quick Estimate room snapshots only. It does not write rows or mutate totals.
- Updated `QuoteCreateScreen` and `QuoteForm` so applying an AI quote draft populates `job_type`, `scope_sections`, `clause_items`, and an AI intake snapshot without legacy AI-priced rooms.

## Verification Record

- Worker red/green checks:
  - `npm run test:run -- lib/ai/validator.test.ts` passed 5 tests.
  - `npm run test:run -- lib/ai/providers/qwen.test.ts` passed 5 tests.
  - `npm run test:run -- lib/ai/apply-deterministic-pricing.test.ts` passed 4 tests.
- Integrated focused run: `npm run test:run -- lib/ai/validator.test.ts lib/ai/providers/qwen.test.ts lib/ai/apply-deterministic-pricing.test.ts app/actions/ai-drafts.test.ts app/actions/workspace-assistant.test.ts components/ai/AIDraftPanel.test.tsx components/quotes/QuoteCreateScreen.test.tsx` passed 7 files / 28 tests.
- Full suite: `npm run test:run` passed 68 files / 446 tests.
- `npm run lint` passed with no warnings after deterministic mapper cleanup.
- `npm run build` passed.
- `git diff --check` passed.
- Browser check: `/quotes/new` rendered the current Starter-gated quote creation screen with New Quote, Pricing Method, Scope Builder, and Clause Library present and no runtime error text.
