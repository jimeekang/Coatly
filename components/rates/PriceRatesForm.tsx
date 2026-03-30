'use client';

import { useState, useTransition } from 'react';
import { updateRateSettingsAction } from '@/app/actions/settings';
import {
  COATING_LABELS,
  COATING_TYPES,
  DOOR_SCOPE_LABELS,
  DOOR_SCOPES,
  RATE_DOOR_TYPE_LABELS,
  RATE_DOOR_TYPES,
  SQM_SURFACE_TYPE_LABELS,
  SQM_SURFACE_TYPES,
  TRIM_PAINT_SYSTEM_LABELS,
  TRIM_PAINT_SYSTEMS,
  WINDOW_SCOPE_LABELS,
  WINDOW_SCOPES,
  WINDOW_TYPE_LABELS,
  WINDOW_TYPES,
  type DoorScope,
  type RateDoorType,
  type TrimPaintSystem,
  type UserRateSettings,
  type WindowScope,
  type WindowType,
} from '@/lib/rate-settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(value: string): number | null {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function PriceInput({
  value,
  unit,
  onChange,
  width = 'w-24',
}: {
  value: number;
  unit: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <div className="relative inline-flex items-center">
      <span className="absolute left-3 text-sm text-pm-secondary">$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        defaultValue={centsToDisplay(value)}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} rounded-lg border border-pm-border bg-white py-2 pl-6 pr-2 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30`}
      />
      <span className="ml-1.5 text-xs text-pm-secondary">{unit}</span>
    </div>
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
      className="h-4 w-4 rounded border-pm-border accent-pm-teal"
    />
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-pm-body">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-pm-secondary">{subtitle}</p>}
    </div>
  );
}

// ─── Section: Surface per-m² rates ────────────────────────────────────────────

function SurfaceRatesSection({
  rates,
  onSurfaceChange,
}: {
  rates: UserRateSettings;
  onSurfaceChange: (surface: keyof UserRateSettings, coating: string, v: string) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Surface Rates"
        subtitle="Your default rate per m² for walls, ceiling and trim."
      />
      <div className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-pm-border bg-pm-surface">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Surface
              </th>
              {COATING_TYPES.map((c) => (
                <th key={c} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  {COATING_LABELS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SQM_SURFACE_TYPES.map((surface, i) => (
              <tr key={surface} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                <td className="px-4 py-3 font-medium text-pm-body">
                  {SQM_SURFACE_TYPE_LABELS[surface]}
                </td>
                {COATING_TYPES.map((coating) => (
                  <td key={coating} className="px-4 py-2 text-center">
                    <PriceInput
                      value={rates[surface][coating]}
                      unit="/m²"
                      onChange={(v) => onSurfaceChange(surface, coating, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
  onDoorRateChange: (ps: TrimPaintSystem, dt: RateDoorType, scope: DoorScope, v: string) => void;
  onDoorTypeToggle: (dt: RateDoorType, enabled: boolean) => void;
  onDoorScopeToggle: (scope: DoorScope, enabled: boolean) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Door Rates"
        subtitle="Per-door pricing by type and scope. Toggle 'Offer' to include in quotes."
      />

      {/* Door scope availability */}
      <div className="mb-4 overflow-x-auto rounded-2xl border border-pm-border bg-white">
        <div className="border-b border-pm-border bg-pm-surface px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
            Available Scopes (applies to all door types)
          </p>
        </div>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-pm-border bg-pm-surface/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-pm-secondary">Scope</th>
              {TRIM_PAINT_SYSTEMS.map((ps) => (
                <th key={ps} className="px-4 py-2 text-center text-xs font-medium text-pm-secondary">
                  {TRIM_PAINT_SYSTEM_LABELS[ps]}
                </th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-medium text-pm-secondary">Offer</th>
            </tr>
          </thead>
          <tbody>
            {DOOR_SCOPES.map((scope, i) => (
              <tr key={scope} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                <td className="px-4 py-3 font-medium text-pm-body">{DOOR_SCOPE_LABELS[scope]}</td>
                {TRIM_PAINT_SYSTEMS.map((ps) => (
                  <td key={ps} className="px-4 py-2 text-center">
                    <PriceInput
                      value={rates.door_unit_rates[ps].standard[scope]}
                      unit="/door"
                      onChange={(v) => onDoorRateChange(ps, 'standard', scope, v)}
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-center">
                  <OfferCheckbox
                    checked={rates.enabled_door_scopes.includes(scope)}
                    onChange={(enabled) => onDoorScopeToggle(scope, enabled)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per door type pricing */}
      <div className="space-y-3">
        {RATE_DOOR_TYPES.map((doorType) => {
          const isEnabled = rates.enabled_door_types.includes(doorType);
          return (
            <div key={doorType} className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
              <div className="flex items-center justify-between border-b border-pm-border bg-pm-surface px-4 py-2.5">
                <span className="text-sm font-semibold text-pm-body">
                  {RATE_DOOR_TYPE_LABELS[doorType]}
                </span>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-pm-secondary">
                  <span>Offer</span>
                  <OfferCheckbox
                    checked={isEnabled}
                    onChange={(enabled) => onDoorTypeToggle(doorType, enabled)}
                  />
                </label>
              </div>
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-pm-border bg-pm-surface/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-pm-secondary">Scope</th>
                    {TRIM_PAINT_SYSTEMS.map((ps) => (
                      <th key={ps} className="px-4 py-2 text-center text-xs font-medium text-pm-secondary">
                        {TRIM_PAINT_SYSTEM_LABELS[ps]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOOR_SCOPES.map((scope, i) => (
                    <tr key={scope} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                      <td className="px-4 py-2.5 font-medium text-pm-body">
                        {DOOR_SCOPE_LABELS[scope]}
                      </td>
                      {TRIM_PAINT_SYSTEMS.map((ps) => (
                        <td key={ps} className="px-4 py-2 text-center">
                          <PriceInput
                            value={rates.door_unit_rates[ps][doorType][scope]}
                            unit="/door"
                            onChange={(v) => onDoorRateChange(ps, doorType, scope, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section: Window rates by type ────────────────────────────────────────────

function WindowRatesSection({
  rates,
  onWindowRateChange,
  onWindowTypeToggle,
}: {
  rates: UserRateSettings;
  onWindowRateChange: (ps: TrimPaintSystem, type: WindowType, scope: WindowScope, v: string) => void;
  onWindowTypeToggle: (type: WindowType, enabled: boolean) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Window Rates"
        subtitle="Per-window pricing by type and scope. Toggle 'Offer' to include in quotes."
      />
      <div className="space-y-3">
        {WINDOW_TYPES.map((type) => {
          const isEnabled = rates.enabled_window_types.includes(type);
          return (
            <div key={type} className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
              <div className="flex items-center justify-between border-b border-pm-border bg-pm-surface px-4 py-2.5">
                <span className="text-sm font-semibold text-pm-body">
                  {WINDOW_TYPE_LABELS[type]}
                </span>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-pm-secondary">
                  <span>Offer</span>
                  <OfferCheckbox
                    checked={isEnabled}
                    onChange={(enabled) => onWindowTypeToggle(type, enabled)}
                  />
                </label>
              </div>
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-pm-border bg-pm-surface/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-pm-secondary">Scope</th>
                    {TRIM_PAINT_SYSTEMS.map((ps) => (
                      <th key={ps} className="px-4 py-2 text-center text-xs font-medium text-pm-secondary">
                        {TRIM_PAINT_SYSTEM_LABELS[ps]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WINDOW_SCOPES.map((scope, i) => (
                    <tr key={scope} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                      <td className="px-4 py-2.5 font-medium text-pm-body">
                        {WINDOW_SCOPE_LABELS[scope]}
                      </td>
                      {TRIM_PAINT_SYSTEMS.map((ps) => (
                        <td key={ps} className="px-4 py-2 text-center">
                          <PriceInput
                            value={rates.window_unit_rates[ps][type][scope]}
                            unit="/window"
                            onChange={(v) => onWindowRateChange(ps, type, scope, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function PriceRatesForm({ defaultRates }: { defaultRates: UserRateSettings }) {
  const [rates, setRates] = useState<UserRateSettings>(defaultRates);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Surface handler ──────────────────────────────────────────────────────────
  function handleSurfaceChange(surface: keyof UserRateSettings, coating: string, value: string) {
    setSaved(false);
    const cents = displayToCents(value);
    if (cents === null) return;
    setRates((prev) => ({
      ...prev,
      [surface]: { ...(prev[surface] as object), [coating]: cents },
    }));
  }

  // ── Door handlers ────────────────────────────────────────────────────────────
  function handleDoorRateChange(ps: TrimPaintSystem, dt: RateDoorType, scope: DoorScope, value: string) {
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
        ? [...prev.enabled_door_types, dt]
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
  function handleWindowRateChange(ps: TrimPaintSystem, type: WindowType, scope: WindowScope, value: string) {
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
        ? [...prev.enabled_window_types, type]
        : prev.enabled_window_types.filter((t) => t !== type),
    }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updateRateSettingsAction(rates);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <SurfaceRatesSection rates={rates} onSurfaceChange={handleSurfaceChange} />
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

      {error && (
        <p className="rounded-xl border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-pm-teal bg-pm-teal-pale/20 px-4 py-3 text-sm text-pm-teal">
          Rates saved successfully.
        </p>
      )}

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-pm-border bg-white/90 px-5 py-3 shadow-sm backdrop-blur-sm">
        <p className="text-xs text-pm-secondary">
          Rates pre-fill new quotes. Toggle "Offer" to control which options appear in the estimator.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="ml-4 inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-pm-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Rates'}
        </button>
      </div>
    </form>
  );
}
