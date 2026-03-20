import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'New Invoice' };

export default function NewInvoicePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">New Invoice</h2>
      <p className="text-gray-500">Invoice creation coming in Phase 1.</p>
    </div>
  );
}
