import type { Metadata } from 'next';
import { CustomerCreateScreen } from '@/modules/customers/ui/CustomerCreateScreen';
import { PageHeader } from '@/components/layout/PageHeader';
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
      <PageHeader
        title="New Customer"
        backHref="/customers"
        backLabel="Back to customers"
        className="mb-6"
      />

      <CustomerCreateScreen canUseAI={subscription?.features.ai ?? false} />
    </div>
  );
}
