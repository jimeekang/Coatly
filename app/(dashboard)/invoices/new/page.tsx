import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoiceDraftFromQuote, getInvoiceFormOptions } from '@/app/actions/invoices';
import { InvoiceCreateScreen } from '@/components/invoices/InvoiceCreateScreen';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveSubscriptionSnapshotForUser } from '@/lib/subscription/server';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'New Invoice' };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams?: Promise<{ quoteId?: string; customer_id?: string; customerId?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedQuoteId =
    typeof resolvedSearchParams.quoteId === 'string' ? resolvedSearchParams.quoteId : null;
  const requestedCustomerId =
    typeof resolvedSearchParams.customer_id === 'string'
      ? resolvedSearchParams.customer_id
      : typeof resolvedSearchParams.customerId === 'string'
        ? resolvedSearchParams.customerId
        : null;
  const subscription = user
    ? await getLiveSubscriptionSnapshotForUser(user.id)
    : null;
  const { data, error } = await getInvoiceFormOptions();
  const customers = data.customers;
  const quotes = data.quotes;
  const quoteDraftResult =
    requestedQuoteId ? await getInvoiceDraftFromQuote(requestedQuoteId) : { data: null, error: null };
  const pageError = error ?? quoteDraftResult.error;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-6xl">
      <PageHeader
        title="New Invoice"
        description="Create a draft, compare it against the linked quote, and keep payment details ready for sending."
        backHref="/invoices"
        backLabel="Back to invoices"
      />

      {pageError ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{pageError}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface px-5 py-8">
          <h2 className="text-base font-semibold text-pm-body">Add a customer first</h2>
          <p className="mt-1 text-sm text-pm-secondary">
            Invoices are linked to a saved customer in your workspace.
          </p>
          <Link
            href="/customers/new"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-pm-teal px-4 text-sm font-medium text-white transition-colors hover:bg-pm-teal-hover"
          >
            Go to New Customer
          </Link>
        </div>
      ) : (
        <InvoiceCreateScreen
          customers={customers}
          quotes={quotes}
          businessDefaults={data.businessDefaults}
          initialDefaultValues={quoteDraftResult.data ?? undefined}
          initialCustomerId={
            requestedCustomerId && customers.some((customer) => customer.id === requestedCustomerId)
              ? requestedCustomerId
              : undefined
          }
          canUseAI={subscription?.features.ai ?? false}
        />
      )}
    </div>
  );
}
