import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getStripePriceId } from '@/lib/stripe/plans';
import type { PlanId, BillingInterval } from '@/config/plans';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { planId?: unknown; interval?: unknown; returnPath?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const planId = body.planId as PlanId;
  const interval = (body.interval ?? 'monthly') as BillingInterval;
  const returnPath =
    typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/subscribe';

  if (!planId || !['starter', 'pro'].includes(planId)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const priceId = getStripePriceId(planId, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: 'Price not configured — set STRIPE_PRICE_* env vars' },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Re-use existing Stripe customer if one was already created
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let customerId = subscription?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${returnPath}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${returnPath}?subscription=canceled`,
    // Pass user info so the webhook can sync to Supabase
    metadata: {
      user_id: user.id,
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
