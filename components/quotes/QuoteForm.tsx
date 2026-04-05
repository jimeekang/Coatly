'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  NumericInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import {
  INTERIOR_ROOM_TYPES,
  calculateInteriorEstimate,
  type InteriorEstimateInput,
  type InteriorRoomType,
} from '@/lib/interior-estimates';
import { mapQuickQuoteToInteriorEstimate } from '@/lib/quick-quote-mapper';
import {
  calculateQuoteLineItemsSubtotal,
  composeQuoteTotals,
  parseQuoteCreateInput,
  type QuoteCustomerOption,
  type QuoteStatus,
  type QuoteComplexity,
} from '@/lib/quotes';
import type { QuoteCreateInput, MaterialItem, QuoteLineItemFormInput } from '@/lib/supabase/validators';
import type { UserRateSettings } from '@/lib/rate-settings';
import { LineItemsSection } from '@/components/quotes/LineItemsSection';
import { QuoteExtraLineItems, toQuoteLineItemFormInput, type ExtraLineItemInput } from '@/components/quotes/QuoteExtraLineItems';
import { PRICING_METHOD_LABELS } from '@/lib/rate-settings';
import { formatAUD } from '@/utils/format';
import type { PricingMethod, DayRateInputs, RoomRateInputs, ManualInputs } from '@/types/quote';
import {
  calculateDayRateQuote,
  calculateRoomRateQuote,
  calculateManualQuote,
  getRoomRateBaseline,
} from '@/utils/calculations';
import {
  InteriorEstimateBuilder,
  createEmptyInteriorEstimateState,
  type InteriorEstimateFormState,
} from '@/components/quotes/InteriorEstimateBuilder';
import {
  QuickQuoteBuilder,
  createEmptyQuickQuoteState,
  calculateQuickQuotePreview,
  type QuickQuoteBuilderState,
} from '@/components/quotes/QuickQuoteBuilder';

// ─── Styles ───────────────────────────────────────────────────────────────────

const FIELD =
  'h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';
const LABEL = 'mb-1.5 block text-sm font-medium text-pm-body';
const TEXTAREA =
  'w-full rounded-xl border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstimateMode = 'quick' | 'advanced';

/** Which high-level pricing strategy the user has chosen */
type PricingStrategy = 'hybrid' | 'day_rate' | 'room_rate' | 'manual';

const ROOM_TYPES = ['bedroom', 'bathroom', 'living', 'kitchen', 'hallway', 'other'] as const;
const ROOM_SIZES = ['small', 'medium', 'large'] as const;

const ROOM_TYPE_LABELS: Record<(typeof ROOM_TYPES)[number], string> = {
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  living: 'Living / Lounge',
  kitchen: 'Kitchen',
  hallway: 'Hallway / Entry',
  other: 'Other',
};

type LegacyRoomDefault = {
  name: string;
  room_type: 'interior' | 'exterior';
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  surfaces?: Array<{ surface_type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows' }>;
};

type QuoteFormDefaultValues = {
  customer_id: string;
  title: string;
  status: QuoteStatus;
  valid_until: string;
  complexity?: QuoteComplexity;
  labour_margin_percent?: number;
  material_margin_percent?: number;
  notes: string;
  internal_notes: string;
  rooms: LegacyRoomDefault[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (value: number | null | undefined) => (value == null ? '' : String(value));
const num = (value: string) => (!value.trim() ? null : Number(value));
const intVal = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type SummaryLine = {
  label: string;
  value: number;
  emphasize?: boolean;
  negative?: boolean;
};

function normalizePreferredPricingStrategy(
  method?: PricingMethod | null
): PricingStrategy {
  if (method === 'day_rate' || method === 'room_rate' || method === 'manual') {
    return method;
  }

  // sqm_rate in settings maps to the current detailed-estimate flow.
  return 'hybrid';
}

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function inferAnchorRoomType(name: string): InteriorRoomType {
  const matched = INTERIOR_ROOM_TYPES.find(
    (roomType) => roomType.toLowerCase() === name.trim().toLowerCase()
  );
  return matched ?? 'Other';
}

function buildInitialAdvancedEstimate(
  defaultValues?: QuoteFormDefaultValues
): InteriorEstimateFormState {
  const base = createEmptyInteriorEstimateState();
  if (!defaultValues?.rooms?.length) return base;
  return {
    ...base,
    estimate_mode: 'specific_areas',
    rooms: defaultValues.rooms.map((room) => ({
      name: room.name,
      anchor_room_type: inferAnchorRoomType(room.name),
      length_m: str(room.length_m),
      width_m: str(room.width_m),
      height_m: str(room.height_m),
      include_walls: room.surfaces?.some((s) => s.surface_type === 'walls') ?? true,
      include_ceiling: room.surfaces?.some((s) => s.surface_type === 'ceiling') ?? true,
      include_trim: room.surfaces?.some((s) => s.surface_type === 'trim') ?? false,
    })),
  };
}

function buildAdvancedEstimatePayload(
  estimate: InteriorEstimateFormState
): InteriorEstimateInput {
  const property_details =
    estimate.property_type === 'apartment'
      ? {
          apartment_type: estimate.apartment_type,
          sqm: num(estimate.apartment_sqm),
          bedrooms: null,
          bathrooms: null,
          storeys: null,
        }
      : {
          apartment_type: null,
          sqm: num(estimate.house_sqm),
          bedrooms: num(estimate.house_bedrooms),
          bathrooms: num(estimate.house_bathrooms),
          storeys: estimate.house_storeys,
        };

  if (estimate.estimate_mode === 'entire_property') {
    return {
      property_type: estimate.property_type,
      estimate_mode: estimate.estimate_mode,
      condition: estimate.condition,
      scope: estimate.scope,
      property_details,
      rooms: [],
      opening_items: [],
      trim_items: [],
    };
  }

  return {
    property_type: estimate.property_type,
    estimate_mode: estimate.estimate_mode,
    condition: estimate.condition,
    scope: estimate.scope,
    property_details,
    rooms: estimate.rooms.map((room) => ({
      name: room.name.trim() || room.anchor_room_type,
      anchor_room_type: room.anchor_room_type,
      room_type: 'interior',
      length_m: num(room.length_m),
      width_m: num(room.width_m),
      height_m: num(room.height_m),
      include_walls: room.include_walls,
      include_ceiling: room.include_ceiling,
      include_trim: room.include_trim,
    })),
    opening_items: [
      ...estimate.doors
        .filter((door) => intVal(door.quantity, 0) > 0)
        .map((door) => ({
          opening_type: 'door' as const,
          paint_system: door.paint_system,
          quantity: intVal(door.quantity, 1),
          room_index: door.room_index === '' ? null : intVal(door.room_index, 0),
          door_type: door.door_type,
          door_scope: door.scope,
        })),
      ...estimate.windows
        .filter((w) => intVal(w.quantity, 0) > 0)
        .map((w) => ({
          opening_type: 'window' as const,
          paint_system: w.paint_system,
          quantity: intVal(w.quantity, 1),
          room_index: w.room_index === '' ? null : intVal(w.room_index, 0),
          window_type: w.window_type,
          window_scope: w.scope,
        })),
    ],
    trim_items: estimate.trim_items
      .filter((t) => Number(t.quantity) > 0)
      .map((t) => ({
        trim_type: 'skirting' as const,
        paint_system: t.paint_system,
        quantity: Number(t.quantity),
        room_index: t.room_index === '' ? null : intVal(t.room_index, 0),
      })),
  };
}

function PricingSummaryPanel({
  quoteNumberPreview,
  activeMethodLabel,
  total,
  roomLines,
  summaryLines,
}: {
  quoteNumberPreview: string;
  activeMethodLabel: string;
  total: number;
  roomLines: Array<{ label: string; value: number }>;
  summaryLines: SummaryLine[];
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-pm-border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Quote Number
            </p>
            <p className="mt-1 text-lg font-semibold text-pm-body">{quoteNumberPreview}</p>
          </div>
          <div className="rounded-xl bg-pm-teal-light px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pm-teal-mid">
              Estimate Total
            </p>
            <p className="mt-1 text-lg font-semibold text-pm-teal">
              {formatAUD(total)}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-pm-border bg-pm-surface px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
            Active Method
          </p>
          <p className="mt-1 text-sm font-medium text-pm-body">{activeMethodLabel}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-pm-border bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Price Summary
        </h3>
        <p className="mt-0.5 text-xs text-pm-secondary">
          Live internal pricing while you build the quote.
        </p>

        {roomLines.length > 0 && (
          <div className="mt-4 space-y-2 border-b border-pm-border pb-4">
            {roomLines.map((room) => (
              <div key={room.label} className="flex justify-between text-sm">
                <span className="text-pm-body">{room.label}</span>
                <span className="font-medium text-pm-body">{formatAUD(room.value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {summaryLines.map((line) => (
            <div
              key={line.label}
              className={[
                'flex justify-between text-sm',
                line.emphasize ? 'border-t border-pm-border pt-2' : '',
              ].join(' ')}
            >
              <span className={line.emphasize ? 'font-semibold text-pm-body' : 'text-pm-secondary'}>
                {line.label}
              </span>
              <span
                className={[
                  line.emphasize ? 'font-bold text-pm-teal' : 'text-pm-body',
                  line.negative ? 'text-pm-coral-mid' : '',
                ].join(' ')}
              >
                {line.value > 0 && (line.label.includes('markup') || line.label === 'GST (10%)' || line.label === 'Adjustment') ? '+' : ''}
                {formatAUD(line.value)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuoteForm({
  customers,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  defaultValues,
  quoteNumberPreview = 'Assigned on save',
  submitLabel = 'Save Quote',
  rateSettings,
  libraryItems = [],
}: {
  customers: QuoteCustomerOption[];
  onSubmit?: (data: QuoteCreateInput) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  defaultValues?: QuoteFormDefaultValues;
  quoteNumberPreview?: string;
  submitLabel?: string;
  rateSettings?: UserRateSettings | null;
  libraryItems?: MaterialItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // If pre-filled rooms exist (e.g., AI draft), start in advanced mode
  const [estimateMode, setEstimateMode] = useState<EstimateMode>(
    defaultValues?.rooms?.length ? 'advanced' : 'quick'
  );

  // Pricing strategy (which method to use for this quote)
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>(
    normalizePreferredPricingStrategy(rateSettings?.pricing?.preferred_pricing_method)
  );

  // Day rate method state
  const [dayRateState, setDayRateState] = useState<DayRateInputs>({
    days: 1,
    daily_rate_cents: rateSettings?.pricing?.daily_rate_cents ?? 80000,
    material_method: rateSettings?.pricing?.material_cost_method ?? 'percentage',
    material_percent: rateSettings?.pricing?.material_cost_percent ?? 30,
    material_flat_cents: 0,
  });

  // Room rate method state
  const [roomRateItems, setRoomRateItems] = useState<RoomRateInputs['rooms']>([]);
  const roomRatePresets = rateSettings?.room_rate_presets ?? [];

  // Manual method state
  const [manualInputs, setManualInputs] = useState<ManualInputs>({ labor_cents: 0, material_cents: 0 });

  // Materials & Services line items (library picker)
  const [lineItems, setLineItems] = useState<QuoteLineItemFormInput[]>([]);
  // Simple custom line items with optional toggle
  const [extraLineItems, setExtraLineItems] = useState<ExtraLineItemInput[]>([]);

  const [form, setForm] = useState({
    customer_id: defaultValues?.customer_id ?? '',
    title: defaultValues?.title ?? '',
    status: defaultValues?.status ?? ('draft' as const),
    valid_until: defaultValues?.valid_until ?? defaultValidUntil(),
    notes: defaultValues?.notes ?? '',
    internal_notes: defaultValues?.internal_notes ?? '',
    labour_markup: String(defaultValues?.labour_margin_percent ?? 0),
    material_markup: String(defaultValues?.material_margin_percent ?? 0),
  });
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customer_id) ?? null,
    [customers, form.customer_id]
  );

  // Quick mode state
  const [quickState, setQuickState] = useState<QuickQuoteBuilderState>(
    createEmptyQuickQuoteState
  );

  // Advanced mode state
  const [advancedEstimate, setAdvancedEstimate] = useState(() =>
    buildInitialAdvancedEstimate(defaultValues)
  );

  // Live preview totals
  const quickPreview = useMemo(
    () => calculateQuickQuotePreview(quickState, rateSettings),
    [quickState, rateSettings]
  );

  const advancedPreview = useMemo(() => {
    if (pricingStrategy !== 'hybrid' || estimateMode !== 'advanced') return null;
    return calculateInteriorEstimate(
      buildAdvancedEstimatePayload(advancedEstimate),
      rateSettings
    );
  }, [advancedEstimate, estimateMode, pricingStrategy, rateSettings]);

  // Markup calculations (applied on top of base estimate)
  const labourMarkupPct = intVal(form.labour_markup, 0);
  const materialMarkupPct = intVal(form.material_markup, 0);
  const hybridBaseSubtotal =
    pricingStrategy === 'hybrid'
      ? estimateMode === 'quick'
        ? quickPreview.subtotal_cents
        : advancedPreview?.subtotal_cents ?? 0
      : 0;
  const labourMarkupCents = Math.round(hybridBaseSubtotal * labourMarkupPct / 100);
  const materialMarkupCents = Math.round(hybridBaseSubtotal * materialMarkupPct / 100);
  const subtotalWithMarkup = hybridBaseSubtotal + labourMarkupCents + materialMarkupCents;
  const adjustmentCents = pricingStrategy === 'hybrid' && estimateMode === 'quick'
    ? quickPreview.adjustment_cents
    : 0;
  // Merge M&S library items with extra line items (excluding items with empty names)
  const allLineItems = useMemo(
    () => [
      ...lineItems,
      ...extraLineItems
        .filter((item) => item.name.trim().length > 0)
        .map(toQuoteLineItemFormInput),
    ],
    [lineItems, extraLineItems]
  );
  const lineItemSubtotal = useMemo(
    () => calculateQuoteLineItemsSubtotal(allLineItems),
    [allLineItems]
  );
  const hybridTotals =
    pricingStrategy === 'hybrid'
      ? composeQuoteTotals({
          base_subtotal_cents: subtotalWithMarkup,
          adjustment_cents: adjustmentCents,
          line_items: allLineItems,
        })
      : null;

  // Live preview for non-hybrid methods
  const methodPreview = useMemo(() => {
    if (pricingStrategy === 'day_rate') return calculateDayRateQuote(dayRateState);
    if (pricingStrategy === 'room_rate') return calculateRoomRateQuote({ rooms: roomRateItems });
    if (pricingStrategy === 'manual') return calculateManualQuote(manualInputs);
    return null;
  }, [pricingStrategy, dayRateState, roomRateItems, manualInputs]);
  const composedMethodPreview = useMemo(() => {
    if (!methodPreview) return null;
    return composeQuoteTotals({
      base_subtotal_cents: methodPreview.subtotal_cents,
      line_items: allLineItems,
    });
  }, [methodPreview, allLineItems]);

  const displayTotal = composedMethodPreview?.total_cents ?? hybridTotals?.total_cents ?? 0;
  const activeMethodLabel =
    pricingStrategy === 'hybrid'
      ? `Detailed Estimate · ${estimateMode === 'quick' ? 'Quick' : 'Advanced'}`
      : PRICING_METHOD_LABELS[pricingStrategy];
  const roomSummaryLines =
    pricingStrategy === 'hybrid' && estimateMode === 'quick' && quickState.rooms.length > 0
      ? quickState.rooms.map((room, idx) => ({
          label: room.name || `Room ${idx + 1}`,
          value: quickPreview.per_room_cents[idx] ?? 0,
        }))
      : [];
  const summaryLines: SummaryLine[] = (() => {
    if (pricingStrategy === 'day_rate' && methodPreview && composedMethodPreview) {
      return [
        { label: 'Labour', value: methodPreview.labor_cents },
        { label: 'Materials', value: methodPreview.material_cents },
        ...(lineItemSubtotal > 0
          ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
          : []),
        { label: 'Subtotal (ex GST)', value: composedMethodPreview.subtotal_cents },
        { label: 'GST (10%)', value: composedMethodPreview.gst_cents },
        { label: 'Total (inc GST)', value: composedMethodPreview.total_cents, emphasize: true },
      ];
    }

    if (
      (pricingStrategy === 'room_rate' || pricingStrategy === 'manual') &&
      methodPreview &&
      composedMethodPreview
    ) {
      return [
        { label: 'Labour', value: methodPreview.labor_cents },
        { label: 'Materials', value: methodPreview.material_cents },
        ...(lineItemSubtotal > 0
          ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
          : []),
        { label: 'Subtotal (ex GST)', value: composedMethodPreview.subtotal_cents },
        { label: 'GST (10%)', value: composedMethodPreview.gst_cents },
        { label: 'Total (inc GST)', value: composedMethodPreview.total_cents, emphasize: true },
      ];
    }

    return [
      { label: 'Base estimate', value: hybridBaseSubtotal },
      ...(labourMarkupPct > 0
        ? [{ label: `Labour markup (${labourMarkupPct}%)`, value: labourMarkupCents }]
        : []),
      ...(materialMarkupPct > 0
        ? [{ label: `Materials markup (${materialMarkupPct}%)`, value: materialMarkupCents }]
        : []),
      ...(lineItemSubtotal > 0
        ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
        : []),
      { label: 'Subtotal (ex GST)', value: hybridTotals?.subtotal_cents ?? subtotalWithMarkup },
      { label: 'GST (10%)', value: hybridTotals?.gst_cents ?? 0 },
      ...(adjustmentCents !== 0
        ? [{ label: 'Adjustment', value: adjustmentCents, negative: adjustmentCents < 0 }]
        : []),
      { label: 'Total (inc GST)', value: hybridTotals?.total_cents ?? 0, emphasize: true },
    ];
  })();

  const canSubmit = Boolean(
    onSubmit &&
      form.customer_id &&
      form.title.trim() &&
      form.valid_until &&
      (pricingStrategy === 'day_rate' ||
        pricingStrategy === 'manual' ||
        (pricingStrategy === 'room_rate' && roomRateItems.length > 0) ||
        (pricingStrategy === 'hybrid' && (estimateMode === 'advanced' || quickState.rooms.length > 0)))
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!onSubmit) return;

    let payload: QuoteCreateInput;

    if (pricingStrategy === 'day_rate') {
      payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'day_rate',
        pricing_method_inputs: { method: 'day_rate' as const, inputs: dayRateState },
      };
    } else if (pricingStrategy === 'room_rate') {
      payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'room_rate',
        pricing_method_inputs: { method: 'room_rate' as const, inputs: { rooms: roomRateItems } },
      };
    } else if (pricingStrategy === 'manual') {
      payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'manual',
        pricing_method_inputs: { method: 'manual' as const, inputs: manualInputs },
      };
    } else {
      // hybrid / sqm_rate — use existing interior estimate builder
      let interior_estimate: InteriorEstimateInput;
      if (estimateMode === 'quick') {
        interior_estimate = mapQuickQuoteToInteriorEstimate({
          wall_paint_system: quickState.wall_paint_system,
          rooms: quickState.rooms,
        });
      } else {
        interior_estimate = buildAdvancedEstimatePayload(advancedEstimate);
      }
      payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        complexity: 'standard',
        labour_margin_percent: labourMarkupPct,
        material_margin_percent: materialMarkupPct,
        manual_adjustment_cents: estimateMode === 'quick' ? quickState.manual_adjustment_cents : 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        interior_estimate,
        pricing_method: 'hybrid',
      };
    }

    const parsed = parseQuoteCreateInput(payload);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    startTransition(async () => {
      const result = await onSubmit(payload);
      if (result?.error) setError(result.error);
    });
  }

  function addManualRoomRateItem() {
    setRoomRateItems((prev) => [
      ...prev,
      {
        name: 'Room',
        room_type: 'bedroom',
        size: 'medium',
        rate_cents: getRoomRateBaseline('bedroom', 'medium', roomRatePresets),
      },
    ]);
  }

  function addRoomRatePresetItem(title: string, sqm: number, rateCents: number) {
    setRoomRateItems((prev) => [
      ...prev,
      {
        name: `${title} (${sqm} sqm)`,
        room_type: 'other',
        size: 'medium',
        rate_cents: rateCents,
      },
    ]);
  }

  return (
    <form onSubmit={handleSubmit} className="lg:pb-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="space-y-4">
          <div className="lg:hidden">
            <PricingSummaryPanel
              quoteNumberPreview={quoteNumberPreview}
              activeMethodLabel={activeMethodLabel}
              total={displayTotal}
              roomLines={roomSummaryLines}
              summaryLines={summaryLines}
            />
          </div>

          {/* Quote details */}
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Quote Details
        </h3>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="customer_id" className={LABEL}>
              Customer
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              className={FIELD}
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name || customer.name}
                </option>
              ))}
            </select>
            {selectedCustomer && (selectedCustomer.email || selectedCustomer.address) && (
              <div className="mt-3 rounded-xl border border-pm-border bg-pm-surface px-4 py-3 text-sm text-pm-body">
                <p className="font-medium text-pm-body">
                  {selectedCustomer.company_name || selectedCustomer.name}
                </p>
                {selectedCustomer.email && (
                  <p className="mt-1 text-pm-secondary">{selectedCustomer.email}</p>
                )}
                {selectedCustomer.address && (
                  <p className="mt-1 text-pm-secondary">{selectedCustomer.address}</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="title" className={LABEL}>
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Interior repaint — 42 Ocean View Rd"
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="status" className={LABEL}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={FIELD}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label htmlFor="valid_until" className={LABEL}>
                Valid Until
              </label>
              <input
                id="valid_until"
                name="valid_until"
                type="date"
                value={form.valid_until}
                onChange={handleChange}
                className={FIELD}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing method selector */}
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Pricing Method
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['hybrid', '📐', 'Detailed estimate'],
            ['day_rate', '📅', 'Labour × days'],
            ['room_rate', '🏠', 'Room flat rate'],
            ['manual', '✏️', 'Direct input'],
          ] as [PricingStrategy, string, string][]).map(([method, icon, label]) => (
            <button
              key={method}
              type="button"
              onClick={() => { setPricingStrategy(method); setError(null); }}
              className={[
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                pricingStrategy === method
                  ? 'border-pm-teal bg-pm-teal-pale/20 text-pm-teal'
                  : 'border-pm-border text-pm-body hover:border-pm-teal-mid',
              ].join(' ')}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Day rate inputs */}
      {pricingStrategy === 'day_rate' && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Labour × Days
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Number of days</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={dayRateState.days}
                onChange={(e) => setDayRateState((prev) => ({ ...prev, days: parseFloat(e.target.value) || 1 }))}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Daily labour rate ($)</label>
              <NumericInput
                inputMode="numeric"
                value={(dayRateState.daily_rate_cents / 100).toFixed(0)}
                sanitize={sanitizeIntegerInput}
                onValueChange={(value) => {
                  const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  setDayRateState((prev) => ({
                    ...prev,
                    daily_rate_cents: Math.round(nextValue * 100),
                  }));
                }}
                className={FIELD}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={LABEL}>Material costs</label>
            <div className="flex gap-4">
              {(['percentage', 'flat'] as const).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={dayRateState.material_method === m}
                    onChange={() => setDayRateState((prev) => ({ ...prev, material_method: m }))}
                    className="accent-pm-teal"
                  />
                  {m === 'percentage' ? '% of labour' : 'Flat amount'}
                </label>
              ))}
            </div>
            {dayRateState.material_method === 'percentage' ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dayRateState.material_percent ?? 30}
                  onChange={(e) => setDayRateState((prev) => ({ ...prev, material_percent: parseInt(e.target.value, 10) || 0 }))}
                  className="w-20 rounded-xl border border-pm-border bg-white px-3 py-2.5 text-center text-base"
                />
                <span className="text-sm text-pm-secondary">% of labour</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-pm-secondary">$</span>
                <NumericInput
                  inputMode="numeric"
                  value={((dayRateState.material_flat_cents ?? 0) / 100).toFixed(0)}
                  sanitize={sanitizeIntegerInput}
                  onValueChange={(value) => {
                    const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                    if (!Number.isFinite(nextValue)) {
                      return;
                    }

                    setDayRateState((prev) => ({
                      ...prev,
                      material_flat_cents: Math.round(nextValue * 100),
                    }));
                  }}
                  className="w-32 rounded-xl border border-pm-border bg-white px-3 py-2.5 text-base"
                />
              </div>
            )}
          </div>
          <div className="mt-4 rounded-xl bg-pm-teal-pale/20 px-4 py-3 text-sm text-pm-teal">
            Labour: {formatAUD(dayRateState.days * dayRateState.daily_rate_cents)} (ex-GST)
          </div>
        </section>
      )}

      {/* Room rate inputs */}
      {pricingStrategy === 'room_rate' && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Room Flat Rates
          </h3>
          {roomRatePresets.length > 0 && (
            <div className="mb-4 rounded-xl border border-pm-teal/25 bg-pm-teal-pale/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pm-teal">
                Saved Room Presets
              </p>
              <p className="mt-1 text-xs text-pm-secondary">
                Add your saved room presets directly into this quote, then adjust the flat rate if needed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roomRatePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => addRoomRatePresetItem(preset.title, preset.sqm, preset.rate_cents)}
                    className="rounded-full border border-pm-teal/30 bg-white px-3 py-1.5 text-xs font-medium text-pm-body hover:border-pm-teal hover:bg-pm-teal-pale/20"
                  >
                    {preset.title} · {preset.sqm} sqm · {formatAUD(preset.rate_cents)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {roomRateItems.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-pm-border p-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => setRoomRateItems((prev) => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                    placeholder="Room name"
                    className="rounded-lg border border-pm-border bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={item.room_type}
                    onChange={(e) => setRoomRateItems((prev) => prev.map((r, i) => i === idx ? { ...r, room_type: e.target.value as typeof item.room_type } : r))}
                    className="rounded-lg border border-pm-border bg-white px-2 py-1.5 text-sm"
                  >
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                  </select>
                  <select
                    value={item.size}
                    onChange={(e) => {
                      const size = e.target.value as typeof item.size;
                      setRoomRateItems((prev) => prev.map((r, i) =>
                        i === idx ? { ...r, size, rate_cents: getRoomRateBaseline(r.room_type, size, roomRatePresets) } : r
                      ));
                    }}
                    className="rounded-lg border border-pm-border bg-white px-2 py-1.5 text-sm"
                  >
                    {ROOM_SIZES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-pm-secondary">$</span>
                    <NumericInput
                      inputMode="numeric"
                      value={(item.rate_cents / 100).toFixed(0)}
                      sanitize={sanitizeIntegerInput}
                      onValueChange={(value) => {
                        const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                        if (!Number.isFinite(nextValue)) {
                          return;
                        }

                        setRoomRateItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, rate_cents: Math.round(nextValue * 100) }
                              : r
                          )
                        );
                      }}
                      className="w-24 rounded-lg border border-pm-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => setRoomRateItems((prev) => prev.filter((_, i) => i !== idx))} className="text-sm text-pm-secondary hover:text-pm-coral">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addManualRoomRateItem}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-pm-teal px-4 py-2.5 text-sm font-semibold text-pm-teal hover:bg-pm-teal-pale/10"
            >
              + Add Custom Room
            </button>
          </div>
        </section>
      )}

      {/* Manual direct input */}
      {pricingStrategy === 'manual' && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Direct Price Entry
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Labour cost ($, ex-GST)</label>
              <NumericInput
                inputMode="numeric"
                value={(manualInputs.labor_cents / 100).toFixed(0)}
                sanitize={sanitizeIntegerInput}
                onValueChange={(value) => {
                  const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  setManualInputs((prev) => ({
                    ...prev,
                    labor_cents: Math.round(nextValue * 100),
                  }));
                }}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Material cost ($, ex-GST)</label>
              <NumericInput
                inputMode="numeric"
                value={(manualInputs.material_cents / 100).toFixed(0)}
                sanitize={sanitizeIntegerInput}
                onValueChange={(value) => {
                  const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  setManualInputs((prev) => ({
                    ...prev,
                    material_cents: Math.round(nextValue * 100),
                  }));
                }}
                className={FIELD}
              />
            </div>
          </div>
        </section>
      )}

      {/* Estimate builder — only shown for hybrid method */}
      {pricingStrategy === 'hybrid' && (
        <>
          {/* Mode toggle — Quick vs Advanced */}
          <div className="flex overflow-hidden rounded-xl border border-pm-border bg-white">
            <button
              type="button"
              onClick={() => { setEstimateMode('quick'); setError(null); }}
              className={[
                'flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-semibold transition-colors',
                estimateMode === 'quick'
                  ? 'bg-pm-teal text-white'
                  : 'text-pm-secondary hover:text-pm-body',
              ].join(' ')}
            >
              <span className="text-base">⚡</span>
              Quick
            </button>
            <button
              type="button"
              onClick={() => { setEstimateMode('advanced'); setError(null); }}
              className={[
                'flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-semibold transition-colors',
                estimateMode === 'advanced'
                  ? 'bg-pm-teal text-white'
                  : 'text-pm-secondary hover:text-pm-body',
              ].join(' ')}
            >
              <span className="text-base">🔧</span>
              Advanced
            </button>
          </div>

          {estimateMode === 'quick' ? (
            <QuickQuoteBuilder
              value={quickState}
              onChange={(next) => { setQuickState(next); setError(null); }}
              rateSettings={rateSettings}
            />
          ) : (
            <InteriorEstimateBuilder
              value={advancedEstimate}
              onChange={(next) => { setAdvancedEstimate(next); setError(null); }}
              rateSettings={rateSettings}
            />
          )}
        </>
      )}

      {/* Materials & Services line items */}
      <LineItemsSection
        libraryItems={libraryItems}
        value={lineItems}
        onChange={setLineItems}
      />

      {/* Custom line items with optional toggle */}
      <QuoteExtraLineItems
        libraryItems={libraryItems}
        value={extraLineItems}
        onChange={setExtraLineItems}
      />

      {/* Notes */}
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Notes
        </h3>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="notes" className={LABEL}>
              Client Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleChange}
              placeholder="Any notes visible to the client on the quote"
              className={TEXTAREA}
            />
          </div>
          <div>
            <label htmlFor="internal_notes" className={LABEL}>
              Internal Notes
            </label>
            <textarea
              id="internal_notes"
              name="internal_notes"
              rows={3}
              value={form.internal_notes}
              onChange={handleChange}
              placeholder="Internal notes — not shown to the client"
              className={TEXTAREA}
            />
          </div>
        </div>
      </section>

      {/* Markup Settings */}
      {pricingStrategy === 'hybrid' && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
              Markup
            </h3>
            <p className="mt-0.5 text-xs text-pm-secondary">
              Applies to the detailed estimate only. Internal only — not visible on the quote PDF.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="labour_markup" className={LABEL}>
                Labour Markup
              </label>
              <div className="relative">
                <input
                  id="labour_markup"
                  name="labour_markup"
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  value={form.labour_markup}
                  onChange={handleChange}
                  className="h-12 w-full rounded-xl border border-pm-border bg-white pl-4 pr-10 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-pm-secondary">
                  %
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="material_markup" className={LABEL}>
                Materials Markup
              </label>
              <div className="relative">
                <input
                  id="material_markup"
                  name="material_markup"
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  value={form.material_markup}
                  onChange={handleChange}
                  className="h-12 w-full rounded-xl border border-pm-border bg-white pl-4 pr-10 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-pm-secondary">
                  %
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Validation error */}
      {error && (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      {/* Spacer so last field isn't hidden behind sticky footer on mobile */}
      <div className="h-[calc(5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />

        </div>

        <aside className="hidden lg:block lg:self-stretch">
          <div className="lg:sticky lg:top-6">
            <PricingSummaryPanel
              quoteNumberPreview={quoteNumberPreview}
              activeMethodLabel={activeMethodLabel}
              total={displayTotal}
              roomLines={roomSummaryLines}
              summaryLines={summaryLines}
            />
          </div>
        </aside>
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-pm-border bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:left-64">
        <div className="mx-auto flex w-full max-w-lg justify-center">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
            <button
              type="button"
              onClick={() => (onCancel ? onCancel() : router.back())}
              disabled={isPending}
              className="h-14 rounded-xl border border-pm-border bg-white px-4 text-base font-medium text-pm-body disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="h-14 rounded-xl bg-pm-teal px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              {isPending ? 'Saving...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
