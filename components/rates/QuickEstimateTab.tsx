'use client';

import { useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { QuickEstimateSettings, QuickEstimateRoom } from '@/lib/rate-settings';

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

  function handleSurfaceCentsChange(
    size: 'small' | 'medium' | 'large',
    surface: 'walls' | 'ceiling' | 'trim',
    value: string
  ) {
    const cents = displayToCents(value);
    if (cents === null) return;
    onUpdate({
      ...room,
      sizes: {
        ...room.sizes,
        [size]: { ...room.sizes[size], [`${surface}_cents`]: cents },
      },
    });
  }

  function handleSurfaceToggle(surface: 'walls' | 'ceiling' | 'trim') {
    const enabled = room.enabled_surfaces.includes(surface)
      ? room.enabled_surfaces.filter((s) => s !== surface)
      : [...room.enabled_surfaces, surface];
    onUpdate({ ...room, enabled_surfaces: enabled });
  }

  return (
    <div className="border-outline rounded-2xl border bg-white">
      <div className="flex min-h-[44px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-on-surface flex items-center gap-2 text-sm font-medium"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {room.label}
          </button>
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
                  {room.enabled_surfaces.map((s) => (
                    <th key={s} className="pb-2 text-right font-semibold">
                      {SURFACE_LABELS[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-outline divide-y">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <tr key={size}>
                    <td className="py-2 text-sm font-medium">{SIZE_LABELS[size]}</td>
                    {room.enabled_surfaces.map((s) => (
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
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
  const nextRoomIdRef = useRef(settings.rooms.length);

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
    rooms[index] = updated;
    onChange({ ...settings, rooms });
  }

  function handleRoomDelete(index: number) {
    const rooms = settings.rooms.filter((_, i) => i !== index);
    onChange({ ...settings, rooms });
  }

  function addRoomFromTemplate(label: string) {
    nextRoomIdRef.current += 1;
    const newRoom: QuickEstimateRoom = {
      id: `${generatedRoomIdPrefix}-room-${nextRoomIdRef.current}`,
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

      {/* Room list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-on-surface text-base font-semibold">
            Rooms ({settings.rooms.length})
          </h3>
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
