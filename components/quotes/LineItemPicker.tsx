'use client';

import { useState, useEffect } from 'react';
import { Search, X, Plus, Package } from 'lucide-react';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItem,
  type MaterialItemCategory,
  type QuoteLineItemFormInput,
} from '@/lib/supabase/validators';

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

interface LineItemPickerProps {
  libraryItems: MaterialItem[];
  onAdd: (item: QuoteLineItemFormInput) => void;
  onClose: () => void;
}

type PickerMode = 'browse' | 'custom' | { configure: MaterialItem };

export function LineItemPicker({ libraryItems, onAdd, onClose }: LineItemPickerProps) {
  const [mode, setMode] = useState<PickerMode>('browse');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MaterialItemCategory | 'all'>('all');
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const filtered = libraryItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // ── Configure quantity for a library item ─────────────────────────────────
  if (typeof mode === 'object' && 'configure' in mode) {
    return (
      <PickerOverlay onClose={onClose}>
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
      <PickerOverlay onClose={onClose}>
        <CustomItemForm
          onAdd={(item) => { onAdd(item); onClose(); }}
          onBack={() => setMode('browse')}
        />
      </PickerOverlay>
    );
  }

  // ── Browse library ─────────────────────────────────────────────────────────
  return (
    <PickerOverlay onClose={onClose}>
      <div className="flex items-center justify-between pb-3 border-b border-pm-border">
        <h2 className="text-base font-semibold text-pm-body">Add Item</h2>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-surface">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pm-secondary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="h-11 w-full rounded-xl border border-pm-border bg-pm-surface pl-9 pr-4 text-sm focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          autoFocus
        />
      </div>

      {/* Category filter */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['all', ...MATERIAL_ITEM_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? 'border-pm-teal bg-pm-teal text-white'
                : 'border-pm-border bg-white text-pm-secondary hover:border-pm-teal-mid'
            }`}
          >
            {cat === 'all' ? 'All' : MATERIAL_ITEM_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-1 max-h-64">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto h-8 w-8 text-pm-secondary/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-pm-secondary">
              {libraryItems.length === 0 ? 'No saved items yet.' : 'No items match your search.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode({ configure: item })}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-pm-surface"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-pm-body">{item.name}</p>
                <p className="text-xs text-pm-secondary">
                  {MATERIAL_ITEM_CATEGORY_LABELS[item.category]} · {formatAUD(item.unit_price_cents)} / {item.unit}
                </p>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-pm-teal" />
            </button>
          ))
        )}
      </div>

      {/* Custom item CTA */}
      <div className="mt-3 pt-3 border-t border-pm-border">
        <button
          type="button"
          onClick={() => setMode('custom')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pm-border py-3 text-sm font-medium text-pm-secondary hover:border-pm-teal-mid hover:text-pm-teal"
        >
          <Plus className="h-4 w-4" />
          Add Custom Item
        </button>
      </div>
    </PickerOverlay>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const PickerOverlay = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl flex flex-col max-h-[90dvh]">
      {children}
    </div>
  </div>
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
  const [qty, setQty] = useState(1);

  return (
    <>
      <div className="flex items-center gap-2 pb-3 border-b border-pm-border">
        <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-surface">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-pm-body truncate">{item.name}</h2>
      </div>

      <div className="mt-4 rounded-xl bg-pm-surface px-4 py-3">
        <p className="text-xs text-pm-secondary">{MATERIAL_ITEM_CATEGORY_LABELS[item.category]}</p>
        <p className="mt-0.5 text-sm font-medium text-pm-body">
          {formatAUD(item.unit_price_cents)} / {item.unit}
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-pm-body mb-1.5">
          Quantity ({item.unit})
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={qty}
          onChange={(e) => setQty(Math.max(0.01, parseFloat(e.target.value) || 0))}
          className="h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
        />
      </div>

      <div className="mt-3 rounded-xl bg-pm-teal-pale/20 px-4 py-3 flex justify-between items-center">
        <span className="text-sm text-pm-secondary">Subtotal</span>
        <span className="text-base font-semibold text-pm-teal">
          {formatAUD(Math.round(qty * item.unit_price_cents))}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onAdd(qty)}
        className="mt-4 h-12 w-full rounded-xl bg-pm-teal text-base font-semibold text-white"
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
    quantity: number;
    unit_price_cents: number;
    notes: string;
  }>({
    name: '',
    category: 'other',
    unit: 'item',
    quantity: 1,
    unit_price_cents: 0,
    notes: '',
  });

  const FIELD = 'h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.unit.trim()) return;
    onAdd({
      material_item_id: null,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      quantity: form.quantity,
      unit_price_cents: form.unit_price_cents,
      is_optional: false,
      is_selected: true,
      notes: form.notes.trim() || undefined,
    });
  }

  const total = Math.round(form.quantity * form.unit_price_cents);
  const canSubmit = form.name.trim() && form.unit.trim() && form.quantity > 0;

  return (
    <>
      <div className="flex items-center gap-2 pb-3 border-b border-pm-border">
        <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-surface">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-pm-body">Custom Item</h2>
      </div>

      <div className="mt-4 space-y-3 overflow-y-auto flex-1">
        <div>
          <label className="block text-sm font-medium text-pm-body mb-1.5">Item Name</label>
          <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="e.g. Sugar soap, filler" className={FIELD} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-pm-body mb-1.5">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className={`${FIELD} cursor-pointer`}>
              {MATERIAL_ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{MATERIAL_ITEM_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-pm-body mb-1.5">Unit</label>
            <input name="unit" type="text" value={form.unit} onChange={handleChange} placeholder="item, L, hr" className={FIELD} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-pm-body mb-1.5">Quantity</label>
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              className={FIELD}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pm-body mb-1.5">Unit Price</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-pm-secondary">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={(form.unit_price_cents / 100).toFixed(2)}
                onChange={(e) => setForm((prev) => ({ ...prev, unit_price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                className={`${FIELD} pl-8`}
              />
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="rounded-xl bg-pm-teal-pale/20 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-pm-secondary">Subtotal</span>
            <span className="text-base font-semibold text-pm-teal">{formatAUD(total)}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-4 h-12 w-full rounded-xl bg-pm-teal text-base font-semibold text-white disabled:opacity-50"
      >
        Add to Quote
      </button>
    </>
  );
}
