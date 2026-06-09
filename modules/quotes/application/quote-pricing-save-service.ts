import 'server-only';

import {
  calculateQuotePreview,
  composeQuoteTotals,
  serializeLegacyQuoteCoatingType,
  serializeQuoteCoatingType,
  type QuoteCoatingType,
  type QuoteDetail,
  type QuoteSurfaceType,
  type parseQuoteCreateInput,
} from '@/modules/quotes/domain/quotes';
import {
  calculateInteriorEstimate,
  snapshotInteriorEstimateInput,
} from '@/modules/quotes/domain/interior-estimates';
import { calculateExteriorEstimate } from '@/modules/quotes/domain/exterior-estimates';
import {
  getFirstBlockingRateSetupIssue,
  getSelectedAdvancedEstimateIssues,
  getSelectedQuickEstimateIssues,
} from '@/modules/price-rates/domain/rate-setup-diagnostics';
import type { UserRateSettings } from '@/modules/price-rates/domain/rate-settings';
import {
  calculateDayRateQuote,
  calculateRoomRateQuote,
  calculateManualQuote,
  calculateQuickEstimate,
  normalizeQuickEstimateInputsForCalculation,
} from '@/utils/calculations';
import type {
  DayRateInputs,
  RoomRateInputs,
  ManualInputs,
  QuickInputs,
  PricingMethodInputs,
  QuoteAiIntakeSnapshotInput,
  QuoteClauseItemInput,
  QuoteScopeSectionInput,
} from '@/types/quote';
import type { Json } from '@/lib/supabase/types';
import {
  MATERIAL_ITEM_CATEGORIES,
  type MaterialItemCategory,
} from '@/modules/materials/domain/types';
import type { QuoteDataClient } from '@/modules/quotes/infrastructure/quote-repository';

export type ParsedQuoteCreateData = Extract<
  ReturnType<typeof parseQuoteCreateInput>,
  { success: true }
>['data'];

export function jsonColumnValue(value: unknown): Json {
  return value == null ? {} : (value as Json);
}

export function materialItemCategoryOrOther(
  category: string
): MaterialItemCategory {
  return MATERIAL_ITEM_CATEGORIES.includes(category as MaterialItemCategory)
    ? (category as MaterialItemCategory)
    : 'other';
}

type QuickEstimateItemRow = {
  quote_id: string;
  category: 'quick_estimate';
  label: string;
  quantity: number;
  unit: 'job' | 'room';
  unit_price_cents: number;
  total_cents: number;
  size: string | null;
  selected_surfaces: string[];
  coating_multiplier_pct: number | null;
  condition_multiplier_pct: number | null;
  item_notes: string | null;
  metadata: Json;
  sort_order: number;
};

function buildQuickEstimateItemRows(
  quoteId: string,
  inputs: QuickInputs
): QuickEstimateItemRow[] {
  const rows: QuickEstimateItemRow[] = [];

  if (inputs.property_preset) {
    const preset = inputs.property_preset;
    rows.push({
      quote_id: quoteId,
      category: 'quick_estimate',
      label: preset.label,
      quantity: 1,
      unit: 'job',
      unit_price_cents: preset.subtotal_cents,
      total_cents: preset.subtotal_cents,
      size: null,
      selected_surfaces: preset.scope,
      coating_multiplier_pct: null,
      condition_multiplier_pct: null,
      item_notes: null,
      metadata: jsonColumnValue({
        kind: 'whole_property',
        estimate_category: preset.estimate_category ?? 'interior',
        preset_id: preset.preset_id,
        source_rate_item_id: preset.source_rate_item_id ?? null,
        source_rate_item_version: preset.source_rate_item_version ?? null,
        source_rate_item_label: preset.source_rate_item_label ?? null,
        rate_snapshot_version: preset.rate_snapshot_version ?? null,
        property_type: preset.property_type,
        apartment_type: preset.apartment_type ?? null,
        bedrooms: preset.bedrooms ?? null,
        bathrooms: preset.bathrooms ?? null,
        storeys: preset.storeys ?? null,
        sqm: preset.sqm ?? null,
        condition: preset.condition,
        scope: preset.scope,
        wall_paint_system: preset.wall_paint_system,
        trim_paint_system: preset.trim_paint_system ?? 'oil_2coat',
        subtotal_cents: preset.subtotal_cents,
        gst_cents: preset.gst_cents,
        total_cents: preset.total_cents,
      }),
      sort_order: 0,
    });
  }

  const roomSortOffset = rows.length;
  inputs.rooms.forEach((room, index) => {
    rows.push({
      quote_id: quoteId,
      category: 'quick_estimate',
      label: room.label,
      quantity: 1,
      unit: 'room',
      unit_price_cents: room.total_cents,
      total_cents: room.total_cents,
      size: room.size,
      selected_surfaces: room.selected_surfaces,
      coating_multiplier_pct: room.coating_multiplier_pct,
      condition_multiplier_pct: room.condition_multiplier_pct,
      item_notes: room.notes ?? null,
      metadata: jsonColumnValue({
        kind: 'room',
        room_id: room.room_id,
        source_rate_item_id: room.source_rate_item_id ?? null,
        source_rate_item_version: room.source_rate_item_version ?? null,
        source_rate_item_label: room.source_rate_item_label ?? null,
        rate_snapshot_version: room.rate_snapshot_version ?? null,
        walls_cents: room.walls_cents,
        ceiling_cents: room.ceiling_cents,
        trim_cents: room.trim_cents,
        trim_paint_system:
          room.trim_paint_system ??
          inputs.global_trim_paint_system ??
          'oil_2coat',
        selected_surfaces: room.selected_surfaces,
        coating_multiplier_pct: room.coating_multiplier_pct,
        condition_multiplier_pct: room.condition_multiplier_pct,
        global_coating: inputs.global_coating,
        global_condition: inputs.global_condition,
        global_trim_paint_system:
          inputs.global_trim_paint_system ?? 'oil_2coat',
      }),
      sort_order: roomSortOffset + index,
    });
  });

  return rows;
}

function hasQuoteFormStructurePayload(data: {
  scope_sections?: QuoteScopeSectionInput[];
  clause_items?: QuoteClauseItemInput[];
  ai_intake_snapshot?: QuoteAiIntakeSnapshotInput | null;
}) {
  return Boolean(
    data.scope_sections?.length ||
      data.clause_items?.length ||
      data.ai_intake_snapshot
  );
}

function buildScopeSectionMetadata(section: QuoteScopeSectionInput): Json {
  return jsonColumnValue({
    ...(section.metadata ?? {}),
    maintenance_job_pack: section.maintenance_job_pack ?? null,
    visible_defects: section.visible_defects ?? [],
    priority: section.priority ?? null,
    report_context: section.report_context ?? false,
    unsupported_scope: section.unsupported_scope ?? null,
  });
}

async function insertQuoteFormStructure(
  supabase: QuoteDataClient,
  quoteId: string,
  userId: string,
  data: {
    job_type: string;
    scope_sections: QuoteScopeSectionInput[];
    clause_items: QuoteClauseItemInput[];
    ai_intake_snapshot: QuoteAiIntakeSnapshotInput | null;
  }
): Promise<string | null> {
  const sectionIdByClientId = new Map<string, string>();

  for (const [sectionIndex, section] of data.scope_sections.entries()) {
    const { data: insertedSection, error: sectionError } = await supabase
      .from('quote_scope_sections')
      .insert({
        quote_id: quoteId,
        section_kind: section.section_kind,
        title: section.title,
        description: section.description ?? null,
        area_label: section.area_label ?? null,
        surface_category: section.surface_category ?? null,
        is_optional: section.is_optional ?? false,
        is_selected: section.is_optional
          ? (section.is_selected ?? false)
          : true,
        pricing_status: section.pricing_status ?? 'unpriced',
        measurement_status: section.measurement_status ?? 'to_confirm',
        source: section.source ?? 'manual',
        metadata: buildScopeSectionMetadata(section),
        sort_order: section.sort_order ?? sectionIndex,
      })
      .select('id')
      .single();

    if (sectionError || !insertedSection) {
      return sectionError?.message ?? 'Quote scope section could not be saved.';
    }

    const sectionId = insertedSection.id;
    if (section.client_id) {
      sectionIdByClientId.set(section.client_id, sectionId);
    }

    if (section.steps?.length) {
      const { error: stepsError } = await supabase
        .from('quote_scope_steps')
        .insert(
          section.steps.map((step, stepIndex) => ({
            section_id: sectionId,
            label: step.label ?? null,
            step_type: step.step_type,
            description: step.description,
            prep_type: step.prep_type ?? null,
            paint_system: step.paint_system ?? null,
            coats_min: step.coats_min ?? null,
            coats_max: step.coats_max ?? null,
            product_name: step.product_name ?? null,
            colour_status: step.colour_status ?? null,
            colour: step.colour ?? null,
            sheen: step.sheen ?? null,
            requires_confirmation: step.requires_confirmation ?? false,
            is_customer_visible: step.is_customer_visible ?? true,
            metadata: jsonColumnValue(step.metadata ?? {}),
            sort_order: step.sort_order ?? stepIndex,
          }))
        );

      if (stepsError) {
        return stepsError.message;
      }
    }
  }

  if (data.clause_items.length > 0) {
    const { error: clausesError } = await supabase
      .from('quote_clause_items')
      .insert(
        data.clause_items.map((clause, index) => ({
          quote_id: quoteId,
          section_id: clause.applies_to_section_client_id
            ? (sectionIdByClientId.get(clause.applies_to_section_client_id) ??
              null)
            : null,
          clause_key: clause.clause_key,
          title: clause.title,
          body: clause.body,
          category: clause.category,
          severity: clause.severity ?? 'info',
          source: clause.source ?? 'manual',
          is_customer_visible: clause.is_customer_visible ?? true,
          metadata: jsonColumnValue(clause.metadata ?? {}),
          sort_order: clause.sort_order ?? index,
        }))
      );

    if (clausesError) {
      return clausesError.message;
    }
  }

  if (data.ai_intake_snapshot) {
    const snapshot = data.ai_intake_snapshot;
    const { error: intakeError } = await supabase
      .from('quote_ai_intake_snapshots')
      .insert({
        quote_id: quoteId,
        painter_user_id: userId,
        job_type: snapshot.job_type,
        maintenance_job_pack: snapshot.maintenance_job_pack ?? null,
        provider: snapshot.provider,
        model: snapshot.model,
        prompt_version: snapshot.prompt_version,
        input_json: jsonColumnValue(snapshot.input_json),
        output_json: jsonColumnValue(snapshot.output_json),
        photo_refs: jsonColumnValue(snapshot.photo_refs),
        price_rates_snapshot_id: snapshot.price_rates_snapshot_id ?? null,
        metadata: jsonColumnValue(snapshot.metadata ?? {}),
      });

    if (intakeError) {
      return intakeError.message;
    }
  }

  return null;
}

export function resolveQuotePricingPreviewForSave(
  data: ParsedQuoteCreateData,
  effectiveRates: UserRateSettings
) {
  const interiorEstimateContext = data.interior_estimate
    ? snapshotInteriorEstimateInput(data.interior_estimate, effectiveRates)
    : null;
  const interiorEstimate = interiorEstimateContext
    ? calculateInteriorEstimate(interiorEstimateContext, effectiveRates)
    : null;
  const exteriorEstimateResult = data.exterior_estimate
    ? calculateExteriorEstimate(
        data.exterior_estimate as Parameters<
          typeof calculateExteriorEstimate
        >[0],
        effectiveRates
      )
    : null;
  const adjustmentCents = data.manual_adjustment_cents ?? 0;
  const discountCents = data.discount_cents ?? 0;
  const depositPercent = data.deposit_percent ?? 0;
  const lineItems = data.line_items ?? [];
  const pricingMethod = data.pricing_method ?? 'hybrid';
  const rawMethodInputs = data.pricing_method_inputs;

  let resolvedPricingInputs: PricingMethodInputs | null = null;
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
  } else if (
    pricingMethod === 'detailed_quick' &&
    rawMethodInputs?.method === 'detailed_quick'
  ) {
    const inputs = normalizeQuickEstimateInputsForCalculation(
      rawMethodInputs.inputs as QuickInputs,
      effectiveRates
    );
    const result = calculateQuickEstimate(inputs, effectiveRates);
    const totals = composeQuoteTotals({
      base_subtotal_cents: result.subtotal_cents,
      adjustment_cents: adjustmentCents,
      discount_cents: discountCents,
      line_items: lineItems,
    });
    resolvedPricingInputs = { method: 'detailed_quick', inputs };
    preview = {
      rooms: [],
      base_subtotal_cents: result.subtotal_cents,
      ...totals,
    };
  } else if (
    pricingMethod === 'room_rate' &&
    rawMethodInputs?.method === 'room_rate'
  ) {
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
  } else if (
    pricingMethod === 'manual' &&
    rawMethodInputs?.method === 'manual'
  ) {
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
    const base = interiorEstimate.subtotal_cents;
    const labourMarkup = Math.round(base * (data.labour_margin_percent / 100));
    const materialMarkup = Math.round(
      base * (data.material_margin_percent / 100)
    );
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
    resolvedPricingInputs = {
      method: pricingMethod as 'sqm_rate' | 'hybrid',
      inputs: null,
    };
    preview = calculateQuotePreview(data);
  }

  return {
    adjustmentCents,
    depositPercent,
    discountCents,
    exteriorEstimateResult,
    interiorEstimate,
    interiorEstimateContext,
    lineItems,
    preview,
    pricingMethod,
    resolvedPricingInputs,
  };
}

export function getFirstQuoteRateBoundaryError(
  data: ParsedQuoteCreateData,
  effectiveRates: UserRateSettings
) {
  const pricingMethod = data.pricing_method ?? 'hybrid';
  const methodInputs = data.pricing_method_inputs;

  if (
    pricingMethod === 'detailed_quick' &&
    methodInputs?.method === 'detailed_quick'
  ) {
    return (
      getFirstBlockingRateSetupIssue(
        getSelectedQuickEstimateIssues(methodInputs.inputs, effectiveRates)
      )?.message ?? null
    );
  }

  if (data.interior_estimate) {
    return (
      getFirstBlockingRateSetupIssue(
        getSelectedAdvancedEstimateIssues(
          data.interior_estimate,
          effectiveRates
        )
      )?.message ?? null
    );
  }

  return null;
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

function isLegacyQuoteCoatingConstraintError(
  message: string | null | undefined
) {
  if (!message) return false;

  return (
    message.includes('quote_room_surfaces_coating_type_check') ||
    (message.includes('coating_type') && message.includes('check constraint'))
  );
}

function buildQuoteRoomSurfaceInsertRows(
  roomId: string,
  surfaces: QuoteRoomSurfaceInsertSource[],
  complexity:
    | QuoteCoatingType
    | QuoteDetail['complexity']
    | string
    | null
    | undefined,
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

export async function insertQuoteRoomSurfaces(
  supabase: QuoteDataClient,
  roomId: string,
  surfaces: QuoteRoomSurfaceInsertSource[],
  complexity: QuoteDetail['complexity'] | string | null | undefined
) {
  const rows = buildQuoteRoomSurfaceInsertRows(
    roomId,
    surfaces,
    complexity,
    false
  );
  let result = await supabase.from('quote_room_surfaces').insert(rows);

  if (
    result.error &&
    surfaces.some((surface) => surface.coating_type === 'refresh_1coat') &&
    isLegacyQuoteCoatingConstraintError(result.error.message)
  ) {
    result = await supabase
      .from('quote_room_surfaces')
      .insert(
        buildQuoteRoomSurfaceInsertRows(roomId, surfaces, complexity, true)
      );
  }

  return result;
}

export type QuotePricingForSave = ReturnType<
  typeof resolveQuotePricingPreviewForSave
>;

type SaveQuotePricingRelationsInput = {
  supabase: QuoteDataClient;
  quoteId: string;
  userId: string;
  data: ParsedQuoteCreateData;
  pricing: QuotePricingForSave;
  mode: 'create' | 'update';
  cleanupOnError?: () => Promise<void>;
};

export async function deleteQuotePricingRelationsForUpdate(
  supabase: QuoteDataClient,
  quoteId: string
): Promise<{ error: string | null }> {
  const { data: oldRooms, error: oldRoomsError } = await supabase
    .from('quote_rooms')
    .select('id')
    .eq('quote_id', quoteId);

  if (oldRoomsError) {
    return { error: oldRoomsError.message };
  }

  const oldRoomIds = oldRooms?.map((room) => room.id) ?? [];
  if (oldRoomIds.length > 0) {
    const { error: surfacesDeleteError } = await supabase
      .from('quote_room_surfaces')
      .delete()
      .in('room_id', oldRoomIds);
    if (surfacesDeleteError) return { error: surfacesDeleteError.message };

    const { error: roomsDeleteError } = await supabase
      .from('quote_rooms')
      .delete()
      .eq('quote_id', quoteId);
    if (roomsDeleteError) return { error: roomsDeleteError.message };
  }

  const { error: estimateItemsDeleteError } = await supabase
    .from('quote_estimate_items')
    .delete()
    .eq('quote_id', quoteId);
  if (estimateItemsDeleteError) {
    return { error: estimateItemsDeleteError.message };
  }

  const { error: lineItemsDeleteError } = await supabase
    .from('quote_line_items')
    .delete()
    .eq('quote_id', quoteId);
  if (lineItemsDeleteError) {
    return { error: lineItemsDeleteError.message };
  }

  return { error: null };
}

export async function saveQuotePricingRelations({
  supabase,
  quoteId,
  userId,
  data,
  pricing,
  mode,
  cleanupOnError,
}: SaveQuotePricingRelationsInput): Promise<{ error: string | null }> {
  const fail = async (message: string) => {
    if (cleanupOnError) {
      await cleanupOnError();
    }
    return { error: message };
  };

  const {
    interiorEstimate,
    lineItems,
    preview,
    pricingMethod,
    resolvedPricingInputs,
  } = pricing;

  if (interiorEstimate) {
    if (interiorEstimate.pricing_items.length > 0) {
      const { error: estimateItemsError } = await supabase
        .from('quote_estimate_items')
        .insert(
          interiorEstimate.pricing_items.map((item, index) => ({
            quote_id: quoteId,
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
        return fail(estimateItemsError.message);
      }
    }
  } else if (
    pricingMethod === 'detailed_quick' &&
    resolvedPricingInputs?.method === 'detailed_quick'
  ) {
    const quickItemRows = buildQuickEstimateItemRows(
      quoteId,
      resolvedPricingInputs.inputs
    );
    if (quickItemRows.length > 0) {
      const { error: quickItemsError } = await supabase
        .from('quote_estimate_items')
        .insert(quickItemRows);

      if (quickItemsError) {
        return fail(quickItemsError.message);
      }
    }
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

      if (roomError || !insertedRoom) {
        return fail(
          roomError?.message ??
            (mode === 'create'
              ? 'Quote room could not be created.'
              : 'Room could not be updated.')
        );
      }

      const { error: surfacesError } = await insertQuoteRoomSurfaces(
        supabase,
        insertedRoom.id,
        room.surfaces,
        data.complexity
      );

      if (surfacesError) {
        return fail(surfacesError.message);
      }
    }
  }

  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(
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
          is_selected: item.is_optional ? (item.is_selected ?? false) : true,
          sort_order: index,
        }))
      );

    if (lineItemsError) {
      return fail(lineItemsError.message);
    }
  }

  if (hasQuoteFormStructurePayload(data)) {
    if (mode === 'update') {
      const { error: clausesDeleteError } = await supabase
        .from('quote_clause_items')
        .delete()
        .eq('quote_id', quoteId);
      if (clausesDeleteError) return fail(clausesDeleteError.message);

      const { error: intakeDeleteError } = await supabase
        .from('quote_ai_intake_snapshots')
        .delete()
        .eq('quote_id', quoteId);
      if (intakeDeleteError) return fail(intakeDeleteError.message);

      const { error: sectionsDeleteError } = await supabase
        .from('quote_scope_sections')
        .delete()
        .eq('quote_id', quoteId);
      if (sectionsDeleteError) return fail(sectionsDeleteError.message);
    }

    const quoteFormError = await insertQuoteFormStructure(
      supabase,
      quoteId,
      userId,
      {
        job_type: data.job_type,
        scope_sections: data.scope_sections,
        clause_items: data.clause_items,
        ai_intake_snapshot: data.ai_intake_snapshot,
      }
    );

    if (quoteFormError) {
      return fail(quoteFormError);
    }
  }

  return { error: null };
}
