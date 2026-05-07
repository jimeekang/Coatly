import { DEFAULT_COVERAGE_PER_LITRE, STANDARD_DOOR_AREA_M2, STANDARD_WINDOW_AREA_M2 } from '@/config/constants';
import type { DayRateInputs, RoomRateInputs, ManualInputs, QuickInputs, SelectedQuickRoom } from '@/types/quote';
import type { RoomRatePreset, UserRateSettings } from '@/lib/rate-settings';

/**
 * Calculate total wall area for a rectangular room (4 walls).
 * @param lengthM - Room length in metres
 * @param widthM - Room width in metres
 * @param heightM - Room height in metres
 * @returns Wall area in sqm
 */
export function calculateWallArea(lengthM: number, widthM: number, heightM: number): number {
  return 2 * (lengthM + widthM) * heightM;
}

/**
 * Subtract standard door and window openings from a wall area.
 * @param wallAreaM2 - Total wall area in sqm
 * @param doorCount - Number of standard doors
 * @param windowCount - Number of standard windows
 * @returns Net paintable area in sqm
 */
export function subtractOpenings(
  wallAreaM2: number,
  doorCount: number,
  windowCount: number
): number {
  const deduction = doorCount * STANDARD_DOOR_AREA_M2 + windowCount * STANDARD_WINDOW_AREA_M2;
  return Math.max(0, wallAreaM2 - deduction);
}

/**
 * Calculate litres of paint required for a given area.
 * @param areaM2 - Area to paint in sqm
 * @param coats - Number of coats
 * @param coveragePerLitre - sqm covered per litre (default: 12sqm/L)
 * @returns Litres required (rounded up to nearest 0.5L)
 */
export function calculatePaintLitres(
  areaM2: number,
  coats: number = 1,
  coveragePerLitre: number = DEFAULT_COVERAGE_PER_LITRE
): number {
  const rawLitres = (areaM2 * coats) / coveragePerLitre;
  // Round up to nearest 0.5L for practical purchasing
  return Math.ceil(rawLitres * 2) / 2;
}

/**
 * Calculate ceiling area from room dimensions.
 * @param lengthM - Room length in metres
 * @param widthM - Room width in metres
 * @returns Ceiling area in m²
 */
export function calculateCeilingArea(lengthM: number, widthM: number): number {
  return lengthM * widthM;
}

// ─── Pricing method calculators ───────────────────────────────────────────────

export interface PricingResult {
  /** Pre-GST total in AUD cents */
  subtotal_cents: number;
  /** GST (10%) in AUD cents */
  gst_cents: number;
  /** Total inc-GST in AUD cents */
  total_cents: number;
  /** Labour portion in AUD cents (pre-GST) */
  labor_cents: number;
  /** Material portion in AUD cents (pre-GST) */
  material_cents: number;
}

/**
 * Calculate quote price using the day_rate method.
 * total = (days × daily_rate) + materials
 */
export function calculateDayRateQuote(inputs: DayRateInputs): PricingResult {
  const labor_cents = Math.round(inputs.days * inputs.daily_rate_cents);

  let material_cents: number;
  if (inputs.material_method === 'percentage') {
    const pct = inputs.material_percent ?? 30;
    material_cents = Math.round(labor_cents * (pct / 100));
  } else {
    material_cents = inputs.material_flat_cents ?? 0;
  }

  const subtotal_cents = labor_cents + material_cents;
  const gst_cents = Math.round(subtotal_cents * 0.1);
  const total_cents = subtotal_cents + gst_cents;

  return { subtotal_cents, gst_cents, total_cents, labor_cents, material_cents };
}

/** Room type baseline rates in AUD cents (pre-GST) by size */
const ROOM_RATE_BASELINES: Record<
  'bedroom' | 'bathroom' | 'living' | 'kitchen' | 'hallway' | 'other',
  Record<'small' | 'medium' | 'large', number>
> = {
  bedroom: { small: 35000, medium: 45000, large: 60000 },
  bathroom: { small: 30000, medium: 40000, large: 55000 },
  living:   { small: 45000, medium: 60000, large: 80000 },
  kitchen:  { small: 30000, medium: 42000, large: 58000 },
  hallway:  { small: 20000, medium: 30000, large: 42000 },
  other:    { small: 28000, medium: 38000, large: 52000 },
};

/**
 * Suggested baseline rate for a room (AUD cents, pre-GST).
 * Checks user presets first (by matching room type name), then falls back to ROOM_RATE_BASELINES.
 * Used to pre-fill the room_rate form.
 */
export function getRoomRateBaseline(
  roomType: keyof typeof ROOM_RATE_BASELINES,
  size: 'small' | 'medium' | 'large',
  userPresets?: RoomRatePreset[]
): number {
  if (userPresets?.length) {
    const match = userPresets.find(
      (p) => p.title.toLowerCase().includes(roomType.toLowerCase())
    );
    if (match) return match.rate_cents;
  }
  return ROOM_RATE_BASELINES[roomType]?.[size] ?? 35000;
}

/**
 * Calculate quote price using the room_rate method.
 * total = Σ per-room flat rates
 */
export function calculateRoomRateQuote(inputs: RoomRateInputs): PricingResult {
  const subtotal_cents = inputs.rooms.reduce((sum, r) => sum + r.rate_cents, 0);
  // Assume 68/32 labour/material split (same as sqm method default)
  const labor_cents = Math.round(subtotal_cents * 0.68);
  const material_cents = subtotal_cents - labor_cents;
  const gst_cents = Math.round(subtotal_cents * 0.1);
  const total_cents = subtotal_cents + gst_cents;

  return { subtotal_cents, gst_cents, total_cents, labor_cents, material_cents };
}

// ─── Quick Estimate calculator ────────────────────────────────────────────────

export interface QuickEstimateRoomResult {
  room_id: string;
  label: string;
  size: 'small' | 'medium' | 'large';
  selected_surfaces: ('walls' | 'ceiling' | 'trim')[];
  notes?: string;
  walls_cents: number;
  ceiling_cents: number;
  trim_cents: number;
  base_subtotal_cents: number;
  coating_multiplier_pct: number;
  condition_multiplier_pct: number;
  total_cents: number;
}

export interface QuickEstimateResult extends PricingResult {
  rooms: QuickEstimateRoomResult[];
}

/**
 * Calculate quote price using the detailed_quick method.
 * Per-room: surface prices × (coating_pct/100) × (condition_pct/100).
 * GST and labour/material split use the painter's pricing settings.
 */
export function calculateQuickEstimate(
  inputs: QuickInputs,
  rateSettings: UserRateSettings
): QuickEstimateResult {
  const { coating_multipliers, condition_multipliers } = rateSettings.quick_estimate;

  const coatingPct =
    inputs.global_coating === 'one_coat_refresh'
      ? coating_multipliers.one_coat_refresh_pct
      : inputs.global_coating === 'three_coats_new_plaster'
        ? coating_multipliers.three_coats_new_plaster_pct
        : coating_multipliers.two_coats_repaint_pct;

  const conditionPct =
    inputs.global_condition === 'good'
      ? condition_multipliers.good_pct
      : inputs.global_condition === 'poor'
        ? condition_multipliers.poor_pct
        : condition_multipliers.average_pct;

  const rooms: QuickEstimateRoomResult[] = inputs.rooms.map((room) => {
    const template = rateSettings.quick_estimate.rooms.find(
      (r) => r.id === room.room_id
    );
    const sizeRates = template?.sizes[room.size] ?? {
      walls_cents: room.walls_cents,
      ceiling_cents: room.ceiling_cents,
      trim_cents: room.trim_cents,
    };

    const walls_cents = sizeRates.walls_cents;
    const ceiling_cents = sizeRates.ceiling_cents;
    const trim_cents = sizeRates.trim_cents;

    const base_subtotal_cents =
      (room.selected_surfaces.includes('walls') ? walls_cents : 0) +
      (room.selected_surfaces.includes('ceiling') ? ceiling_cents : 0) +
      (room.selected_surfaces.includes('trim') ? trim_cents : 0);

    const total_cents = Math.round(
      base_subtotal_cents * (coatingPct / 100) * (conditionPct / 100)
    );

    return {
      room_id: room.room_id,
      label: room.label,
      size: room.size,
      selected_surfaces: room.selected_surfaces,
      notes: room.notes,
      walls_cents,
      ceiling_cents,
      trim_cents,
      base_subtotal_cents,
      coating_multiplier_pct: coatingPct,
      condition_multiplier_pct: conditionPct,
      total_cents,
    };
  });

  const subtotal_cents = rooms.reduce((sum, r) => sum + r.total_cents, 0);
  const labourSharePct = rateSettings.pricing.material_cost_percent;
  const labor_cents = Math.round(subtotal_cents * (1 - labourSharePct / 100));
  const material_cents = subtotal_cents - labor_cents;
  const gst_cents = Math.round(subtotal_cents * 0.1);
  const total_cents = subtotal_cents + gst_cents;

  return { subtotal_cents, gst_cents, total_cents, labor_cents, material_cents, rooms };
}

/**
 * Calculate quote price using the manual method.
 * User directly inputs labour and material costs.
 */
export function calculateManualQuote(inputs: ManualInputs): PricingResult {
  const labor_cents = inputs.labor_cents;
  const material_cents = inputs.material_cents;
  const subtotal_cents = labor_cents + material_cents;
  const gst_cents = Math.round(subtotal_cents * 0.1);
  const total_cents = subtotal_cents + gst_cents;

  return { subtotal_cents, gst_cents, total_cents, labor_cents, material_cents };
}
