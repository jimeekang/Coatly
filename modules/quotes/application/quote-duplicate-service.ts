import 'server-only';

import { isMissingQuoteCustomerSnapshotColumnError } from '@/modules/quotes/domain/quotes';
import {
  QUOTE_DETAIL_SELECT,
  QUOTE_DETAIL_SELECT_LEGACY,
  isMissingQuoteSelectColumnError,
  loadQuoteRelations,
  type QuoteDataClient,
  type QuoteDetailRow,
} from '@/modules/quotes/infrastructure/quote-repository';
import {
  insertQuoteRoomSurfaces,
  jsonColumnValue,
  materialItemCategoryOrOther,
} from '@/modules/quotes/application/quote-pricing-save-service';
import type { Json } from '@/lib/supabase/types';

export type DuplicateQuoteResult = {
  data: { quoteId: string } | null;
  error: string | null;
};

async function deleteDuplicatedQuote(
  supabase: QuoteDataClient,
  quoteId: string,
  userId: string
) {
  await supabase.from('quotes').delete().eq('id', quoteId).eq('user_id', userId);
}

export async function duplicateQuoteForUser(
  supabase: QuoteDataClient,
  userId: string,
  quoteId: string
): Promise<DuplicateQuoteResult> {
  const quoteResult = await supabase
    .from('quotes')
    .select(QUOTE_DETAIL_SELECT)
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single();
  let sourceQuote = quoteResult.data as QuoteDetailRow | null;
  let sourceError = quoteResult.error;

  if (sourceError && isMissingQuoteSelectColumnError(sourceError.message)) {
    const legacyResult = await supabase
      .from('quotes')
      .select(QUOTE_DETAIL_SELECT_LEGACY)
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();
    sourceQuote = legacyResult.data as QuoteDetailRow | null;
    sourceError = legacyResult.error;
  }

  if (sourceError || !sourceQuote) {
    return {
      data: null,
      error: sourceError?.message ?? 'Quote not found.',
    };
  }

  const relationsResult = await loadQuoteRelations(supabase, quoteId);
  if (relationsResult.error || !relationsResult.data) {
    return {
      data: null,
      error: relationsResult.error ?? 'Quote details could not be loaded.',
    };
  }

  const { rooms, estimate_items, line_items } = relationsResult.data;

  const { data: newQuoteNumber, error: quoteNumberError } = await supabase.rpc(
    'generate_quote_number',
    { user_uuid: userId }
  );

  if (quoteNumberError || !newQuoteNumber) {
    return {
      data: null,
      error:
        quoteNumberError?.message ?? 'Quote number could not be generated.',
    };
  }

  const quoteInsert = {
    user_id: userId,
    customer_id: sourceQuote.customer_id,
    job_type: sourceQuote.job_type ?? 'interior',
    customer_email: sourceQuote.customer_email ?? null,
    customer_address: sourceQuote.customer_address ?? null,
    quote_number: newQuoteNumber,
    title: sourceQuote.title ? `${sourceQuote.title} (Copy)` : 'Copy',
    status: 'draft' as const,
    valid_until: null,
    working_days: sourceQuote.working_days ?? null,
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
    estimate_context: jsonColumnValue(sourceQuote.estimate_context),
    pricing_snapshot: jsonColumnValue(sourceQuote.pricing_snapshot),
    pricing_method: sourceQuote.pricing_method ?? undefined,
    pricing_method_inputs: sourceQuote.pricing_method_inputs as Json | null,
  };

  let { data: newQuote, error: insertError } = await supabase
    .from('quotes')
    .insert(quoteInsert)
    .select('id')
    .single();

  if (
    insertError &&
    isMissingQuoteCustomerSnapshotColumnError(insertError.message)
  ) {
    const {
      customer_email: _customerEmail,
      customer_address: _customerAddress,
      ...legacyInsert
    } = quoteInsert;
    void _customerEmail;
    void _customerAddress;

    const legacyResult = await supabase
      .from('quotes')
      .insert(legacyInsert)
      .select('id')
      .single();
    newQuote = legacyResult.data;
    insertError = legacyResult.error;
  }

  if (insertError || !newQuote) {
    return {
      data: null,
      error: insertError?.message ?? 'Quote could not be duplicated.',
    };
  }

  const newQuoteId = newQuote.id;

  if (estimate_items.length > 0) {
    const { error: estimateItemsError } = await supabase
      .from('quote_estimate_items')
      .insert(
        estimate_items.map((item, index) => ({
          quote_id: newQuoteId,
          category: item.category,
          label: item.label,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.total_cents,
          metadata: jsonColumnValue(item.metadata),
          sort_order: index,
        }))
      );
    if (estimateItemsError) {
      await deleteDuplicatedQuote(supabase, newQuoteId, userId);
      return { data: null, error: estimateItemsError.message };
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
      await deleteDuplicatedQuote(supabase, newQuoteId, userId);
      return {
        data: null,
        error: roomError?.message ?? 'Room could not be copied.',
      };
    }

    if (room.surfaces.length > 0) {
      const { error: surfacesError } = await insertQuoteRoomSurfaces(
        supabase,
        insertedRoom.id,
        room.surfaces,
        null
      );
      if (surfacesError) {
        await deleteDuplicatedQuote(supabase, newQuoteId, userId);
        return { data: null, error: surfacesError.message };
      }
    }
  }

  if (line_items.length > 0) {
    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(
        line_items.map((item, index) => ({
          quote_id: newQuoteId,
          material_item_id: item.material_item_id ?? null,
          name: item.name,
          category: materialItemCategoryOrOther(item.category),
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
      await deleteDuplicatedQuote(supabase, newQuoteId, userId);
      return { data: null, error: lineItemsError.message };
    }
  }

  return { data: { quoteId: newQuoteId }, error: null };
}
