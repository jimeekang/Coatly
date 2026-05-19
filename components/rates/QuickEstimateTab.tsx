'use client';

import { useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type {
  QuickEstimateSettings,
  QuickEstimateRoom,
  QuickPropertyPreset,
} from '@/lib/rate-settings';
import {
  DEFAULT_QUICK_SURFACE_PRICE_SHARE,
  TRIM_PAINT_SYSTEM_LABELS,
  buildDefaultQuickPropertyPresets,
} from '@/lib/rate-settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

const ROOM_TEMPLATES = [
  'Master Bedroom (with ensuite)',
  'Master Bedroom (without ensuite)',
  'Bedroom',
  'Bathroom',
  'Living Room',
  'Kitchen',
  'Hallway',
  'Dining Room',
  'Study',
  'Laundry',
  'Garage',
  'Rumpus Room',
];

const SURFACE_LABELS: Record<'walls' | 'ceiling' | 'trim', string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
};

const SIZE_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

const PROPERTY_TYPE_LABELS: Record<'apartment' | 'house', string> = {
  apartment: 'Apartment',
  house: 'House',
};

const APARTMENT_TYPE_LABELS: Record<
  NonNullable<QuickPropertyPreset['apartment_type']>,
  string
> = {
  studio: 'Studio',
  '1_bedroom': '1 Bedroom',
  '2_bedroom_standard': '2 Bedroom (Standard)',
  '2_bedroom_large': '2 Bedroom (Large)',
  '3_bedroom': '3 Bedroom',
};

const CONDITION_LABELS: Record<QuickPropertyPreset['condition'], string> = {
  excellent: 'Excellent',
  fair: 'Fair',
  poor: 'Poor',
};

const WALL_PAINT_SYSTEM_LABELS: Record<
  QuickPropertyPreset['wall_paint_system'],
  string
> = {
  refresh_1coat: 'Refresh (1 coat)',
  repaint_2coat: 'Repaint (2 coats)',
  new_plaster_3coat: 'New Plaster (3 coats)',
};

const STOREY_LABELS: Record<NonNullable<QuickPropertyPreset['storeys']>, string> = {
  '1_storey': '1 Storey',
  '2_storey': '2 Storey',
  '3_storey': '3 Storey',
};

const TRIM_PRICE_FIELDS = [
  {
    key: 'trim_oil_cents',
    label: TRIM_PAINT_SYSTEM_LABELS.oil_2coat,
  },
  {
    key: 'trim_water_cents',
    label: TRIM_PAINT_SYSTEM_LABELS.water_3coat_white_finish,
  },
] as const;

const SURFACE_SHARE_FIELDS = [
  { key: 'walls_pct', label: 'Walls', ariaLabel: 'Wall' },
  { key: 'ceiling_pct', label: 'Ceiling', ariaLabel: 'Ceiling' },
  { key: 'trim_pct', label: 'Trim', ariaLabel: 'Trim' },
] as const;

const MEASUREMENT_FIELDS = [
  {
    key: 'wall_area_m2',
    label: 'Wall area',
    suffix: 'sqm',
  },
  {
    key: 'ceiling_area_m2',
    label: 'Ceiling area',
    suffix: 'sqm',
  },
  {
    key: 'trim_linear_m',
    label: 'Trim length',
    suffix: 'metres',
  },
] as const;

function numberOrNull(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getSurfacePriceShare(preset: QuickPropertyPreset) {
  return preset.surface_price_share ?? DEFAULT_QUICK_SURFACE_PRICE_SHARE;
}

function createPropertyPreset(
  id: string,
  sortOrder: number,
  propertyType: QuickPropertyPreset['property_type']
): QuickPropertyPreset {
  return propertyType === 'apartment'
    ? {
        estimate_category: 'interior',
        id,
        version: 1,
        label: '2 Bed 2 Bath Apartment',
        property_type: 'apartment',
        apartment_type: '2_bedroom_standard',
        bedrooms: 2,
        bathrooms: 2,
        storeys: null,
        sqm: 89,
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        surface_price_share: { ...DEFAULT_QUICK_SURFACE_PRICE_SHARE },
        wall_paint_system: 'repaint_2coat',
        trim_paint_system: 'oil_2coat',
        sort_order: sortOrder,
      }
    : {
        estimate_category: 'interior',
        id,
        version: 1,
        label: '3 Bed 2 Bath House',
        property_type: 'house',
        apartment_type: null,
        bedrooms: 3,
        bathrooms: 2,
        storeys: '1_storey',
        sqm: 140,
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        surface_price_share: { ...DEFAULT_QUICK_SURFACE_PRICE_SHARE },
        wall_paint_system: 'repaint_2coat',
        trim_paint_system: 'oil_2coat',
        sort_order: sortOrder,
      };
}

// ─── Room card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  onUpdate,
  onDelete,
}: {
  room: QuickEstimateRoom;
  onUpdate: (updated: QuickEstimateRoom) => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(room.label);

  function handleSurfaceCentsChange(
    size: 'small' | 'medium' | 'large',
    surface: 'walls' | 'ceiling' | 'trim',
    value: string,
    trimField?: 'trim_oil_cents' | 'trim_water_cents'
  ) {
    const cents = displayToCents(value);
    if (cents === null) return;
    const field =
      surface === 'trim' && trimField ? trimField : `${surface}_cents`;
    const nextSize = {
      ...room.sizes[size],
      [field]: cents,
      ...(trimField === 'trim_oil_cents' ? { trim_cents: cents } : {}),
    };
    onUpdate({
      ...room,
      sizes: {
        ...room.sizes,
        [size]: nextSize,
      },
    });
  }

  function handleMeasurementChange(
    size: 'small' | 'medium' | 'large',
    field: (typeof MEASUREMENT_FIELDS)[number]['key'],
    value: string
  ) {
    const measurement = numberOrNull(value);
    if (measurement === null) return;
    onUpdate({
      ...room,
      sizes: {
        ...room.sizes,
        [size]: {
          ...room.sizes[size],
          [field]: measurement,
        },
      },
    });
  }

  function handleSurfaceToggle(surface: 'walls' | 'ceiling' | 'trim') {
    const enabled = room.enabled_surfaces.includes(surface)
      ? room.enabled_surfaces.filter((s) => s !== surface)
      : [...room.enabled_surfaces, surface];
    onUpdate({ ...room, enabled_surfaces: enabled });
  }

  function commitLabel() {
    const label = draftLabel.trim() || room.label;
    setDraftLabel(label);
    setIsEditingLabel(false);
    if (label !== room.label) {
      onUpdate({ ...room, label });
    }
  }

  return (
    <div className="border-outline rounded-2xl border bg-white">
      <div className="flex min-h-[44px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-on-surface flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${room.label} prices`}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          {isEditingLabel ? (
            <input
              aria-label="Room Price Library item name"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onBlur={commitLabel}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitLabel();
                }
                if (event.key === 'Escape') {
                  setDraftLabel(room.label);
                  setIsEditingLabel(false);
                }
              }}
              autoFocus
              className="border-outline h-11 min-w-0 rounded-xl border bg-white px-3 text-sm font-semibold text-on-surface"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftLabel(room.label);
                setIsEditingLabel(true);
              }}
              className="text-on-surface min-h-[44px] text-left text-sm font-medium"
              aria-label={`Edit ${room.label} name`}
            >
              {room.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-on-surface-variant hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Delete room"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="border-outline border-t px-4 pb-4 pt-3">
          {/* Surface toggles */}
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="text-on-surface-variant text-xs font-semibold">Surfaces:</span>
            {(['walls', 'ceiling', 'trim'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSurfaceToggle(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium min-h-[36px] transition-colors ${
                  room.enabled_surfaces.includes(s)
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-outline text-on-surface-variant'
                }`}
              >
                {SURFACE_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Size × surface price matrix */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[340px] text-sm">
              <thead>
                <tr className="text-on-surface-variant text-xs">
                  <th className="pb-2 text-left font-semibold">Size</th>
                  {room.enabled_surfaces.map((s) =>
                    s === 'trim' ? (
                      <th key={s} className="pb-2 text-right font-semibold">
                        Trim Base
                      </th>
                    ) : (
                      <th key={s} className="pb-2 text-right font-semibold">
                        {SURFACE_LABELS[s]}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-outline divide-y">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <tr key={size}>
                    <td className="py-2 text-sm font-medium">{SIZE_LABELS[size]}</td>
                    {room.enabled_surfaces.map((s) => {
                      if (s === 'trim') {
                        return (
                          <td key={s} className="py-2 pl-2 text-right">
                            <div className="flex min-w-[156px] flex-col gap-2">
                              {TRIM_PRICE_FIELDS.map((field) => (
                                <label
                                  key={field.key}
                                  className="grid grid-cols-[52px_1fr] items-center gap-2 text-xs text-on-surface-variant"
                                >
                                  <span>{field.label}</span>
                                  <span className="border-outline inline-flex items-center gap-1 rounded-lg border bg-white px-2">
                                    <span>$</span>
                                    <input
                                      aria-label={`${room.label} ${SIZE_LABELS[size]} Trim ${field.label} price`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      defaultValue={centsToDisplay(
                                        room.sizes[size][field.key] ??
                                          room.sizes[size].trim_cents
                                      )}
                                      onBlur={(event) =>
                                        handleSurfaceCentsChange(
                                          size,
                                          s,
                                          event.target.value,
                                          field.key
                                        )
                                      }
                                      className="w-20 bg-transparent py-1.5 text-right text-sm text-on-surface outline-none"
                                    />
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={s} className="py-2 pl-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-on-surface-variant text-xs">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={centsToDisplay(room.sizes[size][`${s}_cents`])}
                              onBlur={(e) => handleSurfaceCentsChange(size, s, e.target.value)}
                              className="border-outline w-20 rounded-lg border bg-white px-2 py-1.5 text-right text-sm"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
            <p className="text-xs font-semibold text-on-surface-variant">
              Default measured quantities for Detailed Specific
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <div key={size} className="space-y-2 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-on-surface">
                    {SIZE_LABELS[size]}
                  </p>
                  {MEASUREMENT_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className="grid gap-1 text-xs text-on-surface-variant"
                    >
                      <span>
                        {field.label} ({field.suffix})
                      </span>
                      <input
                        aria-label={`${room.label} ${SIZE_LABELS[size]} ${field.label} ${field.suffix}`}
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={room.sizes[size][field.key] ?? 0}
                        onBlur={(event) =>
                          handleMeasurementChange(
                            size,
                            field.key,
                            event.target.value
                          )
                        }
                        className="border-outline h-10 rounded-lg border bg-white px-2 text-right text-sm text-on-surface"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

interface QuickEstimateTabProps {
  settings: QuickEstimateSettings;
  onChange: (updated: QuickEstimateSettings) => void;
}

export function QuickEstimateTab({ settings, onChange }: QuickEstimateTabProps) {
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const generatedRoomIdPrefix = useId();
  const propertyPresets =
    settings.property_presets ?? buildDefaultQuickPropertyPresets();
  const nextRoomIdRef = useRef(settings.rooms.length);
  const nextPropertyPresetIdRef = useRef(propertyPresets.length);

  function handleMultiplierChange(
    group: 'coating_multipliers' | 'condition_multipliers',
    key: string,
    value: string
  ) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < 0) return;
    onChange({
      ...settings,
      [group]: { ...settings[group], [key]: num },
    });
  }

  function handleRoomUpdate(index: number, updated: QuickEstimateRoom) {
    const rooms = [...settings.rooms];
    rooms[index] = {
      ...updated,
      version: (settings.rooms[index]?.version ?? 1) + 1,
    };
    onChange({ ...settings, rooms });
  }

  function handleRoomDelete(index: number) {
    const rooms = settings.rooms.filter((_, i) => i !== index);
    onChange({ ...settings, rooms });
  }

  function handlePropertyPresetUpdate(
    id: string,
    patch: Partial<QuickPropertyPreset>
  ) {
    onChange({
      ...settings,
      property_presets: propertyPresets.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              ...patch,
              version: (preset.version ?? 1) + 1,
            }
          : preset
      ),
    });
  }

  function handlePropertyPresetDelete(id: string) {
    onChange({
      ...settings,
      property_presets: propertyPresets.filter(
        (preset) => preset.id !== id
      ),
    });
  }

  function handlePropertyPresetScopeToggle(
    preset: QuickPropertyPreset,
    surface: 'walls' | 'ceiling' | 'trim'
  ) {
    const nextScope = preset.scope.includes(surface)
      ? preset.scope.filter((item) => item !== surface)
      : [...preset.scope, surface];
    handlePropertyPresetUpdate(preset.id, {
      scope: nextScope.length > 0 ? nextScope : [surface],
    });
  }

  function handlePropertyPresetShareChange(
    preset: QuickPropertyPreset,
    key: (typeof SURFACE_SHARE_FIELDS)[number]['key'],
    value: string
  ) {
    handlePropertyPresetUpdate(preset.id, {
      surface_price_share: {
        ...getSurfacePriceShare(preset),
        [key]: numberOrZero(value),
      },
    });
  }

  function addPropertyPreset(propertyType: QuickPropertyPreset['property_type']) {
    nextPropertyPresetIdRef.current += 1;
    onChange({
      ...settings,
      property_presets: [
        ...propertyPresets,
        createPropertyPreset(
          `${generatedRoomIdPrefix}-property-${nextPropertyPresetIdRef.current}`,
          propertyPresets.length,
          propertyType
        ),
      ],
    });
  }

  function addRoomFromTemplate(label: string) {
    nextRoomIdRef.current += 1;
    const newRoom: QuickEstimateRoom = {
      id: `${generatedRoomIdPrefix}-room-${nextRoomIdRef.current}`,
      version: 1,
      label,
      enabled_surfaces: ['walls', 'ceiling', 'trim'],
      sizes: {
        small: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
        medium: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
        large: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
      },
      sort_order: settings.rooms.length,
    };
    onChange({ ...settings, rooms: [...settings.rooms, newRoom] });
  }

  function addCustomRoom() {
    const label = customLabel.trim();
    if (!label) return;
    addRoomFromTemplate(label);
    setCustomLabel('');
    setShowCustomInput(false);
  }

  return (
    <div className="space-y-8">
      {/* Coating multipliers */}
      <section className="border-outline rounded-2xl border bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="text-on-surface text-base font-semibold">Coating Type Multipliers</h3>
          <p className="text-on-surface-variant mt-0.5 text-sm">
            Applied to the room price based on number of coats. 2 coats is the baseline (100%, locked).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'one_coat_refresh_pct', label: '1 Coat Refresh', locked: false },
            { key: 'two_coats_repaint_pct', label: '2 Coats Repaint', locked: true },
            { key: 'three_coats_new_plaster_pct', label: '3 Coats New Plaster', locked: false },
          ].map(({ key, label, locked }) => (
            <div key={key}>
              <label className="text-on-surface-variant mb-1 block text-xs font-medium">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={locked}
                  value={settings.coating_multipliers[key as keyof typeof settings.coating_multipliers]}
                  onChange={(e) => !locked && handleMultiplierChange('coating_multipliers', key, e.target.value)}
                  className={`border-outline w-20 rounded-lg border px-3 py-2 text-right text-sm ${
                    locked ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed' : 'bg-white'
                  }`}
                />
                <span className="text-on-surface-variant text-sm">%</span>
                {locked && (
                  <span className="text-on-surface-variant ml-1 text-xs">🔒</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Condition multipliers */}
      <section className="border-outline rounded-2xl border bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="text-on-surface text-base font-semibold">Condition Multipliers</h3>
          <p className="text-on-surface-variant mt-0.5 text-sm">
            Applied to the room price based on surface condition. Average is baseline (100%, locked).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'good_pct', label: 'Good', locked: false },
            { key: 'average_pct', label: 'Average', locked: true },
            { key: 'poor_pct', label: 'Poor', locked: false },
          ].map(({ key, label, locked }) => (
            <div key={key}>
              <label className="text-on-surface-variant mb-1 block text-xs font-medium">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={locked}
                  value={settings.condition_multipliers[key as keyof typeof settings.condition_multipliers]}
                  onChange={(e) => !locked && handleMultiplierChange('condition_multipliers', key, e.target.value)}
                  className={`border-outline w-20 rounded-lg border px-3 py-2 text-right text-sm ${
                    locked ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed' : 'bg-white'
                  }`}
                />
                <span className="text-on-surface-variant text-sm">%</span>
                {locked && (
                  <span className="text-on-surface-variant ml-1 text-xs">🔒</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Whole-property presets */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-on-surface text-base font-semibold">
            Interior Whole Property Presets ({propertyPresets.length})
          </h3>
          <p className="text-on-surface-variant mt-1 text-sm">
            Interior-only apartment and house anchors for full-property quotes.
          </p>
        </div>

        <div className="border-outline-variant bg-surface-container-low rounded-xl border px-4 py-3">
          <p className="text-on-surface text-sm font-semibold">
            How this price is calculated
          </p>
          <p className="text-on-surface-variant mt-1 text-sm">
            Starts from the Detailed Estimate whole-property anchor, then adjusts
            by apartment type or house bed/bath setup, sqm, selected scope,
            condition, wall coating, and trim base. GST is added in the quote
            total.
          </p>
        </div>

        <div className="space-y-3">
          {propertyPresets.map((preset) => (
            <div
              key={preset.id}
              className="border-outline rounded-2xl border bg-white p-4"
            >
              {(() => {
                const surfaceShare = getSurfacePriceShare(preset);
                const surfaceShareTotal =
                  surfaceShare.walls_pct +
                  surfaceShare.ceiling_pct +
                  surfaceShare.trim_pct;

                return (
                  <>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_44px]">
                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-medium">
                    Preset name
                  </label>
                  <input
                    value={preset.label}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        label: event.target.value,
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`property-type-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Property type
                  </label>
                  <select
                    id={`property-type-${preset.id}`}
                    aria-label={`Property type for ${preset.label}`}
                    value={preset.property_type}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        property_type: event.target
                          .value as QuickPropertyPreset['property_type'],
                        apartment_type:
                          event.target.value === 'apartment'
                            ? (preset.apartment_type ?? '2_bedroom_standard')
                            : null,
                        storeys:
                          event.target.value === 'house'
                            ? (preset.storeys ?? '1_storey')
                            : null,
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  >
                    {(['apartment', 'house'] as const).map((propertyType) => (
                      <option key={propertyType} value={propertyType}>
                        {PROPERTY_TYPE_LABELS[propertyType]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handlePropertyPresetDelete(preset.id)}
                  className="text-on-surface-variant hover:text-red-500 flex min-h-[44px] min-w-[44px] items-center justify-center self-end"
                  aria-label={`Delete ${preset.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {preset.property_type === 'apartment' && (
                  <div>
                    <label
                      htmlFor={`apartment-type-${preset.id}`}
                      className="text-on-surface-variant mb-1 block text-xs font-medium"
                    >
                      Apartment type
                    </label>
                    <select
                      id={`apartment-type-${preset.id}`}
                      value={preset.apartment_type ?? '2_bedroom_standard'}
                      onChange={(event) =>
                        handlePropertyPresetUpdate(preset.id, {
                          apartment_type: event.target
                            .value as QuickPropertyPreset['apartment_type'],
                        })
                      }
                      className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                    >
                      {Object.entries(APARTMENT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}
                <div>
                  <label
                    htmlFor={`bedrooms-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Bedrooms
                  </label>
                  <input
                    id={`bedrooms-${preset.id}`}
                    aria-label={`Bedrooms for ${preset.label}`}
                    type="number"
                    min="0"
                    step="1"
                    value={preset.bedrooms ?? ''}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        bedrooms: numberOrNull(event.target.value),
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`bathrooms-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Bathrooms
                  </label>
                  <input
                    id={`bathrooms-${preset.id}`}
                    aria-label={`Bathrooms for ${preset.label}`}
                    type="number"
                    min="0"
                    step="1"
                    value={preset.bathrooms ?? ''}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        bathrooms: numberOrNull(event.target.value),
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`sqm-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Sqm
                  </label>
                  <input
                    id={`sqm-${preset.id}`}
                    aria-label={`Sqm for ${preset.label}`}
                    type="number"
                    min="1"
                    step="1"
                    value={preset.sqm ?? ''}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        sqm: numberOrNull(event.target.value),
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  />
                </div>
                {preset.property_type === 'house' && (
                  <div>
                    <label
                      htmlFor={`storeys-${preset.id}`}
                      className="text-on-surface-variant mb-1 block text-xs font-medium"
                    >
                      Storeys
                    </label>
                    <select
                      id={`storeys-${preset.id}`}
                      aria-label={`Storeys for ${preset.label}`}
                      value={preset.storeys ?? '1_storey'}
                      onChange={(event) =>
                        handlePropertyPresetUpdate(preset.id, {
                          storeys: event.target
                            .value as QuickPropertyPreset['storeys'],
                        })
                      }
                      className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                    >
                      {Object.entries(STOREY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor={`condition-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Condition
                  </label>
                  <select
                    id={`condition-${preset.id}`}
                    value={preset.condition}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        condition: event.target
                          .value as QuickPropertyPreset['condition'],
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  >
                    {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`wall-paint-system-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Wall coating
                  </label>
                  <select
                    id={`wall-paint-system-${preset.id}`}
                    value={preset.wall_paint_system}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        wall_paint_system: event.target
                          .value as QuickPropertyPreset['wall_paint_system'],
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  >
                    {Object.entries(WALL_PAINT_SYSTEM_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`trim-paint-system-${preset.id}`}
                    className="text-on-surface-variant mb-1 block text-xs font-medium"
                  >
                    Trim base
                  </label>
                  <select
                    id={`trim-paint-system-${preset.id}`}
                    value={preset.trim_paint_system ?? 'oil_2coat'}
                    onChange={(event) =>
                      handlePropertyPresetUpdate(preset.id, {
                        trim_paint_system: event.target
                          .value as QuickPropertyPreset['trim_paint_system'],
                      })
                    }
                    className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                  >
                    {Object.entries(TRIM_PAINT_SYSTEM_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(['walls', 'ceiling', 'trim'] as const).map((surface) => (
                  <button
                    key={surface}
                    type="button"
                    onClick={() =>
                      handlePropertyPresetScopeToggle(preset, surface)
                    }
                    className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors ${
                      preset.scope.includes(surface)
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-outline text-on-surface-variant'
                    }`}
                  >
                    {SURFACE_LABELS[surface]}
                  </button>
                ))}
              </div>
              <div className="border-outline-variant bg-surface-container-low mt-4 rounded-xl border p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-on-surface text-sm font-semibold">
                    Surface price split
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      surfaceShareTotal === 100
                        ? 'text-primary'
                        : 'text-error'
                    }`}
                  >
                    Surface price split: {surfaceShareTotal}% total
                  </p>
                </div>
                <p className="text-on-surface-variant mt-1 text-xs">
                  Controls how the whole-property anchor is split when only
                  walls, ceiling, or trim are selected.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {SURFACE_SHARE_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={`surface-share-${field.key}-${preset.id}`}
                        className="text-on-surface-variant mb-1 block text-xs font-medium"
                      >
                        {field.label} %
                      </label>
                      <input
                        id={`surface-share-${field.key}-${preset.id}`}
                        aria-label={`${field.ariaLabel} price share for ${preset.label}`}
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={surfaceShare[field.key]}
                        onChange={(event) =>
                          handlePropertyPresetShareChange(
                            preset,
                            field.key,
                            event.target.value
                          )
                        }
                        className="border-outline h-11 w-full rounded-xl border bg-white px-3 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addPropertyPreset('apartment')}
            className="border-primary text-primary hover:bg-primary/15 min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors"
          >
            + Apartment preset
          </button>
          <button
            type="button"
            onClick={() => addPropertyPreset('house')}
            className="border-primary text-primary hover:bg-primary/15 min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors"
          >
            + House preset
          </button>
        </div>
      </section>

      {/* Room list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-on-surface text-base font-semibold">
            Room Price Library ({settings.rooms.length})
          </h3>
          <p className="text-on-surface-variant mt-1 text-sm">
            Used by Quick Estimate, Advanced room presets, and future AI draft pricing.
          </p>
        </div>

        {settings.rooms.length === 0 && (
          <p className="text-on-surface-variant rounded-xl border border-dashed p-4 text-sm text-center">
            No rooms yet. Add from templates below.
          </p>
        )}

        <div className="space-y-2">
          {settings.rooms.map((room, i) => (
            <RoomCard
              key={room.id}
              room={room}
              onUpdate={(updated) => handleRoomUpdate(i, updated)}
              onDelete={() => handleRoomDelete(i)}
            />
          ))}
        </div>
      </section>

      {/* Add room templates */}
      <section className="border-outline rounded-2xl border bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-1">
          <h3 className="text-on-surface text-base font-semibold">Add Room</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROOM_TEMPLATES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => addRoomFromTemplate(label)}
              className="border-outline text-on-surface hover:border-primary hover:bg-primary/5 min-h-[36px] rounded-full border bg-white px-3 py-1 text-xs font-medium transition-colors"
            >
              + {label}
            </button>
          ))}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="border-primary text-primary hover:bg-primary/15 min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            >
              + Custom…
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomRoom()}
                placeholder="Room name"
                autoFocus
                className="border-outline rounded-lg border bg-white px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addCustomRoom}
                className="bg-primary min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomLabel(''); }}
                className="text-on-surface-variant text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
