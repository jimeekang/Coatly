import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PricingSection from '@/components/settings/PricingSection';
import { syncSubscriptionCacheForUser } from '@/lib/stripe/subscription-sync';
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-pm-body">Billing & subscription</h2>
        <p className="mt-1 text-sm text-pm-secondary">
          Choose your plan, open Stripe billing portal tools, or manage renewal timing.
        </p>
      </div>

      <PricingSection subscription={subscription} returnPath="/settings/billing" />
    </div>
  );
}
