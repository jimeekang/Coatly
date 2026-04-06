'use client';

import { useRef, useState } from 'react';
import { Pencil, Trash2, Plus, Package, Search, Upload, Download } from 'lucide-react';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItemCategory,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '@/lib/supabase/validators';
import { MaterialItemForm } from './MaterialItemForm';
import { createMaterialItem, updateMaterialItem, deleteMaterialItem, importMaterialItems } from '@/app/actions/materials';
import { generateMaterialItemsCsv, parseMaterialItemsCsv } from '@/lib/material-items-csv';

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

interface MaterialItemListProps {
  initialItems: MaterialItem[];
}

export function MaterialItemList({ initialItems }: MaterialItemListProps) {
  const [items, setItems] = useState<MaterialItem[]>(initialItems);
  const [mode, setMode] = useState<'list' | 'add' | { edit: MaterialItem }>('list');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MaterialItemCategory | 'all'>('all');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const categoryCounts = MATERIAL_ITEM_CATEGORIES.map((category) => ({
    category,
    count: items.filter((item) => item.category === category).length,
  })).filter((entry) => entry.count > 0);

  const visibleItems = items.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    if (!trimmedQuery) {
      return true;
    }

    const haystack = [item.name, item.notes ?? '', item.unit, MATERIAL_ITEM_CATEGORY_LABELS[item.category]]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmedQuery);
  });

  function resetCsvFeedback() {
    setCsvError(null);
    setCsvMessage(null);
  }

  async function handleCreate(data: MaterialItemUpsertInput) {
    const result = await createMaterialItem(data);
    if (!result.error && result.data) {
      setItems((prev) => [...prev, result.data as MaterialItem]);
      setMode('list');
    }
    return result;
  }

  async function handleUpdate(id: string, data: MaterialItemUpsertInput) {
    const result = await updateMaterialItem(id, data);
    if (!result.error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name: data.name,
                category: data.category ?? item.category,
                unit: data.unit ?? item.unit,
                unit_price_cents: data.unit_price_cents,
                notes: data.notes ?? null,
                is_active: data.is_active ?? item.is_active,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );
      setMode('list');
    }
    return result;
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    resetCsvFeedback();
    const result = await deleteMaterialItem(id);
    setDeletingId(null);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  function handleExportCsv() {
    resetCsvFeedback();
    const csv = generateMaterialItemsCsv(items);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `materials-services-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvMessage(`Exported ${items.length} item${items.length === 1 ? '' : 's'} to CSV.`);
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setDeleteError(null);
    resetCsvFeedback();

    const text = await file.text();
    const parsed = parseMaterialItemsCsv(text);

    if (parsed.errors.length > 0) {
      setCsvError(parsed.errors.slice(0, 3).join(' '));
      return;
    }

    const result = await importMaterialItems(parsed.items);
    if (result.error) {
      setCsvError(result.error);
      return;
    }

    const importedItems = result.data ?? [];
    setItems((prev) => [...prev, ...importedItems]);
    setCsvMessage(`Imported ${importedItems.length} item${importedItems.length === 1 ? '' : 's'} from CSV.`);
  }

  const csvActions = (
    <div className="flex flex-wrap gap-2">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => importInputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl border border-pm-border bg-white px-4 py-2.5 text-sm font-medium text-pm-body hover:border-pm-teal-mid hover:text-pm-teal"
      >
        <Upload className="h-4 w-4" />
        Import CSV
      </button>
      <button
        type="button"
        onClick={handleExportCsv}
        className="inline-flex items-center gap-2 rounded-xl border border-pm-border bg-white px-4 py-2.5 text-sm font-medium text-pm-body hover:border-pm-teal-mid hover:text-pm-teal"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );

  if (mode === 'add') {
    return (
      <div className="rounded-2xl border border-pm-border bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-pm-body">New Item</h2>
        <MaterialItemForm
          onSubmit={handleCreate}
          onCancel={() => setMode('list')}
          submitLabel="Add Item"
        />
      </div>
    );
  }

  if (typeof mode === 'object' && 'edit' in mode) {
    return (
      <div className="rounded-2xl border border-pm-border bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-pm-body">Edit Item</h2>
        <MaterialItemForm
          defaultValues={mode.edit}
          onSubmit={(data) => handleUpdate(mode.edit.id, data)}
          onCancel={() => setMode('list')}
          submitLabel="Save Changes"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <p className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {deleteError}
        </p>
      )}

      {csvError && (
        <p className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {csvError}
        </p>
      )}

      {csvMessage && (
        <p className="rounded-lg border border-pm-border bg-white px-4 py-3 text-sm text-pm-body">
          {csvMessage}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pm-border bg-white p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-pm-secondary/40" strokeWidth={1.5} />
          <p className="mt-3 text-base font-medium text-pm-body">No items yet</p>
          <p className="mt-1 text-sm text-pm-secondary">
            Add paints, supplies, and services to reuse them across quotes.
          </p>
          <button
            type="button"
            onClick={() => setMode('add')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pm-teal px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add First Item
          </button>
          <div className="mt-4 flex justify-center">{csvActions}</div>
          <p className="mt-3 text-xs text-pm-secondary">
            CSV columns: category, brand, title, size_l, price_aud, notes, is_active
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-pm-border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
              <label htmlFor="material-search" className="sr-only">Search items</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pm-secondary" />
              <input
                id="material-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, notes, unit, or category"
                className="h-12 w-full rounded-xl border border-pm-border bg-white pl-11 pr-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
              />
              </div>
              {csvActions}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'border-pm-teal bg-pm-teal text-white'
                    : 'border-pm-border bg-white text-pm-secondary hover:border-pm-teal-mid hover:text-pm-body'
                }`}
              >
                All - {items.length}
              </button>

              {categoryCounts.map(({ category, count }) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === category
                      ? 'border-pm-teal bg-pm-teal text-white'
                      : 'border-pm-border bg-white text-pm-secondary hover:border-pm-teal-mid hover:text-pm-body'
                  }`}
                >
                  {MATERIAL_ITEM_CATEGORY_LABELS[category]} - {count}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-pm-secondary">
              Showing {visibleItems.length} of {items.length} items
            </p>
            <p className="mt-1 text-xs text-pm-secondary">
              CSV columns: category, brand, title, size_l, price_aud, notes, is_active
            </p>
          </div>

          {visibleItems.length > 0 ? (
            <div className="rounded-2xl border border-pm-border bg-white divide-y divide-pm-border overflow-hidden">
              {visibleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-pm-body">{item.name}</p>
                      {!item.is_active && (
                        <span className="shrink-0 rounded-full bg-pm-surface px-2 py-0.5 text-xs text-pm-secondary">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-pm-secondary">
                      {MATERIAL_ITEM_CATEGORY_LABELS[item.category]} - {formatAUD(item.unit_price_cents)} / {item.unit}
                    </p>
                    {item.notes && <p className="mt-1 truncate text-xs text-pm-secondary">{item.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMode({ edit: item })}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-surface hover:text-pm-body"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-pm-secondary hover:bg-pm-coral-light hover:text-pm-coral-dark disabled:opacity-40"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pm-border bg-white p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-pm-secondary/40" strokeWidth={1.5} />
              <p className="mt-3 text-base font-medium text-pm-body">No matching items</p>
              <p className="mt-1 text-sm text-pm-secondary">
                Try a different search or choose another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-pm-border bg-white px-5 py-2.5 text-sm font-medium text-pm-body"
              >
                Clear Filters
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('add')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pm-border bg-white py-3 text-sm font-medium text-pm-secondary hover:border-pm-teal-mid hover:text-pm-teal"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </>
      )}
    </div>
  );
}
