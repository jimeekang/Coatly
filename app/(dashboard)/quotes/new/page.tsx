import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'New Quote' };

export default function NewQuotePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">New Quote</h2>
      <p className="text-gray-500">m² Quote Calculator coming in Phase 1.</p>
    </div>
  );
}
