import type { Metadata } from 'next';
import { getCustomers, getRecentJobsPerCustomer } from '@/app/actions/customers';
import { CustomerTable } from '@/components/customers/CustomerTable';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader, PrimaryActionLink } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage() {
  const [{ data: customers, error }, recentJobs] = await Promise.all([
    getCustomers(),
    getRecentJobsPerCustomer(),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Customers"
        subtitle={customers.length > 0 ? `${customers.length} total` : undefined}
        action={<PrimaryActionLink href="/customers/new">+ New Customer</PrimaryActionLink>}
      />

      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : (
        <CustomerTable customers={customers} recentJobs={recentJobs} />
      )}
    </div>
  );
}
