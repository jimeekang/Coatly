---
name: resend-document-email
owner: codex
description: Use when adding, testing, or modifying Coatly customer document emails through Resend, including quote approval links, invoice emails, PDF attachments, customer recipient selection, and related environment setup.
---

# Resend Document Email (Codex)

> **Codex (high) 전용.** 구현/이메일 연동/env 작업. 기획·디자인 결정은 Claude(Opus 4.8·extra) 영역.

Use this skill for Coatly workflows that email customer-facing documents through Resend.

## Project Contract

- Resend code lives in `lib/email/resend.ts`.
- Quote send flows must email the selected customer address, include the public approval link (`/q/{public_share_token}`), and attach the generated quote PDF.
- Invoice send flows must email the invoice customer's saved email and attach the generated invoice PDF.
- Use `RESEND_API_KEY` for server-side sending and `RESEND_FROM_ADDRESS` for the verified sender.
- ⚠️ 검증된 발신자(`RESEND_FROM_ADDRESS`)가 아직 설정되지 않은 상태다 (런칭 P0 blocker — [`docs/LAUNCH-READINESS.md`](../../docs/LAUNCH-READINESS.md)). customer launch 전까지는 `@resend.dev` sandbox + `RESEND_TEST_RECIPIENT` 경로만 사용하고, 검증된 sender domain 확보 후 전제로 삼는다.
- Do not expose API keys in logs, UI, tests, screenshots, or final responses.

## Implementation Steps

1. Check `.env.local` for `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, and `NEXT_PUBLIC_APP_URL` without printing secret values.
2. Keep all Resend client creation server-only.
3. Generate PDFs server-side with `@react-pdf/renderer` and the existing `QuoteTemplate` / `InvoiceTemplate`.
4. Attach PDFs via Resend `attachments` using `Buffer` content and `application/pdf`.
5. For quote emails, use the public token URL for approval, not an authenticated dashboard URL.
6. For invoice emails, avoid relying on authenticated PDF links for customer access; attach the PDF.
7. Mark documents as sent only after the send path succeeds, or clearly preserve existing app behavior if changing that would broaden scope.

## Verification

- Run focused tests for `modules/quotes/application/actions.test.ts`, `modules/invoices/application/actions.test.ts`, and `lib/email/resend.test.ts` coverage if present.
- Run `npm run lint` or a targeted lint pass on touched files.
- If network access is available, verify Resend credentials with a non-secret API call before sending live mail.
- Send a live test only to an approved internal/test recipient.

## Failure Handling

- Missing API key: return a clear setup error and add/update example env vars.
- Resend API error: return the Resend message to the action caller without leaking secrets.
- Missing customer email: block the send and ask the user to add/select a customer email.
- Missing quote public token: do not send an approval email until the token path is fixed.
