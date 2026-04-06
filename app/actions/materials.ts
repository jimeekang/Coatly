'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import {
  materialItemUpsertSchema,
  type MaterialItem,
  type MaterialItemUpsertInput,
} from '@/lib/supabase/validators';

export async function getMaterialItems(): Promise<{
  data: MaterialItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('material_items')
    .select('id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at')
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
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('material_items')
    .select('id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at')
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
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const parsed = materialItemUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid item details.' };
  }

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
    .select('id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return { data: data as MaterialItem };
}

export async function importMaterialItems(
  inputs: MaterialItemUpsertInput[]
): Promise<{ data?: MaterialItem[]; error?: string }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const parsed = z.array(materialItemUpsertSchema).min(1, 'At least one item is required').safeParse(inputs);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid CSV items.' };
  }

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
    .select('id, user_id, name, category, unit, unit_price_cents, notes, is_active, sort_order, created_at, updated_at');

  if (error) return { error: error.message };

  revalidatePath('/materials-service');
  return { data: (data as MaterialItem[] | null) ?? [] };
}

export async function updateMaterialItem(
  id: string,
  input: MaterialItemUpsertInput
): Promise<{ error?: string }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const parsed = materialItemUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid item details.' };
  }

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

export async function deleteMaterialItem(id: string): Promise<{ error?: string }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

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
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

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
