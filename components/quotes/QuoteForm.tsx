'use client';

import { useMemo, useState, useTransition, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Layers, CalendarDays, PenLine, Home, Trees } from 'lucide-react';
import {
  NumericInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import {
  INTERIOR_ROOM_TYPES,
  calculateInteriorEstimate,
  isInteriorEstimateInput,
  normalizeInteriorWallPaintSystem,
  type InteriorEstimateInput,
  type InteriorRoomType,
} from '@/lib/interior-estimates';
import { mapQuickQuoteToInteriorEstimate } from '@/lib/quick-quote-mapper';
import {
  calculateDepositCents,
  calculateQuoteLineItemsSubtotal,
  composeQuoteTotals,
  parseQuoteCreateInput,
  resolveQuoteStatus,
  type QuoteCustomerOption,
  type QuoteCustomerPropertyOption,
  type QuoteStatus,
  type QuoteComplexity,
} from '@/lib/quotes';
import type {
  QuoteCreateInput,
  MaterialItem,
  QuoteLineItemFormInput,
} from '@/lib/supabase/validators';
import type { UserRateSettings } from '@/lib/rate-settings';
import { LineItemsSection } from '@/components/quotes/LineItemsSection';
import {
  QuoteExtraLineItems,
  toQuoteLineItemFormInput,
  type ExtraLineItemInput,
} from '@/components/quotes/QuoteExtraLineItems';
import { QuoteStatusCard } from '@/components/quotes/QuoteStatusCard';
import { PRICING_METHOD_LABELS } from '@/lib/rate-settings';
import { formatAUD } from '@/utils/format';
import type {
  PricingMethod,
  DayRateInputs,
  RoomRateInputs,
  ManualInputs,
  QuickInputs,
} from '@/types/quote';
import {
  calculateDayRateQuote,
  calculateRoomRateQuote,
  calculateManualQuote,
  calculateQuickEstimate,
  getRoomRateBaseline,
  snapshotQuickEstimateInputs,
} from '@/utils/calculations';
import { QuickEstimateBuilder } from '@/components/quotes/QuickEstimateBuilder';
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
import {
  ExteriorEstimateBuilder,
  createEmptyExteriorEstimateState,
  buildExteriorEstimatePayload,
  type ExteriorEstimateFormState,
} from '@/components/quotes/ExteriorEstimateBuilder';
import { calculateExteriorEstimate } from '@/lib/exterior-estimates';

// ─── Styles ───────────────────────────────────────────────────────────────────

const FIELD =
  'h-12 w-full rounded-xl border border-outline-variant bg-white px-4 text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const LABEL = 'mb-1.5 block text-sm font-semibold text-on-surface';
const TEXTAREA =
  'w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstimateMode = 'quick' | 'advanced';

/** Which high-level pricing strategy the user has chosen */
type PricingStrategy = 'hybrid' | 'day_rate' | 'room_rate' | 'manual' | 'detailed_quick';

const ROOM_TYPES = [
  'bedroom',
  'bathroom',
  'living',
  'kitchen',
  'hallway',
  'other',
] as const;
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
  surfaces?: Array<{
    surface_type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
  }>;
};

export type QuoteFormDefaultValues = {
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
  working_days?: number | null;
  // Pricing method pre-fill (for edit/duplicate)
  pricing_method?: PricingMethod | null;
  pricing_method_inputs?: Record<string, unknown> | null;
  interior_estimate?: InteriorEstimateInput | null;
  // Line items pre-fill
  line_items?: QuoteLineItemFormInput[];
  extra_line_items?: ExtraLineItemInput[];
  // Discount & deposit pre-fill
  discount_cents?: number;
  deposit_percent?: number;
};

type QuoteSubmitIntent = 'save' | 'send_email';
type SendDialogState = {
  payload: QuoteCreateInput;
  email: string;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (value: string | number | null | undefined) =>
  value == null ? '' : String(value);
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
  if (method === 'day_rate' || method === 'room_rate' || method === 'manual' || method === 'detailed_quick') {
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

function normalizeWorkingDays(value: number | null | undefined) {
  if (!Number.isFinite(value) || value == null) return 1;
  return Math.min(30, Math.max(1, Math.round(value)));
}

function getInitialWorkingDays(defaultValues?: QuoteFormDefaultValues) {
  if (defaultValues?.working_days != null) {
    return normalizeWorkingDays(defaultValues.working_days);
  }

  const savedInputs = defaultValues?.pricing_method_inputs;
  if (savedInputs?.method === 'day_rate') {
    return normalizeWorkingDays((savedInputs.inputs as DayRateInputs).days);
  }

  return 1;
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
  const estimateContext = isInteriorEstimateInput(
    defaultValues?.interior_estimate
  )
    ? defaultValues.interior_estimate
    : null;

  if (estimateContext) {
    const roomOptions =
      estimateContext.rooms.length > 0 ? estimateContext.rooms : base.rooms;

    return {
      ...base,
      property_type: estimateContext.property_type,
      estimate_mode: estimateContext.estimate_mode,
      condition: estimateContext.condition,
      scope: estimateContext.scope,
      wall_paint_system:
        normalizeInteriorWallPaintSystem(estimateContext.wall_paint_system) ??
        base.wall_paint_system,
      apartment_type:
        estimateContext.property_details.apartment_type ?? base.apartment_type,
      apartment_sqm: str(estimateContext.property_details.sqm),
      house_bedrooms: str(estimateContext.property_details.bedrooms),
      house_bathrooms: str(estimateContext.property_details.bathrooms),
      house_storeys:
        estimateContext.property_details.storeys ?? base.house_storeys,
      house_sqm: str(estimateContext.property_details.sqm),
      rooms: roomOptions.map((room) => ({
        name: room.name,
        anchor_room_type: room.anchor_room_type,
        length_m: str(room.length_m),
        width_m: str(room.width_m),
        height_m: str(room.height_m ?? 2.7),
        include_walls: room.include_walls,
        include_ceiling: room.include_ceiling,
        include_trim: room.include_trim,
        include_doors: false,
        include_windows: false,
        source_rate_item_id: room.source_rate_item_id,
        source_rate_item_version: room.source_rate_item_version,
        source_rate_item_label: room.source_rate_item_label,
        rate_snapshot_version: room.rate_snapshot_version,
      })),
      doors: estimateContext.opening_items
        .filter((item) => item.opening_type === 'door')
        .map((item) => ({
          door_type: item.door_type ?? 'standard',
          scope: item.door_scope ?? 'door_and_frame',
          quantity: String(item.quantity),
          paint_system: item.paint_system,
          room_index:
            item.room_index == null
              ? ''
              : (String(item.room_index) as `${number}`),
        })),
      windows: estimateContext.opening_items
        .filter((item) => item.opening_type === 'window')
        .map((item) => ({
          window_type: item.window_type ?? 'normal',
          scope: item.window_scope ?? 'window_and_frame',
          quantity: String(item.quantity),
          paint_system: item.paint_system,
          room_index:
            item.room_index == null
              ? ''
              : (String(item.room_index) as `${number}`),
        })),
      trim_items: estimateContext.trim_items.map((item) => ({
        quantity: String(item.quantity),
        paint_system: item.paint_system,
        room_index:
          item.room_index == null
            ? ''
            : (String(item.room_index) as `${number}`),
      })),
    };
  }

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
      include_walls:
        room.surfaces?.some((s) => s.surface_type === 'walls') ?? true,
      include_ceiling:
        room.surfaces?.some((s) => s.surface_type === 'ceiling') ?? true,
      include_trim:
        room.surfaces?.some((s) => s.surface_type === 'trim') ?? false,
      include_doors:
        room.surfaces?.some((s) => s.surface_type === 'doors') ?? false,
      include_windows:
        room.surfaces?.some((s) => s.surface_type === 'windows') ?? false,
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
      wall_paint_system: estimate.wall_paint_system,
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
    wall_paint_system: estimate.wall_paint_system,
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
      source_rate_item_id: room.source_rate_item_id,
      source_rate_item_version: room.source_rate_item_version,
      source_rate_item_label: room.source_rate_item_label,
      rate_snapshot_version: room.rate_snapshot_version,
    })),
    opening_items: [
      ...estimate.doors
        .filter((door) => intVal(door.quantity, 0) > 0)
        .map((door) => ({
          opening_type: 'door' as const,
          paint_system: door.paint_system,
          quantity: intVal(door.quantity, 1),
          room_index:
            door.room_index === '' ? null : intVal(door.room_index, 0),
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

function getCustomerEmails(customer: QuoteCustomerOption | null) {
  if (!customer) return [];
  const emails = [customer.email, ...(customer.emails ?? [])]
    .filter((email): email is string => typeof email === 'string')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function getCustomerProperties(customer: QuoteCustomerOption | null) {
  if (!customer) return [];
  if (customer.properties?.length) return customer.properties;
  if (!customer.address) return [];

  return [
    {
      label: 'Primary property',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postcode: '',
      notes: '',
      address: customer.address,
    },
  ] satisfies QuoteCustomerPropertyOption[];
}

function PricingSummaryPanel({
  quoteNumberPreview,
  onQuoteNumberChange,
  activeMethodLabel,
  status,
  validUntil,
  total,
  roomLines,
  summaryLines,
  discountCents,
  discountInput,
  showDiscountEditor,
  onDiscountInputChange,
  onDiscountToggle,
  depositPercent,
  depositInput,
  showDepositEditor,
  onDepositInputChange,
  onDepositToggle,
}: {
  quoteNumberPreview: string;
  onQuoteNumberChange?: (value: string) => void;
  activeMethodLabel: string;
  status: QuoteStatus;
  validUntil: string;
  total: number;
  roomLines: Array<{ label: string; value: number }>;
  summaryLines: SummaryLine[];
  discountCents: number;
  discountInput: string;
  showDiscountEditor: boolean;
  onDiscountInputChange: (value: string) => void;
  onDiscountToggle: () => void;
  depositPercent: number;
  depositInput: string;
  showDepositEditor: boolean;
  onDepositInputChange: (value: string) => void;
  onDepositToggle: () => void;
}) {
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [draftNumber, setDraftNumber] = useState(quoteNumberPreview);
  const isEditable =
    onQuoteNumberChange != null && quoteNumberPreview !== 'Assigned on save';

  function commitEdit() {
    const trimmed = draftNumber.trim();
    if (trimmed && trimmed !== quoteNumberPreview) {
      onQuoteNumberChange?.(trimmed);
    } else {
      setDraftNumber(quoteNumberPreview);
    }
    setIsEditingNumber(false);
  }

  const resolvedStatus = resolveQuoteStatus({
    status,
    valid_until: validUntil,
  });

  return (
    <div className="space-y-4">
      <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Quote Number
            </p>
            {isEditingNumber ? (
              <input
                autoFocus
                value={draftNumber}
                onChange={(e) => setDraftNumber(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') {
                    setDraftNumber(quoteNumberPreview);
                    setIsEditingNumber(false);
                  }
                }}
                className="border-primary text-on-surface focus:ring-primary/20 mt-1 w-full rounded-lg border bg-white px-2 py-1 text-lg font-semibold focus:ring-2 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => isEditable && setIsEditingNumber(true)}
                className={[
                  'text-on-surface mt-1 flex items-center gap-1.5 text-lg font-semibold',
                  isEditable
                    ? 'hover:text-primary cursor-pointer rounded-lg px-0 transition-colors'
                    : 'cursor-default',
                ].join(' ')}
                title={isEditable ? 'Click to edit quote number' : undefined}
              >
                {quoteNumberPreview}
                {isEditable && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-on-surface-variant"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          <div className="bg-primary-container rounded-xl px-3 py-2 text-right">
            <p className="text-primary text-xs font-medium tracking-wide uppercase">
              Estimate Total
            </p>
            <p className="text-primary mt-1 text-lg font-semibold">
              {formatAUD(total)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border-outline-variant bg-surface-container rounded-xl border px-3 py-3">
            <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Active Method
            </p>
            <p className="text-on-surface mt-1 text-sm font-medium">
              {activeMethodLabel}
            </p>
          </div>
          <QuoteStatusCard status={resolvedStatus} validUntil={validUntil} />
        </div>
      </section>

      <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-on-surface text-base font-bold leading-snug">Price Summary</h3>
          <p className="text-on-surface-variant mt-0.5 text-xs">Live internal pricing while you build the quote.</p>
        </div>

        {roomLines.length > 0 && (
          <div className="border-outline-variant mt-4 space-y-2 border-b pb-4">
            {roomLines.map((room) => (
              <div key={room.label} className="flex justify-between text-sm">
                <span className="text-on-surface">{room.label}</span>
                <span className="text-on-surface font-medium">
                  {formatAUD(room.value)}
                </span>
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
                line.emphasize ? 'border-outline-variant border-t pt-2' : '',
              ].join(' ')}
            >
              <span
                className={
                  line.emphasize
                    ? 'text-on-surface font-semibold'
                    : 'text-on-surface-variant'
                }
              >
                {line.label}
              </span>
              <span
                className={[
                  line.emphasize ? 'text-primary font-bold' : 'text-on-surface',
                  line.negative ? 'text-error' : '',
                ].join(' ')}
              >
                {line.value > 0 &&
                (line.label.includes('markup') ||
                  line.label === 'GST (10%)' ||
                  line.label === 'Adjustment')
                  ? '+'
                  : ''}
                {line.negative && line.value > 0 ? '-' : ''}
                {formatAUD(line.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Discount & Deposit editors */}
        <div className="border-outline-variant mt-4 space-y-2 border-t pt-4">
          {/* Discount */}
          {showDiscountEditor ? (
            <div className="border-error/30 bg-error-container/20 rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-error text-xs font-semibold">
                  Discount
                </span>
                <button
                  type="button"
                  onClick={onDiscountToggle}
                  className="text-on-surface-variant hover:text-error text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => onDiscountInputChange(e.target.value)}
                  placeholder="0.00"
                  className="border-outline-variant text-on-surface focus:border-error focus:ring-error/20 h-10 flex-1 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                />
                {discountCents > 0 && (
                  <span className="text-error text-sm font-medium">
                    -{formatAUD(discountCents)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDiscountToggle}
              className="border-outline-variant text-on-surface-variant hover:border-error/50 hover:text-error flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add discount
            </button>
          )}

          {/* Deposit */}
          {showDepositEditor ? (
            <div className="border-primary/30 bg-primary/10 rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-primary text-xs font-semibold">
                  Deposit Required
                </span>
                <button
                  type="button"
                  onClick={onDepositToggle}
                  className="text-on-surface-variant hover:text-error text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={depositInput}
                  onChange={(e) => onDepositInputChange(e.target.value)}
                  placeholder="50"
                  className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary/20 h-10 w-20 rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                />
                <span className="text-on-surface-variant text-sm">% of total</span>
                {depositPercent > 0 && (
                  <span className="text-primary ml-auto text-sm font-medium">
                    = {formatAUD(Math.round((total * depositPercent) / 100))}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDepositToggle}
              className="border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-primary flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Set deposit requirement
            </button>
          )}
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
  showSendQuoteButton = false,
  rateSettings,
  libraryItems = [],
}: {
  customers: QuoteCustomerOption[];
  onSubmit?: (
    data: QuoteCreateInput,
    intent?: QuoteSubmitIntent
  ) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  defaultValues?: QuoteFormDefaultValues;
  quoteNumberPreview?: string;
  submitLabel?: string;
  showSendQuoteButton?: boolean;
  rateSettings?: UserRateSettings | null;
  libraryItems?: MaterialItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeSubmitIntent, setActiveSubmitIntent] =
    useState<QuoteSubmitIntent>('save');
  const [editableQuoteNumber, setEditableQuoteNumber] =
    useState(quoteNumberPreview);
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState('0');
  const [sendDialog, setSendDialog] = useState<SendDialogState>(null);

  // Discount & deposit state
  const [discountCents, setDiscountCents] = useState(
    defaultValues?.discount_cents ?? 0
  );
  const [discountInput, setDiscountInput] = useState(
    defaultValues?.discount_cents
      ? String((defaultValues.discount_cents / 100).toFixed(2))
      : ''
  );
  const [showDiscountEditor, setShowDiscountEditor] = useState(
    (defaultValues?.discount_cents ?? 0) > 0
  );
  const [depositPercent, setDepositPercent] = useState(
    defaultValues?.deposit_percent ?? 0
  );
  const [depositInput, setDepositInput] = useState(
    defaultValues?.deposit_percent ? String(defaultValues.deposit_percent) : ''
  );
  const [showDepositEditor, setShowDepositEditor] = useState(
    (defaultValues?.deposit_percent ?? 0) > 0
  );
  const hasSavedInteriorEstimate = isInteriorEstimateInput(
    defaultValues?.interior_estimate
  );

  // If pre-filled rooms exist (e.g., AI draft), start in advanced mode
  const [estimateMode, setEstimateMode] = useState<EstimateMode>(
    hasSavedInteriorEstimate || defaultValues?.rooms?.length
      ? 'advanced'
      : 'quick'
  );

  // Pricing strategy (which method to use for this quote)
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>(
    () => {
      if (defaultValues?.pricing_method) {
        return normalizePreferredPricingStrategy(defaultValues.pricing_method);
      }
      return normalizePreferredPricingStrategy(
        rateSettings?.pricing?.preferred_pricing_method
      );
    }
  );

  // Day rate method state
  const [dayRateState, setDayRateState] = useState<DayRateInputs>(() => {
    const saved = defaultValues?.pricing_method_inputs;
    if (
      saved &&
      saved.method === 'day_rate' &&
      saved.inputs &&
      typeof saved.inputs === 'object'
    ) {
      return saved.inputs as DayRateInputs;
    }
    return {
      days: 1,
      daily_rate_cents: rateSettings?.pricing?.daily_rate_cents ?? 80000,
      material_method:
        rateSettings?.pricing?.material_cost_method ?? 'percentage',
      material_percent: rateSettings?.pricing?.material_cost_percent ?? 30,
      material_flat_cents: 0,
    };
  });

  // Room rate method state
  const [roomRateItems, setRoomRateItems] = useState<RoomRateInputs['rooms']>(
    () => {
      const saved = defaultValues?.pricing_method_inputs;
      if (
        saved &&
        saved.method === 'room_rate' &&
        saved.inputs &&
        typeof saved.inputs === 'object'
      ) {
        const inputs = saved.inputs as RoomRateInputs;
        return Array.isArray(inputs.rooms) ? inputs.rooms : [];
      }
      return [];
    }
  );
  const roomRatePresets = rateSettings?.room_rate_presets ?? [];

  // Manual method state
  const [manualInputs, setManualInputs] = useState<ManualInputs>(() => {
    const saved = defaultValues?.pricing_method_inputs;
    if (
      saved &&
      saved.method === 'manual' &&
      saved.inputs &&
      typeof saved.inputs === 'object'
    ) {
      return saved.inputs as ManualInputs;
    }
    return { labor_cents: 0, material_cents: 0 };
  });

  // Quick estimate method state
  const [quickInputs, setQuickInputs] = useState<QuickInputs>(() => {
    const saved = defaultValues?.pricing_method_inputs;
    if (
      saved &&
      saved.method === 'detailed_quick' &&
      saved.inputs &&
      typeof saved.inputs === 'object'
    ) {
      return saved.inputs as QuickInputs;
    }
    return {
      rooms: [],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };
  });

  // Materials & Services line items (library picker)
  const [lineItems, setLineItems] = useState<QuoteLineItemFormInput[]>(
    defaultValues?.line_items ?? []
  );
  // Simple custom line items with optional toggle
  const [extraLineItems, setExtraLineItems] = useState<ExtraLineItemInput[]>(
    defaultValues?.extra_line_items ?? []
  );

  const [form, setForm] = useState({
    customer_id: defaultValues?.customer_id ?? '',
    title: defaultValues?.title ?? '',
    status: defaultValues?.status ?? ('draft' as const),
    valid_until: defaultValues?.valid_until ?? defaultValidUntil(),
    working_days: String(getInitialWorkingDays(defaultValues)),
    notes: defaultValues?.notes ?? '',
    internal_notes: defaultValues?.internal_notes ?? '',
    labour_markup: String(defaultValues?.labour_margin_percent ?? 0),
    material_markup: String(defaultValues?.material_margin_percent ?? 0),
  });
  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) => customer.id === form.customer_id) ?? null,
    [customers, form.customer_id]
  );
  const customerEmailOptions = useMemo(
    () => getCustomerEmails(selectedCustomer),
    [selectedCustomer]
  );
  const customerPropertyOptions = useMemo(
    () => getCustomerProperties(selectedCustomer),
    [selectedCustomer]
  );
  const selectedProperty =
    customerPropertyOptions[Number(selectedPropertyIndex)] ??
    customerPropertyOptions[0] ??
    null;
  const canSendQuote = customerEmailOptions.length > 0;

  // Interior / exterior scope (only affects hybrid method)
  const [quoteScope, setQuoteScope] = useState<'interior' | 'exterior'>(
    'interior'
  );

  // Quick mode state
  const [quickState, setQuickState] = useState<QuickQuoteBuilderState>(
    createEmptyQuickQuoteState
  );

  // Advanced mode state
  const [advancedEstimate, setAdvancedEstimate] = useState(() =>
    buildInitialAdvancedEstimate(defaultValues)
  );

  // Exterior estimate state
  const [exteriorEstimate, setExteriorEstimate] =
    useState<ExteriorEstimateFormState>(createEmptyExteriorEstimateState);

  // Live preview totals
  const quickPreview = useMemo(
    () => calculateQuickQuotePreview(quickState, rateSettings),
    [quickState, rateSettings]
  );

  const advancedPreview = useMemo(() => {
    if (
      pricingStrategy !== 'hybrid' ||
      estimateMode !== 'advanced' ||
      quoteScope !== 'interior'
    )
      return null;
    return calculateInteriorEstimate(
      buildAdvancedEstimatePayload(advancedEstimate),
      rateSettings
    );
  }, [
    advancedEstimate,
    estimateMode,
    pricingStrategy,
    quoteScope,
    rateSettings,
  ]);

  const exteriorPreview = useMemo(() => {
    if (pricingStrategy !== 'hybrid' || quoteScope !== 'exterior') return null;
    return calculateExteriorEstimate(
      buildExteriorEstimatePayload(exteriorEstimate),
      rateSettings
    );
  }, [exteriorEstimate, pricingStrategy, quoteScope, rateSettings]);

  // Markup calculations (applied on top of base estimate)
  const labourMarkupPct = intVal(form.labour_markup, 0);
  const materialMarkupPct = intVal(form.material_markup, 0);
  const hybridBaseSubtotal =
    pricingStrategy === 'hybrid'
      ? quoteScope === 'exterior'
        ? (exteriorPreview?.subtotal_cents ?? 0)
        : estimateMode === 'quick'
          ? quickPreview.subtotal_cents
          : (advancedPreview?.subtotal_cents ?? 0)
      : 0;
  const labourMarkupCents = Math.round(
    (hybridBaseSubtotal * labourMarkupPct) / 100
  );
  const materialMarkupCents = Math.round(
    (hybridBaseSubtotal * materialMarkupPct) / 100
  );
  const subtotalWithMarkup =
    hybridBaseSubtotal + labourMarkupCents + materialMarkupCents;
  const adjustmentCents =
    pricingStrategy === 'hybrid' && estimateMode === 'quick'
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
          discount_cents: discountCents,
          line_items: allLineItems,
        })
      : null;

  // Live preview for non-hybrid methods
  const methodPreview = useMemo(() => {
    if (pricingStrategy === 'day_rate')
      return calculateDayRateQuote(dayRateState);
    if (pricingStrategy === 'room_rate')
      return calculateRoomRateQuote({ rooms: roomRateItems });
    if (pricingStrategy === 'manual') return calculateManualQuote(manualInputs);
    if (pricingStrategy === 'detailed_quick' && rateSettings)
      return calculateQuickEstimate(quickInputs, rateSettings);
    return null;
  }, [pricingStrategy, dayRateState, roomRateItems, manualInputs, quickInputs, rateSettings]);
  const composedMethodPreview = useMemo(() => {
    if (!methodPreview) return null;
    return composeQuoteTotals({
      base_subtotal_cents: methodPreview.subtotal_cents,
      discount_cents: discountCents,
      line_items: allLineItems,
    });
  }, [methodPreview, allLineItems, discountCents]);

  const displayTotal =
    composedMethodPreview?.total_cents ?? hybridTotals?.total_cents ?? 0;
  const depositCents = calculateDepositCents(displayTotal, depositPercent);
  const activeMethodLabel =
    pricingStrategy === 'hybrid'
      ? `Detailed Estimate · ${estimateMode === 'quick' ? 'Quick' : 'Advanced'}`
      : PRICING_METHOD_LABELS[pricingStrategy];
  const roomSummaryLines =
    pricingStrategy === 'hybrid' &&
    estimateMode === 'quick' &&
    quickState.rooms.length > 0
      ? quickState.rooms.map((room, idx) => ({
          label: room.name || `Room ${idx + 1}`,
          value: quickPreview.per_room_cents[idx] ?? 0,
        }))
      : [];
  const summaryLines: SummaryLine[] = (() => {
    const discountLine =
      discountCents > 0
        ? [{ label: 'Discount', value: discountCents, negative: true }]
        : [];
    const depositLine =
      depositCents > 0
        ? [
            {
              label: `Deposit required (${depositPercent}%)`,
              value: depositCents,
              emphasize: false,
            },
          ]
        : [];

    if (
      pricingStrategy === 'day_rate' &&
      methodPreview &&
      composedMethodPreview
    ) {
      return [
        { label: 'Labour', value: methodPreview.labor_cents },
        { label: 'Materials', value: methodPreview.material_cents },
        ...(lineItemSubtotal > 0
          ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
          : []),
        ...discountLine,
        {
          label: 'Subtotal (ex GST)',
          value: composedMethodPreview.subtotal_cents,
        },
        { label: 'GST (10%)', value: composedMethodPreview.gst_cents },
        {
          label: 'Total (inc GST)',
          value: composedMethodPreview.total_cents,
          emphasize: true,
        },
        ...depositLine,
      ];
    }

    if (
      (pricingStrategy === 'detailed_quick' || pricingStrategy === 'room_rate' || pricingStrategy === 'manual') &&
      methodPreview &&
      composedMethodPreview
    ) {
      return [
        { label: 'Labour', value: methodPreview.labor_cents },
        { label: 'Materials', value: methodPreview.material_cents },
        ...(lineItemSubtotal > 0
          ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
          : []),
        ...discountLine,
        {
          label: 'Subtotal (ex GST)',
          value: composedMethodPreview.subtotal_cents,
        },
        { label: 'GST (10%)', value: composedMethodPreview.gst_cents },
        {
          label: 'Total (inc GST)',
          value: composedMethodPreview.total_cents,
          emphasize: true,
        },
        ...depositLine,
      ];
    }

    return [
      { label: 'Base estimate', value: hybridBaseSubtotal },
      ...(labourMarkupPct > 0
        ? [
            {
              label: `Labour markup (${labourMarkupPct}%)`,
              value: labourMarkupCents,
            },
          ]
        : []),
      ...(materialMarkupPct > 0
        ? [
            {
              label: `Materials markup (${materialMarkupPct}%)`,
              value: materialMarkupCents,
            },
          ]
        : []),
      ...(lineItemSubtotal > 0
        ? [{ label: 'Materials & Services', value: lineItemSubtotal }]
        : []),
      ...discountLine,
      {
        label: 'Subtotal (ex GST)',
        value: hybridTotals?.subtotal_cents ?? subtotalWithMarkup,
      },
      { label: 'GST (10%)', value: hybridTotals?.gst_cents ?? 0 },
      ...(adjustmentCents !== 0
        ? [
            {
              label: 'Adjustment',
              value: adjustmentCents,
              negative: adjustmentCents < 0,
            },
          ]
        : []),
      {
        label: 'Total (inc GST)',
        value: hybridTotals?.total_cents ?? 0,
        emphasize: true,
      },
      ...depositLine,
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
      (pricingStrategy === 'detailed_quick' &&
        quickInputs.rooms.length > 0 &&
        quickInputs.rooms.every((r) => r.selected_surfaces.length > 0)) ||
      (pricingStrategy === 'hybrid' &&
        (quoteScope === 'exterior'
          ? (exteriorPreview?.subtotal_cents ?? 0) > 0
          : estimateMode === 'advanced' || quickState.rooms.length > 0)))
  );

  function handleDiscountInputChange(value: string) {
    setDiscountInput(value);
    const parsed = parseFloat(value);
    setDiscountCents(
      Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0
    );
  }

  function handleDiscountToggle() {
    if (showDiscountEditor) {
      setDiscountCents(0);
      setDiscountInput('');
      setShowDiscountEditor(false);
    } else {
      setShowDiscountEditor(true);
    }
  }

  function handleDepositInputChange(value: string) {
    setDepositInput(value);
    const parsed = parseInt(value, 10);
    setDepositPercent(
      Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 0
    );
  }

  function handleDepositToggle() {
    if (showDepositEditor) {
      setDepositPercent(0);
      setDepositInput('');
      setShowDepositEditor(false);
    } else {
      setShowDepositEditor(true);
    }
  }

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;
    if (name === 'customer_id') {
      setSelectedPropertyIndex('0');
      setSendDialog(null);
    }
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function buildPayload(): QuoteCreateInput {
    let payload: QuoteCreateInput;
    const customer_address = selectedProperty?.address ?? undefined;
    const working_days = normalizeWorkingDays(intVal(form.working_days, 1));

    if (pricingStrategy === 'detailed_quick') {
      const quickSnapshot = rateSettings
        ? snapshotQuickEstimateInputs(quickInputs, rateSettings)
        : quickInputs;
      payload = {
        customer_id: form.customer_id,
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'detailed_quick',
        pricing_method_inputs: {
          method: 'detailed_quick' as const,
          inputs: quickSnapshot,
        },
      };
    } else if (pricingStrategy === 'day_rate') {
      payload = {
        customer_id: form.customer_id,
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'day_rate',
        pricing_method_inputs: {
          method: 'day_rate' as const,
          inputs: dayRateState,
        },
      };
    } else if (pricingStrategy === 'room_rate') {
      payload = {
        customer_id: form.customer_id,
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'room_rate',
        pricing_method_inputs: {
          method: 'room_rate' as const,
          inputs: { rooms: roomRateItems },
        },
      };
    } else if (pricingStrategy === 'manual') {
      payload = {
        customer_id: form.customer_id,
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        pricing_method: 'manual',
        pricing_method_inputs: {
          method: 'manual' as const,
          inputs: manualInputs,
        },
      };
    } else if (quoteScope === 'exterior') {
      payload = {
        customer_id: form.customer_id,
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: labourMarkupPct,
        material_margin_percent: materialMarkupPct,
        manual_adjustment_cents: 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        exterior_estimate: buildExteriorEstimatePayload(exteriorEstimate),
        pricing_method: 'hybrid',
      };
    } else {
      // hybrid / sqm_rate — interior estimate builder
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
        customer_address,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        working_days,
        complexity: 'standard',
        labour_margin_percent: labourMarkupPct,
        material_margin_percent: materialMarkupPct,
        manual_adjustment_cents:
          estimateMode === 'quick' ? quickState.manual_adjustment_cents : 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: [],
        line_items: allLineItems,
        interior_estimate,
        pricing_method: 'hybrid',
      };
    }

    // Attach discount & deposit
    payload.discount_cents = discountCents;
    payload.deposit_percent = depositPercent;

    // Attach editable quote number if it's a real number (not the placeholder)
    if (editableQuoteNumber && editableQuoteNumber !== 'Assigned on save') {
      payload.quote_number = editableQuoteNumber;
    }

    return payload;
  }

  function submitQuote(
    payload: QuoteCreateInput,
    submitIntent: QuoteSubmitIntent
  ) {
    if (!onSubmit) return;

    const parsed = parseQuoteCreateInput(payload);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    startTransition(async () => {
      setActiveSubmitIntent(submitIntent);
      const result = await onSubmit(payload, submitIntent);
      if (result?.error) setError(result.error);
    });
  }

  function handleOpenSendDialog() {
    if (!onSubmit) return;
    const email = customerEmailOptions[0] ?? '';
    if (!email) {
      setError('Add a customer email before sending this quote.');
      return;
    }

    const payload = {
      ...buildPayload(),
      customer_email: email,
    };

    const parsed = parseQuoteCreateInput(payload);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    setActiveSubmitIntent('send_email');
    setSendDialog({ payload, email });
    setError(null);
  }

  function handleConfirmSendQuote() {
    if (!sendDialog) return;
    submitQuote(
      {
        ...sendDialog.payload,
        customer_email: sendDialog.email,
        customer_address:
          selectedProperty?.address ?? sendDialog.payload.customer_address,
      },
      'send_email'
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!onSubmit) return;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const submitIntent =
      submitter?.dataset.submitIntent === 'send_email' ? 'send_email' : 'save';

    if (submitIntent === 'send_email') {
      handleOpenSendDialog();
      return;
    }

    submitQuote(buildPayload(), 'save');
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

  function addRoomRatePresetItem(
    title: string,
    sqm: number,
    rateCents: number
  ) {
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
    <form
      onSubmit={handleSubmit}
      className={
        showSendQuoteButton
          ? 'pb-80 md:pb-40 lg:pb-36'
          : 'pb-52 md:pb-28 lg:pb-24'
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="space-y-4">
          <div className="lg:hidden">
            <PricingSummaryPanel
              quoteNumberPreview={editableQuoteNumber}
              onQuoteNumberChange={setEditableQuoteNumber}
              activeMethodLabel={activeMethodLabel}
              status={form.status}
              validUntil={form.valid_until}
              total={displayTotal}
              roomLines={roomSummaryLines}
              summaryLines={summaryLines}
              discountCents={discountCents}
              discountInput={discountInput}
              showDiscountEditor={showDiscountEditor}
              onDiscountInputChange={handleDiscountInputChange}
              onDiscountToggle={handleDiscountToggle}
              depositPercent={depositPercent}
              depositInput={depositInput}
              showDepositEditor={showDepositEditor}
              onDepositInputChange={handleDepositInputChange}
              onDepositToggle={handleDepositToggle}
            />
          </div>

          {/* Quote details */}
          <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-on-surface text-base font-bold leading-snug">Quote Details</h3>
            </div>
            <div className="grid gap-4">
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
                {selectedCustomer && (
                  <div className="border-outline-variant bg-surface-container text-on-surface mt-3 rounded-xl border px-4 py-3 text-sm">
                    <p className="text-on-surface font-medium">
                      {selectedCustomer.company_name || selectedCustomer.name}
                    </p>
                    {customerEmailOptions.length > 0 && (
                      <p className="text-on-surface-variant mt-1 break-all">
                        {customerEmailOptions[0]}
                        {customerEmailOptions.length > 1 && (
                          <span className="ml-1 text-xs whitespace-nowrap">
                            +{customerEmailOptions.length - 1} more
                          </span>
                        )}
                      </p>
                    )}
                    {customerPropertyOptions.length > 0 ? (
                      <div className="mt-3">
                        <label
                          htmlFor="customer_property"
                          className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wide uppercase"
                        >
                          Property
                        </label>
                        <select
                          id="customer_property"
                          value={selectedPropertyIndex}
                          onChange={(event) => {
                            setSelectedPropertyIndex(event.target.value);
                            setError(null);
                          }}
                          className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                        >
                          {customerPropertyOptions.map((property, index) => (
                            <option
                              key={`${property.address}-${index}`}
                              value={String(index)}
                            >
                              {property.label} — {property.address}
                            </option>
                          ))}
                        </select>
                        {selectedProperty?.notes && (
                          <p className="text-on-surface-variant mt-1 text-xs">
                            {selectedProperty.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-on-surface-variant mt-2 text-xs">
                        No saved property for this customer.
                      </p>
                    )}
                  </div>
                )}
                {showSendQuoteButton && selectedCustomer && !canSendQuote && (
                  <p className="text-error mt-2 text-xs">
                    No email on file — add one to this customer to enable Send
                    Quote.
                  </p>
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
              <div>
                <label htmlFor="working_days" className={LABEL}>
                  Booking Duration
                </label>
                <div className="relative">
                  <NumericInput
                    id="working_days"
                    name="working_days"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    value={form.working_days}
                    sanitize={sanitizeIntegerInput}
                    onValueChange={(value) => {
                      setForm((current) => ({
                        ...current,
                        working_days: value,
                      }));
                      setError(null);
                    }}
                    onBlur={() => {
                      setForm((current) => ({
                        ...current,
                        working_days: String(
                          normalizeWorkingDays(intVal(current.working_days, 1))
                        ),
                      }));
                    }}
                    aria-describedby="working_days_help"
                    className="border-outline-variant text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white pr-16 pl-4 text-base focus:ring-2 focus:outline-none"
                  />
                  <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium">
                    days
                  </span>
                </div>
                <p
                  id="working_days_help"
                  className="text-on-surface-variant mt-1 text-xs"
                >
                  Used after approval when the client chooses their booking
                  start date.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing method selector */}
          <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold leading-snug text-on-surface">Pricing Method</h3>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                Choose how you want to calculate this quote.
              </p>
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="tablist"
              aria-label="Pricing method"
            >
              {(
                [
                  ['detailed_quick', Zap, 'Quick', 'Pick rooms & scope'],
                  ['hybrid', Layers, 'Detailed', 'Area-based estimate'],
                  ['day_rate', CalendarDays, 'By day', 'Labour × days'],
                  ['manual', PenLine, 'Manual', 'Direct price entry'],
                ] as [PricingStrategy, ElementType, string, string][]
              ).map(([method, Icon, label, desc]) => {
                const isActive = pricingStrategy === method;
                return (
                  <button
                    key={method}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => {
                      setPricingStrategy(method);
                      setError(null);
                    }}
                    className={`group relative flex h-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                      isActive
                        ? 'border-primary bg-primary text-on-primary shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        isActive
                          ? 'border-on-primary/30 bg-on-primary/15 text-on-primary'
                          : 'border-outline-variant bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-bold leading-snug">
                        {label}
                      </span>
                      <span
                        className={`text-xs leading-snug ${
                          isActive ? 'text-on-primary/80' : 'text-on-surface-variant'
                        }`}
                      >
                        {desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              {pricingStrategy === 'detailed_quick' ? (
                <>
                  Pick rooms, sizes &amp; scope — ~30 sec.{' '}
                  <Link
                    href="/price-rates"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Edit room prices
                  </Link>
                </>
              ) : pricingStrategy === 'hybrid' ? (
                <>
                  Using Detailed Estimate Anchors from Price Rates.{' '}
                  <Link
                    href="/price-rates"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Edit Price Rates
                  </Link>
                </>
              ) : (
                <>
                  Using default rates from Price Rates.{' '}
                  <Link
                    href="/price-rates"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Edit default rates
                  </Link>
                </>
              )}
            </p>
          </section>

          {/* Interior / Exterior scope toggle — only for detailed estimate */}
          {pricingStrategy === 'hybrid' && (
            <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="text-on-surface text-base font-bold leading-snug">Job Scope</h3>
              </div>
              <div className="border-outline-variant bg-surface-container-low inline-flex gap-0.5 rounded-xl border p-0.5">
                {(['interior', 'exterior'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setQuoteScope(scope)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                      quoteScope === scope
                        ? 'bg-white text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {scope === 'interior' ? <><Home className={`h-3.5 w-3.5 ${quoteScope === scope ? 'text-primary' : ''}`} />Interior</> : <><Trees className={`h-3.5 w-3.5 ${quoteScope === scope ? 'text-primary' : ''}`} />Exterior</>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quick estimate builder */}
          {pricingStrategy === 'detailed_quick' && (
            <section>
              <QuickEstimateBuilder
                rateSettings={rateSettings ?? null}
                value={quickInputs}
                onChange={setQuickInputs}
              />
            </section>
          )}

          {/* Day rate inputs */}
          {pricingStrategy === 'day_rate' && (
            <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <h3 className="text-on-surface text-base font-bold leading-snug">Labour × Days</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Number of days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={dayRateState.days}
                    onChange={(e) =>
                      setDayRateState((prev) => ({
                        ...prev,
                        days: parseFloat(e.target.value) || 1,
                      }))
                    }
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
                      const nextValue =
                        value.trim() === '' ? 0 : parseFloat(value);
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
                    <label
                      key={m}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        checked={dayRateState.material_method === m}
                        onChange={() =>
                          setDayRateState((prev) => ({
                            ...prev,
                            material_method: m,
                          }))
                        }
                        className="accent-primary"
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
                      onChange={(e) =>
                        setDayRateState((prev) => ({
                          ...prev,
                          material_percent: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="border-outline-variant w-20 rounded-xl border bg-white px-3 py-2.5 text-center text-base"
                    />
                    <span className="text-on-surface-variant text-sm">
                      % of labour
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-on-surface-variant text-sm">$</span>
                    <NumericInput
                      inputMode="numeric"
                      value={(
                        (dayRateState.material_flat_cents ?? 0) / 100
                      ).toFixed(0)}
                      sanitize={sanitizeIntegerInput}
                      onValueChange={(value) => {
                        const nextValue =
                          value.trim() === '' ? 0 : parseFloat(value);
                        if (!Number.isFinite(nextValue)) {
                          return;
                        }

                        setDayRateState((prev) => ({
                          ...prev,
                          material_flat_cents: Math.round(nextValue * 100),
                        }));
                      }}
                      className="border-outline-variant w-32 rounded-xl border bg-white px-3 py-2.5 text-base"
                    />
                  </div>
                )}
              </div>
              <div className="bg-primary/15 text-primary mt-4 rounded-xl px-4 py-3 text-sm">
                Labour:{' '}
                {formatAUD(dayRateState.days * dayRateState.daily_rate_cents)}{' '}
                (ex-GST)
              </div>
            </section>
          )}

          {/* Room rate inputs — legacy method, shown read-only for existing quotes */}
          {pricingStrategy === 'room_rate' && (
            <section className="border-outline-variant rounded-2xl border bg-white p-4">
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>
                  <span className="font-semibold">Room Flat Rate is no longer available</span>{' '}
                  for new quotes. Switch to <strong>Quick estimate</strong> for a faster, more accurate result.
                </span>
              </div>
              <h3 className="text-on-surface mb-4 text-base font-bold leading-snug">
                Room Flat Rates (read-only)
              </h3>
              {roomRatePresets.length > 0 && (
                <div className="border-primary/25 bg-primary/10 mb-4 rounded-xl border p-3">
                  <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                    Saved Room Presets
                  </p>
                  <p className="text-on-surface-variant mt-1 text-xs">
                    Add your saved room presets directly into this quote, then
                    adjust the flat rate if needed.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roomRatePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          addRoomRatePresetItem(
                            preset.title,
                            preset.sqm,
                            preset.rate_cents
                          )
                        }
                        className="border-primary/30 text-on-surface hover:border-primary hover:bg-primary/15 rounded-full border bg-white px-3 py-1.5 text-xs font-medium"
                      >
                        {preset.title} · {preset.sqm} sqm ·{' '}
                        {formatAUD(preset.rate_cents)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {roomRateItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="border-outline-variant rounded-xl border p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          setRoomRateItems((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, name: e.target.value } : r
                            )
                          )
                        }
                        placeholder="Room name"
                        className="border-outline-variant rounded-lg border bg-white px-3 py-2 text-sm"
                      />
                      <select
                        value={item.room_type}
                        onChange={(e) =>
                          setRoomRateItems((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    room_type: e.target
                                      .value as typeof item.room_type,
                                  }
                                : r
                            )
                          )
                        }
                        className="border-outline-variant rounded-lg border bg-white px-2 py-1.5 text-sm"
                      >
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {ROOM_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.size}
                        onChange={(e) => {
                          const size = e.target.value as typeof item.size;
                          setRoomRateItems((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    size,
                                    rate_cents: getRoomRateBaseline(
                                      r.room_type,
                                      size,
                                      roomRatePresets
                                    ),
                                  }
                                : r
                            )
                          );
                        }}
                        className="border-outline-variant rounded-lg border bg-white px-2 py-1.5 text-sm"
                      >
                        {ROOM_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-on-surface-variant text-sm">$</span>
                        <NumericInput
                          inputMode="numeric"
                          value={(item.rate_cents / 100).toFixed(0)}
                          sanitize={sanitizeIntegerInput}
                          onValueChange={(value) => {
                            const nextValue =
                              value.trim() === '' ? 0 : parseFloat(value);
                            if (!Number.isFinite(nextValue)) {
                              return;
                            }

                            setRoomRateItems((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      rate_cents: Math.round(nextValue * 100),
                                    }
                                  : r
                              )
                            );
                          }}
                          className="border-outline-variant w-24 rounded-lg border bg-white px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setRoomRateItems((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-on-surface-variant hover:text-error text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addManualRoomRateItem}
                  className="border-primary text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-xl border border-dashed px-4 py-2.5 text-sm font-semibold"
                >
                  + Add Custom Room
                </button>
              </div>
            </section>
          )}

          {/* Manual direct input */}
          {pricingStrategy === 'manual' && (
            <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <h3 className="text-on-surface text-base font-bold leading-snug">Direct Price Entry</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Labour cost ($, ex-GST)</label>
                  <NumericInput
                    inputMode="numeric"
                    value={(manualInputs.labor_cents / 100).toFixed(0)}
                    sanitize={sanitizeIntegerInput}
                    onValueChange={(value) => {
                      const nextValue =
                        value.trim() === '' ? 0 : parseFloat(value);
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
                      const nextValue =
                        value.trim() === '' ? 0 : parseFloat(value);
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
          {pricingStrategy === 'hybrid' && quoteScope === 'interior' && (
            <>
              {/* Mode toggle — Quick vs Advanced */}
              <div className="border-outline-variant flex overflow-hidden rounded-xl border bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setEstimateMode('quick');
                    setError(null);
                  }}
                  className={[
                    'flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-semibold transition-colors',
                    estimateMode === 'quick'
                      ? 'bg-primary text-white'
                      : 'text-on-surface-variant hover:text-on-surface',
                  ].join(' ')}
                >
                  <span className="text-base">⚡</span>
                  Quick
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEstimateMode('advanced');
                    setError(null);
                  }}
                  className={[
                    'flex flex-1 flex-col items-center gap-0.5 py-3 text-sm font-semibold transition-colors',
                    estimateMode === 'advanced'
                      ? 'bg-primary text-white'
                      : 'text-on-surface-variant hover:text-on-surface',
                  ].join(' ')}
                >
                  <span className="text-base">🔧</span>
                  Advanced
                </button>
              </div>

              {estimateMode === 'quick' ? (
                <QuickQuoteBuilder
                  value={quickState}
                  onChange={(next) => {
                    setQuickState(next);
                    setError(null);
                  }}
                  rateSettings={rateSettings}
                />
              ) : (
                <InteriorEstimateBuilder
                  value={advancedEstimate}
                  onChange={(next) => {
                    setAdvancedEstimate(next);
                    setError(null);
                  }}
                  rateSettings={rateSettings}
                />
              )}
            </>
          )}

          {/* Exterior estimate builder */}
          {pricingStrategy === 'hybrid' && quoteScope === 'exterior' && (
            <ExteriorEstimateBuilder
              value={exteriorEstimate}
              onChange={(next) => {
                setExteriorEstimate(next);
                setError(null);
              }}
              rateSettings={rateSettings}
            />
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
          <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-on-surface text-base font-bold leading-snug">Notes</h3>
            </div>
            <div className="grid gap-4">
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
            <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <h3 className="text-on-surface text-base font-bold leading-snug">Markup</h3>
                <p className="text-on-surface-variant mt-0.5 text-sm">
                  Applies to the detailed estimate only. Internal only — not visible on the quote PDF.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                      className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-base focus:ring-2 focus:outline-none"
                    />
                    <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium">
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
                      className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-base focus:ring-2 focus:outline-none"
                    />
                    <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Validation error */}
          {error && (
            <div className="border-error bg-error-container rounded-lg border px-4 py-3">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}
        </div>

        <aside className="hidden lg:block lg:self-stretch">
          <div className="lg:sticky lg:top-6">
            <PricingSummaryPanel
              quoteNumberPreview={editableQuoteNumber}
              onQuoteNumberChange={setEditableQuoteNumber}
              activeMethodLabel={activeMethodLabel}
              status={form.status}
              validUntil={form.valid_until}
              total={displayTotal}
              roomLines={roomSummaryLines}
              summaryLines={summaryLines}
              discountCents={discountCents}
              discountInput={discountInput}
              showDiscountEditor={showDiscountEditor}
              onDiscountInputChange={handleDiscountInputChange}
              onDiscountToggle={handleDiscountToggle}
              depositPercent={depositPercent}
              depositInput={depositInput}
              showDepositEditor={showDepositEditor}
              onDepositInputChange={handleDepositInputChange}
              onDepositToggle={handleDepositToggle}
            />
          </div>
        </aside>
      </div>

      {sendDialog && selectedCustomer && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 px-4 py-4 md:items-center md:justify-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                  Send Quote
                </p>
                <h3 className="text-on-surface mt-1 text-xl font-semibold">
                  Review before sending
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSendDialog(null)}
                disabled={isPending}
                className="border-outline-variant text-on-surface-variant h-10 rounded-lg border px-3 text-sm font-medium disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="send_quote_email" className={LABEL}>
                  Send to
                </label>
                <select
                  id="send_quote_email"
                  value={sendDialog.email}
                  onChange={(event) =>
                    setSendDialog((current) =>
                      current
                        ? { ...current, email: event.target.value }
                        : current
                    )
                  }
                  className={FIELD}
                >
                  {customerEmailOptions.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
                <p className="text-on-surface-variant mt-1 text-xs">
                  Choose from emails saved on this customer.
                </p>
              </div>

              <div className="border-outline-variant bg-surface-container rounded-xl border px-4 py-3">
                <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                  Customer
                </p>
                <p className="text-on-surface mt-1 font-medium">
                  {selectedCustomer.company_name || selectedCustomer.name}
                </p>
                {selectedProperty?.address && (
                  <p className="text-on-surface-variant mt-1 text-sm">
                    {selectedProperty.address}
                  </p>
                )}
              </div>

              <div className="border-outline-variant rounded-xl border bg-white px-4 py-3">
                <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                  Quote Content
                </p>
                <p className="text-on-surface mt-1 font-medium">
                  {sendDialog.payload.title}
                </p>
                <p className="text-on-surface-variant mt-1 text-sm">
                  Valid until {sendDialog.payload.valid_until}
                </p>
                <p className="text-on-surface-variant mt-1 text-sm">
                  Booking duration: {sendDialog.payload.working_days ?? 1} day
                  {(sendDialog.payload.working_days ?? 1) !== 1 ? 's' : ''}
                </p>
                {sendDialog.payload.notes && (
                  <p className="bg-surface-container text-on-surface mt-3 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                    {sendDialog.payload.notes}
                  </p>
                )}
                <div className="bg-primary-container mt-3 flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-primary text-sm font-medium">
                    Estimated total
                  </span>
                  <span className="text-primary text-base font-semibold">
                    {formatAUD(displayTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSendDialog(null)}
                disabled={isPending}
                className="border-outline-variant text-on-surface h-12 rounded-xl border bg-white px-4 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendQuote}
                disabled={isPending || !sendDialog.email}
                className="bg-on-surface hover:bg-on-surface/90 h-12 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isPending && activeSubmitIntent === 'send_email'
                  ? 'Sending...'
                  : 'Send Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer CTA — sits above the dashboard bottom tab bar (h-16) on mobile */}
      <div className="border-outline-variant fixed right-0 bottom-16 left-0 z-10 border-t bg-white/95 px-3 pt-3 pb-3 backdrop-blur-sm sm:px-4 md:bottom-0 md:left-[72px] md:px-6 md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:left-64">
        <div className="mx-auto flex w-full max-w-lg justify-center lg:max-w-6xl">
          {showSendQuoteButton ? (
            <div className="w-full space-y-2 lg:flex lg:items-center lg:gap-3 lg:space-y-0">
              <button
                type="button"
                onClick={handleOpenSendDialog}
                disabled={isPending || !canSubmit || !canSendQuote}
                className="bg-on-surface hover:bg-on-surface/90 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-colors disabled:opacity-50 lg:flex-[1.6]"
              >
                {isPending && activeSubmitIntent === 'send_email'
                  ? 'Sending...'
                  : 'Send Quote to Client'}
              </button>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-1">
                <button
                  type="submit"
                  data-submit-intent="save"
                  onClick={() => setActiveSubmitIntent('save')}
                  disabled={isPending || !canSubmit}
                  className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex h-11 items-center justify-center rounded-xl border bg-white px-4 text-sm font-semibold transition-colors disabled:opacity-50 lg:flex-1"
                >
                  {isPending && activeSubmitIntent === 'save'
                    ? 'Saving...'
                    : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => (onCancel ? onCancel() : router.back())}
                  disabled={isPending}
                  className="border-outline-variant text-on-surface-variant hover:text-on-surface inline-flex h-11 items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium transition-colors disabled:opacity-50 lg:flex-1"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : router.back())}
                disabled={isPending}
                className="border-outline-variant text-on-surface-variant hover:text-on-surface inline-flex h-14 items-center justify-center rounded-xl border bg-white px-4 text-base font-medium transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                data-submit-intent="save"
                disabled={isPending || !canSubmit}
                className="bg-on-surface hover:bg-on-surface/90 inline-flex h-14 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving...' : submitLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
