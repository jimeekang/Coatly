import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoiceDraftFromQuote, getInvoiceFormOptions } from '@/app/actions/invoices';
import { InvoiceCreateScreen } from '@/components/invoices/InvoiceCreateScreen';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { BackButton } from '@/components/layout/BackButton';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveSubscriptionSnapshotForUser } from '@/lib/subscription/server';

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
      <div className="mb-6 flex items-center gap-3">
        <BackButton href="/invoices" label="Back to invoices" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-[28px]">
            New Invoice
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Create a draft, compare it against the linked quote, and keep payment details ready
            for sending.
          </p>
        </div>
      </div>

      {pageError ? (
        <ErrorAlert>{pageError}</ErrorAlert>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-8">
          <h2 className="text-base font-semibold text-on-surface">Add a customer first</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Invoices are linked to a saved customer in your workspace.
          </p>
          <Link
            href="/customers/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
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
