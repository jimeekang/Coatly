export type PlanId = 'starter' | 'pro';
export type BillingInterval = 'monthly' | 'annual';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Price in AUD cents per month */
  monthlyPrice: number;
  /** Price in AUD cents per month when billed annually */
  annualPrice: number;
  maxUsers: number;
  maxActiveQuotesPerMonth: number | null; // null = unlimited
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for sole traders',
    monthlyPrice: 2900,  // A$29/mo
    annualPrice: 2400,   // A$24/mo billed annually
    maxUsers: 1,
    maxActiveQuotesPerMonth: 10,
    features: [
      'Painter Quote Calculator',
      'm² / Room based estimating',
      'GST Auto-calculation',
      'Professional Invoicing',
      'Customer CRM (Basic)',
      'Quote PDF Generation',
      'Up to 5 Quote Templates',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For small crews of up to 3',
    monthlyPrice: 4900,  // A$49/mo
    annualPrice: 3900,   // A$39/mo billed annually
    maxUsers: 3,
    maxActiveQuotesPerMonth: null,
    features: [
      'Everything in Starter',
      'Unlimited Quote Templates',
      'Xero / MYOB Sync',
      'Job Costing & Profit Tracking',
      'Photo Portfolio (Before/After)',
      'Email Follow-up Automation',
      'Basic Job Scheduling',
      'Priority Support',
    ],
  },
};
