# Task 1: Rate Source Audit and Canonical Quote Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 기능을 붙이기 전에 quote 가격 출처, subtotal/GST/total 계산, optional add-on, public quote, invoice preset이 모두 같은 규칙으로 동작하게 만든다.

**Architecture:** Task 1은 pricing-first foundation이다. 모든 quote total은 `calculateQuoteTotals()`를 최종 계산기로 통과하고, AI/사진 분석은 가격 필드에 직접 접근하지 않는다. Supabase에는 기존 quote/line item/estimate snapshot 구조를 유지하고, 새 schema는 deterministic duplicate scope guard에 꼭 필요할 때만 별도 검토한다.

**Tech Stack:** Next.js App Router, React, Server Actions, Supabase Postgres/RLS, Vitest, Testing Library.

---

## Parent Plan

- [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md) Task 1에서 참조된다.
- Task 1은 v1 build의 첫 구현 작업이다.
- AI integration, Qwen adapter, photo helper는 Task 1 범위가 아니다.

## Implementation Review (2026-05-17)

**Status:** COMPLETE. Task 1A canonical quote total path와 Task 1B deterministic duplicate priced scope guard가 구현됐고, linked-invoice/rollback edge tests, PDF route regression, full test suite, production build verification까지 통과했다.

### Completed

| Area | Evidence |
|------|----------|
| Canonical calculator | `lib/quotes.ts`에 `calculateQuoteTotals()`가 있고 `composeQuoteTotals()`가 이 함수를 호출한다. Return shape에 `line_items_subtotal_cents`, `subtotal_cents`, `discounted_subtotal_cents`, `gst_cents`, `total_cents`가 포함된다. |
| Calculator tests | `lib/quotes.test.ts`가 selected add-on, unselected optional item, discount clamp, stored line item total snapshot을 테스트한다. |
| Create/update quote pricing helper | `app/actions/quotes.ts`에 `resolveQuotePricingPreviewForSave()`가 있고 create/update quote가 같은 helper output으로 `subtotal_cents`, `gst_cents`, `total_cents`를 저장한다. |
| Optional add-on recalculation | Admin/public optional item selection이 `discount_cents`, `manual_adjustment_cents`를 select하고 `calculateQuoteTotals()`로 다음 total을 만든다. Public failure rollback 코드도 존재한다. |
| Public quote preview | `PublicQuoteClient`가 `discount_cents`, `manual_adjustment_cents`, selected optional add-ons를 `calculateQuoteTotals()`로 다시 계산해 표시한다. |
| Quote-to-invoice presets | `lib/invoice-quote-presets.ts`가 base quote scope line, selected optional add-ons, discounted single parity line, manual adjustment block을 처리한다. |
| Create/update parity | `app/actions/quotes.test.ts`에 같은 day-rate fixture가 create/update에서 동일한 `subtotal_cents`, `gst_cents`, `total_cents`, `pricing_method_inputs`, line item snapshot을 저장하는 회귀 테스트가 있다. |
| Optional linked invoice + rollback | Admin/public optional add-on selection은 linked invoice가 있으면 line item/quote total update를 하지 않는다. Public quote total update 실패 시 original `is_selected`로 rollback한다. |
| Deterministic duplicate scope guard | `lib/quote-pricing-scopes.ts`가 Quick, Advanced interior, manual room, exterior scope keys를 만들고, `pricing_scope_key` + `pricing_role`이 중복 priced scope를 가리키면 create/update payload를 차단한다. Fuzzy free-text overlap은 UI warning만 표시한다. |
| Focused regression | 2026-05-17 실행: `lib/quotes.test.ts app/actions/quotes.test.ts` 43 passed, `lib/invoices.test.ts app/actions/invoices.test.ts` 30 passed, `components/quotes/QuoteForm.test.tsx components/invoices/InvoiceForm.test.tsx` 37 passed, `app/api/pdf/quote/route.test.ts lib/quote-pricing-scopes.test.ts` 5 passed. |
| Full safety verification | 2026-05-17 실행: `npm run test:run` 59 files / 366 tests passed, `npm run build` passed, `npm run lint` passed. |

### Still Needed Before Task 1 Is Complete

| Gap | Why it matters | Suggested implementation |
|-----|----------------|--------------------------|
| None for Task 1 | Task 1 scope is closed for v1 pricing foundation. | Task 2 follow-on work is also complete as of 2026-05-17. Next pricing-related follow-on is Task 4 legacy quote reconstruction and Task 3 AI candidate schema boundary. |

### Recommended Split

Task 1 is now closed as **Task 1A: canonical quote totals and invoice parity** plus **Task 1B: duplicate priced scope guard and final safety verification**. Task 2 rate-boundary hardening is also complete; AI pricing candidates, Qwen adapter, and photo helper now wait for Task 3 quote form structure schema and deterministic candidate review.

## Files

**Modify:**
- `lib/quotes.ts`
- `lib/quote-pricing-scopes.ts`
- `app/actions/quotes.ts`
- `components/quotes/QuoteForm.tsx`
- `components/quotes/public/PublicQuoteClient.tsx`
- `lib/invoices.ts`
- `components/invoices/InvoiceForm.tsx`
- `lib/quotes.test.ts`
- `lib/quote-pricing-scopes.test.ts`
- `app/actions/quotes.test.ts`
- `lib/invoices.test.ts`
- `app/actions/invoices.test.ts`
- `components/quotes/QuoteForm.test.tsx`
- `components/invoices/InvoiceForm.test.tsx`

**Read:**
- `components/quotes/LineItemsSection.tsx`
- `components/quotes/QuoteExtraLineItems.tsx`
- `supabase/migrations/014_quote_estimate_items_and_context.sql`
- `supabase/migrations/018_pricing_methods.sql`
- `supabase/migrations/019_material_items_and_quote_line_items.sql`
- `supabase/migrations/024_quote_optional_line_items.sql`
- `supabase/migrations/041_detailed_quick_estimate.sql`
- `supabase/migrations/042_allow_quick_estimate_items.sql`

## Original Findings and Current Status

| Finding | 2026-05-17 status |
|---------|-------------------|
| `lib/quotes.ts` had `composeQuoteTotals()` but did not expose `discounted_subtotal_cents` under an explicit canonical name | Fixed. `calculateQuoteTotals()` exists and `composeQuoteTotals()` delegates to it |
| `createQuote()` and `updateQuote()` repeated pricing-method resolution logic | Fixed. `resolveQuotePricingPreviewForSave()` centralizes the logic and a same-fixture create/update parity test proves identical saved totals |
| Optional add-on selection recalculated GST/total manually and did not include `discount_cents` | Fixed in code. Admin/public optional selection selects discount/manual adjustment and uses `calculateQuoteTotals()` |
| Public quote preview recalculated totals locally without discount/manual adjustment parity | Fixed in code. Public quote detail select and client preview include discount/manual adjustment |
| Quote-to-invoice defaults could miss base quote scope or mishandle add-ons | Fixed for presets. Base quote scope, selected optional add-ons, discount parity line, and manual adjustment block are implemented |
| Reliable duplicate-priced-scope blocking cannot depend only on free-text line item names | Fixed for v1 payload validation. `lib/quote-pricing-scopes.ts` blocks structured duplicate `pricing_scope_key` rows and warns, but does not block, fuzzy free-text overlaps |

## Canonical Money Contract

| Field | Meaning | Rule |
|-------|---------|------|
| `base_subtotal_cents` | priced scope before add-ons, ex-GST | Comes from exactly one pricing method: manual rooms, interior estimate, exterior estimate, detailed quick, room rate, day rate, or manual direct entry |
| `line_items_subtotal_cents` | selected add-ons, ex-GST | Sum only `quote_line_items` where `is_optional = false` or `is_selected = true` |
| `subtotal_cents` | quoted ex-GST amount before discount | `base_subtotal_cents + line_items_subtotal_cents` |
| `discount_cents` | quote-level discount, ex-GST | Clamped to `0..subtotal_cents`; never makes subtotal negative |
| `discounted_subtotal_cents` | taxable subtotal after discount | `max(0, subtotal_cents - discount_cents)` |
| `gst_cents` | GST | `round(discounted_subtotal_cents * 0.10)` |
| `manual_adjustment_cents` | manual quote adjustment | Existing quote behavior keeps this outside GST. Task 1 must test and document this; changing it to taxable requires a separate invoice/GST decision |
| `total_cents` | final quote total | `max(0, discounted_subtotal_cents + gst_cents + manual_adjustment_cents)` |
| `deposit_cents` | display-only deposit | `round(total_cents * deposit_percent / 100)`; never stored as a replacement for total |

## Supabase Data Contract For Task 1

| Table/field | Task 1 rule |
|-------------|-------------|
| `quotes.subtotal_cents` | Store canonical `subtotal_cents` before discount, ex-GST |
| `quotes.gst_cents` | Store GST from `discounted_subtotal_cents` |
| `quotes.total_cents` | Store canonical `total_cents` |
| `quotes.discount_cents` | Must be selected anywhere totals are recalculated |
| `quotes.manual_adjustment_cents` | Must be selected anywhere totals are recalculated |
| `quotes.pricing_method` / `pricing_method_inputs` | Keep as the saved audit snapshot for method-specific inputs |
| `quotes.estimate_context` / `pricing_snapshot` | Keep as the saved audit snapshot for interior/exterior estimate inputs and rate snapshot |
| `quote_estimate_items.total_cents` | Method detail rows only; never added again if already included in `base_subtotal_cents` |
| `quote_line_items.total_cents` | Add-on/service/material rows only; optional unselected rows are excluded from totals |
| `quote_line_items.pricing_scope_key` / `pricing_role` | Not persisted in v1. These optional payload fields are validated before save to block duplicate priced scope rows, then omitted from existing DB inserts. A future Task 3 schema can persist them if scope tables are introduced. |
| Supabase migration | No new migration should be required for canonical totals. If implementation proves a persisted scope key is required, stop and add that as a separate reviewed schema task instead of silently overloading existing columns |

## Authoritative Price Source Map

| Pricing path | Base subtotal source | Add-on source | Snapshot that must stay stable after save |
|--------------|----------------------|---------------|------------------------------------------|
| Manual room/surface estimate (`sqm_rate` / `hybrid` rooms) | `quote_room_surfaces.total_cents` rolled into `quote_rooms.total_cents`, then quote base subtotal | `quote_line_items` selected rows | `quote_room_surfaces.area_m2`, `rate_per_m2_cents`, `coating_type`, `quote_rooms` dimensions |
| Interior advanced estimate | `calculateInteriorEstimate()` result saved through `quote_estimate_items` and `quotes.estimate_context` | `quote_line_items` selected rows | `quotes.estimate_context`, `quotes.pricing_snapshot`, `quote_estimate_items.unit_price_cents`, `total_cents`, source rate metadata |
| Exterior estimate | `calculateExteriorEstimate()` result saved through `quote_estimate_items` and `quotes.estimate_context` | `quote_line_items` selected rows | `quotes.estimate_context`, `quotes.pricing_snapshot`, custom exterior surface labels/rates |
| Detailed quick estimate | `calculateQuickEstimate()` result saved as `quote_estimate_items.category = 'quick_estimate'` | `quote_line_items` selected rows | `pricing_method_inputs.inputs.rooms`, room size, selected surfaces, coating/condition multipliers, source rate item id/version/label |
| Room rate | `calculateRoomRateQuote()` from `pricing_method_inputs.inputs.rooms` | `quote_line_items` selected rows | room name/type/size/rate in `pricing_method_inputs` |
| Day rate | `calculateDayRateQuote()` from days, daily rate, material method | `quote_line_items` selected rows | days, daily rate, material percent/flat in `pricing_method_inputs` |
| Manual direct entry | `calculateManualQuote()` from labor/material cents | `quote_line_items` selected rows | labor/material cents in `pricing_method_inputs` |

## Implementation Tasks

- [x] **Step 1: Write calculator tests before changing implementation**

  In `lib/quotes.test.ts`, add direct tests for the canonical money contract:

  - Base A$1,000 + selected add-on A$200 + unselected optional A$300 + discount A$100 + adjustment A$50 = subtotal A$1,200, discounted subtotal A$1,100, GST A$110, total A$1,260.
  - Discount larger than subtotal clamps `discounted_subtotal_cents`, `gst_cents`, and `total_cents` to non-negative values.
  - Optional line item with `is_optional: true` and `is_selected: false` is excluded even when `total_cents` is present.
  - Stored line item `total_cents` wins over recomputing `quantity * unit_price_cents`, because saved quote rows are snapshots.

  **Implementation review:** Done. `lib/quotes.test.ts` covers canonical totals, discount clamp, unselected optional exclusion, and stored line item total snapshot.

- [x] **Step 2: Make `calculateQuoteTotals()` the canonical calculator**

  In `lib/quotes.ts`, add `calculateQuoteTotals()` and make `composeQuoteTotals()` call it for backwards compatibility during the refactor. Required return shape:

  ```ts
  {
    line_items_subtotal_cents: number;
    subtotal_cents: number;
    discounted_subtotal_cents: number;
    gst_cents: number;
    total_cents: number;
  }
  ```

  The function must accept `base_subtotal_cents`, `line_items`, `discount_cents`, and `manual_adjustment_cents`/`adjustment_cents`. All total-producing code in Task 1 must call this function instead of hand-writing subtotal/GST math.

  **Implementation review:** Done. `calculateQuoteTotals()` returns the required shape and `composeQuoteTotals()` delegates to it for backwards compatibility.

- [x] **Step 3: Normalize one server-side quote preview resolver**

  In `app/actions/quotes.ts`, extract the repeated create/update pricing logic into one internal helper, for example `resolveQuotePricingPreviewForSave()`. It must:

  - Resolve exactly one base subtotal path for `day_rate`, `detailed_quick`, `room_rate`, `manual`, exterior estimate, interior estimate, or room/surface estimate.
  - Return `resolvedPricingInputs`, `estimate_category`, `estimate_context`, `pricing_snapshot`, `rooms`, `estimate_items`, `base_subtotal_cents`, and canonical totals.
  - Call `calculateQuoteTotals()` once after the base subtotal is known.
  - Keep AI and photo analysis out of the calculation path.

  **Implementation review:** Done. `resolveQuotePricingPreviewForSave()` centralizes save preview resolution, both create/update consume it, and same-fixture parity coverage is in `app/actions/quotes.test.ts`.

- [x] **Step 4: Replace create/update quote total writes**

  In both quote create and quote update flows:

  - Use the helper from Step 3.
  - Save only the helper's `subtotal_cents`, `gst_cents`, and `total_cents` to `quotes`.
  - Keep relation inserts (`quote_rooms`, `quote_room_surfaces`, `quote_estimate_items`, `quote_line_items`) as detail snapshots, not separate total authorities.
  - Add tests in `app/actions/quotes.test.ts` proving create and update produce identical totals for the same input.

  **Implementation review:** Done. Create/update writes use helper totals, and `app/actions/quotes.test.ts` proves the same fixture produces identical saved totals and line item snapshots.

- [x] **Step 5: Fix optional add-on selection recalculation**

  In `setQuoteOptionalLineItemSelection()` and `setPublicQuoteOptionalLineItemSelection()`:

  - Select `discount_cents` and `manual_adjustment_cents` with the quote.
  - Derive `base_subtotal_cents` by subtracting the currently selected line item subtotal from stored `quotes.subtotal_cents`.
  - Recalculate the next totals with `calculateQuoteTotals()`.
  - Preserve the current rollback behavior when the public update fails.
  - Add tests for admin/public optional selection with discount present, unselected optional item present, and linked invoice lock present.

  **Implementation review:** Done. Admin/public optional selection recalculation uses `calculateQuoteTotals()` with discount/manual adjustment fields. Tests cover linked-invoice lock for admin/public and public rollback when quote total update fails.

- [x] **Step 6: Update quote UI preview to match the server contract**

  In `components/quotes/QuoteForm.tsx`:

  - Use `calculateQuoteTotals()`/`composeQuoteTotals()` return values for the preview.
  - Show the breakdown in this order: base scope, selected add-ons, subtotal, discount, GST, manual adjustment if present, total.
  - Keep optional add-ons visually separate and label them as excluded until selected.
  - Ensure Quick and Advanced previews do not add the same scope twice when extra line items are entered.
  - Add `components/quotes/QuoteForm.test.tsx` coverage for displayed total parity with server test fixtures.

  **Implementation review:** Done. `QuoteForm` uses `composeQuoteTotals()`, optional add-ons remain excluded until selected, a canonical day-rate fixture test compares UI totals with `calculateQuoteTotals()`, and fuzzy duplicate scope names show a warning instead of blocking.

- [x] **Step 7: Update public quote total preview**

  In `lib/quotes.ts`, `app/actions/quotes.ts`, and `components/quotes/public/PublicQuoteClient.tsx`:

  - Include `discount_cents` and `manual_adjustment_cents` in public quote detail mapping.
  - Use the canonical calculator for local optional add-on toggles.
  - Show discount and adjustment rows only when non-zero.
  - Ensure the public approval total matches the stored quote total after the server action returns.

  **Implementation review:** Done for public quote display and public optional selection recalculation. Covered by `PublicQuoteClient.test.tsx` and public optional selection action tests.

- [x] **Step 8: Harden quote-to-invoice defaults**

  In `lib/invoices.ts` and `components/invoices/InvoiceForm.tsx`:

  - Include a base quote scope invoice line when a quote's base subtotal is not represented by copied `quote_line_items`.
  - Include only selected optional add-ons.
  - For discounted or manually adjusted quotes, either generate a parity-safe single quote line or block invoice preset creation with a clear message until invoice adjustment support exists. Do not silently create an invoice total that differs from the approved quote.
  - Add `lib/invoices.test.ts`, `app/actions/invoices.test.ts`, and `components/invoices/InvoiceForm.test.tsx` coverage for full invoice, deposit invoice, progress invoice, selected optional add-on, unselected optional add-on, discount, and manual adjustment.

  **Implementation review:** Done. `buildQuoteInvoicePresetLines()` creates base scope lines, includes selected optional add-ons only, uses a discounted parity-safe single line, and blocks manual adjustments with a clear error. Covered by invoice library, action, and form tests.

- [x] **Step 9: Add deterministic duplicate priced scope guard**

  In `lib/quotes.ts` and `lib/supabase/validators.ts` if needed:

  - Build priced scope keys from structured inputs, not AI text. Examples: `interior:room:<room_key>:walls`, `interior:room:<room_key>:ceiling`, `interior:room:<room_key>:trim`, `quick:<room_id>:walls`, `quick:<room_id>:ceiling`, `quick:<room_id>:trim`, `exterior:<surface_key>`.
  - Block duplicates when a structured line item or mapped saved service clearly targets a priced scope already included in the selected pricing method.
  - For fuzzy free-text overlaps, show a UI warning instead of blocking. Example: custom line item name "Living room walls" should warn if living room walls are already included, but it should not block unless the source key is deterministic.
  - Add tests showing duplicate walls/ceiling/trim are blocked or downgraded to non-priced scope, while legitimate add-ons like wallpaper removal, patch repair, travel, scaffold, and premium paint upgrade remain allowed.

  **Implementation review:** Done. `lib/quote-pricing-scopes.ts` builds Quick, Advanced interior, manual room, and exterior keys; create/update actions block duplicate `priced_scope` line items; `QuoteForm` warns for fuzzy free-text overlaps. No Supabase migration was introduced.

- [x] **Step 10: Run focused regression tests**

  Required commands before marking Task 1 complete:

  ```bash
  npm run test:run -- lib/quotes.test.ts app/actions/quotes.test.ts
  npm run test:run -- lib/invoices.test.ts app/actions/invoices.test.ts
  npm run test:run -- components/quotes/QuoteForm.test.tsx components/invoices/InvoiceForm.test.tsx
  ```

  If quote PDF/public tests are affected, also run:

  ```bash
  npm run test:run -- app/api/pdf/quote/route.test.ts
  ```

  **Verification run (2026-05-17):** quote action/library tests 43 passed, invoice action/library tests 30 passed, quote/invoice form tests 37 passed, PDF route + pricing scope tests 5 passed.

- [x] **Step 11: Run full safety verification**

  Before Task 1 is considered complete:

  ```bash
  npm run test:run
  npm run build
  ```

  Completion criteria:

  - Create quote, edit quote, optional add-on selection, public optional add-on selection, public approval, PDF quote display, and invoice preset generation all explain the same total.
  - No code path writes `subtotal_cents`, `gst_cents`, or `total_cents` without going through `calculateQuoteTotals()` or an explicitly documented invoice-only calculator.
  - No Supabase schema migration is introduced unless the duplicate-scope guard cannot be made deterministic with existing data.
  - AI still has no access to write quote prices.

  **Verification run (2026-05-17):** `npm run test:run` passed 59 files / 366 tests, `npm run build` passed, and `npm run lint` passed.
