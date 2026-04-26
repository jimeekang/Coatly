'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  buildQuoteCustomerAddress,
  calculateQuoteLineItemsSubtotal,
  calculateQuotePreview,
  composeQuoteTotals,
  formatQuoteCustomerPropertyAddress,
  isMissingQuoteCustomerSnapshotColumnError,
  mapQuoteDetail,
  mapQuoteListItem,
  normalizeQuoteCoatingType,
  parseQuoteCreateInput,
  resolveQuoteStatus,
  resolveQuoteCustomerSummary,
  serializeLegacyQuoteCoatingType,
  serializeQuoteCoatingType,
  type QuoteCustomerOption,
  type QuoteCustomerPropertyOption,
  type QuoteCoatingType,
  type QuoteDetail,
  type QuoteEstimateItemCategory,
  type QuoteListItem,
  type QuoteLineItemRecord,
  type PublicQuoteDetail,
  type QuoteSurfaceType,
} from '@/lib/quotes';
import { calculateInteriorEstimate } from '@/lib/interior-estimates';
import { calculateExteriorEstimate } from '@/lib/exterior-estimates';
import { getBusinessDocumentBranding, getBusinessRateSettings } from '@/lib/businesses';
import { sendQuoteApprovalNotification, sendQuoteEmail } from '@/lib/email/resend';
import { QuoteTemplate } from '@/lib/pdf/quote-template';
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
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
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
  discount_cents?: number | null;
  deposit_percent?: number | null;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
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
  `id, user_id, customer_id, public_share_token, approved_at, approved_by_name, approved_by_email, approval_signature, manual_adjustment_cents, discount_cents, deposit_percent, customer_email, customer_address, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;
const QUOTE_DETAIL_SELECT_LEGACY =
  `id, user_id, customer_id, manual_adjustment_cents, discount_cents, deposit_percent, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_DETAIL_SELECT =
  `id, user_id, approved_at, approved_by_name, approved_by_email, approval_signature, customer_email, customer_address, quote_number, title, status, valid_until, notes, subtotal_cents, gst_cents, total_cents, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_DETAIL_SELECT_LEGACY =
  `id, user_id, approved_at, approved_by_name, approved_by_email, approval_signature, quote_number, title, status, valid_until, notes, subtotal_cents, gst_cents, total_cents, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_APPROVAL_SELECT =
  `id, user_id, customer_email, customer_address, quote_number, title, status, valid_until, total_cents, ${QUOTE_CUSTOMER_SELECT}`;

const PUBLIC_QUOTE_APPROVAL_SELECT_LEGACY =
  `id, user_id, quote_number, title, status, valid_until, total_cents, ${QUOTE_CUSTOMER_SELECT}`;

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

type PublicQuoteRow = {
  id: string;
  user_id: string;
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
  customer: QuoteListRow['customer'];
};

type PublicQuoteHydratedRelations = {
  rooms: PublicQuoteDetail['rooms'];
  estimate_items: PublicQuoteDetail['estimate_items'];
  line_items: PublicQuoteDetail['line_items'];
};

type PublicQuoteApprovalRow = {
  id: string;
  user_id: string;
  customer_email?: string | null;
  customer_address?: string | null;
  quote_number: string;
  title: string | null;
  status: string;
  valid_until: string | null;
  total_cents: number;
  customer: QuoteListRow['customer'];
};

type CreateQuoteOptions = {
  submitIntent?: 'save' | 'send_email';
};

async function sendQuoteDocumentEmail(input: {
  supabase: QuoteDataClient;
  userId: string;
  userEmail: string | null;
  quoteId: string;
  to: string;
}) {
  const [quoteDetailResult, businessBrandingResult] = await Promise.all([
    getQuote(input.quoteId),
    getBusinessDocumentBranding(input.supabase, input.userId, input.userEmail),
  ]);

  if (quoteDetailResult.error || !quoteDetailResult.data) {
    return {
      error: quoteDetailResult.error ?? 'Quote email could not be prepared.',
    };
  }

  const businessBranding = businessBrandingResult.data;
  const businessName = businessBranding?.name || 'My Painting Business';
  const logoUrl = await createStorageObjectDataUrl(
    input.supabase,
    businessBranding?.logoPath ?? null
  );
  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote: quoteDetailResult.data,
      businessName,
      abn: businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? input.userEmail,
      logoUrl,
    })
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.coatly.com.au';

  return sendQuoteEmail({
    to: input.to,
    customerName: quoteDetailResult.data.customer.name,
    businessName,
    quoteNumber: quoteDetailResult.data.quote_number,
    quoteTitle: quoteDetailResult.data.title,
    totalFormatted: formatAUD(quoteDetailResult.data.total_cents),
    validUntil: quoteDetailResult.data.valid_until
      ? formatDate(quoteDetailResult.data.valid_until)
      : null,
    approvalUrl: `${appUrl}/q/${quoteDetailResult.data.public_share_token}`,
    pdfAttachment: Buffer.from(pdfBuffer),
  });
}

function parseBooleanFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value === 'true';
}

function parseTrimmedFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type QuoteRoomSurfaceInsertSource = {
  surface_type: QuoteSurfaceType;
  area_m2: number;
  coating_type: QuoteCoatingType | null;
  rate_per_m2_cents: number;
  material_cost_cents: number;
  labour_cost_cents: number;
  paint_litres_needed: number | null;
  notes: string | null;
};

function isLegacyQuoteCoatingConstraintError(message: string | null | undefined) {
  if (!message) return false;

  return (
    message.includes('quote_room_surfaces_coating_type_check') ||
    (message.includes('coating_type') && message.includes('check constraint'))
  );
}

function buildQuoteRoomSurfaceInsertRows(
  roomId: string,
  surfaces: QuoteRoomSurfaceInsertSource[],
  complexity: QuoteCoatingType | QuoteDetail['complexity'] | string | null | undefined,
  useLegacyCoatingType = false
) {
  return surfaces.map((surface) => ({
    room_id: roomId,
    surface_type: surface.surface_type,
    area_m2: surface.area_m2,
    coating_type: useLegacyCoatingType
      ? serializeLegacyQuoteCoatingType(surface.coating_type)
      : serializeQuoteCoatingType(surface.coating_type),
    rate_per_m2_cents: surface.rate_per_m2_cents,
    material_cost_cents: surface.material_cost_cents,
    labour_cost_cents: surface.labour_cost_cents,
    paint_litres_needed: surface.paint_litres_needed,
    tier: complexity ?? undefined,
    notes: surface.notes,
  }));
}

async function insertQuoteRoomSurfaces(
  supabase: QuoteDataClient,
  roomId: string,
  surfaces: QuoteRoomSurfaceInsertSource[],
  complexity: QuoteDetail['complexity'] | string | null | undefined
) {
  const rows = buildQuoteRoomSurfaceInsertRows(roomId, surfaces, complexity, false);
  let result = await supabase.from('quote_room_surfaces').insert(rows);

  if (
    result.error &&
    surfaces.some((surface) => surface.coating_type === 'refresh_1coat') &&
    isLegacyQuoteCoatingConstraintError(result.error.message)
  ) {
    result = await supabase
      .from('quote_room_surfaces')
      .insert(buildQuoteRoomSurfaceInsertRows(roomId, surfaces, complexity, true));
  }

  return result;
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
                coating_type: normalizeQuoteCoatingType(
                  surface.coating_type as QuoteCoatingType | 'touch_up_1coat' | null
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

async function loadPublicQuoteRelations(
  supabase: QuoteDataClient,
  quoteId: string
): Promise<{ data: PublicQuoteHydratedRelations | null; error: string | null }> {
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
    .select('id, category, label, quantity, unit, unit_price_cents, total_cents, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (estimateItemsError) {
    return { data: null, error: estimateItemsError.message };
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, name, category, unit, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected, sort_order')
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
          name: room.name,
          room_type: room.room_type as PublicQuoteDetail['rooms'][number]['room_type'],
          total_cents: 0,
          surfaces:
            surfaces
              ?.filter((surface) => surface.room_id === room.id)
              .map((surface) => ({
                id: surface.id,
                surface_type: surface.surface_type as QuoteSurfaceType,
                area_m2: Number(surface.area_m2),
                coating_type: normalizeQuoteCoatingType(
                  surface.coating_type as QuoteCoatingType | 'touch_up_1coat' | null
                ),
                rate_per_m2_cents: surface.rate_per_m2_cents,
                notes: surface.notes,
                total_cents: surface.material_cost_cents + surface.labour_cost_cents,
              })) ?? [],
        })) ?? [],
      estimate_items: ((estimateItems as Array<{
        id: string;
        category: string;
        label: string;
        quantity: number | string;
        unit: string;
        unit_price_cents: number;
        total_cents: number;
      }> | null) ?? []).map((item) => ({
        id: item.id,
        category: item.category as PublicQuoteDetail['estimate_items'][number]['category'],
        label: item.label,
        quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
      })),
      line_items: ((lineItems as Array<{
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
      }> | null) ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        notes: item.notes,
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
    working_days: (quote as unknown as { working_days?: number | null }).working_days ?? null,
    customer: resolveQuoteCustomerSummary({
      customer: quote.customer,
      customer_email: quote.customer_email,
      customer_address: quote.customer_address,
    }),
    rooms: relations.rooms,
    estimate_items: relations.estimate_items,
    line_items: relations.line_items,
  };
}

const QUOTE_INVOICE_LOCK_MESSAGE =
  'This quote can no longer be edited because an invoice already exists for it.';
const QUOTE_DELETE_LOCK_MESSAGE = 'Quotes with linked invoices can no longer be deleted.';

async function getLinkedInvoiceCountForQuote(
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

function normalizeCustomerEmails(customer: { email?: string | null; emails?: unknown }) {
  const emails = [
    customer.email,
    ...(Array.isArray(customer.emails) ? customer.emails : []),
  ]
    .filter((email): email is string => typeof email === 'string')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function normalizeCustomerPropertyOptions(customer: {
  properties?: unknown;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
}) {
  const rawProperties = Array.isArray(customer.properties) ? customer.properties : [];
  const properties = rawProperties
    .map((property, index): QuoteCustomerPropertyOption | null => {
      if (!property || typeof property !== 'object') return null;
      const record = property as Record<string, unknown>;
      const option = {
        label: typeof record.label === 'string' && record.label.trim()
          ? record.label.trim()
          : `Property ${index + 1}`,
        address_line1: typeof record.address_line1 === 'string' ? record.address_line1.trim() : '',
        address_line2: typeof record.address_line2 === 'string' ? record.address_line2.trim() : '',
        city: typeof record.city === 'string' ? record.city.trim() : '',
        state: typeof record.state === 'string' ? record.state.trim() : '',
        postcode: typeof record.postcode === 'string' ? record.postcode.trim() : '',
        notes: typeof record.notes === 'string' ? record.notes.trim() : '',
        address: null,
      };

      return {
        ...option,
        address: formatQuoteCustomerPropertyAddress(option),
      };
    })
    .filter((property): property is QuoteCustomerPropertyOption => Boolean(property?.address));

  const fallbackAddress = buildQuoteCustomerAddress(customer);
  if (properties.length === 0 && fallbackAddress) {
    properties.push({
      label: 'Primary property',
      address_line1: customer.address_line1 ?? '',
      address_line2: customer.address_line2 ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      postcode: customer.postcode ?? '',
      notes: '',
      address: fallbackAddress,
    });
  }

  return properties;
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
      .select('id, name, company_name, email, emails, phone, address_line1, address_line2, city, state, postcode, properties')
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
          emails: normalizeCustomerEmails(customer),
          phone: customer.phone,
          address: buildQuoteCustomerAddress(customer),
          properties: normalizeCustomerPropertyOptions(customer),
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

export async function getQuotesByCustomer(
  customerId: string
): Promise<{ data: QuoteListItem[]; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const quoteListResult = await supabase
    .from('quotes')
    .select(QUOTE_LIST_SELECT)
    .eq('user_id', user.id)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  let data = quoteListResult.data as QuoteListRow[] | null;
  let error = quoteListResult.error;

  if (error && isMissingQuoteCustomerSnapshotColumnError(error.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_LIST_SELECT_LEGACY)
      .eq('user_id', user.id)
      .eq('customer_id', customerId)
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

  const [relationsResult, linkedInvoicesResult] = await Promise.all([
    loadQuoteRelations(supabase, id),
    getLinkedInvoiceCountForQuote(supabase, id, user.id),
  ]);

  if (relationsResult.error || !relationsResult.data) {
    return { data: null, error: relationsResult.error ?? 'Quote details could not be loaded.' };
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
        quote: PublicQuoteDetail;
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

  // Reject non-UUID tokens before hitting the DB — blocks brute-force attempts cheaply
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(trimmedToken)) {
    return { data: null, error: 'Quote not found.' };
  }

  const supabase = createAdminClient();
  const quoteResult = await supabase
    .from('quotes')
    .select(PUBLIC_QUOTE_DETAIL_SELECT)
    .eq('public_share_token', trimmedToken)
    .single();
  let quote = quoteResult.data as PublicQuoteRow | null;
  let quoteError = quoteResult.error;

  if (quoteError && isMissingQuoteCustomerSnapshotColumnError(quoteError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_DETAIL_SELECT_LEGACY)
      .eq('public_share_token', trimmedToken)
      .single();

    quote = legacyResult.data as PublicQuoteRow | null;
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
    loadPublicQuoteRelations(supabase, quote.id),
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
      quote: mapHydratedPublicQuoteDetail(quote, relationsResult.data),
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
    .select('id, email, emails, address_line1, address_line2, city, state, postcode, properties')
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
  const customerEmails = normalizeCustomerEmails(customer);
  const customerProperties = normalizeCustomerPropertyOptions(customer);
  const selectedCustomerEmail = parsed.data.customer_email ?? customerEmails[0] ?? null;
  const selectedCustomerAddress =
    parsed.data.customer_address ?? customerProperties[0]?.address ?? buildQuoteCustomerAddress(customer);

  if (shouldSendEmail && !selectedCustomerEmail?.trim()) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  if (parsed.data.customer_email && !customerEmails.includes(parsed.data.customer_email)) {
    return { error: 'Select a saved email for this customer before sending.' };
  }

  if (
    parsed.data.customer_address &&
    !customerProperties.some((property) => property.address === parsed.data.customer_address)
  ) {
    return { error: 'Select a saved property for this customer before saving the quote.' };
  }

  const { data: userRates } = await getBusinessRateSettings(supabase, user.id);
  const effectiveRates = userRates ?? DEFAULT_RATE_SETTINGS;
  const interiorEstimate = parsed.data.interior_estimate
    ? calculateInteriorEstimate(parsed.data.interior_estimate, effectiveRates)
    : null;
  const exteriorEstimateResult = parsed.data.exterior_estimate
    ? calculateExteriorEstimate(parsed.data.exterior_estimate as Parameters<typeof calculateExteriorEstimate>[0], effectiveRates)
    : null;
  const adjustmentCents = parsed.data.manual_adjustment_cents ?? 0;
  const discountCents = parsed.data.discount_cents ?? 0;
  const depositPercent = parsed.data.deposit_percent ?? 0;
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
      discount_cents: discountCents,
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
      discount_cents: discountCents,
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
      discount_cents: discountCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'manual', inputs };
    preview = {
      rooms: [],
      base_subtotal_cents: result.subtotal_cents,
      ...totals,
    };
  } else if (exteriorEstimateResult) {
    // hybrid with exterior estimate
    const base = exteriorEstimateResult.subtotal_cents;
    const totals = composeQuoteTotals({
      base_subtotal_cents: base,
      adjustment_cents: adjustmentCents,
      discount_cents: discountCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'hybrid', inputs: null };
    preview = { rooms: [], base_subtotal_cents: base, ...totals };
  } else if (interiorEstimate) {
    // hybrid / sqm_rate with interior estimate
    const base = interiorEstimate.subtotal_cents;
    const labourMarkup = Math.round(base * (parsed.data.labour_margin_percent / 100));
    const materialMarkup = Math.round(base * (parsed.data.material_margin_percent / 100));
    const subtotal = base + labourMarkup + materialMarkup;
    const totals = composeQuoteTotals({
      base_subtotal_cents: subtotal,
      adjustment_cents: adjustmentCents,
      discount_cents: discountCents,
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
    customer_email: selectedCustomerEmail,
    customer_address: selectedCustomerAddress,
    quote_number: quoteNumber,
    title: parsed.data.title,
    status: parsed.data.status,
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
    discount_cents: discountCents,
    deposit_percent: depositPercent,
    estimate_category: interiorEstimate ? 'interior' : exteriorEstimateResult ? 'exterior' : 'manual',
    property_type: parsed.data.interior_estimate?.property_type ?? null,
    estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
    estimate_context: parsed.data.interior_estimate ?? parsed.data.exterior_estimate ?? {},
    pricing_snapshot: interiorEstimate?.snapshot ?? exteriorEstimateResult?.snapshot ?? {},
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

      const { error: surfacesError } = await insertQuoteRoomSurfaces(
        supabase,
        insertedRoom.id,
        room.surfaces,
        parsed.data.complexity
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

  if (shouldSendEmail) {
    const { error: emailError } = await sendQuoteDocumentEmail({
      supabase,
      userId: user.id,
      userEmail: user.email ?? null,
      quoteId: quote.id,
      to: selectedCustomerEmail ?? '',
    });

    if (emailError) {
      return { error: emailError };
    }

    const { error: sentStatusError } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quote.id)
      .eq('user_id', user.id);

    if (sentStatusError) {
      return { error: sentStatusError.message };
    }
  }

  revalidatePath('/quotes');
  redirect(shouldSendEmail ? `/quotes/${quote.id}?emailSent=1` : `/quotes/${quote.id}`);
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

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(supabase, quoteId, user.id);
  if (linkedInvoicesResult.error || linkedInvoicesResult.count > 0) {
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

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(supabase, quote.id);
  if (linkedInvoicesResult.error || linkedInvoicesResult.count > 0) {
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
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

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
    .select(PUBLIC_QUOTE_APPROVAL_SELECT)
    .eq('public_share_token', quoteToken)
    .single();
  let quote = quoteResult.data as PublicQuoteApprovalRow | null;
  let quoteError = quoteResult.error;

  if (quoteError && isMissingQuoteCustomerSnapshotColumnError(quoteError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_APPROVAL_SELECT_LEGACY)
      .eq('public_share_token', quoteToken)
      .single();

    quote = legacyResult.data as PublicQuoteApprovalRow | null;
    quoteError = legacyResult.error;
  }

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

  const approvedAt = new Date().toISOString();

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_by_name: approvedByName,
      approved_by_email: approvedByEmail,
      approval_signature: approvalSignature,
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

export async function rejectPublicQuote(formData: FormData): Promise<void> {
  const quoteToken = parseTrimmedFormValue(formData.get('quoteToken'));
  const rejectedByName = parseTrimmedFormValue(formData.get('rejectedByName'));
  const rejectedByEmail = parseTrimmedFormValue(formData.get('rejectedByEmail')).toLowerCase();

  if (!quoteToken || !rejectedByName || !rejectedByEmail) {
    return;
  }

  if (!isValidEmail(rejectedByEmail)) {
    return;
  }

  const supabase = createAdminClient();
  const quoteResult = await supabase
    .from('quotes')
    .select('id, status, valid_until')
    .eq('public_share_token', quoteToken)
    .single();
  const quote = quoteResult.data as { id: string; status: string; valid_until: string | null } | null;

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

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      status: 'rejected',
    })
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

  if (updateQuoteError) {
    return;
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quote.id}`);
}

export async function duplicateQuote(quoteId: string): Promise<{ error: string } | void> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const quoteResult = await supabase
    .from('quotes')
    .select(QUOTE_DETAIL_SELECT)
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();
  let sourceQuote = quoteResult.data as QuoteDetailRow | null;
  let sourceError = quoteResult.error;

  if (sourceError && isMissingQuoteSelectColumnError(sourceError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_LEGACY)
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single();
    sourceQuote = legacyResult.data as QuoteDetailRow | null;
    sourceError = legacyResult.error;
  }

  if (sourceError || !sourceQuote) {
    return { error: sourceError?.message ?? 'Quote not found.' };
  }

  const relationsResult = await loadQuoteRelations(supabase, quoteId);
  if (relationsResult.error || !relationsResult.data) {
    return { error: relationsResult.error ?? 'Quote details could not be loaded.' };
  }

  const { rooms, estimate_items, line_items } = relationsResult.data;

  const { data: newQuoteNumber, error: quoteNumberError } = await supabase.rpc(
    'generate_quote_number',
    { user_uuid: user.id }
  );

  if (quoteNumberError || !newQuoteNumber) {
    return { error: quoteNumberError?.message ?? 'Quote number could not be generated.' };
  }

  const quoteInsert = {
    user_id: user.id,
    customer_id: sourceQuote.customer_id,
    customer_email: sourceQuote.customer_email ?? null,
    customer_address: sourceQuote.customer_address ?? null,
    quote_number: newQuoteNumber,
    title: sourceQuote.title ? `${sourceQuote.title} (Copy)` : 'Copy',
    status: 'draft' as const,
    valid_until: null,
    tier: sourceQuote.tier,
    notes: sourceQuote.notes,
    internal_notes: sourceQuote.internal_notes,
    labour_margin_percent: sourceQuote.labour_margin_percent,
    material_margin_percent: sourceQuote.material_margin_percent,
    subtotal_cents: sourceQuote.subtotal_cents,
    gst_cents: sourceQuote.gst_cents,
    total_cents: sourceQuote.total_cents,
    manual_adjustment_cents: sourceQuote.manual_adjustment_cents ?? 0,
    discount_cents: sourceQuote.discount_cents ?? 0,
    deposit_percent: sourceQuote.deposit_percent ?? 0,
    estimate_category: sourceQuote.estimate_category ?? undefined,
    property_type: sourceQuote.property_type ?? undefined,
    estimate_mode: sourceQuote.estimate_mode ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    estimate_context: (sourceQuote.estimate_context ?? {}) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing_snapshot: (sourceQuote.pricing_snapshot ?? {}) as any,
    pricing_method: sourceQuote.pricing_method ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing_method_inputs: sourceQuote.pricing_method_inputs as any,
  };

  let { data: newQuote, error: insertError } = await supabase
    .from('quotes')
    .insert(quoteInsert)
    .select('id')
    .single();

  if (insertError && isMissingQuoteCustomerSnapshotColumnError(insertError.message)) {
    const { customer_email: _e, customer_address: _a, ...legacyInsert } = quoteInsert;
    void _e; void _a;
    const legacyResult = await supabase.from('quotes').insert(legacyInsert).select('id').single();
    newQuote = legacyResult.data;
    insertError = legacyResult.error;
  }

  if (insertError || !newQuote) {
    return { error: insertError?.message ?? 'Quote could not be duplicated.' };
  }

  const newQuoteId = newQuote.id;

  if (estimate_items.length > 0) {
    const { error: estimateItemsError } = await supabase.from('quote_estimate_items').insert(
      estimate_items.map((item, index) => ({
        quote_id: newQuoteId,
        category: item.category,
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (item.metadata ?? {}) as any,
        sort_order: index,
      }))
    );
    if (estimateItemsError) {
      await supabase.from('quotes').delete().eq('id', newQuoteId).eq('user_id', user.id);
      return { error: estimateItemsError.message };
    }
  }

  for (const [roomIndex, room] of rooms.entries()) {
    const { data: insertedRoom, error: roomError } = await supabase
      .from('quote_rooms')
      .insert({
        quote_id: newQuoteId,
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
      await supabase.from('quotes').delete().eq('id', newQuoteId).eq('user_id', user.id);
      return { error: roomError?.message ?? 'Room could not be copied.' };
    }

    if (room.surfaces.length > 0) {
      const { error: surfacesError } = await insertQuoteRoomSurfaces(
        supabase,
        insertedRoom.id,
        room.surfaces,
        null
      );
      if (surfacesError) {
        await supabase.from('quotes').delete().eq('id', newQuoteId).eq('user_id', user.id);
        return { error: surfacesError.message };
      }
    }
  }

  if (line_items.length > 0) {
    const { error: lineItemsError } = await supabase.from('quote_line_items').insert(
      line_items.map((item, index) => ({
        quote_id: newQuoteId,
        material_item_id: item.material_item_id ?? null,
        name: item.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: item.category as any,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        notes: item.notes ?? null,
        is_optional: item.is_optional,
        is_selected: item.is_selected,
        sort_order: index,
      }))
    );
    if (lineItemsError) {
      await supabase.from('quotes').delete().eq('id', newQuoteId).eq('user_id', user.id);
      return { error: lineItemsError.message };
    }
  }

  revalidatePath('/quotes');
  redirect(`/quotes/${newQuoteId}/edit`);
}

export async function updateQuote(
  quoteId: string,
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

  // Verify ownership
  const { data: existing, error: existingError } = await supabase
    .from('quotes')
    .select('id, quote_number, customer_id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (existingError || !existing) {
    return { error: 'Quote not found.' };
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(supabase, quoteId, user.id);
  if (linkedInvoicesResult.error) {
    return { error: linkedInvoicesResult.error };
  }

  if (linkedInvoicesResult.count > 0) {
    return { error: QUOTE_INVOICE_LOCK_MESSAGE };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, email, emails, address_line1, address_line2, city, state, postcode, properties')
    .eq('id', parsed.data.customer_id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) return { error: customerError.message };
  if (!customer) return { error: 'Selected customer was not found.' };

  const shouldSendEmail = options.submitIntent === 'send_email';
  const customerEmails = normalizeCustomerEmails(customer);
  const customerProperties = normalizeCustomerPropertyOptions(customer);
  const selectedCustomerEmail = parsed.data.customer_email ?? customerEmails[0] ?? null;
  const selectedCustomerAddress =
    parsed.data.customer_address ?? customerProperties[0]?.address ?? buildQuoteCustomerAddress(customer);

  if (shouldSendEmail && !selectedCustomerEmail?.trim()) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  const { data: userRates } = await getBusinessRateSettings(supabase, user.id);
  const effectiveRates = userRates ?? DEFAULT_RATE_SETTINGS;
  const interiorEstimate = parsed.data.interior_estimate
    ? calculateInteriorEstimate(parsed.data.interior_estimate, effectiveRates)
    : null;
  const exteriorEstimateResult = parsed.data.exterior_estimate
    ? calculateExteriorEstimate(parsed.data.exterior_estimate as Parameters<typeof calculateExteriorEstimate>[0], effectiveRates)
    : null;
  const adjustmentCents = parsed.data.manual_adjustment_cents ?? 0;
  const discountCents = parsed.data.discount_cents ?? 0;
  const depositPercent = parsed.data.deposit_percent ?? 0;
  const lineItems = parsed.data.line_items ?? [];
  const pricingMethod = parsed.data.pricing_method ?? 'hybrid';
  const rawMethodInputs = parsed.data.pricing_method_inputs;

  let resolvedPricingInputs: PricingMethodInputs | null = null;
  let preview: ReturnType<typeof calculateQuotePreview>;

  if (pricingMethod === 'day_rate' && rawMethodInputs?.method === 'day_rate') {
    const inputs: DayRateInputs = rawMethodInputs.inputs;
    const result = calculateDayRateQuote(inputs);
    const totals = composeQuoteTotals({ base_subtotal_cents: result.subtotal_cents, adjustment_cents: adjustmentCents, discount_cents: discountCents, line_items: lineItems });
    resolvedPricingInputs = { method: 'day_rate', inputs };
    preview = { rooms: [], base_subtotal_cents: result.subtotal_cents, ...totals };
  } else if (pricingMethod === 'room_rate' && rawMethodInputs?.method === 'room_rate') {
    const inputs: RoomRateInputs = rawMethodInputs.inputs;
    const result = calculateRoomRateQuote(inputs);
    const totals = composeQuoteTotals({ base_subtotal_cents: result.subtotal_cents, adjustment_cents: adjustmentCents, discount_cents: discountCents, line_items: lineItems });
    resolvedPricingInputs = { method: 'room_rate', inputs };
    preview = { rooms: [], base_subtotal_cents: result.subtotal_cents, ...totals };
  } else if (pricingMethod === 'manual' && rawMethodInputs?.method === 'manual') {
    const inputs: ManualInputs = rawMethodInputs.inputs;
    const result = calculateManualQuote(inputs);
    const totals = composeQuoteTotals({ base_subtotal_cents: result.subtotal_cents, adjustment_cents: adjustmentCents, discount_cents: discountCents, line_items: lineItems });
    resolvedPricingInputs = { method: 'manual', inputs };
    preview = { rooms: [], base_subtotal_cents: result.subtotal_cents, ...totals };
  } else if (exteriorEstimateResult) {
    const base = exteriorEstimateResult.subtotal_cents;
    const totals = composeQuoteTotals({ base_subtotal_cents: base, adjustment_cents: adjustmentCents, discount_cents: discountCents, line_items: lineItems });
    resolvedPricingInputs = { method: 'hybrid', inputs: null };
    preview = { rooms: [], base_subtotal_cents: base, ...totals };
  } else if (interiorEstimate) {
    const base = interiorEstimate.subtotal_cents;
    const labourMarkup = Math.round(base * (parsed.data.labour_margin_percent / 100));
    const materialMarkup = Math.round(base * (parsed.data.material_margin_percent / 100));
    const subtotal = base + labourMarkup + materialMarkup;
    const totals = composeQuoteTotals({ base_subtotal_cents: subtotal, adjustment_cents: adjustmentCents, discount_cents: discountCents, line_items: lineItems });
    resolvedPricingInputs = { method: 'hybrid', inputs: null };
    preview = { rooms: [], base_subtotal_cents: base, ...totals };
  } else {
    resolvedPricingInputs = { method: pricingMethod as 'sqm_rate' | 'hybrid', inputs: null };
    preview = calculateQuotePreview(parsed.data);
  }

  // Delete old relations
  const { data: oldRooms } = await supabase
    .from('quote_rooms')
    .select('id')
    .eq('quote_id', quoteId);

  const oldRoomIds = oldRooms?.map((r) => r.id) ?? [];
  if (oldRoomIds.length > 0) {
    await supabase.from('quote_room_surfaces').delete().in('room_id', oldRoomIds);
    await supabase.from('quote_rooms').delete().eq('quote_id', quoteId);
  }
  await supabase.from('quote_estimate_items').delete().eq('quote_id', quoteId);
  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);

  // Resolve quote number — allow custom override if different from existing
  let resolvedQuoteNumber = existing.quote_number;
  if (parsed.data.quote_number && parsed.data.quote_number !== existing.quote_number) {
    // Check uniqueness: no other quote owned by this user should have the same number
    const { data: conflict } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', user.id)
      .eq('quote_number', parsed.data.quote_number)
      .neq('id', quoteId)
      .maybeSingle();
    if (conflict) {
      return { error: `Quote number "${parsed.data.quote_number}" is already in use.` };
    }
    resolvedQuoteNumber = parsed.data.quote_number;
  }

  // Update the quote record
  const quoteUpdatePayload = {
    customer_id: parsed.data.customer_id,
    customer_email: selectedCustomerEmail,
    customer_address: selectedCustomerAddress,
    quote_number: resolvedQuoteNumber,
    title: parsed.data.title,
    status: parsed.data.status,
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
    discount_cents: discountCents,
    deposit_percent: depositPercent,
    estimate_category: interiorEstimate ? 'interior' : exteriorEstimateResult ? 'exterior' : 'manual',
    property_type: parsed.data.interior_estimate?.property_type ?? null,
    estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
    estimate_context: parsed.data.interior_estimate ?? parsed.data.exterior_estimate ?? {},
    pricing_snapshot: interiorEstimate?.snapshot ?? exteriorEstimateResult?.snapshot ?? {},
    pricing_method: pricingMethod,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing_method_inputs: resolvedPricingInputs as any,
  };

  let { error: updateError } = await supabase
    .from('quotes')
    .update(quoteUpdatePayload)
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (updateError && isMissingQuoteCustomerSnapshotColumnError(updateError.message)) {
    const {
      customer_email: _customerEmail,
      customer_address: _customerAddress,
      ...legacyQuoteUpdatePayload
    } = quoteUpdatePayload;
    void _customerEmail;
    void _customerAddress;

    const legacyUpdateResult = await supabase
      .from('quotes')
      .update(legacyQuoteUpdatePayload)
      .eq('id', quoteId)
      .eq('user_id', user.id);

    updateError = legacyUpdateResult.error;
  }

  if (updateError) {
    return { error: updateError.message };
  }

  // Re-insert relations
  if (interiorEstimate && interiorEstimate.pricing_items.length > 0) {
    const { error: estimateItemsError } = await supabase.from('quote_estimate_items').insert(
      interiorEstimate.pricing_items.map((item, index) => ({
        quote_id: quoteId,
        category: item.category,
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        metadata: { ...(item.metadata ?? {}), room_index: item.room_index ?? null },
        sort_order: index,
      }))
    );
    if (estimateItemsError) return { error: estimateItemsError.message };
  } else {
    for (const [roomIndex, room] of preview.rooms.entries()) {
      const { data: insertedRoom, error: roomError } = await supabase
        .from('quote_rooms')
        .insert({
          quote_id: quoteId,
          name: room.name,
          room_type: room.room_type,
          length_m: room.length_m,
          width_m: room.width_m,
          height_m: room.height_m,
          sort_order: roomIndex,
        })
        .select('id')
        .single();

      if (roomError || !insertedRoom) return { error: roomError?.message ?? 'Room could not be updated.' };

      const { error: surfacesError } = await insertQuoteRoomSurfaces(
        supabase,
        insertedRoom.id,
        room.surfaces,
        parsed.data.complexity
      );
      if (surfacesError) return { error: surfacesError.message };
    }
  }

  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase.from('quote_line_items').insert(
      lineItems.map((item, index) => ({
        quote_id: quoteId,
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
    if (lineItemsError) return { error: lineItemsError.message };
  }

  if (shouldSendEmail) {
    const { error: emailError } = await sendQuoteDocumentEmail({
      supabase,
      userId: user.id,
      userEmail: user.email ?? null,
      quoteId,
      to: selectedCustomerEmail ?? '',
    });

    if (emailError) {
      return { error: emailError };
    }

    const { error: sentStatusError } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quoteId)
      .eq('user_id', user.id);

    if (sentStatusError) {
      return { error: sentStatusError.message };
    }
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
  redirect(shouldSendEmail ? `/quotes/${quoteId}?emailSent=1` : `/quotes/${quoteId}`);
}

export async function approveQuote(quoteId: string): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('id, user_id, status, internal_notes')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !quote) return { error: 'Quote not found.' };

  if (!['draft', 'sent'].includes(quote.status)) {
    return { error: 'Only draft or sent quotes can be approved.' };
  }

  const approvedAt = new Date().toISOString();
  const approvalLog = `Manually approved by owner on ${approvedAt}.`;
  const nextInternalNotes = quote.internal_notes?.trim()
    ? `${quote.internal_notes.trim()}\n\n${approvalLog}`
    : approvalLog;

  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      internal_notes: nextInternalNotes,
    })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuote(quoteId: string): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify ownership
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return { error: 'Quote not found.' };
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(supabase, quoteId, user.id);
  if (linkedInvoicesResult.error) {
    return { error: linkedInvoicesResult.error };
  }

  if (linkedInvoicesResult.count > 0) {
    return { error: QUOTE_DELETE_LOCK_MESSAGE };
  }

  // Delete relations first
  const { data: rooms } = await supabase
    .from('quote_rooms')
    .select('id')
    .eq('quote_id', quoteId);

  const roomIds = rooms?.map((r) => r.id) ?? [];
  if (roomIds.length > 0) {
    await supabase.from('quote_room_surfaces').delete().in('room_id', roomIds);
    await supabase.from('quote_rooms').delete().eq('quote_id', quoteId);
  }
  await supabase.from('quote_estimate_items').delete().eq('quote_id', quoteId);
  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);

  const { error: deleteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath('/quotes');
  redirect('/quotes');
}
