'use client';

import { useState } from 'react';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import { NumericInput, sanitizeDecimalInput } from '@/components/shared/NumericInput';
import {
  EXTERIOR_COATING_LABELS,
  EXTERIOR_COATING_TYPES,
  EXTERIOR_SURFACE_LABELS,
  EXTERIOR_SURFACES,
  type ExteriorCoatingType,
  type ExteriorRateSettings,
  type ExteriorSurface,
  type UserRateSettings,
} from '@/lib/rate-settings';
import { EXTERIOR_UNIT_LABELS, calculateExteriorEstimate } from '@/lib/exterior-estimates';
import { formatAUD } from '@/utils/format';

export type ExteriorEstimateFormState = {
  coating: ExteriorCoatingType;
  surfaces: Partial<Record<ExteriorSurface, string>>;
  customLabels: Partial<Record<ExteriorSurface, string>>;
  hiddenSurfaces: ExteriorSurface[];
};

export function createEmptyExteriorEstimateState(): ExteriorEstimateFormState {
  return {
    coating: 'repaint_2coat',
    surfaces: {},
    customLabels: {},
    hiddenSurfaces: [],
  };
}

export function buildExteriorEstimatePayload(state: ExteriorEstimateFormState) {
  const surfaces: Partial<Record<ExteriorSurface, number>> = {};
  for (const surface of EXTERIOR_SURFACES) {
    if (state.hiddenSurfaces.includes(surface)) continue;
    const raw = state.surfaces[surface];
    const qty = raw ? parseFloat(raw) : NaN;
    if (Number.isFinite(qty) && qty > 0) surfaces[surface] = qty;
  }
  const custom_labels: Partial<Record<ExteriorSurface, string>> = {};
  for (const surface of EXTERIOR_SURFACES) {
    const label = state.customLabels[surface];
    if (label && label.trim()) custom_labels[surface] = label.trim();
  }
  return {
    coating: state.coating,
    surfaces,
    ...(Object.keys(custom_labels).length > 0 ? { custom_labels } : {}),
  };
}

const LABEL = 'mb-1.5 block text-sm font-medium text-pm-body';

export function ExteriorEstimateBuilder({
  value,
  onChange,
  rateSettings,
}: {
  value: ExteriorEstimateFormState;
  onChange: (next: ExteriorEstimateFormState) => void;
  rateSettings?: UserRateSettings | null;
}) {
  const [editingLabel, setEditingLabel] = useState<ExteriorSurface | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  const rates: ExteriorRateSettings = rateSettings?.exterior ?? {
    ext_walls: { refresh_1coat: 1800, repaint_2coat: 2500, full_system: 3500 },
    eaves:     { refresh_1coat: 1500, repaint_2coat: 2200, full_system: 3000 },
    fascia:    { refresh_1coat: 1000, repaint_2coat: 1500, full_system: 2000 },
    gutters:   { refresh_1coat:  800, repaint_2coat: 1200, full_system: 1600 },
  };

  const preview = calculateExteriorEstimate(buildExteriorEstimatePayload(value), rateSettings);

  function startEdit(surface: ExteriorSurface) {
    setEditingLabel(surface);
    setLabelDraft(value.customLabels[surface]?.trim() || EXTERIOR_SURFACE_LABELS[surface]);
  }

  function commitEdit(surface: ExteriorSurface) {
    const trimmed = labelDraft.trim();
    const defaultLabel = EXTERIOR_SURFACE_LABELS[surface];
    onChange({
      ...value,
      customLabels: {
        ...value.customLabels,
        [surface]: trimmed === defaultLabel ? '' : trimmed,
      },
    });
    setEditingLabel(null);
  }

  function deleteSurface(surface: ExteriorSurface) {
    onChange({
      ...value,
      hiddenSurfaces: [...value.hiddenSurfaces, surface],
      surfaces: { ...value.surfaces, [surface]: '' },
    });
  }

  function restoreSurface(surface: ExteriorSurface) {
    onChange({
      ...value,
      hiddenSurfaces: value.hiddenSurfaces.filter((s) => s !== surface),
    });
  }

  const visibleSurfaces = EXTERIOR_SURFACES.filter((s) => !value.hiddenSurfaces.includes(s));
  const hiddenSurfaces = EXTERIOR_SURFACES.filter((s) => value.hiddenSurfaces.includes(s));

  return (
    <section className="space-y-4 rounded-2xl border border-pm-border bg-white p-4">
      {/* Coating type */}
      <div>
        <label className={LABEL}>Coating System</label>
        <div className="grid gap-2 grid-cols-3">
          {EXTERIOR_COATING_TYPES.map((coating) => (
            <button
              key={coating}
              type="button"
              onClick={() => onChange({ ...value, coating })}
              aria-pressed={value.coating === coating}
              className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                value.coating === coating
                  ? 'border-pm-teal bg-pm-teal text-white'
                  : 'border-pm-border bg-white text-pm-body hover:border-pm-teal-mid'
              }`}
            >
              {EXTERIOR_COATING_LABELS[coating]}
            </button>
          ))}
        </div>
      </div>

      {/* Surface quantities */}
      <div className="space-y-3">
        <p className={LABEL}>Surface Quantities</p>
        <div className="overflow-x-auto rounded-xl border border-pm-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-pm-border bg-pm-surface">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Surface
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Qty
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Rate
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Total
                </th>
                <th className="w-20 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleSurfaces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-pm-secondary">
                    No surfaces — restore one below.
                  </td>
                </tr>
              ) : (
                visibleSurfaces.map((surface, i) => {
                  const unit = EXTERIOR_UNIT_LABELS[surface];
                  const rate = rates[surface][value.coating];
                  const rawQty = value.surfaces[surface];
                  const qty = rawQty ? parseFloat(rawQty) : NaN;
                  const lineTotal = Number.isFinite(qty) && qty > 0 ? Math.round(qty * rate) : 0;
                  const displayLabel = value.customLabels[surface]?.trim() || EXTERIOR_SURFACE_LABELS[surface];
                  const isEditing = editingLabel === surface;

                  return (
                    <tr key={surface} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                      <td className="px-4 py-2.5 font-medium text-pm-body">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onBlur={() => commitEdit(surface)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(surface);
                              if (e.key === 'Escape') setEditingLabel(null);
                            }}
                            className="w-full rounded-lg border border-pm-teal-mid bg-white px-2 py-1 text-sm text-pm-body focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
                          />
                        ) : (
                          <span>{displayLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <NumericInput
                            inputMode="decimal"
                            value={value.surfaces[surface] ?? ''}
                            sanitize={sanitizeDecimalInput}
                            onValueChange={(v) =>
                              onChange({
                                ...value,
                                surfaces: { ...value.surfaces, [surface]: v },
                              })
                            }
                            placeholder="0"
                            className="w-24 rounded-lg border border-pm-border bg-white py-2 px-3 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
                          />
                          <span className="text-xs text-pm-secondary">{unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-pm-secondary">
                        {formatAUD(rate)}/{unit}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-pm-body">
                        {lineTotal > 0 ? formatAUD(lineTotal) : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(surface)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-pm-border bg-white text-pm-secondary hover:border-pm-teal-mid hover:text-pm-teal transition-colors"
                            title="Edit name"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSurface(surface)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-pm-border bg-white text-pm-secondary hover:border-pm-coral/50 hover:text-pm-coral transition-colors"
                            title="Remove surface"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore hidden surfaces */}
      {hiddenSurfaces.length > 0 && (
        <div className="rounded-xl border border-dashed border-pm-border p-3">
          <p className="mb-2 text-xs font-medium text-pm-secondary">Removed — tap to restore</p>
          <div className="flex flex-wrap gap-2">
            {hiddenSurfaces.map((surface) => (
              <button
                key={surface}
                type="button"
                onClick={() => restoreSurface(surface)}
                className="inline-flex items-center gap-1.5 rounded-full border border-pm-border bg-white px-3 py-1.5 text-xs font-medium text-pm-secondary hover:border-pm-teal hover:text-pm-teal transition-colors"
              >
                <RotateCcw size={11} />
                {value.customLabels[surface]?.trim() || EXTERIOR_SURFACE_LABELS[surface]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live total */}
      {preview.subtotal_cents > 0 && (
        <div className="rounded-xl bg-pm-teal-pale/20 px-4 py-3 text-sm text-pm-teal">
          Exterior estimate: {formatAUD(preview.subtotal_cents)} ex-GST
          &nbsp;·&nbsp;
          {formatAUD(preview.total_cents)} inc-GST
        </div>
      )}
    </section>
  );
}
