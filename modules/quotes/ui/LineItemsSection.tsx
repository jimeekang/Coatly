'use client';

import { useState } from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';
import { LineItemPicker } from './LineItemPicker';
import {
  NumericInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import type { MaterialItem } from '@/modules/materials/domain/types';
import type { QuoteLineItemFormInput } from '@/modules/quotes/domain/quote-schema';
import { calculateQuoteLineItemsSubtotal } from '@/modules/quotes/domain/quotes';
import { formatAUD } from '@/utils/format';
import { cn } from '@/lib/utils';
import { formControlClassName } from '@/components/forms/FormField';

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

  const parsed = isWholeNumberQuantity(category)
    ? Number.parseInt(draft, 10)
    : Number.parseFloat(draft);
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
      sanitize={
        isWholeNumberQuantity(entry.category)
          ? sanitizeWholeNumberQuantityInput
          : sanitizeDecimalInput
      }
      onValueChange={(draft) => {
        const nextQuantity = parseQuantityDraft(entry.category, draft);
        if (nextQuantity != null) {
          onChange(nextQuantity);
        }
      }}
      className={cn(formControlClassName, 'w-20 px-2 text-center')}
      aria-label={`${entry.name} quantity`}
    />
  );
}

export function LineItemsSection({
  libraryItems,
  value,
  onChange,
}: LineItemsSectionProps) {
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
      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-on-surface-variant text-sm font-semibold tracking-wide uppercase">
            Materials &amp; Services
          </h3>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-primary text-on-primary focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {entries.length === 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary focus-visible:ring-primary/30 mt-4 flex min-h-11 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-6 focus-visible:ring-2 focus-visible:outline-none"
          >
            <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Add paints, supplies, and services
            </span>
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry._key}
                className="border-outline-variant bg-surface-container/40 rounded-2xl border px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-on-surface truncate text-sm font-medium">
                      {entry.name}
                    </p>
                    <p className="text-on-surface-variant mt-0.5 text-xs">
                      {formatAUD(entry.unit_price_cents)} / {entry.unit}
                    </p>
                    {entry.notes && (
                      <p className="text-on-surface-variant mt-1 text-xs">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-on-surface-variant hover:bg-error-container hover:text-error focus-visible:ring-error/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-outline-variant/70 mt-3 flex items-center gap-2 border-t pt-3">
                  <label className="sr-only">Quantity</label>
                  <QuantityInput
                    entry={entry}
                    onChange={(quantity) => handleQtyChange(index, quantity)}
                  />
                  <span className="text-on-surface-variant text-xs">
                    {entry.unit}
                  </span>
                  <span className="text-on-surface ml-2 text-sm font-semibold">
                    {formatAUD(entry.total_cents)}
                  </span>
                </div>
              </div>
            ))}

            {/* Subtotal */}
            <div className="bg-primary/15 mt-1 rounded-xl px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">
                  Items subtotal (ex GST)
                </span>
                <span className="text-on-surface font-semibold">
                  {formatAUD(subtotal)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-on-surface-variant">GST (10%)</span>
                <span className="text-on-surface-variant">
                  {formatAUD(gst)}
                </span>
              </div>
              <div className="border-primary/20 mt-1.5 flex justify-between border-t pt-1.5 text-sm">
                <span className="text-on-surface font-semibold">
                  Items total (inc GST)
                </span>
                <span className="text-primary font-bold">
                  {formatAUD(subtotal + gst)}
                </span>
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
