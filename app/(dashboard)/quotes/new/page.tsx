import Link from 'next/link';
import type { Metadata } from 'next';
import { getQuoteFormOptions } from '@/app/actions/quotes';
import { getMaterialItemsForPicker } from '@/app/actions/materials';
import { listQuoteTemplates } from '@/app/actions/quote-templates';
import { QuoteCreateScreen } from '@/components/quotes/QuoteCreateScreen';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveMonthlyActiveQuoteUsageForUser } from '@/lib/subscription/server';

export const metadata: Metadata = { title: 'New Quote' };

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; customerId?: string }>;
}) {
  const [{ data, error }, { data: libraryItems }, { data: templates }] = await Promise.all([
    getQuoteFormOptions(),
    getMaterialItemsForPicker(),
    listQuoteTemplates(),
  ]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedCustomerId =
    typeof resolvedSearchParams.customer_id === 'string'
      ? resolvedSearchParams.customer_id
      : typeof resolvedSearchParams.customerId === 'string'
        ? resolvedSearchParams.customerId
        : null;
  const customers = data.customers;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usageResult = user
    ? await getLiveMonthlyActiveQuoteUsageForUser(supabase, user.id)
    : null;
  const subscription = usageResult?.snapshot ?? null;
  const quoteUsage = usageResult?.usage ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/quotes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
          aria-label="Back to quotes"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-pm-body">New Quote</h1>
          <p className="mt-0.5 text-sm text-pm-secondary">
            Build a quote manually{subscription?.features.ai ? ' or let AI prepare a draft first.' : '.'}
          </p>
        </div>
      </div>

      {quoteUsage && (
        <div className="mb-6 rounded-2xl border border-pm-border bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pm-secondary">
            Starter Usage
          </p>
          <p className="mt-1 text-base font-semibold text-pm-body">
            {quoteUsage.remaining} of {quoteUsage.limit} active quote slots remaining this month
          </p>
          <p className="mt-1 text-sm text-pm-secondary">
            Starter includes up to {quoteUsage.limit} draft, sent, or approved quotes each
            month. Upgrade to Pro for unlimited quoting and AI drafting.
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface px-5 py-8">
          <h2 className="text-base font-semibold text-pm-body">Add a customer first</h2>
          <p className="mt-1 text-sm text-pm-secondary">
            Quotes are linked to a saved customer in your workspace.
          </p>
          <Link
            href="/customers/new"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-pm-teal px-4 text-sm font-medium text-white transition-colors hover:bg-pm-teal-hover"
          >
            Go to New Customer
          </Link>
        </div>
      ) : (
        <QuoteCreateScreen
          customers={customers}
          canUseAI={subscription?.features.ai ?? false}
          quoteNumberPreview={data.nextQuoteNumber ?? undefined}
          rateSettings={data.userRates}
          libraryItems={libraryItems}
          templates={templates}
          initialCustomerId={
            requestedCustomerId && customers.some((customer) => customer.id === requestedCustomerId)
              ? requestedCustomerId
              : undefined
          }
        />
      )}
    </div>
  );
}
