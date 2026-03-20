import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripeClient();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle events — expanded in Phase 0 Week 2
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // TODO: sync subscription status to Supabase
      console.log(`Subscription event: ${event.type}`, event.data.object);
      break;

    case 'invoice.payment_succeeded':
      // TODO: update subscription paid_at
      break;

    case 'invoice.payment_failed':
      // TODO: handle failed payment (notify user)
      break;

    default:
      // Unhandled event type — safe to ignore
      break;
  }

  return NextResponse.json({ received: true });
}
