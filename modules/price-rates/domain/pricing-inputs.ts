import type {
  InteriorDoorScope,
  InteriorDoorType,
  InteriorWindowScope,
  InteriorWindowType,
} from '@/modules/price-rates/domain/paint-openings';

/**
 * Structural copies of the quote-pricing input contracts that Price Rates
 * depends on. Price Rates owns its own input contract so that the dependency
 * direction stays one-way (quotes → price-rates); nothing in price-rates/domain
 * imports quotes/domain. These unions/shapes are structurally identical to the
 * canonical quote domain types, so real quote inputs remain assignable here.
 */

// ─── Pricing method ───────────────────────────────────────────────────────────

export type PricingMethod =
  | 'day_rate'
  | 'sqm_rate'
  | 'room_rate'
  | 'manual'
  | 'hybrid'
  | 'detailed_quick';

// ─── Quick Estimate property enums ────────────────────────────────────────────

export type QuickPropertyType = 'apartment' | 'house';
export type QuickApartmentType =
  | 'studio'
  | '1_bedroom'
  | '2_bedroom_standard'
  | '2_bedroom_large'
  | '3_bedroom';
export type QuickStoreys = '1_storey' | '2_storey' | '3_storey';
export type QuickPropertyCondition = 'excellent' | 'fair' | 'poor';
export type QuickPropertyScope = 'walls' | 'ceiling' | 'trim';
export type QuickPropertyWallPaintSystem =
  | 'refresh_1coat'
  | 'repaint_2coat'
  | 'new_plaster_3coat';
export type QuickTrimPaintSystem = 'oil_2coat' | 'water_3coat_white_finish';

export type QuickSurfacePriceShare = {
  walls_pct: number;
  ceiling_pct: number;
  trim_pct: number;
};

export type QuickRoomSizeInput = 'small' | 'medium' | 'large';

// ─── Selected Quick Estimate inputs ───────────────────────────────────────────

export interface SelectedQuickRoom {
  room_id: string;
  source_rate_item_id?: string;
  source_rate_item_version?: number;
  source_rate_item_label?: string;
  rate_snapshot_version?: 1;
  label: string;
  size: QuickRoomSizeInput;
  selected_surfaces: ('walls' | 'ceiling' | 'trim')[];
  trim_paint_system?: QuickTrimPaintSystem;
  notes?: string;
  walls_cents: number;
  ceiling_cents: number;
  trim_cents: number;
  coating_multiplier_pct: number;
  condition_multiplier_pct: number;
  total_cents: number;
}

export interface SelectedQuickPropertyPreset {
  estimate_category?: 'interior';
  preset_id: string;
  source_rate_item_id?: string;
  source_rate_item_version?: number;
  source_rate_item_label?: string;
  rate_snapshot_version?: 1;
  label: string;
  property_type: QuickPropertyType;
  apartment_type?: QuickApartmentType | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  storeys?: QuickStoreys | null;
  sqm?: number | null;
  condition: QuickPropertyCondition;
  scope: QuickPropertyScope[];
  surface_price_share?: QuickSurfacePriceShare;
  wall_paint_system: QuickPropertyWallPaintSystem;
  trim_paint_system?: QuickTrimPaintSystem;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
}

export interface QuickInputs {
  property_preset?: SelectedQuickPropertyPreset | null;
  rooms: SelectedQuickRoom[];
  global_coating:
    | 'one_coat_refresh'
    | 'two_coats_repaint'
    | 'three_coats_new_plaster';
  global_condition: 'good' | 'average' | 'poor';
  global_trim_paint_system?: QuickTrimPaintSystem;
}

// ─── Advanced (interior) estimate diagnostics input ───────────────────────────

type DiagRangeCents = { min: number; median: number; max: number };

type DiagSurfacePriceSnapshot = {
  walls_cents: number;
  ceiling_cents: number;
  trim_cents: number;
  trim_oil_cents?: number;
  trim_water_cents?: number;
  wall_area_m2?: number;
  ceiling_area_m2?: number;
  trim_linear_m?: number;
};

/**
 * Structural mirror of the interior estimate input that the advanced-rate
 * diagnostics read. Structurally identical to the canonical quotes/domain
 * `InteriorEstimateInput`, so real interior estimates remain assignable.
 */
export type AdvancedEstimateDiagnosticsInput = {
  property_type: QuickPropertyType;
  estimate_mode: 'entire_property' | 'specific_areas';
  condition: QuickPropertyCondition;
  scope: QuickPropertyScope[];
  surface_price_share?: QuickSurfacePriceShare;
  wall_paint_system?: QuickPropertyWallPaintSystem;
  trim_paint_system?: QuickTrimPaintSystem;
  property_details: {
    apartment_type?: QuickApartmentType | null;
    sqm?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    storeys?: QuickStoreys | null;
  };
  rooms: Array<{
    name: string;
    anchor_room_type: string;
    room_type: 'interior' | 'exterior';
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    pricing_model?: 'anchor' | 'measured';
    wall_area_m2?: number | null;
    ceiling_area_m2?: number | null;
    trim_linear_m?: number | null;
    include_walls: boolean;
    include_ceiling: boolean;
    include_trim: boolean;
    source_rate_item_id?: string;
    source_rate_item_version?: number;
    source_rate_item_label?: string;
    source_room_template_id?: string;
    source_room_template_version?: number;
    source_room_template_label?: string;
    source_room_template_size?: QuickRoomSizeInput;
    source_room_template_surface_prices_cents?: DiagSurfacePriceSnapshot;
    source_room_template_coating_multiplier_pct?: number;
    source_room_template_condition_multiplier_pct?: number;
    rate_snapshot_version?: 1;
    source_anchor_range_cents?: DiagRangeCents;
    source_wall_rate_cents_per_m2?: number;
    source_ceiling_rate_cents_per_m2?: number;
    source_trim_rate_cents_per_m?: number;
    source_condition_multiplier_pct?: number;
    source_surface_rate_multiplier?: number;
    source_scope_multiplier?: number;
    source_condition?: QuickPropertyCondition;
    source_wall_paint_system?: QuickPropertyWallPaintSystem;
    source_trim_paint_system?: QuickTrimPaintSystem;
  }>;
  opening_items: Array<{
    opening_type: 'door' | 'window';
    paint_system: QuickTrimPaintSystem;
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
    paint_system: QuickTrimPaintSystem;
    quantity: number;
    room_index: number | null;
    rate_snapshot_version?: 1;
    source_unit_price_cents?: number;
  }>;
};
