'use client';

import { useState } from 'react';
import { NumericInput, sanitizeDecimalInput } from '@/components/shared/NumericInput';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItemCategory,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '../domain/types';

const FIELD = 'h-12 w-full rounded-xl border border-outline bg-white px-4 text-base text-on-surface focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-fixed/30';
const LABEL = 'block text-sm font-medium text-on-surface mb-1.5';
const SELECT = `${FIELD} cursor-pointer`;

function getInitialLitres(unit?: string | null) {
  if (!unit) return '';

  const match = unit.trim().match(/^(\d+(?:\.\d+)?)\s*[lL]$/);
  return match?.[1] ?? '';
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Item could not be saved. Please try again.';
}

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
  const [brand, setBrand] = useState('');
  const [itemName, setItemName] = useState(defaultValues?.name ?? '');
  const [litres, setLitres] = useState(getInitialLitres(defaultValues?.unit));
  const [serviceNotes, setServiceNotes] = useState(
    defaultValues?.category === 'service'
      ? (defaultValues?.notes?.trim() || '')
      : ''
  );

  const isServiceCategory = form.category === 'service';

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextCategory = e.target.value as MaterialItemCategory;
    setForm((prev) => ({ ...prev, category: nextCategory }));
    setError(null);

    if (nextCategory === 'service' && !serviceNotes.trim()) {
      setServiceNotes('');
    }

    if (nextCategory !== 'service' && !itemName.trim()) {
      setItemName(serviceNotes.trim());
    }
  }

  function handlePriceChange(value: string) {
    const dollars = value.trim() === '' ? 0 : parseFloat(value);
    if (!Number.isFinite(dollars)) {
      return;
    }
    setForm((prev) => ({ ...prev, unit_price_cents: Math.round(dollars * 100) }));
    setError(null);
  }

  function buildPayload(): MaterialItemUpsertInput | null {
    if (isServiceCategory) {
      const trimmedName = itemName.trim();
      if (!trimmedName) {
        setError('Service title is required.');
        return null;
      }

      return {
        ...form,
        name: trimmedName,
        unit: 'item',
        notes: serviceNotes.trim() || undefined,
      };
    }

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setError('Item name is required.');
      return null;
    }

    const trimmedBrand = brand.trim();
    const normalizedLitres = sanitizeDecimalInput(litres).replace(/\.$/, '').trim();

    return {
      ...form,
      name: [trimmedBrand, trimmedName].filter(Boolean).join(' '),
      unit: normalizedLitres ? `${normalizedLitres}L` : 'item',
      notes: undefined,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await onSubmit(payload);
      if (result?.error) setError(result.error);
    } catch (submitError) {
      setError(getSubmitErrorMessage(submitError));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div>
        <label htmlFor="category" className={LABEL}>Category</label>
        <select id="category" name="category" value={form.category} onChange={handleCategoryChange} className={SELECT}>
          {MATERIAL_ITEM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{MATERIAL_ITEM_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {!isServiceCategory ? (
        <>
          <div>
            <label htmlFor="brand" className={LABEL}>Brand <span className="font-normal text-on-surface-variant">(optional)</span></label>
            <input
              id="brand"
              name="brand"
              type="text"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Dulux"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="item_name" className={LABEL}>Item Name</label>
            <input
              id="item_name"
              name="item_name"
              type="text"
              required
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Wash & Wear"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="litres" className={LABEL}>Size (L) <span className="font-normal text-on-surface-variant">(optional)</span></label>
            <NumericInput
              id="litres"
              name="litres"
              value={litres}
              sanitize={sanitizeDecimalInput}
              onValueChange={(value) => {
                setLitres(value);
                setError(null);
              }}
              className={FIELD}
              placeholder="e.g. 10"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="service_title" className={LABEL}>Service Title</label>
            <input
              id="service_title"
              name="service_title"
              type="text"
              required
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Ceiling repaint"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="service_notes" className={LABEL}>Notes <span className="font-normal text-on-surface-variant">(optional)</span></label>
            <textarea
              id="service_notes"
              name="service_notes"
              rows={3}
              value={serviceNotes}
              onChange={(e) => {
                setServiceNotes(e.target.value);
                setError(null);
              }}
              placeholder="Describe the service"
              className="w-full rounded-xl border border-outline bg-white px-4 py-3 text-base text-on-surface focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-fixed/30 resize-none"
            />
          </div>
        </>
      )}

      {/* Unit Price */}
      <div>
        <label htmlFor="unit_price" className={LABEL}>Price (AUD)</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-on-surface-variant">$</span>
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

      {error && (
        <p className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-12 flex-1 rounded-xl border border-outline bg-white text-base font-medium text-on-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isPending ||
            !itemName.trim()
          }
          className="h-12 flex-[1.35] rounded-xl bg-primary text-base font-semibold text-on-primary disabled:opacity-50"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
