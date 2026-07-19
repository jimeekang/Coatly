'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { PLANS } from '@/config/plans';
import type { BillingInterval, PlanId } from '@/config/plans';

interface CurrentSubscription {
  plan: string | null;
  status: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
}

interface PricingSectionProps {
  subscription: CurrentSubscription | null;
  mode?: 'settings' | 'subscribe';
  returnPath?: string;
}

type PortalFlow =
  | 'payment_method_update'
  | 'subscription_cancel'
  | 'subscription_update_confirm';
type LoadingState =
  | PlanId
  | 'portal-payment'
  | 'portal-invoices'
  | 'portal-cancel'
  | 'portal-resume'
  | 'starter-change'
  | 'pro-change'
  | null;
type DialogState = 'downgrade' | null;

function isPlanId(value: string | null): value is PlanId {
  return value === 'starter' || value === 'pro';
}

function formatDate(date: string | null): string | null {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PricingSection({
  subscription,
  mode = 'settings',
  returnPath = '/settings/billing',
}: PricingSectionProps) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<LoadingState>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawPlan = subscription?.plan ?? null;
  const currentPlan: PlanId | null = isPlanId(rawPlan) ? rawPlan : null;
  const isActive =
    subscription?.status === 'active' || subscription?.status === 'trialing';
  const hasSubscription = isActive && !!subscription?.stripe_customer_id;
  const cancelScheduled =
    hasSubscription && Boolean(subscription?.cancel_at_period_end);
  const renewalDate = formatDate(subscription?.current_period_end ?? null);
  const accessUntilDate = formatDate(
    subscription?.cancel_at ?? subscription?.current_period_end ?? null
  );

  function formatPrice(cents: number) {
    return `A$${(cents / 100).toFixed(0)}`;
  }

  function getPriceForInterval(planId: PlanId) {
    const plan = PLANS[planId];
    return interval === 'monthly' ? plan.monthlyPrice : plan.annualTotal;
  }

  async function handleSubscribe(planId: PlanId) {
    setErrorMessage(null);
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval, returnPath }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMessage(data.error ?? 'Something went wrong');
    } catch {
      setErrorMessage('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  }

  async function openBillingPortal(options?: {
    flow?: PortalFlow;
    planId?: PlanId;
    interval?: BillingInterval;
    loadingState?: LoadingState;
  }) {
    const loadingState = options?.loadingState ?? 'portal-invoices';
    setErrorMessage(null);
    setLoading(loadingState);

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: options?.flow,
          planId: options?.planId,
          interval: options?.interval,
          returnPath,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.refresh) {
        router.refresh();
        if (data.code === 'already_canceling') {
          return;
        }
      }
      setErrorMessage(data.error ?? 'Something went wrong');
    } catch {
      setErrorMessage('Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  }

  async function resumeRenewal() {
    setErrorMessage(null);
    setLoading('portal-resume');

    try {
      const res = await fetch('/api/stripe/renew', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Failed to resume renewal');
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage('Failed to resume renewal');
    } finally {
      setLoading(null);
    }
  }

  function openDowngradeDialog() {
    setDialog('downgrade');
  }

  async function confirmDowngrade() {
    setDialog(null);
    await openBillingPortal({
      flow: 'subscription_update_confirm',
      planId: 'starter',
      interval,
      loadingState: 'starter-change',
    });
  }

  function getPlanAction(planId: PlanId) {
    if (!hasSubscription || !currentPlan || currentPlan === planId) {
      return null;
    }

    if (cancelScheduled) {
      return {
        disabled: true,
        label: 'Resume renewal to change plans',
        note: accessUntilDate
          ? `Renewal is currently off. Resume before ${accessUntilDate} to make another plan change.`
          : 'Renewal is currently off. Resume renewal before changing plans.',
      };
    }

    if (currentPlan === 'starter' && planId === 'pro') {
      return {
        disabled: false,
        loadingState: 'pro-change' as const,
        label: 'Upgrade to Pro now',
        note: 'You will be charged immediately and Pro features unlock straight away.',
      };
    }

    if (currentPlan === 'pro' && planId === 'starter') {
      return {
        disabled: false,
        loadingState: 'starter-change' as const,
        label: renewalDate
          ? `Downgrade to Starter on ${renewalDate}`
          : 'Downgrade to Starter at renewal',
        note: accessUntilDate
          ? `You keep Pro until ${accessUntilDate}. Starter begins from the next renewal date.`
          : 'You keep Pro until the end of the current billing period.',
      };
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-on-surface text-lg font-semibold">
          Subscription Plan
        </h3>
        <p className="text-on-surface-variant mt-1 text-sm">
          {mode === 'subscribe'
            ? 'Choose a plan to unlock quoting, customers, invoices, and the rest of the dashboard.'
            : 'Pick the plan that matches how you quote, invoice, and manage follow-up work.'}
        </p>
      </div>

      {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}

      {hasSubscription && currentPlan && (
        <div className="border-success-container bg-success-container rounded-xl border px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-primary text-sm font-medium">
                  Current plan:{' '}
                  <span className="font-semibold">
                    {PLANS[currentPlan].name}
                  </span>{' '}
                  <span className="bg-primary-fixed/40 text-primary/90 rounded-full px-2 py-0.5 text-xs">
                    {cancelScheduled ? 'Renewal off' : 'Active'}
                  </span>
                </p>
                {cancelScheduled ? (
                  <p className="text-on-error-container mt-0.5 text-xs">
                    {accessUntilDate
                      ? `Cancellation scheduled. You can keep using ${PLANS[currentPlan].name} until ${accessUntilDate}.`
                      : 'Cancellation scheduled. You can keep using your current plan until the paid period ends.'}
                  </p>
                ) : renewalDate ? (
                  <p className="text-primary-container mt-0.5 text-xs">
                    Renews {renewalDate}
                  </p>
                ) : null}
                <p className="text-primary/90 mt-1 text-xs">
                  Starter to Pro upgrades are charged immediately and unlock
                  straight away. Pro to Starter downgrades take effect from the
                  next renewal date.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    openBillingPortal({
                      flow: 'payment_method_update',
                      loadingState: 'portal-payment',
                    })
                  }
                  disabled={loading === 'portal-payment'}
                  className="border-primary-fixed bg-surface-container-lowest text-primary/90 hover:bg-success-container focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                >
                  {loading === 'portal-payment'
                    ? 'Loading...'
                    : 'Update payment method'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openBillingPortal({ loadingState: 'portal-invoices' })
                  }
                  disabled={loading === 'portal-invoices'}
                  className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                >
                  {loading === 'portal-invoices'
                    ? 'Loading...'
                    : 'Invoices & receipts'}
                </button>
                {cancelScheduled ? (
                  <button
                    type="button"
                    onClick={resumeRenewal}
                    disabled={loading === 'portal-resume'}
                    className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/40 min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    {loading === 'portal-resume'
                      ? 'Loading...'
                      : 'Resume renewal'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openBillingPortal({
                        flow: 'subscription_cancel',
                        loadingState: 'portal-cancel',
                      })
                    }
                    disabled={loading === 'portal-cancel'}
                    className="border-error bg-surface-container-lowest text-on-error-container hover:bg-error-container focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    {loading === 'portal-cancel'
                      ? 'Loading...'
                      : 'Cancel at renewal'}
                  </button>
                )}
              </div>
            </div>

            <div className="border-primary-fixed/70 bg-surface-container-lowest/70 text-on-surface-variant rounded-xl border px-3 py-2 text-xs">
              Update payment method opens the Stripe card screen. Invoices &
              receipts opens your Stripe billing portal home with billing
              history and downloadable invoices.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-on-surface-variant text-sm">Billing:</span>
        <div className="border-outline-variant bg-surface-container-low flex rounded-xl border p-0.5">
          {(['monthly', 'annual'] as BillingInterval[]).map(
            (selectedInterval) => (
              <button
                key={selectedInterval}
                type="button"
                onClick={() => setInterval(selectedInterval)}
                aria-pressed={interval === selectedInterval}
                className={`focus-visible:ring-primary/40 min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  interval === selectedInterval
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {selectedInterval === 'monthly' ? 'Monthly' : 'Annual'}
                {selectedInterval === 'annual' && (
                  <span className="bg-success-container text-primary/90 ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium">
                    Save up to 15%
                  </span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const price = getPriceForInterval(planId);
          const isCurrent = hasSubscription && currentPlan === planId;
          const action = getPlanAction(planId);

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border p-5 transition-shadow ${
                planId === 'pro'
                  ? 'border-primary-container ring-primary-container ring-1'
                  : 'border-outline'
              } ${isCurrent ? 'bg-success-container/30' : 'bg-surface-container-lowest'}`}
            >
              {planId === 'pro' && (
                <span className="bg-primary text-on-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-on-surface text-base font-semibold">
                    {plan.name}
                  </h4>
                  {isCurrent && (
                    <span className="bg-success-container text-primary/90 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant mt-0.5 text-sm">
                  {plan.description}
                </p>
                <SectionLabel className="text-primary-container mt-2">
                  {planId === 'starter'
                    ? 'Solo painters'
                    : 'Small crews up to 3'}
                </SectionLabel>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-on-surface text-3xl font-bold">
                    {formatPrice(price)}
                  </span>
                  <span className="text-on-surface-variant text-sm">
                    {interval === 'annual' ? '/yr' : '/mo'}
                  </span>
                </div>
                {interval === 'annual' && (
                  <p className="text-primary-container mt-1 text-xs font-medium">
                    Save{' '}
                    {formatPrice(
                      PLANS[planId].monthlyPrice * 12 -
                        PLANS[planId].annualTotal
                    )}
                    /yr vs monthly
                  </p>
                )}
              </div>

              <ul className="mb-5 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-on-surface-variant flex min-h-6 items-start gap-2 text-sm"
                  >
                    <svg
                      className="text-primary-container mt-0.5 h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="bg-success-container text-primary/90 rounded-xl px-4 py-2.5 text-center text-sm font-medium">
                  Current plan
                </div>
              ) : hasSubscription && action ? (
                <button
                  type="button"
                  onClick={() => {
                    if (action.disabled) {
                      return;
                    }

                    if (planId === 'starter' && currentPlan === 'pro') {
                      openDowngradeDialog();
                      return;
                    }

                    openBillingPortal({
                      flow: 'subscription_update_confirm',
                      planId,
                      interval,
                      loadingState: action.loadingState,
                    });
                  }}
                  disabled={action.disabled || loading === action.loadingState}
                  className={`focus-visible:ring-primary/40 min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${
                    planId === 'pro'
                      ? 'bg-primary text-on-primary hover:bg-primary/90'
                      : 'border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border'
                  }`}
                >
                  {loading === action.loadingState
                    ? 'Loading...'
                    : action.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubscribe(planId)}
                  disabled={loading === planId}
                  className={`focus-visible:ring-primary/40 min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${
                    planId === 'pro'
                      ? 'bg-primary text-on-primary hover:bg-primary/90'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border'
                  }`}
                >
                  {loading === planId
                    ? 'Loading...'
                    : mode === 'subscribe'
                      ? `Start ${plan.name}`
                      : `Get ${plan.name}`}
                </button>
              )}

              {action && (
                <p className="text-on-surface-variant mt-2 text-center text-xs">
                  {action.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-on-surface-variant text-xs">
        Starter is built for sole traders. Pro adds unlimited quotes, unlimited
        templates, and priority support for small crews. Plan changes and
        cancellations are handled in Stripe.
      </p>

      <ConfirmDialog
        open={dialog === 'downgrade'}
        title="Downgrade At Renewal?"
        message={
          accessUntilDate
            ? `Starter will begin from ${accessUntilDate}. You can keep using Pro until then, and Stripe will show the final confirmation before saving the downgrade.`
            : 'Starter will begin from the next renewal date. You can keep using Pro until then, and Stripe will show the final confirmation before saving the downgrade.'
        }
        confirmLabel="Continue In Stripe"
        cancelLabel="Keep Pro"
        onConfirm={confirmDowngrade}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
