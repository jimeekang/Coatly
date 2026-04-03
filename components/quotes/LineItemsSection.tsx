'use client';

import { useState } from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';
import { LineItemPicker } from './LineItemPicker';
import type { MaterialItem, QuoteLineItemFormInput } from '@/lib/supabase/validators';

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

export function LineItemsSection({ libraryItems, value, onChange }: LineItemsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const entries: LineItemEntry[] = value.map((item, i) => ({
    ...item,
    _key: `${i}`,
    total_cents: Math.round(item.quantity * item.unit_price_cents),
  }));

  const subtotal = entries.reduce((sum, e) => sum + e.total_cents, 0);
  const gst = Math.round(subtotal * 0.1);

  function handleAdd(item: QuoteLineItemFormInput) {
    onChange([...value, item]);
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
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Materials &amp; Services
          </h3>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-pm-teal px-3 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {entries.length === 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-pm-border py-6 text-pm-secondary hover:border-pm-teal-mid hover:text-pm-teal"
          >
            <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-sm font-medium">Add paints, supplies, and services</span>
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry._key}
                className="flex items-center gap-3 rounded-xl border border-pm-border bg-pm-surface/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-pm-body">{entry.name}</p>
                  <p className="mt-0.5 text-xs text-pm-secondary">
                    {formatAUD(entry.unit_price_cents)} / {entry.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label className="sr-only">Quantity</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={entry.quantity}
                      onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                      className="h-9 w-20 rounded-lg border border-pm-border bg-white px-2 text-center text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none"
                      aria-label={`${entry.name} quantity`}
                    />
                    <span className="text-xs text-pm-secondary">{entry.unit}</span>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-pm-body">
                    {formatAUD(entry.total_cents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-coral-light hover:text-pm-coral-dark"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Subtotal */}
            <div className="mt-1 rounded-xl bg-pm-teal-pale/20 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-pm-secondary">Items subtotal (ex GST)</span>
                <span className="font-semibold text-pm-body">{formatAUD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-pm-secondary">GST (10%)</span>
                <span className="text-pm-secondary">{formatAUD(gst)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1.5 border-t border-pm-teal/20 pt-1.5">
                <span className="font-semibold text-pm-body">Items total (inc GST)</span>
                <span className="font-bold text-pm-teal">{formatAUD(subtotal + gst)}</span>
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
