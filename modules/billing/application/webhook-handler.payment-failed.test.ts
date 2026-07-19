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

vi.mock('@/modules/billing/infrastructure/stripe/client', () => ({
  getStripeClient: getStripeClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/modules/billing/application/subscription-sync', () => ({
  syncSubscription: syncSubscriptionMock,
}));

import { handleStripeWebhook } from '@/modules/billing/application/webhook-handler';

function createRequest(body = '{}') {
  return {
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('handleStripeWebhook invoice.payment_failed regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('marks the cached subscription past_due from the current nested Stripe invoice payload on duplicate delivery', async () => {
    const event = {
      id: 'evt_payment_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_123',
          parent: {
            type: 'subscription_details',
            subscription_details: {
              subscription: 'sub_123',
            },
          },
        },
      },
    };
    const neqMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockReturnValue({ neq: neqMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const adminClient = {
      from: vi.fn().mockReturnValue({ update: updateMock }),
    };
    const stripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    };

    headersMock.mockResolvedValue({
      get: vi.fn().mockReturnValue('sig_123'),
    });
    getStripeClientMock.mockReturnValue(stripe);
    createAdminClientMock.mockReturnValue(adminClient);

    const firstResponse = await handleStripeWebhook(createRequest() as never);
    const secondResponse = await handleStripeWebhook(createRequest() as never);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenNthCalledWith(1, { status: 'past_due' });
    expect(updateMock).toHaveBeenNthCalledWith(2, { status: 'past_due' });
    expect(eqMock).toHaveBeenNthCalledWith(1, 'stripe_subscription_id', 'sub_123');
    expect(eqMock).toHaveBeenNthCalledWith(2, 'stripe_subscription_id', 'sub_123');
    expect(neqMock).toHaveBeenNthCalledWith(1, 'status', 'cancelled');
    expect(neqMock).toHaveBeenNthCalledWith(2, 'status', 'cancelled');
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });
});
