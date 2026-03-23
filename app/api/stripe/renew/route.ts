import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import {
  syncSubscription,
  syncSubscriptionCacheForUser,
} from '@/lib/stripe/subscription-sync';

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let subscription;
  try {
    subscription = await syncSubscriptionCacheForUser(user.id);
  } catch (error) {
    console.error('Failed to reconcile subscription cache for renewal resume', error);
    return NextResponse.json({ error: 'Could not load subscription' }, { status: 500 });
  }

  if (!subscription?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  if (!subscription.cancel_at_period_end) {
    return NextResponse.json({ error: 'Subscription is already renewing' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    await syncSubscription(updatedSubscription);

    return NextResponse.json({ success: true });
  } catch (resumeError) {
    console.error('Failed to resume Stripe subscription renewal', resumeError);
    return NextResponse.json({ error: 'Failed to resume renewal' }, { status: 500 });
  }
}
