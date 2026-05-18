import {
  INTERIOR_ESTIMATE_ANCHORS,
  INTERIOR_SCOPE_SHARE,
} from '@/config/interior-estimate-anchors';
import { PAINT_RATES } from '@/config/paint-rates';
import {
  getRoomTemplateSurfaceSnapshotTotalCents,
  resolveAdvancedRoomPriceSource,
} from '@/lib/room-price-library';
import type {
  QuickRoomSize,
  QuickRoomSurfacePriceSnapshot,
  UserRateSettings,
} from '@/lib/rate-settings';

export const INTERIOR_APARTMENT_TYPES = [
  'studio',
  '1_bedroom',
  '2_bedroom_standard',
  '2_bedroom_large',
  '3_bedroom',
] as const;
export const INTERIOR_CONDITIONS = ['excellent', 'fair', 'poor'] as const;
export const INTERIOR_SCOPE_OPTIONS = ['walls', 'ceiling', 'trim'] as const;
export const INTERIOR_STOREYS = ['1_storey', '2_storey', '3_storey'] as const;
export const INTERIOR_PAINT_SYSTEMS = [
  'oil_2coat',
  'water_3coat_white_finish',
] as const;
// Wall/ceiling paint systems (separate from trim)
export const INTERIOR_WALL_PAINT_SYSTEMS = [
  'refresh_1coat',
  'repaint_2coat',
  'new_plaster_3coat',
] as const;
export const INTERIOR_ROOM_TYPES = [
  'Master Bedroom',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bathroom',
  'Living Room',
  'Lounge',
  'Dining',
  'Kitchen',
  'Study / Office',
  'Laundry',
  'Hallway',
  'Foyer',
  'Stairwell',
  'Walk-in Robe',
  'Other',
] as const;
export const INTERIOR_DOOR_TYPES = [
  'standard',
  'flush',
  'panelled',
  'french',
  'sliding',
  'bi_fold',
] as const;
export const INTERIOR_DOOR_SCOPES = [
  'door_and_frame',
  'door_only',
  'frame_only',
] as const;
export const INTERIOR_WINDOW_TYPES = [
  'normal',
  'awning',
  'double_hung',
  'french',
] as const;
export const INTERIOR_WINDOW_SCOPES = [
  'window_and_frame',
  'window_only',
  'frame_only',
] as const;

export type InteriorApartmentType = (typeof INTERIOR_APARTMENT_TYPES)[number];
export type InteriorCondition = (typeof INTERIOR_CONDITIONS)[number];
export type InteriorScope = (typeof INTERIOR_SCOPE_OPTIONS)[number];
export type InteriorStoreys = (typeof INTERIOR_STOREYS)[number];
export type InteriorPaintSystem = (typeof INTERIOR_PAINT_SYSTEMS)[number];
export type InteriorWallPaintSystem =
  (typeof INTERIOR_WALL_PAINT_SYSTEMS)[number];
export type InteriorRoomType =
  | (typeof INTERIOR_ROOM_TYPES)[number]
  | (string & {});
export type InteriorDoorType = (typeof INTERIOR_DOOR_TYPES)[number];
export type InteriorDoorScope = (typeof INTERIOR_DOOR_SCOPES)[number];
export type InteriorWindowType = (typeof INTERIOR_WINDOW_TYPES)[number];
export type InteriorWindowScope = (typeof INTERIOR_WINDOW_SCOPES)[number];
export type InteriorPropertyType = 'apartment' | 'house';
export type InteriorEstimateMode = 'entire_property' | 'specific_areas';
export type ApartmentType = InteriorApartmentType;
export type DoorScope = InteriorDoorScope;
export type DoorType = InteriorDoorType;
export type PaintSystem = InteriorPaintSystem;
export type RoomAnchorType = InteriorRoomType;
export type StoreyType = InteriorStoreys;
export type WindowScope = InteriorWindowScope;
export type WindowType = InteriorWindowType;

export const INTERIOR_APARTMENT_TYPE_LABELS: Record<
  InteriorApartmentType,
  string
> = {
  studio: 'Studio',
  '1_bedroom': '1 Bedroom',
  '2_bedroom_standard': '2 Bedroom (Standard)',
  '2_bedroom_large': '2 Bedroom (Large)',
  '3_bedroom': '3 Bedroom',
};
export const INTERIOR_CONDITION_LABELS: Record<InteriorCondition, string> = {
  excellent: 'Excellent',
  fair: 'Fair',
  poor: 'Poor',
};
export const INTERIOR_STOREY_LABELS: Record<InteriorStoreys, string> = {
  '1_storey': '1 Storey',
  '2_storey': '2 Storey',
  '3_storey': '3 Storey',
};
// Trim-only paint system labels (oil vs water base)
export const INTERIOR_PAINT_SYSTEM_LABELS: Record<InteriorPaintSystem, string> =
  { oil_2coat: 'Oil Base', water_3coat_white_finish: 'Water Base' };
// Wall/ceiling paint system labels
export const INTERIOR_WALL_PAINT_SYSTEM_LABELS: Record<
  InteriorWallPaintSystem,
  string
> = {
  refresh_1coat: 'Refresh (1 coat)',
  repaint_2coat: 'Repaint (2 coats)',
  new_plaster_3coat: 'New Plaster (3 coats)',
};
export const INTERIOR_DOOR_TYPE_LABELS: Record<InteriorDoorType, string> = {
  standard: 'Standard',
  flush: 'Flush',
  panelled: 'Panelled',
  french: 'French',
  sliding: 'Sliding',
  bi_fold: 'Bi-fold',
};
export const INTERIOR_DOOR_SCOPE_LABELS: Record<InteriorDoorScope, string> = {
  door_and_frame: 'Door & Frame',
  door_only: 'Door only',
  frame_only: 'Frame only',
};
export const INTERIOR_WINDOW_TYPE_LABELS: Record<InteriorWindowType, string> = {
  normal: 'Normal',
  awning: 'Awning',
  double_hung: 'Double Hung',
  french: 'French',
};
export const INTERIOR_WINDOW_SCOPE_LABELS: Record<InteriorWindowScope, string> =
  {
    window_and_frame: 'Window & Frame',
    window_only: 'Window only',
    frame_only: 'Frame only',
  };

export type InteriorEstimateInput = {
  property_type: InteriorPropertyType;
  estimate_mode: InteriorEstimateMode;
  condition: InteriorCondition;
  scope: InteriorScope[];
  wall_paint_system?: InteriorWallPaintSystem;
  trim_paint_system?: InteriorPaintSystem;
  property_details: {
    apartment_type?: InteriorApartmentType | null;
    sqm?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    storeys?: InteriorStoreys | null;
  };
  rooms: Array<{
    name: string;
    anchor_room_type: InteriorRoomType;
    room_type: 'interior' | 'exterior';
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    include_walls: boolean;
    include_ceiling: boolean;
    include_trim: boolean;
    source_rate_item_id?: string;
    source_rate_item_version?: number;
    source_rate_item_label?: string;
    source_room_template_id?: string;
    source_room_template_version?: number;
    source_room_template_label?: string;
    source_room_template_size?: QuickRoomSize;
    source_room_template_surface_prices_cents?: QuickRoomSurfacePriceSnapshot;
    source_room_template_coating_multiplier_pct?: number;
    source_room_template_condition_multiplier_pct?: number;
    rate_snapshot_version?: 1;
    source_anchor_range_cents?: RangeCents;
    source_surface_rate_multiplier?: number;
    source_scope_multiplier?: number;
    source_condition?: InteriorCondition;
    source_wall_paint_system?: InteriorWallPaintSystem;
    source_trim_paint_system?: InteriorPaintSystem;
  }>;
  opening_items: Array<{
    opening_type: 'door' | 'window';
    paint_system: InteriorPaintSystem;
    quantity: number;
    room_index: number | null;
    door_type?: InteriorDoorType;
    door_scope?: InteriorDoorScope;
    window_type?: InteriorWindowType;
    window_scope?: InteriorWindowScope;
    rate_snapshot_version?: 1;
    source_unit_price_cents?: number;
    source_quantity_scale_factor?: number;
  }>;
  trim_items: Array<{
    trim_type: 'skirting';
    paint_system: InteriorPaintSystem;
    quantity: number;
    room_index: number | null;
    rate_snapshot_version?: 1;
    source_unit_price_cents?: number;
  }>;
};

export type InteriorPricingItem = {
  category: 'entire_property' | 'room_anchor' | 'door' | 'window' | 'trim';
  label: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
  room_index?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type InteriorPricingSnapshot = {
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  pricing_items: InteriorPricingItem[];
  line_items: InteriorPricingItem[];
  snapshot: {
    price_source: 'anchor' | 'mixed';
    anchor_version: '2026-sydney-northern-beaches';
    anchor_path: string;
    property_type: InteriorPropertyType;
    estimate_mode: InteriorEstimateMode;
    condition: InteriorCondition;
    scope: InteriorScope[];
    trim_paint_system: InteriorPaintSystem;
    property_details: InteriorEstimateInput['property_details'];
    range_cents: { min: number; median: number; max: number };
    adjustments: {
      scope_multiplier: number;
      storey_multiplier: number;
      quantity_scale_factor: number;
      surface_rate_multiplier: number;
    };
  };
};

type RangeCents = { min: number; median: number; max: number };

const MAX_TOTAL_CENTS =
  INTERIOR_ESTIMATE_ANCHORS.price_caps.max_total_price * 100;
const LEGACY_REFRESH_WALL_PAINT_SYSTEM = 'touch_up_2coat';

export function normalizeInteriorWallPaintSystem(
  value: unknown
): InteriorWallPaintSystem | null {
  if (value === LEGACY_REFRESH_WALL_PAINT_SYSTEM) {
    return 'refresh_1coat';
  }

  return INTERIOR_WALL_PAINT_SYSTEMS.includes(value as InteriorWallPaintSystem)
    ? (value as InteriorWallPaintSystem)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function isInteriorEstimateInput(
  value: unknown
): value is InteriorEstimateInput {
  if (!isRecord(value) || !isRecord(value.property_details)) {
    return false;
  }

  if (value.property_type !== 'apartment' && value.property_type !== 'house') {
    return false;
  }

  if (
    value.estimate_mode !== 'entire_property' &&
    value.estimate_mode !== 'specific_areas'
  ) {
    return false;
  }

  if (!INTERIOR_CONDITIONS.includes(value.condition as InteriorCondition)) {
    return false;
  }

  if (
    !Array.isArray(value.scope) ||
    !value.scope.every((scope) =>
      INTERIOR_SCOPE_OPTIONS.includes(scope as InteriorScope)
    )
  ) {
    return false;
  }

  return (
    Array.isArray(value.rooms) &&
    Array.isArray(value.opening_items) &&
    Array.isArray(value.trim_items)
  );
}

function cap(value: number) {
  return Math.min(Math.max(Math.round(value), 0), MAX_TOTAL_CENTS);
}

function clampRangeGap(range: RangeCents, maxGapCents: number): RangeCents {
  if (range.max - range.min <= maxGapCents)
    return {
      min: cap(range.min),
      median: cap(range.median),
      max: cap(range.max),
    };
  return {
    min: cap(range.median - maxGapCents / 2),
    median: cap(range.median),
    max: cap(range.median + maxGapCents / 2),
  };
}

function getScopeKey(scope: InteriorScope[]) {
  const sorted = [...new Set(scope)].sort();
  if (sorted.length === 3) return 'full_repaint';
  if (
    sorted.length === 2 &&
    sorted.includes('walls') &&
    sorted.includes('ceiling')
  )
    return 'walls_ceiling';
  if (
    sorted.length === 2 &&
    sorted.includes('walls') &&
    sorted.includes('trim')
  )
    return 'walls_trim';
  if (
    sorted.length === 2 &&
    sorted.includes('ceiling') &&
    sorted.includes('trim')
  )
    return 'ceiling_trim';
  if (sorted[0] === 'walls') return 'walls_only';
  if (sorted[0] === 'ceiling') return 'ceiling_only';
  if (sorted[0] === 'trim') return 'trim_only';
  return 'full_repaint';
}

export function getScopeMultiplier(scope: InteriorScope[]) {
  return INTERIOR_SCOPE_SHARE[getScopeKey(scope)];
}

function interpolateMedian(
  points: readonly { sqm: number; median: number }[],
  sqm: number
) {
  if (sqm <= points[0].sqm) return points[0].median;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (sqm <= next.sqm)
      return (
        current.median +
        ((sqm - current.sqm) / (next.sqm - current.sqm)) *
          (next.median - current.median)
      );
  }
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  return (
    previous.median +
    ((sqm - previous.sqm) / (last.sqm - previous.sqm)) *
      (last.median - previous.median)
  );
}

function getCondition(
  propertyType: InteriorPropertyType,
  condition: InteriorCondition
) {
  return INTERIOR_ESTIMATE_ANCHORS.modifiers.condition[propertyType][condition];
}

function inferHouseConfig(details: InteriorEstimateInput['property_details']) {
  if ((details.bedrooms ?? 0) >= 5 || (details.bathrooms ?? 0) >= 3)
    return '5_bed_3_bath';
  if (details.bedrooms === 4) return '4_bed_2_bath';
  if (details.bedrooms === 3) return '3_bed_2_bath';
  if (details.bedrooms === 2) return '2_bed_1_bath';
  if ((details.sqm ?? 0) <= 105) return '2_bed_1_bath';
  if ((details.sqm ?? 0) <= 140) return '3_bed_2_bath';
  if ((details.sqm ?? 0) <= 190) return '4_bed_2_bath';
  return '5_bed_3_bath';
}

function getStoreyMultiplier(storeys: InteriorStoreys | null | undefined) {
  return INTERIOR_ESTIMATE_ANCHORS.modifiers.storeys[storeys ?? '1_storey'];
}

function getDoorTypeMultiplier(doorType: InteriorDoorType) {
  switch (doorType) {
    case 'standard':
      return 1;
    case 'flush':
      return 0.96;
    case 'panelled':
      return 1.08;
    case 'french':
      return 1.28;
    case 'sliding':
      return 1.12;
    case 'bi_fold':
      return 1.22;
  }
}

function getDoorPrice(
  paintSystem: InteriorPaintSystem,
  scope: InteriorDoorScope,
  doorType: InteriorDoorType,
  userRates?: UserRateSettings | null
) {
  const configured =
    userRates?.door_unit_rates?.[paintSystem]?.[doorType]?.[scope];
  if (typeof configured === 'number') return configured;
  const scopeLabel = INTERIOR_DOOR_SCOPE_LABELS[
    scope
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.doors)[InteriorPaintSystem];
  return (
    INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.doors[
      paintSystem
    ][scopeLabel] *
    getDoorTypeMultiplier(doorType) *
    100
  );
}

function getWindowPrice(
  paintSystem: InteriorPaintSystem,
  windowType: InteriorWindowType,
  scope: InteriorWindowScope,
  userRates?: UserRateSettings | null
) {
  const configured =
    userRates?.window_unit_rates?.[paintSystem]?.[windowType]?.[scope];
  if (typeof configured === 'number') return configured;
  const typeLabel = INTERIOR_WINDOW_TYPE_LABELS[
    windowType
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows)[InteriorPaintSystem];
  const scopeLabel = INTERIOR_WINDOW_SCOPE_LABELS[
    scope
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows)[InteriorPaintSystem][typeof typeLabel];
  return (
    INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows[
      paintSystem
    ][typeLabel][scopeLabel] * 100
  );
}

function getSkirtingPrice(paintSystem: InteriorPaintSystem) {
  const anchor =
    INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items
      .skirting_per_linear_metre[paintSystem];
  return Math.round(((anchor.min + anchor.max) / 2) * 100);
}

function getQuantityScaleFactor(quantity: number) {
  if (quantity >= 13) return 0.8;
  if (quantity >= 8) return 0.85;
  if (quantity >= 4) return 0.92;
  return 1;
}

function getTrimPaintSystemMultiplier(
  trimPaintSystem: InteriorPaintSystem = 'oil_2coat',
  userRates?: UserRateSettings | null
) {
  if (trimPaintSystem === 'oil_2coat') return 1;

  const pairs = [
    [
      getDoorPrice(
        trimPaintSystem,
        'door_and_frame',
        'standard',
        userRates
      ),
      getDoorPrice('oil_2coat', 'door_and_frame', 'standard', userRates),
    ],
    [
      getWindowPrice(
        trimPaintSystem,
        'normal',
        'window_and_frame',
        userRates
      ),
      getWindowPrice('oil_2coat', 'normal', 'window_and_frame', userRates),
    ],
    [
      getSkirtingPrice(trimPaintSystem),
      getSkirtingPrice('oil_2coat'),
    ],
  ];
  const ratios = pairs
    .map(([selected, oil]) => (oil > 0 ? selected / oil : 1))
    .filter((ratio) => Number.isFinite(ratio) && ratio > 0);

  if (ratios.length === 0) return 1;
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

function getSurfaceRateMultiplier(
  scope: InteriorScope[],
  wallPaintSystem: InteriorWallPaintSystem = 'repaint_2coat',
  trimPaintSystem: InteriorPaintSystem = 'oil_2coat',
  userRates?: UserRateSettings | null
) {
  const normalized = [...new Set(scope)];
  if (!userRates || normalized.length === 0) return 1;

  const weights: Record<InteriorScope, number> = {
    walls: INTERIOR_SCOPE_SHARE.walls_only,
    ceiling: INTERIOR_SCOPE_SHARE.ceiling_only,
    trim: INTERIOR_SCOPE_SHARE.trim_only,
  };

  const ratios: Record<InteriorScope, number> = {
    walls:
      userRates.walls[wallPaintSystem] /
      PAINT_RATES.walls[wallPaintSystem].ratePerSqm,
    ceiling:
      userRates.ceiling[wallPaintSystem] /
      PAINT_RATES.ceiling[wallPaintSystem].ratePerSqm,
    trim:
      (userRates.trim.repaint_2coat /
        PAINT_RATES.trim.repaint_2coat.ratePerSqm) *
      getTrimPaintSystemMultiplier(trimPaintSystem, userRates),
  };

  const totalWeight = normalized.reduce((sum, item) => sum + weights[item], 0);
  if (totalWeight === 0) return 1;

  return (
    normalized.reduce((sum, item) => sum + weights[item] * ratios[item], 0) /
    totalWeight
  );
}

/**
 * Checks whether a computed door price differs from the corresponding anchor price,
 * indicating the user has applied custom per-unit rates.
 */
function isDoorPriceCustomized(
  computedPrice: number,
  paintSystem: InteriorPaintSystem,
  scope: InteriorDoorScope,
  doorType: InteriorDoorType
): boolean {
  const scopeLabel = INTERIOR_DOOR_SCOPE_LABELS[
    scope
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.doors)[InteriorPaintSystem];
  const anchorPrice = Math.round(
    INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.doors[
      paintSystem
    ][scopeLabel] *
      getDoorTypeMultiplier(doorType) *
      100
  );
  return computedPrice !== anchorPrice;
}

/**
 * Checks whether a computed window price differs from the corresponding anchor price,
 * indicating the user has applied custom per-unit rates.
 */
function isWindowPriceCustomized(
  computedPrice: number,
  paintSystem: InteriorPaintSystem,
  windowType: InteriorWindowType,
  scope: InteriorWindowScope
): boolean {
  const typeLabel = INTERIOR_WINDOW_TYPE_LABELS[
    windowType
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows)[InteriorPaintSystem];
  const scopeLabel = INTERIOR_WINDOW_SCOPE_LABELS[
    scope
  ] as keyof (typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows)[InteriorPaintSystem][typeof typeLabel];
  const anchorPrice =
    INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.trim_items.windows[
      paintSystem
    ][typeLabel][scopeLabel] * 100;
  return computedPrice !== anchorPrice;
}

function buildSnapshot(
  input: InteriorEstimateInput,
  range: RangeCents,
  adjustments: {
    scope_multiplier: number;
    storey_multiplier: number;
    quantity_scale_factor: number;
    surface_rate_multiplier: number;
  },
  pricing_items: InteriorPricingItem[],
  price_source: 'anchor' | 'mixed' = 'anchor'
): InteriorPricingSnapshot {
  const subtotal_cents = cap(range.median);
  const gst_cents = Math.round(subtotal_cents * 0.1);
  return {
    subtotal_cents,
    gst_cents,
    total_cents: subtotal_cents + gst_cents,
    pricing_items,
    line_items: pricing_items,
    snapshot: {
      price_source,
      anchor_version: '2026-sydney-northern-beaches',
      anchor_path: `interior.${input.property_type}.${input.estimate_mode}`,
      property_type: input.property_type,
      estimate_mode: input.estimate_mode,
      condition: input.condition,
      scope: [...new Set(input.scope)],
      trim_paint_system: input.trim_paint_system ?? 'oil_2coat',
      property_details: input.property_details,
      range_cents: {
        min: cap(range.min),
        median: subtotal_cents,
        max: cap(range.max),
      },
      adjustments,
    },
  };
}

function calculateEntireApartmentEstimate(
  input: InteriorEstimateInput,
  userRates?: UserRateSettings | null
): InteriorPricingSnapshot {
  const apartmentType =
    input.property_details.apartment_type ?? '2_bedroom_standard';
  const condition = getCondition('apartment', input.condition);
  const scope_multiplier = getScopeMultiplier(input.scope);
  const surface_rate_multiplier = getSurfaceRateMultiplier(
    input.scope,
    input.wall_paint_system ?? 'repaint_2coat',
    input.trim_paint_system ?? 'oil_2coat',
    userRates
  );
  const baseRange =
    input.property_details.sqm != null
      ? {
          min:
            interpolateMedian(
              INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_sqm_curve,
              input.property_details.sqm
            ) *
            0.88 *
            100,
          median:
            interpolateMedian(
              INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_sqm_curve,
              input.property_details.sqm
            ) * 100,
          max:
            interpolateMedian(
              INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_sqm_curve,
              input.property_details.sqm
            ) *
            1.14 *
            100,
        }
      : {
          min:
            INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_apt_type[
              apartmentType
            ].min * 100,
          median:
            INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_apt_type[
              apartmentType
            ].median * 100,
          max:
            INTERIOR_ESTIMATE_ANCHORS.apartment.entire_property.by_apt_type[
              apartmentType
            ].max * 100,
        };

  const range = clampRangeGap(
    {
      min:
        baseRange.min *
        scope_multiplier *
        condition.min_mult *
        surface_rate_multiplier,
      median:
        baseRange.median *
        scope_multiplier *
        ((condition.min_mult + condition.max_mult) / 2) *
        surface_rate_multiplier,
      max:
        baseRange.max *
        scope_multiplier *
        condition.max_mult *
        surface_rate_multiplier,
    },
    baseRange.median <= 500000 ? 120000 : 180000
  );

  // entire_property never uses per-unit door/window rates — always anchor
  return buildSnapshot(
    input,
    range,
    {
      scope_multiplier,
      storey_multiplier: 1,
      quantity_scale_factor: 1,
      surface_rate_multiplier,
    },
    [
      {
        category: 'entire_property',
        label: `Apartment interior repaint (${INTERIOR_APARTMENT_TYPE_LABELS[apartmentType]})`,
        quantity: 1,
        unit: 'job',
        unit_price_cents: cap(range.median),
        total_cents: cap(range.median),
        metadata: {
          apartment_type: apartmentType,
          sqm: input.property_details.sqm ?? null,
        },
      },
    ],
    'anchor'
  );
}

function calculateEntireHouseEstimate(
  input: InteriorEstimateInput,
  userRates?: UserRateSettings | null
): InteriorPricingSnapshot {
  const config = inferHouseConfig(input.property_details);
  const baseRange =
    INTERIOR_ESTIMATE_ANCHORS.house.entire_property.by_config[config];
  const condition = getCondition('house', input.condition);
  const scope_multiplier = getScopeMultiplier(input.scope);
  const storey_multiplier = getStoreyMultiplier(input.property_details.storeys);
  const surface_rate_multiplier = getSurfaceRateMultiplier(
    input.scope,
    input.wall_paint_system ?? 'repaint_2coat',
    input.trim_paint_system ?? 'oil_2coat',
    userRates
  );
  const range = clampRangeGap(
    {
      min:
        baseRange.min *
        100 *
        scope_multiplier *
        storey_multiplier *
        condition.min_mult *
        surface_rate_multiplier,
      median:
        baseRange.median *
        100 *
        scope_multiplier *
        storey_multiplier *
        ((condition.min_mult + condition.max_mult) / 2) *
        surface_rate_multiplier,
      max:
        baseRange.max *
        100 *
        scope_multiplier *
        storey_multiplier *
        condition.max_mult *
        surface_rate_multiplier,
    },
    baseRange.median <= 10000 ? 180000 : 250000
  );

  // entire_property never uses per-unit door/window rates — always anchor
  return buildSnapshot(
    input,
    range,
    {
      scope_multiplier,
      storey_multiplier,
      quantity_scale_factor: 1,
      surface_rate_multiplier,
    },
    [
      {
        category: 'entire_property',
        label: `House interior repaint (${config.replaceAll('_', ' ')})`,
        quantity: 1,
        unit: 'job',
        unit_price_cents: cap(range.median),
        total_cents: cap(range.median),
        metadata: {
          config,
          bedrooms: input.property_details.bedrooms ?? null,
          bathrooms: input.property_details.bathrooms ?? null,
          sqm: input.property_details.sqm ?? null,
          storeys: input.property_details.storeys ?? null,
        },
      },
    ],
    'anchor'
  );
}

function getSpecificAreaRoomAnchor(
  propertyType: InteriorPropertyType,
  roomType: InteriorRoomType,
  userRates?: UserRateSettings | null
): RangeCents {
  const custom =
    userRates?.detailed_estimate_anchors?.interior_rooms?.[roomType];
  if (custom) {
    return {
      min: custom.min,
      median: custom.median,
      max: custom.max,
    };
  }

  const defaults =
    propertyType === 'apartment'
      ? INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.rooms
      : INTERIOR_ESTIMATE_ANCHORS.house.specific_areas.rooms;
  const fallback =
    defaults[roomType as keyof typeof defaults] ?? defaults.Other;

  return {
    min: fallback.min * 100,
    median: fallback.median * 100,
    max: fallback.max * 100,
  };
}

function getRoomScope(room: InteriorEstimateInput['rooms'][number]) {
  const roomScope: InteriorScope[] = [];
  if (room.include_walls) roomScope.push('walls');
  if (room.include_ceiling) roomScope.push('ceiling');
  if (room.include_trim) roomScope.push('trim');
  return roomScope;
}

function assertSpecificAreaRoomHasSurface(
  room: InteriorEstimateInput['rooms'][number],
  roomIndex: number
) {
  if (room.include_walls || room.include_ceiling || room.include_trim) return;

  throw new Error(
    `Select at least one surface for ${room.name || `Room ${roomIndex + 1}`}.`
  );
}

function getRoomAnchorForCalculation(
  room: InteriorEstimateInput['rooms'][number],
  propertyType: InteriorPropertyType,
  userRates?: UserRateSettings | null
) {
  if (
    room.rate_snapshot_version === 1 &&
    room.source_anchor_range_cents != null
  ) {
    return room.source_anchor_range_cents;
  }

  return getSpecificAreaRoomAnchor(
    propertyType,
    room.anchor_room_type,
    userRates
  );
}

function getRoomTemplateCoatingMultiplierPct(
  userRates: UserRateSettings | null | undefined,
  wallPaintSystem: InteriorWallPaintSystem
) {
  const multipliers = userRates?.quick_estimate.coating_multipliers;
  if (!multipliers) return 100;

  if (wallPaintSystem === 'refresh_1coat') {
    return multipliers.one_coat_refresh_pct;
  }
  if (wallPaintSystem === 'new_plaster_3coat') {
    return multipliers.three_coats_new_plaster_pct;
  }
  return multipliers.two_coats_repaint_pct;
}

function getRoomTemplateConditionMultiplierPct(
  userRates: UserRateSettings | null | undefined,
  condition: InteriorCondition
) {
  const multipliers = userRates?.quick_estimate.condition_multipliers;
  if (!multipliers) return 100;

  if (condition === 'excellent') return multipliers.good_pct;
  if (condition === 'poor') return multipliers.poor_pct;
  return multipliers.average_pct;
}

function hasSavedRoomTemplateSnapshot(
  room: InteriorEstimateInput['rooms'][number]
) {
  return (
    room.rate_snapshot_version === 1 &&
    room.source_room_template_surface_prices_cents != null
  );
}

function getRoomTemplateSnapshotTotalCents(
  room: InteriorEstimateInput['rooms'][number]
) {
  return room.source_room_template_surface_prices_cents
    ? getRoomTemplateSurfaceSnapshotTotalCents(
        room.source_room_template_surface_prices_cents
      )
    : null;
}

export function snapshotInteriorEstimateInput(
  input: InteriorEstimateInput,
  userRates?: UserRateSettings | null
): InteriorEstimateInput {
  if (input.estimate_mode !== 'specific_areas') return input;

  const wallPaintSystem = input.wall_paint_system ?? 'repaint_2coat';
  const quantityScaleFactor = getQuantityScaleFactor(
    input.opening_items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return {
    ...input,
    rooms: input.rooms.map((room, roomIndex) => {
      assertSpecificAreaRoomHasSurface(room, roomIndex);
      const roomScope = getRoomScope(room);
      const savedTemplateSnapshot = hasSavedRoomTemplateSnapshot(room);
      const resolvedRoomPriceSource = !savedTemplateSnapshot && userRates
        ? resolveAdvancedRoomPriceSource(userRates, room)
        : null;
      const templateSource =
        resolvedRoomPriceSource?.ok && resolvedRoomPriceSource.kind === 'room_template'
          ? resolvedRoomPriceSource
          : null;
      const roomCondition = room.source_condition ?? input.condition;
      const roomWallPaintSystem =
        normalizeInteriorWallPaintSystem(room.source_wall_paint_system) ??
        wallPaintSystem;
      const roomTrimPaintSystem =
        room.source_trim_paint_system ?? input.trim_paint_system ?? 'oil_2coat';
      const coatingMultiplierPct =
        room.rate_snapshot_version === 1 &&
        typeof room.source_room_template_coating_multiplier_pct === 'number'
          ? room.source_room_template_coating_multiplier_pct
          : getRoomTemplateCoatingMultiplierPct(userRates, roomWallPaintSystem);
      const conditionMultiplierPct =
        room.rate_snapshot_version === 1 &&
        typeof room.source_room_template_condition_multiplier_pct === 'number'
          ? room.source_room_template_condition_multiplier_pct
          : getRoomTemplateConditionMultiplierPct(userRates, roomCondition);
      const anchor =
        templateSource
          ? templateSource.range_cents
          : savedTemplateSnapshot && room.source_anchor_range_cents
          ? room.source_anchor_range_cents
          : room.rate_snapshot_version === 1 && room.source_anchor_range_cents
          ? room.source_anchor_range_cents
          : getSpecificAreaRoomAnchor(
              input.property_type,
              room.anchor_room_type,
              userRates
            );
      const surfaceRateMultiplier =
        templateSource || savedTemplateSnapshot
          ? coatingMultiplierPct / 100
          : room.rate_snapshot_version === 1 &&
        typeof room.source_surface_rate_multiplier === 'number'
          ? room.source_surface_rate_multiplier
          : getSurfaceRateMultiplier(
              roomScope,
              roomWallPaintSystem,
              roomTrimPaintSystem,
              userRates
            );
      const scopeMultiplier =
        templateSource || savedTemplateSnapshot
          ? 1
          : room.rate_snapshot_version === 1 &&
        typeof room.source_scope_multiplier === 'number'
          ? room.source_scope_multiplier
          : getScopeMultiplier(roomScope);

      return {
        ...room,
        rate_snapshot_version: 1,
        ...(templateSource
          ? {
              source_room_template_id: templateSource.room_template_id,
              source_room_template_version:
                templateSource.room_template_version,
              source_room_template_label: templateSource.room_template_label,
              source_room_template_size: templateSource.size,
              source_room_template_surface_prices_cents:
                templateSource.surface_prices_cents,
              source_room_template_coating_multiplier_pct:
                coatingMultiplierPct,
              source_room_template_condition_multiplier_pct:
                conditionMultiplierPct,
            }
          : {}),
        source_anchor_range_cents: anchor,
        source_surface_rate_multiplier: surfaceRateMultiplier,
        source_scope_multiplier: scopeMultiplier,
        source_condition: roomCondition,
        source_wall_paint_system: roomWallPaintSystem,
        source_trim_paint_system: roomTrimPaintSystem,
      };
    }),
    opening_items: input.opening_items.map((item) => {
      if (item.opening_type === 'door') {
        const doorType = item.door_type ?? 'standard';
        const doorScope = item.door_scope ?? 'door_and_frame';
        return {
          ...item,
          rate_snapshot_version: 1,
          source_unit_price_cents:
            item.rate_snapshot_version === 1 &&
            typeof item.source_unit_price_cents === 'number'
              ? item.source_unit_price_cents
              : getDoorPrice(item.paint_system, doorScope, doorType, userRates),
          source_quantity_scale_factor:
            item.rate_snapshot_version === 1 &&
            typeof item.source_quantity_scale_factor === 'number'
              ? item.source_quantity_scale_factor
              : quantityScaleFactor,
        };
      }

      const windowType = item.window_type ?? 'normal';
      const windowScope = item.window_scope ?? 'window_and_frame';
      return {
        ...item,
        rate_snapshot_version: 1,
        source_unit_price_cents:
          item.rate_snapshot_version === 1 &&
          typeof item.source_unit_price_cents === 'number'
            ? item.source_unit_price_cents
            : getWindowPrice(
                item.paint_system,
                windowType,
                windowScope,
                userRates
              ),
        source_quantity_scale_factor:
          item.rate_snapshot_version === 1 &&
          typeof item.source_quantity_scale_factor === 'number'
            ? item.source_quantity_scale_factor
            : quantityScaleFactor,
      };
    }),
    trim_items: input.trim_items.map((item) => ({
      ...item,
      rate_snapshot_version: 1,
      source_unit_price_cents:
        item.rate_snapshot_version === 1 &&
        typeof item.source_unit_price_cents === 'number'
          ? item.source_unit_price_cents
          : getSkirtingPrice(item.paint_system),
    })),
  };
}

function calculateSpecificAreasEstimate(
  input: InteriorEstimateInput,
  userRates?: UserRateSettings | null
): InteriorPricingSnapshot {
  const storey_multiplier = 1;
  const quantityScaleFactor = getQuantityScaleFactor(
    input.opening_items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const wallPaintSystem = input.wall_paint_system ?? 'repaint_2coat';
  const defaultSurfaceRateMultiplier = getSurfaceRateMultiplier(
    input.scope,
    wallPaintSystem,
    input.trim_paint_system ?? 'oil_2coat',
    userRates
  );
  const pricing_items: InteriorPricingItem[] = [];
  let min = 0;
  let median = 0;
  let max = 0;

  input.rooms.forEach((room, roomIndex) => {
    assertSpecificAreaRoomHasSurface(room, roomIndex);
    const activeScope = getRoomScope(room);
    const roomCondition = room.source_condition ?? input.condition;
    const condition = getCondition(input.property_type, roomCondition);
    const conditionMedian = (condition.min_mult + condition.max_mult) / 2;
    const roomWallPaintSystem =
      normalizeInteriorWallPaintSystem(room.source_wall_paint_system) ??
      wallPaintSystem;
    const roomTrimPaintSystem =
      room.source_trim_paint_system ?? input.trim_paint_system ?? 'oil_2coat';
    const roomTemplateSnapshotTotal = getRoomTemplateSnapshotTotalCents(room);
    const usesRoomTemplateSource =
      roomTemplateSnapshotTotal != null || room.source_room_template_id != null;
    const resolvedRoomTemplateSource =
      usesRoomTemplateSource && userRates
        ? resolveAdvancedRoomPriceSource(userRates, room)
        : null;
    const roomTemplateSource =
      resolvedRoomTemplateSource?.ok &&
      resolvedRoomTemplateSource.kind === 'room_template'
        ? resolvedRoomTemplateSource
        : null;
    const scopeMultiplier = usesRoomTemplateSource
      ? 1
      : room.rate_snapshot_version === 1 &&
          typeof room.source_scope_multiplier === 'number'
        ? room.source_scope_multiplier
        : getScopeMultiplier(activeScope);
    const surfaceRateMultiplier = usesRoomTemplateSource
      ? (room.rate_snapshot_version === 1 &&
          typeof room.source_room_template_coating_multiplier_pct === 'number'
          ? room.source_room_template_coating_multiplier_pct
          : getRoomTemplateCoatingMultiplierPct(userRates, roomWallPaintSystem)) /
        100
      : room.rate_snapshot_version === 1 &&
          typeof room.source_surface_rate_multiplier === 'number'
        ? room.source_surface_rate_multiplier
        : getSurfaceRateMultiplier(
            activeScope,
            roomWallPaintSystem,
            roomTrimPaintSystem,
            userRates
          );
    const conditionMultiplier = usesRoomTemplateSource
      ? (room.rate_snapshot_version === 1 &&
          typeof room.source_room_template_condition_multiplier_pct === 'number'
          ? room.source_room_template_condition_multiplier_pct
          : getRoomTemplateConditionMultiplierPct(userRates, roomCondition)) /
        100
      : conditionMedian;
    const anchor =
      roomTemplateSnapshotTotal != null
        ? (room.source_anchor_range_cents ?? {
            min: roomTemplateSnapshotTotal,
            median: roomTemplateSnapshotTotal,
            max: roomTemplateSnapshotTotal,
          })
        : roomTemplateSource
          ? roomTemplateSource.range_cents
          : getRoomAnchorForCalculation(
              room,
              input.property_type,
              userRates
            );
    const medianSourceCents =
      roomTemplateSnapshotTotal ?? roomTemplateSource?.total_cents ?? anchor.median;
    const itemMedian = cap(
      medianSourceCents *
        scopeMultiplier *
        storey_multiplier *
        conditionMultiplier *
        surfaceRateMultiplier
    );
    min += cap(
      anchor.min *
        scopeMultiplier *
        storey_multiplier *
        (usesRoomTemplateSource ? conditionMultiplier : condition.min_mult) *
        surfaceRateMultiplier
    );
    median += itemMedian;
    max += cap(
      anchor.max *
        scopeMultiplier *
        storey_multiplier *
        (usesRoomTemplateSource ? conditionMultiplier : condition.max_mult) *
        surfaceRateMultiplier
    );
    pricing_items.push({
      category: 'room_anchor',
      label: room.name || room.anchor_room_type,
      quantity: 1,
      unit: 'room',
      unit_price_cents: itemMedian,
      total_cents: itemMedian,
      room_index: roomIndex,
      metadata: {
        anchor_room_type: room.anchor_room_type,
        include_walls: room.include_walls,
        include_ceiling: room.include_ceiling,
        include_trim: room.include_trim,
        source_rate_item_id: room.source_rate_item_id ?? null,
        source_rate_item_version: room.source_rate_item_version ?? null,
        source_rate_item_label: room.source_rate_item_label ?? null,
        source_room_template_id: room.source_room_template_id ?? null,
        source_room_template_version:
          room.source_room_template_version ?? null,
        source_room_template_label: room.source_room_template_label ?? null,
        source_room_template_size: room.source_room_template_size ?? null,
        source_room_template_surface_walls_cents:
          room.source_room_template_surface_prices_cents?.walls_cents ?? null,
        source_room_template_surface_ceiling_cents:
          room.source_room_template_surface_prices_cents?.ceiling_cents ?? null,
        source_room_template_surface_trim_cents:
          room.source_room_template_surface_prices_cents?.trim_cents ?? null,
        source_room_template_coating_multiplier_pct:
          room.source_room_template_coating_multiplier_pct ?? null,
        source_room_template_condition_multiplier_pct:
          room.source_room_template_condition_multiplier_pct ?? null,
        rate_snapshot_version: room.rate_snapshot_version ?? null,
        source_anchor_range_min_cents: anchor.min,
        source_anchor_range_median_cents: anchor.median,
        source_anchor_range_max_cents: anchor.max,
        surface_rate_multiplier: Number(surfaceRateMultiplier.toFixed(3)),
        source_surface_rate_multiplier: Number(
          surfaceRateMultiplier.toFixed(3)
        ),
        source_scope_multiplier: Number(scopeMultiplier.toFixed(3)),
        source_condition: roomCondition,
        source_wall_paint_system: roomWallPaintSystem,
        source_trim_paint_system: roomTrimPaintSystem,
      },
    });
  });

  let usedCustomUnitRates = false;

  input.opening_items.forEach((item) => {
    if (item.opening_type === 'door') {
      const doorType = item.door_type ?? 'standard';
      const doorScope = item.door_scope ?? 'door_and_frame';
      const rawPrice = getDoorPrice(
        item.paint_system,
        doorScope,
        doorType,
        userRates
      );
      const snapshotRawPrice =
        item.rate_snapshot_version === 1 &&
        typeof item.source_unit_price_cents === 'number'
          ? item.source_unit_price_cents
          : rawPrice;
      const snapshotQuantityScaleFactor =
        item.rate_snapshot_version === 1 &&
        typeof item.source_quantity_scale_factor === 'number'
          ? item.source_quantity_scale_factor
          : quantityScaleFactor;
      const unit = cap(snapshotRawPrice * snapshotQuantityScaleFactor);
      const total = cap(unit * item.quantity);
      min += total;
      median += total;
      max += total;
      if (
        isDoorPriceCustomized(
          snapshotRawPrice,
          item.paint_system,
          doorScope,
          doorType
        )
      ) {
        usedCustomUnitRates = true;
      }
      pricing_items.push({
        category: 'door',
        label: `${INTERIOR_DOOR_TYPE_LABELS[doorType]} ${INTERIOR_DOOR_SCOPE_LABELS[doorScope]}`,
        quantity: item.quantity,
        unit: 'item',
        unit_price_cents: unit,
        total_cents: total,
        room_index: item.room_index ?? null,
        metadata: {
          paint_system: item.paint_system,
          rate_snapshot_version: item.rate_snapshot_version ?? null,
          source_unit_price_cents: snapshotRawPrice,
          quantity_scale_factor: snapshotQuantityScaleFactor,
        },
      });
      return;
    }

    const windowType = item.window_type ?? 'normal';
    const windowScope = item.window_scope ?? 'window_and_frame';
    const rawPrice = getWindowPrice(
      item.paint_system,
      windowType,
      windowScope,
      userRates
    );
    const snapshotRawPrice =
      item.rate_snapshot_version === 1 &&
      typeof item.source_unit_price_cents === 'number'
        ? item.source_unit_price_cents
        : rawPrice;
    const snapshotQuantityScaleFactor =
      item.rate_snapshot_version === 1 &&
      typeof item.source_quantity_scale_factor === 'number'
        ? item.source_quantity_scale_factor
        : quantityScaleFactor;
    const unit = cap(snapshotRawPrice * snapshotQuantityScaleFactor);
    const total = cap(unit * item.quantity);
    min += total;
    median += total;
    max += total;
    if (
      isWindowPriceCustomized(
        snapshotRawPrice,
        item.paint_system,
        windowType,
        windowScope
      )
    ) {
      usedCustomUnitRates = true;
    }
    pricing_items.push({
      category: 'window',
      label: `${INTERIOR_WINDOW_TYPE_LABELS[windowType]} ${INTERIOR_WINDOW_SCOPE_LABELS[windowScope]}`,
      quantity: item.quantity,
      unit: 'item',
      unit_price_cents: unit,
      total_cents: total,
      room_index: item.room_index ?? null,
        metadata: {
          paint_system: item.paint_system,
          rate_snapshot_version: item.rate_snapshot_version ?? null,
          source_unit_price_cents: snapshotRawPrice,
          quantity_scale_factor: snapshotQuantityScaleFactor,
        },
      });
  });

  input.trim_items.forEach((item) => {
    const unit =
      item.rate_snapshot_version === 1 &&
      typeof item.source_unit_price_cents === 'number'
        ? item.source_unit_price_cents
        : getSkirtingPrice(item.paint_system);
    const total = cap(unit * item.quantity);
    min += total;
    median += total;
    max += total;
    pricing_items.push({
      category: 'trim',
      label: 'Skirting / Trim',
      quantity: item.quantity,
      unit: 'linear_metre',
      unit_price_cents: unit,
      total_cents: total,
      room_index: item.room_index ?? null,
      metadata: {
        paint_system: item.paint_system,
        rate_snapshot_version: item.rate_snapshot_version ?? null,
        source_unit_price_cents: unit,
      },
    });
  });

  return buildSnapshot(
    input,
    { min, median, max },
    {
      scope_multiplier: 1,
      storey_multiplier,
      quantity_scale_factor: quantityScaleFactor,
      surface_rate_multiplier: defaultSurfaceRateMultiplier,
    },
    pricing_items,
    usedCustomUnitRates ? 'mixed' : 'anchor'
  );
}

export function calculateInteriorEstimate(
  input: InteriorEstimateInput,
  userRates?: UserRateSettings | null
): InteriorPricingSnapshot {
  if (
    input.estimate_mode === 'entire_property' &&
    input.property_type === 'apartment'
  )
    return calculateEntireApartmentEstimate(input, userRates);
  if (
    input.estimate_mode === 'entire_property' &&
    input.property_type === 'house'
  )
    return calculateEntireHouseEstimate(input, userRates);
  return calculateSpecificAreasEstimate(input, userRates);
}
