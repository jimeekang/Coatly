import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { ensureManagedPortalConfiguration } from '@/lib/stripe/portal';
import { getStripePriceId } from '@/lib/stripe/plans';
import {
  hasScheduledCancellationAtPeriodEnd,
  syncSubscription,
  syncSubscriptionCacheForUser,
  type StripeSubscriptionWithPeriods,
} from '@/lib/stripe/subscription-sync';
import type { BillingInterval, PlanId } from '@/config/plans';
import type Stripe from 'stripe';

type PortalFlow =
  | 'payment_method_update'
  | 'subscription_cancel'
  | 'subscription_update'
  | 'subscription_update_confirm';

function isPortalFlow(value: unknown): value is PortalFlow {
  return (
    value === 'payment_method_update' ||
    value === 'subscription_cancel' ||
    value === 'subscription_update' ||
    value === 'subscription_update_confirm'
  );
}

function isPlanId(value: unknown): value is PlanId {
  return value === 'starter' || value === 'pro';
}

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'monthly' || value === 'annual';
}

async function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const headerStore = await headers();
  const host =
    headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
  const protocol =
    headerStore.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

function buildPortalFlowData(
  flow: PortalFlow,
  stripeSubscriptionId: string,
  returnUrl: string,
  options?: {
    subscriptionItemId?: string;
    targetPriceId?: string;
    quantity?: number;
  }
): Stripe.BillingPortal.SessionCreateParams.FlowData {
  const afterCompletion: Stripe.BillingPortal.SessionCreateParams.FlowData.AfterCompletion = {
    type: 'redirect',
    redirect: { return_url: returnUrl },
  };

  if (flow === 'payment_method_update') {
    return {
      type: flow,
      after_completion: afterCompletion,
    };
  }

  if (flow === 'subscription_cancel') {
    return {
      type: flow,
      after_completion: afterCompletion,
      subscription_cancel: { subscription: stripeSubscriptionId },
    };
  }

  if (flow === 'subscription_update_confirm') {
    if (!options?.subscriptionItemId || !options.targetPriceId) {
      throw new Error('Missing subscription item or target price for plan update confirmation');
    }

    return {
      type: flow,
      after_completion: afterCompletion,
      subscription_update_confirm: {
        subscription: stripeSubscriptionId,
        items: [
          {
            id: options.subscriptionItemId,
            price: options.targetPriceId,
            quantity: options.quantity,
          },
        ],
      },
    };
  }

  return {
    type: flow,
    after_completion: afterCompletion,
    subscription_update: { subscription: stripeSubscriptionId },
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    flow?: unknown;
    returnPath?: unknown;
    planId?: unknown;
    interval?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    // Allow empty POST bodies for the default portal homepage.
  }

  if (body.flow !== undefined && !isPortalFlow(body.flow)) {
    return NextResponse.json({ error: 'Invalid portal flow' }, { status: 400 });
  }

  const returnPath =
    typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/settings';
  const targetPlanId = isPlanId(body.planId) ? body.planId : null;
  const targetInterval = isBillingInterval(body.interval) ? body.interval : 'monthly';

  let subscription;
  try {
    subscription = await syncSubscriptionCacheForUser(user.id);
  } catch (error) {
    console.error('Failed to reconcile subscription cache for billing portal', error);
    return NextResponse.json({ error: 'Could not load subscription' }, { status: 500 });
  }

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing profile found' }, { status: 400 });
  }

  const returnUrl = `${await getBaseUrl()}${returnPath}`;
  const stripe = getStripeClient();
  
  try {
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: subscription.stripe_customer_id,
      locale: 'en-AU',
      return_url: returnUrl,
    };

    if (body.flow) {
      if (body.flow === 'payment_method_update') {
        sessionParams.flow_data = buildPortalFlowData(body.flow, '', returnUrl);
      } else if (!subscription.stripe_subscription_id) {
        return NextResponse.json(
          { error: 'No subscription found to manage' },
          { status: 400 }
        );
      } else if (body.flow === 'subscription_cancel') {
        const stripeSubscription = (await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        )) as StripeSubscriptionWithPeriods;
        const currentItem = stripeSubscription.items.data[0];
        const periodEnd =
          stripeSubscription.current_period_end ?? currentItem?.current_period_end ?? null;

        if (hasScheduledCancellationAtPeriodEnd(stripeSubscription, periodEnd)) {
          await syncSubscription(stripeSubscription);
          return NextResponse.json(
            {
              error:
                'Cancellation is already scheduled for the end of the current billing period.',
              code: 'already_canceling',
              refresh: true,
            },
            { status: 409 }
          );
        }

        sessionParams.flow_data = buildPortalFlowData(
          body.flow,
          subscription.stripe_subscription_id,
          returnUrl
        );
      } else if (body.flow === 'subscription_update_confirm') {
        if (!targetPlanId) {
          return NextResponse.json({ error: 'Target plan is required' }, { status: 400 });
        }

        sessionParams.configuration = await ensureManagedPortalConfiguration(stripe);

        const targetPriceId = getStripePriceId(targetPlanId, targetInterval);
        if (!targetPriceId) {
          return NextResponse.json(
            { error: 'Target Stripe price is not configured' },
            { status: 500 }
          );
        }

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        )) as StripeSubscriptionWithPeriods;
        const currentItem = stripeSubscription.items.data[0];

        if (!currentItem?.id) {
          return NextResponse.json(
            { error: 'Could not find the current subscription item' },
            { status: 500 }
          );
        }

        if (currentItem.price.id === targetPriceId) {
          return NextResponse.json(
            { error: 'You are already on that billing option' },
            { status: 400 }
          );
        }

        const targetPrice = await stripe.prices.retrieve(targetPriceId);
        if (!targetPrice.recurring?.interval) {
          return NextResponse.json(
            {
              error:
                'Target Stripe price must be recurring for subscription changes.',
            },
            { status: 500 }
          );
        }

        sessionParams.flow_data = buildPortalFlowData(
          body.flow,
          subscription.stripe_subscription_id,
          returnUrl,
          {
            subscriptionItemId: currentItem.id,
            targetPriceId,
            quantity: currentItem.quantity ?? 1,
          }
        );
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create(sessionParams);
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Failed to create Stripe billing portal session', error);
    return NextResponse.json(
      { error: 'Failed to open Stripe billing portal' },
      { status: 500 }
    );
  }
}
