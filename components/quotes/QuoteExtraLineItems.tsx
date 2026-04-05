'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { QuoteLineItemFormInput } from '@/lib/supabase/validators';

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

export interface ExtraLineItemInput {
  _key: string;
  name: string;
  notes: string;
  unit_price_cents: number;
  is_optional: boolean;
}

interface QuoteExtraLineItemsProps {
  value: ExtraLineItemInput[];
  onChange: (items: ExtraLineItemInput[]) => void;
}

export function toQuoteLineItemFormInput(item: ExtraLineItemInput): QuoteLineItemFormInput {
  return {
    material_item_id: null,
    name: item.name.trim(),
    category: 'other',
    unit: 'item',
    quantity: 1,
    unit_price_cents: item.unit_price_cents,
    notes: item.notes.trim() || undefined,
    is_optional: item.is_optional,
    is_selected: !item.is_optional,
  };
}

let _keyCounter = 0;
function nextKey() {
  return `extra-${++_keyCounter}`;
}

export function QuoteExtraLineItems({ value, onChange }: QuoteExtraLineItemsProps) {
  function addItem() {
    onChange([
      ...value,
      { _key: nextKey(), name: '', notes: '', unit_price_cents: 0, is_optional: false },
    ]);
  }

  function removeItem(key: string) {
    onChange(value.filter((item) => item._key !== key));
  }

  function updateItem(key: string, patch: Partial<ExtraLineItemInput>) {
    onChange(value.map((item) => (item._key === key ? { ...item, ...patch } : item)));
  }

  const includedSubtotal = value
    .filter((item) => !item.is_optional && item.name.trim())
    .reduce((sum, item) => sum + item.unit_price_cents, 0);

  const optionalSubtotal = value
    .filter((item) => item.is_optional && item.name.trim())
    .reduce((sum, item) => sum + item.unit_price_cents, 0);

  return (
    <section className="rounded-2xl border border-pm-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Line Items
        </h3>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 rounded-lg border border-pm-border bg-white px-3 py-2 text-xs font-semibold text-pm-body hover:border-pm-teal-mid hover:text-pm-teal"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line Item
        </button>
      </div>

      {value.length === 0 ? (
        <p className="mt-3 text-sm text-pm-secondary">
          Add custom line items — e.g. travel fee, specialty coat, or optional upgrades the client can choose.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {value.map((item) => (
            <div
              key={item._key}
              className={[
                'rounded-xl border p-3',
                item.is_optional
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-pm-border bg-pm-surface/40',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Name */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item._key, { name: e.target.value })}
                    placeholder="Item name"
                    className="h-9 w-full rounded-lg border border-pm-border bg-white px-3 text-sm text-pm-body placeholder:text-pm-secondary/60 focus:border-pm-teal-mid focus:outline-none"
                    aria-label="Line item name"
                  />

                  {/* Description */}
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(item._key, { notes: e.target.value })}
                    placeholder="Description (optional)"
                    className="h-9 w-full rounded-lg border border-pm-border bg-white px-3 text-sm text-pm-body placeholder:text-pm-secondary/60 focus:border-pm-teal-mid focus:outline-none"
                    aria-label="Line item description"
                  />

                  {/* Price + Optional toggle */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-pm-secondary">
                        $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={(item.unit_price_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateItem(item._key, {
                            unit_price_cents: Math.round(
                              (parseFloat(e.target.value) || 0) * 100
                            ),
                          })
                        }
                        className="h-9 w-full rounded-lg border border-pm-border bg-white pl-7 pr-3 text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none"
                        aria-label="Line item price"
                      />
                    </div>

                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-pm-body">
                      <input
                        type="checkbox"
                        checked={item.is_optional}
                        onChange={(e) => updateItem(item._key, { is_optional: e.target.checked })}
                        className="h-4 w-4 rounded border-pm-border accent-amber-500"
                        aria-label={`${item.name || 'Line item'} optional`}
                      />
                      Optional
                    </label>
                  </div>

                  {item.is_optional && item.unit_price_cents > 0 && (
                    <p className="text-xs text-amber-600">
                      Client can choose to add {formatAUD(item.unit_price_cents)} to the total
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeItem(item._key)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-coral-light hover:text-pm-coral-dark"
                  aria-label={`Remove ${item.name || 'line item'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Subtotal */}
          {(includedSubtotal > 0 || optionalSubtotal > 0) && (
            <div className="rounded-xl bg-pm-teal-pale/20 px-4 py-3 space-y-1">
              {includedSubtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-pm-secondary">Included subtotal (ex GST)</span>
                  <span className="font-semibold text-pm-body">{formatAUD(includedSubtotal)}</span>
                </div>
              )}
              {optionalSubtotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-amber-600">Optional (not included in total)</span>
                  <span className="text-amber-600">+{formatAUD(optionalSubtotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
