'use client';

import { useState, useTransition } from 'react';
import { setPublicQuoteOptionalLineItemSelection } from '@/modules/quotes/application/actions';
import { formatAUD } from '@/utils/format';
import { groupQuoteLineItemsByCategory } from '@/modules/quotes/domain/quotes';

interface OptionalItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  is_selected: boolean;
}

interface PublicOptionalItemsProps {
  quoteToken: string;
  items: OptionalItem[];
  canEdit: boolean;
  onSelectionsChange: (selectedIds: Set<string>) => void;
}

interface SelectionOverride {
  baseIsSelected: boolean;
  isSelected: boolean;
}

export function PublicOptionalItems({
  quoteToken,
  items,
  canEdit,
  onSelectionsChange,
}: PublicOptionalItemsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectionOverrides, setSelectionOverrides] = useState<
    Record<string, SelectionOverride>
  >({});

  const displayItems = items.map((item) => {
    const override = selectionOverrides[item.id];
    if (!override || item.is_selected !== override.baseIsSelected) {
      return item;
    }
    return { ...item, is_selected: override.isSelected };
  });

  const handleToggle = (item: OptionalItem) => {
    if (!canEdit || isPending) return;
    const next = !item.is_selected;
    const hadPreviousOverride = Object.prototype.hasOwnProperty.call(
      selectionOverrides,
      item.id
    );
    const previousOverride = selectionOverrides[item.id];

    setSelectionOverrides((current) => ({
      ...current,
      [item.id]: {
        baseIsSelected: item.is_selected,
        isSelected: next,
      },
    }));

    startTransition(async () => {
      setError(null);

      const fd = new FormData();
      fd.append('quoteToken', quoteToken);
      fd.append('lineItemId', item.id);
      fd.append('isSelected', next ? 'true' : 'false');
      const result = await setPublicQuoteOptionalLineItemSelection(fd);

      if (result.error) {
        setSelectionOverrides((current) => {
          const nextOverrides = { ...current };
          if (hadPreviousOverride && previousOverride) {
            nextOverrides[item.id] = previousOverride;
          } else {
            delete nextOverrides[item.id];
          }
          return nextOverrides;
        });
        setError(result.error);
        return;
      }

      const nextSelected = new Set(result.selectedIds);
      setSelectionOverrides((current) => {
        const nextOverrides = { ...current };

        for (const currentItem of items) {
          const isSelected = nextSelected.has(currentItem.id);

          if (isSelected === currentItem.is_selected) {
            delete nextOverrides[currentItem.id];
          } else {
            nextOverrides[currentItem.id] = {
              baseIsSelected: currentItem.is_selected,
              isSelected,
            };
          }
        }

        return nextOverrides;
      });
      onSelectionsChange(nextSelected);
    });
  };

  const selectedTotal = displayItems
    .filter((i) => i.is_selected)
    .reduce((sum, i) => sum + i.total_cents, 0);

  const selectedCount = displayItems.filter((i) => i.is_selected).length;
  const groupedItems = groupQuoteLineItemsByCategory(displayItems);

  if (!canEdit && selectedCount === 0) {
    return (
      <p className="text-on-surface-variant text-sm">
        No optional add-ons were selected.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-error/30 bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {/* Running total pill */}
      {selectedTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-container px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-on-success-container"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-on-success-container">
              {selectedCount} add-on{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <span className="text-sm font-bold text-on-success-container">
            +{formatAUD(selectedTotal)}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        {groupedItems.map((group) => (
          <div key={group.category} className="space-y-2">
            <p className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const selected = item.is_selected;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canEdit || isPending}
                  onClick={() => handleToggle(item)}
                  className={[
                    'group w-full rounded-xl border-2 text-left transition-all duration-150',
                    canEdit
                      ? 'cursor-pointer active:scale-[0.99]'
                      : 'cursor-default',
                    selected
                      ? 'border-primary bg-success-container shadow-sm'
                      : 'border-outline hover:border-primary-container/50 bg-white',
                    !canEdit || isPending ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={[
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                        selected
                          ? 'border-primary bg-primary'
                          : 'border-outline group-hover:border-primary-container bg-white',
                      ].join(' ')}
                    >
                      {selected && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-on-surface font-semibold">
                            {item.name}
                          </p>
                          <p className="text-on-surface-variant mt-0.5 text-sm">
                            {item.quantity} {item.unit} @{' '}
                            {formatAUD(item.unit_price_cents)}
                          </p>
                          {item.notes && (
                            <p className="text-on-surface-variant mt-1 text-sm">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-on-surface font-bold">
                            {formatAUD(item.total_cents)}
                          </p>
                          <span
                            className={[
                              'mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                              selected
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning-container text-on-warning-container',
                            ].join(' ')}
                          >
                            {selected ? 'Added' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!canEdit && (
        <p className="text-on-surface-variant text-xs">
          Selections are locked — this quote is no longer in sent status.
        </p>
      )}
    </div>
  );
}
