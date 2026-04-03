'use client';

import { useMemo } from 'react';
import {
  type InteriorRoomType,
  type InteriorWallPaintSystem,
  INTERIOR_PAINT_SYSTEM_LABELS,
  INTERIOR_WALL_PAINT_SYSTEM_LABELS,
  INTERIOR_WALL_PAINT_SYSTEMS,
  calculateInteriorEstimate,
} from '@/lib/interior-estimates';
import {
  type QuickQuoteInput,
  type QuickRoom,
  type QuickRoomCondition,
  type QuickRoomSize,
  type QuickWindowType,
  type QuickDoorScope,
  type QuickWindowScope,
  QUICK_SKIRTING_LM,
  mapQuickQuoteToInteriorEstimate,
  applyRoomSizeMultipliers,
  recalculateTotals,
} from '@/lib/quick-quote-mapper';
import {
  type UserRateSettings,
  DOOR_SCOPES,
  WINDOW_TYPES,
  type DoorScope,
  type WindowType,
} from '@/lib/rate-settings';
import { formatAUD } from '@/utils/format';

// ─── Room type presets ────────────────────────────────────────────────────────

type RoomPreset = {
  anchor: InteriorRoomType;
  label: string;
  emoji: string;
  defaultCeiling: boolean;
  defaultDoors: number;
  defaultWindows: number;
};

const ROOM_PRESETS: RoomPreset[] = [
  { anchor: 'Master Bedroom',  label: 'Master Bed',   emoji: '🛏️', defaultCeiling: true,  defaultDoors: 1, defaultWindows: 1 },
  { anchor: 'Bedroom 1',       label: 'Bedroom',      emoji: '🛏️', defaultCeiling: true,  defaultDoors: 1, defaultWindows: 1 },
  { anchor: 'Living Room',     label: 'Living Room',  emoji: '🛋️', defaultCeiling: true,  defaultDoors: 1, defaultWindows: 2 },
  { anchor: 'Dining',          label: 'Dining',       emoji: '🍽️', defaultCeiling: true,  defaultDoors: 0, defaultWindows: 1 },
  { anchor: 'Kitchen',         label: 'Kitchen',      emoji: '🍳', defaultCeiling: false, defaultDoors: 0, defaultWindows: 1 },
  { anchor: 'Bathroom',        label: 'Bathroom',     emoji: '🚿', defaultCeiling: false, defaultDoors: 1, defaultWindows: 0 },
  { anchor: 'Laundry',         label: 'Laundry',      emoji: '🫧', defaultCeiling: false, defaultDoors: 1, defaultWindows: 0 },
  { anchor: 'Hallway',         label: 'Hallway',      emoji: '🚪', defaultCeiling: true,  defaultDoors: 0, defaultWindows: 0 },
  { anchor: 'Study / Office',  label: 'Study',        emoji: '💼', defaultCeiling: true,  defaultDoors: 1, defaultWindows: 1 },
  { anchor: 'Stairwell',       label: 'Stairwell',    emoji: '🪜', defaultCeiling: true,  defaultDoors: 0, defaultWindows: 0 },
  { anchor: 'Other',           label: 'Other',        emoji: '🏠', defaultCeiling: true,  defaultDoors: 1, defaultWindows: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoom(preset: RoomPreset, index: number, existingCount: number): QuickRoom {
  const label = existingCount > 0 ? `${preset.label} ${existingCount + 1}` : preset.label;
  const hasTrim = preset.defaultDoors > 0 || preset.defaultWindows > 0;
  return {
    name: index === 0 ? preset.label : label,
    anchor_room_type: preset.anchor,
    size: 'medium',
    condition: 'normal',
    include_walls: true,
    include_ceiling: preset.defaultCeiling,
    include_trim: hasTrim,
    trim_paint_system: 'oil_2coat',
    door_count: preset.defaultDoors,
    door_scope: 'door_and_frame',
    window_count: preset.defaultWindows,
    window_type: 'normal',
    window_scope: 'window_and_frame',
    include_skirting: hasTrim,
    skirting_lm_override: null,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  labels,
  size = 'md',
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<T, string>;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'flex-1 rounded-xl border font-medium transition-colors',
            size === 'sm' ? 'h-9 text-xs' : 'h-11 text-sm',
            value === opt
              ? 'border-pm-teal bg-pm-teal text-white'
              : 'border-pm-border bg-white text-pm-body hover:border-pm-teal-mid hover:bg-pm-teal-pale/20',
          ].join(' ')}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function Counter({
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-pm-border bg-white text-lg font-bold text-pm-body disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold text-pm-body">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-pm-border bg-white text-lg font-bold text-pm-body disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'flex h-11 items-center gap-3 rounded-xl border px-4 text-sm font-medium transition-colors',
        checked
          ? 'border-pm-teal bg-pm-teal-light text-pm-teal'
          : 'border-pm-border bg-white text-pm-secondary',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 items-center justify-center rounded border-2 text-xs transition-colors',
          checked ? 'border-pm-teal bg-pm-teal text-white' : 'border-pm-border bg-white',
        ].join(' ')}
      >
        {checked ? '✓' : ''}
      </span>
      {label}
    </button>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  onChange,
  onRemove,
  estimatedPrice,
  rateSettings,
}: {
  room: QuickRoom;
  onChange: (updated: QuickRoom) => void;
  onRemove: () => void;
  estimatedPrice: number;
  rateSettings?: UserRateSettings | null;
}) {
  const set = <K extends keyof QuickRoom>(key: K, value: QuickRoom[K]) =>
    onChange({ ...room, [key]: value });

  const SIZE_LABELS: Record<QuickRoomSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
  const CONDITION_LABELS: Record<QuickRoomCondition, string> = { good: 'Good', normal: 'Normal', poor: 'Poor' };
  const PAINT_SYSTEM_LABELS = INTERIOR_PAINT_SYSTEM_LABELS;
  const DOOR_SCOPE_LABELS: Record<QuickDoorScope, string> = {
    door_and_frame: 'Door & Frame',
    door_only: 'Door only',
    frame_only: 'Frame only',
  };
  const WINDOW_TYPE_LABELS: Record<QuickWindowType, string> = {
    normal: 'Standard',
    awning: 'Awning',
    double_hung: 'Dbl Hung',
    french: 'French',
  };
  const WINDOW_SCOPE_LABELS: Record<QuickWindowScope, string> = {
    window_and_frame: 'Win & Frame',
    window_only: 'Win only',
    frame_only: 'Frame only',
  };

  // Filter available door scopes / window types based on rate settings
  const availableDoorScopes = (
    rateSettings?.enabled_door_scopes?.length
      ? (DOOR_SCOPES.filter((s) => rateSettings.enabled_door_scopes.includes(s as DoorScope)) as QuickDoorScope[])
      : [...DOOR_SCOPES] as QuickDoorScope[]
  );
  const availableWindowTypes = (
    rateSettings?.enabled_window_types?.length
      ? (WINDOW_TYPES.filter((t) => rateSettings.enabled_window_types.includes(t as WindowType)) as QuickWindowType[])
      : [...WINDOW_TYPES] as QuickWindowType[]
  );
  // If current room value is not in the available list, use the first available
  const activeDoorScope: QuickDoorScope =
    availableDoorScopes.includes(room.door_scope) ? room.door_scope : availableDoorScopes[0];
  const activeWindowType: QuickWindowType =
    availableWindowTypes.includes(room.window_type) ? room.window_type : availableWindowTypes[0];

  return (
    <div className="rounded-2xl border border-pm-border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-pm-border px-4 py-3">
        <input
          type="text"
          value={room.name}
          onChange={(e) => set('name', e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-pm-body outline-none placeholder:text-pm-secondary"
          placeholder="Room name"
          maxLength={40}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-pm-teal">{formatAUD(estimatedPrice)}</span>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-pm-secondary hover:bg-red-50 hover:text-red-500"
            aria-label="Remove room"
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Size */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
            Size
          </p>
          <ToggleGroup
            options={['small', 'medium', 'large'] as const}
            value={room.size}
            onChange={(v) => set('size', v)}
            labels={SIZE_LABELS}
          />
        </div>

        {/* Condition */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
            Condition
          </p>
          <ToggleGroup
            options={['good', 'normal', 'poor'] as const}
            value={room.condition}
            onChange={(v) => set('condition', v)}
            labels={CONDITION_LABELS}
          />
        </div>

        {/* Scope — Walls / Ceiling / Trim */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
            Scope
          </p>
          <div className="flex flex-wrap gap-2">
            <Toggle
              checked={room.include_walls}
              onChange={(v) => set('include_walls', v)}
              label="Walls"
            />
            <Toggle
              checked={room.include_ceiling}
              onChange={(v) => set('include_ceiling', v)}
              label="Ceiling"
            />
            <Toggle
              checked={room.include_trim}
              onChange={(v) => set('include_trim', v)}
              label="Trim"
            />
          </div>
        </div>

        {/* Trim options — only shown when include_trim is checked */}
        {room.include_trim && (
          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-bg p-3">
            {/* Paint base for trim */}
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
                Paint Base (Trim)
              </p>
              <ToggleGroup
                options={(['oil_2coat', 'water_3coat_white_finish'] as const)}
                value={room.trim_paint_system}
                onChange={(v) => set('trim_paint_system', v)}
                labels={PAINT_SYSTEM_LABELS}
                size="sm"
              />
            </div>

            {/* Skirting */}
            <Toggle
              checked={room.include_skirting}
              onChange={(v) => set('include_skirting', v)}
              label={`Skirting (~${QUICK_SKIRTING_LM[room.size]}lm)`}
            />

            {/* Doors */}
            <div className="rounded-xl border border-pm-border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-pm-body">Doors</p>
                <Counter
                  value={room.door_count}
                  onChange={(v) => set('door_count', v)}
                />
              </div>
              {room.door_count > 0 && availableDoorScopes.length > 0 && (
                <ToggleGroup
                  options={availableDoorScopes}
                  value={activeDoorScope}
                  onChange={(v) => set('door_scope', v)}
                  labels={DOOR_SCOPE_LABELS}
                  size="sm"
                />
              )}
            </div>

            {/* Windows */}
            <div className="rounded-xl border border-pm-border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-pm-body">Windows</p>
                <Counter
                  value={room.window_count}
                  onChange={(v) => set('window_count', v)}
                />
              </div>
              {room.window_count > 0 && availableWindowTypes.length > 0 && (
                <div className="space-y-2">
                  <ToggleGroup
                    options={availableWindowTypes}
                    value={activeWindowType}
                    onChange={(v) => set('window_type', v)}
                    labels={WINDOW_TYPE_LABELS}
                    size="sm"
                  />
                  <ToggleGroup
                    options={['window_and_frame', 'window_only', 'frame_only'] as const}
                    value={room.window_scope}
                    onChange={(v) => set('window_scope', v)}
                    labels={WINDOW_SCOPE_LABELS}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type QuickQuoteBuilderState = {
  wall_paint_system: InteriorWallPaintSystem;
  rooms: QuickRoom[];
  manual_adjustment_cents: number;
};

export function createEmptyQuickQuoteState(): QuickQuoteBuilderState {
  return {
    wall_paint_system: 'standard_2coat',
    rooms: [],
    manual_adjustment_cents: 0,
  };
}

export type QuickQuotePreview = {
  subtotal_cents: number;
  gst_cents: number;
  adjustment_cents: number;
  total_cents: number;
  per_room_cents: number[];
};

export function calculateQuickQuotePreview(
  state: QuickQuoteBuilderState,
  rateSettings?: UserRateSettings | null
): QuickQuotePreview {
  if (state.rooms.length === 0) {
    return { subtotal_cents: 0, gst_cents: 0, adjustment_cents: state.manual_adjustment_cents, total_cents: 0, per_room_cents: [] };
  }

  const mapped = mapQuickQuoteToInteriorEstimate({ wall_paint_system: state.wall_paint_system, rooms: state.rooms });
  const raw = calculateInteriorEstimate(mapped, rateSettings);
  const adjusted = applyRoomSizeMultipliers(raw.pricing_items, mapped._size_multipliers);
  const totals = recalculateTotals(adjusted, state.manual_adjustment_cents);

  // Per-room estimated cost for display in RoomCard header
  const perRoomCents = state.rooms.map((_, idx) => {
    const roomItems = adjusted.filter(
      (item) => item.category === 'room_anchor' && item.room_index === idx
    );
    const trimItems = adjusted.filter(
      (item) => item.category !== 'room_anchor' && (item as { room_index?: number | null }).room_index === idx
    );
    return [...roomItems, ...trimItems].reduce((s, i) => s + i.total_cents, 0);
  });

  return {
    ...totals,
    adjustment_cents: state.manual_adjustment_cents,
    per_room_cents: perRoomCents,
  };
}

export function QuickQuoteBuilder({
  value,
  onChange,
  rateSettings,
}: {
  value: QuickQuoteBuilderState;
  onChange: (next: QuickQuoteBuilderState) => void;
  rateSettings?: UserRateSettings | null;
}) {
  const preview = useMemo(() => calculateQuickQuotePreview(value, rateSettings), [value, rateSettings]);

  function setField<K extends keyof QuickQuoteBuilderState>(
    key: K,
    val: QuickQuoteBuilderState[K]
  ) {
    onChange({ ...value, [key]: val });
  }

  function addRoom(preset: RoomPreset) {
    const existingCount = value.rooms.filter(
      (r) => r.anchor_room_type === preset.anchor
    ).length;
    const newRoom = makeRoom(preset, value.rooms.length, existingCount);
    onChange({ ...value, rooms: [...value.rooms, newRoom] });
  }

  function updateRoom(index: number, updated: QuickRoom) {
    const rooms = [...value.rooms];
    rooms[index] = updated;
    onChange({ ...value, rooms });
  }

  function removeRoom(index: number) {
    onChange({ ...value, rooms: value.rooms.filter((_, i) => i !== index) });
  }

  // Adjustment helpers — steps of $50
  const STEP = 5000; // 50 AUD in cents
  function adjustBy(delta: number) {
    const next = value.manual_adjustment_cents + delta;
    const clamped = Math.max(-1_000_000, Math.min(1_000_000, next));
    setField('manual_adjustment_cents', clamped);
  }

  return (
    <div className="space-y-4">
      {/* Wall / Ceiling Paint System — global for the whole job */}
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Paint System
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {INTERIOR_WALL_PAINT_SYSTEMS.map((sys) => (
            <button
              key={sys}
              type="button"
              onClick={() => setField('wall_paint_system', sys)}
              className={[
                'flex flex-col rounded-xl border p-3 text-left transition-colors',
                value.wall_paint_system === sys
                  ? 'border-pm-teal bg-pm-teal-light'
                  : 'border-pm-border bg-white hover:border-pm-teal-mid',
              ].join(' ')}
            >
              <span
                className={[
                  'text-sm font-semibold',
                  value.wall_paint_system === sys ? 'text-pm-teal' : 'text-pm-body',
                ].join(' ')}
              >
                {INTERIOR_WALL_PAINT_SYSTEM_LABELS[sys]}
              </span>
              <span className="mt-0.5 text-xs text-pm-secondary">
                {sys === 'standard_2coat' ? 'Walls & Ceiling · Most common' : 'New Plaster · Extra coat'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Room cards */}
      {value.rooms.map((room, index) => (
        <RoomCard
          key={index}
          room={room}
          onChange={(updated) => updateRoom(index, updated)}
          onRemove={() => removeRoom(index)}
          estimatedPrice={preview.per_room_cents[index] ?? 0}
          rateSettings={rateSettings}
        />
      ))}

      {/* Add room grid */}
      <section className="rounded-2xl border border-dashed border-pm-border bg-pm-bg p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Add Room
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {ROOM_PRESETS.map((preset) => (
            <button
              key={preset.anchor}
              type="button"
              onClick={() => addRoom(preset)}
              className="flex flex-col items-center gap-1 rounded-xl border border-pm-border bg-white px-2 py-3 text-center transition-colors hover:border-pm-teal-mid hover:bg-pm-teal-pale/10 active:scale-95"
            >
              <span className="text-xl leading-none" role="img" aria-hidden>
                {preset.emoji}
              </span>
              <span className="text-xs font-medium text-pm-body leading-tight">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Price summary + adjustment */}
      {value.rooms.length > 0 && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Estimate Totals
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-pm-secondary">Subtotal</dt>
              <dd className="font-medium text-pm-body">{formatAUD(preview.subtotal_cents)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-pm-secondary">GST (10%)</dt>
              <dd className="font-medium text-pm-body">{formatAUD(preview.gst_cents)}</dd>
            </div>

            {/* Adjustment row */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-pm-border p-3">
              <dt className="text-sm font-medium text-pm-body">Adjustment</dt>
              <dd className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustBy(-STEP)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-pm-border bg-white text-base font-bold text-pm-body hover:border-pm-coral hover:bg-red-50 hover:text-pm-coral"
                  aria-label="Decrease by $50"
                >
                  −
                </button>
                <span
                  className={[
                    'w-20 text-center text-sm font-semibold',
                    value.manual_adjustment_cents < 0 ? 'text-pm-coral' : value.manual_adjustment_cents > 0 ? 'text-pm-teal' : 'text-pm-secondary',
                  ].join(' ')}
                >
                  {value.manual_adjustment_cents === 0
                    ? '$0'
                    : formatAUD(value.manual_adjustment_cents)}
                </span>
                <button
                  type="button"
                  onClick={() => adjustBy(STEP)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-pm-border bg-white text-base font-bold text-pm-body hover:border-pm-teal-mid hover:bg-pm-teal-pale/20 hover:text-pm-teal"
                  aria-label="Increase by $50"
                >
                  +
                </button>
              </dd>
            </div>

            <div className="flex items-center justify-between border-t border-pm-border pt-3">
              <dt className="font-semibold text-pm-body">Total (inc. GST)</dt>
              <dd className="text-base font-bold text-pm-body">
                {formatAUD(preview.total_cents)}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}

// Re-export QuickQuoteInput for convenience
export type { QuickQuoteInput };
