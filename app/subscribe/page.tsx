import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PricingSection from '@/components/settings/PricingSection';
import { APP_NAME } from '@/config/constants';
import { buildSubscriptionSnapshot } from '@/lib/subscription/access';
import {
  inferOnboardingCompleted,
} from '@/lib/profile/onboarding';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';
import { syncSubscription } from '@/lib/stripe/subscription-sync';
import { syncSubscriptionCacheForUser } from '@/lib/stripe/subscription-sync';
import { createServerClient } from '@/lib/supabase/server';
import {
  getOnboardingProfileForCurrentUser,
  requireCurrentUser,
} from '@/lib/supabase/request-context';

export const metadata: Metadata = { title: 'Choose Plan' };

type SubscribePageProps = {
  searchParams?: Promise<{
    subscription?: string;
    session_id?: string;
  }>;
};

async function syncCheckoutSuccessForUser(userId: string, sessionId?: string) {
  if (!sessionId) {
    return null;
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (
    session.mode !== 'subscription' ||
    !session.subscription ||
    session.metadata?.user_id !== userId
  ) {
    return null;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  await syncSubscription(subscription, createAdminClient());

  return subscription;
}

function getStatusMessage(subscriptionState?: string) {
  if (subscriptionState === 'success') {
    return {
      title: 'Checkout complete',
      body: 'We are confirming your subscription with Stripe now. If this page does not move you into the dashboard within a few seconds, refresh once.',
      tone: 'border-pm-teal-pale bg-pm-teal-light text-pm-teal-hover',
    };
  }

  if (subscriptionState === 'canceled') {
    return {
      title: 'Checkout canceled',
      body: `No charge was made. Pick a plan when you are ready to start using ${APP_NAME}.`,
      tone: 'border-pm-border bg-white text-pm-secondary',
    };
  }

  return null;
}

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const user = await requireCurrentUser();

  const resolvedSearchParams = await searchParams;
  if (resolvedSearchParams?.subscription === 'success') {
    try {
      await syncCheckoutSuccessForUser(user.id, resolvedSearchParams.session_id);
    } catch (error) {
      console.error('Failed to sync checkout success on subscribe page', error);
    }
  }

  const [{ data: profile }, subscription] = await Promise.all([
    getOnboardingProfileForCurrentUser(),
    syncSubscriptionCacheForUser(user.id).catch(async (subscriptionError) => {
      console.error('Failed to reconcile subscription cache for subscribe page', subscriptionError);
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('subscriptions')
        .select(
          'plan, status, stripe_customer_id, current_period_end, cancel_at_period_end, cancel_at'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    }),
  ]);

  if (!inferOnboardingCompleted(profile)) {
    redirect('/onboarding');
  }

  const snapshot = buildSubscriptionSnapshot({
    plan: subscription?.plan,
    status: subscription?.status,
    cancelScheduled: subscription?.cancel_at_period_end ?? false,
  });

  if (snapshot.active) {
    redirect('/dashboard');
  }

  const statusMessage = getStatusMessage(resolvedSearchParams?.subscription);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(80,180,180,0.18),_transparent_42%),linear-gradient(180deg,_#f7fbfb_0%,_#eef5f4_100%)] px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_rgba(22,42,42,0.08)] backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-pm-teal-mid">
              Activate {APP_NAME}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-pm-body md:text-4xl">
              Finish checkout before using the quoting workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-pm-secondary md:text-base">
              Your account is ready, but quotes, customers, invoices, AI tools, and dashboard
              workflows stay locked until a plan is active.
            </p>

            {statusMessage && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 ${statusMessage.tone}`}>
                <p className="text-sm font-semibold">{statusMessage.title}</p>
                <p className="mt-1 text-sm">{statusMessage.body}</p>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-pm-border bg-pm-surface px-4 py-4">
                <p className="text-sm font-semibold text-pm-body">What unlocks after payment</p>
                <ul className="mt-3 space-y-2 text-sm text-pm-secondary">
                  <li>Quotes, customers, and invoices</li>
                  <li>PDF generation and billing workflows</li>
                  <li>Starter or Pro feature set based on your plan</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-pm-border bg-pm-surface px-4 py-4">
                <p className="text-sm font-semibold text-pm-body">Need to update business details?</p>
                <p className="mt-3 text-sm text-pm-secondary">
                  You can still finish setup before paying.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-pm-border px-4 py-2.5 text-sm font-semibold text-pm-body transition-colors hover:bg-white"
                >
                  Back to onboarding
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_60px_rgba(22,42,42,0.08)] backdrop-blur md:p-6">
            <PricingSection
              subscription={subscription}
              mode="subscribe"
              returnPath="/subscribe"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
