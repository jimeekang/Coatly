import Link from 'next/link';
import type { Metadata } from 'next';
import { CustomerCreateScreen } from '@/components/customers/CustomerCreateScreen';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveSubscriptionSnapshotForUser } from '@/lib/subscription/server';

export const metadata: Metadata = { title: 'New Customer' };

export default async function NewCustomerPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = user
    ? await getLiveSubscriptionSnapshotForUser(user.id)
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/customers"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-pm-surface text-pm-secondary active:bg-pm-border transition-colors"
          aria-label="Back to customers"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-pm-body">New Customer</h1>
      </div>

      <CustomerCreateScreen canUseAI={subscription?.features.ai ?? false} />
    </div>
  );
}
