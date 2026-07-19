'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  NumericInput,
  sanitizeDecimalInput,
} from '@/components/shared/NumericInput';
import { formControlClassName } from '@/components/forms/FormField';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { cn } from '@/lib/utils';
import type {
  MaterialItem,
  MaterialItemCategory,
} from '@/modules/materials/domain/types';
import type { QuoteLineItemFormInput } from '@/modules/quotes/domain/quote-schema';
import { formatAUD } from '@/utils/format';

export interface ExtraLineItemInput {
  _key: string;
  material_item_id: string | null;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  notes: string;
  unit_price_cents: number;
  is_optional: boolean;
}

interface QuoteExtraLineItemsProps {
  libraryItems: MaterialItem[];
  value: ExtraLineItemInput[];
  onChange: (items: ExtraLineItemInput[]) => void;
}

export function toQuoteLineItemFormInput(
  item: ExtraLineItemInput
): QuoteLineItemFormInput {
  return {
    material_item_id: item.material_item_id,
    name: item.name.trim(),
    category: item.category,
    unit: item.unit,
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

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSuggestionScore(query: string, item: MaterialItem) {
  const normalizedQuery = normalizeForMatch(query);
  if (normalizedQuery.length < 2) return 0;

  const name = normalizeForMatch(item.name);
  const notes = normalizeForMatch(item.notes ?? '');

  if (name === normalizedQuery) return 200;
  if (name.startsWith(normalizedQuery)) return 140;
  if (name.includes(normalizedQuery)) return 110;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return 0;

  const nameHits = queryTokens.filter((token) => name.includes(token)).length;
  const noteHits = queryTokens.filter((token) => notes.includes(token)).length;

  return nameHits * 24 + noteHits * 8;
}

function getSuggestedItems(query: string, libraryItems: MaterialItem[]) {
  const activeItems = libraryItems.filter((item) => item.is_active);
  const primaryPool = activeItems.filter((item) => item.category === 'service');
  const fallbackPool = activeItems.filter(
    (item) => item.category !== 'service'
  );

  const rank = (items: MaterialItem[]) =>
    items
      .map((item) => ({ item, score: getSuggestionScore(query, item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.item);

  const primaryMatches = rank(primaryPool);
  if (primaryMatches.length > 0) {
    return primaryMatches;
  }

  return rank(fallbackPool);
}

export function QuoteExtraLineItems({
  libraryItems,
  value,
  onChange,
}: QuoteExtraLineItemsProps) {
  function addItem() {
    onChange([
      ...value,
      {
        _key: nextKey(),
        material_item_id: null,
        name: '',
        category: 'other',
        unit: 'item',
        notes: '',
        unit_price_cents: 0,
        is_optional: false,
      },
    ]);
  }

  function removeItem(key: string) {
    onChange(value.filter((item) => item._key !== key));
  }

  function updateItem(key: string, patch: Partial<ExtraLineItemInput>) {
    onChange(
      value.map((item) => {
        if (item._key !== key) return item;

        const nextItem = { ...item, ...patch };
        if (
          patch.name != null &&
          patch.name !== item.name &&
          patch.material_item_id === undefined
        ) {
          nextItem.material_item_id = null;
        }

        return nextItem;
      })
    );
  }

  function applySuggestedItem(key: string, suggestion: MaterialItem) {
    updateItem(key, {
      material_item_id: suggestion.id,
      name: suggestion.name,
      category: suggestion.category,
      unit: suggestion.unit,
      notes: suggestion.notes ?? '',
      unit_price_cents: suggestion.unit_price_cents,
    });
  }

  const includedSubtotal = value
    .filter((item) => !item.is_optional && item.name.trim())
    .reduce((sum, item) => sum + item.unit_price_cents, 0);

  const optionalSubtotal = value
    .filter((item) => item.is_optional && item.name.trim())
    .reduce((sum, item) => sum + item.unit_price_cents, 0);

  return (
    <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-on-surface-variant text-sm font-semibold tracking-wide uppercase">
          Line Items
        </h3>
        <button
          type="button"
          onClick={addItem}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line Item
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-on-surface-variant mt-3 text-sm">
          Add custom line items — e.g. travel fee, specialty coat, or optional
          upgrades the client can choose.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {value.map((item) => (
            <div
              key={item._key}
              className={[
                'rounded-2xl border p-3',
                item.is_optional
                  ? 'border-warning bg-warning-container/40'
                  : 'border-outline-variant bg-surface-container/40',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Name */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item._key, { name: e.target.value })
                    }
                    placeholder="Item name"
                    className={formControlClassName}
                    aria-label="Line item name"
                  />

                  {(() => {
                    const suggestions = getSuggestedItems(
                      item.name,
                      libraryItems
                    ).filter(
                      (suggestion) => suggestion.id !== item.material_item_id
                    );

                    if (suggestions.length === 0) {
                      return null;
                    }

                    return (
                      <div className="border-primary/20 bg-primary/10 rounded-xl border p-2">
                        <SectionLabel className="text-primary mb-2">
                          Suggested From Saved Services
                        </SectionLabel>
                        <div className="space-y-2">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() =>
                                applySuggestedItem(item._key, suggestion)
                              }
                              className="border-primary/15 bg-surface-container-lowest hover:border-primary hover:bg-primary/10 focus-visible:ring-primary/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                            >
                              <span className="min-w-0">
                                <span className="text-on-surface block truncate text-sm font-medium">
                                  {suggestion.name}
                                </span>
                                <span className="text-on-surface-variant block truncate text-xs">
                                  {formatAUD(suggestion.unit_price_cents)} /{' '}
                                  {suggestion.unit}
                                </span>
                              </span>
                              <span className="text-primary shrink-0 text-xs font-semibold">
                                Autofill
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Description */}
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) =>
                      updateItem(item._key, { notes: e.target.value })
                    }
                    placeholder="Description (optional)"
                    className={formControlClassName}
                    aria-label="Line item description"
                  />

                  {/* Price + Optional toggle */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                        $
                      </span>
                      <NumericInput
                        value={(item.unit_price_cents / 100).toFixed(2)}
                        sanitize={sanitizeDecimalInput}
                        onValueChange={(value) => {
                          const parsed =
                            value.trim() === '' ? 0 : parseFloat(value);
                          if (!Number.isFinite(parsed)) {
                            return;
                          }

                          updateItem(item._key, {
                            unit_price_cents: Math.round(parsed * 100),
                          });
                        }}
                        className={cn(formControlClassName, 'pl-7')}
                        aria-label="Line item price"
                      />
                    </div>

                    <label className="text-on-surface flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={item.is_optional}
                        onChange={(e) =>
                          updateItem(item._key, {
                            is_optional: e.target.checked,
                          })
                        }
                        className="border-outline-variant accent-primary h-4 w-4 rounded"
                        aria-label={`${item.name || 'Line item'} optional`}
                      />
                      Optional
                    </label>
                  </div>

                  {item.is_optional && item.unit_price_cents > 0 && (
                    <p className="text-warning text-xs">
                      Client can choose to add{' '}
                      {formatAUD(item.unit_price_cents)} to the total
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeItem(item._key)}
                  className="text-on-surface-variant hover:bg-error-container hover:text-error focus-visible:ring-error/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={`Remove ${item.name || 'line item'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Subtotal */}
          {(includedSubtotal > 0 || optionalSubtotal > 0) && (
            <div className="bg-primary/15 space-y-1 rounded-xl px-4 py-3">
              {includedSubtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">
                    Included subtotal (ex GST)
                  </span>
                  <span className="text-on-surface font-semibold">
                    {formatAUD(includedSubtotal)}
                  </span>
                </div>
              )}
              {optionalSubtotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-warning">
                    Optional (not included in total)
                  </span>
                  <span className="text-warning">
                    +{formatAUD(optionalSubtotal)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
