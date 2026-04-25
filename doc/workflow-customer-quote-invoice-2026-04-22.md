# Customer → Quote → Invoice Workflow Update

Date: 2026-04-22

## What changed

- Fixed the customer workflow handoff so `+ New Quote` from [CustomerDetail.tsx](/Users/jimee/Desktop/Project/Coatly/components/customers/CustomerDetail.tsx) now preselects the customer on [quotes/new](/Users/jimee/Desktop/Project/Coatly/app/(dashboard)/quotes/new/page.tsx).
- Fixed the customer workflow handoff so `+ New Invoice` from [CustomerDetail.tsx](/Users/jimee/Desktop/Project/Coatly/components/customers/CustomerDetail.tsx) now preselects the customer on [invoices/new](/Users/jimee/Desktop/Project/Coatly/app/(dashboard)/invoices/new/page.tsx).
- Preserved the preselected customer inside [QuoteCreateScreen.tsx](/Users/jimee/Desktop/Project/Coatly/components/quotes/QuoteCreateScreen.tsx) even before AI/template input is applied.
- Preserved the preselected customer inside [InvoiceCreateScreen.tsx](/Users/jimee/Desktop/Project/Coatly/components/invoices/InvoiceCreateScreen.tsx) when opening a blank invoice draft from a customer.
- Fixed a quote duplication typing issue in [app/actions/quotes.ts](/Users/jimee/Desktop/Project/Coatly/app/actions/quotes.ts) by normalizing nullable `pricing_method` before insert.

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

- Passed:
  `npx vitest run components/quotes/QuoteCreateScreen.test.tsx components/invoices/InvoiceCreateScreen.test.tsx app/actions/quotes.test.ts app/actions/invoices.test.ts components/quotes/QuoteForm.test.tsx components/invoices/InvoiceForm.test.tsx`
- Passed:
  `npx eslint 'app/(dashboard)/quotes/new/page.tsx' 'app/(dashboard)/invoices/new/page.tsx' components/quotes/QuoteCreateScreen.tsx components/invoices/InvoiceCreateScreen.tsx components/quotes/QuoteCreateScreen.test.tsx components/invoices/InvoiceCreateScreen.test.tsx app/actions/quotes.ts`
- Added regression tests:
  [QuoteCreateScreen.test.tsx](/Users/jimee/Desktop/Project/Coatly/components/quotes/QuoteCreateScreen.test.tsx)
  [InvoiceCreateScreen.test.tsx](/Users/jimee/Desktop/Project/Coatly/components/invoices/InvoiceCreateScreen.test.tsx)

## Remaining blockers

`npx tsc --noEmit` still fails, but only in existing `jobs/schedule` work outside this workflow scope:

- [app/(dashboard)/schedule/page.tsx](/Users/jimee/Desktop/Project/Coatly/app/(dashboard)/schedule/page.tsx)
- [app/demo/schedule/page.tsx](/Users/jimee/Desktop/Project/Coatly/app/demo/schedule/page.tsx)
- [app/actions/jobs.ts](/Users/jimee/Desktop/Project/Coatly/app/actions/jobs.ts)
