import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoices } from '@/app/actions/invoices';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const { data: invoices, error } = await getInvoices();

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={invoices.length > 0 ? `${invoices.length} total` : undefined}
        action={
          <Link
            href="/invoices/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-bold tracking-tight text-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            + New Invoice
          </Link>
        }
      />

      {error ? (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
