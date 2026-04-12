export type PlanId = 'starter' | 'pro';
export type BillingInterval = 'monthly' | 'annual';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Price in AUD cents per month */
  monthlyPrice: number;
  /** Total price in AUD cents charged once per year */
  annualTotal: number;
  maxUsers: number;
  maxActiveQuotesPerMonth: number | null;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for sole traders',
    monthlyPrice: 3900,
    annualTotal: 45000,
    maxUsers: 1,
    maxActiveQuotesPerMonth: 10,
    features: [
      'Painter Quote Calculator',
      'm2 / Room based estimating',
      'GST Auto-calculation',
      'Professional Invoicing',
      'Customer CRM (Basic)',
      'Quote PDF Generation',
      'Up to 5 Quote Templates',
      'Basic Job Scheduling',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing painting businesses',
    monthlyPrice: 5900,
    annualTotal: 68000,
    maxUsers: 1,
    maxActiveQuotesPerMonth: null,
    features: [
      'Everything in Starter',
      'Unlimited Quotes',
      'Unlimited Quote Templates',
      'AI Quote Drafting',
      'AI Workspace Assistant',
      'Priority Support',
    ],
  },
};
