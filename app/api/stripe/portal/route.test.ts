import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getStripeClientMock,
  ensureManagedPortalConfigurationMock,
  getStripePriceIdMock,
  syncSubscriptionMock,
  syncSubscriptionCacheForUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getStripeClientMock: vi.fn(),
  ensureManagedPortalConfigurationMock: vi.fn(),
  getStripePriceIdMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
  syncSubscriptionCacheForUserMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: getStripeClientMock,
}));

vi.mock('@/lib/stripe/portal', () => ({
  ensureManagedPortalConfiguration: ensureManagedPortalConfigurationMock,
}));

vi.mock('@/lib/stripe/plans', () => ({
  getStripePriceId: getStripePriceIdMock,
}));

vi.mock('@/lib/stripe/subscription-sync', () => ({
  hasScheduledCancellationAtPeriodEnd: vi.fn(
    (subscription: { cancel_at_period_end?: boolean; cancel_at?: number | null }, periodEnd?: number | null) =>
      Boolean(subscription.cancel_at_period_end || (subscription.cancel_at && periodEnd && subscription.cancel_at === periodEnd))
  ),
  syncSubscription: syncSubscriptionMock,
  syncSubscriptionCacheForUser: syncSubscriptionCacheForUserMock,
}));

import { POST } from '@/app/api/stripe/portal/route';

function createRequest(body?: Record<string, unknown>, parseFails = false) {
  return {
    json: parseFails
      ? vi.fn().mockRejectedValue(new Error('No body'))
      : vi.fn().mockResolvedValue(body ?? {}),
  };
}

function createStripeMock() {
  return {
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.test/session' }),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    prices: {
      retrieve: vi.fn(),
    },
  };
}

describe('/api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    ensureManagedPortalConfigurationMock.mockResolvedValue('bpc_123');
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });
    syncSubscriptionCacheForUserMock.mockResolvedValue({
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
    });
  });

  it('opens the hosted billing portal home when no flow is provided', async () => {
    const stripe = createStripeMock();
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(createRequest(undefined, true) as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: 'https://billing.stripe.test/session',
    });
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_123',
      locale: 'en-AU',
      return_url: 'http://localhost:3000/settings',
    });
    expect(ensureManagedPortalConfigurationMock).not.toHaveBeenCalled();
  });

  it('creates a hosted cancel flow for subscription cancellation', async () => {
    const stripe = createStripeMock();
    stripe.subscriptions.retrieve.mockResolvedValue({
      cancel_at_period_end: false,
      cancel_at: null,
      current_period_end: 1765886400,
      items: {
        data: [
          {
            current_period_end: 1765886400,
          },
        ],
      },
    });
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(
      createRequest({ flow: 'subscription_cancel', returnPath: '/settings' }) as never
    );

    expect(response.status).toBe(200);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: {
          type: 'subscription_cancel',
          after_completion: {
            type: 'redirect',
            redirect: { return_url: 'http://localhost:3000/settings' },
          },
          subscription_cancel: { subscription: 'sub_123' },
        },
      })
    );
    expect(ensureManagedPortalConfigurationMock).not.toHaveBeenCalled();
  });

  it('returns a refreshable conflict when cancellation is already scheduled', async () => {
    const stripe = createStripeMock();
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      metadata: { user_id: 'user-1', plan_id: 'pro' },
      cancel_at_period_end: false,
      cancel_at: 1765886400,
      current_period_end: 1765886400,
      items: {
        data: [
          {
            id: 'si_123',
            quantity: 1,
            current_period_end: 1765886400,
            price: { id: 'price_pro_monthly' },
          },
        ],
      },
    });
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(
      createRequest({ flow: 'subscription_cancel', returnPath: '/settings' }) as never
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Cancellation is already scheduled for the end of the current billing period.',
      code: 'already_canceling',
      refresh: true,
    });
    expect(syncSubscriptionMock).toHaveBeenCalled();
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('creates a hosted upgrade flow for subscription changes', async () => {
    const stripe = createStripeMock();
    stripe.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [
          {
            id: 'si_123',
            quantity: 2,
            price: {
              id: 'price_starter_monthly',
              product: 'prod_shared',
              unit_amount: 3900,
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    });
    stripe.prices.retrieve.mockResolvedValue({
      id: 'price_pro_monthly',
      product: 'prod_shared',
      unit_amount: 5900,
      recurring: { interval: 'month' },
    });
    getStripePriceIdMock.mockReturnValue('price_pro_monthly');
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(
      createRequest({
        flow: 'subscription_update_confirm',
        planId: 'pro',
        interval: 'monthly',
        returnPath: '/settings',
      }) as never
    );

    expect(response.status).toBe(200);
    expect(ensureManagedPortalConfigurationMock).toHaveBeenCalledWith(stripe);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: 'bpc_123',
        flow_data: {
          type: 'subscription_update_confirm',
          after_completion: {
            type: 'redirect',
            redirect: { return_url: 'http://localhost:3000/settings' },
          },
          subscription_update_confirm: {
            subscription: 'sub_123',
            items: [
              {
                id: 'si_123',
                price: 'price_pro_monthly',
                quantity: 2,
              },
            ],
          },
        },
      })
    );
  });

  it('allows downgrades at renewal across Stripe products when the portal configuration supports it', async () => {
    const stripe = createStripeMock();
    stripe.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [
          {
            id: 'si_123',
            quantity: 1,
            price: {
              id: 'price_pro_monthly',
              product: 'prod_pro',
              unit_amount: 5900,
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    });
    stripe.prices.retrieve.mockResolvedValue({
      id: 'price_starter_monthly',
      product: 'prod_starter',
      unit_amount: 3900,
      recurring: { interval: 'month' },
    });
    getStripePriceIdMock.mockReturnValue('price_starter_monthly');
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(
      createRequest({
        flow: 'subscription_update_confirm',
        planId: 'starter',
        interval: 'monthly',
      }) as never
    );

    expect(response.status).toBe(200);
    expect(ensureManagedPortalConfigurationMock).toHaveBeenCalledWith(stripe);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: 'bpc_123',
        flow_data: {
          type: 'subscription_update_confirm',
          after_completion: {
            type: 'redirect',
            redirect: { return_url: 'http://localhost:3000/settings' },
          },
          subscription_update_confirm: {
            subscription: 'sub_123',
            items: [
              {
                id: 'si_123',
                price: 'price_starter_monthly',
                quantity: 1,
              },
            ],
          },
        },
      })
    );
  });

  it('rejects non-recurring target prices for subscription changes', async () => {
    const stripe = createStripeMock();
    stripe.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [
          {
            id: 'si_123',
            quantity: 1,
            price: {
              id: 'price_pro_monthly',
              product: 'prod_shared',
              unit_amount: 5900,
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    });
    stripe.prices.retrieve.mockResolvedValue({
      id: 'price_pro_annual',
      product: 'prod_shared',
      unit_amount: 68000,
      recurring: null,
    });
    getStripePriceIdMock.mockReturnValue('price_pro_annual');
    getStripeClientMock.mockReturnValue(stripe);

    const response = await POST(
      createRequest({
        flow: 'subscription_update_confirm',
        planId: 'pro',
        interval: 'annual',
      }) as never
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Target Stripe price must be recurring for subscription changes.',
    });
  });
});
