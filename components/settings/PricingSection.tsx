'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

  const rawPlan = subscription?.plan ?? null;
  const currentPlan: PlanId | null = isPlanId(rawPlan) ? rawPlan : null;
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const hasSubscription = isActive && !!subscription?.stripe_customer_id;
  const cancelScheduled = hasSubscription && Boolean(subscription?.cancel_at_period_end);
  const renewalDate = formatDate(subscription?.current_period_end ?? null);
  const accessUntilDate = formatDate(subscription?.cancel_at ?? subscription?.current_period_end ?? null);

  function formatPrice(cents: number) {
    return `A$${(cents / 100).toFixed(0)}`;
  }

  function getPriceForInterval(planId: PlanId) {
    const plan = PLANS[planId];
    return interval === 'monthly' ? plan.monthlyPrice : plan.annualTotal;
  }

  async function handleSubscribe(planId: PlanId) {
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
      alert(data.error ?? 'Something went wrong');
    } catch {
      alert('Failed to start checkout');
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
      alert(data.error ?? 'Something went wrong');
    } catch {
      alert('Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  }

  async function resumeRenewal() {
    setLoading('portal-resume');

    try {
      const res = await fetch('/api/stripe/renew', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? 'Failed to resume renewal');
        return;
      }

      router.refresh();
    } catch {
      alert('Failed to resume renewal');
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
        <h3 className="text-lg font-semibold text-pm-body">Subscription Plan</h3>
        <p className="mt-1 text-sm text-pm-secondary">
          {mode === 'subscribe'
            ? 'Choose a plan to unlock quoting, customers, invoices, and the rest of the dashboard.'
            : 'Pick the plan that matches how you quote, invoice, and manage follow-up work.'}
        </p>
      </div>

      {hasSubscription && currentPlan && (
        <div className="rounded-xl border border-pm-teal-light bg-pm-teal-light px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-pm-teal">
                  Current plan: <span className="font-semibold">{PLANS[currentPlan].name}</span>{' '}
                  <span className="rounded-full bg-pm-teal-pale/40 px-2 py-0.5 text-xs text-pm-teal-hover">
                    {cancelScheduled ? 'Renewal off' : 'Active'}
                  </span>
                </p>
                {cancelScheduled ? (
                  <p className="mt-0.5 text-xs text-pm-coral-dark">
                    {accessUntilDate
                      ? `Cancellation scheduled. You can keep using ${PLANS[currentPlan].name} until ${accessUntilDate}.`
                      : 'Cancellation scheduled. You can keep using your current plan until the paid period ends.'}
                  </p>
                ) : renewalDate ? (
                  <p className="mt-0.5 text-xs text-pm-teal-mid">Renews {renewalDate}</p>
                ) : null}
                <p className="mt-1 text-xs text-pm-teal-hover">
                  Starter to Pro upgrades are charged immediately and unlock straight away.
                  Pro to Starter downgrades take effect from the next renewal date.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() =>
                    openBillingPortal({
                      flow: 'payment_method_update',
                      loadingState: 'portal-payment',
                    })
                  }
                  disabled={loading === 'portal-payment'}
                  className="rounded-lg border border-pm-teal-pale bg-white px-3 py-1.5 text-sm font-medium text-pm-teal-hover hover:bg-pm-teal-light disabled:opacity-50"
                >
                  {loading === 'portal-payment' ? 'Loading...' : 'Update payment method'}
                </button>
                <button
                  onClick={() => openBillingPortal({ loadingState: 'portal-invoices' })}
                  disabled={loading === 'portal-invoices'}
                  className="rounded-lg border border-pm-border bg-white px-3 py-1.5 text-sm font-medium text-pm-body hover:bg-pm-surface disabled:opacity-50"
                >
                  {loading === 'portal-invoices' ? 'Loading...' : 'Invoices & receipts'}
                </button>
                {cancelScheduled ? (
                  <button
                    onClick={resumeRenewal}
                    disabled={loading === 'portal-resume'}
                    className="rounded-lg bg-pm-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-pm-teal-hover disabled:opacity-50"
                  >
                    {loading === 'portal-resume' ? 'Loading...' : 'Resume renewal'}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openBillingPortal({
                        flow: 'subscription_cancel',
                        loadingState: 'portal-cancel',
                      })
                    }
                    disabled={loading === 'portal-cancel'}
                    className="rounded-lg border border-pm-coral bg-white px-3 py-1.5 text-sm font-medium text-pm-coral-dark hover:bg-pm-coral-light disabled:opacity-50"
                  >
                    {loading === 'portal-cancel' ? 'Loading...' : 'Cancel at renewal'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-pm-teal-pale/70 bg-white/70 px-3 py-2 text-xs text-pm-secondary">
              Update payment method opens the Stripe card screen. Invoices & receipts opens
              your Stripe billing portal home with billing history and downloadable invoices.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm text-pm-secondary">Billing:</span>
        <div className="flex rounded-lg border border-pm-border bg-pm-surface p-0.5">
          {(['monthly', 'annual'] as BillingInterval[]).map((selectedInterval) => (
            <button
              key={selectedInterval}
              onClick={() => setInterval(selectedInterval)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                interval === selectedInterval
                  ? 'bg-white text-pm-body shadow-sm'
                  : 'text-pm-secondary hover:text-pm-body'
              }`}
            >
              {selectedInterval === 'monthly' ? 'Monthly' : 'Annual'}
              {selectedInterval === 'annual' && (
                <span className="ml-1.5 rounded-full bg-pm-teal-light px-1.5 py-0.5 text-xs font-medium text-pm-teal-hover">
                  Save up to 15%
                </span>
              )}
            </button>
          ))}
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
                  ? 'border-pm-teal-mid ring-1 ring-pm-teal-mid'
                  : 'border-pm-border'
              } ${isCurrent ? 'bg-pm-teal-light/30' : 'bg-white'}`}
            >
              {planId === 'pro' && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pm-teal px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-pm-body">{plan.name}</h4>
                  {isCurrent && (
                    <span className="rounded-full bg-pm-teal-light px-2.5 py-0.5 text-xs font-medium text-pm-teal-hover">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-pm-secondary">{plan.description}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-pm-teal-mid">
                  {planId === 'starter' ? 'Solo painters' : 'Small crews up to 3'}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-pm-body">{formatPrice(price)}</span>
                  <span className="text-sm text-pm-secondary">
                    {interval === 'annual' ? '/yr' : '/mo'}
                  </span>
                </div>
                {interval === 'annual' && (
                  <p className="mt-1 text-xs font-medium text-pm-teal-mid">
                    Save{' '}
                    {formatPrice(
                      PLANS[planId].monthlyPrice * 12 - PLANS[planId].annualTotal
                    )}
                    /yr vs monthly
                  </p>
                )}
              </div>

              <ul className="mb-5 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex min-h-6 items-start gap-2 text-sm text-pm-secondary"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-pm-teal-mid"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="rounded-xl bg-pm-teal-light px-4 py-2.5 text-center text-sm font-medium text-pm-teal-hover">
                  Current plan
                </div>
              ) : hasSubscription && action ? (
                <button
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
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    planId === 'pro'
                      ? 'bg-pm-teal text-white hover:bg-pm-teal-hover'
                      : 'border border-pm-border bg-white text-pm-body hover:bg-pm-surface'
                  }`}
                >
                  {loading === action.loadingState ? 'Loading...' : action.label}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={loading === planId}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    planId === 'pro'
                      ? 'bg-pm-teal text-white hover:bg-pm-teal-hover'
                      : 'bg-pm-body text-white hover:bg-pm-teal'
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
                <p className="mt-2 text-center text-xs text-pm-secondary">{action.note}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-pm-secondary">
        Starter is built for sole traders. Pro adds AI assistance, deeper job costing,
        accounting sync, and stronger follow-up tools for small crews. Plan changes and
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
