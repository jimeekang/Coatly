'use server';

import { redirect } from 'next/navigation';
import { generateWorkspaceAssistantResult, isAIDraftConfigured } from '@/lib/ai/drafts';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import {
  getActiveSubscriptionRequiredMessage,
  getProFeatureMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { createServerClient } from '@/lib/supabase/server';
import type { WorkspaceAssistantResult } from '@/lib/ai/draft-types';

function getCurrentSydneyDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function runWorkspaceAssistant(input: {
  prompt: string;
}): Promise<{ data: WorkspaceAssistantResult | null; error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!input.prompt.trim()) {
    return { data: null, error: 'Describe what you want to create, find, or check.' };
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return {
      data: null,
      error: getActiveSubscriptionRequiredMessage('Dashboard AI'),
    };
  }

  if (!subscription.features.ai) {
    return {
      data: null,
      error: getProFeatureMessage('Dashboard AI'),
    };
  }

  if (!isAIDraftConfigured()) {
    return {
      data: null,
      error: 'AI draft is not configured. Add GEMINI_API_KEY to .env.local.',
    };
  }

  const [{ data: business }, { data: customers }, { data: quotes }, { data: invoices }] =
    await Promise.all([
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
        .limit(50),
      supabase
        .from('quotes')
        .select(
          'id, quote_number, title, customer_id, status, total_cents, valid_until, customer:customers!quotes_customer_user_fk(name, company_name)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('invoices')
        .select(
          'id, invoice_number, customer_id, quote_id, status, invoice_type, total_cents, due_date, customer:customers!invoices_customer_user_fk(name, company_name), quote:quotes(quote_number)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  try {
    const data = await generateWorkspaceAssistantResult({
      prompt: input.prompt.trim(),
      currentDate: getCurrentSydneyDate(),
      business:
        business && business.name
          ? {
              name: business.name,
              email: business.email,
              phone: business.phone,
              address: business.address,
            }
          : null,
      customers:
        customers?.map((customer) => ({
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name,
          email: customer.email,
          phone: customer.phone,
          address: buildQuoteCustomerAddress(customer),
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
            customer_name:
              relatedCustomer?.company_name || relatedCustomer?.name || null,
            status: quote.status,
            total_cents: quote.total_cents,
            valid_until: quote.valid_until,
          };
        }) ?? [],
      invoices:
        invoices?.map((invoice) => {
          const relatedCustomer = Array.isArray(invoice.customer)
            ? invoice.customer[0]
            : invoice.customer;
          const relatedQuote = Array.isArray(invoice.quote) ? invoice.quote[0] : invoice.quote;

          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id,
            customer_name:
              relatedCustomer?.company_name || relatedCustomer?.name || null,
            quote_id: invoice.quote_id,
            quote_number: relatedQuote?.quote_number ?? null,
            status: invoice.status,
            invoice_type: invoice.invoice_type,
            total_cents: invoice.total_cents,
            due_date: invoice.due_date,
          };
        }) ?? [],
    });

    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Workspace assistant could not complete the request.';
    return { data: null, error: message };
  }
}
