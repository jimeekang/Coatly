'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  buildQuoteCustomerAddress,
  calculateQuoteLineItemsSubtotal,
  calculateQuotePreview,
  composeQuoteTotals,
  isMissingQuoteCustomerSnapshotColumnError,
  mapQuoteDetail,
  mapQuoteListItem,
  parseQuoteCreateInput,
  resolveQuoteStatus,
  resolveQuoteCustomerSummary,
  type QuoteCustomerOption,
  type QuoteCoatingType,
  type QuoteDetail,
  type QuoteEstimateItemCategory,
  type QuoteListItem,
  type QuoteLineItemRecord,
  type QuoteSurfaceType,
} from '@/lib/quotes';
import { calculateInteriorEstimate } from '@/lib/interior-estimates';
import { getBusinessDocumentBranding, getBusinessRateSettings } from '@/lib/businesses';
import { sendQuoteApprovalNotification } from '@/lib/email/resend';
import { DEFAULT_RATE_SETTINGS } from '@/lib/rate-settings';
import type { UserRateSettings } from '@/lib/rate-settings';
import {
  calculateDayRateQuote,
  calculateRoomRateQuote,
  calculateManualQuote,
} from '@/utils/calculations';
import type { DayRateInputs, RoomRateInputs, ManualInputs, PricingMethodInputs } from '@/types/quote';
import {
  getActiveSubscriptionRequiredMessage,
  getMonthlyActiveQuoteUsageForUser,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import type { QuoteCreateInput } from '@/lib/supabase/validators';
import { formatAUD, formatDate } from '@/utils/format';

type QuoteListRow = {
  id: string;
  user_id: string;
  customer_id: string;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  tier: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  customer:
    | {
        id: string;
        name: string;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }
    | Array<{
        id: string;
        name: string;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }>
    | null;
};

type QuoteEstimateItemRow = {
  id: string;
  quote_id: string;
  category: string;
  label: string;
  quantity: number | string;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
  metadata: Record<string, unknown> | null;
  sort_order: number;
};

type QuoteDetailRow = {
  id: string;
  user_id: string;
  customer_id: string;
  public_share_token?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  approved_by_email?: string | null;
  approval_signature?: string | null;
  manual_adjustment_cents?: number | null;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  tier: string | null;
  notes: string | null;
  internal_notes: string | null;
  labour_margin_percent: number;
  material_margin_percent: number;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  estimate_category?: string | null;
  property_type?: string | null;
  estimate_mode?: string | null;
  estimate_context?: Record<string, unknown> | null;
  pricing_snapshot?: Record<string, unknown> | null;
  pricing_method?: string | null;
  pricing_method_inputs?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  customer: QuoteListRow['customer'];
};

function jsonObjectOrEmpty(value: unknown) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const QUOTE_CUSTOMER_SELECT =
  'customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, address_line2, city, state, postcode)';
const QUOTE_LIST_SELECT =
  `id, user_id, customer_id, customer_email, customer_address, quote_number, title, status, valid_until, tier, subtotal_cents, gst_cents, total_cents, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_LIST_SELECT_LEGACY =
  `id, user_id, customer_id, quote_number, title, status, valid_until, tier, subtotal_cents, gst_cents, total_cents, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_DETAIL_SELECT =
  `id, user_id, customer_id, public_share_token, approved_at, approved_by_name, approved_by_email, approval_signature, manual_adjustment_cents, customer_email, customer_address, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_DETAIL_SELECT_LEGACY =
  `id, user_id, customer_id, manual_adjustment_cents, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_SELECT =
  `id, user_id, customer_id, public_share_token, approved_at, approved_by_name, approved_by_email, approval_signature, manual_adjustment_cents, customer_email, customer_address, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_SELECT_LEGACY =
  `id, user_id, customer_id, public_share_token, manual_adjustment_cents, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;

type QuoteDataClient =
  | Awaited<ReturnType<typeof createServerClient>>
  | ReturnType<typeof createAdminClient>;

type QuoteHydratedRelations = {
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
      coating_type: QuoteCoatingType | null;
      rate_per_m2_cents: number;
      material_cost_cents: number;
      labour_cost_cents: number;
      paint_litres_needed: number | null;
      notes: string | null;
    }>;
  }>;
  estimate_items: QuoteDetail['estimate_items'];
  line_items: QuoteDetail['line_items'];
};

type CreateQuoteOptions = {
  submitIntent?: 'save' | 'send_email';
};

function parseBooleanFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value === 'true';
}

function parseTrimmedFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadQuoteRelations(
  supabase: QuoteDataClient,
  quoteId: string
): Promise<{ data: QuoteHydratedRelations | null; error: string | null }> {
  const { data: rooms, error: roomsError } = await supabase
    .from('quote_rooms')
    .select('id, quote_id, name, room_type, length_m, width_m, height_m, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (roomsError) {
    return { data: null, error: roomsError.message };
  }

  const roomIds = rooms?.map((room) => room.id) ?? [];

  const { data: surfaces, error: surfacesError } = roomIds.length
    ? await supabase
        .from('quote_room_surfaces')
        .select(
          'id, room_id, surface_type, area_m2, coating_type, rate_per_m2_cents, material_cost_cents, labour_cost_cents, paint_litres_needed, notes'
        )
        .in('room_id', roomIds)
    : { data: [], error: null };

  if (surfacesError) {
    return { data: null, error: surfacesError.message };
  }

  const { data: estimateItems, error: estimateItemsError } = await supabase
    .from('quote_estimate_items')
    .select(
      'id, quote_id, category, label, quantity, unit, unit_price_cents, total_cents, metadata, sort_order'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (estimateItemsError) {
    return { data: null, error: estimateItemsError.message };
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select(
      'id, quote_id, material_item_id, name, category, unit, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected, sort_order, created_at, updated_at'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return { data: null, error: lineItemsError.message };
  }

  return {
    data: {
      rooms:
        rooms?.map((room) => ({
          id: room.id,
          quote_id: room.quote_id,
          name: room.name,
          room_type: room.room_type,
          length_m: room.length_m,
          width_m: room.width_m,
          height_m: room.height_m,
          surfaces:
            surfaces
              ?.filter((surface) => surface.room_id === room.id)
              .map((surface) => ({
                id: surface.id,
                room_id: surface.room_id,
                surface_type: surface.surface_type as QuoteSurfaceType,
                area_m2: Number(surface.area_m2),
                coating_type: surface.coating_type as QuoteCoatingType | null,
                rate_per_m2_cents: surface.rate_per_m2_cents,
                material_cost_cents: surface.material_cost_cents,
                labour_cost_cents: surface.labour_cost_cents,
                paint_litres_needed:
                  surface.paint_litres_needed == null
                    ? null
                    : Number(surface.paint_litres_needed),
                notes: surface.notes,
              })) ?? [],
        })) ?? [],
      estimate_items: ((estimateItems as QuoteEstimateItemRow[] | null) ?? []).map((item) => ({
        id: item.id,
        quote_id: item.quote_id,
        category: item.category as QuoteEstimateItemCategory,
        label: item.label,
        quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        sort_order: item.sort_order,
        metadata: item.metadata ?? {},
      })),
      line_items: ((lineItems as QuoteLineItemRecord[] | null) ?? []).map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        is_optional: item.is_optional ?? false,
        is_selected: item.is_optional ? item.is_selected ?? false : true,
      })),
    },
    error: null,
  };
}

function mapHydratedQuoteDetail(
  quote: QuoteDetailRow,
  relations: QuoteHydratedRelations
): QuoteDetail {
  return mapQuoteDetail({
    ...quote,
    pricing_method_inputs: quote.pricing_method_inputs as Record<string, unknown> | null,
    customer: resolveQuoteCustomerSummary({
      customer: quote.customer,
      customer_email: quote.customer_email,
      customer_address: quote.customer_address,
    }),
    estimate_context: jsonObjectOrEmpty(quote.estimate_context),
    pricing_snapshot: jsonObjectOrEmpty(quote.pricing_snapshot),
    ...relations,
  });
}

export async function getQuoteFormOptions(): Promise<{
  data: {
    customers: QuoteCustomerOption[];
    userRates: UserRateSettings;
    nextQuoteNumber: string | null;
  };
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const [customersResult, ratesResult, nextQuoteNumberResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, company_name, email, phone, address_line1, address_line2, city, state, postcode')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    getBusinessRateSettings(supabase, user.id),
    supabase.rpc('generate_quote_number', { user_uuid: user.id }),
  ]);

  return {
    data: {
      customers:
        customersResult.data?.map((customer) => ({
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name,
          email: customer.email,
          phone: customer.phone,
          address: buildQuoteCustomerAddress(customer),
        })) ?? [],
      userRates: ratesResult.data ?? DEFAULT_RATE_SETTINGS,
      nextQuoteNumber: nextQuoteNumberResult.error ? null : nextQuoteNumberResult.data ?? null,
    },
    error: customersResult.error?.message ?? null,
  };
}

export async function getQuotes(): Promise<{ data: QuoteListItem[]; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const quoteListResult = await supabase
    .from('quotes')
    .select(QUOTE_LIST_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  let data = quoteListResult.data as QuoteListRow[] | null;
  let error = quoteListResult.error;

  if (error && isMissingQuoteCustomerSnapshotColumnError(error.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_LIST_SELECT_LEGACY)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    data = legacyResult.data as QuoteListRow[] | null;
    error = legacyResult.error;
  }

  return {
    data:
      ((data as QuoteListRow[] | null) ?? []).map((quote) =>
        mapQuoteListItem({
          ...quote,
          customer: resolveQuoteCustomerSummary({
            customer: quote.customer,
            customer_email: quote.customer_email,
            customer_address: quote.customer_address,
          }),
        })
      ) ?? [],
    error: error?.message ?? null,
  };
}

export async function getQuote(id: string): Promise<{
  data: QuoteDetail | null;
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const quoteResult = await supabase
    .from('quotes')
    .select(QUOTE_DETAIL_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  let quote = quoteResult.data as QuoteDetailRow | null;
  let quoteError = quoteResult.error;

  if (quoteError && isMissingQuoteSelectColumnError(quoteError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_LEGACY)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    quote = legacyResult.data as QuoteDetailRow | null;
    quoteError = legacyResult.error;
  }

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const relationsResult = await loadQuoteRelations(supabase, id);

  if (relationsResult.error || !relationsResult.data) {
    return { data: null, error: relationsResult.error ?? 'Quote details could not be loaded.' };
  }

  return {
    data: mapHydratedQuoteDetail(quote, relationsResult.data),
    error: null,
  };
}

function isMissingQuoteSelectColumnError(message: string | null | undefined) {
  if (!message) return false;

  return (
    isMissingQuoteCustomerSnapshotColumnError(message) ||
    (message.includes('quotes.public_share_token') && message.includes('does not exist'))
  );
}

export async function getPublicQuoteByToken(token: string): Promise<{
  data:
    | {
        quote: QuoteDetail;
        business: {
          name: string;
          abn: string | null;
          phone: string | null;
          email: string | null;
        } | null;
      }
    | null;
  error: string | null;
}> {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return { data: null, error: 'Public quote link is invalid.' };
  }

  const supabase = createAdminClient();
  const quoteResult = await supabase
    .from('quotes')
    .select(PUBLIC_QUOTE_SELECT)
    .eq('public_share_token', trimmedToken)
    .single();
  let quote = quoteResult.data as QuoteDetailRow | null;
  let quoteError = quoteResult.error;

  if (quoteError && isMissingQuoteCustomerSnapshotColumnError(quoteError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_SELECT_LEGACY)
      .eq('public_share_token', trimmedToken)
      .single();

    quote = legacyResult.data as QuoteDetailRow | null;
    quoteError = legacyResult.error;
  }

  if (quoteError && quoteError.message.includes('public_share_token')) {
    return {
      data: null,
      error: 'Public quote sharing is not available until the latest database migration is applied.',
    };
  }

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const [relationsResult, businessResult] = await Promise.all([
    loadQuoteRelations(supabase, quote.id),
    getBusinessDocumentBranding(supabase, quote.user_id, null),
  ]);

  if (relationsResult.error || !relationsResult.data) {
    return {
      data: null,
      error: relationsResult.error ?? 'Quote details could not be loaded.',
    };
  }

  return {
    data: {
      quote: mapHydratedQuoteDetail(quote, relationsResult.data),
      business: businessResult.data
        ? {
            name: businessResult.data.name,
            abn: businessResult.data.abn,
            phone: businessResult.data.phone,
            email: businessResult.data.email,
          }
        : null,
    },
    error: null,
  };
}

export async function createQuote(
  input: QuoteCreateInput,
  options: CreateQuoteOptions = {}
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = parseQuoteCreateInput(input);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('quote creation') };
  }

  const quoteUsage = await getMonthlyActiveQuoteUsageForUser(
    supabase,
    user.id,
    subscription
  );

  if (quoteUsage.reached && quoteUsage.limit !== null) {
    return {
      error: `Starter includes up to ${quoteUsage.limit} active quotes per month. Upgrade to Pro to create more quotes this month.`,
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, email, address_line1, address_line2, city, state, postcode')
    .eq('id', parsed.data.customer_id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }

  if (!customer) {
    return { error: 'Selected customer was not found.' };
  }

  const shouldSendEmail = options.submitIntent === 'send_email';

  if (shouldSendEmail && !customer.email?.trim()) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  const { data: userRates } = await getBusinessRateSettings(supabase, user.id);
  const effectiveRates = userRates ?? DEFAULT_RATE_SETTINGS;
  const interiorEstimate = parsed.data.interior_estimate
    ? calculateInteriorEstimate(parsed.data.interior_estimate, effectiveRates)
    : null;
  const adjustmentCents = parsed.data.manual_adjustment_cents ?? 0;
  const lineItems = parsed.data.line_items ?? [];
  const pricingMethod = parsed.data.pricing_method ?? 'hybrid';
  const rawMethodInputs = parsed.data.pricing_method_inputs;

  // ── Resolve preview by pricing method ─────────────────────────────────────
  let resolvedPricingInputs: PricingMethodInputs | null = null;
  // Use the full return type of calculateQuotePreview; simple methods return rooms: []
  let preview: ReturnType<typeof calculateQuotePreview>;

  if (pricingMethod === 'day_rate' && rawMethodInputs?.method === 'day_rate') {
    const inputs: DayRateInputs = rawMethodInputs.inputs;
    const result = calculateDayRateQuote(inputs);
    const totals = composeQuoteTotals({
      base_subtotal_cents: result.subtotal_cents,
      adjustment_cents: adjustmentCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'day_rate', inputs };
    preview = {
      rooms: [],
      base_subtotal_cents: result.subtotal_cents,
      ...totals,
    };
  } else if (pricingMethod === 'room_rate' && rawMethodInputs?.method === 'room_rate') {
    const inputs: RoomRateInputs = rawMethodInputs.inputs;
    const result = calculateRoomRateQuote(inputs);
    const totals = composeQuoteTotals({
      base_subtotal_cents: result.subtotal_cents,
      adjustment_cents: adjustmentCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'room_rate', inputs };
    preview = {
      rooms: [],
      base_subtotal_cents: result.subtotal_cents,
      ...totals,
    };
  } else if (pricingMethod === 'manual' && rawMethodInputs?.method === 'manual') {
    const inputs: ManualInputs = rawMethodInputs.inputs;
    const result = calculateManualQuote(inputs);
    const totals = composeQuoteTotals({
      base_subtotal_cents: result.subtotal_cents,
      adjustment_cents: adjustmentCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'manual', inputs };
    preview = {
      rooms: [],
      base_subtotal_cents: result.subtotal_cents,
      ...totals,
    };
  } else if (interiorEstimate) {
    // hybrid / sqm_rate with interior estimate
    const base = interiorEstimate.subtotal_cents;
    const labourMarkup = Math.round(base * (parsed.data.labour_margin_percent / 100));
    const materialMarkup = Math.round(base * (parsed.data.material_margin_percent / 100));
    const subtotal = base + labourMarkup + materialMarkup;
    const totals = composeQuoteTotals({
      base_subtotal_cents: subtotal,
      adjustment_cents: adjustmentCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'hybrid', inputs: null };
    preview = {
      rooms: [],
      base_subtotal_cents: base,
      ...totals,
    };
  } else {
    // sqm_rate / hybrid with manual rooms
    resolvedPricingInputs = { method: pricingMethod as 'sqm_rate' | 'hybrid', inputs: null };
    preview = calculateQuotePreview(parsed.data);
  }

  const { data: quoteNumber, error: quoteNumberError } = await supabase.rpc(
    'generate_quote_number',
    { user_uuid: user.id }
  );

  if (quoteNumberError || !quoteNumber) {
    return {
      error: quoteNumberError?.message ?? 'Quote number could not be generated.',
    };
  }

  const quoteInsertPayload = {
    user_id: user.id,
    customer_id: parsed.data.customer_id,
    customer_email: customer.email,
    customer_address: buildQuoteCustomerAddress(customer),
    quote_number: quoteNumber,
    title: parsed.data.title,
    status: shouldSendEmail ? 'sent' : parsed.data.status,
    valid_until: parsed.data.valid_until,
    tier: parsed.data.complexity,
    notes: parsed.data.notes,
    internal_notes: parsed.data.internal_notes,
    labour_margin_percent: parsed.data.labour_margin_percent,
    material_margin_percent: parsed.data.material_margin_percent,
    subtotal_cents: preview.subtotal_cents,
    gst_cents: preview.gst_cents,
    total_cents: preview.total_cents,
    manual_adjustment_cents: adjustmentCents,
    estimate_category: interiorEstimate ? 'interior' : 'manual',
    property_type: parsed.data.interior_estimate?.property_type ?? null,
    estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
    estimate_context: parsed.data.interior_estimate ?? {},
    pricing_snapshot: interiorEstimate?.snapshot ?? {},
    pricing_method: pricingMethod,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing_method_inputs: resolvedPricingInputs as any,
  };

  let { data: quote, error: quoteError } = await supabase.from('quotes').insert(quoteInsertPayload)
    .select('id')
    .single();

  if (quoteError && isMissingQuoteCustomerSnapshotColumnError(quoteError.message)) {
    const {
      customer_email: _customerEmail,
      customer_address: _customerAddress,
      ...legacyQuoteInsertPayload
    } = quoteInsertPayload;
    void _customerEmail;
    void _customerAddress;

    const legacyResult = await supabase
      .from('quotes')
      .insert(legacyQuoteInsertPayload)
      .select('id')
      .single();

    quote = legacyResult.data;
    quoteError = legacyResult.error;
  }

  if (quoteError || !quote) {
    return { error: quoteError?.message ?? 'Quote could not be created.' };
  }

  if (interiorEstimate) {
    if (interiorEstimate.pricing_items.length > 0) {
      const { error: estimateItemsError } = await supabase.from('quote_estimate_items').insert(
        interiorEstimate.pricing_items.map((item, index) => ({
          quote_id: quote.id,
          category: item.category,
          label: item.label,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.total_cents,
          metadata: {
            ...(item.metadata ?? {}),
            room_index: item.room_index ?? null,
          },
          sort_order: index,
        }))
      );

      if (estimateItemsError) {
        await supabase.from('quotes').delete().eq('id', quote.id).eq('user_id', user.id);
        return { error: estimateItemsError.message };
      }
    }
  } else {
    for (const [roomIndex, room] of preview.rooms.entries()) {
      const { data: insertedRoom, error: roomError } = await supabase
        .from('quote_rooms')
        .insert({
          quote_id: quote.id,
          name: room.name,
          room_type: room.room_type,
          length_m: room.length_m,
          width_m: room.width_m,
          height_m: room.height_m,
          sort_order: roomIndex,
        })
        .select('id')
        .single();

      if (roomError || !insertedRoom) {
        await supabase.from('quotes').delete().eq('id', quote.id).eq('user_id', user.id);
        return { error: roomError?.message ?? 'Quote room could not be created.' };
      }

      const { error: surfacesError } = await supabase.from('quote_room_surfaces').insert(
        room.surfaces.map((surface) => ({
          room_id: insertedRoom.id,
          surface_type: surface.surface_type,
          area_m2: surface.area_m2,
          coating_type: surface.coating_type,
          rate_per_m2_cents: surface.rate_per_m2_cents,
          material_cost_cents: surface.material_cost_cents,
          labour_cost_cents: surface.labour_cost_cents,
          paint_litres_needed: surface.paint_litres_needed,
          tier: parsed.data.complexity,
          notes: surface.notes,
        }))
      );

      if (surfacesError) {
        await supabase.from('quotes').delete().eq('id', quote.id).eq('user_id', user.id);
        return { error: surfacesError.message };
      }
    }
  }

  // ── Save quote line items (materials & services section) ─────────────────
  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase.from('quote_line_items').insert(
      lineItems.map((item, index) => ({
        quote_id: quote.id,
        material_item_id: item.material_item_id ?? null,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: Math.round(item.quantity * item.unit_price_cents),
        notes: item.notes ?? null,
        is_optional: item.is_optional ?? false,
        is_selected: item.is_optional ? item.is_selected ?? false : true,
        sort_order: index,
      }))
    );

    if (lineItemsError) {
      await supabase.from('quotes').delete().eq('id', quote.id).eq('user_id', user.id);
      return { error: lineItemsError.message };
    }
  }

  revalidatePath('/quotes');
  redirect(shouldSendEmail ? `/quotes/${quote.id}?emailDemo=1` : `/quotes/${quote.id}`);
}

export async function setQuoteOptionalLineItemSelection(
  formData: FormData
): Promise<void> {
  const quoteId = formData.get('quoteId');
  const lineItemId = formData.get('lineItemId');

  if (typeof quoteId !== 'string' || typeof lineItemId !== 'string') {
    return;
  }

  const isSelected = parseBooleanFormValue(formData.get('isSelected'));
  const supabase = await createServerClient();
  const user = await requireCurrentUser();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, subtotal_cents, manual_adjustment_cents')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return;
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, total_cents, is_optional, is_selected')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return;
  }

  const target = lineItems?.find((item) => item.id === lineItemId) ?? null;

  if (!target || !target.is_optional) {
    return;
  }

  const { error: updateLineItemError } = await supabase
    .from('quote_line_items')
    .update({ is_selected: isSelected })
    .eq('id', lineItemId)
    .eq('quote_id', quoteId);

  if (updateLineItemError) {
    return;
  }

  const currentIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.is_selected,
    }))
  );

  const baseSubtotalWithoutLineItems = Math.max(
    0,
    quote.subtotal_cents - currentIncludedLineItemsSubtotal
  );

  const nextIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.id === lineItemId ? isSelected : item.is_selected,
    }))
  );

  const nextSubtotalCents = baseSubtotalWithoutLineItems + nextIncludedLineItemsSubtotal;
  const nextGstCents = Math.round(nextSubtotalCents * 0.1);
  const nextTotalCents =
    nextSubtotalCents + nextGstCents + (quote.manual_adjustment_cents ?? 0);

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      subtotal_cents: nextSubtotalCents,
      gst_cents: nextGstCents,
      total_cents: nextTotalCents,
    })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (updateQuoteError) {
    return;
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function setPublicQuoteOptionalLineItemSelection(
  formData: FormData
): Promise<void> {
  const quoteToken = formData.get('quoteToken');
  const lineItemId = formData.get('lineItemId');

  if (typeof quoteToken !== 'string' || typeof lineItemId !== 'string') {
    return;
  }

  const isSelected = parseBooleanFormValue(formData.get('isSelected'));
  const supabase = createAdminClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, status, valid_until, subtotal_cents, manual_adjustment_cents')
    .eq('public_share_token', quoteToken)
    .single();

  if (
    quoteError ||
    !quote ||
    resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }) !== 'sent'
  ) {
    return;
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, total_cents, is_optional, is_selected')
    .eq('quote_id', quote.id)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return;
  }

  const target = lineItems?.find((item) => item.id === lineItemId) ?? null;

  if (!target || !target.is_optional) {
    return;
  }

  const { error: updateLineItemError } = await supabase
    .from('quote_line_items')
    .update({ is_selected: isSelected })
    .eq('id', lineItemId)
    .eq('quote_id', quote.id);

  if (updateLineItemError) {
    return;
  }

  const currentIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.is_selected,
    }))
  );

  const baseSubtotalWithoutLineItems = Math.max(
    0,
    quote.subtotal_cents - currentIncludedLineItemsSubtotal
  );

  const nextIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.id === lineItemId ? isSelected : item.is_selected,
    }))
  );

  const nextSubtotalCents = baseSubtotalWithoutLineItems + nextIncludedLineItemsSubtotal;
  const nextGstCents = Math.round(nextSubtotalCents * 0.1);
  const nextTotalCents =
    nextSubtotalCents + nextGstCents + (quote.manual_adjustment_cents ?? 0);

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      subtotal_cents: nextSubtotalCents,
      gst_cents: nextGstCents,
      total_cents: nextTotalCents,
    })
    .eq('id', quote.id);

  if (updateQuoteError) {
    return;
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quote.id}`);
}

export async function approvePublicQuote(formData: FormData): Promise<void> {
  const quoteToken = parseTrimmedFormValue(formData.get('quoteToken'));
  const approvedByName = parseTrimmedFormValue(formData.get('approvedByName'));
  const approvedByEmail = parseTrimmedFormValue(formData.get('approvedByEmail')).toLowerCase();
  const approvalSignature = parseTrimmedFormValue(formData.get('approvalSignature'));

  if (!quoteToken || !approvedByName || !approvedByEmail || !approvalSignature) {
    return;
  }

  if (!isValidEmail(approvedByEmail)) {
    return;
  }

  const supabase = createAdminClient();
  const quoteResult = await supabase
    .from('quotes')
    .select(PUBLIC_QUOTE_SELECT)
    .eq('public_share_token', quoteToken)
    .single();
  const quote = quoteResult.data as QuoteDetailRow | null;

  if (
    quoteResult.error ||
    !quote ||
    resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }) !== 'sent'
  ) {
    return;
  }

  const approvedAt = new Date().toISOString();
  const approvalLog = `Client approved via public page on ${approvedAt} by ${approvedByName} <${approvedByEmail}>. Signature: ${approvalSignature}.`;
  const nextInternalNotes = quote.internal_notes?.trim()
    ? `${quote.internal_notes.trim()}\n\n${approvalLog}`
    : approvalLog;

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_by_name: approvedByName,
      approved_by_email: approvedByEmail,
      approval_signature: approvalSignature,
      internal_notes: nextInternalNotes,
    })
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

  if (updateQuoteError) {
    return;
  }

  const customer = resolveQuoteCustomerSummary({
    customer: quote.customer,
    customer_email: quote.customer_email,
    customer_address: quote.customer_address,
  });
  const businessResult = await getBusinessDocumentBranding(supabase, quote.user_id, null);
  const ownerEmail = businessResult.data?.email?.trim() ?? null;

  if (ownerEmail) {
    await sendQuoteApprovalNotification({
      to: ownerEmail,
      businessName: businessResult.data?.name || 'Coatly',
      quoteNumber: quote.quote_number,
      quoteTitle: quote.title,
      customerName: customer.company_name || customer.name,
      customerEmail: customer.email,
      approvedByName,
      approvedByEmail,
      approvedAt: formatDate(approvedAt),
      totalFormatted: formatAUD(quote.total_cents),
      signature: approvalSignature,
    });
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quote.id}`);
}
