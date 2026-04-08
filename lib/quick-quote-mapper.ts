/**
 * Quick Quote Mapper
 *
 * Converts the simplified QuickQuoteBuilder form state
 * into the full InteriorEstimateInput format consumed by
 * calculateInteriorEstimate().
 *
 * Key simplifications over the raw form:
 *  - Room size S/M/L → size_multiplier on anchor price
 *  - Condition Good/Normal/Poor → excellent/fair/poor
 *  - Skirting toggle → auto-estimated lm from room size
 *  - paint_system is per-room and only applies to trim items
 *    (walls/ceiling use the selected wall coating from the quote form)
 */

import {
  type InteriorEstimateInput,
  type InteriorPaintSystem,
  type InteriorRoomType,
  type InteriorWallPaintSystem,
} from '@/lib/interior-estimates';

// ─── Public types ─────────────────────────────────────────────────────────────

export type QuickRoomSize = 'small' | 'medium' | 'large';
export type QuickRoomCondition = 'good' | 'normal' | 'poor';
export type QuickDoorScope = 'door_and_frame' | 'door_only' | 'frame_only';
export type QuickWindowType = 'normal' | 'awning' | 'double_hung' | 'french';
export type QuickWindowScope = 'window_and_frame' | 'window_only' | 'frame_only';

export type QuickRoom = {
  /** Display label, e.g. "Bedroom 1" */
  name: string;
  /** Maps 1:1 to InteriorRoomType anchor */
  anchor_room_type: InteriorRoomType;
  /** S/M/L — drives a multiplier on the anchor price */
  size: QuickRoomSize;
  /** Overall condition of the room (walls, ceiling, trim) */
  condition: QuickRoomCondition;
  /** Include walls in scope */
  include_walls: boolean;
  /** Include ceiling in scope */
  include_ceiling: boolean;
  /**
   * Include trim (doors, windows, skirting) in scope.
   * When false, all trim options are hidden and not priced.
   */
  include_trim: boolean;
  /**
   * Paint system for trim items only (oil or water base).
   * Walls/ceiling always use the standard 2-coat anchor price.
   */
  trim_paint_system: InteriorPaintSystem;
  /** Number of doors (0 = none) */
  door_count: number;
  /** Which parts of the door to paint */
  door_scope: QuickDoorScope;
  /** Number of windows (0 = none) */
  window_count: number;
  /** Window construction type (affects anchor price) */
  window_type: QuickWindowType;
  /** Which parts of the window to paint */
  window_scope: QuickWindowScope;
  /** Include skirting boards */
  include_skirting: boolean;
  /** Override auto-estimated lm (null = use size-based estimate) */
  skirting_lm_override: number | null;
};

export type QuickQuoteInput = {
  /** Coating for walls/ceiling: refresh, repaint, or new plaster */
  wall_paint_system: InteriorWallPaintSystem;
  rooms: QuickRoom[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Multiplier applied to the room's anchor price based on size */
export const QUICK_SIZE_MULTIPLIERS: Record<QuickRoomSize, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.35,
};

/** Maps simplified condition labels to InteriorCondition keys */
export const QUICK_CONDITION_MAP: Record<QuickRoomCondition, 'excellent' | 'fair' | 'poor'> = {
  good: 'excellent',
  normal: 'fair',
  poor: 'poor',
};

/** Auto-estimated skirting linear metres per room size */
export const QUICK_SKIRTING_LM: Record<QuickRoomSize, number> = {
  small: 10,
  medium: 16,
  large: 22,
};

// ─── Scope helpers ────────────────────────────────────────────────────────────

function toDoorScope(scope: QuickDoorScope) {
  const map: Record<QuickDoorScope, 'door_and_frame' | 'door_only' | 'frame_only'> = {
    door_and_frame: 'door_and_frame',
    door_only: 'door_only',
    frame_only: 'frame_only',
  };
  return map[scope];
}

function toWindowType(type: QuickWindowType) {
  const map: Record<QuickWindowType, 'normal' | 'awning' | 'double_hung' | 'french'> = {
    normal: 'normal',
    awning: 'awning',
    double_hung: 'double_hung',
    french: 'french',
  };
  return map[type];
}

function toWindowScope(scope: QuickWindowScope) {
  const map: Record<QuickWindowScope, 'window_and_frame' | 'window_only' | 'frame_only'> = {
    window_and_frame: 'window_and_frame',
    window_only: 'window_only',
    frame_only: 'frame_only',
  };
  return map[scope];
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Converts a QuickQuoteInput into an InteriorEstimateInput.
 *
 * The output uses `specific_areas` mode so each room's anchor is priced
 * individually. Size is encoded via a synthetic size_multiplier stored in
 * the room's metadata; the calculateInteriorEstimate engine reads this
 * field when present.
 *
 * Trim items (doors, windows, skirting) are only added when the room's
 * include_trim flag is true. Each room uses its own trim_paint_system
 * (oil or water base) for those items.
 */
export function mapQuickQuoteToInteriorEstimate(
  input: QuickQuoteInput
): InteriorEstimateInput & { _size_multipliers: Record<number, number> } {
  const { wall_paint_system, rooms } = input;

  // Derive the dominant condition (most frequent across rooms)
  const conditionCounts: Record<string, number> = {};
  for (const room of rooms) {
    const mapped = QUICK_CONDITION_MAP[room.condition];
    conditionCounts[mapped] = (conditionCounts[mapped] ?? 0) + 1;
  }
  const dominantCondition = (
    Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fair'
  ) as 'excellent' | 'fair' | 'poor';

  const mappedRooms: InteriorEstimateInput['rooms'] = rooms.map((room) => ({
    name: room.name,
    anchor_room_type: room.anchor_room_type,
    room_type: 'interior' as const,
    length_m: null,
    width_m: null,
    height_m: null,
    include_walls: room.include_walls,
    include_ceiling: room.include_ceiling,
    include_trim: false, // trim is priced separately via opening_items/trim_items below
  }));

  const openingItems: InteriorEstimateInput['opening_items'] = [];
  const trimItems: InteriorEstimateInput['trim_items'] = [];

  rooms.forEach((room, roomIndex) => {
    // Only add trim items when the user has opted in to trim scope
    if (!room.include_trim) return;

    if (room.door_count > 0) {
      openingItems.push({
        opening_type: 'door',
        paint_system: room.trim_paint_system,
        quantity: room.door_count,
        room_index: roomIndex,
        door_type: 'standard',
        door_scope: toDoorScope(room.door_scope),
      });
    }

    if (room.window_count > 0) {
      openingItems.push({
        opening_type: 'window',
        paint_system: room.trim_paint_system,
        quantity: room.window_count,
        room_index: roomIndex,
        window_type: toWindowType(room.window_type),
        window_scope: toWindowScope(room.window_scope),
      });
    }

    if (room.include_skirting) {
      const lm = room.skirting_lm_override ?? QUICK_SKIRTING_LM[room.size];
      trimItems.push({
        trim_type: 'skirting',
        paint_system: room.trim_paint_system,
        quantity: lm,
        room_index: roomIndex,
      });
    }
  });

  // Build size_multipliers map — indexed by room position.
  const sizeMultipliers: Record<number, number> = {};
  rooms.forEach((room, index) => {
    sizeMultipliers[index] = QUICK_SIZE_MULTIPLIERS[room.size];
  });

  return {
    property_type: 'apartment',
    estimate_mode: 'specific_areas',
    condition: dominantCondition,
    scope: ['walls', 'ceiling', 'trim'],
    wall_paint_system,
    property_details: {
      apartment_type: null,
      sqm: null,
      bedrooms: null,
      bathrooms: null,
      storeys: null,
    },
    rooms: mappedRooms,
    opening_items: openingItems,
    trim_items: trimItems,
    _size_multipliers: sizeMultipliers,
  };
}

/**
 * Applies per-room size multipliers to the pricing_items after calculation.
 * Only modifies room_anchor items — doors/windows/skirting are unaffected.
 */
export function applyRoomSizeMultipliers(
  pricingItems: Array<{
    category: string;
    total_cents: number;
    unit_price_cents: number;
    room_index?: number | null;
  }>,
  sizeMultipliers: Record<number, number>
): typeof pricingItems {
  return pricingItems.map((item) => {
    if (item.category !== 'room_anchor') return item;
    const mult = item.room_index != null ? (sizeMultipliers[item.room_index] ?? 1) : 1;
    return {
      ...item,
      unit_price_cents: Math.round(item.unit_price_cents * mult),
      total_cents: Math.round(item.total_cents * mult),
    };
  });
}

/**
 * Recalculates subtotal/gst/total from adjusted pricing_items.
 */
export function recalculateTotals(
  pricingItems: Array<{ total_cents: number }>,
  manualAdjustmentCents = 0
): { subtotal_cents: number; gst_cents: number; total_cents: number } {
  const subtotal_cents = pricingItems.reduce((sum, item) => sum + item.total_cents, 0);
  const gst_cents = Math.round(subtotal_cents * 0.1);
  const total_cents = subtotal_cents + gst_cents + manualAdjustmentCents;
  return { subtotal_cents, gst_cents, total_cents };
}
