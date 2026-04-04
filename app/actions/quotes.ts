'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  buildQuoteCustomerAddress,
  calculateQuotePreview,
  composeQuoteTotals,
  mapQuoteDetail,
  mapQuoteListItem,
  parseQuoteCreateInput,
  type QuoteCustomerOption,
  type QuoteCoatingType,
  type QuoteDetail,
  type QuoteEstimateItemCategory,
  type QuoteListItem,
  type QuoteLineItemRecord,
  type QuoteSurfaceType,
} from '@/lib/quotes';
import { calculateInteriorEstimate } from '@/lib/interior-estimates';
import { getBusinessRateSettings } from '@/lib/businesses';
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
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import type { QuoteCreateInput } from '@/lib/supabase/validators';

type QuoteListRow = {
  id: string;
  user_id: string;
  customer_id: string;
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

function jsonObjectOrEmpty(value: unknown) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
      .select('id, name, company_name, email, phone, address_line1, city, state, postcode')
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

  const { data, error } = await supabase
    .from('quotes')
    .select(
      'id, user_id, customer_id, quote_number, title, status, valid_until, tier, subtotal_cents, gst_cents, total_cents, created_at, updated_at, customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, city, state, postcode)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return {
    data:
      ((data as QuoteListRow[] | null) ?? []).map((quote) =>
        mapQuoteListItem({
          ...quote,
          customer: Array.isArray(quote.customer)
            ? quote.customer.map((customer) => ({
                ...customer,
                address: buildQuoteCustomerAddress(customer),
              }))
            : quote.customer
              ? {
                  ...quote.customer,
                  address: buildQuoteCustomerAddress(quote.customer),
                }
              : null,
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

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(
      'id, user_id, customer_id, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, estimate_category, property_type, estimate_mode, estimate_context, pricing_snapshot, pricing_method, pricing_method_inputs, created_at, updated_at, customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, city, state, postcode)'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return { data: null, error: quoteError?.message ?? 'Quote not found.' };
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('quote_rooms')
    .select('id, quote_id, name, room_type, length_m, width_m, height_m, sort_order')
    .eq('quote_id', id)
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
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  if (estimateItemsError) {
    return { data: null, error: estimateItemsError.message };
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, quote_id, material_item_id, name, category, unit, quantity, unit_price_cents, total_cents, notes, sort_order, created_at, updated_at')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return { data: null, error: lineItemsError.message };
  }

  return {
    data: mapQuoteDetail({
      ...quote,
      pricing_method_inputs: quote.pricing_method_inputs as Record<string, unknown> | null,
      customer: quote.customer
        ? {
            ...(Array.isArray(quote.customer) ? quote.customer[0] : quote.customer),
            address: buildQuoteCustomerAddress(
              Array.isArray(quote.customer) ? quote.customer[0] : quote.customer
            ),
          }
        : null,
      estimate_context: jsonObjectOrEmpty(quote.estimate_context),
      pricing_snapshot: jsonObjectOrEmpty(quote.pricing_snapshot),
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
      })),
    }),
    error: null,
  };
}

export async function createQuote(
  input: QuoteCreateInput
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
    .select('id')
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

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: user.id,
      customer_id: parsed.data.customer_id,
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
      estimate_category: interiorEstimate ? 'interior' : 'manual',
      property_type: parsed.data.interior_estimate?.property_type ?? null,
      estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
      estimate_context: parsed.data.interior_estimate ?? {},
      pricing_snapshot: interiorEstimate?.snapshot ?? {},
      pricing_method: pricingMethod,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pricing_method_inputs: resolvedPricingInputs as any,
    })
    .select('id')
    .single();

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
        sort_order: index,
      }))
    );

    if (lineItemsError) {
      await supabase.from('quotes').delete().eq('id', quote.id).eq('user_id', user.id);
      return { error: lineItemsError.message };
    }
  }

  revalidatePath('/quotes');
  redirect(`/quotes/${quote.id}`);
}
