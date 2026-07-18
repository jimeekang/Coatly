'use client';

import { useRef, useState, useTransition } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FilePenLine,
  Home,
  Info,
  Pencil,
  PencilRuler,
  Plus,
  Save,
  Trash2,
  Trees,
  Upload,
  Zap,
} from 'lucide-react';
import {
  NumericInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import { formControlClassName } from '@/components/forms/FormField';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { cn } from '@/lib/utils';
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
  type UserRateSettings,
  type WindowScope,
  type WindowType,
} from '@/modules/price-rates/domain/rate-settings';
import {
  getAdvancedEstimateSetupIssues,
  getQuickEstimateSetupIssues,
  type RateSetupIssue,
} from '@/modules/price-rates/domain/rate-setup-diagnostics';
import {
  MANUAL_PRICE_BOOK_UNITS,
  generateManualPriceBookCsv,
  generateManualPriceBookTemplateCsv,
  parseManualPriceBookCsv,
} from '@/modules/price-rates/domain/manual-price-book-csv';
import type {
  MaterialItem,
  MaterialItemUpsertInput,
} from '@/modules/materials/domain/types';
import type { PricingMethod } from '@/modules/quotes/domain/quote';
import { QuickEstimateTab } from '@/modules/price-rates/ui/QuickEstimateTab';

// ─── Injected server actions ──────────────────────────────────────────────────
// PriceRatesForm receives its server actions as props (wired in the price-rates
// page) so the client component never imports the settings/materials
// application layer directly. This keeps the price-rates ↔ settings module
// boundary one-way and free of a runtime import cycle.
type UpdateRateSettingsAction = (
  rawRates: unknown
) => Promise<{ error: string | null }>;
type CreateMaterialItemAction = (
  input: MaterialItemUpsertInput
) => Promise<{ data?: MaterialItem; error?: string }>;
type ImportMaterialItemsAction = (
  inputs: MaterialItemUpsertInput[]
) => Promise<{ data?: MaterialItem[]; error?: string }>;

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

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
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

function countIssues(
  issues: RateSetupIssue[],
  codes: RateSetupIssue['code'][]
) {
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
  const [showWarnings, setShowWarnings] = useState(false);
  const hasIssues = issues.length > 0;

  return (
    <section className="border-outline-variant bg-surface-container-lowest min-w-0 rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-on-surface text-sm font-bold">{title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item.label}
                className="border-outline-variant bg-surface-container-low text-on-surface-variant rounded-lg border px-2.5 py-1 text-xs font-medium"
              >
                {item.value} {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {hasIssues && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowWarnings((open) => !open)}
            aria-expanded={showWarnings}
            className="border-outline-variant bg-warning-container text-warning focus-visible:ring-primary/20 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            <span>
              {issues.length} setup warning{issues.length === 1 ? '' : 's'}
            </span>
            {showWarnings ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </button>
          {showWarnings && (
            <ul className="border-outline-variant bg-surface-container-low mt-2 space-y-1 rounded-xl border px-3 py-2">
              {issues.map((issue) => (
                <li
                  key={`${issue.code}-${issue.source_id ?? issue.message}`}
                  className="text-on-surface-variant text-xs"
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
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
    <span className="group/cell relative inline-flex min-w-[9rem] items-center">
      <span className="text-on-surface-variant pointer-events-none absolute left-3 z-10 text-xs font-semibold">
        $
      </span>
      <NumericInput
        value={centsToDisplay(value)}
        sanitize={sanitizeDecimalInput}
        onValueChange={onChange}
        aria-label={ariaLabel}
        className={cn(
          formControlClassName,
          'min-w-[9rem] pr-20 pl-7 text-right font-bold tabular-nums'
        )}
      />
      <span className="text-on-surface-variant pointer-events-none absolute right-7 text-[11px] whitespace-nowrap">
        {unit}
      </span>
      <Pencil
        aria-hidden="true"
        className="text-on-surface-variant pointer-events-none absolute right-2 h-3 w-3 opacity-0 transition-opacity group-focus-within/cell:opacity-100 group-hover/cell:opacity-100"
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
      className="border-error/30 text-error hover:bg-error-container focus-visible:ring-error/20 bg-surface-container-lowest inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
    <section className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-2xl border shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
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
            className="border-outline-variant bg-surface-container-lowest rounded-xl border p-3.5 shadow-sm"
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
        <SectionLabel className="text-primary mb-1">{eyebrow}</SectionLabel>
      )}
      <h3 className="text-on-surface text-base leading-snug font-bold">
        {title}
      </h3>
      {subtitle && (
        <p className="text-on-surface-variant mt-0.5 max-w-xl text-sm leading-relaxed">
          {subtitle}
        </p>
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
      className="border-primary/50 text-primary hover:border-primary hover:bg-primary/5 focus-visible:ring-primary/20 bg-surface-container-lowest inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
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
          <SectionLabel className="mb-2">
            Available scopes — applies to all door types
          </SectionLabel>
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
              onDoorRateChange(
                c as TrimPaintSystem,
                'standard',
                r as DoorScope,
                v
              )
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
            className="border-outline-variant overflow-hidden rounded-2xl border"
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
          <div className="border-outline text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed p-8 text-center text-sm">
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
          <div
            key={type}
            className="border-outline-variant overflow-hidden rounded-2xl border"
          >
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
          <div className="border-outline text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed p-8 text-center text-sm">
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
      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
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
                  aria-label="Daily labour rate"
                  inputMode="numeric"
                  value={(pricing.daily_rate_cents / 100).toFixed(0)}
                  sanitize={sanitizeIntegerInput}
                  onValueChange={(value) => {
                    const nextValue =
                      value.trim() === '' ? 0 : parseFloat(value);
                    if (Number.isFinite(nextValue) && nextValue >= 0) {
                      onChange({
                        daily_rate_cents: Math.round(nextValue * 100),
                      });
                    }
                  }}
                  className={cn(
                    formControlClassName,
                    'w-32 pr-2 pl-6 text-right'
                  )}
                />
                <span className="text-on-surface-variant ml-1.5 text-xs">
                  /day
                </span>
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
                  aria-label="Target daily earnings"
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
                        target_daily_earnings_cents: Math.round(
                          nextValue * 100
                        ),
                      });
                    }
                  }}
                  className={cn(
                    formControlClassName,
                    'w-32 pr-2 pl-6 text-right'
                  )}
                />
                <span className="text-on-surface-variant ml-1.5 text-xs">
                  /day
                </span>
              </div>
              <p className="text-on-surface-variant mt-1 text-xs">
                Used in the internal profitability review after a quote is
                saved.
              </p>
            </div>
          </div>

          {/* Material cost method */}
          <div className="border-outline border-t pt-4">
            <label className="text-on-surface mb-2 block text-sm font-medium">
              Material cost calculation
            </label>
            <div className="flex items-center gap-4">
              {(['percentage', 'flat'] as MaterialCostMethod[]).map(
                (method) => (
                  <label
                    key={method}
                    className="text-on-surface flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="material_cost_method"
                      value={method}
                      checked={pricing.material_cost_method === method}
                      onChange={() =>
                        onChange({ material_cost_method: method })
                      }
                      className="accent-primary"
                    />
                    {method === 'percentage'
                      ? '% of labour cost'
                      : 'Flat amount per day'}
                  </label>
                )
              )}
            </div>
            {pricing.material_cost_method === 'percentage' && (
              <div className="mt-3 flex items-center gap-2">
                <NumericInput
                  aria-label="Material cost percent"
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
                  className={cn(formControlClassName, 'w-20 px-3 text-right')}
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
          className={cn(formControlClassName, 'px-3')}
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
            className={cn(formControlClassName, 'w-24 px-3 text-right')}
          />
          <span className="text-on-surface-variant ml-1.5 text-xs">sqm</span>
        </div>
      </div>
      <div>
        <label className="text-on-surface-variant mb-1 block text-xs font-medium">
          Flat rate
        </label>
        <div className="relative inline-flex items-center">
          <span className="text-on-surface-variant absolute left-3 text-sm">
            $
          </span>
          <NumericInput
            value={rate}
            sanitize={sanitizeDecimalInput}
            onValueChange={setRate}
            placeholder="450"
            className={cn(formControlClassName, 'w-28 pr-2 pl-6 text-right')}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-on-primary focus-visible:ring-primary/20 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/20 bg-surface-container-lowest inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
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
    <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          title="Room Rate Presets"
          subtitle="Flat-rate per room — select when creating quotes to quickly price by room."
        />
        <div className="flex shrink-0 items-center gap-2">
          {!isAdding && (
            <AddRateItemButton
              label="Add Room Preset"
              onClick={() => setIsAdding(true)}
            />
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
                      className={
                        i % 2 === 0
                          ? 'bg-surface-container-lowest'
                          : 'bg-surface-container-low/40'
                      }
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
                            className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/20 bg-surface-container-lowest inline-flex min-h-11 items-center rounded-xl border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(preset.id)}
                            className="border-error/30 text-error hover:bg-error-container focus-visible:ring-error/20 bg-surface-container-lowest inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
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
          <div className="border-outline bg-surface-container-lowest rounded-2xl border p-8 text-center">
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

// ─── Tab content: Manual price book ───────────────────────────────────────────

function ManualTab({
  initialItems,
  initialError,
  createMaterialItem,
  importMaterialItems,
}: {
  initialItems: MaterialItem[];
  initialError?: string | null;
  createMaterialItem: CreateMaterialItemAction;
  importMaterialItems: ImportMaterialItemsAction;
}) {
  const [items, setItems] = useState<MaterialItem[]>(initialItems);
  const [csvError, setCsvError] = useState<string | null>(initialError ?? null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [pendingImportItems, setPendingImportItems] = useState<
    MaterialItemUpsertInput[]
  >([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    unit: 'each',
    price: '',
    description: '',
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function resetCsvFeedback() {
    setCsvError(null);
    setCsvMessage(null);
  }

  function itemKey(name: string, unit?: string | null) {
    return `${name.trim().toLowerCase()}::${(unit?.trim() || 'each').toLowerCase()}`;
  }

  function findExistingDuplicate(
    input: Pick<MaterialItemUpsertInput, 'name' | 'unit'>
  ) {
    const key = itemKey(input.name, input.unit);
    return items.some((item) => itemKey(item.name, item.unit) === key);
  }

  function getExistingDuplicateErrors(inputs: MaterialItemUpsertInput[]) {
    return inputs.flatMap((input, index) =>
      findExistingDuplicate(input)
        ? [
            `Line ${index + 2}: ${input.name} / ${input.unit} already exists in your manual price book.`,
          ]
        : []
    );
  }

  function downloadCsv(csv: string, fileName: string) {
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleTemplateDownload() {
    resetCsvFeedback();
    setPendingImportItems([]);
    downloadCsv(
      generateManualPriceBookTemplateCsv(),
      'coatly-manual-price-book-template.csv'
    );
    setCsvMessage('Downloaded the manual price book template.');
  }

  function handleExportCsv() {
    resetCsvFeedback();
    setPendingImportItems([]);
    const csv = generateManualPriceBookCsv(items);
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `coatly-manual-price-book-${dateStamp}.csv`);
    setCsvMessage(
      `Exported ${items.length} item${items.length === 1 ? '' : 's'} to CSV.`
    );
  }

  async function handleImportChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    resetCsvFeedback();
    setPendingImportItems([]);
    const text = await file.text();
    const parsed = parseManualPriceBookCsv(text);

    if (parsed.errors.length > 0) {
      setCsvError(parsed.errors.slice(0, 3).join(' '));
      return;
    }

    const duplicateErrors = getExistingDuplicateErrors(parsed.items);
    if (duplicateErrors.length > 0) {
      setCsvError(duplicateErrors.slice(0, 3).join(' '));
      return;
    }

    setPendingImportItems(parsed.items);
    setCsvMessage(
      `Review ${parsed.items.length} item${
        parsed.items.length === 1 ? '' : 's'
      } before import.`
    );
  }

  async function handleConfirmImport() {
    if (pendingImportItems.length === 0) return;

    setIsImporting(true);
    setCsvError(null);
    try {
      const result = await importMaterialItems(pendingImportItems);
      if (result.error) {
        setCsvError(result.error);
        return;
      }

      const importedItems = result.data ?? [];
      setItems((prev) => [...prev, ...importedItems]);
      setPendingImportItems([]);
      setCsvMessage(
        `Imported ${importedItems.length} item${
          importedItems.length === 1 ? '' : 's'
        } from CSV.`
      );
    } catch (error) {
      setCsvError(
        getActionErrorMessage(
          error,
          'Unable to import price items. Please try again.'
        )
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleAddPriceItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetCsvFeedback();
    setPendingImportItems([]);

    const name = newItem.name.trim();
    const cents = displayToCents(newItem.price);
    if (!name) {
      setCsvError('Service / Item is required.');
      return;
    }
    if (cents == null) {
      setCsvError('Price must be a valid AUD number.');
      return;
    }

    const input: MaterialItemUpsertInput = {
      category: 'service',
      name,
      unit: newItem.unit,
      unit_price_cents: cents,
      notes: newItem.description.trim() || undefined,
      is_active: true,
    };

    if (findExistingDuplicate(input)) {
      setCsvError(
        `${input.name} / ${input.unit} already exists in your manual price book.`
      );
      return;
    }

    setIsSavingItem(true);
    try {
      const result = await createMaterialItem(input);
      if (result.error) {
        setCsvError(result.error);
        return;
      }

      if (result.data) {
        setItems((prev) => [...prev, result.data as MaterialItem]);
      }
      setNewItem({ name: '', unit: 'each', price: '', description: '' });
      setIsAddingItem(false);
      setCsvMessage('Saved 1 price item.');
    } catch (error) {
      setCsvError(
        getActionErrorMessage(
          error,
          'Unable to save price item. Please try again.'
        )
      );
    } finally {
      setIsSavingItem(false);
    }
  }

  const previewItems = items.slice(0, 5);

  return (
    <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          title="Manual Quoting"
          subtitle="Use simple service items for one-offs, repairs, and jobs that do not fit a rate matrix."
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              resetCsvFeedback();
              setPendingImportItems([]);
              setIsAddingItem((open) => !open);
            }}
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/20 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />
            Add Price Item
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <Upload className="h-4 w-4" />
            Import Excel CSV
          </button>
          <button
            type="button"
            onClick={handleTemplateDownload}
            className="border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <Download className="h-4 w-4" />
            Export Excel CSV
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {csvError && <ErrorAlert>{csvError}</ErrorAlert>}

        {csvMessage && (
          <p className="border-outline-variant bg-surface text-on-surface rounded-xl border px-4 py-3 text-sm">
            {csvMessage}
          </p>
        )}

        {isAddingItem && (
          <form
            onSubmit={handleAddPriceItem}
            className="border-primary/40 bg-primary/5 grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(0,1.5fr)_8rem_8rem_minmax(0,1fr)_auto]"
          >
            <div>
              <label
                htmlFor="manual-service-item"
                className="text-on-surface-variant mb-1 block text-xs font-medium"
              >
                Service / Item
              </label>
              <input
                id="manual-service-item"
                value={newItem.name}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className={cn(formControlClassName, 'px-3')}
              />
            </div>
            <div>
              <label
                htmlFor="manual-unit"
                className="text-on-surface-variant mb-1 block text-xs font-medium"
              >
                Unit
              </label>
              <select
                id="manual-unit"
                value={newItem.unit}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    unit: event.target.value,
                  }))
                }
                className={cn(formControlClassName, 'px-3')}
              >
                {MANUAL_PRICE_BOOK_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="manual-price"
                className="text-on-surface-variant mb-1 block text-xs font-medium"
              >
                Price
              </label>
              <div className="relative">
                <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                  $
                </span>
                <NumericInput
                  id="manual-price"
                  value={newItem.price}
                  sanitize={sanitizeDecimalInput}
                  onValueChange={(value) =>
                    setNewItem((prev) => ({ ...prev, price: value }))
                  }
                  className={cn(formControlClassName, 'pr-2 pl-6 text-right')}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="manual-description"
                className="text-on-surface-variant mb-1 block text-xs font-medium"
              >
                Customer Description
              </label>
              <input
                id="manual-description"
                value={newItem.description}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className={cn(formControlClassName, 'px-3')}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSavingItem}
                className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/20 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 md:w-auto"
              >
                {isSavingItem ? 'Saving...' : 'Save Price Item'}
              </button>
            </div>
          </form>
        )}

        {pendingImportItems.length > 0 && (
          <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-on-surface text-sm font-semibold">
                Review {pendingImportItems.length} item
                {pendingImportItems.length === 1 ? '' : 's'} before import
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingImportItems([]);
                    setCsvMessage(null);
                  }}
                  className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/20 bg-surface-container-lowest inline-flex h-11 items-center rounded-xl border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/20 inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {isImporting ? 'Importing...' : 'Import items'}
                </button>
              </div>
            </div>
            <div className="border-outline-variant mt-3 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-outline-variant bg-surface-container-low border-b">
                    <th className="text-on-surface-variant px-3 py-2 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                      Item
                    </th>
                    <th className="text-on-surface-variant px-3 py-2 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                      Unit
                    </th>
                    <th className="text-on-surface-variant px-3 py-2 text-right text-[10px] font-bold tracking-[0.12em] uppercase">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingImportItems.map((item) => (
                    <tr
                      key={`${item.name}-${item.unit}`}
                      className="border-outline-variant border-b last:border-0"
                    >
                      <td className="text-on-surface px-3 py-2 font-medium">
                        {item.name}
                      </td>
                      <td className="text-on-surface-variant px-3 py-2">
                        {item.unit}
                      </td>
                      <td className="text-on-surface px-3 py-2 text-right font-medium">
                        ${(item.unit_price_cents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-outline-variant bg-surface-container-low/40 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-on-surface text-sm font-semibold">
                Manual price book
              </p>
              <p className="text-on-surface-variant mt-1 text-xs">
                CSV columns: Service / Item, Unit, Price, Category, Customer
                Description.
              </p>
            </div>
            <span className="border-outline-variant text-on-surface-variant bg-surface-container-lowest rounded-lg border px-3 py-1.5 text-xs font-semibold">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {previewItems.length > 0 ? (
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-outline-variant bg-surface-container-low border-b">
                  <th className="text-on-surface-variant px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                    Item
                  </th>
                  <th className="text-on-surface-variant px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                    Unit
                  </th>
                  <th className="text-on-surface-variant px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.12em] uppercase">
                    Price
                  </th>
                  <th className="text-on-surface-variant px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-outline-variant border-b last:border-0"
                  >
                    <td className="text-on-surface px-4 py-3 font-medium">
                      {item.name}
                    </td>
                    <td className="text-on-surface-variant px-4 py-3">
                      {item.unit}
                    </td>
                    <td className="text-on-surface px-4 py-3 text-right font-medium">
                      ${(item.unit_price_cents / 100).toFixed(2)}
                    </td>
                    <td className="text-on-surface-variant px-4 py-3 capitalize">
                      {item.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border-outline-variant bg-surface-container-low/40 rounded-xl border border-dashed p-10 text-center">
            <p className="text-on-surface text-sm font-semibold">
              No manual price items yet.
            </p>
            <p className="text-on-surface-variant mt-1.5 text-xs">
              Add items from CSV here or one-by-one in Material / Service.
            </p>
          </div>
        )}
      </div>
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
            className={cn(
              formControlClassName,
              'min-w-[8rem] px-2.5 font-semibold'
            )}
          />
          <div className="border-outline-variant bg-surface-container-low inline-flex w-fit rounded-xl border p-0.5">
            {EXTERIOR_RATE_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onCustomUpdate(custom.id, { unit })}
                className={`focus-visible:ring-primary/20 min-h-11 rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  custom.unit === unit
                    ? 'text-primary bg-surface-container-lowest shadow-sm'
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
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/5 focus-visible:ring-primary/20 bg-surface-container-lowest inline-flex h-11 items-center gap-1.5 rounded-xl border border-dashed px-4 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
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
const DISPLAY_PRICING_METHODS: Exclude<
  PricingMethod,
  'sqm_rate' | 'room_rate'
>[] = ['manual', 'detailed_quick', 'hybrid', 'day_rate'];

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
  manual:
    'Add service prices directly, or import/export a simple CSV price book.',
};

// ─── Main form ────────────────────────────────────────────────────────────────

export function PriceRatesForm({
  defaultRates,
  manualItems = [],
  manualItemsError = null,
  updateRateSettingsAction,
  createMaterialItem,
  importMaterialItems,
}: {
  defaultRates: UserRateSettings;
  manualItems?: MaterialItem[];
  manualItemsError?: string | null;
  updateRateSettingsAction: UpdateRateSettingsAction;
  createMaterialItem: CreateMaterialItemAction;
  importMaterialItems: ImportMaterialItemsAction;
}) {
  const [rates, setRates] = useState<UserRateSettings>(defaultRates);
  const [activeTab, setActiveTab] = useState<PricingMethod>('manual');
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
      try {
        const result = await updateRateSettingsAction(nextRates);
        if (result.error) setError(result.error);
        else setSaved(true);
      } catch (error) {
        setError(
          getActionErrorMessage(
            error,
            'Unable to save price rates. Please try again.'
          )
        );
      }
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
  const detailedSetupIssues = advancedSetupIssues.filter((issue) =>
    ['zero_door_unit_rate', 'zero_window_unit_rate'].includes(issue.code)
  );
  const zeroDoorWindowCount = countIssues(advancedSetupIssues, [
    'zero_door_unit_rate',
    'zero_window_unit_rate',
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {activeTab !== 'manual' && (
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
            title="Detailed setup"
            items={[
              {
                label: 'zero door/window unit',
                value: String(zeroDoorWindowCount),
              },
              {
                label: saved ? 'saved' : 'unsaved edits',
                value: saved ? 'Rates' : 'Has',
              },
            ]}
            issues={detailedSetupIssues}
          />
        </div>
      )}
      {/* ── Method bar ──────────────────────────────────────────────────────── */}
      <div>
        <div
          className="border-outline-variant no-scrollbar bg-surface-container-lowest flex gap-1 overflow-x-auto rounded-xl border p-1 shadow-sm"
          role="tablist"
          aria-label="Pricing method"
        >
          {DISPLAY_PRICING_METHODS.map((m) => {
            const isActive = activeTab === m;
            const MethodIcon = METHOD_ICONS[m];
            const isStartMethod = m === 'manual';
            return (
              <button
                key={m}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleTabChange(m)}
                className={`focus-visible:ring-primary/20 inline-flex h-11 min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <MethodIcon className="h-4 w-4 shrink-0" />
                {PRICING_METHOD_LABELS[m]}
                {isStartMethod && (
                  <span
                    className={`inline-flex min-h-5 items-center rounded-full px-2 text-[10px] font-extrabold tracking-wider uppercase ${
                      isActive
                        ? 'bg-on-primary/20 text-on-primary'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    Start here
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-outline-variant bg-surface-container-low text-on-surface-variant mt-2.5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed">
          <Info
            className="text-primary mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
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
      {activeTab === 'manual' && (
        <ManualTab
          initialItems={manualItems}
          initialError={manualItemsError}
          createMaterialItem={createMaterialItem}
          importMaterialItems={importMaterialItems}
        />
      )}

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
                    className={`focus-visible:ring-primary/20 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:outline-none ${
                      isActive
                        ? 'text-on-surface bg-surface-container-lowest shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`}
                    />
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
      {activeTab !== 'manual' && (
        <div className="border-outline-variant bg-surface-container-lowest/92 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 shadow-md backdrop-blur-sm md:bottom-4">
          <div className="flex items-center gap-2 text-xs">
            {error && (
              <span
                role="alert"
                className="text-error flex items-center gap-1.5"
              >
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
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/20 disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:hover:bg-surface-container-high inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving…' : 'Save Rates'}
          </button>
        </div>
      )}
    </form>
  );
}
