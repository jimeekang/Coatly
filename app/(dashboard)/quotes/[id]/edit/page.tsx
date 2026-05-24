import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getQuote, getQuoteFormOptions } from '@/app/actions/quotes';
import { getMaterialItemsForPicker } from '@/app/actions/materials';
import { type QuoteFormDefaultValues } from '@/components/quotes/QuoteForm';
import { QuoteEditScreen } from '@/components/quotes/QuoteEditScreen';
import type { ExtraLineItemInput } from '@/components/quotes/QuoteExtraLineItems';
import type { QuoteStatus } from '@/lib/quotes';
import {
  isInteriorEstimateInput,
  normalizeInteriorWallPaintSystem,
} from '@/lib/interior-estimates';
import type { QuoteLineItemFormInput } from '@/lib/supabase/validators';
import type {
  PricingMethod,
  QuoteClauseItemInput,
  QuoteScopeSectionInput,
} from '@/types/quote';

export const metadata: Metadata = { title: 'Edit Quote' };

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    { data: quote, error },
    { data: formOptions },
    { data: libraryItems },
  ] = await Promise.all([
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
    job_type: quote.job_type,
    title: quote.title ?? '',
    status: quote.status as QuoteStatus,
    valid_until: quote.valid_until ?? '',
    working_days: quote.working_days ?? 1,
    complexity:
      (quote.complexity as 'standard' | 'moderate' | 'complex') ?? undefined,
    labour_margin_percent: quote.labour_margin_percent,
    material_margin_percent: quote.material_margin_percent,
    notes: quote.notes ?? '',
    internal_notes: quote.internal_notes ?? '',
    rooms: quote.rooms.map((room) => ({
      name: room.name,
      room_type: (room.room_type === 'exterior' ? 'exterior' : 'interior') as
        | 'interior'
        | 'exterior',
      length_m: room.length_m ?? null,
      width_m: room.width_m ?? null,
      height_m: room.height_m ?? null,
      surfaces: room.surfaces.map((s) => ({
        surface_type: s.surface_type as
          | 'walls'
          | 'ceiling'
          | 'trim'
          | 'doors'
          | 'windows',
      })),
    })),
    // Pricing method pre-fill
    pricing_method: (quote.pricing_method as PricingMethod) ?? null,
    pricing_method_inputs:
      (quote.pricing_method_inputs as Record<string, unknown>) ?? null,
    interior_estimate: savedInteriorEstimate
      ? {
          ...savedInteriorEstimate,
          wall_paint_system:
            normalizeInteriorWallPaintSystem(
              savedInteriorEstimate.wall_paint_system
            ) ?? undefined,
          rooms: savedInteriorEstimate.rooms ?? [],
          opening_items: savedInteriorEstimate.opening_items ?? [],
          trim_items: savedInteriorEstimate.trim_items ?? [],
        }
      : null,
    scope_sections: quote.scope_sections.map((section) => ({
      client_id: section.id,
      section_kind:
        section.section_kind as QuoteScopeSectionInput['section_kind'],
      title: section.title,
      description: section.description ?? undefined,
      area_label: section.area_label ?? undefined,
      surface_category: section.surface_category ?? undefined,
      is_optional: section.is_optional,
      is_selected: section.is_selected,
      pricing_status:
        section.pricing_status as QuoteScopeSectionInput['pricing_status'],
      measurement_status:
        section.measurement_status as QuoteScopeSectionInput['measurement_status'],
      source: section.source as QuoteScopeSectionInput['source'],
      sort_order: section.sort_order,
      metadata: section.metadata,
      maintenance_job_pack:
        section.maintenance_job_pack as QuoteScopeSectionInput['maintenance_job_pack'],
      visible_defects: section.visible_defects,
      priority: section.priority as QuoteScopeSectionInput['priority'],
      report_context: section.report_context,
      unsupported_scope: section.unsupported_scope ?? undefined,
      steps: section.steps.map((step) => ({
        client_id: step.id,
        step_type: step.step_type as NonNullable<
          QuoteScopeSectionInput['steps']
        >[number]['step_type'],
        label: step.label ?? undefined,
        description: step.description,
        prep_type: step.prep_type ?? undefined,
        paint_system: step.paint_system ?? undefined,
        coats_min: step.coats_min ?? undefined,
        coats_max: step.coats_max ?? undefined,
        product_name: step.product_name ?? undefined,
        colour_status: step.colour_status as NonNullable<
          QuoteScopeSectionInput['steps']
        >[number]['colour_status'],
        colour: step.colour ?? undefined,
        sheen: step.sheen ?? undefined,
        requires_confirmation: step.requires_confirmation,
        is_customer_visible: step.is_customer_visible,
        sort_order: step.sort_order,
        metadata: step.metadata,
      })),
    })),
    clause_items: quote.clause_items.map((clause) => ({
      client_id: clause.id,
      applies_to_section_client_id: clause.section_id ?? undefined,
      clause_key: clause.clause_key,
      category: clause.category as QuoteClauseItemInput['category'],
      title: clause.title,
      body: clause.body,
      severity: clause.severity as QuoteClauseItemInput['severity'],
      source: clause.source as QuoteClauseItemInput['source'],
      is_customer_visible: clause.is_customer_visible,
      sort_order: clause.sort_order,
      metadata: clause.metadata,
    })),
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
          className="bg-surface-container-low text-on-surface-variant active:bg-surface-container-high flex h-11 w-11 items-center justify-center rounded-full transition-colors"
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
          <h1 className="text-on-surface text-2xl font-bold">Edit Quote</h1>
          <p className="text-on-surface-variant mt-0.5 text-sm">
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
