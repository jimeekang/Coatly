'use client';

import { useState, useTransition } from 'react';
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
  PRICING_METHOD_LABELS,
  PRICING_METHODS,
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
  type DoorScope,
  type MaterialCostMethod,
  type PricingMethodSettings,
  type RateDoorType,
  type RoomRatePreset,
  type TrimPaintSystem,
  type UserRateSettings,
  type WindowScope,
  type WindowType,
} from '@/lib/rate-settings';
import type { PricingMethod } from '@/types/quote';

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

function normalizeStoredPreferredPricingMethod(method: PricingMethod): PricingMethod {
  return method === 'sqm_rate' ? 'hybrid' : method;
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
      <NumericInput
        value={centsToDisplay(value)}
        sanitize={sanitizeDecimalInput}
        onValueChange={onChange}
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

// ─── Section: Surface per-sqm rates ───────────────────────────────────────────

function WallCeilingRatesSection({
  rates,
  onSurfaceChange,
}: {
  rates: UserRateSettings;
  onSurfaceChange: (surface: keyof UserRateSettings, coating: string, v: string) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Wall & Ceiling Rates"
        subtitle="Default rate per sqm for walls and ceiling by coating type."
      />
      <div className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-pm-border bg-pm-surface">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Surface
              </th>
              {WALL_CEILING_COATING_TYPES.map((c) => (
                <th key={c} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  {COATING_LABELS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['walls', 'ceiling'] as const).map((surface, i) => (
              <tr key={surface} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                <td className="px-4 py-3 font-medium text-pm-body">
                  {SQM_SURFACE_TYPE_LABELS[surface]}
                </td>
                {WALL_CEILING_COATING_TYPES.map((coating) => (
                  <td key={coating} className="px-4 py-2 text-center">
                    <PriceInput
                      value={rates[surface][coating]}
                      unit="/sqm"
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

function TrimRatesSection({
  rates,
  onSurfaceChange,
}: {
  rates: UserRateSettings;
  onSurfaceChange: (surface: keyof UserRateSettings, coating: string, v: string) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Trim Rates"
        subtitle="Trim, skirting, and similar metre-based work. New plaster is not available here."
      />
      <div className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-pm-border bg-pm-surface">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Surface
              </th>
              {TRIM_COATING_TYPES.map((coating) => (
                <th key={coating} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  {COATING_LABELS[coating]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-4 py-3 font-medium text-pm-body">
                {SQM_SURFACE_TYPE_LABELS.trim}
              </td>
              {TRIM_COATING_TYPES.map((coating) => (
                <td key={coating} className="px-4 py-2 text-center">
                  <PriceInput
                    value={rates.trim[coating]}
                    unit="/sqm"
                    onChange={(v) => onSurfaceChange('trim', coating, v)}
                  />
                </td>
              ))}
            </tr>
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

// ─── Tab content: Day Rate settings ───────────────────────────────────────────

function DayRateTab({
  pricing,
  onChange,
}: {
  pricing: PricingMethodSettings;
  onChange: (patch: Partial<PricingMethodSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Day Rate Settings"
        subtitle="Set your default labour rate and how material costs are calculated when pricing by the day."
      />
      <div className="space-y-5 rounded-2xl border border-pm-border bg-white p-5">
        {/* Daily labour rate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-pm-body">Daily labour rate</label>
            <div className="relative inline-flex items-center">
              <span className="absolute left-3 text-sm text-pm-secondary">$</span>
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
                className="w-32 rounded-lg border border-pm-border bg-white py-2 pl-6 pr-2 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
              />
              <span className="ml-1.5 text-xs text-pm-secondary">/day</span>
            </div>
            <p className="mt-1 text-xs text-pm-secondary">Your total labour earnings per day</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-pm-body">Target daily earnings</label>
            <div className="relative inline-flex items-center">
              <span className="absolute left-3 text-sm text-pm-secondary">$</span>
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
                  if (raw === '') { onChange({ target_daily_earnings_cents: null }); return; }
                  const nextValue = parseFloat(raw);
                  if (Number.isFinite(nextValue) && nextValue >= 0) {
                    onChange({ target_daily_earnings_cents: Math.round(nextValue * 100) });
                  }
                }}
                className="w-32 rounded-lg border border-pm-border bg-white py-2 pl-6 pr-2 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
              />
              <span className="ml-1.5 text-xs text-pm-secondary">/day</span>
            </div>
            <p className="mt-1 text-xs text-pm-secondary">
              Used in the internal profitability review after a quote is saved.
            </p>
          </div>
        </div>

        {/* Material cost method */}
        <div className="border-t border-pm-border pt-4">
          <label className="mb-2 block text-sm font-medium text-pm-body">Material cost calculation</label>
          <div className="flex items-center gap-4">
            {(['percentage', 'flat'] as MaterialCostMethod[]).map((method) => (
              <label key={method} className="flex cursor-pointer items-center gap-2 text-sm text-pm-body">
                <input
                  type="radio"
                  name="material_cost_method"
                  value={method}
                  checked={pricing.material_cost_method === method}
                  onChange={() => onChange({ material_cost_method: method })}
                  className="accent-pm-teal"
                />
                {method === 'percentage' ? '% of labour cost' : 'Flat amount per day'}
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
                  const nextValue = value.trim() === '' ? 0 : parseInt(value, 10);
                  if (Number.isFinite(nextValue) && nextValue >= 0 && nextValue <= 100) {
                    onChange({ material_cost_percent: nextValue });
                  }
                }}
                className="w-20 rounded-lg border border-pm-border bg-white py-2 px-3 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
              />
              <span className="text-sm text-pm-secondary">% of labour cost</span>
            </div>
          )}
        </div>
      </div>
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
    if (!title.trim() || !Number.isFinite(sqmNum) || sqmNum <= 0 || !Number.isFinite(rateNum) || rateNum < 0) return;
    onSave(title.trim(), sqmNum, Math.round(rateNum * 100));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-pm-teal/40 bg-pm-teal-pale/10 p-4">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium text-pm-secondary">Room name</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Master Bedroom"
          className="w-full rounded-lg border border-pm-border bg-white px-3 py-2 text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-pm-secondary">Size (sqm)</label>
        <div className="relative inline-flex items-center">
          <NumericInput
            inputMode="decimal"
            value={sqm}
            sanitize={sanitizeDecimalInput}
            onValueChange={setSqm}
            placeholder="20"
            className="w-24 rounded-lg border border-pm-border bg-white py-2 px-3 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
          <span className="ml-1.5 text-xs text-pm-secondary">sqm</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-pm-secondary">Flat rate</label>
        <div className="relative inline-flex items-center">
          <span className="absolute left-3 text-sm text-pm-secondary">$</span>
          <NumericInput
            value={rate}
            sanitize={sanitizeDecimalInput}
            onValueChange={setRate}
            placeholder="450"
            className="w-28 rounded-lg border border-pm-border bg-white py-2 pl-6 pr-2 text-right text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-9 items-center rounded-xl bg-pm-teal px-4 text-sm font-semibold text-white hover:bg-pm-teal-hover"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body hover:bg-pm-surface"
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
    <div className="space-y-4">
      <SectionHeading
        title="Room Rate Presets"
        subtitle="Define your standard room rates. Select them when creating quotes to quickly price by room."
      />

      {/* Preset list */}
      {presets.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-pm-border bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-pm-border bg-pm-surface">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-pm-secondary">Room</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">Size</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">Flat Rate</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-pm-secondary">$/sqm</th>
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
                  <tr key={preset.id} className={i % 2 === 0 ? 'bg-white' : 'bg-pm-surface/40'}>
                    <td className="px-4 py-3 font-medium text-pm-body">{preset.title}</td>
                    <td className="px-4 py-3 text-center text-pm-secondary">{preset.sqm} sqm</td>
                    <td className="px-4 py-3 text-center font-medium text-pm-body">
                      ${(preset.rate_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-pm-secondary">
                      {preset.sqm > 0 ? `$${(preset.rate_cents / preset.sqm / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingId(preset.id); setIsAdding(false); }}
                          className="rounded-lg border border-pm-border bg-white px-3 py-1.5 text-xs font-medium text-pm-body hover:bg-pm-surface"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(preset.id)}
                          className="rounded-lg border border-pm-coral/30 bg-white px-3 py-1.5 text-xs font-medium text-pm-coral hover:bg-pm-coral-light"
                        >
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
        <div className="rounded-2xl border border-pm-border bg-white p-8 text-center">
          <p className="text-sm font-medium text-pm-body">No room presets yet</p>
          <p className="mt-1 text-xs text-pm-secondary">
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

      {/* Add button */}
      {!isAdding && (
        <button
          type="button"
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-pm-teal/50 bg-white px-4 text-sm font-medium text-pm-teal hover:border-pm-teal hover:bg-pm-teal-pale/10"
        >
          <span className="text-base leading-none">+</span>
          Add Room
        </button>
      )}
    </div>
  );
}

// ─── Tab content: Manual placeholder ──────────────────────────────────────────

function ManualTab() {
  return (
    <div className="space-y-4">
      <SectionHeading
        title="Manual Pricing"
        subtitle="Enter labour and material costs directly when creating a quote."
      />
      <div className="rounded-2xl border border-pm-border bg-white p-6 text-center">
        <p className="text-sm font-medium text-pm-body">No preset rates needed</p>
        <p className="mt-1 text-xs text-pm-secondary">
          With manual pricing, you enter the exact labour and material costs for each job.
          No default rates are required.
        </p>
      </div>
    </div>
  );
}

// ─── Method tab icons ─────────────────────────────────────────────────────────

/** Pricing methods shown in the settings UI. sqm_rate is normalized to hybrid. */
const DISPLAY_PRICING_METHODS = PRICING_METHODS.filter((m) => m !== 'sqm_rate') as Exclude<PricingMethod, 'sqm_rate'>[];

const METHOD_ICONS: Record<PricingMethod, string> = {
  hybrid: '📏',
  sqm_rate: '📏',
  day_rate: '📅',
  room_rate: '🏠',
  manual: '✏️',
};

const METHOD_DESCRIPTIONS: Record<PricingMethod, string> = {
  hybrid: 'Anchor-based detailed estimate',
  sqm_rate: 'Anchor-based detailed estimate',
  day_rate: 'Labour days × daily rate',
  room_rate: 'Flat rate per room',
  manual: 'Enter costs directly',
};

// ─── Main form ────────────────────────────────────────────────────────────────

export function PriceRatesForm({ defaultRates }: { defaultRates: UserRateSettings }) {
  const [rates, setRates] = useState<UserRateSettings>(defaultRates);
  const [activeTab, setActiveTab] = useState<PricingMethod>(
    normalizeStoredPreferredPricingMethod(defaultRates.pricing.preferred_pricing_method)
  );
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

  // ── Room rate preset handlers ────────────────────────────────────────────────
  function handleRoomPresetAdd(preset: RoomRatePreset) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      room_rate_presets: [...prev.room_rate_presets, preset],
    }));
  }

  function handleRoomPresetUpdate(id: string, patch: Omit<RoomRatePreset, 'id'>) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      room_rate_presets: prev.room_rate_presets.map((p) =>
        p.id === id ? { id, ...patch } : p
      ),
    }));
  }

  function handleRoomPresetDelete(id: string) {
    setSaved(false);
    setRates((prev) => ({
      ...prev,
      room_rate_presets: prev.room_rate_presets.filter((p) => p.id !== id),
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

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const nextRates: UserRateSettings = {
      ...rates,
      pricing: {
        ...rates.pricing,
        preferred_pricing_method: normalizeStoredPreferredPricingMethod(activeTab),
      },
    };
    startTransition(async () => {
      const result = await updateRateSettingsAction(nextRates);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Method tabs ─────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
          Preferred Pricing Method
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DISPLAY_PRICING_METHODS.map((m) => {
            const isActive = activeTab === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleTabChange(m)}
                className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-pm-teal bg-pm-teal-pale/20'
                    : 'border-pm-border bg-white hover:border-pm-teal-mid'
                }`}
              >
                <span className="text-lg">{METHOD_ICONS[m]}</span>
                <span className={`text-sm font-semibold ${isActive ? 'text-pm-teal' : 'text-pm-body'}`}>
                  {PRICING_METHOD_LABELS[m]}
                </span>
                <span className="text-xs text-pm-secondary">{METHOD_DESCRIPTIONS[m]}</span>
                {isActive && (
                  <span className="mt-0.5 rounded-full bg-pm-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-pm-border bg-pm-surface/45 p-4">
        <h3 className="text-sm font-semibold text-pm-body">How These Settings Apply</h3>
        <div className="mt-3 grid gap-3 text-sm text-pm-secondary sm:grid-cols-2">
          <p>
            Detailed Estimate, day rate, and room rate settings control the defaults used when starting new quotes.
          </p>
          <p>
            Saved door and window rates now flow into the quick and detailed estimate engine. Surface sqm rates are used as a multiplier on the anchor-based estimate.
          </p>
        </div>
      </section>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}

      {/* Detailed Estimate: show surface, door, window rate tables */}
      {activeTab === 'hybrid' && (
        <div className="space-y-10">
          <WallCeilingRatesSection rates={rates} onSurfaceChange={handleSurfaceChange} />
          <TrimRatesSection rates={rates} onSurfaceChange={handleSurfaceChange} />
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

      {/* Day Rate: daily rate + material cost settings */}
      {activeTab === 'day_rate' && (
        <DayRateTab pricing={rates.pricing} onChange={handlePricingChange} />
      )}

      {/* Room Rate: preset manager */}
      {activeTab === 'room_rate' && (
        <RoomRateTab
          rates={rates}
          onAdd={handleRoomPresetAdd}
          onUpdate={handleRoomPresetUpdate}
          onDelete={handleRoomPresetDelete}
        />
      )}

      {/* Manual: informational */}
      {activeTab === 'manual' && <ManualTab />}

      {/* ── Status messages ─────────────────────────────────────────────────── */}
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

      {/* ── Sticky save bar ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-pm-border bg-white/90 px-5 py-3 shadow-sm backdrop-blur-sm">
        <p className="text-xs text-pm-secondary">
          Selecting a tab sets your default pricing method for new quotes.
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
