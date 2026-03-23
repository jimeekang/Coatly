import Link from 'next/link';
import type { Metadata } from 'next';
import { getCustomers } from '@/app/actions/customers';
import { CustomerTable } from '@/components/customers/CustomerTable';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage() {
  const { data: customers, error } = await getCustomers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-pm-body">Customers</h1>
          {customers.length > 0 && (
            <p className="text-sm text-pm-secondary mt-0.5">{customers.length} total</p>
          )}
        </div>
        <Link
          href="/customers/new"
          className="rounded-lg bg-pm-teal px-4 py-2.5 text-sm text-white font-medium hover:bg-pm-teal-hover transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg bg-pm-coral-light border border-pm-coral px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      ) : (
        <CustomerTable customers={customers} />
      )}
    </div>
  );
}
