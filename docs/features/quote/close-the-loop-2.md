# Close the Loop: Quote → Send → Accept → Invoice (Part 2)

*← 앞부분: [`close-the-loop-1.md`](./close-the-loop-1.md)*

---

### Priority 3: Read Receipt (the "aha moment")

- Track when customer opens /q/[id] (first server-side page load, not email open)
- **Implementation: server-side view tracking, not email pixel.** On first load of
  /q/[id], a Next.js server action inserts a row into `quote_views`. Email pixel
  tracking is blocked by Apple Mail Privacy Protection (MPP) — critical because
  iPhones dominate this user segment.

**Supabase `quote_views` table:**
  - `quote_id` uuid FK → quotes.id, **UNIQUE** (one row per quote)
  - `first_viewed_at` timestamptz NOT NULL DEFAULT now()
  - Use `INSERT ... ON CONFLICT (quote_id) DO NOTHING` — atomic, no race condition

**RLS policy:**
  - INSERT: service role only (called from server action with supabase admin client)
  - SELECT: authenticated users where `quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid())`

**Dashboard widget:** "Opened [relative time ago]" or "Not opened yet — follow up?"
  - Static read on page load — not realtime push. Sufficient for v1.

### Priority 4: Quote-to-Invoice in One Click

- From accepted quote: "Create Invoice from Quote" CTA
- Pre-populates: customer_id, invoice line items (from quote rooms/surfaces),
  subtotal_cents, gst_cents, total_cents, default_payment_terms from profile
- Verify these fields are correctly mapped in existing code before assuming it works.
  Check `lib/invoices.ts` and the invoice creation action for any quote_id input path.
- Result: painter reviews pre-filled invoice, adjusts payment terms if needed, sends.

---

## Backlog (Out of Scope for This Sprint)

- **Starter plan limit:** 10 quotes/month may be too restrictive for 10-15 jobs/month.
- **Schedule page:** Replace with a simple "upcoming jobs" list view.
- **Materials/services catalog UX:** Simplify to a "common items" setup screen.
- **Demo mode:** Show a completed quote without requiring signup.
- **AI on Starter:** Move 3 free AI quotes/month to Starter as a Pro trial hook.
- **In-app notifications:** Deferred — email notification on accept is sufficient for v1.

---

## Current Problems (Identified from Codebase)

1. **Email send is untested** — 5 commits of "email test 1-4" with no stable result.
2. **Customer quote acceptance UX unknown** — /q/ route exists but customer-facing
   UX quality is unclear. Is the Accept flow obvious on mobile?
3. **No read receipt** — painter sends quote into a void. This is the "aha moment" missing.
4. **AI gated at Pro ($59/mo)** — the best conversion hook is behind the higher paywall.
5. **Schedule feature instability** — 764-line ScheduleCalendar.tsx was deleted.
6. **Quote limit on Starter** — 10 quotes/month for a painter doing 8-15 jobs/month
   may cause friction at the exact moment they're getting value from the product.

---

## Open Questions

1. Is the /q/ public quote page mobile-optimized and visually professional?
2. Does quote → invoice pre-population already work correctly?
3. What's the current Resend deliverability issue?
4. Has the founder shown the app to any real painters yet?

---

## Success Criteria

1. Painter completes first quote AND sends it to a customer in session 1
2. Customer can open the quote link and click "Accept" on mobile (no login required)
3. Painter sees "Quote opened [time ago]" on dashboard on next page load after customer visits /q/
4. Quote-to-invoice conversion takes < 30 seconds from accepted quote page
5. Email delivery success rate > 95% (measured in Resend dashboard after first 20 sends)

---

## Dependencies

- Resend email deliverability must be confirmed (SPF, DKIM, domain verification)
- /q/ public route must be tested on real mobile devices
- Supabase migration needed for quote_views table

---

## Reviewer Concerns (Acknowledged, Deferred)

1. **HMAC token forwarding risk:** A customer can forward the accept link to a third party.
   For v1 this is acceptable — painting quotes are trust-based. Address in v2 with one-time tokens.

2. **Invoice line-item mapping from quote rooms/surfaces:** Engineer must verify
   actual field mapping in `lib/invoices.ts` before implementing Priority 4.

3. **PDF generation Vercel timeout for large quotes:** Instrument in production first.
   Escalate to background job only if real quotes exceed 8s.

---

## The Assignment

Before building anything new: put Coatly in front of 3 real Australian painters
(friends, tradespeople you know, Facebook groups) and watch them try to create and
send a quote. Don't help them. Don't explain anything. Just watch what breaks.
That 60-minute observation session is worth more than 2 weeks of feature building.
