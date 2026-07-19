'use client';

import { useState } from 'react';
import { Search, X, Plus, Package } from 'lucide-react';
import {
  NumericInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/components/shared/NumericInput';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItem,
  type MaterialItemCategory,
} from '@/modules/materials/domain/types';
import type { QuoteLineItemFormInput } from '@/modules/quotes/domain/quote-schema';
import {
  formControlClassName,
  formLabelClassName,
} from '@/components/forms/FormField';
import { cn } from '@/lib/utils';
import { formatAUD } from '@/utils/format';
import { Modal } from '@/components/ui/modal';

interface LineItemPickerProps {
  libraryItems: MaterialItem[];
  onAdd: (item: QuoteLineItemFormInput) => void;
  onClose: () => void;
}

type PickerMode = 'browse' | 'custom' | { configure: MaterialItem };

function requiresWholeNumberQuantity(category: MaterialItemCategory) {
  return category === 'paint';
}

function sanitizeWholeNumberQuantityInput(value: string) {
  const [integerPortion] = value.split('.');
  return sanitizeIntegerInput(integerPortion ?? '');
}

function parseQuantityDraft(category: MaterialItemCategory, draft: string) {
  if (draft.trim() === '') {
    return null;
  }

  const parsed = requiresWholeNumberQuantity(category)
    ? Number.parseInt(draft, 10)
    : Number.parseFloat(draft);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function LineItemPicker({
  libraryItems,
  onAdd,
  onClose,
}: LineItemPickerProps) {
  const [mode, setMode] = useState<PickerMode>('browse');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    MaterialItemCategory | 'all'
  >('all');
  const [restoreFocusElement] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  );
  const filtered = libraryItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // ── Configure quantity for a library item ─────────────────────────────────
  if (typeof mode === 'object' && 'configure' in mode) {
    return (
      <PickerOverlay
        ariaLabel={`Configure ${mode.configure.name}`}
        restoreFocusElement={restoreFocusElement}
        onClose={onClose}
      >
        <ConfigureItem
          item={mode.configure}
          onAdd={(qty) => {
            onAdd({
              material_item_id: mode.configure.id,
              name: mode.configure.name,
              category: mode.configure.category,
              unit: mode.configure.unit,
              quantity: qty,
              unit_price_cents: mode.configure.unit_price_cents,
              is_optional: false,
              is_selected: true,
            });
            onClose();
          }}
          onBack={() => setMode('browse')}
        />
      </PickerOverlay>
    );
  }

  // ── Custom item entry ──────────────────────────────────────────────────────
  if (mode === 'custom') {
    return (
      <PickerOverlay
        ariaLabel="Create custom quote item"
        restoreFocusElement={restoreFocusElement}
        onClose={onClose}
      >
        <CustomItemForm
          onAdd={(item) => {
            onAdd(item);
            onClose();
          }}
          onBack={() => setMode('browse')}
        />
      </PickerOverlay>
    );
  }

  // ── Browse library ─────────────────────────────────────────────────────────
  return (
    <PickerOverlay
      ariaLabel="Add quote item"
      restoreFocusElement={restoreFocusElement}
      onClose={onClose}
    >
      <div className="border-outline-variant flex items-center justify-between border-b pb-3">
        <h2 className="text-on-surface text-base font-semibold">Add Item</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close item picker"
          className="text-on-surface-variant hover:bg-surface-container focus-visible:ring-primary/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-3">
        <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pr-4 pl-9 text-base focus:ring-2 focus:outline-none"
          autoFocus
        />
      </div>

      {/* Category filter */}
      <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
        {(['all', ...MATERIAL_ITEM_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`focus-visible:ring-primary/30 min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              categoryFilter === cat
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary'
            }`}
          >
            {cat === 'all' ? 'All' : MATERIAL_ITEM_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="mt-3 max-h-64 flex-1 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <Package
              className="text-on-surface-variant/40 mx-auto h-8 w-8"
              strokeWidth={1.5}
            />
            <p className="text-on-surface-variant mt-2 text-sm">
              {libraryItems.length === 0
                ? 'No saved items yet.'
                : 'No items match your search.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode({ configure: item })}
              className="hover:bg-surface-container focus-visible:ring-primary/30 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="min-w-0 flex-1">
                <p className="text-on-surface truncate text-sm font-medium">
                  {item.name}
                </p>
                <p className="text-on-surface-variant text-xs">
                  {MATERIAL_ITEM_CATEGORY_LABELS[item.category]} ·{' '}
                  {formatAUD(item.unit_price_cents)} / {item.unit}
                </p>
              </div>
              <Plus className="text-primary h-4 w-4 shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Custom item CTA */}
      <div className="border-outline-variant mt-3 border-t pt-3">
        <button
          type="button"
          onClick={() => setMode('custom')}
          className="border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary focus-visible:ring-primary/30 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" />+ New Custom Item
        </button>
      </div>
    </PickerOverlay>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const PickerOverlay = ({
  children,
  ariaLabel,
  restoreFocusElement,
  onClose,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  restoreFocusElement: HTMLElement | null;
  onClose: () => void;
}) => (
  <Modal
    open
    onClose={onClose}
    ariaLabel={ariaLabel}
    size="md"
    restoreFocusElement={restoreFocusElement}
  >
    {children}
  </Modal>
);

function ConfigureItem({
  item,
  onAdd,
  onBack,
}: {
  item: MaterialItem;
  onAdd: (qty: number) => void;
  onBack: () => void;
}) {
  const [qtyDraft, setQtyDraft] = useState('1');
  const qty = parseQuantityDraft(item.category, qtyDraft) ?? 0;
  const canAdd = qty > 0;

  return (
    <>
      <div className="border-outline-variant flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to item library"
          className="text-on-surface-variant hover:bg-surface-container focus-visible:ring-primary/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-on-surface truncate text-base font-semibold">
          {item.name}
        </h2>
      </div>

      <div className="bg-surface-container mt-4 rounded-xl px-4 py-3">
        <p className="text-on-surface-variant text-xs">
          {MATERIAL_ITEM_CATEGORY_LABELS[item.category]}
        </p>
        <p className="text-on-surface mt-0.5 text-sm font-medium">
          {formatAUD(item.unit_price_cents)} / {item.unit}
        </p>
      </div>

      <div className="mt-4">
        <label className={formLabelClassName}>Quantity ({item.unit})</label>
        <NumericInput
          value={qtyDraft}
          inputMode={
            requiresWholeNumberQuantity(item.category) ? 'numeric' : 'decimal'
          }
          sanitize={
            requiresWholeNumberQuantity(item.category)
              ? sanitizeWholeNumberQuantityInput
              : sanitizeDecimalInput
          }
          onValueChange={setQtyDraft}
          className={formControlClassName}
          aria-label={`${item.name} quantity`}
        />
      </div>

      <div className="bg-primary/15 mt-3 flex items-center justify-between rounded-xl px-4 py-3">
        <span className="text-on-surface-variant text-sm">Subtotal</span>
        <span className="text-primary text-base font-semibold">
          {formatAUD(Math.round(qty * item.unit_price_cents))}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onAdd(qty)}
        disabled={!canAdd}
        className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 mt-4 h-12 w-full rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        Add to Quote
      </button>
    </>
  );
}

function CustomItemForm({
  onAdd,
  onBack,
}: {
  onAdd: (item: QuoteLineItemFormInput) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    category: MaterialItemCategory;
    unit: string;
    quantity: string;
    unit_price_cents: number;
    notes: string;
  }>({
    name: '',
    category: 'other',
    unit: 'item',
    quantity: '1',
    unit_price_cents: 0,
    notes: '',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'category') {
        const nextCategory = value as MaterialItemCategory;

        return {
          ...prev,
          category: nextCategory,
          quantity: requiresWholeNumberQuantity(nextCategory)
            ? sanitizeWholeNumberQuantityInput(prev.quantity)
            : prev.quantity,
        };
      }

      return {
        ...prev,
        [name]:
          name === 'quantity' && requiresWholeNumberQuantity(prev.category)
            ? sanitizeWholeNumberQuantityInput(value)
            : value,
      };
    });
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.unit.trim()) return;
    const quantity = parseQuantityDraft(form.category, form.quantity);
    if (quantity == null) return;

    onAdd({
      material_item_id: null,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      quantity,
      unit_price_cents: form.unit_price_cents,
      is_optional: false,
      is_selected: true,
      notes: form.notes.trim() || undefined,
    });
  }

  const parsedQuantity = parseQuantityDraft(form.category, form.quantity) ?? 0;
  const total = Math.round(parsedQuantity * form.unit_price_cents);
  const canSubmit = form.name.trim() && form.unit.trim() && parsedQuantity > 0;

  return (
    <>
      <div className="border-outline-variant flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to item library"
          className="text-on-surface-variant hover:bg-surface-container focus-visible:ring-primary/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-on-surface text-base font-semibold">Custom Item</h2>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        <div>
          <label className={formLabelClassName}>Item Name</label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Sugar soap, filler"
            className={formControlClassName}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={formLabelClassName}>Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={cn(formControlClassName, 'cursor-pointer')}
            >
              {MATERIAL_ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {MATERIAL_ITEM_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClassName}>Unit</label>
            <input
              name="unit"
              type="text"
              value={form.unit}
              onChange={handleChange}
              placeholder="item, L, hr"
              className={formControlClassName}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={formLabelClassName}>Quantity</label>
            <NumericInput
              name="quantity"
              value={form.quantity}
              inputMode={
                requiresWholeNumberQuantity(form.category)
                  ? 'numeric'
                  : 'decimal'
              }
              sanitize={
                requiresWholeNumberQuantity(form.category)
                  ? sanitizeWholeNumberQuantityInput
                  : sanitizeDecimalInput
              }
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, quantity: value }))
              }
              className={formControlClassName}
              aria-label="Custom item quantity"
            />
          </div>
          <div>
            <label className={formLabelClassName}>Unit Price</label>
            <div className="relative">
              <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-4 flex items-center">
                $
              </span>
              <NumericInput
                value={(form.unit_price_cents / 100).toFixed(2)}
                sanitize={sanitizeDecimalInput}
                onValueChange={(value) => {
                  const parsed = value.trim() === '' ? 0 : parseFloat(value);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }

                  setForm((prev) => ({
                    ...prev,
                    unit_price_cents: Math.round(parsed * 100),
                  }));
                }}
                className={cn(formControlClassName, 'pl-8')}
              />
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="bg-primary/15 flex items-center justify-between rounded-xl px-4 py-3">
            <span className="text-on-surface-variant text-sm">Subtotal</span>
            <span className="text-primary text-base font-semibold">
              {formatAUD(total)}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 mt-4 h-12 w-full rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        Add to Quote
      </button>
    </>
  );
}
