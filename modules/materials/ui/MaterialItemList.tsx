'use client';

import { useRef, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Search,
  Upload,
  Download,
  PaintBucket,
  Droplets,
  Wrench,
  Hammer,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItemCategory,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '../domain/types';
import { MaterialItemForm } from './MaterialItemForm';
import {
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  importMaterialItems,
} from '@/modules/materials/application/actions';
import {
  generateMaterialItemsCsv,
  parseMaterialItemsCsv,
} from '@/modules/materials/domain/csv';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { formatAUD } from '@/utils/format';

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  paint: PaintBucket,
  primer: Droplets,
  supply: Wrench,
  service: Hammer,
  other: Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  paint: 'bg-primary/8 text-primary',
  primer: 'bg-tertiary/10 text-tertiary',
  supply: 'bg-secondary/10 text-secondary',
  service: 'bg-surface-container-highest text-on-surface-variant',
  other: 'bg-surface-container text-on-surface-variant',
};

type SortKey = 'name' | 'category' | 'unit_price_cents';
type SortDir = 'asc' | 'desc';

function SortHeader({
  col,
  current,
  dir,
  onSort,
  children,
  className,
}: {
  col: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = current === col;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <th
      className={`text-on-surface-variant hover:text-on-surface cursor-pointer text-xs font-semibold tracking-wide uppercase select-none ${className ?? ''}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <Icon className={`h-3 w-3 ${active ? 'text-primary' : 'opacity-40'}`} />
      </span>
    </th>
  );
}

interface MaterialItemListProps {
  initialItems: MaterialItem[];
}

export function MaterialItemList({ initialItems }: MaterialItemListProps) {
  const [items, setItems] = useState<MaterialItem[]>(initialItems);
  const [mode, setMode] = useState<'list' | 'add' | { edit: MaterialItem }>(
    'list'
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    MaterialItemCategory | 'all'
  >('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const categoryCounts = MATERIAL_ITEM_CATEGORIES.map((category) => ({
    category,
    count: items.filter((item) => item.category === category).length,
  })).filter((entry) => entry.count > 0);

  const visibleItems = items
    .filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter)
        return false;
      if (!trimmedQuery) return true;
      const haystack = [
        item.name,
        item.notes ?? '',
        item.unit,
        MATERIAL_ITEM_CATEGORY_LABELS[item.category],
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(trimmedQuery);
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'unit_price_cents')
        return (a.unit_price_cents - b.unit_price_cents) * dir;
      if (sortKey === 'category')
        return a.category.localeCompare(b.category) * dir;
      return a.name.localeCompare(b.name) * dir;
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
    try {
      const result = await deleteMaterialItem(id);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (deleteErrorValue) {
      setDeleteError(
        getActionErrorMessage(
          deleteErrorValue,
          'Item could not be deleted. Please try again.'
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleExportCsv() {
    resetCsvFeedback();
    const csv = generateMaterialItemsCsv(items);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `materials-services-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvMessage(
      `Exported ${items.length} item${items.length === 1 ? '' : 's'} to CSV.`
    );
  }

  async function handleImportChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setDeleteError(null);
    resetCsvFeedback();
    setIsImporting(true);

    try {
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
      setCsvMessage(
        `Imported ${importedItems.length} item${importedItems.length === 1 ? '' : 's'} from CSV.`
      );
    } catch (importError) {
      setCsvError(
        getActionErrorMessage(
          importError,
          'Items could not be imported. Please try again.'
        )
      );
    } finally {
      setIsImporting(false);
    }
  }

  const csvActions = (
    <div className="flex flex-wrap gap-2">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportChange}
        disabled={isImporting}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => importInputRef.current?.click()}
        disabled={isImporting}
        className="border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Upload className="h-4 w-4" />
        {isImporting ? 'Importing...' : 'Import CSV'}
      </button>
      <button
        type="button"
        onClick={handleExportCsv}
        className="border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );

  if (mode === 'add') {
    return (
      <div className="border-outline-variant bg-surface rounded-2xl border p-5">
        <h2 className="text-on-surface mb-4 text-base font-semibold">
          New Item
        </h2>
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
      <div className="border-outline-variant bg-surface rounded-2xl border p-5">
        <h2 className="text-on-surface mb-4 text-base font-semibold">
          Edit Item
        </h2>
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
      {deleteError && <ErrorAlert>{deleteError}</ErrorAlert>}

      {csvError && <ErrorAlert>{csvError}</ErrorAlert>}

      {csvMessage && (
        <p className="border-outline-variant bg-surface text-on-surface rounded-xl border px-4 py-3 text-sm">
          {csvMessage}
        </p>
      )}

      {items.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed p-8 text-center">
          <Package
            className="text-on-surface-variant/40 mx-auto h-10 w-10"
            strokeWidth={1.5}
          />
          <p className="text-on-surface mt-3 text-base font-medium">
            No items yet
          </p>
          <p className="text-on-surface-variant mt-1 text-sm">
            Add paints, supplies, and services to reuse them across quotes.
          </p>
          <button
            type="button"
            onClick={() => setMode('add')}
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />+ New Item
          </button>
          <div className="mt-4 flex justify-center">{csvActions}</div>
        </div>
      ) : (
        <>
          <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <label htmlFor="material-search" className="sr-only">
                  Search items
                </label>
                <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
                <input
                  id="material-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, notes, unit, or category"
                  className="border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pr-4 pl-11 text-base focus:ring-2 focus:outline-none"
                />
              </div>
              {csvActions}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`focus-visible:ring-primary/30 min-h-11 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  categoryFilter === 'all'
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                All · {items.length}
              </button>
              {categoryCounts.map(({ category, count }) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`focus-visible:ring-primary/30 min-h-11 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    categoryFilter === category
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  {MATERIAL_ITEM_CATEGORY_LABELS[category]} · {count}
                </button>
              ))}
            </div>

            <p className="text-on-surface-variant mt-3 text-xs">
              {visibleItems.length} of {items.length} items
            </p>
          </div>

          {visibleItems.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="border-outline-variant bg-surface hidden overflow-hidden rounded-2xl border md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-outline-variant bg-surface-container-low border-b">
                      <SortHeader
                        col="name"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                        className="px-4 py-3 text-left"
                      >
                        Item
                      </SortHeader>
                      <SortHeader
                        col="category"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                        className="w-32 px-4 py-3 text-left"
                      >
                        Category
                      </SortHeader>
                      <th className="text-on-surface-variant w-28 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                        Unit
                      </th>
                      <SortHeader
                        col="unit_price_cents"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                        className="w-32 px-4 py-3 text-right"
                      >
                        Price
                      </SortHeader>
                      <th className="text-on-surface-variant w-24 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                        Status
                      </th>
                      <th className="w-20 px-4 py-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-outline-variant divide-y">
                    {visibleItems.map((item) => {
                      const Icon = CATEGORY_ICONS[item.category] ?? Package;
                      const iconCls =
                        CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconCls}`}
                              >
                                <Icon className="h-4 w-4" strokeWidth={1.75} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-on-surface truncate text-sm font-semibold">
                                  {item.name}
                                </p>
                                {item.notes && (
                                  <p className="text-on-surface-variant mt-0.5 truncate text-xs">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-on-surface-variant px-4 py-3 text-sm">
                            {MATERIAL_ITEM_CATEGORY_LABELS[item.category]}
                          </td>
                          <td className="text-on-surface-variant px-4 py-3 text-sm">
                            per {item.unit}
                          </td>
                          <td className="text-on-surface px-4 py-3 text-right font-semibold tabular-nums">
                            {formatAUD(item.unit_price_cents)}
                          </td>
                          <td className="px-4 py-3">
                            {item.is_active ? (
                              <span className="bg-secondary-container text-on-secondary-container inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="bg-surface-container-high text-on-surface-variant inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setMode({ edit: item })}
                                className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-primary/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                disabled={deletingId === item.id}
                                className="text-on-surface-variant hover:bg-error-container hover:text-on-error-container focus-visible:ring-error/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="border-outline-variant bg-surface divide-outline-variant divide-y overflow-hidden rounded-2xl border md:hidden">
                {visibleItems.map((item) => {
                  const Icon = CATEGORY_ICONS[item.category] ?? Package;
                  const iconCls =
                    CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconCls}`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-on-surface truncate text-sm font-semibold">
                            {item.name}
                          </p>
                          {!item.is_active && (
                            <span className="bg-surface-container-high text-on-surface-variant shrink-0 rounded-full px-2 py-0.5 text-xs">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-on-surface-variant mt-0.5 text-xs">
                          {MATERIAL_ITEM_CATEGORY_LABELS[item.category]} ·{' '}
                          {formatAUD(item.unit_price_cents)} / {item.unit}
                        </p>
                        {item.notes && (
                          <p className="text-on-surface-variant mt-1 truncate text-xs">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setMode({ edit: item })}
                          className="text-on-surface-variant hover:bg-surface-container-high focus-visible:ring-primary/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          disabled={deletingId === item.id}
                          className="text-on-surface-variant hover:bg-error-container hover:text-on-error-container focus-visible:ring-error/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed p-8 text-center">
              <Package
                className="text-on-surface-variant/40 mx-auto h-10 w-10"
                strokeWidth={1.5}
              />
              <p className="text-on-surface mt-3 text-base font-medium">
                No matching items
              </p>
              <p className="text-on-surface-variant mt-1 text-sm">
                Try a different search or choose another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="border-outline-variant bg-surface text-on-surface focus-visible:ring-primary/30 mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                Clear Filters
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('add')}
            className="border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary focus-visible:ring-primary/30 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />+ New Item
          </button>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete item?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This permanently removes it from your price book.`
            : ''
        }
        confirmLabel="Delete item"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          const targetId = deleteTarget.id;
          setDeleteTarget(null);
          void handleDelete(targetId);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
