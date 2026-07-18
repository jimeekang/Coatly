# Coatly v1 — Quote Workflow Replacement

> Owner: **Claude** (Opus 4.8 · extra) — 기획/디자인/QA/분석 문서. 구현·DB·git 결정은 Codex(high) 영역.
> 2026-06-03 product reframe. This file keeps the historical `features/ai` path so existing links do not break, but the current v1 plan is **workflow-first**. The old AI-first Quote Writer plan is superseded until the core quote workflow is released.

## Decision

Coatly is not currently an "AI quote app" project.

Coatly v1 is:

> **Excel quote workflow replacement for Australian painters/tradies.**

The strongest current evidence comes from painter A:

- A already uses an Excel price sheet.
- A turns the quote into PDF.
- A emails the customer manually.
- A manually remembers follow-ups.
- A creates roughly 2–4 quotes/week.
- A spends 30+ minutes per quote workflow.
- A would consider paying if Coatly replaced that workflow even without AI.

Therefore, v1 must prove that Coatly can replace the current Excel/PDF/email/follow-up workflow before adding AI, photo analysis, or automatic damage recognition.

Excel import has a strict v1 boundary: Coatly does not require a complex Excel template before the user can quote. A's existing Excel file is the source document, not something Coatly promises to auto-parse. The primary v1 path is simple in-app price item setup; optional Excel/CSV paste or upload accepts only service/item, unit, price, optional category, and optional customer description.

## Superseded AI-First Assumption

Previous docs framed v1 as **AI Quote Writer**: notes + rough measurements + photos + price rates → polished quote artifact.

That is now deferred. The reason is simple: if a painter is already accurate on-site and already has prices in Excel, the painful part is not "AI must decide the job." The painful part is the disconnected workflow after the painter has already decided what to quote.

AI can still be valuable later, but only as an admin layer:

- write clearer quote descriptions
- turn painter notes into assumptions/exclusions
- draft follow-up messages
- summarize deterministic task lists

AI must not become the v1 purchase reason until the non-AI workflow works.

## v1 Core Workflow

The v1 release path is one loop:

```text
Existing Excel price book
  -> simple in-app price book setup
  -> optional simple Excel/CSV paste or upload
  -> saved Coatly price rates / templates / service items
  -> quote creation
  -> PDF preview
  -> email send
  -> public quote / approval
  -> follow-up due status
  -> invoice conversion
  -> schedule / job conversion
```

## User

| Attribute | Current assumption |
|-----------|--------------------|
| User | Australian painter or painting-adjacent tradie |
| Size | 1–3 person business |
| Current tools | Excel, Word/PDF, email, calendar, manual reminders |
| Quote volume | 2–4 quotes/week in the first observed case |
| Pain | Workflow repetition, disconnected follow-up, manual conversion to invoice/schedule |
| Not the pain yet | AI photo damage recognition, automatic takeoff, AI deciding price |

## Competitive Read (2026-07-12 verified)

2026-07 전수 가격 검증(공식 가격 페이지 교차 확인) 기준, 시장은 4개 진영으로 나뉘며 어느 쪽도 Coatly wedge를 점유하지 못한다:

- **AU 범용 tradie 앱**: ServiceM8(A$0–349/월 flat, 현장앱 iOS 전용), Tradify(A$48–62/user), Fergus(A$53–77/user) — GST/Xero는 되지만 painter 전용 아님, per-user 과금·작업 캡 마찰.
- **AU 헤비급**: Simpro/AroFlo(견적제 + 구현비 A$1,299–US$10k+), Buildxact(A$199+/월), Groundplan(A$99/seat) — 1–3인 업체와 체급 불일치.
- **미국 painter 전용**: PaintScout(US$119/월 flat + 시트 $20), DripJobs(US$97–147), Estimate Rocket(US$139+) — painter 전용 카테고리가 돈이 된다는 증명이나 AUD/GST/Xero/ABN 전무.
- **직접 위협**: QuoteMate(AU painter 전용 A$49/월, AI-first — price-book-first 아님, send→follow-up→invoice 루프 얇음), YourTradebase(£29 flat, UK 전용). 그 외 니치: Sammy, Let's Quote, WonDeal/QuoteChase, BrushQuote류.

Implication: "AI quote generator" is not differentiated enough. Coatly는 **painter-first + AU-first + price-book-first + flat 가격** 조합으로 이긴다 — 범용 앱은 painter-first가, QuoteMate는 price-book-first가, 미국 도구는 AU-first가 될 수 없다. 비교표/검증 근거: [`../../COMMERCIALIZATION.md`](../../COMMERCIALIZATION.md).

## Product Principles

1. **Migrate the real workflow first**
   The first win is moving a painter's existing pricing and quote PDF structure into Coatly with minimal behavior change. v1 uses direct in-app price item setup first; arbitrary Excel auto-import and complex required templates are not the promise.

2. **Painter keeps pricing authority**
   Coatly may calculate from stored rates, but the painter owns the rate, scope, and final total. AI never writes price/rate/GST/total.

3. **Quote send loop matters more than quote generation**
   A quote is not done when it is calculated. It is done when it is sent, followed up, accepted/rejected, and converted into invoice/schedule.

4. **AI waits for a stable manual workflow**
   AI should improve a workflow that already works. It should not hide gaps in pricing setup, PDF rendering, email delivery, or follow-up status.

5. **Photo analysis is later**
   Field judgment is more accurate than photo damage analysis for v1. Photos can become evidence or hints later, not an estimating authority.

## Release Gate

v1 is not ready until all items below pass.

### A Workflow Fixture

- [ ] Receive A's real Excel price sheet.
- [ ] Receive one recent quote PDF/email that A actually sent.
- [ ] Document the current Excel categories, units, markups, service items, and quote presentation.
- [ ] Set up the price items needed for A's selected quote directly in Coatly.
- [ ] Decide what maps to `price_rates`, templates, material/service items, quote line items, and quote scope text.

### Price Book Setup

- [ ] Coatly price setup supports A's item, unit, and price with optional category and customer description.
- [ ] Optional bulk paste/upload flags missing, unsupported, duplicate, or invalid rows before saving.
- [ ] Set up A's price book in Coatly.
- [ ] Record friction points: missing fields, confusing labels, wrong order, repeated inputs, unclear units.
- [ ] Verify quote totals against Excel for the selected fixture.
- [ ] Avoid adding a new pricing source unless the current model cannot represent A's real workflow.

### Quote Recreation

- [ ] Recreate the selected quote in Coatly from scratch.
- [ ] Compare subtotal, GST, total, optional items, notes, assumptions, and exclusions.
- [ ] Verify PDF layout against what A would send to a customer.
- [ ] Confirm quote can be sent by email from the app.

### Follow-up Loop

- [ ] Sent quote status is visible.
- [ ] Public quote link works.
- [ ] Open/view/approval events are recorded where supported.
- [ ] Follow-up due state is visible without relying on the painter's memory.
- [ ] Follow-up copy can be manual/template-based first. AI copy is deferred.

### Conversion Loop

- [ ] Approved quote converts to invoice.
- [ ] Approved quote converts to schedule/job where relevant.
- [ ] Public booking and Google Calendar failure semantics are clear.
- [ ] Invoice email/public PDF path works.

### Release Verification

- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] Public token regression for invalid/expired/revoked/mismatched access
- [ ] Vercel preview smoke
- [ ] Production deployment verification

## Current Work Order

| Order | Work | Notes |
|-------|------|-------|
| 1 | Land DDD module refactor | Must not change user behavior |
| 2 | Reconcile migrations/security | Release blocker before new schema work |
| 3 | Collect A workflow fixture | Excel price sheet + recent quote PDF/email |
| 4 | Run simple price setup | Add A's needed service/unit/price items in Coatly and validate optional bulk input only if useful |
| 5 | Run quote recreation test | Same quote, same total, customer-sendable PDF |
| 6 | Verify send/follow-up loop | Email/public quote/follow-up due/status |
| 7 | Verify invoice/schedule conversion | Approved quote to invoice/job |
| 8 | Release core workflow | Preview + production smoke |
| 9 | Re-open AI admin layer planning | Only after steps 1–8 pass |

## Deferred AI Admin Layer

AI work is paused until the core workflow is released.

When reopened, the order is:

1. **Quote explanation helper**
   Turns user-reviewed scope and line items into customer-facing wording. No pricing authority.

2. **Follow-up Writer**
   Drafts email/SMS copy for quote check-in, booking request, and invoice reminder. No automatic send.

3. **Today summary**
   Summarizes deterministic tasks that already exist in SQL. It does not invent tasks.

4. **Photo hints**
   Attaches visible condition/access/prep hints to a quote. It does not diagnose hidden damage, calculate exact sqm/lm, or create price.

5. **Learning-based pricing suggestions**
   Optional suggestions from historical data. Painter still approves rates and totals.

## Explicitly Not v1 Core

- AI quote automation as purchase reason
- Qwen/Gemini provider work
- streaming AI response
- AI usage limits and cost dashboard
- photo AI
- damage diagnosis
- photo-only takeoff
- automatic scope/pricing from photos
- generic Workspace Assistant
- automatic follow-up send/status changes
- property manager portal
- all-trade maintenance estimating
- supplier integrations
- native app

## Pricing Note

2026-07-12 경쟁 비교 완료 기준 가격 방향: 단일 플랜 **A$39/월 (GST 포함, 업체당 flat, 3인까지, 견적 무제한)** + 30일 무카드 trial. 현재 구현된 Starter A$39/Pro A$59 2단은 폐지하고, Pro(A$59)는 post-core AI 헬퍼가 실제 동작할 때 재도입한다(AI는 문구만, 가격 산출 금지). Founding Painter 최초 20명은 A$29 종신. **최종 확정은 A workflow 재현 후.** 근거/지불의향/비교표: [`../../COMMERCIALIZATION.md`](../../COMMERCIALIZATION.md).

## Documentation Links

- [`../../PLANS.md`](../../PLANS.md) — single progress source
- [`../quote/QUOTE.md`](../quote/QUOTE.md) — quote feature model
- [`../quote/PRICE-BOOK-TEMPLATE.md`](../quote/PRICE-BOOK-TEMPLATE.md) — simple price book setup boundary
- [`AI-ASSISTANT.md`](./AI-ASSISTANT.md) — deferred AI rules
- [`V1-APP-BUILD-PLAN.md`](./V1-APP-BUILD-PLAN.md) — workflow build order before AI
- [`../../../TODOS.md`](../../../TODOS.md) — deferred items
