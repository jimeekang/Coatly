import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Invoices' };

export default function InvoicesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white font-medium hover:bg-blue-800 transition-colors"
        >
          New Invoice
        </Link>
      </div>
      <p className="text-gray-500">Invoice list coming in Phase 1.</p>
    </div>
  );
}
