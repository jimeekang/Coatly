import type { Metadata } from 'next';
import { getInvoices } from '@/modules/invoices/application/actions';
import { InvoiceKpiBand } from '@/modules/invoices/ui/InvoiceKpiBand';
import { InvoiceTable } from '@/modules/invoices/ui/InvoiceTable';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader, PrimaryActionLink } from '@/components/layout/PageHeader';
import { summarizeInvoices } from '@/modules/invoices/domain/invoices';

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
        <>
          <InvoiceKpiBand summary={summarizeInvoices(invoices)} />
          <InvoiceTable invoices={invoices} />
        </>
      )}
    </div>
  );
}
