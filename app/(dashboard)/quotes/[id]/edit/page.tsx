import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getQuote, getQuoteFormOptions } from '@/app/actions/quotes';
import { getMaterialItemsForPicker } from '@/app/actions/materials';
import {
  type QuoteFormDefaultValues,
} from '@/components/quotes/QuoteForm';
import { QuoteEditScreen } from '@/components/quotes/QuoteEditScreen';
import type { ExtraLineItemInput } from '@/components/quotes/QuoteExtraLineItems';
import type { QuoteStatus } from '@/lib/quotes';
import {
  isInteriorEstimateInput,
  normalizeInteriorWallPaintSystem,
} from '@/lib/interior-estimates';
import type { QuoteLineItemFormInput } from '@/lib/supabase/validators';
import type { PricingMethod } from '@/types/quote';

export const metadata: Metadata = { title: 'Edit Quote' };

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: quote, error }, { data: formOptions }, { data: libraryItems }] =
    await Promise.all([
      getQuote(id),
      getQuoteFormOptions(),
      getMaterialItemsForPicker(),
    ]);

  if (error || !quote) {
    notFound();
  }

  if (quote.has_linked_invoices) {
    redirect(`/quotes/${id}?editLocked=1`);
  }

  // ── Split saved line_items into library items vs custom extra items ─────────
  // Library items have material_item_id; custom items don't
  const libraryLineItems: QuoteLineItemFormInput[] = [];
  const extraLineItems: ExtraLineItemInput[] = [];

  let extraKeyCounter = 0;
  for (const item of quote.line_items) {
    if (item.material_item_id) {
      libraryLineItems.push({
        material_item_id: item.material_item_id,
        name: item.name,
        category: item.category as QuoteLineItemFormInput['category'],
        unit: item.unit,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        notes: item.notes ?? undefined,
        is_optional: item.is_optional,
        is_selected: item.is_selected,
      });
    } else {
      extraLineItems.push({
        _key: `edit-extra-${extraKeyCounter++}`,
        material_item_id: null,
        name: item.name,
        category: item.category as ExtraLineItemInput['category'],
        unit: item.unit,
        notes: item.notes ?? '',
        unit_price_cents: item.unit_price_cents,
        is_optional: item.is_optional,
      });
    }
  }

  const savedInteriorEstimate = isInteriorEstimateInput(quote.estimate_context)
    ? quote.estimate_context
    : null;

  const defaultValues: QuoteFormDefaultValues = {
    customer_id: quote.customer_id,
    title: quote.title ?? '',
    status: quote.status as QuoteStatus,
    valid_until: quote.valid_until ?? '',
    working_days: quote.working_days ?? 1,
    complexity: (quote.complexity as 'standard' | 'moderate' | 'complex') ?? undefined,
    labour_margin_percent: quote.labour_margin_percent,
    material_margin_percent: quote.material_margin_percent,
    notes: quote.notes ?? '',
    internal_notes: quote.internal_notes ?? '',
    rooms: quote.rooms.map((room) => ({
      name: room.name,
      room_type: (room.room_type === 'exterior' ? 'exterior' : 'interior') as 'interior' | 'exterior',
      length_m: room.length_m ?? null,
      width_m: room.width_m ?? null,
      height_m: room.height_m ?? null,
      surfaces: room.surfaces.map((s) => ({
        surface_type: s.surface_type as 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows',
      })),
    })),
    // Pricing method pre-fill
    pricing_method: (quote.pricing_method as PricingMethod) ?? null,
    pricing_method_inputs: (quote.pricing_method_inputs as Record<string, unknown>) ?? null,
    interior_estimate: savedInteriorEstimate
      ? {
          ...savedInteriorEstimate,
          wall_paint_system:
            normalizeInteriorWallPaintSystem(savedInteriorEstimate.wall_paint_system) ??
            undefined,
          rooms: savedInteriorEstimate.rooms ?? [],
          opening_items: savedInteriorEstimate.opening_items ?? [],
          trim_items: savedInteriorEstimate.trim_items ?? [],
        }
      : null,
    // Line items pre-fill
    line_items: libraryLineItems,
    extra_line_items: extraLineItems,
    // Discount & deposit pre-fill
    discount_cents: quote.discount_cents ?? 0,
    deposit_percent: quote.deposit_percent ?? 0,
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/quotes/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
          aria-label="Back to quote"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-pm-body">Edit Quote</h1>
          <p className="mt-0.5 text-sm text-pm-secondary">
            {quote.quote_number}
            {quote.title ? ` · ${quote.title}` : ''}
          </p>
        </div>
      </div>

      <QuoteEditScreen
        quoteId={id}
        quoteNumber={quote.quote_number}
        customers={formOptions.customers}
        rateSettings={formOptions.userRates}
        libraryItems={libraryItems ?? []}
        defaultValues={defaultValues}
      />
    </div>
  );
}
