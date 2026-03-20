import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white font-medium hover:bg-blue-800 transition-colors">
          Add Customer
        </button>
      </div>
      <p className="text-gray-500">Customer list coming in Phase 1.</p>
    </div>
  );
}
