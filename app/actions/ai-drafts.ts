'use server';

import { redirect } from 'next/navigation';
import { generateWorkspaceDraft, isAIDraftConfigured } from '@/lib/ai/drafts';
import type {
  WorkspaceDraftEntity,
  WorkspaceDraftResult,
} from '@/lib/ai/draft-types';
import {
  getActiveSubscriptionRequiredMessage,
  getProFeatureMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { createServerClient } from '@/lib/supabase/server';

function getCurrentSydneyDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function recordAIUsage(input: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  action: string;
  status: 'completed' | 'failed';
  startedAt: number;
  errorMessage?: string;
}) {
  try {
    await input.supabase.from('ai_usage_events').insert({
      user_id: input.userId,
      action: input.action,
      provider: 'google',
      model: 'gemini-2.5-flash',
      status: input.status,
      latency_ms: Date.now() - input.startedAt,
      error_message: input.errorMessage ?? null,
      metadata: { entity: input.action },
    });
  } catch {
    // Usage logging must never block the draft workflow.
  }
}

export async function generateAIDraft(input: {
  entity: WorkspaceDraftEntity;
  prompt: string;
}): Promise<{ data: WorkspaceDraftResult | null; error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!input.prompt.trim()) {
    return { data: null, error: 'Describe what you want the AI to prepare.' };
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return {
      data: null,
      error: getActiveSubscriptionRequiredMessage('AI draft'),
    };
  }

  if (!subscription.features.ai) {
    return {
      data: null,
      error: getProFeatureMessage('AI draft'),
    };
  }

  if (!isAIDraftConfigured()) {
    return {
      data: null,
      error: 'AI draft is not configured. Add GEMINI_API_KEY to .env.local.',
    };
  }

  const [{ data: business }, { data: customers }, { data: quotes }] = await Promise.all([
    supabase
      .from('businesses')
      .select('name, email, phone, address')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('customers')
      .select('id, name, company_name, email, phone, address_line1, city, state, postcode')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('quotes')
      .select(
        'id, quote_number, title, customer_id, status, total_cents, valid_until, customer:customers!quotes_customer_user_fk(name, company_name)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25),
    ]);

  const startedAt = Date.now();
  const action = `ai_draft_${input.entity}`;

  try {
    const data = await generateWorkspaceDraft({
      entity: input.entity,
      prompt: input.prompt.trim(),
      currentDate: getCurrentSydneyDate(),
      business: business
        ? {
            name: business.name,
            email: null,
            phone: null,
            address: null,
          }
        : null,
      customers:
        customers?.map((customer) => ({
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name,
          email: null,
          phone: null,
          address: null,
        })) ?? [],
      quotes:
        quotes?.map((quote) => {
          const relatedCustomer = Array.isArray(quote.customer)
            ? quote.customer[0]
            : quote.customer;

          return {
            id: quote.id,
            quote_number: quote.quote_number,
            title: quote.title,
            customer_id: quote.customer_id,
            customer_name: relatedCustomer?.company_name || relatedCustomer?.name || null,
            status: quote.status,
            total_cents: quote.total_cents,
            valid_until: quote.valid_until,
          };
        }) ?? [],
    });

    await recordAIUsage({
      supabase,
      userId: user.id,
      action,
      status: 'completed',
      startedAt,
    });

    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI draft could not be generated.';
    await recordAIUsage({
      supabase,
      userId: user.id,
      action,
      status: 'failed',
      startedAt,
      errorMessage: message,
    });
    return { data: null, error: message };
  }
}
