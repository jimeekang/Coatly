'use client';

import { useState, useTransition } from 'react';
import {
  CalendarDays,
  Check,
  FilePenLine,
  Home,
  Info,
  Pencil,
  PencilRuler,
  Plus,
  Save,
  Trash2,
  Trees,
  Zap,
} from 'lucide-react';
import {
  NumericInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import { updateRateSettingsAction } from '@/app/actions/settings';
import {
  COATING_LABELS,
  DOOR_SCOPE_LABELS,
  DOOR_SCOPES,
  EXTERIOR_COATING_LABELS,
  EXTERIOR_COATING_TYPES,
  EXTERIOR_RATE_UNITS,
  EXTERIOR_SURFACE_LABELS,
  EXTERIOR_SURFACE_UNITS,
  EXTERIOR_SURFACES,
  PRICING_METHOD_LABELS,
  RATE_DOOR_TYPE_LABELS,
  RATE_DOOR_TYPES,
  TRIM_COATING_TYPES,
  SQM_SURFACE_TYPE_LABELS,
  TRIM_PAINT_SYSTEM_LABELS,
  TRIM_PAINT_SYSTEMS,
  WALL_CEILING_COATING_TYPES,
  WINDOW_SCOPE_LABELS,
  WINDOW_SCOPES,
  WINDOW_TYPE_LABELS,
  WINDOW_TYPES,
  type AdvancedEstimateRoomItem,
  type CustomExteriorSurfaceRate,
  type DoorScope,
  type ExteriorCoatingType,
  type ExteriorRateSettings,
  type ExteriorSurface,
  type MaterialCostMethod,
  type PricingMethodSettings,
  type RateDoorType,
  type RoomRatePreset,
  type SqmSurfaceType,
  type TrimPaintSystem,
  type QuickEstimateSettings,
  type QuickEstimateRoom,
  type UserRateSettings,
  type WindowScope,
  type WindowType,
} from '@/lib/rate-settings';
import {
  getAdvancedEstimateSetupIssues,
  getQuickEstimateSetupIssues,
  type RateSetupIssue,
} from '@/lib/rate-setup-diagnostics';
import type { PricingMethod } from '@/types/quote';
import { QuickEstimateTab } from '@/components/rates/QuickEstimateTab';

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

function normalizeStoredPreferredPricingMethod(
  method: PricingMethod
): PricingMethod {
  return method === 'sqm_rate' ? 'hybrid' : method;
}

function createClientId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countIssues(issues: RateSetupIssue[], codes: RateSetupIssue['code'][]) {
  return issues.filter((issue) => codes.includes(issue.code)).length;
}

function RateSetupSummary({
  title,
  items,
  issues,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  issues: RateSetupIssue[];
}) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-surface">{title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item.label}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant"
              >
                {item.value} {item.label}
              </span>
            ))}
          </div>
        </div>
        {issues.length > 0 && (
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {issues.length} setup warning{issues.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {issues.length > 0 && (
        <div className="mt-3 space-y-1">
          {issues.slice(0, 3).map((issue) => (
            <p
              key={`${issue.code}-${issue.source_id ?? issue.message}`}
              className="text-xs text-amber-800"
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

/** Inline always-editable rate cell — $ prefix, unit suffix, hover/focus affordance. */
function EditableCell({
  value,
  unit,
  onChange,
  ariaLabel,
}: {
  value: number;
  unit: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <span className="group/cell border-outline hover:border-on-surface-variant/45 hover:bg-surface-container-low focus-within:border-primary focus-within:ring-primary/20 inline-flex h-11 min-w-[7rem] items-center rounded-lg border bg-white pr-1.5 pl-2.5 transition-colors focus-within:bg-white focus-within:ring-2">
      <span className="text-on-surface-variant text-xs font-semibold">$</span>
      <NumericInput
        value={centsToDisplay(value)}
        sanitize={sanitizeDecimalInput}
        onValueChange={onChange}
        aria-label={ariaLabel}
        className="text-on-surface w-12 min-w-0 flex-1 border-0 bg-transparent px-1 text-right text-sm font-bold tabular-nums outline-none"
      />
      <span className="text-on-surface-variant pl-0.5 text-[11px] whitespace-nowrap">
        {unit}
      </span>
      <Pencil
        aria-hidden="true"
        className="text-on-surface-variant ml-1 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-within/cell:opacity-100"
      />
    </span>
  );
}

/** Small destructive icon button (44px touch target). */
function DeleteIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-error/30 text-error hover:bg-error-container inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white transition-colors"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** Section card — eyebrow + title + subtitle + optional actions, padded body. */
function RateSection({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-outline-variant overflow-hidden rounded-2xl border bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}

type MatrixRow = { key: string; label: React.ReactNode; sub?: string };
type MatrixCol = { key: string; label: string };

/**
 * Responsive rate matrix — renders a table on tablet/desktop (≥768px) and
 * stacked per-surface cards on mobile so every rate stays editable.
 */
function RateMatrix({
  rows,
  cols,
  suffix,
  getValue,
  onChange,
  rowActions,
  extraCol,
  emptyMessage,
}: {
  rows: MatrixRow[];
  cols: MatrixCol[];
  suffix: string | ((rowKey: string) => string);
  getValue: (rowKey: string, colKey: string) => number;
  onChange: (rowKey: string, colKey: string, value: string) => void;
  rowActions?: (rowKey: string) => React.ReactNode;
  extraCol?: { header: string; render: (rowKey: string) => React.ReactNode };
  emptyMessage?: string;
}) {
  const suffixFor = (rowKey: string) =>
    typeof suffix === 'function' ? suffix(rowKey) : suffix;
  const labelText = (row: MatrixRow) =>
    typeof row.label === 'string' ? row.label : '';

  if (rows.length === 0) {
    return (
      <div className="border-outline-variant bg-surface-container-low/40 text-on-surface-variant rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        {emptyMessage ?? 'Nothing to show.'}
      </div>
    );
  }

  return (
    <>
      {/* Tablet & desktop — table */}
      <div className="border-outline-variant hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-outline-variant bg-surface-container-low border-b">
              <th className="text-on-surface-variant px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                Surface
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="text-on-surface-variant px-3 py-2.5 text-center text-[10px] font-bold tracking-[0.12em] uppercase"
                >
                  {c.label}
                </th>
              ))}
              {extraCol && (
                <th className="text-on-surface-variant px-3 py-2.5 text-center text-[10px] font-bold tracking-[0.12em] uppercase">
                  {extraCol.header}
                </th>
              )}
              {rowActions && (
                <th className="px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-outline-variant hover:bg-surface-container-low/50 border-b transition-colors last:border-0"
              >
                <td className="px-4 py-2.5 text-left align-middle">
                  {typeof row.label === 'string' ? (
                    <div className="text-on-surface font-semibold">
                      {row.label}
                    </div>
                  ) : (
                    row.label
                  )}
                  {row.sub && (
                    <div className="text-on-surface-variant mt-0.5 text-xs">
                      {row.sub}
                    </div>
                  )}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-center">
                    <EditableCell
                      value={getValue(row.key, c.key)}
                      unit={suffixFor(row.key)}
                      onChange={(v) => onChange(row.key, c.key, v)}
                      ariaLabel={`${labelText(row)} ${c.label} rate`}
                    />
                  </td>
                ))}
                {extraCol && (
                  <td className="px-3 py-2.5 text-center">
                    {extraCol.render(row.key)}
                  </td>
                )}
                {rowActions && (
                  <td className="px-3 py-2.5 text-right">
                    {rowActions(row.key)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards */}
      <ul className="flex flex-col gap-2.5 md:hidden">
        {rows.map((row) => (
          <li
            key={row.key}
            className="border-outline-variant rounded-xl border bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 pb-2.5">
              <div className="min-w-0 flex-1">
                {typeof row.label === 'string' ? (
                  <div className="text-on-surface text-sm font-bold">
                    {row.label}
                  </div>
                ) : (
                  row.label
                )}
                {row.sub && (
                  <div className="text-on-surface-variant mt-0.5 text-xs">
                    {row.sub}
                  </div>
                )}
              </div>
              {(extraCol || rowActions) && (
                <div className="flex shrink-0 items-center gap-2">
                  {extraCol?.render(row.key)}
                  {rowActions?.(row.key)}
                </div>
              )}
            </div>
            <div className="border-outline-variant flex flex-col gap-2 border-t pt-2.5">
              {cols.map((c) => (
                <div
                  key={c.key}
                  className="flex min-h-11 items-center justify-between gap-3"
                >
                  <span className="text-on-surface-variant text-sm font-semibold">
                    {c.label}
                  </span>
                  <EditableCell
                    value={getValue(row.key, c.key)}
                    unit={suffixFor(row.key)}
                    onChange={(v) => onChange(row.key, c.key, v)}
                    ariaLabel={`${labelText(row)} ${c.label} rate`}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function OfferCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="border-outline accent-primary h-4 w-4 rounded"
    />
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      {eyebrow && (
        <p className="text-primary mb-1 text-[10px] font-bold tracking-[0.14em] uppercase">
          {eyebrow}
        </p>
      )}
      <h3 className="text-on-surface text-base font-bold leading-snug">{title}</h3>
      {subtitle && (
        <p className="text-on-surface-variant mt-0.5 max-w-xl text-sm leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function AddRateItemButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-primary/50 text-primary hover:border-primary hover:bg-primary/5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed bg-white px-4 text-sm font-medium"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function RateSectionStatus({ label }: { label: string }) {
  return (
    <div className="border-outline bg-surface-container-low text-on-surface-variant inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium">
      {label}
    </div>
  );
}

// ─── Section: Surface per-sqm rates ───────────────────────────────────────────

function WallCeilingRatesSection({
  rates,
  onSurfaceChange,
  onSurfaceToggle,
}: {
  rates: UserRateSettings;
  onSurfaceChange: (
    surface: keyof UserRateSettings,
    coating: string,
    v: string
  ) => void;
  onSurfaceToggle: (surface: SqmSurfaceType, enabled: boolean) => void;
}) {
  const surfaceOptions = ['walls', 'ceiling'] as const;
  const activeSurfaces = surfaceOptions.filter((surface) =>
    rates.enabled_surface_types.includes(surface)
  );
  const hiddenSurface = surfaceOptions.find(
    (surface) => !rates.enabled_surface_types.includes(surface)
  );

  return (
    <RateSection
      eyebrow="Interior · per m²"
      title="Wall & Ceiling Rates"
      subtitle="Default rate per sqm for walls and ceiling by coating type."
      actions={
        hiddenSurface ? (
          <AddRateItemButton
            label={`Add ${SQM_SURFACE_TYPE_LABELS[hiddenSurface]}`}
            onClick={() => onSurfaceToggle(hiddenSurface, true)}
          />
        ) : (
          <RateSectionStatus label="All surfaces active" />
        )
      }
    >
      <RateMatrix
        rows={activeSurfaces.map((surface) => ({
          key: surface,
          label: SQM_SURFACE_TYPE_LABELS[surface],
        }))}
        cols={WALL_CEILING_COATING_TYPES.map((c) => ({
          key: c,
          label: COATING_LABELS[c],
        }))}
        suffix="/sqm"
        getValue={(r, c) =>
          (rates[r as 'walls' | 'ceiling'] as Record<string, number>)[c]
        }
        onChange={(r, c, v) =>
          onSurfaceChange(r as keyof UserRateSettings, c, v)
        }
        rowActions={(r) => (
          <DeleteIconButton
            label={`Delete ${SQM_SURFACE_TYPE_LABELS[r as SqmSurfaceType]}`}
            onClick={() => onSurfaceToggle(r as SqmSurfaceType, false)}
          />
        )}
        emptyMessage="No wall or ceiling rates are active. Use Add Surface to restore one."
      />
    </RateSection>
  );
}

function TrimRatesSection({
  rates,
  onSurfaceChange,
  onSurfaceToggle,
}: {
  rates: UserRateSettings;
  onSurfaceChange: (
    surface: keyof UserRateSettings,
    coating: string,
    v: string
  ) => void;
  onSurfaceToggle: (surface: SqmSurfaceType, enabled: boolean) => void;
}) {
  const isTrimActive = rates.enabled_surface_types.includes('trim');

  return (
    <RateSection
      eyebrow="Interior · per metre"
      title="Skirting & Trim Rates"
      subtitle="Trim, skirting, and similar metre-based work."
      actions={
        isTrimActive ? (
          <RateSectionStatus label="Skirting active" />
        ) : (
          <AddRateItemButton
            label="Add Skirting"
            onClick={() => onSurfaceToggle('trim', true)}
          />
        )
      }
    >
      <RateMatrix
        rows={
          isTrimActive
            ? [{ key: 'trim', label: SQM_SURFACE_TYPE_LABELS.trim }]
            : []
        }
        cols={TRIM_COATING_TYPES.map((c) => ({
          key: c,
          label: COATING_LABELS[c],
        }))}
        suffix="/m"
        getValue={(_r, c) => (rates.trim as Record<string, number>)[c]}
        onChange={(_r, c, v) => onSurfaceChange('trim', c, v)}
        rowActions={() => (
          <DeleteIconButton
            label="Delete Skirting"
            onClick={() => onSurfaceToggle('trim', false)}
          />
        )}
        emptyMessage="Skirting rates are hidden. Use Add Skirting to restore them."
      />
    </RateSection>
  );
}

// ─── Section: Door rates by type ──────────────────────────────────────────────

function DoorRatesSection({
  rates,
  onDoorRateChange,
  onDoorTypeToggle,
  onDoorScopeToggle,
}: {
  rates: UserRateSettings;
  onDoorRateChange: (
    ps: TrimPaintSystem,
    dt: RateDoorType,
    scope: DoorScope,
    v: string
  ) => void;
  onDoorTypeToggle: (dt: RateDoorType, enabled: boolean) => void;
  onDoorScopeToggle: (scope: DoorScope, enabled: boolean) => void;
}) {
  const hiddenDoorType = RATE_DOOR_TYPES.find(
    (doorType) => !rates.enabled_door_types.includes(doorType)
  );
  const paintCols = TRIM_PAINT_SYSTEMS.map((ps) => ({
    key: ps,
    label: TRIM_PAINT_SYSTEM_LABELS[ps],
  }));
  const scopeRows = DOOR_SCOPES.map((scope) => ({
    key: scope,
    label: DOOR_SCOPE_LABELS[scope],
  }));
  const enabledDoorTypes = RATE_DOOR_TYPES.filter((doorType) =>
    rates.enabled_door_types.includes(doorType)
  );

  return (
    <RateSection
      eyebrow="Interior · per door"
      title="Door Rates"
      subtitle="Flat rates per door, by type and scope."
      actions={
        hiddenDoorType ? (
          <AddRateItemButton
            label={`Add ${RATE_DOOR_TYPE_LABELS[hiddenDoorType]}`}
            onClick={() => onDoorTypeToggle(hiddenDoorType, true)}
          />
        ) : (
          <RateSectionStatus label="All door types active" />
        )
      }
    >
      <div className="flex flex-col gap-5">
        {/* Door scope availability */}
        <div>
          <p className="text-on-surface-variant mb-2 text-[10px] font-bold tracking-[0.12em] uppercase">
            Available scopes — applies to all door types
          </p>
          <RateMatrix
            rows={scopeRows}
            cols={paintCols}
            suffix="/door"
            getValue={(r, c) =>
              rates.door_unit_rates[c as TrimPaintSystem].standard[
                r as DoorScope
              ]
            }
            onChange={(r, c, v) =>
              onDoorRateChange(c as TrimPaintSystem, 'standard', r as DoorScope, v)
            }
            extraCol={{
              header: 'Offer',
              render: (r) => (
                <OfferCheckbox
                  checked={rates.enabled_door_scopes.includes(r as DoorScope)}
                  onChange={(enabled) =>
                    onDoorScopeToggle(r as DoorScope, enabled)
                  }
                />
              ),
            }}
          />
        </div>

        {/* Per door type pricing */}
        {enabledDoorTypes.map((doorType) => (
          <div
            key={doorType}
            className="border-outline-variant rounded-xl border"
          >
            <div className="border-outline-variant bg-surface-container-low flex items-center justify-between gap-3 border-b px-4 py-2.5">
              <span className="text-on-surface text-sm font-bold">
                {RATE_DOOR_TYPE_LABELS[doorType]}
              </span>
              <DeleteIconButton
                label={`Delete ${RATE_DOOR_TYPE_LABELS[doorType]}`}
                onClick={() => onDoorTypeToggle(doorType, false)}
              />
            </div>
            <div className="p-3 sm:p-3.5">
              <RateMatrix
                rows={scopeRows}
                cols={paintCols}
                suffix="/door"
                getValue={(r, c) =>
                  rates.door_unit_rates[c as TrimPaintSystem][doorType][
                    r as DoorScope
                  ]
                }
                onChange={(r, c, v) =>
                  onDoorRateChange(
                    c as TrimPaintSystem,
                    doorType,
                    r as DoorScope,
                    v
                  )
                }
              />
            </div>
          </div>
        ))}
        {enabledDoorTypes.length === 0 && (
          <div className="border-outline text-on-surface-variant rounded-xl border border-dashed bg-white p-8 text-center text-sm">
            No door rates are active. Use Add Door Type to restore one.
          </div>
        )}
      </div>
    </RateSection>
  );
}

// ─── Section: Window rates by type ────────────────────────────────────────────

function WindowRatesSection({
  rates,
  onWindowRateChange,
  onWindowTypeToggle,
}: {
  rates: UserRateSettings;
  onWindowRateChange: (
    ps: TrimPaintSystem,
    type: WindowType,
    scope: WindowScope,
    v: string
  ) => void;
  onWindowTypeToggle: (type: WindowType, enabled: boolean) => void;
}) {
  const hiddenWindowType = WINDOW_TYPES.find(
    (type) => !rates.enabled_window_types.includes(type)
  );
  const paintCols = TRIM_PAINT_SYSTEMS.map((ps) => ({
    key: ps,
    label: TRIM_PAINT_SYSTEM_LABELS[ps],
  }));
  const scopeRows = WINDOW_SCOPES.map((scope) => ({
    key: scope,
    label: WINDOW_SCOPE_LABELS[scope],
  }));
  const enabledWindowTypes = WINDOW_TYPES.filter((type) =>
    rates.enabled_window_types.includes(type)
  );

  return (
    <RateSection
      eyebrow="Interior · per window"
      title="Window Rates"
      subtitle="Flat rates per window — interior side, sill, and reveal."
      actions={
        hiddenWindowType ? (
          <AddRateItemButton
            label={`Add ${WINDOW_TYPE_LABELS[hiddenWindowType]}`}
            onClick={() => onWindowTypeToggle(hiddenWindowType, true)}
          />
        ) : (
          <RateSectionStatus label="All window types active" />
        )
      }
    >
      <div className="flex flex-col gap-5">
        {enabledWindowTypes.map((type) => (
          <div key={type} className="border-outline-variant rounded-xl border">
            <div className="border-outline-variant bg-surface-container-low flex items-center justify-between gap-3 border-b px-4 py-2.5">
              <span className="text-on-surface text-sm font-bold">
                {WINDOW_TYPE_LABELS[type]}
              </span>
              <DeleteIconButton
                label={`Delete ${WINDOW_TYPE_LABELS[type]}`}
                onClick={() => onWindowTypeToggle(type, false)}
              />
            </div>
            <div className="p-3 sm:p-3.5">
              <RateMatrix
                rows={scopeRows}
                cols={paintCols}
                suffix="/window"
                getValue={(r, c) =>
                  rates.window_unit_rates[c as TrimPaintSystem][type][
                    r as WindowScope
                  ]
                }
                onChange={(r, c, v) =>
                  onWindowRateChange(
                    c as TrimPaintSystem,
                    type,
                    r as WindowScope,
                    v
                  )
                }
              />
            </div>
          </div>
        ))}
        {enabledWindowTypes.length === 0 && (
          <div className="border-outline text-on-surface-variant rounded-xl border border-dashed bg-white p-8 text-center text-sm">
            No window rates are active. Use Add Window Type to restore one.
          </div>
        )}
      </div>
    </RateSection>
  );
}

// ─── Tab content: Day Rate settings ───────────────────────────────────────────

function DayRateTab({
  pricing,
  onChange,
}: {
  pricing: PricingMethodSettings;
  onChange: (patch: Partial<PricingMethodSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-5">
          <SectionHeading
            title="Day Rate"
            subtitle="Used when pricing by labour days. We multiply the day rate by estimated days to produce a quote line."
          />
        </header>
      <div className="space-y-5">
        {/* Daily labour rate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-on-surface mb-1.5 block text-sm font-medium">
              Daily labour rate
            </label>
            <div className="relative inline-flex items-center">
              <span className="text-on-surface-variant absolute left-3 text-sm">
                $
              </span>
              <NumericInput
                inputMode="numeric"
                value={(pricing.daily_rate_cents / 100).toFixed(0)}
                sanitize={sanitizeIntegerInput}
                onValueChange={(value) => {
                  const nextValue = value.trim() === '' ? 0 : parseFloat(value);
                  if (Number.isFinite(nextValue) && nextValue >= 0) {
                    onChange({ daily_rate_cents: Math.round(nextValue * 100) });
                  }
                }}
                className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-32 rounded-lg border bg-white py-2 pr-2 pl-6 text-right text-sm focus:ring-2 focus:outline-none"
              />
              <span className="text-on-surface-variant ml-1.5 text-xs">/day</span>
            </div>
            <p className="text-on-surface-variant mt-1 text-xs">
              Your total labour earnings per day
            </p>
          </div>

          <div>
            <label className="text-on-surface mb-1.5 block text-sm font-medium">
              Target daily earnings
            </label>
            <div className="relative inline-flex items-center">
              <span className="text-on-surface-variant absolute left-3 text-sm">
                $
              </span>
              <NumericInput
                inputMode="numeric"
                value={
                  pricing.target_daily_earnings_cents != null
                    ? (pricing.target_daily_earnings_cents / 100).toFixed(0)
                    : ''
                }
                sanitize={sanitizeIntegerInput}
                placeholder="Optional"
                onValueChange={(value) => {
                  const raw = value.trim();
                  if (raw === '') {
                    onChange({ target_daily_earnings_cents: null });
                    return;
                  }
                  const nextValue = parseFloat(raw);
                  if (Number.isFinite(nextValue) && nextValue >= 0) {
                    onChange({
                      target_daily_earnings_cents: Math.round(nextValue * 100),
                    });
                  }
                }}
                className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-32 rounded-lg border bg-white py-2 pr-2 pl-6 text-right text-sm focus:ring-2 focus:outline-none"
              />
              <span className="text-on-surface-variant ml-1.5 text-xs">/day</span>
            </div>
            <p className="text-on-surface-variant mt-1 text-xs">
              Used in the internal profitability review after a quote is saved.
            </p>
          </div>
        </div>

        {/* Material cost method */}
        <div className="border-outline border-t pt-4">
          <label className="text-on-surface mb-2 block text-sm font-medium">
            Material cost calculation
          </label>
          <div className="flex items-center gap-4">
            {(['percentage', 'flat'] as MaterialCostMethod[]).map((method) => (
              <label
                key={method}
                className="text-on-surface flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="material_cost_method"
                  value={method}
                  checked={pricing.material_cost_method === method}
                  onChange={() => onChange({ material_cost_method: method })}
                  className="accent-primary"
                />
                {method === 'percentage'
                  ? '% of labour cost'
                  : 'Flat amount per day'}
              </label>
            ))}
          </div>
          {pricing.material_cost_method === 'percentage' && (
            <div className="mt-3 flex items-center gap-2">
              <NumericInput
                inputMode="numeric"
                value={String(pricing.material_cost_percent)}
                sanitize={sanitizeIntegerInput}
                onValueChange={(value) => {
                  const nextValue =
                    value.trim() === '' ? 0 : parseInt(value, 10);
                  if (
                    Number.isFinite(nextValue) &&
                    nextValue >= 0 &&
                    nextValue <= 100
                  ) {
                    onChange({ material_cost_percent: nextValue });
                  }
                }}
                className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-20 rounded-lg border bg-white px-3 py-2 text-right text-sm focus:ring-2 focus:outline-none"
              />
              <span className="text-on-surface-variant text-sm">
                % of labour cost
              </span>
            </div>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}

// ─── Room rate preset row form ─────────────────────────────────────────────────

function RoomPresetForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial: { title: string; sqm: string; rate: string };
  onSave: (title: string, sqm: number, rate_cents: number) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [sqm, setSqm] = useState(initial.sqm);
  const [rate, setRate] = useState(initial.rate);

  function handleSave() {
    const sqmNum = parseFloat(sqm);
    const rateNum = parseFloat(rate);
    if (
      !title.trim() ||
      !Number.isFinite(sqmNum) ||
      sqmNum <= 0 ||
      !Number.isFinite(rateNum) ||
      rateNum < 0
    )
      return;
    onSave(title.trim(), sqmNum, Math.round(rateNum * 100));
  }

  return (
    <div className="border-primary/40 bg-primary/5 flex flex-wrap items-end gap-3 rounded-2xl border p-4">
      <div className="min-w-[160px] flex-1">
        <label className="text-on-surface-variant mb-1 block text-xs font-medium">
          Room name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Master Bedroom"
          className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-on-surface-variant mb-1 block text-xs font-medium">
          Size (sqm)
        </label>
        <div className="relative inline-flex items-center">
          <NumericInput
            inputMode="decimal"
            value={sqm}
            sanitize={sanitizeDecimalInput}
            onValueChange={setSqm}
            placeholder="20"
            className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-24 rounded-lg border bg-white px-3 py-2 text-right text-sm focus:ring-2 focus:outline-none"
          />
          <span className="text-on-surface-variant ml-1.5 text-xs">sqm</span>
        </div>
      </div>
      <div>
        <label className="text-on-surface-variant mb-1 block text-xs font-medium">
          Flat rate
        </label>
        <div className="relative inline-flex items-center">
          <span className="text-on-surface-variant absolute left-3 text-sm">$</span>
          <NumericInput
            value={rate}
            sanitize={sanitizeDecimalInput}
            onValueChange={setRate}
            placeholder="450"
            className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 w-28 rounded-lg border bg-white py-2 pr-2 pl-6 text-right text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 inline-flex h-9 items-center rounded-xl px-4 text-sm font-semibold text-white"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-outline text-on-surface hover:bg-surface-container-low inline-flex h-9 items-center rounded-xl border bg-white px-4 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Tab content: Room Rate settings ──────────────────────────────────────────

function RoomRateTab({
  rates,
  onAdd,
  onUpdate,
  onDelete,
}: {
  rates: UserRateSettings;
  onAdd: (preset: RoomRatePreset) => void;
  onUpdate: (id: string, patch: Omit<RoomRatePreset, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const presets = rates.room_rate_presets;

  return (
    <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          title="Room Rate Presets"
          subtitle="Flat-rate per room — select when creating quotes to quickly price by room."
        />
        <div className="flex shrink-0 items-center gap-2">
          {!isAdding && (
            <AddRateItemButton label="Add Room Preset" onClick={() => setIsAdding(true)} />
          )}
        </div>
      </header>
    <div className="space-y-4">

      {/* Preset list */}
      {presets.length > 0 && (
        <div className="border-outline-variant overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-outline-variant bg-surface-container-low border-b">
                <th className="text-on-surface-variant px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                  Room
                </th>
                <th className="text-on-surface-variant px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.12em] uppercase">
                  Size
                </th>
                <th className="text-on-surface-variant px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.12em] uppercase">
                  Flat Rate
                </th>
                <th className="text-on-surface-variant px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.12em] uppercase">
                  $/sqm
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {presets.map((preset, i) =>
                editingId === preset.id ? (
                  <tr key={preset.id}>
                    <td colSpan={5} className="p-3">
                      <RoomPresetForm
                        initial={{
                          title: preset.title,
                          sqm: String(preset.sqm),
                          rate: (preset.rate_cents / 100).toFixed(2),
                        }}
                        onSave={(title, sqm, rate_cents) => {
                          onUpdate(preset.id, { title, sqm, rate_cents });
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Save"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={preset.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/40'}
                  >
                    <td className="text-on-surface px-4 py-3 font-medium">
                      {preset.title}
                    </td>
                    <td className="text-on-surface-variant px-4 py-3 text-center">
                      {preset.sqm} sqm
                    </td>
                    <td className="text-on-surface px-4 py-3 text-center font-medium">
                      ${(preset.rate_cents / 100).toFixed(2)}
                    </td>
                    <td className="text-on-surface-variant px-4 py-3 text-center text-xs">
                      {preset.sqm > 0
                        ? `$${(preset.rate_cents / preset.sqm / 100).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(preset.id);
                            setIsAdding(false);
                          }}
                          className="border-outline text-on-surface hover:bg-surface-container-low rounded-lg border bg-white px-3 py-1.5 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(preset.id)}
                          className="border-error/30 text-error hover:bg-error-container inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {presets.length === 0 && !isAdding && (
        <div className="border-outline rounded-2xl border bg-white p-8 text-center">
          <p className="text-on-surface text-sm font-medium">
            No room presets yet
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            Add your standard rooms to quickly price jobs by room rate.
          </p>
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <RoomPresetForm
          initial={{ title: '', sqm: '', rate: '' }}
          onSave={(title, sqm, rate_cents) => {
            onAdd({ id: crypto.randomUUID(), title, sqm, rate_cents });
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
          submitLabel="Add Room"
        />
      )}

      </div>
    </section>
  );
}

// ─── Tab content: Manual placeholder ──────────────────────────────────────────

function ManualTab() {
  return (
    <section className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <header className="mb-5">
        <SectionHeading
          title="Manual Quoting"
          subtitle="No default rates. You'll enter line items and prices by hand on each quote — useful for one-offs, commercial work, or jobs that don't fit a template."
        />
      </header>
      <div className="border-outline-variant rounded-xl border border-dashed bg-surface-container-low/40 p-10 text-center">
        <p className="text-on-surface text-sm font-semibold">
          Nothing to configure here.
        </p>
        <p className="text-on-surface-variant mt-1.5 text-xs">
          Manual quotes draw from your Material / Service catalogue at quote-time.
        </p>
      </div>
    </section>
  );
}

// ─── Detailed Estimate advanced room preset library ──────────────────────────

function AdvancedRoomItemsSection({
  items,
  quickRooms,
  onAdd,
  onUpdate,
  onDelete,
}: {
  items: AdvancedEstimateRoomItem[];
  quickRooms: QuickEstimateRoom[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<AdvancedEstimateRoomItem>) => void;
  onDelete: (id: string) => void;
}) {
  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const sortedQuickRooms = [...quickRooms].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <section className="space-y-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          title="Advanced Room Presets"
          subtitle="Optional shortcuts for New Quote Advanced mode. Each preset reuses the Room Price Library price source, then stores default size, surfaces, and height."
        />
        {sortedItems.length > 0 && (
          <AddRateItemButton label="Add Advanced Room Preset" onClick={onAdd} />
        )}
      </div>

      {sortedItems.length === 0 ? (
        <div className="border-outline bg-surface-container-low/50 rounded-2xl border border-dashed p-6 text-center sm:p-8">
          <div className="mx-auto max-w-md space-y-3">
            <h4 className="text-on-surface text-base font-semibold">
              No advanced room presets yet
            </h4>
            <p className="text-on-surface-variant text-sm leading-6">
              Add presets only for repeated advanced quote patterns, such as
              Bedroom repaint, Bathroom ceiling, or Feature wall. Room prices
              still come from the Room Price Library.
            </p>
            <AddRateItemButton label="Add Advanced Room Preset" onClick={onAdd} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="border-outline rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_130px_120px_52px] lg:items-end">
                <div className="space-y-2">
                  <label
                    htmlFor={'advanced-room-item-' + item.id}
                    className="text-on-surface-variant text-sm font-medium"
                  >
                    Item name
                  </label>
                  <input
                    id={'advanced-room-item-' + item.id}
                    value={item.label}
                    onChange={(event) =>
                      onUpdate(item.id, { label: event.target.value })
                    }
                    onBlur={() =>
                      onUpdate(item.id, {
                        label: item.label.trim() || 'Advanced room item',
                      })
                    }
                    className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white px-3 text-base font-medium focus:ring-2 focus:outline-none"
                    aria-label={'Advanced room item name for ' + item.label}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={'advanced-room-template-' + item.id}
                    className="text-on-surface-variant text-sm font-medium"
                  >
                    Room Price Library source
                  </label>
                  <select
                    id={'advanced-room-template-' + item.id}
                    value={item.source_room_template_id ?? ''}
                    onChange={(event) => {
                      const template = sortedQuickRooms.find(
                        (room) => room.id === event.target.value
                      );
                      onUpdate(item.id, {
                        source_room_template_id: template?.id,
                        source_room_template_version: template
                          ? (template.version ?? 1)
                          : undefined,
                        anchor_room_type:
                          template?.label ?? item.anchor_room_type,
                      });
                    }}
                    className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="">Legacy anchor fallback</option>
                    {sortedQuickRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={'advanced-room-size-' + item.id}
                    className="text-on-surface-variant text-sm font-medium"
                  >
                    Default size
                  </label>
                  <select
                    id={'advanced-room-size-' + item.id}
                    value={item.default_size ?? 'medium'}
                    onChange={(event) =>
                      onUpdate(item.id, {
                        default_size: event.target.value as
                          | 'small'
                          | 'medium'
                          | 'large',
                      })
                    }
                    className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={'advanced-room-height-' + item.id}
                    className="text-on-surface-variant text-sm font-medium"
                  >
                    Height
                  </label>
                  <NumericInput
                    id={'advanced-room-height-' + item.id}
                    inputMode="decimal"
                    value={String(item.default_height_m)}
                    sanitize={sanitizeDecimalInput}
                    onValueChange={(value) => {
                      const height = Number(value);
                      if (Number.isFinite(height) && height > 0) {
                        onUpdate(item.id, { default_height_m: height });
                      }
                    }}
                    className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
                    aria-label={'Default height for ' + item.label}
                  />
                </div>

                <button
                  type="button"
                  aria-label={'Delete ' + item.label + ' advanced room item'}
                  onClick={() => onDelete(item.id)}
                  className="border-error/30 text-error hover:bg-error-container inline-flex h-12 w-full items-center justify-center rounded-xl border bg-white lg:w-12"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 text-base font-medium lg:sr-only">
                    Delete
                  </span>
                </button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-on-surface-variant">
                  Default surfaces
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: 'include_walls', label: 'Walls' },
                      { key: 'include_ceiling', label: 'Ceiling' },
                      { key: 'include_trim', label: 'Trim' },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onUpdate(item.id, { [key]: !item[key] })}
                      className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                        item[key]
                          ? 'border-primary bg-primary text-white'
                          : 'border-outline bg-white text-on-surface'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Exterior rates ───────────────────────────────────────────────────────────

function ExteriorRatesSection({
  rates,
  enabledSurfaces,
  customSurfaces,
  onChange,
  onSurfaceToggle,
  onCustomAdd,
  onCustomUpdate,
  onCustomDelete,
}: {
  rates: ExteriorRateSettings;
  enabledSurfaces: ExteriorSurface[];
  customSurfaces: CustomExteriorSurfaceRate[];
  onChange: (
    surface: ExteriorSurface,
    coating: ExteriorCoatingType,
    v: string
  ) => void;
  onSurfaceToggle: (surface: ExteriorSurface, enabled: boolean) => void;
  onCustomAdd: () => void;
  onCustomUpdate: (
    id: string,
    patch: Partial<CustomExteriorSurfaceRate>
  ) => void;
  onCustomDelete: (id: string) => void;
}) {
  const visibleSurfaces = EXTERIOR_SURFACES.filter((surface) =>
    enabledSurfaces.includes(surface)
  );
  const hiddenSurfaces = EXTERIOR_SURFACES.filter(
    (surface) => !enabledSurfaces.includes(surface)
  );
  const coatingCols = EXTERIOR_COATING_TYPES.map((c) => ({
    key: c,
    label: EXTERIOR_COATING_LABELS[c],
  }));

  const rows: MatrixRow[] = [
    ...visibleSurfaces.map((surface) => ({
      key: `std:${surface}`,
      label: EXTERIOR_SURFACE_LABELS[surface],
    })),
    ...customSurfaces.map((custom) => ({
      key: `custom:${custom.id}`,
      label: (
        <div className="flex flex-col gap-1.5">
          <input
            value={custom.label}
            onChange={(event) =>
              onCustomUpdate(custom.id, { label: event.target.value })
            }
            onBlur={() =>
              onCustomUpdate(custom.id, {
                label: custom.label.trim() || 'Custom Surface',
              })
            }
            placeholder="Surface name"
            aria-label="Custom surface name"
            className="border-outline text-on-surface focus:border-primary focus:ring-primary/20 h-9 w-full min-w-[8rem] rounded-md border bg-white px-2.5 text-sm font-semibold outline-none focus:ring-2"
          />
          <div className="border-outline bg-surface-container-low inline-flex w-fit rounded-lg border p-0.5">
            {EXTERIOR_RATE_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onCustomUpdate(custom.id, { unit })}
                className={`h-7 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                  custom.unit === unit
                    ? 'text-primary bg-white shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      ),
    })),
  ];

  return (
    <RateSection
      title="Exterior Surface Rates"
      subtitle="Default rates for exterior work. Add custom surfaces for services outside the standard list."
      actions={
        <AddRateItemButton label="Add Custom Surface" onClick={onCustomAdd} />
      }
    >
      <RateMatrix
        rows={rows}
        cols={coatingCols}
        suffix={(rowKey) => {
          if (rowKey.startsWith('std:')) {
            return EXTERIOR_SURFACE_UNITS[rowKey.slice(4) as ExteriorSurface];
          }
          const custom = customSurfaces.find(
            (c) => `custom:${c.id}` === rowKey
          );
          return custom?.unit ?? '/sqm';
        }}
        getValue={(rowKey, colKey) => {
          if (rowKey.startsWith('std:')) {
            return rates[rowKey.slice(4) as ExteriorSurface][
              colKey as ExteriorCoatingType
            ];
          }
          const custom = customSurfaces.find(
            (c) => `custom:${c.id}` === rowKey
          );
          return custom ? custom.rates[colKey as ExteriorCoatingType] : 0;
        }}
        onChange={(rowKey, colKey, v) => {
          if (rowKey.startsWith('std:')) {
            onChange(
              rowKey.slice(4) as ExteriorSurface,
              colKey as ExteriorCoatingType,
              v
            );
            return;
          }
          const custom = customSurfaces.find(
            (c) => `custom:${c.id}` === rowKey
          );
          if (!custom) return;
          const cents = displayToCents(v);
          if (cents === null) return;
          onCustomUpdate(custom.id, {
            rates: { ...custom.rates, [colKey]: cents },
          });
        }}
        rowActions={(rowKey) => {
          if (rowKey.startsWith('std:')) {
            const surface = rowKey.slice(4) as ExteriorSurface;
            return (
              <DeleteIconButton
                label={`Delete ${EXTERIOR_SURFACE_LABELS[surface]}`}
                onClick={() => onSurfaceToggle(surface, false)}
              />
            );
          }
          const custom = customSurfaces.find(
            (c) => `custom:${c.id}` === rowKey
          );
          return custom ? (
            <DeleteIconButton
              label={`Delete ${custom.label}`}
              onClick={() => onCustomDelete(custom.id)}
            />
          ) : null;
        }}
        emptyMessage="No exterior surface rates are active. Add a custom surface or restore a standard one."
      />
      {hiddenSurfaces.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hiddenSurfaces.map((surface) => (
            <button
              key={surface}
              type="button"
              onClick={() => onSurfaceToggle(surface, true)}
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/5 inline-flex h-11 items-center gap-1.5 rounded-xl border border-dashed bg-white px-4 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Restore {EXTERIOR_SURFACE_LABELS[surface]}
            </button>
          ))}
        </div>
      )}
    </RateSection>
  );
}

function ExteriorTab(props: {
  rates: ExteriorRateSettings;
  enabledSurfaces: ExteriorSurface[];
  customSurfaces: CustomExteriorSurfaceRate[];
  onChange: (
    surface: ExteriorSurface,
    coating: ExteriorCoatingType,
    v: string
  ) => void;
  onSurfaceToggle: (surface: ExteriorSurface, enabled: boolean) => void;
  onCustomAdd: () => void;
  onCustomUpdate: (
    id: string,
    patch: Partial<CustomExteriorSurfaceRate>
  ) => void;
  onCustomDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <ExteriorRatesSection {...props} />
    </div>
  );
}

// ─── Method tab icons ─────────────────────────────────────────────────────────

/** Pricing methods shown in the settings UI. sqm_rate and room_rate hidden. */
const DISPLAY_PRICING_METHODS: Exclude<PricingMethod, 'sqm_rate' | 'room_rate'>[] = [
  'detailed_quick',
  'hybrid',
  'day_rate',
  'manual',
];

const METHOD_ICONS: Record<PricingMethod, typeof PencilRuler> = {
  detailed_quick: Zap,
  hybrid: PencilRuler,
  sqm_rate: PencilRuler,
  day_rate: CalendarDays,
  room_rate: Home,
  manual: FilePenLine,
};

const METHOD_DESCRIPTIONS: Record<PricingMethod, string> = {
  detailed_quick: 'Pick rooms, sizes & scope. ~30 sec',
  hybrid: 'Measure walls in sqm. ~5 min',
  sqm_rate: 'Detailed estimate anchors and rates',
  day_rate: 'Labour days × daily rate',
  room_rate: 'Flat rate per room',
  manual: 'Enter costs directly',
};

// ─── Main form ────────────────────────────────────────────────────────────────

export function PriceRatesForm({
  defaultRates,
}: {
  defaultRates: UserRateSettings;
}) {
  const [rates, setRates] = useState<UserRateSettings>(defaultRates);
  const [activeTab, setActiveTab] = useState<PricingMethod>(
    normalizeStoredPreferredPricingMethod(
      defaultRates.pricing.preferred_pricing_method
    )
  );
  const [activeScope, setActiveScope] = useState<'interior' | 'exterior'>(
    'interior'
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Surface handler ──────────────────────────────────────────────────────────
  function handleSurfaceChange(
    surface: keyof UserRateSettings,
    coating: string,
    value: string
  ) {
    setSaved(false);
    const cents = displayToCents(value);
    if (cents === null) return;
    setRates((prev) => ({
      ...prev,
      [surface]: { ...(prev[surface] as object), [coating]: cents },
    }));
  }

  function handleSurfaceToggle(surface: SqmSurfaceType, enabled: boolean) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      enabled_surface_types: enabled
        ? Array.from(new Set([...prev.enabled_surface_types, surface]))
        : prev.enabled_surface_types.filter((item) => item !== surface),
    }));
  }

  // ── Door handlers ────────────────────────────────────────────────────────────
  function handleDoorRateChange(
    ps: TrimPaintSystem,
    dt: RateDoorType,
    scope: DoorScope,
    value: string
  ) {
    setSaved(false);
    const cents = displayToCents(value);
    if (cents === null) return;
    setRates((prev) => ({
      ...prev,
      door_unit_rates: {
        ...prev.door_unit_rates,
        [ps]: {
          ...prev.door_unit_rates[ps],
          [dt]: { ...prev.door_unit_rates[ps][dt], [scope]: cents },
        },
      },
    }));
  }

  function handleDoorTypeToggle(dt: RateDoorType, enabled: boolean) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      enabled_door_types: enabled
        ? Array.from(new Set([...prev.enabled_door_types, dt]))
        : prev.enabled_door_types.filter((t) => t !== dt),
    }));
  }

  function handleDoorScopeToggle(scope: DoorScope, enabled: boolean) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      enabled_door_scopes: enabled
        ? [...prev.enabled_door_scopes, scope]
        : prev.enabled_door_scopes.filter((s) => s !== scope),
    }));
  }

  // ── Window handlers ──────────────────────────────────────────────────────────
  function handleWindowRateChange(
    ps: TrimPaintSystem,
    type: WindowType,
    scope: WindowScope,
    value: string
  ) {
    setSaved(false);
    const cents = displayToCents(value);
    if (cents === null) return;
    setRates((prev) => ({
      ...prev,
      window_unit_rates: {
        ...prev.window_unit_rates,
        [ps]: {
          ...prev.window_unit_rates[ps],
          [type]: { ...prev.window_unit_rates[ps][type], [scope]: cents },
        },
      },
    }));
  }

  function handleWindowTypeToggle(type: WindowType, enabled: boolean) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      enabled_window_types: enabled
        ? Array.from(new Set([...prev.enabled_window_types, type]))
        : prev.enabled_window_types.filter((t) => t !== type),
    }));
  }

  // ── Quick estimate handler ───────────────────────────────────────────────────
  function handleQuickEstimateChange(quick_estimate: QuickEstimateSettings) {
    setSaved(false);
    setRates((prev) => ({ ...prev, quick_estimate }));
  }

  // ── Advanced detailed estimate room library handlers ───────────────────────
  function handleAdvancedRoomItemAdd() {
    const firstTemplate = rates.quick_estimate.rooms
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    const item: AdvancedEstimateRoomItem = {
      id: createClientId('advanced-room'),
      version: 1,
      label: 'New advanced room',
      anchor_room_type: firstTemplate?.label ?? 'Living Room',
      default_size: 'medium',
      ...(firstTemplate
        ? {
            source_room_template_id: firstTemplate.id,
            source_room_template_version: firstTemplate.version ?? 1,
          }
        : {}),
      include_walls: true,
      include_ceiling: true,
      include_trim: false,
      default_height_m: 2.7,
      sort_order: rates.detailed_estimate_items.advanced_rooms.length,
    };

    setSaved(false);
    setRates((prev) => ({
      ...prev,
      detailed_estimate_items: {
        ...prev.detailed_estimate_items,
        advanced_rooms: [
          ...prev.detailed_estimate_items.advanced_rooms,
          item,
        ],
      },
    }));
  }

  function handleAdvancedRoomItemUpdate(
    id: string,
    patch: Partial<AdvancedEstimateRoomItem>
  ) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      detailed_estimate_items: {
        ...prev.detailed_estimate_items,
        advanced_rooms: prev.detailed_estimate_items.advanced_rooms.map(
          (item) =>
            item.id === id
              ? { ...item, ...patch, version: (item.version ?? 1) + 1 }
              : item
        ),
      },
    }));
  }

  function handleAdvancedRoomItemDelete(id: string) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      detailed_estimate_items: {
        ...prev.detailed_estimate_items,
        advanced_rooms: prev.detailed_estimate_items.advanced_rooms.filter(
          (item) => item.id !== id
        ),
      },
    }));
  }

  // ── Room rate preset handlers (auto-save to DB) ──────────────────────────────
  function handleRoomPresetAdd(preset: RoomRatePreset) {
    const nextRates = {
      ...rates,
      room_rate_presets: [...rates.room_rate_presets, preset],
    };
    setRates(nextRates);
    persistRates(nextRates);
  }

  function handleRoomPresetUpdate(
    id: string,
    patch: Omit<RoomRatePreset, 'id'>
  ) {
    const nextRates = {
      ...rates,
      room_rate_presets: rates.room_rate_presets.map((p) =>
        p.id === id ? { id, ...patch } : p
      ),
    };
    setRates(nextRates);
    persistRates(nextRates);
  }

  function handleRoomPresetDelete(id: string) {
    const nextRates = {
      ...rates,
      room_rate_presets: rates.room_rate_presets.filter((p) => p.id !== id),
    };
    setRates(nextRates);
    persistRates(nextRates);
  }

  // ── Exterior rate handler ────────────────────────────────────────────────────
  function handleExteriorChange(
    surface: ExteriorSurface,
    coating: ExteriorCoatingType,
    value: string
  ) {
    setSaved(false);
    const cents = displayToCents(value);
    if (cents === null) return;
    setRates((prev) => ({
      ...prev,
      exterior: {
        ...prev.exterior,
        [surface]: { ...prev.exterior[surface], [coating]: cents },
      },
    }));
  }

  function handleExteriorSurfaceToggle(
    surface: ExteriorSurface,
    enabled: boolean
  ) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      enabled_exterior_surfaces: enabled
        ? Array.from(new Set([...prev.enabled_exterior_surfaces, surface]))
        : prev.enabled_exterior_surfaces.filter((item) => item !== surface),
    }));
  }

  function handleCustomExteriorAdd() {
    const id = createClientId('custom-exterior');
    const customSurface: CustomExteriorSurfaceRate = {
      id,
      label: 'Custom Surface',
      unit: '/sqm',
      rates: {
        refresh_1coat: 0,
        repaint_2coat: 0,
        full_system: 0,
      },
    };
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      custom_exterior_surfaces: [
        ...prev.custom_exterior_surfaces,
        customSurface,
      ],
    }));
  }

  function handleCustomExteriorUpdate(
    id: string,
    patch: Partial<CustomExteriorSurfaceRate>
  ) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      custom_exterior_surfaces: prev.custom_exterior_surfaces.map((surface) => {
        if (surface.id !== id) return surface;
        return {
          ...surface,
          ...patch,
          rates: patch.rates
            ? { ...surface.rates, ...patch.rates }
            : surface.rates,
        };
      }),
    }));
  }

  function handleCustomExteriorDelete(id: string) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      custom_exterior_surfaces: prev.custom_exterior_surfaces.filter(
        (surface) => surface.id !== id
      ),
    }));
  }

  // ── Pricing method handler ───────────────────────────────────────────────────
  function handlePricingChange(patch: Partial<PricingMethodSettings>) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, ...patch },
    }));
  }

  // ── Tab change — also sets preferred method ──────────────────────────────────
  function handleTabChange(method: PricingMethod) {
    setActiveTab(method);
    handlePricingChange({
      preferred_pricing_method: normalizeStoredPreferredPricingMethod(method),
    });
  }

  // ── Persist helper (shared by auto-save and submit) ─────────────────────────
  function persistRates(nextRates: UserRateSettings) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updateRateSettingsAction(nextRates);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextRates: UserRateSettings = {
      ...rates,
      pricing: {
        ...rates.pricing,
        preferred_pricing_method:
          normalizeStoredPreferredPricingMethod(activeTab),
      },
    };
    persistRates(nextRates);
  }

  const quickSetupIssues = getQuickEstimateSetupIssues(rates);
  const advancedSetupIssues = getAdvancedEstimateSetupIssues(rates);
  const missingOrZeroAnchorCount = countIssues(advancedSetupIssues, [
    'missing_advanced_anchor',
    'missing_room_template',
    'zero_advanced_anchor',
    'zero_room_template_source',
  ]);
  const zeroDoorWindowCount = countIssues(advancedSetupIssues, [
    'zero_door_unit_rate',
    'zero_window_unit_rate',
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-3 lg:grid-cols-2">
        <RateSetupSummary
          title="Room Price Library setup"
          items={[
            {
              label: 'room template',
              value: String(rates.quick_estimate.rooms.length),
            },
            {
              label: 'zero priced surface',
              value: String(
                countIssues(quickSetupIssues, ['zero_quick_surface_price'])
              ),
            },
            {
              label: saved ? 'saved' : 'unsaved edits',
              value: saved ? 'Rates' : 'Has',
            },
          ]}
          issues={quickSetupIssues}
        />
        <RateSetupSummary
          title="Advanced setup"
          items={[
            {
              label: 'room item',
              value: String(rates.detailed_estimate_items.advanced_rooms.length),
            },
            {
              label: 'missing/zero room source',
              value: String(missingOrZeroAnchorCount),
            },
            {
              label: 'zero door/window unit',
              value: String(zeroDoorWindowCount),
            },
          ]}
          issues={advancedSetupIssues}
        />
      </div>
      {/* ── Method bar ──────────────────────────────────────────────────────── */}
      <div>
        <div
          className="border-outline-variant no-scrollbar flex gap-1 overflow-x-auto rounded-xl border bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Pricing method"
        >
          {DISPLAY_PRICING_METHODS.map((m) => {
            const isActive = activeTab === m;
            const MethodIcon = METHOD_ICONS[m];
            const isPreferred = m === 'hybrid';
            return (
              <button
                key={m}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleTabChange(m)}
                className={`inline-flex h-11 min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-tertiary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <MethodIcon className="h-4 w-4 shrink-0" />
                {PRICING_METHOD_LABELS[m]}
                {isPreferred && (
                  <span
                    className={`rounded-full px-1.5 py-px text-[9px] font-extrabold tracking-wider uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    Preferred
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-outline-variant bg-surface-container-low text-on-surface-variant mt-2.5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed">
          <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{METHOD_DESCRIPTIONS[activeTab]}</span>
        </div>
      </div>

      {/* ── Quick Estimate ───────────────────────────────────────────────────── */}
      {activeTab === 'detailed_quick' && (
        <QuickEstimateTab
          settings={rates.quick_estimate}
          onChange={handleQuickEstimateChange}
        />
      )}

      {/* ── Day Rate: no scope distinction ──────────────────────────────────── */}
      {activeTab === 'day_rate' && (
        <DayRateTab pricing={rates.pricing} onChange={handlePricingChange} />
      )}

      {/* ── Room Rate: interior only (legacy, hidden from tab bar) ───────────── */}
      {activeTab === 'room_rate' && (
        <RoomRateTab
          rates={rates}
          onAdd={handleRoomPresetAdd}
          onUpdate={handleRoomPresetUpdate}
          onDelete={handleRoomPresetDelete}
        />
      )}

      {/* ── Manual: no scope distinction ─────────────────────────────────────── */}
      {activeTab === 'manual' && <ManualTab />}

      {/* ── Detailed Estimate: Interior / Exterior scope toggle ─────────────── */}
      {activeTab === 'hybrid' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="border-outline-variant bg-surface-container-low inline-flex gap-0.5 rounded-xl border p-0.5"
              role="tablist"
              aria-label="Job scope"
            >
              {(['interior', 'exterior'] as const).map((scope) => {
                const isActive = activeScope === scope;
                const Icon = scope === 'interior' ? Home : Trees;
                return (
                  <button
                    key={scope}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveScope(scope)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`} />
                    {scope === 'interior' ? 'Interior' : 'Exterior'}
                  </button>
                );
              })}
            </div>
            <p className="text-on-surface-variant text-xs">
              Rates pre-fill on every quote — you can tweak per-job.
            </p>
          </div>

          {activeScope === 'interior' && (
            <div className="space-y-5">
              <AdvancedRoomItemsSection
                items={rates.detailed_estimate_items.advanced_rooms}
                quickRooms={rates.quick_estimate.rooms}
                onAdd={handleAdvancedRoomItemAdd}
                onUpdate={handleAdvancedRoomItemUpdate}
                onDelete={handleAdvancedRoomItemDelete}
              />
              <WallCeilingRatesSection
                rates={rates}
                onSurfaceChange={handleSurfaceChange}
                onSurfaceToggle={handleSurfaceToggle}
              />
              <TrimRatesSection
                rates={rates}
                onSurfaceChange={handleSurfaceChange}
                onSurfaceToggle={handleSurfaceToggle}
              />
              <DoorRatesSection
                rates={rates}
                onDoorRateChange={handleDoorRateChange}
                onDoorTypeToggle={handleDoorTypeToggle}
                onDoorScopeToggle={handleDoorScopeToggle}
              />
              <WindowRatesSection
                rates={rates}
                onWindowRateChange={handleWindowRateChange}
                onWindowTypeToggle={handleWindowTypeToggle}
              />
            </div>
          )}

          {activeScope === 'exterior' && (
            <ExteriorTab
              rates={rates.exterior}
              enabledSurfaces={rates.enabled_exterior_surfaces}
              customSurfaces={rates.custom_exterior_surfaces}
              onChange={handleExteriorChange}
              onSurfaceToggle={handleExteriorSurfaceToggle}
              onCustomAdd={handleCustomExteriorAdd}
              onCustomUpdate={handleCustomExteriorUpdate}
              onCustomDelete={handleCustomExteriorDelete}
            />
          )}
        </>
      )}

      {/* ── Sticky save bar ─────────────────────────────────────────────────── */}
      <div className="border-outline-variant sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border bg-white/92 px-5 py-3.5 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs">
          {error && (
            <span className="text-error flex items-center gap-1.5">
              <span className="bg-error h-1.5 w-1.5 rounded-full" />
              {error}
            </span>
          )}
          {saved && !error && (
            <span className="text-primary flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Rates saved
            </span>
          )}
          {!saved && !error && (
            <span className="text-on-surface-variant">
              Changes save when you click Save Rates.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-on-surface hover:bg-on-surface/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? 'Saving…' : 'Save Rates'}
        </button>
      </div>
    </form>
  );
}
