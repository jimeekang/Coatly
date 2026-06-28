import {
  isMissingQuoteCustomerSnapshotColumnError,
  getPublicQuoteShareAccessError,
  mapQuoteDetail,
  mapQuoteListItem,
  normalizeQuoteCoatingType,
  resolveQuoteCustomerSummary,
  resolveQuoteStatus,
  type PublicQuoteDetail,
  type QuoteCoatingType,
  type QuoteDetail,
  type QuoteEstimateItemCategory,
  type QuoteLineItemRecord,
  type QuoteListItem,
  type QuoteSurfaceType,
} from '@/modules/quotes/domain/quotes';
import {
  mapQuoteClauseItems,
  mapQuoteScopeSections,
  type QuoteClauseItemView,
  type QuoteScopeSectionView,
} from '@/modules/quotes/domain/quote-form-structure';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

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
  working_days?: number | null;
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

export type QuoteDetailRow = {
  id: string;
  user_id: string;
  customer_id: string;
  job_type?: string | null;
  public_share_token?: string | null;
  public_share_expires_at?: string | null;
  public_share_revoked_at?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  approved_by_email?: string | null;
  approval_signature?: string | null;
  manual_adjustment_cents?: number | null;
  discount_cents?: number | null;
  deposit_percent?: number | null;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  working_days?: number | null;
  tier: string | null;
  notes: string | null;
  internal_notes?: string | null;
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
  linked_invoice_count?: number | null;
  created_at: string;
  updated_at: string;
  customer: QuoteListRow['customer'];
};

type PublicQuoteRow = {
  id: string;
  user_id: string;
  approved_at?: string | null;
  approved_by_name?: string | null;
  approved_by_email?: string | null;
  approval_signature?: string | null;
  public_share_expires_at?: string | null;
  public_share_revoked_at?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  job_type?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  working_days?: number | null;
  notes: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  discount_cents?: number | null;
  manual_adjustment_cents?: number | null;
  deposit_percent?: number | null;
  customer: QuoteListRow['customer'];
};

export type PublicQuoteApprovalRow = {
  id: string;
  user_id: string;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  public_share_expires_at?: string | null;
  public_share_revoked_at?: string | null;
  total_cents: number;
  customer: QuoteListRow['customer'];
};

export type QuoteDataClient =
  | Awaited<ReturnType<typeof createServerClient>>
  | ReturnType<typeof createAdminClient>;

export type QuoteHydratedRelations = {
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
  scope_sections: QuoteScopeSectionView[];
  clause_items: QuoteClauseItemView[];
};

type PublicQuoteHydratedRelations = {
  rooms: PublicQuoteDetail['rooms'];
  estimate_items: PublicQuoteDetail['estimate_items'];
  line_items: PublicQuoteDetail['line_items'];
  scope_sections: QuoteScopeSectionView[];
  clause_items: QuoteClauseItemView[];
};

const QUOTE_CUSTOMER_SELECT =
  'customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, address_line2, city, state, postcode)';
const QUOTE_LIST_SELECT = `id, user_id, customer_id, customer_email, customer_address, quote_number, title, status, valid_until, tier, subtotal_cents, gst_cents, total_cents, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_LIST_SELECT_LEGACY = `id, user_id, customer_id, quote_number, title, status, valid_until, tier, subtotal_cents, gst_cents, total_cents, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
export const QUOTE_DETAIL_SELECT = `id, user_id, customer_id, job_type, public_share_token, public_share_expires_at, public_share_revoked_at, approved_at, approved_by_name, approved_by_email, approval_signature, manual_adjustment_cents, discount_cents, deposit_percent, customer_email, customer_address, quote_number, title, status, valid_until, working_days, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_DETAIL_SELECT_WITHOUT_CUSTOMER_SNAPSHOT = `id, user_id, customer_id, job_type, public_share_token, public_share_expires_at, public_share_revoked_at, approved_at, approved_by_name, approved_by_email, approval_signature, manual_adjustment_cents, discount_cents, deposit_percent, quote_number, title, status, valid_until, working_days, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
export const QUOTE_DETAIL_SELECT_LEGACY = `id, user_id, customer_id, manual_adjustment_cents, discount_cents, deposit_percent, quote_number, title, status, valid_until, working_days, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const PUBLIC_QUOTE_DETAIL_SELECT = `id, user_id, job_type, approved_at, approved_by_name, approved_by_email, approval_signature, public_share_expires_at, public_share_revoked_at, customer_email, customer_address, quote_number, title, status, valid_until, working_days, notes, subtotal_cents, gst_cents, total_cents, discount_cents, manual_adjustment_cents, deposit_percent, ${QUOTE_CUSTOMER_SELECT}`;
const PUBLIC_QUOTE_DETAIL_SELECT_LEGACY = `id, user_id, approved_at, approved_by_name, approved_by_email, approval_signature, public_share_expires_at, public_share_revoked_at, quote_number, title, status, valid_until, working_days, notes, subtotal_cents, gst_cents, total_cents, discount_cents, manual_adjustment_cents, ${QUOTE_CUSTOMER_SELECT}`;
export const PUBLIC_QUOTE_APPROVAL_SELECT = `id, user_id, customer_email, customer_address, quote_number, title, status, valid_until, public_share_expires_at, public_share_revoked_at, total_cents, ${QUOTE_CUSTOMER_SELECT}`;
export const PUBLIC_QUOTE_APPROVAL_SELECT_LEGACY = `id, user_id, quote_number, title, status, valid_until, total_cents, ${QUOTE_CUSTOMER_SELECT}`;

function jsonObjectOrEmpty(value: unknown) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapQuoteListRows(rows: QuoteListRow[] | null): QuoteListItem[] {
  return (
    rows?.map((quote) =>
      mapQuoteListItem({
        ...quote,
        customer: resolveQuoteCustomerSummary({
          customer: quote.customer,
          customer_email: quote.customer_email,
          customer_address: quote.customer_address,
        }),
      })
    ) ?? []
  );
}

function isMissingPublicShareTokenColumnError(
  message: string | null | undefined
) {
  if (!message) return false;

  return (
    message.includes('quotes.public_share_token') &&
    message.includes('does not exist')
  );
}

export function isMissingQuoteSelectColumnError(
  message: string | null | undefined
) {
  if (!message) return false;

  return (
    isMissingQuoteCustomerSnapshotColumnError(message) ||
    isMissingPublicShareTokenColumnError(message)
  );
}

export async function getQuoteListItemsForUser(
  supabase: QuoteDataClient,
  userId: string
): Promise<{ data: QuoteListItem[]; error: string | null }> {
  const quoteListResult = await supabase
    .from('quotes')
    .select(QUOTE_LIST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  let data = quoteListResult.data as QuoteListRow[] | null;
  let error = quoteListResult.error;

  if (error && isMissingQuoteCustomerSnapshotColumnError(error.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_LIST_SELECT_LEGACY)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    data = legacyResult.data as QuoteListRow[] | null;
    error = legacyResult.error;
  }

  return {
    data: mapQuoteListRows(data),
    error: error?.message ?? null,
  };
}

export async function getQuoteListItemsByCustomer(
  supabase: QuoteDataClient,
  userId: string,
  customerId: string
): Promise<{ data: QuoteListItem[]; error: string | null }> {
  const quoteListResult = await supabase
    .from('quotes')
    .select(QUOTE_LIST_SELECT)
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  let data = quoteListResult.data as QuoteListRow[] | null;
  let error = quoteListResult.error;

  if (error && isMissingQuoteCustomerSnapshotColumnError(error.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_LIST_SELECT_LEGACY)
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    data = legacyResult.data as QuoteListRow[] | null;
    error = legacyResult.error;
  }

  return {
    data: mapQuoteListRows(data),
    error: error?.message ?? null,
  };
}

export async function getHydratedQuoteDetailForUser(
  supabase: QuoteDataClient,
  quoteId: string,
  userId: string
): Promise<{ data: QuoteDetail | null; error: string | null }> {
  const quoteResult = await supabase
    .from('quotes')
    .select(QUOTE_DETAIL_SELECT)
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single();
  let quote = quoteResult.data as QuoteDetailRow | null;
  let quoteError = quoteResult.error;

  if (
    quoteError &&
    isMissingQuoteCustomerSnapshotColumnError(quoteError.message)
  ) {
    const snapshotLegacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_WITHOUT_CUSTOMER_SNAPSHOT)
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    quote = snapshotLegacyResult.data as QuoteDetailRow | null;
    quoteError = snapshotLegacyResult.error;

    if (
      quoteError &&
      isMissingPublicShareTokenColumnError(quoteError.message)
    ) {
      const legacyResult = await supabase
        .from('quotes')
        .select(QUOTE_DETAIL_SELECT_LEGACY)
        .eq('id', quoteId)
        .eq('user_id', userId)
        .single();

      quote = legacyResult.data as QuoteDetailRow | null;
      quoteError = legacyResult.error;
    }
  } else if (
    quoteError &&
    isMissingPublicShareTokenColumnError(quoteError.message)
  ) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_LEGACY)
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    quote = legacyResult.data as QuoteDetailRow | null;
    quoteError = legacyResult.error;
  }

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const [relationsResult, linkedInvoicesResult] = await Promise.all([
    loadQuoteRelations(supabase, quoteId),
    getLinkedInvoiceCountForQuote(supabase, quoteId, userId),
  ]);

  if (relationsResult.error || !relationsResult.data) {
    return {
      data: null,
      error: relationsResult.error ?? 'Quote details could not be loaded.',
    };
  }

  if (linkedInvoicesResult.error) {
    return { data: null, error: linkedInvoicesResult.error };
  }

  return {
    data: mapHydratedQuoteDetail(
      {
        ...quote,
        linked_invoice_count: linkedInvoicesResult.count,
      },
      relationsResult.data
    ),
    error: null,
  };
}

export async function getHydratedQuoteDetailByPublicTokenForPdf(
  supabase: QuoteDataClient,
  token: string
): Promise<{ data: QuoteDetail | null; error: string | null }> {
  const quoteResult = await supabase
    .from('quotes')
    .select(QUOTE_DETAIL_SELECT)
    .eq('public_share_token', token)
    .single();
  let quote = quoteResult.data as QuoteDetailRow | null;
  let quoteError = quoteResult.error;

  if (
    quoteError &&
    isMissingQuoteCustomerSnapshotColumnError(quoteError.message)
  ) {
    const snapshotLegacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_WITHOUT_CUSTOMER_SNAPSHOT)
      .eq('public_share_token', token)
      .single();

    quote = snapshotLegacyResult.data as QuoteDetailRow | null;
    quoteError = snapshotLegacyResult.error;
  }

  if (quoteError && isMissingPublicShareTokenColumnError(quoteError.message)) {
    return {
      data: null,
      error:
        'Public quote sharing is not available until the latest database migration is applied.',
    };
  }

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const publicShareAccessError = getPublicQuoteShareAccessError(quote);
  if (publicShareAccessError) {
    return { data: null, error: publicShareAccessError };
  }

  const relationsResult = await loadQuoteRelations(supabase, quote.id);

  if (relationsResult.error || !relationsResult.data) {
    return {
      data: null,
      error: relationsResult.error ?? 'Quote details could not be loaded.',
    };
  }

  return {
    data: mapHydratedQuoteDetail(
      {
        ...quote,
        linked_invoice_count: 0,
      },
      relationsResult.data
    ),
    error: null,
  };
}

export async function getHydratedPublicQuoteDetailByToken(
  supabase: QuoteDataClient,
  token: string
): Promise<{
  data: { quote: PublicQuoteDetail; userId: string } | null;
  error: string | null;
}> {
  const quoteResult = await supabase
    .from('quotes')
    .select(PUBLIC_QUOTE_DETAIL_SELECT)
    .eq('public_share_token', token)
    .single();
  let quote = quoteResult.data as PublicQuoteRow | null;
  let quoteError = quoteResult.error;

  if (
    quoteError &&
    isMissingQuoteCustomerSnapshotColumnError(quoteError.message)
  ) {
    const legacyResult = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_DETAIL_SELECT_LEGACY)
      .eq('public_share_token', token)
      .single();

    quote = legacyResult.data as PublicQuoteRow | null;
    quoteError = legacyResult.error;
  }

  if (quoteError && quoteError.message.includes('public_share_token')) {
    return {
      data: null,
      error:
        'Public quote sharing is not available until the latest database migration is applied.',
    };
  }

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const publicShareAccessError = getPublicQuoteShareAccessError(quote);
  if (publicShareAccessError) {
    return { data: null, error: publicShareAccessError };
  }

  const relationsResult = await loadPublicQuoteRelations(supabase, quote.id);

  if (relationsResult.error || !relationsResult.data) {
    return {
      data: null,
      error: relationsResult.error ?? 'Quote details could not be loaded.',
    };
  }

  return {
    data: {
      quote: mapHydratedPublicQuoteDetail(quote, relationsResult.data),
      userId: quote.user_id,
    },
    error: null,
  };
}

export async function loadQuoteRelations(
  supabase: QuoteDataClient,
  quoteId: string
): Promise<{ data: QuoteHydratedRelations | null; error: string | null }> {
  const { data: rooms, error: roomsError } = await supabase
    .from('quote_rooms')
    .select(
      'id, quote_id, name, room_type, length_m, width_m, height_m, sort_order'
    )
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

  const { data: scopeSections, error: scopeSectionsError } = await supabase
    .from('quote_scope_sections')
    .select(
      'id, quote_id, section_kind, title, description, area_label, surface_category, is_optional, is_selected, pricing_status, measurement_status, source, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (scopeSectionsError) {
    return { data: null, error: scopeSectionsError.message };
  }

  const scopeSectionIds = scopeSections?.map((section) => section.id) ?? [];
  const { data: scopeSteps, error: scopeStepsError } = scopeSectionIds.length
    ? await supabase
        .from('quote_scope_steps')
        .select(
          'id, section_id, step_type, label, description, prep_type, paint_system, coats_min, coats_max, product_name, colour_status, colour, sheen, requires_confirmation, is_customer_visible, metadata, sort_order, created_at, updated_at'
        )
        .in('section_id', scopeSectionIds)
        .order('sort_order', { ascending: true })
    : { data: [], error: null };

  if (scopeStepsError) {
    return { data: null, error: scopeStepsError.message };
  }

  const { data: clauseItems, error: clauseItemsError } = await supabase
    .from('quote_clause_items')
    .select(
      'id, quote_id, section_id, clause_key, category, title, body, severity, source, is_customer_visible, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (clauseItemsError) {
    return { data: null, error: clauseItemsError.message };
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
                coating_type: normalizeQuoteCoatingType(
                  surface.coating_type as
                    | QuoteCoatingType
                    | 'touch_up_1coat'
                    | null
                ),
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
      estimate_items: (
        (estimateItems as QuoteEstimateItemRow[] | null) ?? []
      ).map((item) => ({
        id: item.id,
        quote_id: item.quote_id,
        category: item.category as QuoteEstimateItemCategory,
        label: item.label,
        quantity:
          typeof item.quantity === 'string'
            ? Number(item.quantity)
            : item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        sort_order: item.sort_order,
        metadata: item.metadata ?? {},
      })),
      line_items: ((lineItems as QuoteLineItemRecord[] | null) ?? []).map(
        (item) => ({
          ...item,
          quantity: Number(item.quantity),
          is_optional: item.is_optional ?? false,
          is_selected: item.is_optional ? (item.is_selected ?? false) : true,
        })
      ),
      scope_sections: mapQuoteScopeSections(
        (scopeSections ?? []) as Parameters<typeof mapQuoteScopeSections>[0],
        (scopeSteps ?? []) as Parameters<typeof mapQuoteScopeSections>[1]
      ),
      clause_items: mapQuoteClauseItems(
        (clauseItems ?? []) as Parameters<typeof mapQuoteClauseItems>[0]
      ),
    },
    error: null,
  };
}

async function loadPublicQuoteRelations(
  supabase: QuoteDataClient,
  quoteId: string
): Promise<{
  data: PublicQuoteHydratedRelations | null;
  error: string | null;
}> {
  const { data: rooms, error: roomsError } = await supabase
    .from('quote_rooms')
    .select('id, name, room_type, sort_order')
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
          'id, room_id, surface_type, area_m2, coating_type, rate_per_m2_cents, material_cost_cents, labour_cost_cents, notes'
        )
        .in('room_id', roomIds)
    : { data: [], error: null };

  if (surfacesError) {
    return { data: null, error: surfacesError.message };
  }

  const { data: estimateItems, error: estimateItemsError } = await supabase
    .from('quote_estimate_items')
    .select(
      'id, category, label, quantity, unit, unit_price_cents, total_cents, sort_order'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (estimateItemsError) {
    return { data: null, error: estimateItemsError.message };
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select(
      'id, name, category, unit, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected, sort_order'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return { data: null, error: lineItemsError.message };
  }

  const { data: scopeSections, error: scopeSectionsError } = await supabase
    .from('quote_scope_sections')
    .select(
      'id, quote_id, section_kind, title, description, area_label, surface_category, is_optional, is_selected, pricing_status, measurement_status, source, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (scopeSectionsError) {
    return { data: null, error: scopeSectionsError.message };
  }

  const scopeSectionIds = scopeSections?.map((section) => section.id) ?? [];
  const { data: scopeSteps, error: scopeStepsError } = scopeSectionIds.length
    ? await supabase
        .from('quote_scope_steps')
        .select(
          'id, section_id, step_type, label, description, prep_type, paint_system, coats_min, coats_max, product_name, colour_status, colour, sheen, requires_confirmation, is_customer_visible, metadata, sort_order, created_at, updated_at'
        )
        .in('section_id', scopeSectionIds)
        .order('sort_order', { ascending: true })
    : { data: [], error: null };

  if (scopeStepsError) {
    return { data: null, error: scopeStepsError.message };
  }

  const { data: clauseItems, error: clauseItemsError } = await supabase
    .from('quote_clause_items')
    .select(
      'id, quote_id, section_id, clause_key, category, title, body, severity, source, is_customer_visible, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (clauseItemsError) {
    return { data: null, error: clauseItemsError.message };
  }

  return {
    data: {
      rooms:
        rooms?.map((room) => ({
          id: room.id,
          name: room.name,
          room_type:
            room.room_type as PublicQuoteDetail['rooms'][number]['room_type'],
          total_cents: 0,
          surfaces:
            surfaces
              ?.filter((surface) => surface.room_id === room.id)
              .map((surface) => ({
                id: surface.id,
                surface_type: surface.surface_type as QuoteSurfaceType,
                area_m2: Number(surface.area_m2),
                coating_type: normalizeQuoteCoatingType(
                  surface.coating_type as
                    | QuoteCoatingType
                    | 'touch_up_1coat'
                    | null
                ),
                rate_per_m2_cents: surface.rate_per_m2_cents,
                notes: surface.notes,
                total_cents:
                  surface.material_cost_cents + surface.labour_cost_cents,
              })) ?? [],
        })) ?? [],
      estimate_items: (
        (estimateItems as Array<{
          id: string;
          category: string;
          label: string;
          quantity: number | string;
          unit: string;
          unit_price_cents: number;
          total_cents: number;
        }> | null) ?? []
      ).map((item) => ({
        id: item.id,
        category:
          item.category as PublicQuoteDetail['estimate_items'][number]['category'],
        label: item.label,
        quantity:
          typeof item.quantity === 'string'
            ? Number(item.quantity)
            : item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
      })),
      line_items: (
        (lineItems as Array<{
          id: string;
          name: string;
          category: string;
          unit: string;
          quantity: number | string;
          unit_price_cents: number;
          total_cents: number;
          notes: string | null;
          is_optional: boolean | null;
          is_selected: boolean | null;
        }> | null) ?? []
      ).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity:
          typeof item.quantity === 'string'
            ? Number(item.quantity)
            : item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        notes: item.notes,
        is_optional: item.is_optional ?? false,
        is_selected: item.is_optional ? (item.is_selected ?? false) : true,
      })),
      scope_sections: mapQuoteScopeSections(
        (scopeSections ?? []) as Parameters<typeof mapQuoteScopeSections>[0],
        (scopeSteps ?? []) as Parameters<typeof mapQuoteScopeSections>[1]
      ),
      clause_items: mapQuoteClauseItems(
        (clauseItems ?? []) as Parameters<typeof mapQuoteClauseItems>[0]
      ),
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
    pricing_method_inputs: quote.pricing_method_inputs as Record<
      string,
      unknown
    > | null,
    customer: resolveQuoteCustomerSummary({
      customer: quote.customer,
      customer_email: quote.customer_email,
      customer_address: quote.customer_address,
    }),
    internal_notes: quote.internal_notes ?? null,
    estimate_context: jsonObjectOrEmpty(quote.estimate_context),
    pricing_snapshot: jsonObjectOrEmpty(quote.pricing_snapshot),
    ...relations,
  });
}

function mapHydratedPublicQuoteDetail(
  quote: PublicQuoteRow,
  relations: PublicQuoteHydratedRelations
): PublicQuoteDetail {
  return {
    job_type:
      (quote.job_type as PublicQuoteDetail['job_type'] | null) ?? 'interior',
    approved_at: quote.approved_at ?? null,
    approved_by_name: quote.approved_by_name ?? null,
    approved_by_email: quote.approved_by_email ?? null,
    approval_signature: quote.approval_signature ?? null,
    quote_number: quote.quote_number,
    title: quote.title,
    status: resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }),
    valid_until: quote.valid_until,
    notes: quote.notes,
    subtotal_cents: quote.subtotal_cents,
    gst_cents: quote.gst_cents,
    total_cents: quote.total_cents,
    discount_cents: quote.discount_cents ?? 0,
    manual_adjustment_cents: quote.manual_adjustment_cents ?? 0,
    deposit_percent: quote.deposit_percent ?? 0,
    working_days:
      (quote as unknown as { working_days?: number | null }).working_days ??
      null,
    customer: resolveQuoteCustomerSummary({
      customer: quote.customer,
      customer_email: quote.customer_email,
      customer_address: quote.customer_address,
    }),
    rooms: relations.rooms,
    estimate_items: relations.estimate_items,
    line_items: relations.line_items,
    scope_sections: relations.scope_sections,
    clause_items: relations.clause_items,
  };
}

export async function getLinkedInvoiceCountForQuote(
  supabase: QuoteDataClient,
  quoteId: string,
  userId?: string
): Promise<{ count: number; error: string | null }> {
  let query = supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('quote_id', quoteId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { count, error } = await query;

  return {
    count: count ?? 0,
    error: error?.message ?? null,
  };
}
