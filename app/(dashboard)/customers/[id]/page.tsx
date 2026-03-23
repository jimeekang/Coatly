import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCustomer } from '@/app/actions/customers';
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
  const { data: customer, error } = await getCustomer(id);

  if (!customer || error) notFound();

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/customers"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-pm-surface text-pm-secondary active:bg-pm-border transition-colors"
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
          <h1 className="text-2xl font-bold text-pm-body truncate">{customer.name}</h1>
          {customer.company_name && (
            <p className="text-sm text-pm-secondary truncate">{customer.company_name}</p>
          )}
        </div>
      </div>

      <CustomerDetail customer={customer} />
    </div>
  );
}
