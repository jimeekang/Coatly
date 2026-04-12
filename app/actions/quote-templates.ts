'use server';

import { revalidatePath } from 'next/cache';
import {
  requireCurrentUser,
  getSubscriptionSnapshotForCurrentUser,
} from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import type { QuoteCreateInput } from '@/lib/supabase/validators';
import { getActiveSubscriptionRequiredMessage } from '@/lib/subscription/access';

export const STARTER_TEMPLATE_LIMIT = 5;

export type QuoteTemplatePayload = Pick<
  QuoteCreateInput,
  | 'title'
  | 'complexity'
  | 'labour_margin_percent'
  | 'material_margin_percent'
  | 'notes'
  | 'internal_notes'
  | 'rooms'
  | 'line_items'
>;

export type QuoteTemplate = {
  id: string;
  name: string;
  payload: QuoteTemplatePayload;
  created_at: string;
};

export async function listQuoteTemplates(): Promise<{
  data: QuoteTemplate[];
  error: string | null;
}> {
  const supabase = await createServerClient();
  const user = await requireCurrentUser();

  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: Array<{ id: string; name: string; payload: unknown; created_at: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from('quote_templates')
    .select('id, name, payload, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const templates: QuoteTemplate[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    payload: row.payload as QuoteTemplatePayload,
    created_at: row.created_at,
  }));

  return { data: templates, error: null };
}

export async function saveQuoteTemplate(
  name: string,
  payload: QuoteTemplatePayload,
): Promise<{ error: string | null }> {
  if (!name.trim()) return { error: 'Template name is required' };

  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('quote templates') };
  }

  type TemplateTable = {
    from: (table: string) => {
      select: (
        cols: string,
        opts: { count: 'exact'; head: true }
      ) => {
        eq: (col: string, val: string) => Promise<{
          count: number | null;
          error: { message: string } | null;
        }>;
      };
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };

  const db = supabase as unknown as TemplateTable;

  if (subscription.plan === 'starter') {
    const { count, error: countError } = await db
      .from('quote_templates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) return { error: countError.message };

    if ((count ?? 0) >= STARTER_TEMPLATE_LIMIT) {
      return {
        error: `Starter plan includes up to ${STARTER_TEMPLATE_LIMIT} templates. Upgrade to Pro for unlimited templates.`,
      };
    }
  }

  const { error } = await db.from('quote_templates').insert({
    user_id: user.id,
    name: name.trim(),
    payload: payload as unknown as Record<string, unknown>,
  });

  if (error) return { error: error.message };

  revalidatePath('/quotes/new');
  return { error: null };
}

export async function deleteQuoteTemplate(
  templateId: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const user = await requireCurrentUser();

  const db2 = supabase as unknown as {
    from: (table: string) => {
      delete: () => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };
  const { error } = await db2
    .from('quote_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/quotes/new');
  return { error: null };
}
