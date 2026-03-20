import type { SurfaceType, CoatingType } from '@/config/paint-rates';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'expired';
export type RateTier = 'good' | 'better' | 'best';

export interface QuoteRoomSurface {
  id: string;
  room_id: string;
  surface_type: SurfaceType;
  /** Paintable area in m² after deductions */
  area_m2: number;
  coating_type: CoatingType;
  /** Rate in AUD cents per m² */
  rate_per_sqm: number;
  /** Calculated price in AUD cents (ex-GST) */
  price_cents: number;
  /** Estimated litres of paint required */
  paint_litres: number;
  rate_tier: RateTier;
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
  /** Whether this quote offers Good/Better/Best tier options */
  has_tiers: boolean;
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
