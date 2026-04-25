import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoices } from '@/app/actions/invoices';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const { data: invoices, error } = await getInvoices();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="text-[28px] font-bold text-pm-body">Invoices</h1>
          {invoices.length > 0 && (
            <p className="mt-0.5 text-sm text-pm-secondary">{invoices.length} total</p>
          )}
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-pm-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pm-teal-hover"
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
