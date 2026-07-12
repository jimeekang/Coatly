'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { getSubscriptionSnapshotForCurrentUser } from '@/modules/billing/application/request-context';
import {
  materialItemUpsertSchema,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '../domain/types';
import { getActiveSubscriptionRequiredMessage } from '@/modules/billing/application/access';

type MaterialItemIdentity = { name: string; unit?: string | null };

function materialItemKey(item: MaterialItemIdentity) {
  const unit = item.unit?.trim() || 'item';
  return `${item.name.trim().toLowerCase()}::${unit.toLowerCase()}`;
}

async function getDuplicateMaterialItemError(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  inputs: MaterialItemIdentity[],
  excludeId?: string
) {
  const seen = new Set<string>();
  for (const item of inputs) {
    const key = materialItemKey(item);
    if (seen.has(key)) {
      return `${item.name} / ${item.unit} is duplicated in the import file.`;
    }
    seen.add(key);
  }

  const { data, error } = await supabase
    .from('material_items')
    .select('id, name, unit')
    .eq('user_id', userId);

  if (error) return error.message;

  const existingKeys = new Set(
    (
      (data as Array<{ id: string; name: string; unit: string }> | null) ??
      []
    )
      .filter((item) => item.id !== excludeId)
      .map(materialItemKey)
  );
  const duplicate = inputs.find((item) =>
    existingKeys.has(materialItemKey(item))
  );

  return duplicate
    ? `${duplicate.name} / ${duplicate.unit} already exists in your material and service catalogue.`
    : null;
}

export async function getMaterialItems(): Promise<{
  data: MaterialItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  const { data, error } = await supabase
    .from('material_items')
    .select(
      'id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return {
    data: (data as MaterialItem[] | null) ?? [],
    error: error?.message ?? null,
  };
}

export async function getMaterialItemsForPicker(): Promise<{
  data: MaterialItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  const { data, error } = await supabase
    .from('material_items')
    .select(
      'id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return {
    data: (data as MaterialItem[] | null) ?? [],
    error: error?.message ?? null,
  };
}

export async function createMaterialItem(
  input: MaterialItemUpsertInput
): Promise<{ data?: MaterialItem; error?: string }> {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('materials management'),
    };
  }

  const parsed = materialItemUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid item details.',
    };
  }

  const duplicateError = await getDuplicateMaterialItemError(
    supabase,
    user.id,
    [parsed.data]
  );
  if (duplicateError) return { error: duplicateError };

  const { data, error } = await supabase
    .from('material_items')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      unit_price_cents: parsed.data.unit_price_cents,
      notes: parsed.data.notes ?? null,
      is_active: parsed.data.is_active,
    })
    .select(
      'id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at'
    )
    .single();

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return { data: data as MaterialItem };
}

export async function importMaterialItems(
  inputs: MaterialItemUpsertInput[]
): Promise<{ data?: MaterialItem[]; error?: string }> {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('materials management'),
    };
  }

  const parsed = z
    .array(materialItemUpsertSchema)
    .min(1, 'At least one item is required')
    .safeParse(inputs);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid CSV items.' };
  }

  const duplicateError = await getDuplicateMaterialItemError(
    supabase,
    user.id,
    parsed.data
  );
  if (duplicateError) return { error: duplicateError };

  const { data, error } = await supabase
    .from('material_items')
    .insert(
      parsed.data.map((item) => ({
        user_id: user.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        notes: item.notes ?? null,
        is_active: item.is_active,
      }))
    )
    .select(
      'id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at'
    );

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return { data: (data as MaterialItem[] | null) ?? [] };
}

export async function updateMaterialItem(
  id: string,
  input: MaterialItemUpsertInput
): Promise<{ error?: string }> {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('materials management'),
    };
  }

  const parsed = materialItemUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid item details.',
    };
  }

  const duplicateError = await getDuplicateMaterialItemError(
    supabase,
    user.id,
    [parsed.data],
    id
  );
  if (duplicateError) return { error: duplicateError };

  const { error } = await supabase
    .from('material_items')
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      unit_price_cents: parsed.data.unit_price_cents,
      notes: parsed.data.notes ?? null,
      is_active: parsed.data.is_active,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return {};
}

export async function deleteMaterialItem(
  id: string
): Promise<{ error?: string }> {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('materials management'),
    };
  }

  const { error } = await supabase
    .from('material_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return {};
}

export async function reorderMaterialItems(
  orderedIds: string[]
): Promise<{ error?: string }> {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('materials management'),
    };
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('material_items')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('user_id', user.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath('/materials-service');
  return {};
}
