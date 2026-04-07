'use client';

import { useTransition, useOptimistic } from 'react';
import { setPublicQuoteOptionalLineItemSelection } from '@/app/actions/quotes';
import { formatAUD } from '@/utils/format';

interface OptionalItem {
  id: string;
  name: string;
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

export function PublicOptionalItems({
  quoteToken,
  items,
  canEdit,
  onSelectionsChange,
}: PublicOptionalItemsProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticItems, toggleOptimistic] = useOptimistic(
    items,
    (current, { id, isSelected }: { id: string; isSelected: boolean }) =>
      current.map((item) =>
        item.id === id ? { ...item, is_selected: isSelected } : item
      )
  );

  const handleToggle = (item: OptionalItem) => {
    if (!canEdit || isPending) return;
    const next = !item.is_selected;

    startTransition(async () => {
      toggleOptimistic({ id: item.id, isSelected: next });

      const fd = new FormData();
      fd.append('quoteToken', quoteToken);
      fd.append('lineItemId', item.id);
      fd.append('isSelected', next ? 'true' : 'false');
      await setPublicQuoteOptionalLineItemSelection(fd);

      const nextSelected = new Set(
        optimisticItems
          .map((i) => (i.id === item.id ? { ...i, is_selected: next } : i))
          .filter((i) => i.is_selected)
          .map((i) => i.id)
      );
      onSelectionsChange(nextSelected);
    });
  };

  const selectedTotal = optimisticItems
    .filter((i) => i.is_selected)
    .reduce((sum, i) => sum + i.total_cents, 0);

  const selectedCount = optimisticItems.filter((i) => i.is_selected).length;

  if (!canEdit && selectedCount === 0) {
    return (
      <p className="text-sm text-pm-secondary">No optional add-ons were selected.</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Running total pill */}
      {selectedTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-700">
              {selectedCount} add-on{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <span className="text-sm font-bold text-green-700">+{formatAUD(selectedTotal)}</span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {optimisticItems.map((item) => {
          const selected = item.is_selected;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!canEdit || isPending}
              onClick={() => handleToggle(item)}
              className={[
                'group w-full rounded-xl border-2 text-left transition-all duration-150',
                canEdit ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default',
                selected
                  ? 'border-pm-teal bg-pm-teal-light shadow-sm'
                  : 'border-pm-border bg-white hover:border-pm-teal-mid/50',
                (!canEdit || isPending) ? 'opacity-60' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                {/* Checkbox */}
                <span
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                    selected
                      ? 'border-pm-teal bg-pm-teal'
                      : 'border-pm-border bg-white group-hover:border-pm-teal-mid',
                  ].join(' ')}
                >
                  {selected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-pm-body">{item.name}</p>
                      <p className="mt-0.5 text-sm text-pm-secondary">
                        {item.quantity} {item.unit} @ {formatAUD(item.unit_price_cents)}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-sm text-pm-secondary">{item.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-pm-body">{formatAUD(item.total_cents)}</p>
                      <span
                        className={[
                          'mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          selected
                            ? 'bg-pm-teal/10 text-pm-teal'
                            : 'bg-amber-100 text-amber-700',
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

      {!canEdit && (
        <p className="text-xs text-pm-secondary">
          Selections are locked — this quote is no longer in sent status.
        </p>
      )}
    </div>
  );
}
