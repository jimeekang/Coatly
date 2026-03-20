import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Billing' };

export default function BillingPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
      <p className="text-gray-500">Stripe subscription management coming in Phase 0 Week 2.</p>
    </div>
  );
}
