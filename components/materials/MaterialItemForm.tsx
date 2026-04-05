'use client';

import { useState } from 'react';
import { NumericInput, sanitizeDecimalInput } from '@/components/shared/NumericInput';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '@/lib/supabase/validators';

const FIELD = 'h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';
const LABEL = 'block text-sm font-medium text-pm-body mb-1.5';
const SELECT = `${FIELD} cursor-pointer`;

const UNIT_SUGGESTIONS = ['item', 'L', 'kg', 'hr', 'sqm', 'tin', 'roll', 'box', 'bag'];

interface MaterialItemFormProps {
  defaultValues?: MaterialItem;
  onSubmit: (data: MaterialItemUpsertInput) => Promise<{ data?: MaterialItem; error?: string }>;
  onCancel: () => void;
  submitLabel?: string;
}

export function MaterialItemForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Item',
}: MaterialItemFormProps) {
  const [form, setForm] = useState<MaterialItemUpsertInput>({
    name: defaultValues?.name ?? '',
    category: defaultValues?.category ?? 'other',
    unit: defaultValues?.unit ?? 'item',
    unit_price_cents: defaultValues?.unit_price_cents ?? 0,
    notes: defaultValues?.notes ?? '',
    is_active: defaultValues?.is_active ?? true,
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customUnit, setCustomUnit] = useState(
    defaultValues?.unit && !UNIT_SUGGESTIONS.includes(defaultValues.unit)
      ? defaultValues.unit
      : ''
  );
  const [unitMode, setUnitMode] = useState<'preset' | 'custom'>(
    defaultValues?.unit && !UNIT_SUGGESTIONS.includes(defaultValues.unit) ? 'custom' : 'preset'
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function handlePriceChange(value: string) {
    const dollars = value.trim() === '' ? 0 : parseFloat(value);
    if (!Number.isFinite(dollars)) {
      return;
    }
    setForm((prev) => ({ ...prev, unit_price_cents: Math.round(dollars * 100) }));
    setError(null);
  }

  function handleUnitPreset(unit: string) {
    setUnitMode('preset');
    setForm((prev) => ({ ...prev, unit }));
  }

  function handleUnitCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCustomUnit(value);
    setForm((prev) => ({ ...prev, unit: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    const result = await onSubmit(form);
    setIsPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="name" className={LABEL}>Item Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Dulux Wash & Wear 10L"
          className={FIELD}
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className={LABEL}>Category</label>
        <select id="category" name="category" value={form.category} onChange={handleChange} className={SELECT}>
          {MATERIAL_ITEM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{MATERIAL_ITEM_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {/* Unit */}
      <div>
        <label className={LABEL}>Unit</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {UNIT_SUGGESTIONS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitPreset(u)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                unitMode === 'preset' && form.unit === u
                  ? 'border-pm-teal bg-pm-teal text-white'
                  : 'border-pm-border bg-white text-pm-body hover:border-pm-teal-mid'
              }`}
            >
              {u}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUnitMode('custom')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              unitMode === 'custom'
                ? 'border-pm-teal bg-pm-teal text-white'
                : 'border-pm-border bg-white text-pm-body hover:border-pm-teal-mid'
            }`}
          >
            Custom
          </button>
        </div>
        {unitMode === 'custom' && (
          <input
            type="text"
            value={customUnit}
            onChange={handleUnitCustomChange}
            placeholder="e.g. panel, sheet"
            className={FIELD}
          />
        )}
      </div>

      {/* Unit Price */}
      <div>
        <label htmlFor="unit_price" className={LABEL}>Unit Price (AUD)</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-pm-secondary">$</span>
          <NumericInput
            id="unit_price"
            name="unit_price"
            required
            value={(form.unit_price_cents / 100).toFixed(2)}
            sanitize={sanitizeDecimalInput}
            onValueChange={handlePriceChange}
            className={`${FIELD} pl-8`}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={LABEL}>Notes <span className="font-normal text-pm-secondary">(optional)</span></label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          value={form.notes ?? ''}
          onChange={handleChange}
          placeholder="e.g. supplier, colour, spec"
          className="w-full rounded-xl border border-pm-border bg-white px-4 py-3 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-12 flex-1 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !form.name.trim() || !(form.unit ?? '').trim()}
          className="h-12 flex-[1.35] rounded-xl bg-pm-teal text-base font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
