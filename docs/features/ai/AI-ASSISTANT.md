# AI Assistant — Deferred Post-Core Workflow

> 2026-06-03 update: AI is no longer the v1 wedge. This document records the allowed future AI scope and the gate that must pass before any new AI/photo work starts.

## Current Status

AI draft and Workspace Assistant code may exist in the repo, but they are not the v1 release gate.

Current v1 priority:

```text
Existing Excel price book reference -> simple saved Coatly price book -> quote -> PDF/email -> follow-up -> invoice/schedule
```

AI, Qwen/Gemini provider work, photo analysis, damage detection, and AI usage governance are deferred until the core workflow is completed, released, and verified with a real painter workflow.

## Gate Before Any New AI Work

Do not start new AI/photo implementation until all items below pass:

- [ ] A's real Excel price sheet is used as a reference to set up the needed service/unit/price items in Coatly.
- [ ] A's real quote PDF/email is recreated in Coatly.
- [ ] Quote total, GST, optional items, and PDF output match the intended fixture.
- [ ] Quote email send works.
- [ ] Public quote approval works.
- [ ] Follow-up due state is visible without manual memory.
- [ ] Approved quote converts to invoice.
- [ ] Approved quote converts to schedule/job where relevant.
- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] Vercel preview smoke passes.
- [ ] Production release is verified.

## Allowed AI Scope After Gate

AI can be reopened only as an admin layer on top of a working manual workflow.

| Order | Feature | Allowed | Not allowed |
|------|---------|---------|-------------|
| 1 | Quote explanation helper | Draft customer-facing scope, assumptions, exclusions from saved quote data | Create or change price/rate/GST/total |
| 2 | Follow-up Writer | Draft email/SMS copy for quote check-in, booking request, invoice reminder | Auto-send, change quote status, invent context |
| 3 | Today summary | Summarize deterministic task list from quotes/invoices/jobs | Invent tasks or deadlines |
| 4 | Photo hints | Attach visible condition/access/prep hints for user review | Damage diagnosis, exact sqm/lm, price, hidden moisture/mould claims |
| 5 | Learning-based suggestions | Suggest patterns from past accepted quotes | Override price book or auto-apply rates |

## Frozen Until Post-Release

Do not expand these areas before the gate:

- AI Quote Writer as a purchase reason
- Qwen/Gemini provider adapter work
- streaming AI response
- AI usage/cost dashboard
- photo AI storage/migrations
- damage classification
- photo-only takeoff
- generic Workspace Assistant
- automatic follow-up sending
- automatic status changes

Existing AI-related code can be fixed only if it blocks lint/test/build or current workflow release.

## AI Pricing Boundary

This rule remains permanent:

AI never writes or decides:

- unit price
- rate
- GST
- subtotal
- total
- discount
- schedule date
- invoice status
- quote status

All money comes from deterministic app logic and user-approved price rates.

## Future AI Implementation Notes

When AI is reopened, the implementation plan must include:

- provider-neutral adapter
- server-only credentials
- schema validation that strips forbidden price fields
- per-attempt logging
- monthly usage and cost limits
- manual fallback
- DRAFT marker before customer send
- tests proving AI cannot price or send automatically

## Related Docs

- [V1-PLAN.md](./V1-PLAN.md) — current workflow-first v1 plan
- [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md) — build order before AI
- [../quote/QUOTE.md](../quote/QUOTE.md) — quote workflow and pricing rules
- [../quote/PRICE-BOOK-TEMPLATE.md](../quote/PRICE-BOOK-TEMPLATE.md) — simple price book setup boundary
- [../../PLANS.md](../../PLANS.md) — progress source
