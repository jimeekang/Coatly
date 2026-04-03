'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  INTERIOR_ROOM_TYPES,
  type InteriorEstimateInput,
  type InteriorRoomType,
} from '@/lib/interior-estimates';
import { mapQuickQuoteToInteriorEstimate } from '@/lib/quick-quote-mapper';
import {
  parseQuoteCreateInput,
  type QuoteCustomerOption,
  type QuoteStatus,
  type QuoteComplexity,
} from '@/lib/quotes';
import type { QuoteCreateInput } from '@/lib/supabase/validators';
import type { UserRateSettings } from '@/lib/rate-settings';
import { formatAUD } from '@/utils/format';
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
}: {
  customers: QuoteCustomerOption[];
  onSubmit?: (data: QuoteCreateInput) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  defaultValues?: QuoteFormDefaultValues;
  quoteNumberPreview?: string;
  submitLabel?: string;
  rateSettings?: UserRateSettings | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // If pre-filled rooms exist (e.g., AI draft), start in advanced mode
  const [estimateMode, setEstimateMode] = useState<EstimateMode>(
    defaultValues?.rooms?.length ? 'advanced' : 'quick'
  );

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

  // Quick mode state
  const [quickState, setQuickState] = useState<QuickQuoteBuilderState>(
    createEmptyQuickQuoteState
  );

  // Advanced mode state
  const [advancedEstimate, setAdvancedEstimate] = useState(() =>
    buildInitialAdvancedEstimate(defaultValues)
  );

  // Live preview totals
  const quickPreview = useMemo(() => calculateQuickQuotePreview(quickState), [quickState]);

  // Markup calculations (applied on top of base estimate)
  const labourMarkupPct = intVal(form.labour_markup, 0);
  const materialMarkupPct = intVal(form.material_markup, 0);
  const baseSubtotal = quickPreview.subtotal_cents;
  const labourMarkupCents = Math.round(baseSubtotal * labourMarkupPct / 100);
  const materialMarkupCents = Math.round(baseSubtotal * materialMarkupPct / 100);
  const subtotalWithMarkup = baseSubtotal + labourMarkupCents + materialMarkupCents;
  const gstCents = Math.round(subtotalWithMarkup * 0.1);
  const adjustmentCents = quickPreview.adjustment_cents;
  const totalWithMarkup = subtotalWithMarkup + gstCents + adjustmentCents;

  const displayTotal = estimateMode === 'quick' ? totalWithMarkup : 0;

  const canSubmit = Boolean(
    onSubmit &&
      form.customer_id &&
      form.title.trim() &&
      form.valid_until &&
      (estimateMode === 'advanced' || quickState.rooms.length > 0)
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

    let interior_estimate: InteriorEstimateInput;
    if (estimateMode === 'quick') {
      interior_estimate = mapQuickQuoteToInteriorEstimate({
        wall_paint_system: quickState.wall_paint_system,
        rooms: quickState.rooms,
      });
    } else {
      interior_estimate = buildAdvancedEstimatePayload(advancedEstimate);
    }

    const payload: QuoteCreateInput = {
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
      interior_estimate,
    };

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-28">
      {/* Header bar — Quote number + live total */}
      <section className="rounded-2xl border border-pm-border bg-white p-4">
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
              {formatAUD(displayTotal)}
            </p>
          </div>
        </div>
      </section>

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

      {/* Estimate builder — switches based on mode */}
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
        />
      )}

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
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Markup
          </h3>
          <p className="mt-0.5 text-xs text-pm-secondary">
            Internal only — not visible on the quote PDF
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

      {/* Live Cost Breakdown — quick mode only */}
      {estimateMode === 'quick' && quickState.rooms.length > 0 && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Cost Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-pm-secondary">Internal — not shown to client</p>

          {/* Per-room subtotals */}
          <div className="mt-4 space-y-2">
            {quickState.rooms.map((room, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-pm-body">{room.name || `Room ${idx + 1}`}</span>
                <span className="font-medium text-pm-body">
                  {formatAUD(quickPreview.per_room_cents[idx] ?? 0)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2.5 border-t border-pm-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-pm-secondary">Base subtotal</span>
              <span className="text-pm-body">{formatAUD(baseSubtotal)}</span>
            </div>
            {labourMarkupPct > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-pm-secondary">Labour markup ({labourMarkupPct}%)</span>
                <span className="text-pm-body">+{formatAUD(labourMarkupCents)}</span>
              </div>
            )}
            {materialMarkupPct > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-pm-secondary">Materials markup ({materialMarkupPct}%)</span>
                <span className="text-pm-body">+{formatAUD(materialMarkupCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-pm-secondary">Subtotal (ex GST)</span>
              <span className="font-medium text-pm-body">{formatAUD(subtotalWithMarkup)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-pm-secondary">GST (10%)</span>
              <span className="text-pm-body">{formatAUD(gstCents)}</span>
            </div>
            {adjustmentCents !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-pm-secondary">Adjustment</span>
                <span className={adjustmentCents < 0 ? 'text-pm-coral-mid' : 'text-pm-body'}>
                  {adjustmentCents > 0 ? '+' : ''}{formatAUD(adjustmentCents)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-pm-border pt-2">
              <span className="font-semibold text-pm-body">Total (inc GST)</span>
              <span className="text-base font-bold text-pm-teal">{formatAUD(totalWithMarkup)}</span>
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

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-pm-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
            className="h-14 flex-1 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="h-14 flex-2 rounded-xl bg-pm-teal text-base font-semibold text-white disabled:opacity-50"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
