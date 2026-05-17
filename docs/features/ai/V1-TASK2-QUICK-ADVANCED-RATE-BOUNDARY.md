# Task 2: Quick and Advanced Rate Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` when implementing this plan. Follow the checklist in order and do not start AI pricing candidates until the blocking items in this file are complete.

**Goal:** Quick estimate와 Advanced detailed estimate가 서로 다른 pricing boundary를 갖도록 고정하고, rate 변경 이후에도 기존 quote 금액이 흔들리지 않게 만든다.

**Architecture:** Quick은 `room template + size + selected surfaces + coating/condition multiplier` snapshot이다. Advanced는 `room anchor + explicit door/window/skirting/trim quantities` snapshot이다. 둘 다 quote subtotal을 직접 쓰지 않고 canonical quote total path로 들어간다.

**Tech Stack:** Next.js App Router, React, Server Actions, Supabase Postgres JSONB rate settings, Vitest, Testing Library.

---

## Parent Plan

- Parent build plan: [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md)
- Task 1 dependency: [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md)
- Quote boundary reference: [QUOTE.md](../quote/QUOTE.md)

## Status

**Status:** PARTIAL as of 2026-05-17.

Task 2의 기반 구조는 이미 일부 구현되어 있다. Quick estimate schema, Quick settings UI, Quick quote snapshot helpers, Advanced room item library, Advanced quote form snapshot fields는 존재한다. 하지만 duplicate priced scope guard, Advanced numeric snapshot immutability, setup warning, and quote-level stale-rate A/B tests가 아직 완료되지 않았다.

## Current Implementation Audit

| Area | Current state | Evidence | Status |
|------|---------------|----------|--------|
| Quick rate schema | `quick_estimate.rooms`, size matrix, enabled surfaces, coating/condition multipliers가 `UserRateSettings`에 있음 | `lib/rate-settings.ts` | Done |
| Quick settings UI | Price Rates의 `Detailed Quick` tab에서 room templates, small/medium/large, walls/ceiling/trim 가격을 편집함 | `components/rates/QuickEstimateTab.tsx` | Done |
| Quick room versioning | Quick room edit 시 `version`을 증가시킴 | `QuickEstimateTab.handleRoomUpdate()` | Done |
| Quick quote snapshot fields | selected room에 source id/version/label, snapshot version, size, surfaces, cents, multipliers, total을 넣음 | `components/quotes/QuickEstimateBuilder.tsx`, `types/quote.ts` | Done |
| Quick calculator snapshot behavior | source snapshot room은 현재 Price Rates template 가격이 바뀌어도 저장된 cents/multipliers로 계산됨 | `utils/calculations.ts`, `utils/calculations.test.ts` | Done for unit level |
| Quick save rows | `quote_estimate_items`를 insert함 | `app/actions/quotes.ts` | Partial |
| Quick row metadata completeness | row metadata가 `room_id`, global coating/condition만 저장함. source version/label/snapshot cents가 metadata에 없음 | `buildQuickEstimateItemRows()` | Missing |
| Advanced room item schema | `detailed_estimate_items.advanced_rooms`가 source item library로 존재함 | `lib/rate-settings.ts` | Done |
| Advanced room item UI | Price Rates 안에서 Advanced Room Items를 추가/수정/삭제함 | `components/rates/PriceRatesForm.tsx` | Done |
| Advanced quote builder source fields | library item을 quote room으로 복사할 때 source id/version/label, snapshot version을 넣음 | `components/quotes/InteriorEstimateBuilder.tsx`, `components/quotes/QuoteForm.test.tsx` | Done |
| Advanced per-room surface toggle | room별 walls/ceiling/trim toggle이 있음 | `InteriorEstimateBuilder` | Done |
| Advanced numeric snapshot | 저장 필드는 있으나 계산 엔진이 current `userRates.detailed_estimate_anchors`를 다시 참조함 | `lib/interior-estimates.ts` | Missing |
| Advanced all-surface validation | room의 walls/ceiling/trim이 모두 false일 때 global scope로 fallback될 수 있음 | `calculateSpecificAreasEstimate()` | Missing |
| Duplicate priced scope guard | quick/advanced estimate item과 custom line item이 같은 scope를 중복 계산하는 것을 막지 못함 | Task 1B dependency | Missing |
| Setup warnings | Quick은 room template이 0개일 때만 경고함. zero/missing rate warning은 없음 | `QuickEstimateBuilder` | Missing |
| Stale-rate end-to-end tests | Quick calculator unit tests는 있으나 create/edit/detail/PDF/invoice 흐름의 quote A/B stale-rate test는 없음 | test suite | Missing |

## Boundary Contract

### Quick Estimate Contract

Quick estimate는 현장 빠른 견적용이다. 방 하나는 다음 필드를 quote save payload에 보존해야 한다.

| Field | Required | Meaning |
|-------|----------|---------|
| `room_id` | yes | selected room instance/template id |
| `source_rate_item_id` | yes for template rooms | Price Rates template id |
| `source_rate_item_version` | yes for template rooms | template edit version |
| `source_rate_item_label` | yes for template rooms | template label at quote creation time |
| `rate_snapshot_version` | yes | snapshot schema version |
| `label` | yes | customer/user visible room label |
| `size` | yes | `small`, `medium`, or `large` |
| `selected_surfaces` | yes | priced surfaces: `walls`, `ceiling`, `trim` |
| `walls_cents` | yes | stored wall price for selected size |
| `ceiling_cents` | yes | stored ceiling price for selected size |
| `trim_cents` | yes | stored trim price for selected size |
| `coating_multiplier_pct` | yes | selected coating multiplier at quote time |
| `condition_multiplier_pct` | yes | selected condition multiplier at quote time |
| `total_cents` | yes | room total before quote-level GST |
| `notes` | optional | per-room note |

Quick estimate must use the stored cents and multipliers for existing quotes. It must not re-read a modified Price Rates room template to recalculate an old quote.

### Advanced Estimate Contract

Advanced estimate는 상세 견적용이다. 방 anchor와 explicit unit items는 서로 다른 priced source다.

| Source | Meaning | Stored as | Rule |
|--------|---------|-----------|------|
| Room anchor | room-level walls/ceiling/trim estimate | `estimate_context.rooms`, `quote_estimate_items` category `room_anchor` | included surfaces must be explicit |
| Door item | per-door unit price | `estimate_context.opening_items`, `quote_estimate_items` category `door` | only priced when explicit door item exists |
| Window item | per-window unit price | `estimate_context.opening_items`, `quote_estimate_items` category `window` | only priced when explicit window item exists |
| Skirting/trim item | per-lm trim price | `estimate_context.trim_items`, `quote_estimate_items` category `trim` | cannot overlap with room `include_trim` for same room |
| Custom/add-on | material/service/custom row | `quote_line_items` | cannot duplicate an already priced structured scope |

Advanced room source id/version/label is already stored, but numeric anchor prices are not frozen yet. Task 2 must add numeric snapshot behavior so existing quotes do not change when `detailed_estimate_anchors` changes later.

## Required Implementation

### Step 0: Finish Task 1B Prerequisite

- [ ] Implement or reuse a structured priced scope key validator before completing Task 2.
- [ ] The validator must run in quote create and quote update.
- [ ] It must protect `quote_estimate_items` and `quote_line_items` from pricing the same scope twice.
- [ ] Keep the validator independent from UI labels. Use structured keys, not string matching.

Recommended file:

- `lib/quote-pricing-scopes.ts`

Recommended API:

```ts
type PricedScopeKey =
  | `quick:${string}:${'walls' | 'ceiling' | 'trim'}`
  | `advanced:room:${number}:${'walls' | 'ceiling' | 'trim'}`
  | `advanced:opening:${number | 'global'}:${'door' | 'window'}:${string}`
  | `advanced:trim:${number | 'global'}:${string}`
  | `line-item:${string}`;

export function buildPricedScopeKeys(input: QuotePricingScopeInput): PricedScopeKey[];
export function findDuplicatePricedScopes(input: QuotePricingScopeInput): DuplicatePricedScopeIssue[];
```

### Step 1: Add Task 2 Failing Tests First

- [ ] `utils/calculations.test.ts`: keep existing Quick snapshot tests and add an explicit quote A/B fixture:
  - quote A uses template version 1 with stored cents.
  - Price Rates changes template to version 2.
  - quote A still returns version 1 total.
  - new quote B uses version 2 total.
- [ ] `app/actions/quotes.test.ts`: Quick `quote_estimate_items.metadata` includes source id/version/label, snapshot version, per-surface cents, and selected surfaces.
- [ ] `lib/interior-estimates.test.ts`: Advanced room source snapshot keeps old anchor total after `detailed_estimate_anchors` changes.
- [ ] `lib/interior-estimates.test.ts`: room with all `include_walls`, `include_ceiling`, and `include_trim` false is invalid and must not fallback to global scope.
- [ ] `app/actions/quotes.test.ts`: room `include_trim` plus explicit `trim_items` for the same room is blocked.
- [ ] `components/rates/PriceRatesForm.test.tsx`: Quick and Advanced setup warnings render for zero/missing required rates.
- [ ] `components/quotes/QuoteForm.test.tsx`: quote submit is blocked or warning-gated when selected Quick/Advanced source resolves to A$0 unintentionally.

### Step 2: Add Rate Setup Diagnostics

Create a shared diagnostics helper so Price Rates setup and Quote Builder warnings use the same rules.

Recommended file:

- `lib/rate-setup-diagnostics.ts`

Recommended types:

```ts
export type RateSetupIssue = {
  area: 'quick' | 'advanced';
  severity: 'warning' | 'blocking';
  code:
    | 'missing_quick_rooms'
    | 'zero_quick_surface_price'
    | 'missing_advanced_room_items'
    | 'missing_advanced_anchor'
    | 'zero_advanced_anchor'
    | 'zero_door_unit_rate'
    | 'zero_window_unit_rate';
  message: string;
  source_id?: string;
  source_label?: string;
};

export function getQuickEstimateSetupIssues(settings: UserRateSettings): RateSetupIssue[];
export function getAdvancedEstimateSetupIssues(settings: UserRateSettings): RateSetupIssue[];
```

Rules:

- Quick room template count `0` is blocking.
- Quick enabled surface with `0` price is warning inside Price Rates and blocking when that exact source is selected for a quote.
- Coating/condition multipliers must be non-negative. Baseline locked values stay 100.
- Advanced room item count `0` is warning in Price Rates because painters can still manually add rooms.
- Advanced item pointing to a missing anchor is blocking when selected.
- Advanced anchor median `0` is warning in Price Rates and blocking when selected.
- Door/window unit rate `0` is warning in Price Rates and blocking when that explicit item is selected.

### Step 3: Update Price Rates UI

Modify:

- `components/rates/PriceRatesForm.tsx`
- `components/rates/QuickEstimateTab.tsx`

Required behavior:

- [ ] Quick section shows setup status summary:
  - configured room count
  - zero priced surface count
  - last unsaved edits status
- [ ] Advanced section shows setup status summary:
  - advanced room item count
  - missing/zero anchor count
  - zero door/window unit rate count
- [ ] Quick and Advanced warnings use `lib/rate-setup-diagnostics.ts`.
- [ ] The UI must not hide zero prices. Zero can be saved, but quote generation must force the painter to notice before using it.
- [ ] Average property / entire-property anchor settings must remain separate from Advanced room item library. The user should not confuse "whole apartment/house anchor" with "Bedroom repaint item".

### Step 4: Complete Quick Snapshot Save Metadata

Modify:

- `app/actions/quotes.ts`
- `types/quote.ts` only if the current `SelectedQuickRoom` type needs expansion
- `app/actions/quotes.test.ts`

Required behavior:

- [ ] `pricing_method_inputs.inputs.rooms[]` keeps the complete Quick snapshot.
- [ ] `quote_estimate_items.metadata` also includes:
  - `source_rate_item_id`
  - `source_rate_item_version`
  - `source_rate_item_label`
  - `rate_snapshot_version`
  - `walls_cents`
  - `ceiling_cents`
  - `trim_cents`
  - `selected_surfaces`
  - `coating_multiplier_pct`
  - `condition_multiplier_pct`
- [ ] `buildQuickEstimateItemRows()` is the only place that maps Quick rooms to estimate rows.
- [ ] Existing quotes without these metadata fields must still render.
- [ ] Create and update paths must insert the same Quick estimate item shape.

Current gap:

`buildQuickEstimateItemRows()` currently stores only `room_id`, `global_coating`, and `global_condition` in metadata. That is not enough for debugging or PDF/detail reconstruction when a room template changes later.

### Step 5: Complete Advanced Numeric Snapshot

Modify:

- `lib/interior-estimates.ts`
- `components/quotes/InteriorEstimateBuilder.tsx`
- `components/quotes/QuoteForm.tsx`
- `app/actions/quotes.ts`
- `lib/interior-estimates.test.ts`
- `components/quotes/QuoteForm.test.tsx`

Required behavior:

- [ ] When a library room item is selected, store numeric source anchor data in the quote payload:
  - `source_anchor_range_cents.min`
  - `source_anchor_range_cents.median`
  - `source_anchor_range_cents.max`
  - `source_surface_rate_multiplier`
  - `source_scope_multiplier` if already resolved
  - `source_condition`
  - `source_wall_paint_system`
- [ ] Existing quote calculation uses stored source anchor data when `rate_snapshot_version === 1`.
- [ ] New quote calculation uses current `UserRateSettings`.
- [ ] Manual rooms without `source_rate_item_id` may still use current anchors at creation time, but must be converted into a snapshot before save.
- [ ] `pricing_snapshot` and `quote_estimate_items.metadata` include enough source fields to debug the total later.

Implementation note:

Do not rely only on `source_rate_item_id` and `source_rate_item_version`. Those identify the source item but do not freeze the numeric anchor. If `detailed_estimate_anchors.interior_rooms['Bedroom 1'].median` changes, an old quote must still display its old total.

### Step 6: Block Invalid Advanced Surface States

Modify:

- `lib/interior-estimates.ts`
- `components/quotes/InteriorEstimateBuilder.tsx`
- `components/quotes/QuoteForm.tsx`
- tests above

Required behavior:

- [ ] A specific-area room must include at least one of `walls`, `ceiling`, or `trim`.
- [ ] If all three are false, show an inline UI error and block submit.
- [ ] The calculator must not fallback to global `input.scope` for a room with all included surfaces false.
- [ ] Keep entire-property mode behavior unchanged.

Current gap:

`calculateSpecificAreasEstimate()` can derive `roomScope` from global `input.scope` when no room-level surface is selected. This is unsafe because a visually deselected room can still be priced.

### Step 7: Remove or Wire Door/Window Room Toggles

Modify:

- `components/quotes/InteriorEstimateBuilder.tsx`
- `components/quotes/QuoteForm.tsx`
- tests

Decision:

For v1, doors and windows should be explicit opening items only. The room-level `include_doors` and `include_windows` toggles should either be removed from the priced surface toggle row or converted into explicit opening item creation. Do not leave them as UI-only toggles.

Recommended v1 behavior:

- [ ] Remove `include_doors` and `include_windows` from the room surface toggle row.
- [ ] Keep `Doors` and `Windows` sections as the only priced way to add doors/windows.
- [ ] If the UI keeps a helper shortcut later, it must create explicit `opening_items` with visible quantity and unit rate.

Reason:

`InteriorEstimateInput.rooms` does not include `include_doors` or `include_windows`, so these toggles currently do not map to priced calculator input. That can mislead the painter.

### Step 8: Add Duplicate Scope Guard Cases

Modify:

- `lib/quote-pricing-scopes.ts`
- `app/actions/quotes.ts`
- `components/quotes/QuoteForm.tsx`
- `app/actions/quotes.test.ts`
- `components/quotes/QuoteForm.test.tsx`

Required blocked cases:

- [ ] Quick selected room surface plus structured custom line item for the same room/surface.
- [ ] Advanced room `include_trim` plus explicit skirting/trim item for the same room.
- [ ] Advanced entire-property anchor plus specific-area room anchors in the same base subtotal.
- [ ] AI pricing candidate that maps to a scope already included by a reviewed estimate item.

Allowed cases:

- Same room label repeated as two independent rooms when their room instance ids are different.
- Optional add-on that is explicitly customer-selectable and not included in the base scope.
- Manual custom text row where no structured scope key exists, but the UI should warn that the painter must confirm it is not already included.

### Step 9: Add Quote Builder Warnings

Modify:

- `components/quotes/QuickEstimateBuilder.tsx`
- `components/quotes/InteriorEstimateBuilder.tsx`
- `components/quotes/QuoteForm.tsx`

Required behavior:

- [ ] If selected Quick source total is A$0, show a blocking warning unless the painter intentionally marks the row as free/manual.
- [ ] If selected Advanced room anchor is missing or median is A$0, show a blocking warning.
- [ ] If selected door/window unit rate is A$0, show a blocking warning.
- [ ] Submit button disabled state and inline error must explain the exact source.
- [ ] Warnings must link to `/price-rates`.

Do not add an "AI can fix this" path. Rate setup is painter-owned and deterministic.

### Step 10: Verification

Run after implementation:

```bash
npm run test:run -- utils/calculations.test.ts lib/rate-settings.test.ts lib/interior-estimates.test.ts
npm run test:run -- app/actions/quotes.test.ts components/quotes/QuoteForm.test.tsx components/rates/PriceRatesForm.test.tsx
npm run test:run
npm run build
git diff --check
```

Browser testing is optional for Task 2 unless UI behavior changes are visually complex. If browser testing is run, test `/price-rates` and quote create/edit in both Quick and Advanced modes.

## Implementation Completion Checklist

### Already Implemented

- [x] `UserRateSettings.quick_estimate` schema exists.
- [x] Quick room size/surface matrix UI exists.
- [x] Quick room edit version increments.
- [x] Quick quote builder stamps source id/version/label and snapshot version.
- [x] Quick calculator uses stored snapshot cents/multipliers for source rooms.
- [x] `utils/calculations.test.ts` has Quick snapshot unit coverage.
- [x] `detailed_estimate_items.advanced_rooms` schema exists.
- [x] Price Rates Advanced Room Items UI exists.
- [x] Quote form copies Advanced room library source id/version/label into payload.
- [x] `components/quotes/QuoteForm.test.tsx` covers Advanced room source copy.
- [x] Custom detailed estimate anchors and door/window user rates are parsed and tested.

### Still Required

- [ ] Task 1B duplicate priced scope guard.
- [ ] Quick `quote_estimate_items.metadata` completeness.
- [ ] Advanced numeric anchor snapshot immutability.
- [ ] No all-surfaces-false fallback in Advanced specific-area rooms.
- [ ] Remove or wire room-level `include_doors` / `include_windows` toggles.
- [ ] Price Rates setup diagnostics for zero/missing Quick/Advanced sources.
- [ ] Quote Builder blocking warnings for selected A$0 sources.
- [ ] Quote A/B stale-rate tests at action level.
- [ ] Create/update same-shape tests for Quick and Advanced estimate rows.
- [ ] PDF/detail/invoice regression after snapshot changes.

## Definition Of Done

Task 2 is complete only when:

- Quick and Advanced estimate source settings are visibly separate in Price Rates.
- Quick quote save stores complete source snapshot in both `pricing_method_inputs` and estimate row metadata.
- Advanced quote save stores enough numeric source snapshot to keep old quote totals immutable.
- Quote create/update blocks duplicate priced scopes.
- Quote create/update blocks accidental A$0 Quick/Advanced sources.
- Existing Quick/Advanced quotes still render after metadata changes.
- Focused tests, full test suite, build, and `git diff --check` pass.

## AI Build Gate

Do not implement AI pricing candidates, Qwen draft application, or photo-assisted pricing until this file and Task 1B are complete. AI may draft wording and pricing candidates only after deterministic pricing boundaries are test-protected.
