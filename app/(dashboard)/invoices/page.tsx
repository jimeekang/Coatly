import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoices } from '@/app/actions/invoices';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const { data: invoices, error } = await getInvoices();

  return (
    <div className="min-w-0">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-pm-body sm:text-[28px]">Invoices</h1>
          {invoices.length > 0 && (
            <p className="mt-0.5 text-sm text-pm-secondary">{invoices.length} total</p>
          )}
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-pm-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pm-teal-hover"
        >
          + New Invoice
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
