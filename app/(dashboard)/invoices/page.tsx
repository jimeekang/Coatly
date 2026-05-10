import type { Metadata } from 'next';
import { getInvoices } from '@/app/actions/invoices';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader, PrimaryActionLink } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const { data: invoices, error } = await getInvoices();

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Invoices"
        subtitle={invoices.length > 0 ? `${invoices.length} total` : undefined}
        action={<PrimaryActionLink href="/invoices/new">+ New Invoice</PrimaryActionLink>}
      />

      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
