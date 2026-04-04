'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Package } from 'lucide-react';
import {
  MATERIAL_ITEM_CATEGORY_LABELS,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '@/lib/supabase/validators';
import { MaterialItemForm } from './MaterialItemForm';
import { createMaterialItem, updateMaterialItem, deleteMaterialItem } from '@/app/actions/materials';

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

  async function handleCreate(data: MaterialItemUpsertInput) {
    const result = await createMaterialItem(data);
    if (!result.error && result.data) {
      // Keep local state aligned with the row returned by the server.
      const newItem = result.data;
      setItems((prev) => [...prev, newItem]);
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
    const result = await deleteMaterialItem(id);
    setDeletingId(null);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

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
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-pm-border bg-white divide-y divide-pm-border overflow-hidden">
            {items.map((item) => (
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
                    {MATERIAL_ITEM_CATEGORY_LABELS[item.category]} · {formatAUD(item.unit_price_cents)} / {item.unit}
                  </p>
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
