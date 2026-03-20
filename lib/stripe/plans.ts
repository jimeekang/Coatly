import { PLANS, type PlanId, type BillingInterval } from '@/config/plans';

/**
 * Maps plan + billing interval to Stripe Price IDs.
 * These are populated from environment variables after Stripe products are created.
 */
export const STRIPE_PRICE_IDS: Record<PlanId, Record<BillingInterval, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  },
};

export function getStripePriceId(planId: PlanId, interval: BillingInterval): string {
  return STRIPE_PRICE_IDS[planId][interval];
}

export { PLANS };
