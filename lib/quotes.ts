import {
  PAINT_RATES,
  SURFACE_TYPE_LABELS,
  COATING_TYPE_LABELS,
} from '@/config/paint-rates';
import {
  getRatePerM2Cents,
  type RatePresetSurfaceType,
  type UserRateSettings,
} from '@/lib/rate-settings';
import {
  normalizeInteriorWallPaintSystem,
  type InteriorEstimateInput as NormalizedInteriorEstimateInput,
} from '@/lib/interior-estimates';
import {
  quoteCreateSchema,
  type InteriorEstimate,
  type QuoteCreateInput,
  type QuoteLineItemFormInput,
  type QuoteSurface,
} from '@/lib/supabase/validators';
import type { PricingMethod, PricingMethodInputs } from '@/types/quote';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type QuoteComplexity = 'standard' | 'moderate' | 'complex';
export type QuoteRoomType = 'interior' | 'exterior';
export type QuoteSurfaceType = 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
export type QuoteEstimateCategory = 'manual' | 'interior';
export type QuoteEstimateItemCategory =
  | 'entire_property'
  | 'room'
  | 'door'
  | 'window'
  | 'skirting'
  | 'modifier';
export type QuoteCoatingType =
  | 'refresh_1coat'
  | 'repaint_2coat'
  | 'new_plaster_3coat'
  | 'stain'
  | 'specialty';
export type QuoteCoatingTypeDb =
  | 'touch_up_1coat'
  | QuoteCoatingType;

export type QuoteCustomerOption = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  emails?: string[];
  phone: string | null;
  address: string | null;
  properties?: QuoteCustomerPropertyOption[];
};

export type QuoteCustomerPropertyOption = {
  label: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  notes: string;
  address: string | null;
};

export type QuoteSurfaceDraft = {
  id: string;
  room_id: string;
  surface_type: QuoteSurfaceType;
  area_m2: number;
  coating_type: QuoteCoatingType;
  rate_per_m2_cents: number;
  material_cost_cents: number;
  labour_cost_cents: number;
  paint_litres_needed: number | null;
  notes: string | null;
  total_cents: number;
};

export type QuoteRoomDraft = {
  id: string;
  quote_id: string;
  name: string;
  room_type: QuoteRoomType;
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  total_cents: number;
  surfaces: QuoteSurfaceDraft[];
};

export type QuoteCustomerSummary = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type QuoteCustomerSource = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
};

export type QuoteEstimateItemDraft = {
  id: string;
  quote_id: string;
  category: QuoteEstimateItemCategory;
  label: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type QuoteLineItemRecord = {
  id: string;
  quote_id: string;
  material_item_id: string | null;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  is_optional: boolean;
  is_selected: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type QuotePricedLineItem =
  | Pick<
      QuoteLineItemRecord,
      'quantity' | 'unit_price_cents' | 'total_cents' | 'is_optional' | 'is_selected'
    >
  | Pick<
      QuoteLineItemFormInput,
      'quantity' | 'unit_price_cents' | 'is_optional' | 'is_selected'
    >;

export function isQuoteLineItemIncluded(item: {
  is_optional?: boolean | null;
  is_selected?: boolean | null;
}) {
  return !item.is_optional || item.is_selected !== false;
}

export function calculateQuoteLineItemTotalCents(item: QuotePricedLineItem) {
  if ('total_cents' in item && typeof item.total_cents === 'number') {
    return item.total_cents;
  }

  return Math.round(item.quantity * item.unit_price_cents);
}

export function calculateQuoteLineItemsSubtotal(items: QuotePricedLineItem[] = []) {
  return items.reduce((sum, item) => {
    if (!isQuoteLineItemIncluded(item)) {
      return sum;
    }

    return sum + calculateQuoteLineItemTotalCents(item);
  }, 0);
}

export function composeQuoteTotals({
  base_subtotal_cents,
  adjustment_cents = 0,
  discount_cents = 0,
  line_items = [],
}: {
  base_subtotal_cents: number;
  adjustment_cents?: number;
  discount_cents?: number;
  line_items?: QuotePricedLineItem[];
}) {
  const line_items_subtotal_cents = calculateQuoteLineItemsSubtotal(line_items);
  const subtotal_cents = base_subtotal_cents + line_items_subtotal_cents;
  const discounted_subtotal_cents = Math.max(0, subtotal_cents - discount_cents);
  const gst_cents = Math.round(discounted_subtotal_cents * 0.1);

  return {
    line_items_subtotal_cents,
    subtotal_cents,
    gst_cents,
    total_cents: discounted_subtotal_cents + gst_cents + adjustment_cents,
  };
}

export function calculateDepositCents(total_cents: number, deposit_percent: number) {
  if (deposit_percent <= 0) return 0;
  return Math.round(total_cents * deposit_percent / 100);
}

export type QuoteListItem = {
  id: string;
  user_id: string;
  customer_id: string;
  quote_number: string;
  title: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  complexity: QuoteComplexity | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  estimate_category: QuoteEstimateCategory;
  created_at: string;
  updated_at: string;
  customer: QuoteCustomerSummary;
  room_count: number;
  surface_count: number;
};

export type QuoteDetail = {
  id: string;
  user_id: string;
  customer_id: string;
  public_share_token: string;
  approved_at: string | null;
  approved_by_name: string | null;
  approved_by_email: string | null;
  approval_signature: string | null;
  quote_number: string;
  title: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  complexity: QuoteComplexity | null;
  working_days: number | null;
  notes: string | null;
  internal_notes: string | null;
  labour_margin_percent: number;
  material_margin_percent: number;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  discount_cents: number;
  deposit_percent: number;
  estimate_category: QuoteEstimateCategory;
  property_type: 'apartment' | 'house' | null;
  estimate_mode: 'entire_property' | 'specific_areas' | null;
  estimate_context: Record<string, unknown>;
  pricing_snapshot: Record<string, unknown>;
  pricing_method: PricingMethod;
  pricing_method_inputs: PricingMethodInputs | null;
  linked_invoice_count: number;
  has_linked_invoices: boolean;
  created_at: string;
  updated_at: string;
  customer: QuoteCustomerSummary;
  rooms: QuoteRoomDraft[];
  estimate_items: QuoteEstimateItemDraft[];
  line_items: QuoteLineItemRecord[];
};

export type PublicQuoteSurface = Pick<
  QuoteSurfaceDraft,
  'id' | 'surface_type' | 'area_m2' | 'coating_type' | 'rate_per_m2_cents' | 'notes' | 'total_cents'
>;

export type PublicQuoteRoom = Pick<
  QuoteRoomDraft,
  'id' | 'name' | 'room_type' | 'total_cents'
> & {
  surfaces: PublicQuoteSurface[];
};

export type PublicQuoteEstimateItem = Pick<
  QuoteEstimateItemDraft,
  'id' | 'category' | 'label' | 'quantity' | 'unit' | 'unit_price_cents' | 'total_cents'
>;

export type PublicQuoteLineItem = Pick<
  QuoteLineItemRecord,
  'id' | 'name' | 'category' | 'unit' | 'quantity' | 'unit_price_cents' | 'total_cents' | 'notes' | 'is_optional' | 'is_selected'
>;

export type PublicQuoteDetail = {
  approved_at: string | null;
  approved_by_name: string | null;
  approved_by_email: string | null;
  approval_signature: string | null;
  quote_number: string;
  title: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  working_days: number | null;
  customer: QuoteCustomerSummary;
  rooms: PublicQuoteRoom[];
  estimate_items: PublicQuoteEstimateItem[];
  line_items: PublicQuoteLineItem[];
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const SYDNEY_TIME_ZONE = 'Australia/Sydney';

export function formatQuoteCustomerPropertyAddress({
  address_line1,
  address_line2,
  city,
  state,
  postcode,
}: Pick<
  QuoteCustomerPropertyOption,
  'address_line1' | 'address_line2' | 'city' | 'state' | 'postcode'
>) {
  return [address_line1, address_line2, city, state, postcode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ') || null;
}

function getSydneyIsoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

export function isQuoteExpired(validUntil: string | null | undefined, now = new Date()) {
  if (!validUntil) return false;

  const normalizedValidUntil = validUntil.slice(0, 10);
  return normalizedValidUntil < getSydneyIsoDate(now);
}

function normalizeQuoteStatus(status: QuoteStatus | string): QuoteStatus {
  switch (status) {
    case 'draft':
    case 'sent':
    case 'approved':
    case 'rejected':
    case 'expired':
      return status;
    case 'accepted':
      return 'approved';
    case 'declined':
      return 'rejected';
    default:
      return 'draft';
  }
}

export function resolveQuoteStatus(
  quote: Pick<{ status: QuoteStatus | string; valid_until: string | null }, 'status' | 'valid_until'>,
  now = new Date()
): QuoteStatus {
  const status = normalizeQuoteStatus(quote.status);

  if (status === 'approved' || status === 'rejected' || status === 'expired') {
    return status;
  }

  return isQuoteExpired(quote.valid_until, now) ? 'expired' : status;
}

export const COMPLEXITY_LABELS: Record<QuoteComplexity, string> = {
  standard: 'Standard',
  moderate: 'Moderate',
  complex: 'Complex',
};

export const QUOTE_SURFACE_LABELS: Record<QuoteSurfaceType, string> = {
  walls: SURFACE_TYPE_LABELS.walls,
  ceiling: SURFACE_TYPE_LABELS.ceiling,
  trim: SURFACE_TYPE_LABELS.trim,
  doors: SURFACE_TYPE_LABELS.doors,
  windows: SURFACE_TYPE_LABELS.windows,
};

export const QUOTE_COATING_LABELS: Record<QuoteCoatingType, string> = {
  refresh_1coat: 'Refresh (1 coat)',
  repaint_2coat: COATING_TYPE_LABELS.repaint_2coat,
  new_plaster_3coat: COATING_TYPE_LABELS.new_plaster_3coat,
  stain: 'Stain / Sealer',
  specialty: 'Specialty Finish',
};

/** Labour complexity multiplier applied on top of base rate.
 * standard = normal conditions (easy access, good surfaces)
 * moderate = some challenges (2-storey, minor prep, tight spaces)
 * complex  = difficult (scaffolding, heavy prep, heritage detail, high ceilings)
 */
const COMPLEXITY_MULTIPLIER: Record<QuoteComplexity, number> = {
  standard: 1.0,
  moderate: 1.25,
  complex: 1.5,
};

const MATERIAL_COST_SHARE = 0.32;

function normalizeInteriorEstimate(
  estimate: InteriorEstimate | undefined
): NormalizedInteriorEstimateInput | null {
  if (!estimate) return null;

  return {
    property_type: estimate.property_type,
    estimate_mode: estimate.estimate_mode,
    condition: estimate.condition,
    scope: estimate.scope,
    wall_paint_system:
      normalizeInteriorWallPaintSystem(estimate.wall_paint_system) ?? 'repaint_2coat',
    property_details: {
      apartment_type: estimate.property_details.apartment_type ?? null,
      sqm: estimate.property_details.sqm ?? null,
      bedrooms: estimate.property_details.bedrooms ?? null,
      bathrooms: estimate.property_details.bathrooms ?? null,
      storeys: estimate.property_details.storeys ?? null,
    },
    rooms: estimate.rooms.map((room) => ({
      name: room.name.trim(),
      anchor_room_type: room.anchor_room_type,
      room_type: room.room_type,
      length_m: room.length_m ?? null,
      width_m: room.width_m ?? null,
      height_m: room.height_m ?? null,
      include_walls: room.include_walls,
      include_ceiling: room.include_ceiling,
      include_trim: room.include_trim,
    })),
    opening_items: estimate.opening_items.map((item) => ({
      opening_type: item.opening_type,
      paint_system: item.paint_system,
      quantity: item.quantity,
      room_index: item.room_index ?? null,
      door_type: item.door_type,
      door_scope: item.door_scope,
      window_type: item.window_type,
      window_scope: item.window_scope,
    })),
    trim_items: estimate.trim_items.map((item) => ({
      trim_type: item.trim_type,
      paint_system: item.paint_system,
      quantity: item.quantity,
      room_index: item.room_index ?? null,
    })),
  };
}

function mapRateSurfaceType(surfaceType: QuoteSurfaceType): RatePresetSurfaceType {
  switch (surfaceType) {
    case 'walls':
    case 'ceiling':
    case 'trim':
    case 'doors':
    case 'windows':
      return surfaceType;
  }
}

function mapRateCoatingType(coatingType: QuoteCoatingType) {
  switch (coatingType) {
    case 'refresh_1coat':
      return 'refresh_1coat' as const;
    case 'new_plaster_3coat':
      return 'new_plaster_3coat' as const;
    case 'repaint_2coat':
      return 'repaint_2coat' as const;
    case 'stain':
    case 'specialty':
      return 'repaint_2coat' as const;
  }
}

export function normalizeQuoteCoatingType(
  coatingType: QuoteCoatingTypeDb | null | undefined
): QuoteCoatingType {
  if (coatingType === 'touch_up_1coat') return 'refresh_1coat';
  return coatingType ?? 'repaint_2coat';
}

export function serializeQuoteCoatingType(
  coatingType: QuoteCoatingType | null | undefined
): QuoteCoatingTypeDb {
  return coatingType ?? 'repaint_2coat';
}

export function serializeLegacyQuoteCoatingType(
  coatingType: QuoteCoatingType | null | undefined
): QuoteCoatingTypeDb {
  if (coatingType === 'refresh_1coat') return 'touch_up_1coat';
  return coatingType ?? 'repaint_2coat';
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildQuoteCustomerAddress(customer: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  address?: string | null;
} | null) {
  if (!customer) return null;
  if ('address' in customer && customer.address) return customer.address;

  const address = [
    customer.address_line1,
    customer.address_line2,
    customer.city,
    customer.state,
    customer.postcode,
  ]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

  return address || null;
}

export function isMissingQuoteCustomerSnapshotColumnError(message: string | null | undefined) {
  if (!message) return false;

  return (
    message.includes('quotes.customer_email') ||
    message.includes('quotes.customer_address') ||
    (message.includes('schema cache') &&
      (message.includes("'customer_email'") || message.includes("'customer_address'"))) ||
    ((message.includes('customer_email') || message.includes('customer_address')) &&
      message.includes('quotes'))
  );
}

export function resolveQuoteCustomerSummary(row: {
  customer: QuoteCustomerSource | QuoteCustomerSource[] | null;
  customer_email?: string | null;
  customer_address?: string | null;
}): QuoteCustomerSummary {
  const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;

  return {
    id: customer?.id ?? '',
    name: customer?.name ?? 'Unknown customer',
    company_name: customer?.company_name ?? null,
    email: row.customer_email ?? customer?.email ?? null,
    phone: customer?.phone ?? null,
    address:
      row.customer_address ??
      customer?.address ??
      buildQuoteCustomerAddress(customer) ??
      null,
  };
}

export function getSuggestedRatePerSqmCents(
  surfaceType: QuoteSurfaceType,
  coatingType: QuoteCoatingType,
  complexity: QuoteComplexity,
  userRates?: UserRateSettings | null
) {
  const surface = mapRateSurfaceType(surfaceType);
  const coating = mapRateCoatingType(coatingType);
  const baseRateCents = userRates
    ? getRatePerM2Cents(userRates, surface, coating)
    : PAINT_RATES[surface][coating].ratePerSqm;
  return Math.round(baseRateCents * COMPLEXITY_MULTIPLIER[complexity]);
}

export function getSuggestedPaintLitres(
  surfaceType: QuoteSurfaceType,
  coatingType: QuoteCoatingType,
  areaM2: number
) {
  const surfaceRates = PAINT_RATES[mapRateSurfaceType(surfaceType)];
  const baseRate = surfaceRates[mapRateCoatingType(coatingType)];

  if (!baseRate.coveragePerLitre) return null;

  return roundToOneDecimal(areaM2 / baseRate.coveragePerLitre);
}

export function calculateQuoteSurface(surface: {
  surface_type: QuoteSurfaceType;
  area_m2: number;
  coating_type: QuoteCoatingType;
  rate_per_m2_cents: number;
  notes?: string | null;
}) {
  const total_cents = Math.round(surface.area_m2 * surface.rate_per_m2_cents);
  const material_cost_cents = Math.round(total_cents * MATERIAL_COST_SHARE);
  const labour_cost_cents = total_cents - material_cost_cents;

  return {
    surface_type: surface.surface_type,
    area_m2: surface.area_m2,
    coating_type: surface.coating_type,
    rate_per_m2_cents: surface.rate_per_m2_cents,
    material_cost_cents,
    labour_cost_cents,
    paint_litres_needed: getSuggestedPaintLitres(
      surface.surface_type,
      surface.coating_type,
      surface.area_m2
    ),
    notes: surface.notes?.trim() || null,
    total_cents,
  };
}

export function calculateQuotePreview(input: {
  complexity?: QuoteComplexity;
  labour_margin_percent: number;
  material_margin_percent: number;
  line_items?: QuoteLineItemFormInput[];
  rooms: Array<{
    name: string;
    room_type: QuoteRoomType;
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    surfaces: Array<{
      surface_type: QuoteSurfaceType;
      area_m2: number;
      coating_type: QuoteCoatingType;
      rate_per_m2_cents: number;
      notes?: string | null;
    }>;
  }>;
}) {
  const rooms = input.rooms.map((room) => {
    const surfaces = room.surfaces.map((surface) => calculateQuoteSurface(surface));
    const total_cents = surfaces.reduce(
      (sum, surface) => sum + surface.material_cost_cents + surface.labour_cost_cents,
      0
    );

    return {
      ...room,
      surfaces,
      total_cents,
    };
  });

  const base_subtotal_cents = rooms.reduce((sum, room) => sum + room.total_cents, 0);
  const labour_margin_cents = Math.round(
    base_subtotal_cents * (input.labour_margin_percent / 100)
  );
  const material_margin_cents = Math.round(
    base_subtotal_cents * (input.material_margin_percent / 100)
  );
  const totals = composeQuoteTotals({
    base_subtotal_cents: base_subtotal_cents + labour_margin_cents + material_margin_cents,
    line_items: input.line_items ?? [],
  });

  return {
    rooms,
    base_subtotal_cents,
    ...totals,
  };
}

export function parseQuoteCreateInput(input: QuoteCreateInput) {
  const parsed = quoteCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'Quote details could not be validated.',
    };
  }

  return {
    success: true as const,
    data: {
      customer_id: parsed.data.customer_id,
      customer_email: parsed.data.customer_email?.trim() || null,
      customer_address: parsed.data.customer_address?.trim() || null,
      quote_number: parsed.data.quote_number?.trim() || null,
      title: parsed.data.title.trim(),
      status: parsed.data.status,
      valid_until: parsed.data.valid_until,
      working_days: parsed.data.working_days ?? 1,
      complexity: parsed.data.complexity,
      labour_margin_percent: parsed.data.labour_margin_percent,
      material_margin_percent: parsed.data.material_margin_percent,
      manual_adjustment_cents: parsed.data.manual_adjustment_cents ?? 0,
      discount_cents: parsed.data.discount_cents ?? 0,
      deposit_percent: parsed.data.deposit_percent ?? 0,
      notes: parsed.data.notes?.trim() || null,
      internal_notes: parsed.data.internal_notes?.trim() || null,
      pricing_method: parsed.data.pricing_method,
      pricing_method_inputs: parsed.data.pricing_method_inputs ?? null,
      interior_estimate: normalizeInteriorEstimate(parsed.data.interior_estimate),
      exterior_estimate: parsed.data.exterior_estimate ?? null,
      line_items: (parsed.data.line_items ?? []).map((item) => {
        const is_optional = item.is_optional ?? false;

        return {
          material_item_id: item.material_item_id ?? null,
          name: item.name.trim(),
          category: item.category,
          unit: item.unit.trim(),
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          is_optional,
          is_selected: is_optional ? item.is_selected ?? false : true,
          notes: item.notes?.trim() || undefined,
        };
      }),
      rooms: parsed.data.rooms.map((room) => ({
        name: room.name.trim(),
        room_type: room.room_type,
        length_m: room.length_m ?? null,
        width_m: room.width_m ?? null,
        height_m: room.height_m ?? null,
        surfaces: room.surfaces.map((surface: QuoteSurface) => ({
          surface_type: surface.surface_type,
          area_m2: surface.area_m2,
          coating_type: surface.coating_type,
          rate_per_m2_cents: surface.rate_per_m2_cents,
          notes: surface.notes?.trim() || null,
        })),
      })),
    },
  };
}

export function mapQuoteListItem(row: {
  id: string;
  user_id: string;
  customer_id: string;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  working_days?: number | null;
  tier: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  estimate_category?: string | null;
  created_at: string;
  updated_at: string;
  customer: QuoteCustomerSource | QuoteCustomerSource[] | null;
  rooms?: Array<{ id: string; surfaces?: Array<{ id: string }> | null }> | null;
}): QuoteListItem {
  const customer = resolveQuoteCustomerSummary(row);
  const rooms = row.rooms ?? [];
  const surface_count = rooms.reduce(
    (sum, room) => sum + (room.surfaces?.length ?? 0),
    0
  );

  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    quote_number: row.quote_number,
    title: row.title,
    status: resolveQuoteStatus({
      status: row.status as QuoteStatus,
      valid_until: row.valid_until,
    }),
    valid_until: row.valid_until,
    complexity: (row.tier as QuoteComplexity | null) ?? null,
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    estimate_category: (row.estimate_category as QuoteEstimateCategory | null) ?? 'manual',
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer,
    room_count: rooms.length,
    surface_count,
  };
}

export function mapQuoteDetail(row: {
  id: string;
  user_id: string;
  customer_id: string;
  public_share_token?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  approved_by_email?: string | null;
  approval_signature?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  working_days?: number | null;
  tier: string | null;
  notes: string | null;
  internal_notes: string | null;
  labour_margin_percent: number;
  material_margin_percent: number;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  discount_cents?: number | null;
  deposit_percent?: number | null;
  estimate_category?: string | null;
  property_type?: string | null;
  estimate_mode?: string | null;
  estimate_context?: Record<string, unknown> | null;
  pricing_snapshot?: Record<string, unknown> | null;
  pricing_method?: string | null;
  pricing_method_inputs?: Record<string, unknown> | null;
  linked_invoice_count?: number | null;
  created_at: string;
  updated_at: string;
  customer: QuoteCustomerSource | null;
  rooms: Array<{
    id: string;
    quote_id: string;
    name: string;
    room_type: string;
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    surfaces: Array<{
      id: string;
      room_id: string;
      surface_type: QuoteSurfaceType;
      area_m2: number;
      coating_type: QuoteCoatingTypeDb | null;
      rate_per_m2_cents: number;
      material_cost_cents: number;
      labour_cost_cents: number;
      paint_litres_needed: number | null;
      notes: string | null;
    }>;
  }>;
  estimate_items?: QuoteEstimateItemDraft[];
  line_items?: QuoteLineItemRecord[];
}): QuoteDetail {
  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    public_share_token: row.public_share_token ?? '',
    approved_at: row.approved_at ?? null,
    approved_by_name: row.approved_by_name ?? null,
    approved_by_email: row.approved_by_email ?? null,
    approval_signature: row.approval_signature ?? null,
    quote_number: row.quote_number,
    title: row.title,
    status: resolveQuoteStatus({
      status: row.status as QuoteStatus,
      valid_until: row.valid_until,
    }),
    valid_until: row.valid_until,
    working_days: row.working_days ?? null,
    complexity: (row.tier as QuoteComplexity | null) ?? null,
    notes: row.notes,
    internal_notes: row.internal_notes,
    labour_margin_percent: row.labour_margin_percent,
    material_margin_percent: row.material_margin_percent,
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    estimate_category: (row.estimate_category as QuoteEstimateCategory | null) ?? 'manual',
    property_type: (row.property_type as QuoteDetail['property_type']) ?? null,
    estimate_mode: (row.estimate_mode as QuoteDetail['estimate_mode']) ?? null,
    estimate_context: row.estimate_context ?? {},
    pricing_snapshot: row.pricing_snapshot ?? {},
    pricing_method: (row.pricing_method as PricingMethod | null) ?? 'hybrid',
    pricing_method_inputs: (row.pricing_method_inputs as PricingMethodInputs | null) ?? null,
    discount_cents: row.discount_cents ?? 0,
    deposit_percent: row.deposit_percent ?? 0,
    linked_invoice_count: row.linked_invoice_count ?? 0,
    has_linked_invoices: (row.linked_invoice_count ?? 0) > 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: resolveQuoteCustomerSummary(row),
    rooms: row.rooms.map((room) => {
      const surfaces = room.surfaces.map((surface) => ({
        id: surface.id,
        room_id: surface.room_id,
        surface_type: surface.surface_type,
        area_m2: surface.area_m2,
        coating_type: normalizeQuoteCoatingType(surface.coating_type),
        rate_per_m2_cents: surface.rate_per_m2_cents,
        material_cost_cents: surface.material_cost_cents,
        labour_cost_cents: surface.labour_cost_cents,
        paint_litres_needed: surface.paint_litres_needed,
        notes: surface.notes,
        total_cents: surface.material_cost_cents + surface.labour_cost_cents,
      }));

      return {
        id: room.id,
        quote_id: room.quote_id,
        name: room.name,
        room_type: room.room_type as QuoteRoomType,
        length_m: room.length_m,
        width_m: room.width_m,
        height_m: room.height_m,
        total_cents: surfaces.reduce((sum, surface) => sum + surface.total_cents, 0),
        surfaces,
      };
    }),
    estimate_items: row.estimate_items ?? [],
    line_items: (row.line_items ?? []).map((item) => ({
      ...item,
      is_optional: item.is_optional ?? false,
      is_selected: item.is_optional ? item.is_selected ?? false : true,
    })),
  };
}

export function toPublicQuoteDetail(quote: QuoteDetail): PublicQuoteDetail {
  return {
    approved_at: quote.approved_at,
    approved_by_name: quote.approved_by_name,
    approved_by_email: quote.approved_by_email,
    approval_signature: quote.approval_signature,
    quote_number: quote.quote_number,
    title: quote.title,
    status: quote.status,
    valid_until: quote.valid_until,
    notes: quote.notes,
    subtotal_cents: quote.subtotal_cents,
    gst_cents: quote.gst_cents,
    total_cents: quote.total_cents,
    working_days: (quote as unknown as { working_days?: number | null }).working_days ?? null,
    customer: quote.customer,
    rooms: quote.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      room_type: room.room_type,
      total_cents: room.total_cents,
      surfaces: room.surfaces.map((surface) => ({
        id: surface.id,
        surface_type: surface.surface_type,
        area_m2: surface.area_m2,
        coating_type: surface.coating_type,
        rate_per_m2_cents: surface.rate_per_m2_cents,
        notes: surface.notes,
        total_cents: surface.total_cents,
      })),
    })),
    estimate_items: quote.estimate_items.map((item) => ({
      id: item.id,
      category: item.category,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
    })),
    line_items: quote.line_items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
      notes: item.notes,
      is_optional: item.is_optional,
      is_selected: item.is_selected,
    })),
  };
}

export function mapPublicQuoteDetail(row: {
  approved_at?: string | null;
  approved_by_name?: string | null;
  approved_by_email?: string | null;
  approval_signature?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  notes: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  customer: QuoteCustomerSource | null;
  rooms: Array<{
    id: string;
    name: string;
    room_type: string;
    surfaces: Array<{
      id: string;
      surface_type: QuoteSurfaceType;
      area_m2: number;
      coating_type: QuoteCoatingTypeDb | null;
      rate_per_m2_cents: number;
      material_cost_cents: number;
      labour_cost_cents: number;
      notes: string | null;
    }>;
  }>;
  estimate_items?: QuoteEstimateItemDraft[];
  line_items?: QuoteLineItemRecord[];
}): PublicQuoteDetail {
  return {
    approved_at: row.approved_at ?? null,
    approved_by_name: row.approved_by_name ?? null,
    approved_by_email: row.approved_by_email ?? null,
    approval_signature: row.approval_signature ?? null,
    quote_number: row.quote_number,
    title: row.title,
    status: resolveQuoteStatus({
      status: row.status as QuoteStatus,
      valid_until: row.valid_until,
    }),
    valid_until: row.valid_until,
    notes: row.notes,
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    working_days: (row as { working_days?: number | null }).working_days ?? null,
    customer: resolveQuoteCustomerSummary(row),
    rooms: row.rooms.map((room) => {
      const surfaces = room.surfaces.map((surface) => ({
        id: surface.id,
        surface_type: surface.surface_type,
        area_m2: surface.area_m2,
        coating_type: normalizeQuoteCoatingType(surface.coating_type),
        rate_per_m2_cents: surface.rate_per_m2_cents,
        notes: surface.notes,
        total_cents: surface.material_cost_cents + surface.labour_cost_cents,
      }));

      return {
        id: room.id,
        name: room.name,
        room_type: room.room_type as QuoteRoomType,
        total_cents: surfaces.reduce((sum, surface) => sum + surface.total_cents, 0),
        surfaces,
      };
    }),
    estimate_items: (row.estimate_items ?? []).map((item) => ({
      id: item.id,
      category: item.category,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
    })),
    line_items: (row.line_items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
      notes: item.notes,
      is_optional: item.is_optional ?? false,
      is_selected: item.is_optional ? item.is_selected ?? false : true,
    })),
  };
}
