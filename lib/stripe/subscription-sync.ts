import type Stripe from 'stripe';
import { STRIPE_PRICE_IDS } from '@/lib/stripe/plans';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppDatabase } from '@/types/app-database';

type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
type KnownPlanId = 'starter' | 'pro';
type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};
type SubscriptionCacheRow =
  AppDatabase['public']['Tables']['subscriptions']['Row'];
type AdminClient = ReturnType<typeof createAdminClient>;

const PRICE_ID_TO_PLAN = new Map<string, KnownPlanId>(
  Object.entries(STRIPE_PRICE_IDS).flatMap(([planId, intervals]) =>
    Object.values(intervals)
      .filter((priceId): priceId is string => Boolean(priceId))
      .map((priceId) => [priceId, planId as KnownPlanId] as const)
  )
);

export function toDbStatus(
  stripeStatus: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    default:
      return 'cancelled';
  }
}

function hasScheduledCancellationAtPeriodEnd(
  subscription: StripeSubscriptionWithPeriods,
  periodEnd: number | null | undefined
) {
  if (subscription.cancel_at_period_end) {
    return true;
  }

  return Boolean(
    subscription.cancel_at &&
      periodEnd &&
      subscription.cancel_at === periodEnd &&
      (subscription.status === 'active' ||
        subscription.status === 'trialing' ||
        subscription.status === 'past_due')
  );
}

function inferPlanId(subscription: Stripe.Subscription): KnownPlanId | null {
  const currentPriceId = subscription.items.data[0]?.price?.id;
  if (currentPriceId && PRICE_ID_TO_PLAN.has(currentPriceId)) {
    return PRICE_ID_TO_PLAN.get(currentPriceId) ?? null;
  }

  const metadataPlan = subscription.metadata?.plan_id;
  if (metadataPlan === 'starter' || metadataPlan === 'pro') {
    return metadataPlan;
  }

  return null;
}

async function loadSubscriptionCache(
  supabase: AdminClient,
  userId: string
): Promise<SubscriptionCacheRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, cancel_at, created_at, updated_at, id'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription cache: ${error.message}`);
  }

  return data;
}

async function markSubscriptionCacheCancelled(
  supabase: AdminClient,
  cachedSubscription: SubscriptionCacheRow
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: null,
      status: 'cancelled',
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      cancel_at: null,
    })
    .eq('user_id', cachedSubscription.user_id);

  if (error) {
    throw new Error(`Failed to mark subscription cache as cancelled: ${error.message}`);
  }
}

function isStripeResourceMissingError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'resource_missing'
  );
}

export async function syncSubscription(
  subscription: StripeSubscriptionWithPeriods,
  supabase: AdminClient = createAdminClient()
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('syncSubscription: no user_id in subscription metadata', subscription.id);
    return;
  }

  const planId = inferPlanId(subscription);

  const item = subscription.items?.data?.[0];
  const periodStart =
    subscription.current_period_start ||
    item?.current_period_start ||
    subscription.billing_cycle_anchor;
  const periodEnd = subscription.current_period_end || item?.current_period_end;
  const cancelAtPeriodEnd = hasScheduledCancellationAtPeriodEnd(subscription, periodEnd);

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan: planId,
      status: toDbStatus(subscription.status),
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to sync subscription cache: ${error.message}`);
  }
}

export async function syncSubscriptionCacheForUser(userId: string) {
  const supabase = createAdminClient();
  const cachedSubscription = await loadSubscriptionCache(supabase, userId);

  if (!cachedSubscription?.stripe_subscription_id) {
    return cachedSubscription;
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      cachedSubscription.stripe_subscription_id
    );

    await syncSubscription(subscription, supabase);
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      await markSubscriptionCacheCancelled(supabase, cachedSubscription);
    } else {
      throw error;
    }
  }

  return loadSubscriptionCache(supabase, userId);
}

export type { StripeSubscriptionWithPeriods };
export { hasScheduledCancellationAtPeriodEnd };
