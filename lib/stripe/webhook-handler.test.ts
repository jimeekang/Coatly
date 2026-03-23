import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  headersMock,
  getStripeClientMock,
  createAdminClientMock,
  syncSubscriptionMock,
} = vi.hoisted(() => ({
  headersMock: vi.fn(),
  getStripeClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: getStripeClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/stripe/subscription-sync', () => ({
  syncSubscription: syncSubscriptionMock,
}));

import { handleStripeWebhook } from '@/lib/stripe/webhook-handler';

function createRequest(body = '{}') {
  return {
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('handleStripeWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 400 when the Stripe signature header is missing', async () => {
    headersMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const response = await handleStripeWebhook(createRequest() as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing stripe-signature header',
    });
  });

  it('stores the subscription after checkout.session.completed', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_123',
      metadata: {
        user_id: 'user-1',
        plan_id: 'pro',
      },
    };
    const subscription = {
      id: 'sub_123',
      metadata: {
        user_id: 'user-1',
        plan_id: 'pro',
      },
    };
    const stripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: { object: session },
        }),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(subscription),
        update: vi.fn(),
      },
    };

    headersMock.mockResolvedValue({
      get: vi.fn().mockReturnValue('sig_123'),
    });
    getStripeClientMock.mockReturnValue(stripe);
    createAdminClientMock.mockReturnValue({ from: vi.fn() });

    const response = await handleStripeWebhook(createRequest() as never);

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    expect(syncSubscriptionMock).toHaveBeenCalledWith(subscription, expect.any(Object));
  });

  it('processes customer.subscription.updated and deleted events', async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi
          .fn()
          .mockReturnValueOnce({
            type: 'customer.subscription.updated',
            data: { object: { id: 'sub_updated' } },
          })
          .mockReturnValueOnce({
            type: 'customer.subscription.deleted',
            data: { object: { id: 'sub_deleted' } },
          }),
      },
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
    };
    const adminClient = { from: vi.fn() };

    headersMock.mockResolvedValue({
      get: vi.fn().mockReturnValue('sig_123'),
    });
    getStripeClientMock.mockReturnValue(stripe);
    createAdminClientMock.mockReturnValue(adminClient);

    await handleStripeWebhook(createRequest() as never);
    await handleStripeWebhook(createRequest() as never);

    expect(syncSubscriptionMock).toHaveBeenNthCalledWith(
      1,
      { id: 'sub_updated' },
      adminClient
    );
    expect(syncSubscriptionMock).toHaveBeenNthCalledWith(
      2,
      { id: 'sub_deleted' },
      adminClient
    );
  });
});
