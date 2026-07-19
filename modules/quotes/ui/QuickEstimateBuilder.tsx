'use client';

import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import Link from 'next/link';
import type {
  UserRateSettings,
  QuickEstimateRoom,
  QuickPropertyPreset,
} from '@/modules/price-rates/domain/rate-settings';
import { TRIM_PAINT_SYSTEM_LABELS } from '@/modules/price-rates/domain/rate-settings';
import type {
  QuickInputs,
  SelectedQuickPropertyPreset,
  SelectedQuickRoom,
} from '@/modules/quotes/domain/quote';
import { formatAUD } from '@/utils/format';
import { formControlClassName } from '@/components/forms/FormField';
import {
  QUICK_ESTIMATE_RATE_SNAPSHOT_VERSION,
  calculateQuickEstimate,
  calculateQuickEstimateRoomTotal,
  snapshotQuickEstimateInputs,
} from '@/modules/quotes/domain/quote-calculations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickEstimateBuilderProps {
  rateSettings: UserRateSettings | null;
  value: QuickInputs;
  onChange: (updated: QuickInputs) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COATING_OPTIONS = [
  { key: 'one_coat_refresh' as const, label: '1 Coat', sublabel: 'Refresh' },
  { key: 'two_coats_repaint' as const, label: '2 Coats', sublabel: 'Repaint' },
  {
    key: 'three_coats_new_plaster' as const,
    label: '3 Coats',
    sublabel: 'New plaster',
  },
];

const CONDITION_OPTIONS = [
  { key: 'good' as const, label: 'Good', sublabel: 'Minor prep' },
  { key: 'average' as const, label: 'Average', sublabel: 'Standard prep' },
  { key: 'poor' as const, label: 'Poor', sublabel: 'Heavy prep' },
];

const SIZE_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

const SURFACE_LABELS: Record<'walls' | 'ceiling' | 'trim', string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
};

const TRIM_PAINT_OPTIONS = [
  { key: 'oil_2coat' as const, label: TRIM_PAINT_SYSTEM_LABELS.oil_2coat },
  {
    key: 'water_3coat_white_finish' as const,
    label: TRIM_PAINT_SYSTEM_LABELS.water_3coat_white_finish,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCoatingPct(
  coating: QuickInputs['global_coating'],
  rateSettings: UserRateSettings | null
): number {
  const m = rateSettings?.quick_estimate?.coating_multipliers;
  if (!m)
    return coating === 'one_coat_refresh'
      ? 70
      : coating === 'three_coats_new_plaster'
        ? 140
        : 100;
  if (coating === 'one_coat_refresh') return m.one_coat_refresh_pct;
  if (coating === 'three_coats_new_plaster')
    return m.three_coats_new_plaster_pct;
  return m.two_coats_repaint_pct;
}

function getConditionPct(
  condition: QuickInputs['global_condition'],
  rateSettings: UserRateSettings | null
): number {
  const m = rateSettings?.quick_estimate?.condition_multipliers;
  if (!m) return condition === 'good' ? 90 : condition === 'poor' ? 130 : 100;
  if (condition === 'good') return m.good_pct;
  if (condition === 'poor') return m.poor_pct;
  return m.average_pct;
}

function calcRoomTotal(
  room: SelectedQuickRoom,
  coatingPct: number,
  conditionPct: number
): number {
  return calculateQuickEstimateRoomTotal(room, coatingPct, conditionPct);
}

function makeRoomFromTemplate(
  template: QuickEstimateRoom,
  size: 'small' | 'medium' | 'large',
  coatingPct: number,
  conditionPct: number,
  trimPaintSystem: NonNullable<QuickInputs['global_trim_paint_system']>
): SelectedQuickRoom {
  const sizeRates = template.sizes[size];
  const room: SelectedQuickRoom = {
    room_id: template.id,
    source_rate_item_id: template.id,
    source_rate_item_version: template.version ?? 1,
    source_rate_item_label: template.label,
    rate_snapshot_version: QUICK_ESTIMATE_RATE_SNAPSHOT_VERSION,
    label: template.label,
    size,
    selected_surfaces: [...template.enabled_surfaces],
    trim_paint_system: trimPaintSystem,
    walls_cents: sizeRates.walls_cents,
    ceiling_cents: sizeRates.ceiling_cents,
    trim_cents: getTemplateTrimCents(sizeRates, trimPaintSystem),
    coating_multiplier_pct: coatingPct,
    condition_multiplier_pct: conditionPct,
    total_cents: 0,
  };
  return {
    ...room,
    total_cents: calcRoomTotal(room, coatingPct, conditionPct),
  };
}

function makePropertyPresetFromTemplate(
  preset: QuickPropertyPreset,
  trimPaintSystem: NonNullable<QuickInputs['global_trim_paint_system']>
): SelectedQuickPropertyPreset {
  return {
    estimate_category: 'interior',
    preset_id: preset.id,
    source_rate_item_id: preset.id,
    source_rate_item_version: preset.version ?? 1,
    source_rate_item_label: preset.label,
    label: preset.label,
    property_type: preset.property_type,
    apartment_type: preset.apartment_type ?? null,
    bedrooms: preset.bedrooms ?? null,
    bathrooms: preset.bathrooms ?? null,
    sqm: preset.sqm ?? null,
    storeys: preset.storeys ?? null,
    condition: preset.condition,
    scope: [...preset.scope],
    surface_price_share: preset.surface_price_share,
    wall_paint_system: preset.wall_paint_system,
    trim_paint_system: trimPaintSystem,
    subtotal_cents: 0,
    gst_cents: 0,
    total_cents: 0,
  };
}

function getTemplateTrimCents(
  sizeRates: QuickEstimateRoom['sizes'][keyof QuickEstimateRoom['sizes']],
  trimPaintSystem: NonNullable<QuickInputs['global_trim_paint_system']>
) {
  if (trimPaintSystem === 'water_3coat_white_finish') {
    return sizeRates.trim_water_cents ?? sizeRates.trim_cents;
  }
  return sizeRates.trim_oil_cents ?? sizeRates.trim_cents;
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  template,
  coatingPct,
  conditionPct,
  onUpdate,
  onDelete,
}: {
  room: SelectedQuickRoom;
  template: QuickEstimateRoom | undefined;
  coatingPct: number;
  conditionPct: number;
  onUpdate: (updated: SelectedQuickRoom) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = calcRoomTotal(room, coatingPct, conditionPct);
  const allUnchecked = room.selected_surfaces.length === 0;

  function handleSizeChange(size: 'small' | 'medium' | 'large') {
    const sizeRates = template?.sizes[size] ?? {
      walls_cents: room.walls_cents,
      ceiling_cents: room.ceiling_cents,
      trim_cents: room.trim_cents,
    };
    const trimPaintSystem = room.trim_paint_system ?? 'oil_2coat';
    onUpdate({
      ...room,
      size,
      walls_cents: sizeRates.walls_cents,
      ceiling_cents: sizeRates.ceiling_cents,
      trim_cents: getTemplateTrimCents(sizeRates, trimPaintSystem),
    });
  }

  function handleSurfaceToggle(surface: 'walls' | 'ceiling' | 'trim') {
    const selected = room.selected_surfaces.includes(surface)
      ? room.selected_surfaces.filter((s) => s !== surface)
      : [...room.selected_surfaces, surface];
    onUpdate({ ...room, selected_surfaces: selected });
  }

  const availableSurfaces =
    template?.enabled_surfaces ?? (['walls', 'ceiling', 'trim'] as const);

  return (
    <div
      className={`bg-surface-container-lowest rounded-2xl border ${allUnchecked ? 'border-warning' : 'border-outline-variant'}`}
    >
      {/* Header row */}
      <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="focus-visible:ring-primary/30 flex min-h-11 flex-1 items-center gap-2 rounded-xl text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          {expanded ? (
            <ChevronUp className="text-on-surface-variant h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="text-on-surface-variant h-4 w-4 shrink-0" />
          )}
          <span className="text-on-surface flex-1 text-sm font-semibold">
            {room.label}
          </span>
        </button>

        {/* Size chips */}
        <div className="flex gap-1">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSizeChange(s)}
              className={`focus-visible:ring-primary/30 min-h-11 min-w-11 rounded-xl border px-2 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                room.size === s
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary'
              }`}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Price */}
        <span
          className={`min-w-[64px] text-right text-sm font-bold ${allUnchecked ? 'text-warning' : 'text-on-surface'}`}
        >
          {formatAUD(total)}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="text-on-surface-variant hover:bg-error-container hover:text-error focus-visible:ring-error/30 flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Remove room"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-outline-variant space-y-3 border-t px-4 pt-3 pb-3">
          {/* Surface toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-on-surface-variant text-xs font-semibold">
              Surfaces:
            </span>
            {(['walls', 'ceiling', 'trim'] as const).map((s) => {
              const isAvailable = availableSurfaces.includes(s);
              if (!isAvailable) return null;
              const isSelected = room.selected_surfaces.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSurfaceToggle(s)}
                  className={`focus-visible:ring-primary/30 min-h-11 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    isSelected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {SURFACE_LABELS[s]}
                </button>
              );
            })}
            {allUnchecked && (
              <span className="text-warning text-xs">
                Select at least one surface
              </span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-on-surface-variant mb-1 block text-xs font-medium">
              Notes (optional)
            </label>
            <input
              type="text"
              value={room.notes ?? ''}
              onChange={(e) =>
                onUpdate({ ...room, notes: e.target.value || undefined })
              }
              placeholder="e.g. skip wardrobe wall"
              className={formControlClassName}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuickEstimateBuilder({
  rateSettings,
  value,
  onChange,
}: QuickEstimateBuilderProps) {
  const quickSettings = rateSettings?.quick_estimate;
  const propertyPresets = quickSettings?.property_presets ?? [];
  const templateRooms = quickSettings?.rooms ?? [];
  const isNotConfigured = templateRooms.length === 0;
  const trimPaintSystem = value.global_trim_paint_system ?? 'oil_2coat';

  const coatingPct = getCoatingPct(value.global_coating, rateSettings);
  const conditionPct = getConditionPct(value.global_condition, rateSettings);
  const quickPreview = rateSettings
    ? calculateQuickEstimate(value, rateSettings)
    : null;

  const roomSubtotal = value.rooms.reduce(
    (sum, r) => sum + calcRoomTotal(r, coatingPct, conditionPct),
    0
  );
  const subtotal = quickPreview?.subtotal_cents ?? roomSubtotal;
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  function selectPropertyPreset(preset: QuickPropertyPreset) {
    const next: QuickInputs = {
      ...value,
      global_trim_paint_system: trimPaintSystem,
      property_preset: makePropertyPresetFromTemplate(preset, trimPaintSystem),
      rooms: [],
    };
    onChange(
      rateSettings ? snapshotQuickEstimateInputs(next, rateSettings) : next
    );
  }

  function clearPropertyPreset() {
    onChange({ ...value, property_preset: null });
  }

  function handleRoomUpdate(index: number, updated: SelectedQuickRoom) {
    const rooms = [...value.rooms];
    rooms[index] = {
      ...updated,
      total_cents: calcRoomTotal(
        updated,
        updated.coating_multiplier_pct,
        updated.condition_multiplier_pct
      ),
    };
    onChange({ ...value, property_preset: null, rooms });
  }

  function handleRoomDelete(index: number) {
    onChange({ ...value, rooms: value.rooms.filter((_, i) => i !== index) });
  }

  function addRoom(template: QuickEstimateRoom) {
    const newRoom = makeRoomFromTemplate(
      template,
      'medium',
      coatingPct,
      conditionPct,
      trimPaintSystem
    );
    onChange({
      ...value,
      global_trim_paint_system: trimPaintSystem,
      property_preset: null,
      rooms: [...value.rooms, newRoom],
    });
  }

  function handleTrimPaintSystemChange(
    nextTrimPaintSystem: NonNullable<QuickInputs['global_trim_paint_system']>
  ) {
    const nextRooms = value.rooms.map((room) => {
      const template = templateRooms.find(
        (item) =>
          item.id === room.source_rate_item_id || item.id === room.room_id
      );
      const sizeRates = template?.sizes[room.size];
      const updatedRoom: SelectedQuickRoom = {
        ...room,
        trim_paint_system: nextTrimPaintSystem,
        trim_cents: sizeRates
          ? getTemplateTrimCents(sizeRates, nextTrimPaintSystem)
          : room.trim_cents,
      };
      return {
        ...updatedRoom,
        total_cents: calcRoomTotal(updatedRoom, coatingPct, conditionPct),
      };
    });
    const nextPropertyPreset = value.property_preset
      ? {
          ...value.property_preset,
          trim_paint_system: nextTrimPaintSystem,
          subtotal_cents: 0,
          gst_cents: 0,
          total_cents: 0,
        }
      : null;
    const next: QuickInputs = {
      ...value,
      global_trim_paint_system: nextTrimPaintSystem,
      property_preset: nextPropertyPreset,
      rooms: nextRooms,
    };
    onChange(
      rateSettings ? snapshotQuickEstimateInputs(next, rateSettings) : next
    );
  }

  return (
    <div className="space-y-5">
      {/* Not configured banner */}
      {isNotConfigured && (
        <div className="border-warning bg-warning-container flex items-start gap-3 rounded-2xl border px-4 py-3">
          <Settings className="text-warning mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-on-warning-container flex-1 text-sm">
            <span className="font-semibold">Room prices not set up. </span>
            <Link
              href="/price-rates"
              className="focus-visible:ring-primary/30 rounded-xl font-medium underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Go to Price Rates
            </Link>{' '}
            to add rooms and set prices.
          </div>
        </div>
      )}

      {propertyPresets.length > 0 && (
        <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
          <h4 className="text-on-surface mb-3 text-sm font-semibold">
            Whole Property
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {propertyPresets.map((preset) => {
              const selected =
                value.property_preset?.source_rate_item_id === preset.id ||
                value.property_preset?.preset_id === preset.id;
              const preview = rateSettings
                ? calculateQuickEstimate(
                    {
                      ...value,
                      property_preset: makePropertyPresetFromTemplate(
                        preset,
                        trimPaintSystem
                      ),
                      rooms: [],
                      global_trim_paint_system: trimPaintSystem,
                    },
                    rateSettings
                  ).property_preset
                : null;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectPropertyPreset(preset)}
                  className={`focus-visible:ring-primary/30 min-h-11 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    selected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary'
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {preset.label}
                  </span>
                  <span className="text-on-surface-variant mt-1 block text-xs">
                    {preview
                      ? `${formatAUD(preview.total_cents)} inc GST`
                      : 'Saved preset'}
                  </span>
                </button>
              );
            })}
          </div>
          {value.property_preset && (
            <div className="border-outline-variant bg-surface-container-low mt-3 rounded-xl border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-on-surface text-sm font-semibold">
                  {value.property_preset.label}
                </p>
                <button
                  type="button"
                  onClick={clearPropertyPreset}
                  className="text-on-surface-variant hover:text-on-surface focus-visible:ring-primary/30 min-h-11 rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                >
                  Clear
                </button>
              </div>
              <p className="text-on-surface-variant text-xs">
                {value.property_preset.sqm
                  ? `${value.property_preset.sqm} sqm`
                  : 'No sqm set'}
                {value.property_preset.bedrooms != null
                  ? ` · ${value.property_preset.bedrooms} bed`
                  : ''}
                {value.property_preset.bathrooms != null
                  ? ` · ${value.property_preset.bathrooms} bath`
                  : ''}
                {` · ${TRIM_PAINT_SYSTEM_LABELS[value.property_preset.trim_paint_system ?? 'oil_2coat']}`}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
        <h4 className="text-on-surface mb-3 text-sm font-semibold">
          Trim Base
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {TRIM_PAINT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTrimPaintSystemChange(key)}
              className={`focus-visible:ring-primary/30 min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                trimPaintSystem === key
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-outline-variant text-on-surface hover:border-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {!value.property_preset && (
        <>
          {/* Coating type */}
          <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
            <h4 className="text-on-surface mb-3 text-sm font-semibold">
              Coating Type
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {COATING_OPTIONS.map(({ key, label, sublabel }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onChange(
                      rateSettings
                        ? snapshotQuickEstimateInputs(
                            { ...value, global_coating: key },
                            rateSettings
                          )
                        : { ...value, global_coating: key }
                    )
                  }
                  className={`focus-visible:ring-primary/30 flex min-h-11 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    value.global_coating === key
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-variant text-on-surface hover:border-primary'
                  }`}
                >
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-on-surface-variant mt-0.5 text-xs">
                    {sublabel}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Room list */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-on-surface text-sm font-semibold">
                Rooms{value.rooms.length > 0 && ` (${value.rooms.length})`}
              </h4>
            </div>

            {value.rooms.length === 0 && (
              <p className="border-outline-variant text-on-surface-variant rounded-2xl border border-dashed px-4 py-5 text-center text-sm">
                No rooms added yet. Pick from the list below.
              </p>
            )}

            <div className="space-y-2">
              {value.rooms.map((room, i) => {
                const template = templateRooms.find(
                  (t) => t.id === room.room_id
                );
                return (
                  <RoomCard
                    key={`${room.room_id}-${i}`}
                    room={room}
                    template={template}
                    coatingPct={coatingPct}
                    conditionPct={conditionPct}
                    onUpdate={(updated) => handleRoomUpdate(i, updated)}
                    onDelete={() => handleRoomDelete(i)}
                  />
                );
              })}
            </div>
          </section>

          {/* Add room */}
          {!isNotConfigured && (
            <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
              <h4 className="text-on-surface mb-3 text-sm font-semibold">
                <Plus className="mr-1 inline h-4 w-4" />
                Add Room
              </h4>
              <div className="flex flex-wrap gap-2">
                {templateRooms.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => addRoom(template)}
                    className="border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-primary/10 focus-visible:ring-primary/30 min-h-11 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    + {template.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Condition */}
          <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
            <h4 className="text-on-surface mb-1 text-sm font-semibold">
              Surface Condition
            </h4>
            <p className="text-on-surface-variant mb-3 text-xs">
              How much prep work is needed?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CONDITION_OPTIONS.map(({ key, label, sublabel }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onChange(
                      rateSettings
                        ? snapshotQuickEstimateInputs(
                            { ...value, global_condition: key },
                            rateSettings
                          )
                        : { ...value, global_condition: key }
                    )
                  }
                  className={`focus-visible:ring-primary/30 flex min-h-11 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    value.global_condition === key
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-variant text-on-surface hover:border-primary'
                  }`}
                >
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-on-surface-variant mt-0.5 text-xs">
                    {sublabel}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Summary */}
      {(value.property_preset || value.rooms.length > 0) && (
        <div className="border-outline-variant bg-surface-container-lowest space-y-2 rounded-2xl border p-4">
          <div className="text-on-surface-variant flex justify-between text-sm">
            <span>Subtotal (ex-GST)</span>
            <span className="text-on-surface font-medium">
              {formatAUD(subtotal)}
            </span>
          </div>
          <div className="text-on-surface-variant flex justify-between text-sm">
            <span>GST (10%)</span>
            <span className="text-on-surface font-medium">
              {formatAUD(gst)}
            </span>
          </div>
          <div className="border-outline-variant text-on-surface flex justify-between border-t pt-2 text-base font-bold">
            <span>Total inc-GST</span>
            <span className="text-primary">{formatAUD(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
