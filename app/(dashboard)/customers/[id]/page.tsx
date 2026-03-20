import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Customer Detail' };

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer</h2>
      <p className="text-gray-500">Customer detail + history coming in Phase 1.</p>
    </div>
  );
}
