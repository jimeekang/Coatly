import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Invoice Detail' };

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Invoice #{params.id}</h2>
      <p className="text-gray-500">Invoice detail view coming in Phase 1.</p>
    </div>
  );
}
