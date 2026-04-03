import type { SurfaceType, CoatingType } from '@/config/paint-rates';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type ComplexityLevel = 'standard' | 'moderate' | 'complex';

// ─── Pricing Method ───────────────────────────────────────────────────────────

export type PricingMethod = 'day_rate' | 'sqm_rate' | 'room_rate' | 'manual' | 'hybrid';

/** Inputs for day_rate method: labour days × daily rate + materials */
export interface DayRateInputs {
  days: number;
  daily_rate_cents: number;
  material_method: 'percentage' | 'flat';
  /** Used when material_method = 'percentage'. Integer 0–100. */
  material_percent?: number;
  /** Used when material_method = 'flat'. AUD cents. */
  material_flat_cents?: number;
}

/** Inputs for room_rate method: flat rate per room type/size */
export interface RoomRateItem {
  name: string;
  room_type: 'bedroom' | 'bathroom' | 'living' | 'kitchen' | 'hallway' | 'other';
  size: 'small' | 'medium' | 'large';
  rate_cents: number;
}

export interface RoomRateInputs {
  rooms: RoomRateItem[];
}

/** Inputs for manual method: direct total input */
export interface ManualInputs {
  labor_cents: number;
  material_cents: number;
}

/** Union of all method-specific inputs */
export type PricingMethodInputs =
  | { method: 'day_rate'; inputs: DayRateInputs }
  | { method: 'room_rate'; inputs: RoomRateInputs }
  | { method: 'manual'; inputs: ManualInputs }
  | { method: 'sqm_rate'; inputs: null }
  | { method: 'hybrid'; inputs: null };

export interface QuoteRoomSurface {
  id: string;
  room_id: string;
  surface_type: SurfaceType;
  /** Paintable area in sqm after deductions */
  area_m2: number;
  coating_type: CoatingType;
  /** Rate in AUD cents per sqm */
  rate_per_sqm: number;
  /** Calculated price in AUD cents (ex-GST) */
  price_cents: number;
  /** Estimated litres of paint required */
  paint_litres: number;
  complexity: ComplexityLevel;
}

export interface QuoteRoom {
  id: string;
  quote_id: string;
  name: string;
  /** Room length in metres */
  length_m: number;
  /** Room width in metres */
  width_m: number;
  /** Ceiling height in metres */
  height_m: number;
  /** Number of doors (for area deduction) */
  door_count: number;
  /** Number of windows (for area deduction) */
  window_count: number;
  /** Total wall area after deductions (m²) */
  wall_area_m2: number;
  /** Ceiling area (m²) */
  ceiling_area_m2: number;
  surfaces: QuoteRoomSurface[];
  /** Room total in AUD cents (ex-GST) */
  total_cents: number;
}

export interface Quote {
  id: string;
  user_id: string;
  customer_id: string;
  /** Sequential quote number e.g. Q-0042 */
  quote_number: string;
  status: QuoteStatus;
  /** Quote title / job description */
  title: string;
  /** Optional notes for customer */
  notes: string | null;
  /** Internal notes (not shown on PDF) */
  internal_notes: string | null;
  rooms: QuoteRoom[];
  /** Whether this quote offers complexity-based pricing options */
  has_complexity_options: boolean;
  /** Pricing calculation method used to produce this quote */
  pricing_method: PricingMethod;
  /** Raw inputs used for the selected pricing_method (internal, not on PDF) */
  pricing_method_inputs: PricingMethodInputs | null;
  /** Subtotal in AUD cents (ex-GST) */
  subtotal_cents: number;
  /** GST amount in AUD cents */
  gst_cents: number;
  /** Total in AUD cents (inc-GST) */
  total_cents: number;
  /** Date quote expires (ISO string) */
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'rooms'>;
export type QuoteUpdate = Partial<Omit<Quote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'rooms'>>;

/** Full quote with joined customer data for display */
export interface QuoteWithCustomer extends Quote {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}
