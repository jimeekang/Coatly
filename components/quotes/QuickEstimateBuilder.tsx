'use client';

import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import Link from 'next/link';
import type { UserRateSettings, QuickEstimateRoom } from '@/lib/rate-settings';
import type { QuickInputs, SelectedQuickRoom } from '@/types/quote';
import { formatAUD } from '@/utils/format';

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
  { key: 'three_coats_new_plaster' as const, label: '3 Coats', sublabel: 'New plaster' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCoatingPct(
  coating: QuickInputs['global_coating'],
  rateSettings: UserRateSettings | null
): number {
  const m = rateSettings?.quick_estimate?.coating_multipliers;
  if (!m) return coating === 'one_coat_refresh' ? 70 : coating === 'three_coats_new_plaster' ? 140 : 100;
  if (coating === 'one_coat_refresh') return m.one_coat_refresh_pct;
  if (coating === 'three_coats_new_plaster') return m.three_coats_new_plaster_pct;
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
  const base =
    (room.selected_surfaces.includes('walls') ? room.walls_cents : 0) +
    (room.selected_surfaces.includes('ceiling') ? room.ceiling_cents : 0) +
    (room.selected_surfaces.includes('trim') ? room.trim_cents : 0);
  return Math.round(base * (coatingPct / 100) * (conditionPct / 100));
}

function makeRoomFromTemplate(
  template: QuickEstimateRoom,
  size: 'small' | 'medium' | 'large',
  index: number
): SelectedQuickRoom {
  const sizeRates = template.sizes[size];
  return {
    room_id: template.id,
    label: template.label,
    size,
    selected_surfaces: [...template.enabled_surfaces],
    walls_cents: sizeRates.walls_cents,
    ceiling_cents: sizeRates.ceiling_cents,
    trim_cents: sizeRates.trim_cents,
    coating_multiplier_pct: 100,
    condition_multiplier_pct: 100,
    total_cents: sizeRates.walls_cents + sizeRates.ceiling_cents + sizeRates.trim_cents,
  };
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
    const sizeRates = template?.sizes[size] ?? { walls_cents: room.walls_cents, ceiling_cents: room.ceiling_cents, trim_cents: room.trim_cents };
    onUpdate({
      ...room,
      size,
      walls_cents: sizeRates.walls_cents,
      ceiling_cents: sizeRates.ceiling_cents,
      trim_cents: sizeRates.trim_cents,
    });
  }

  function handleSurfaceToggle(surface: 'walls' | 'ceiling' | 'trim') {
    const selected = room.selected_surfaces.includes(surface)
      ? room.selected_surfaces.filter((s) => s !== surface)
      : [...room.selected_surfaces, surface];
    onUpdate({ ...room, selected_surfaces: selected });
  }

  const availableSurfaces = template?.enabled_surfaces ?? (['walls', 'ceiling', 'trim'] as const);

  return (
    <div className={`rounded-xl border bg-white ${allUnchecked ? 'border-amber-300' : 'border-pm-border'}`}>
      {/* Header row */}
      <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-pm-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-pm-secondary" />
          )}
          <span className="text-sm font-semibold text-pm-body flex-1">{room.label}</span>
        </button>

        {/* Size chips */}
        <div className="flex gap-1">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSizeChange(s)}
              className={`min-h-[32px] min-w-[32px] rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                room.size === s
                  ? 'border-pm-teal bg-pm-teal text-white'
                  : 'border-pm-border text-pm-secondary hover:border-pm-teal'
              }`}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Price */}
        <span className={`min-w-[64px] text-right text-sm font-bold ${allUnchecked ? 'text-amber-500' : 'text-pm-body'}`}>
          {formatAUD(total)}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-pm-secondary hover:text-red-500"
          aria-label="Remove room"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-pm-border px-4 pb-3 pt-3 space-y-3">
          {/* Surface toggles */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-pm-secondary">Surfaces:</span>
            {(['walls', 'ceiling', 'trim'] as const).map((s) => {
              const isAvailable = availableSurfaces.includes(s);
              if (!isAvailable) return null;
              const isSelected = room.selected_surfaces.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSurfaceToggle(s)}
                  className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-pm-teal bg-pm-teal-pale/20 text-pm-teal'
                      : 'border-pm-border text-pm-secondary hover:border-pm-teal'
                  }`}
                >
                  {SURFACE_LABELS[s]}
                </button>
              );
            })}
            {allUnchecked && (
              <span className="text-xs text-amber-600">Select at least one surface</span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-pm-secondary">
              Notes (optional)
            </label>
            <input
              type="text"
              value={room.notes ?? ''}
              onChange={(e) => onUpdate({ ...room, notes: e.target.value || undefined })}
              placeholder="e.g. skip wardrobe wall"
              className="w-full rounded-lg border border-pm-border bg-white px-3 py-2 text-sm focus:border-pm-teal-mid focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuickEstimateBuilder({ rateSettings, value, onChange }: QuickEstimateBuilderProps) {
  const quickSettings = rateSettings?.quick_estimate;
  const templateRooms = quickSettings?.rooms ?? [];
  const isNotConfigured = templateRooms.length === 0;

  const coatingPct = getCoatingPct(value.global_coating, rateSettings);
  const conditionPct = getConditionPct(value.global_condition, rateSettings);

  const subtotal = value.rooms.reduce(
    (sum, r) => sum + calcRoomTotal(r, coatingPct, conditionPct),
    0
  );
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  function handleRoomUpdate(index: number, updated: SelectedQuickRoom) {
    const rooms = [...value.rooms];
    rooms[index] = updated;
    onChange({ ...value, rooms });
  }

  function handleRoomDelete(index: number) {
    onChange({ ...value, rooms: value.rooms.filter((_, i) => i !== index) });
  }

  function addRoom(template: QuickEstimateRoom) {
    const newRoom = makeRoomFromTemplate(template, 'medium', value.rooms.length);
    onChange({ ...value, rooms: [...value.rooms, newRoom] });
  }

  return (
    <div className="space-y-5">
      {/* Not configured banner */}
      {isNotConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Settings className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-800">
            <span className="font-semibold">Room prices not set up. </span>
            <Link href="/price-rates" className="underline font-medium">
              Go to Price Rates
            </Link>{' '}
            to add rooms and set prices.
          </div>
        </div>
      )}

      {/* Coating type */}
      <section className="border-pm-border rounded-2xl border bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-pm-body">Coating Type</h4>
        <div className="grid grid-cols-3 gap-2">
          {COATING_OPTIONS.map(({ key, label, sublabel }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...value, global_coating: key })}
              className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors ${
                value.global_coating === key
                  ? 'border-pm-teal bg-pm-teal-pale/20 text-pm-teal'
                  : 'border-pm-border text-pm-body hover:border-pm-teal-mid'
              }`}
            >
              <span className="text-sm font-bold">{label}</span>
              <span className="text-xs text-pm-secondary mt-0.5">{sublabel}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Room list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-pm-body">
            Rooms{value.rooms.length > 0 && ` (${value.rooms.length})`}
          </h4>
        </div>

        {value.rooms.length === 0 && (
          <p className="rounded-xl border border-dashed border-pm-border px-4 py-5 text-center text-sm text-pm-secondary">
            No rooms added yet. Pick from the list below.
          </p>
        )}

        <div className="space-y-2">
          {value.rooms.map((room, i) => {
            const template = templateRooms.find((t) => t.id === room.room_id);
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
        <section className="border-pm-border rounded-2xl border bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-pm-body">
            <Plus className="inline h-4 w-4 mr-1" />
            Add Room
          </h4>
          <div className="flex flex-wrap gap-2">
            {templateRooms.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => addRoom(template)}
                className="border-pm-border text-pm-body hover:border-pm-teal hover:bg-pm-teal-pale/10 min-h-[36px] rounded-full border bg-white px-3 py-1 text-xs font-medium transition-colors"
              >
                + {template.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Condition */}
      <section className="border-pm-border rounded-2xl border bg-white p-4">
        <h4 className="mb-1 text-sm font-semibold text-pm-body">Surface Condition</h4>
        <p className="mb-3 text-xs text-pm-secondary">
          How much prep work is needed?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CONDITION_OPTIONS.map(({ key, label, sublabel }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...value, global_condition: key })}
              className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors ${
                value.global_condition === key
                  ? 'border-pm-teal bg-pm-teal-pale/20 text-pm-teal'
                  : 'border-pm-border text-pm-body hover:border-pm-teal-mid'
              }`}
            >
              <span className="text-sm font-bold">{label}</span>
              <span className="text-xs text-pm-secondary mt-0.5">{sublabel}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Summary */}
      {value.rooms.length > 0 && (
        <div className="border-pm-border rounded-2xl border bg-white p-4 space-y-2">
          <div className="flex justify-between text-sm text-pm-secondary">
            <span>Subtotal (ex-GST)</span>
            <span className="font-medium text-pm-body">{formatAUD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-pm-secondary">
            <span>GST (10%)</span>
            <span className="font-medium text-pm-body">{formatAUD(gst)}</span>
          </div>
          <div className="flex justify-between border-t border-pm-border pt-2 text-base font-bold text-pm-body">
            <span>Total inc-GST</span>
            <span className="text-pm-teal">{formatAUD(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
