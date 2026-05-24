import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
import {
  isMissingQuoteCustomerSnapshotColumnError,
  mapQuoteDetail,
  normalizeQuoteCoatingType,
  resolveQuoteCustomerSummary,
  type QuoteCoatingType,
  type QuoteEstimateItemCategory,
  type QuoteSurfaceType,
} from '@/lib/quotes';
import {
  mapQuoteClauseItems,
  mapQuoteScopeSections,
} from '@/lib/quote-form-structure';
import { getBusinessDocumentBranding } from '@/lib/businesses';
import { QuoteTemplate } from '@/lib/pdf/quote-template';

const QUOTE_CUSTOMER_SELECT =
  'customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, address_line2, city, state, postcode)';
const QUOTE_DETAIL_SELECT = `id, user_id, customer_id, job_type, customer_email, customer_address, quote_number, title, status, valid_until, working_days, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, manual_adjustment_cents, discount_cents, deposit_percent, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_DETAIL_SELECT_LEGACY = `id, user_id, customer_id, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSafePdfFilename(prefix: string, value: string) {
  const safeValue = value
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${safeValue || 'document'}.pdf`;
}

type QuotePdfRow = {
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
  notes: string | null;
  internal_notes: string | null;
  labour_margin_percent: number;
  material_margin_percent: number;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  manual_adjustment_cents?: number | null;
  discount_cents?: number | null;
  deposit_percent?: number | null;
  job_type?: string | null;
  working_days?: number | null;
  estimate_category?: string | null;
  property_type?: string | null;
  estimate_mode?: string | null;
  estimate_context?: Record<string, unknown> | null;
  pricing_snapshot?: Record<string, unknown> | null;
  pricing_method?: string | null;
  pricing_method_inputs?: Record<string, unknown> | null;
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');
  const publicToken = searchParams.get('token')?.trim() ?? null;

  if (!quoteId && !publicToken) {
    return NextResponse.json(
      { error: 'Quote ID or token required' },
      { status: 400 }
    );
  }

  if (publicToken && !UUID_RE.test(publicToken)) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const privateQuoteId = quoteId ?? '';
  const supabase = publicToken
    ? createAdminClient()
    : await createServerClient();
  const user = publicToken ? null : (await supabase.auth.getUser()).data.user;

  if (!publicToken && !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const quoteQuery = supabase.from('quotes').select(QUOTE_DETAIL_SELECT);
  const quoteResult = publicToken
    ? await quoteQuery.eq('public_share_token', publicToken).single()
    : await quoteQuery
        .eq('id', privateQuoteId)
        .eq('user_id', user!.id)
        .single();
  let quote = quoteResult.data as QuotePdfRow | null;
  let error = quoteResult.error;

  if (error && isMissingQuoteCustomerSnapshotColumnError(error.message)) {
    const legacyQuery = supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_LEGACY);
    const legacyResult = publicToken
      ? await legacyQuery.eq('public_share_token', publicToken).single()
      : await legacyQuery
          .eq('id', privateQuoteId)
          .eq('user_id', user!.id)
          .single();

    quote = legacyResult.data as QuotePdfRow | null;
    error = legacyResult.error;
  }

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const resolvedQuoteId = quote.id;
  const { data: rooms } = await supabase
    .from('quote_rooms')
    .select(
      'id, quote_id, name, room_type, length_m, width_m, height_m, sort_order'
    )
    .eq('quote_id', resolvedQuoteId)
    .order('sort_order', { ascending: true });

  const roomIds = rooms?.map((room) => room.id) ?? [];

  const { data: surfaces } = roomIds.length
    ? await supabase
        .from('quote_room_surfaces')
        .select(
          'id, room_id, surface_type, area_m2, coating_type, rate_per_m2_cents, material_cost_cents, labour_cost_cents, paint_litres_needed, notes'
        )
        .in('room_id', roomIds)
    : { data: [] };

  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select(
      'id, quote_id, material_item_id, name, category, unit, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected, sort_order, created_at, updated_at'
    )
    .eq('quote_id', resolvedQuoteId)
    .order('sort_order', { ascending: true });

  const { data: estimateItems } = await supabase
    .from('quote_estimate_items')
    .select(
      'id, quote_id, category, label, quantity, unit, unit_price_cents, total_cents, metadata, sort_order'
    )
    .eq('quote_id', resolvedQuoteId)
    .order('sort_order', { ascending: true });

  const { data: scopeSections } = await supabase
    .from('quote_scope_sections')
    .select(
      'id, quote_id, section_kind, title, description, area_label, surface_category, is_optional, is_selected, pricing_status, measurement_status, source, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', resolvedQuoteId)
    .order('sort_order', { ascending: true });

  const scopeSectionIds = scopeSections?.map((section) => section.id) ?? [];
  const { data: scopeSteps } = scopeSectionIds.length
    ? await supabase
        .from('quote_scope_steps')
        .select(
          'id, section_id, step_type, label, description, prep_type, paint_system, coats_min, coats_max, product_name, colour_status, colour, sheen, requires_confirmation, is_customer_visible, metadata, sort_order, created_at, updated_at'
        )
        .in('section_id', scopeSectionIds)
        .order('sort_order', { ascending: true })
    : { data: [] };

  const { data: clauseItems } = await supabase
    .from('quote_clause_items')
    .select(
      'id, quote_id, section_id, clause_key, category, title, body, severity, source, is_customer_visible, metadata, sort_order, created_at, updated_at'
    )
    .eq('quote_id', resolvedQuoteId)
    .order('sort_order', { ascending: true });

  const { data: businessBranding } = await getBusinessDocumentBranding(
    supabase,
    quote.user_id,
    user?.email ?? null
  );
  const logoUrl = await createStorageObjectDataUrl(
    supabase,
    businessBranding?.logoPath ?? null
  );

  const quoteData = mapQuoteDetail({
    ...quote,
    customer: resolveQuoteCustomerSummary({
      customer: quote.customer,
      customer_email: quote.customer_email,
      customer_address: quote.customer_address,
    }),
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
    estimate_items:
      estimateItems?.map((item) => ({
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
        metadata: (item.metadata ?? {}) as Record<string, unknown>,
      })) ?? [],
    line_items:
      lineItems?.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        is_optional: item.is_optional ?? false,
        is_selected: item.is_optional ? (item.is_selected ?? false) : true,
      })) ?? [],
    scope_sections: mapQuoteScopeSections(
      (scopeSections ?? []) as Parameters<typeof mapQuoteScopeSections>[0],
      (scopeSteps ?? []) as Parameters<typeof mapQuoteScopeSections>[1]
    ),
    clause_items: mapQuoteClauseItems(
      (clauseItems ?? []) as Parameters<typeof mapQuoteClauseItems>[0]
    ),
  });

  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote: quoteData,
      businessName: businessBranding?.name || 'My Painting Business',
      abn: businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? user?.email ?? null,
      businessAddress: businessBranding?.address ?? null,
      logoUrl,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${getSafePdfFilename('quote', quoteData.quote_number)}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
