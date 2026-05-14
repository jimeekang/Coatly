'use client';

import { useState } from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';
import { LineItemPicker } from './LineItemPicker';
import { NumericInput, sanitizeDecimalInput, sanitizeIntegerInput } from '@/components/shared/NumericInput';
import type { MaterialItem, QuoteLineItemFormInput } from '@/lib/supabase/validators';
import { calculateQuoteLineItemsSubtotal } from '@/lib/quotes';

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

interface LineItemEntry extends QuoteLineItemFormInput {
  _key: string;
  total_cents: number;
}

interface LineItemsSectionProps {
  libraryItems: MaterialItem[];
  value: QuoteLineItemFormInput[];
  onChange: (items: QuoteLineItemFormInput[]) => void;
}

function isWholeNumberQuantity(category: QuoteLineItemFormInput['category']) {
  return category === 'paint';
}

function sanitizeWholeNumberQuantityInput(value: string) {
  const [integerPortion] = value.split('.');
  return sanitizeIntegerInput(integerPortion ?? '');
}

function parseQuantityDraft(
  category: QuoteLineItemFormInput['category'],
  draft: string
) {
  if (draft.trim() === '') {
    return null;
  }

  const parsed = isWholeNumberQuantity(category) ? Number.parseInt(draft, 10) : Number.parseFloat(draft);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function QuantityInput({
  entry,
  onChange,
}: {
  entry: LineItemEntry;
  onChange: (quantity: number) => void;
}) {
  return (
    <NumericInput
      value={String(entry.quantity)}
      inputMode={isWholeNumberQuantity(entry.category) ? 'numeric' : 'decimal'}
      sanitize={isWholeNumberQuantity(entry.category) ? sanitizeWholeNumberQuantityInput : sanitizeDecimalInput}
      onValueChange={(draft) => {
        const nextQuantity = parseQuantityDraft(entry.category, draft);
        if (nextQuantity != null) {
          onChange(nextQuantity);
        }
      }}
      className="h-9 w-20 rounded-lg border border-outline-variant bg-white px-2 text-center text-sm text-on-surface focus:border-primary focus:outline-none"
      aria-label={`${entry.name} quantity`}
    />
  );
}

export function LineItemsSection({ libraryItems, value, onChange }: LineItemsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const entries: LineItemEntry[] = value.map((item, i) => ({
    ...item,
    _key: `${i}`,
    total_cents: Math.round(item.quantity * item.unit_price_cents),
  }));

  const subtotal = calculateQuoteLineItemsSubtotal(entries);
  const gst = Math.round(subtotal * 0.1);

  function handleAdd(item: QuoteLineItemFormInput) {
    onChange([
      ...value,
      {
        ...item,
        is_optional: false,
        is_selected: true,
      },
    ]);
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleQtyChange(index: number, qty: number) {
    const next = value.map((item, i) =>
      i === index ? { ...item, quantity: qty } : item
    );
    onChange(next);
  }

  return (
    <>
      <section className="rounded-2xl border border-outline-variant bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Materials &amp; Services
          </h3>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {entries.length === 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant py-6 text-on-surface-variant hover:border-primary hover:text-primary"
          >
            <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-sm font-medium">Add paints, supplies, and services</span>
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry._key}
                className="rounded-xl border border-outline-variant bg-surface-container/40 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">{entry.name}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {formatAUD(entry.unit_price_cents)} / {entry.unit}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-xs text-on-surface-variant">{entry.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-outline-variant/70 pt-3">
                  <label className="sr-only">Quantity</label>
                  <QuantityInput entry={entry} onChange={(quantity) => handleQtyChange(index, quantity)} />
                  <span className="text-xs text-on-surface-variant">{entry.unit}</span>
                  <span className="ml-2 text-sm font-semibold text-on-surface">
                    {formatAUD(entry.total_cents)}
                  </span>
                </div>
              </div>
            ))}

            {/* Subtotal */}
            <div className="mt-1 rounded-xl bg-primary/15 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Items subtotal (ex GST)</span>
                <span className="font-semibold text-on-surface">{formatAUD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-on-surface-variant">GST (10%)</span>
                <span className="text-on-surface-variant">{formatAUD(gst)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1.5 border-t border-primary/20 pt-1.5">
                <span className="font-semibold text-on-surface">Items total (inc GST)</span>
                <span className="font-bold text-primary">{formatAUD(subtotal + gst)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {pickerOpen && (
        <LineItemPicker
          libraryItems={libraryItems}
          onAdd={handleAdd}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
