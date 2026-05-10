import Link from 'next/link';
import type { Metadata } from 'next';
import { getQuoteFormOptions } from '@/app/actions/quotes';
import { getMaterialItemsForPicker } from '@/app/actions/materials';
import { listQuoteTemplates } from '@/app/actions/quote-templates';
import { QuoteCreateScreen } from '@/components/quotes/QuoteCreateScreen';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { BackButton } from '@/components/layout/BackButton';
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
        <BackButton href="/quotes" label="Back to quotes" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-[28px]">
            New Quote
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Build a quote manually{subscription?.features.ai ? ' or let AI prepare a draft first.' : '.'}
          </p>
        </div>
      </div>

      {quoteUsage && (
        <div className="mb-6 rounded-2xl border border-outline-variant bg-surface-container px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
            Starter Usage
          </p>
          <p className="mt-1 text-base font-semibold text-on-surface">
            {quoteUsage.remaining} of {quoteUsage.limit} active quote slots remaining this month
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Starter includes up to {quoteUsage.limit} draft, sent, or approved quotes each
            month. Upgrade to Pro for unlimited quoting and AI drafting.
          </p>
        </div>
      )}

      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-8">
          <h2 className="text-base font-semibold text-on-surface">Add a customer first</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quotes are linked to a saved customer in your workspace.
          </p>
          <Link
            href="/customers/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
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
