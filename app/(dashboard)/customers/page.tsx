import Link from 'next/link';
import type { Metadata } from 'next';
import { getCustomers, getRecentJobsPerCustomer } from '@/app/actions/customers';
import { CustomerTable } from '@/components/customers/CustomerTable';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage() {
  const [{ data: customers, error }, recentJobs] = await Promise.all([
    getCustomers(),
    getRecentJobsPerCustomer(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-on-surface">Customers</h1>
          {customers.length > 0 && (
            <p className="text-sm text-on-surface-variant mt-0.5">{customers.length} total</p>
          )}
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm text-on-primary font-semibold hover:opacity-90 transition-opacity"
        >
          + Add Customer
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg bg-error-container border border-error/20 px-4 py-3">
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      ) : (
        <CustomerTable customers={customers} recentJobs={recentJobs} />
      )}
    </div>
  );
}
