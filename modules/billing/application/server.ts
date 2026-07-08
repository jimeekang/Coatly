import { buildSubscriptionSnapshot, getMonthlyActiveQuoteUsageForUser } from '@/modules/billing/application/access';
import { syncSubscriptionCacheForUser } from '@/modules/billing/application/subscription-sync';
import { createServerClient } from '@/lib/supabase/server';

type AppSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

export async function getLiveSubscriptionSnapshotForUser(userId: string) {
  try {
    const subscription = await syncSubscriptionCacheForUser(userId);

    return buildSubscriptionSnapshot({
      plan: subscription?.plan,
      status: subscription?.status,
      cancelScheduled: subscription?.cancel_at_period_end ?? false,
    });
  } catch (error) {
    console.error('Failed to load live subscription snapshot', error);
    return buildSubscriptionSnapshot();
  }
}

export async function getLiveMonthlyActiveQuoteUsageForUser(
  supabase: AppSupabaseClient,
  userId: string
) {
  const snapshot = await getLiveSubscriptionSnapshotForUser(userId);
  const usage = await getMonthlyActiveQuoteUsageForUser(supabase, userId, snapshot);

  return {
    snapshot,
    usage,
  };
}
