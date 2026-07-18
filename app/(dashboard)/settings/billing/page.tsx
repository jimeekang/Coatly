import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import PricingSection from '@/modules/settings/ui/PricingSection';
import { syncSubscriptionCacheForUser } from '@/modules/billing/application/subscription-sync';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Billing' };

export default async function BillingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const subscription = await syncSubscriptionCacheForUser(user.id).catch(
    async (subscriptionError) => {
      console.error('Failed to reconcile subscription cache for billing page', subscriptionError);

      const { data } = await supabase
        .from('subscriptions')
        .select(
          'plan, status, stripe_customer_id, current_period_end, cancel_at_period_end, cancel_at'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    }
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Billing & subscription"
        subtitle="Choose your plan, open Stripe billing portal tools, or manage renewal timing."
        backHref="/settings"
        backLabel="Settings"
      />

      <PricingSection subscription={subscription} returnPath="/settings/billing" />
    </div>
  );
}
