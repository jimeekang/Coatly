# Coatly v1 App Build Plan — Core Workflow Before AI

> 2026-06-03 reframe. The previous AI-first build plan is superseded. Do not start Qwen/Gemini, photo analysis, AI usage governance, or AI Quote Writer work until the core quote workflow has been completed, released, and verified with a real painter workflow.

## Goal

Prove that Coatly can replace a real painter's current workflow:

```text
Excel price sheet
  -> simple in-app price book setup
  -> saved Coatly price book
  -> quote PDF
  -> customer email
  -> manual follow-up
  -> invoice / schedule after approval
```

The first validation fixture is painter A's real Excel price sheet used as a reference to set up the needed price items in Coatly, plus one recent quote PDF/email.

## Hard Sequencing Rule

AI and photo work are blocked until all of these are true:

- A's real price book has been set up in Coatly.
- A's needed service/unit/price items can be set up directly in Coatly and validated before quote creation.
- A's real quote has been recreated in Coatly.
- PDF/email/public quote/follow-up/invoice/schedule paths work end-to-end.
- Relevant tests, build, preview smoke, and production verification have passed.
- The released workflow is usable without AI.

If any of these are false, AI/photo tasks stay deferred.

## What Changed

Previous plan:

- AI-assisted Quote Form Builder as v1 wedge
- Qwen provider adapter
- photo helper
- Basic/Pro AI limits
- AI usage logs before trial
- Today Assistant / Follow-up Writer in v1

Current plan:

- Excel workflow replacement is v1 wedge
- simple in-app price book setup is the v1 onboarding contract
- AI is post-core admin layer
- photo analysis is later
- follow-up must first work with deterministic status/templates
- price book setup is the first product problem

## Build Phases

### Phase 1 — Stabilize Current App

| Task | Completion |
|------|------------|
| Land DDD module refactor | Routes import from `modules/`, tests/build pass, browser smoke confirms no behavior regression |
| Reconcile Supabase migrations | Local migration files and live `schema_migrations` are understood and documented |
| Security gate | Durable public quote rate limit plan, public token regression, env var cleanup |
| Release baseline | Preview deployment can smoke auth, customers, quotes, PDF, invoice, schedule, public quote |

### Phase 2 — A Workflow Fixture

| Task | Completion |
|------|------------|
| Collect Excel price sheet | A's real Excel pricing structure is available locally or documented |
| Setup simple price items | A's existing sheet is used as a reference for service/unit/price entries in Coatly |
| Collect quote artifact | One recent quote PDF/email A actually sent is available for recreation |
| Map pricing structure | Each Excel concept maps to Coatly price rates, templates, material/service items, line items, or scope text |
| Identify gaps | Missing fields or confusing setup steps are recorded before coding |

### Phase 3 — Price Book Setup

| Task | Completion |
|------|------------|
| Business profile setup | ABN, logo, email, phone, bank/payment details are ready |
| Simple setup validation | Missing service/item, unit, price and duplicate/invalid rows are visible before save |
| Price rates setup | A's actual rates can be represented without duplicating pricing sources |
| Service/material setup | Reusable services, materials, optional items, and templates are configured |
| Setup UX notes | Any step that feels harder than Excel is listed as a product risk |

### Phase 4 — Quote Recreation

| Task | Completion |
|------|------------|
| Recreate quote | A's selected quote is rebuilt from scratch in Coatly |
| Total parity | Subtotal, GST, total, optional items, and manual adjustments match expected values |
| Scope parity | Customer-facing scope/notes/assumptions/exclusions are at least as clear as A's original |
| PDF parity | Generated PDF is customer-sendable and does not require manual Word/PDF cleanup |
| Mobile path | Quote can be created or edited on mobile/tablet without layout breakage |

### Phase 5 — Send And Follow-up Loop

| Task | Completion |
|------|------------|
| Email send | Quote email sends through Resend with correct recipient, subject, PDF/public link behavior |
| Public quote | `/q/[token]` displays the correct quote, optional items, approve/reject, signature, and booking steps |
| Follow-up due | Sent quotes show next follow-up due state without relying on memory |
| Manual/template follow-up | User can send or copy a follow-up using deterministic templates first |
| Event logging | Public view/approval/rejection/follow-up events are inspectable where supported |

### Phase 6 — Conversion Loop

| Task | Completion |
|------|------------|
| Quote to invoice | Approved quote converts to invoice with correct line items and totals |
| Invoice email/PDF | Invoice PDF token and email path works |
| Quote to schedule/job | Approved quote can create a job/schedule days where relevant |
| Google Calendar semantics | Calendar write failure policy is fail-closed or clearly recoverable |
| Regression tests | Quote/PDF/invoice/schedule paths have focused tests for the fixture behavior |

### Phase 7 — Release

| Task | Completion |
|------|------------|
| Quality checks | `npm run lint`, `npm run test:run`, `npm run build` pass |
| Preview smoke | auth, onboarding, customers, price rates, quote, PDF/email, public quote, invoice, schedule pass |
| Production deploy | Production deployment succeeds and core smoke passes |
| Notion/docs update | Progress is append-only and does not mark unverified AI as done |

## Post-Release AI Planning

Only after Phase 7 is complete:

| Order | AI work | Rule |
|------|---------|------|
| 1 | Quote explanation helper | Uses saved quote data only. No price/rate/GST fields |
| 2 | Follow-up Writer | Drafts copy only. No auto-send and no automatic status changes |
| 3 | Today Assistant summary | Summarizes deterministic SQL task list only |
| 4 | Photo hints | Visible condition/access/prep hints only. No damage diagnosis, exact measurement, or price |
| 5 | Usage/cost governance | Required before paid AI usage, but not before core workflow release |
| 6 | Provider adapter | Qwen/Gemini chosen after AI scope is revalidated |

## Files Likely Touched In Core Workflow

| Area | Likely files |
|------|--------------|
| Simple price book setup | `docs/features/quote/PRICE-BOOK-TEMPLATE.md`, future price setup direct-add and optional import/review UI |
| Price setup | `modules/price-rates/`, `config/paint-rates.ts`, `config/interior-estimate-anchors.ts` |
| Materials/services | `modules/materials/`, `modules/materials/application/actions.ts` |
| Quote creation/edit | `modules/quotes/domain/`, `modules/quotes/application/`, `modules/quotes/ui/` |
| PDF | `lib/pdf/quote-template.tsx`, `app/api/pdf/quote/route.ts` |
| Email | `lib/email/resend.ts`, quote email actions |
| Public quote | `app/q/[token]/`, `modules/quotes/ui/public/` |
| Follow-up/status | quote status fields, `public_quote_events`, dashboard/list views |
| Invoice conversion | `modules/invoices/`, `lib/pdf/invoice-template.tsx` |
| Schedule/jobs | `modules/jobs/`, `components/schedule/`, `app/actions/schedule.ts` |
| Tests | related `*.test.ts` / `*.test.tsx` files |

## AI Files Frozen Until Post-Release

Do not expand these before the release gate:

- `components/ai/AIDraftPanel.tsx`
- `app/actions/ai-drafts.ts`
- `lib/ai/drafts.ts`
- `lib/ai/providers/*`
- `lib/ai/validator.ts`
- new photo AI storage/migrations
- `ai_usage_logs` unless a non-AI audit need is separately approved

Bug fixes are allowed if existing AI code breaks build/tests, but no new AI product scope should be added.

## Acceptance Criteria

Core workflow is complete when:

- A's fixture quote can be recreated in Coatly.
- A can understand where to set prices directly in Coatly without hidden duplicate pricing sources.
- The app does not rely on A's original Excel file as the calculation engine after import.
- The PDF/email output is good enough to send without external editing.
- Follow-up due state is visible.
- Approved quote can become invoice and schedule/job.
- Tests/build pass.
- Preview and production are verified.

Only then may the team write a new AI implementation plan.
