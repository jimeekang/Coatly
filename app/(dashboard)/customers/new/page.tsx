import type { Metadata } from 'next';
import { CustomerCreateScreen } from '@/components/customers/CustomerCreateScreen';
import { BackButton } from '@/components/layout/BackButton';
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
    <div className="mx-auto max-w-lg px-4 pt-4 md:max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <BackButton href="/customers" label="Back to customers" />
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-[28px]">
          New Customer
        </h1>
      </div>

      <CustomerCreateScreen canUseAI={subscription?.features.ai ?? false} />
    </div>
  );
}
