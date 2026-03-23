import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  syncSubscription,
  type StripeSubscriptionWithPeriods,
} from '@/lib/stripe/subscription-sync';
import type Stripe from 'stripe';

async function syncCheckoutSessionSubscription(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  if (session.mode !== 'subscription' || !session.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  if (!subscription.metadata?.user_id && session.metadata?.user_id) {
    const nextMetadata = {
      user_id: session.metadata.user_id,
      plan_id: session.metadata.plan_id ?? 'starter',
    };

    await stripe.subscriptions.update(subscription.id, {
      metadata: nextMetadata,
    });

    subscription.metadata = {
      ...subscription.metadata,
      ...nextMetadata,
    };
  }

  await syncSubscription(subscription, createAdminClient());
}

export async function handleStripeWebhook(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      await syncCheckoutSessionSubscription(
        stripe,
        event.data.object as Stripe.Checkout.Session
      );
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as StripeSubscriptionWithPeriods;
      await syncSubscription(subscription, supabase);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn('Payment failed for invoice:', invoice.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
