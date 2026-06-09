import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCustomer } from '@/modules/customers/application/actions';
import { getQuotesByCustomer } from '@/modules/quotes/application/actions';
import { getInvoicesByCustomer } from '@/modules/invoices/application/actions';
import { CustomerDetail } from '@/modules/customers/ui/CustomerDetail';
import { PageHeader } from '@/components/layout/PageHeader';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getCustomer(id);
  return { title: data?.name ?? 'Customer' };
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ data: customer, error }, { data: quotes }, { data: invoices }] = await Promise.all([
    getCustomer(id),
    getQuotesByCustomer(id),
    getInvoicesByCustomer(id),
  ]);

  if (!customer || error) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 md:max-w-2xl">
      <PageHeader
        title={customer.name}
        subtitle={customer.company_name ?? undefined}
        backHref="/customers"
        backLabel="Back to customers"
        className="mb-6"
      />

      <CustomerDetail customer={customer} quotes={quotes} invoices={invoices} />
    </div>
  );
}
