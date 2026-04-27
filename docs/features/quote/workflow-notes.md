# Customer → Quote → Invoice Workflow Notes

*Date: 2026-04-22*

## What changed

- Fixed the customer workflow handoff so `+ New Quote` from CustomerDetail now preselects the customer on quotes/new.
- Fixed the customer workflow handoff so `+ New Invoice` from CustomerDetail now preselects the customer on invoices/new.
- Preserved the preselected customer inside QuoteCreateScreen even before AI/template input is applied.
- Preserved the preselected customer inside InvoiceCreateScreen when opening a blank invoice draft from a customer.
- Fixed a quote duplication typing issue in `app/actions/quotes.ts` by normalizing nullable `pricing_method` before insert.

## Workflow status

The main business flow already exists in the app:

1. Create customer
2. Create quote
3. Open quote PDF
4. Send quote email
5. Convert approved quote into invoice
6. Send invoice email
7. Mark invoice as paid

The bug fixed in this pass was the broken customer-to-quote / customer-to-invoice handoff.

## Verification

- Passed: QuoteCreateScreen.test.tsx, InvoiceCreateScreen.test.tsx, quotes.test.ts, invoices.test.ts
- Added regression tests for customer preselection

## Remaining blockers (as of 2026-04-22)

`npx tsc --noEmit` still fails, but only in existing `jobs/schedule` work outside this workflow scope:
- `app/(dashboard)/schedule/page.tsx`
- `app/demo/schedule/page.tsx`
- `app/actions/jobs.ts`

→ Jobs/Schedule type errors were resolved in the 2026-04-25 critical audit. See [`audit/critical-1.md`](../audit/critical-1.md).
