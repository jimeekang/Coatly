# Task 3: Quick Room Price Library and Detailed Estimate Source Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` when implementing this plan. Follow the checklist in order. Do not start quote form schema migration, AI pricing candidates, or Qwen adapter work until this source redesign is complete or explicitly deferred.

**Goal:** Price Rates 안에서 방 가격 기준표가 두 군데로 나뉘는 문제를 없앤다. Quick Estimate room matrix를 canonical Room Price Library로 만들고, Advanced detailed estimate는 이 room library를 참조해서 더 세밀한 surface/door/window/trim 견적을 만든다.

**Architecture:** Quick Estimate는 더 이상 단순한 "빠른 견적 탭"만이 아니다. v1에서는 `room template + size + walls/ceiling/trim cents + coating/condition multipliers`가 방 가격의 canonical source다. Detailed Estimate Anchors는 기존 quote 호환과 내부 계산 파생값으로만 남기고, Price Rates의 주요 편집 UI에서는 별도 방 가격표처럼 노출하지 않는다.

**Tech Stack:** Next.js App Router, React, Server Actions, Supabase Postgres JSONB rate settings, Vitest, Testing Library.

---

## Parent Plan

- Parent build plan: [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md)
- Task 1 dependency: [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md)
- Task 2 dependency: [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)
- Quote boundary reference: [QUOTE.md](../quote/QUOTE.md)

## Status

**Status:** COMPLETE as of 2026-05-17.

Task 1 and Task 2 made quote totals canonical and snapshot-safe. Task 3 now removes the remaining product/data-model duplication: Quick Estimate room prices are the canonical Room Price Library, Advanced room presets reference room templates, and Detailed Estimate Anchors remain only as legacy fallback.

## Implementation Snapshot

- Added `source_room_template_id`, `source_room_template_version`, and `default_size` to Advanced room items while preserving legacy `anchor_room_type`.
- Added `lib/room-price-library.ts` for template lookup, selected-surface totals, derived anchor ranges, and typed missing/disabled-source issues.
- Updated Price Rates so Quick rooms are framed as Room Price Library, Advanced presets select a template and default size, and legacy anchors are collapsed under compatibility copy.
- Updated Advanced quote builder so presets and manual rooms can carry template source id/version/label/size, and quote payloads snapshot numeric per-surface prices.
- Updated server-side save/normalize/validation so `estimate_context` and `quote_estimate_items.metadata` include room template source metadata and old anchor-only quotes still calculate.
- Updated diagnostics and duplicate scope guard so new Advanced room sources use the same stable room/surface keys as Quick Estimate.
- No Supabase migration was required; Task 3 extends existing JSONB rate settings and saved quote metadata only.
- Verified focused Task 3 tests: `npm run test:run -- lib/rate-settings.test.ts lib/room-price-library.test.ts lib/interior-estimates.test.ts lib/quote-pricing-scopes.test.ts app/actions/quotes.test.ts components/rates/PriceRatesForm.test.tsx components/quotes/QuoteForm.test.tsx` passed 109 tests.

## Current Problem

| Current area | Problem | v1 risk |
|--------------|---------|---------|
| Quick Estimate room matrix | Already has detailed room price by size and surface | Correct source is available but treated as a quick-only mode |
| Detailed Estimate Anchors | Duplicates room-level price names and min/median/max values | Painter may update Quick but forget anchors, causing Advanced to price from stale source |
| Advanced Room Items | Currently point to `anchor_room_type` string | A string anchor is weaker than a versioned Quick room template source |
| Price Rates UI | Shows Quick setup and Detailed Estimate Anchors as separate pricing areas | User does not know which room price list is authoritative |
| AI quote future | AI needs one stable room price library to map photo/notes candidates | Two room-price sources make AI candidate matching less trustworthy |

## Product Decision

**Decision:** Make Quick Estimate room templates the canonical Room Price Library.

The user-facing mental model should be:

```text
Price Rates
  Room Price Library
    Bedroom
      small / medium / large
      walls / ceiling / trim
    Living Room
      small / medium / large
      walls / ceiling / trim

New Quote
  Quick Estimate
    Uses Room Price Library quickly

  Advanced Detailed Estimate
    Uses Room Price Library as the room source
    Adds explicit doors, windows, skirting/trim, assumptions, clauses

AI Quote Form Builder
  Suggests room template + size + surfaces + condition
  App applies deterministic pricing from Room Price Library
```

## Non-Goals

- Do not delete saved quote snapshots.
- Do not remove existing `detailed_estimate_anchors` data immediately.
- Do not let AI write price fields.
- Do not create a new second room-price table unless JSONB rate settings cannot support migration safely.
- Do not make photos calculate exact sqm/lm/price.

## Target Data Contract

### Canonical Room Price Library

The canonical source remains inside `UserRateSettings.quick_estimate.rooms`.

| Field | Meaning | Rule |
|-------|---------|------|
| `id` | room template id | Stable source id used by Quick, Advanced, and AI candidates |
| `version` | room template version | Increment when prices, label, or enabled surfaces change |
| `label` | room name | User-visible label such as Bedroom, Living Room |
| `enabled_surfaces` | allowed surfaces | Usually `walls`, `ceiling`, `trim`; may be reduced by painter |
| `sizes.small` | small price snapshot | Contains `walls_cents`, `ceiling_cents`, `trim_cents` |
| `sizes.medium` | medium price snapshot | Primary default for Advanced room source |
| `sizes.large` | large price snapshot | Used for larger room candidates |
| `sort_order` | UI order | Controls Room Price Library ordering |

### Advanced Room Item Contract

Advanced room items should point to the canonical room template instead of a separate anchor name.

| Field | Status | Meaning |
|-------|--------|---------|
| `source_room_template_id` | new preferred field | References `quick_estimate.rooms[].id` |
| `source_room_template_version` | new preferred field | Captures template version when item was configured |
| `label` | keep | Advanced preset label, e.g. Bedroom repaint |
| `default_size` | new preferred field | `small`, `medium`, or `large`; default `medium` |
| `include_walls` | keep | Whether preset includes walls |
| `include_ceiling` | keep | Whether preset includes ceiling |
| `include_trim` | keep | Whether preset includes trim |
| `default_height_m` | keep for now | Useful for UI assumptions and future measured estimates |
| `anchor_room_type` | legacy compatibility | Read old settings, but do not make this the primary v1 source |

### Derived Anchor Compatibility

`detailed_estimate_anchors` can stay as an internal compatibility layer.

| Derived value | Source |
|---------------|--------|
| `min` | selected room template small total for enabled/included surfaces |
| `median` | selected room template medium total for enabled/included surfaces |
| `max` | selected room template large total for enabled/included surfaces |

Rules:

- Existing saved quotes with `source_anchor_range_cents` keep using their saved numeric snapshot.
- Existing rate settings with only `anchor_room_type` continue to load.
- New Advanced room item selection should snapshot from Quick room template prices.
- Price Rates UI should not ask painters to manually maintain a second room anchor list unless they open an advanced/legacy compatibility area.

## Target UI

### Price Rates

Rename or reframe the Quick Estimate area as **Room Price Library**.

Recommended layout:

1. **Room Price Library**
   - Room templates with small/medium/large and walls/ceiling/trim prices.
   - Coating and condition multipliers remain nearby because both Quick and Advanced use them.
   - Setup summary says "Used by Quick, Advanced, and AI draft pricing."

2. **Advanced Detailed Presets**
   - Advanced room presets choose a Room Price Library template.
   - Preset can set default size and included surfaces.
   - Door/window/skirting unit rates stay explicit.

3. **Legacy Detailed Anchors**
   - Hidden by default or collapsed under a legacy compatibility section.
   - Shows read-only derived values where possible.
   - Allows manual legacy recovery only if existing data cannot map to a room template.

### Quote Builder

Quick and Advanced should feel related, not duplicated.

| Mode | User action | Pricing source |
|------|-------------|----------------|
| Quick Estimate | Pick room + size + surfaces quickly | Room Price Library snapshot |
| Advanced Detailed Estimate | Pick room preset or room template, then add explicit doors/windows/trim | Same Room Price Library snapshot plus explicit unit item snapshots |
| AI Draft | AI suggests room template, size, surfaces, condition, questions | Deterministic Room Price Library mapping after user review |

## Required Implementation

### Step 1: Add Failing Tests First

- [x] `lib/rate-settings.test.ts`: parsing old `advanced_rooms[].anchor_room_type` still works.
- [x] `lib/rate-settings.test.ts`: new `advanced_rooms[].source_room_template_id` points to Quick room template.
- [x] `lib/interior-estimates.test.ts`: Advanced room using Quick template snapshot keeps old total after Quick template price changes.
- [x] `components/rates/PriceRatesForm.test.tsx`: Detailed Estimate Anchors are not shown as a primary duplicated price list.
- [x] `components/rates/PriceRatesForm.test.tsx`: Advanced room preset can select a Room Price Library template and default size.
- [x] `components/quotes/QuoteForm.test.tsx`: Advanced quote selected from room template saves template id/version/label/size and numeric source prices.
- [x] `app/actions/quotes.test.ts`: create/update stores Advanced estimate metadata from Quick room template source, not from a second editable anchor list.

### Step 2: Extend Rate Settings Schema Safely

Modify:

- `lib/rate-settings.ts`
- `lib/rate-settings.test.ts`

Required behavior:

- [x] Add optional `source_room_template_id` to `AdvancedEstimateRoomItem`.
- [x] Add optional `source_room_template_version` to `AdvancedEstimateRoomItem`.
- [x] Add optional `default_size: 'small' | 'medium' | 'large'`.
- [x] Keep `anchor_room_type` optional or legacy-readable during transition.
- [x] Parse old settings without data loss.
- [x] When both new and legacy fields exist, prefer `source_room_template_id`.

### Step 3: Add Room Price Library Helpers

Recommended file:

- `lib/room-price-library.ts`

Recommended API:

```ts
export function getRoomTemplateById(settings: UserRateSettings, id: string): QuickEstimateRoom | null;
export function getRoomTemplateSurfaceTotalCents(
  room: QuickEstimateRoom,
  size: 'small' | 'medium' | 'large',
  surfaces: Array<'walls' | 'ceiling' | 'trim'>
): number;
export function deriveAnchorRangeFromRoomTemplate(
  room: QuickEstimateRoom,
  surfaces: Array<'walls' | 'ceiling' | 'trim'>
): { min: number; median: number; max: number };
export function resolveAdvancedRoomPriceSource(
  settings: UserRateSettings,
  itemOrRoom: AdvancedEstimateRoomItem | InteriorEstimateInput['rooms'][number]
): ResolvedAdvancedRoomPriceSource;
```

Rules:

- Missing room template returns a typed issue, not `0`.
- Disabled surfaces are not silently priced.
- Existing legacy anchors can be used only when no new room template source exists.
- The helper must return enough source metadata for quote snapshots.

### Step 4: Update Price Rates UI

Modify:

- `components/rates/PriceRatesForm.tsx`
- `components/rates/QuickEstimateTab.tsx`

Required behavior:

- [x] Reframe Quick tab/section copy as Room Price Library or make the relationship explicit.
- [x] Advanced Room Items choose a room template from `quick_estimate.rooms`.
- [x] Advanced Room Items choose a default size.
- [x] Advanced Room Items keep default walls/ceiling/trim toggles.
- [x] Detailed Estimate Anchors is hidden from the primary flow or collapsed as legacy compatibility.
- [x] Setup summary counts missing template references instead of missing anchor strings for new items.

### Step 5: Update Advanced Quote Builder

Modify:

- `components/quotes/InteriorEstimateBuilder.tsx`
- `components/quotes/QuoteForm.tsx`
- `lib/interior-estimates.ts`

Required behavior:

- [x] Selecting an Advanced room item copies `source_room_template_id`, version, label, default size, and included surfaces.
- [x] Manual Advanced room can still pick a room template directly.
- [x] The quote payload stores `source_room_template_id`, `source_room_template_version`, `source_room_template_label`, `source_room_template_size`, and numeric per-surface price snapshot.
- [x] Existing saved quotes that only have `source_anchor_range_cents` continue to calculate and render.
- [x] Existing manual measured rooms do not lose dimensions or user labels.

### Step 6: Update Server-Side Snapshot and Save Rows

Modify:

- `app/actions/quotes.ts`
- `lib/interior-estimates.ts`
- `lib/supabase/validators.ts`
- `lib/quotes.ts`

Required behavior:

- [x] Server action resolves Advanced room price from Room Price Library before save.
- [x] `quote_estimate_items.metadata` includes room template source id/version/label/size.
- [x] Numeric snapshot still includes per-surface cents and resolved total cents.
- [x] `detailed_estimate_anchors` remains accepted for legacy quote/rate settings.
- [x] Create and update paths write the same shape.

### Step 7: Update Diagnostics and Duplicate Scope Guard

Modify:

- `lib/rate-setup-diagnostics.ts`
- `lib/quote-pricing-scopes.ts`

Required behavior:

- [x] Quick zero-price warnings become Room Price Library warnings.
- [x] Advanced missing-source warning checks missing `source_room_template_id` first.
- [x] Legacy missing anchor warning remains only for legacy items.
- [x] Duplicate scope guard keeps room/surface keys stable across Quick and Advanced.

### Step 8: Document Migration and UI Copy

Modify:

- `docs/features/ai/V1-APP-BUILD-PLAN.md`
- `docs/features/quote/QUOTE.md`
- `docs/generated/DB-SCHEMA.md` only if schema changes are introduced

Required behavior:

- [x] Document that Room Price Library is the single room price source.
- [x] Document that Detailed Estimate Anchors is compatibility/derived only.
- [x] Document old quote compatibility and no-retroactive-repricing rule.
- [x] Document AI candidate mapping to room template + size + surfaces.

## Migration Strategy

Use a compatibility-first migration:

1. Keep old `anchor_room_type` readable.
2. Add new optional fields to JSON schema.
3. On load, if an Advanced room item has `anchor_room_type` but no `source_room_template_id`, try to match by normalized label against Quick room templates.
4. If matched, display the new source in UI and save new fields on next settings save.
5. If unmatched, keep the item in a legacy state with a visible warning and do not silently change prices.
6. Saved quotes never reprice from changed settings unless the user explicitly reprices.

## Completion Criteria

- Painters maintain one room price library, not two room price lists.
- Price Rates primary UI no longer makes Detailed Estimate Anchors look like the authoritative room price source.
- Quick Estimate and Advanced Detailed Estimate both source room prices from `quick_estimate.rooms`.
- Existing saved quotes keep old totals.
- Existing rate settings with legacy anchors still load.
- Advanced room item save/create/update metadata includes room template source fields.
- Focused tests, full test suite, build, lint, and `git diff --check` pass.

## Why This Must Happen Before AI

AI quote drafting needs one deterministic way to turn a room candidate into price:

```text
AI candidate:
  room = Bedroom
  size = medium
  surfaces = walls + ceiling
  condition = average

App pricing:
  Room Price Library -> Bedroom medium walls/ceiling
  Apply deterministic multipliers
  Snapshot result
```

If Detailed Estimate Anchors remain a second editable source, AI candidate review will be harder to explain and easier to misprice. Task 3 removes that ambiguity before the quote form schema and Qwen adapter are added.

After Task 3, AI candidate shape should prefer room-template language:

```ts
{
  type: 'interior_room',
  room_template_label: 'Bedroom',
  suggested_size: 'medium',
  selected_surfaces: ['walls', 'ceiling'],
  condition: 'average',
  confidence: 'medium',
  questions_for_user: []
}
```

The deterministic pricing pass maps that candidate to the painter's Room Price Library snapshot. The AI still does not output price, rate, GST, or total.
