import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PricingSection from '@/modules/settings/ui/PricingSection';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { APP_NAME } from '@/config/constants';
import { buildSubscriptionSnapshot } from '@/modules/billing/application/access';
import { inferOnboardingCompleted } from '@/modules/settings/domain/onboarding';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/modules/billing/infrastructure/stripe/client';
import { syncSubscription } from '@/modules/billing/application/subscription-sync';
import { syncSubscriptionCacheForUser } from '@/modules/billing/application/subscription-sync';
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

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );
  await syncSubscription(subscription, createAdminClient());

  return subscription;
}

function getStatusMessage(subscriptionState?: string) {
  if (subscriptionState === 'success') {
    return {
      title: 'Checkout complete',
      body: 'We are confirming your subscription with Stripe now. If this page does not move you into the dashboard within a few seconds, refresh once.',
      tone: 'border-primary-fixed bg-success-container text-primary/90',
    };
  }

  if (subscriptionState === 'canceled') {
    return {
      title: 'Checkout canceled',
      body: `No charge was made. Pick a plan when you are ready to start using ${APP_NAME}.`,
      tone: 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
    };
  }

  return null;
}

export default async function SubscribePage({
  searchParams,
}: SubscribePageProps) {
  const user = await requireCurrentUser();

  const resolvedSearchParams = await searchParams;
  if (resolvedSearchParams?.subscription === 'success') {
    try {
      await syncCheckoutSuccessForUser(
        user.id,
        resolvedSearchParams.session_id
      );
    } catch (error) {
      console.error('Failed to sync checkout success on subscribe page', error);
    }
  }

  const [{ data: profile }, subscription] = await Promise.all([
    getOnboardingProfileForCurrentUser(),
    syncSubscriptionCacheForUser(user.id).catch(async (subscriptionError) => {
      console.error(
        'Failed to reconcile subscription cache for subscribe page',
        subscriptionError
      );
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
    <main className="bg-surface min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-6 shadow-lg md:p-8">
            <SectionLabel className="text-primary-container">
              Activate {APP_NAME}
            </SectionLabel>
            <h1 className="text-on-surface mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Finish checkout before using the quoting workspace.
            </h1>
            <p className="text-on-surface-variant mt-4 max-w-2xl text-sm leading-6 md:text-base">
              Your account is ready, but quotes, customers, invoices, and
              dashboard workflows stay locked until a plan is active.
            </p>

            {statusMessage && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 ${statusMessage.tone}`}
              >
                <p className="text-sm font-semibold">{statusMessage.title}</p>
                <p className="mt-1 text-sm">{statusMessage.body}</p>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border-outline bg-surface-container-low rounded-2xl border px-4 py-4">
                <p className="text-on-surface text-sm font-semibold">
                  What unlocks after payment
                </p>
                <ul className="text-on-surface-variant mt-3 space-y-2 text-sm">
                  <li>Quotes, customers, and invoices</li>
                  <li>PDF generation and billing workflows</li>
                  <li>Starter or Pro feature set based on your plan</li>
                </ul>
              </div>

              <div className="border-outline bg-surface-container-low rounded-2xl border px-4 py-4">
                <p className="text-on-surface text-sm font-semibold">
                  Need to update business details?
                </p>
                <p className="text-on-surface-variant mt-3 text-sm">
                  You can still finish setup before paying.
                </p>
                <Link
                  href="/onboarding"
                  className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Back to onboarding
                </Link>
              </div>
            </div>
          </section>

          <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-5 shadow-lg md:p-6">
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
