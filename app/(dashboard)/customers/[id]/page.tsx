import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCustomer } from '@/app/actions/customers';
import { getQuotesByCustomer } from '@/app/actions/quotes';
import { getInvoicesByCustomer } from '@/app/actions/invoices';
import { CustomerDetail } from '@/components/customers/CustomerDetail';

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
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/customers"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors active:bg-surface-container-high"
          aria-label="Back to customers"
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
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-on-surface truncate">{customer.name}</h1>
          {customer.company_name && (
            <p className="text-sm text-on-surface-variant truncate">{customer.company_name}</p>
          )}
        </div>
      </div>

      <CustomerDetail customer={customer} quotes={quotes} invoices={invoices} />
    </div>
  );
}
