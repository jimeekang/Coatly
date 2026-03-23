import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminClientMock, getStripeClientMock } = vi.hoisted(() => {
  process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
  process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_annual';
  process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_monthly';
  process.env.STRIPE_PRICE_STARTER_ANNUAL = 'price_starter_annual';

  return {
    createAdminClientMock: vi.fn(),
    getStripeClientMock: vi.fn(),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: getStripeClientMock,
}));

import {
  hasScheduledCancellationAtPeriodEnd,
  syncSubscription,
  syncSubscriptionCacheForUser,
} from '@/lib/stripe/subscription-sync';

function buildStripeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  const periodStart = Math.floor(new Date('2025-11-15T12:00:00.000Z').getTime() / 1000);
  const periodEnd = Math.floor(new Date('2025-12-16T12:00:00.000Z').getTime() / 1000);

  return {
    id: 'sub_123',
    customer: 'cus_123',
    status: 'active',
    metadata: {
      user_id: 'user-1',
      plan_id: 'pro',
    },
    billing_cycle_anchor: periodStart,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    cancel_at: null,
    items: {
      data: [
        {
          id: 'si_123',
          quantity: 1,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          price: {
            id: 'price_pro_monthly',
          },
        },
      ],
    },
    ...overrides,
  };
}

function buildCachedSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cache-1',
    user_id: 'user-1',
    plan: 'pro',
    status: 'active',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    current_period_start: '2025-11-15T12:00:00.000Z',
    current_period_end: '2025-12-16T12:00:00.000Z',
    cancel_at_period_end: false,
    cancel_at: null,
    created_at: '2025-11-15T12:00:00.000Z',
    updated_at: '2025-11-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('subscription sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the expected subscription cache payload', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };

    await syncSubscription(buildStripeSubscription() as never, supabase as never);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        plan: 'pro',
        status: 'active',
        current_period_start: '2025-11-15T12:00:00.000Z',
        current_period_end: '2025-12-16T12:00:00.000Z',
        cancel_at_period_end: false,
        cancel_at: null,
      }),
      { onConflict: 'user_id' }
    );
  });

  it('marks a subscription as canceling when Stripe only sets cancel_at to the period end', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };
    const periodEnd = Math.floor(new Date('2025-12-16T12:00:00.000Z').getTime() / 1000);

    await syncSubscription(
      buildStripeSubscription({
        cancel_at_period_end: false,
        cancel_at: periodEnd,
      }) as never,
      supabase as never
    );

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_at_period_end: true,
        cancel_at: '2025-12-16T12:00:00.000Z',
      }),
      { onConflict: 'user_id' }
    );
    expect(
      hasScheduledCancellationAtPeriodEnd(
        buildStripeSubscription({
          cancel_at_period_end: false,
          cancel_at: periodEnd,
        }) as never,
        periodEnd
      )
    ).toBe(true);
  });

  it('throws when the subscription cache upsert fails', async () => {
    const supabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({
          error: { message: 'new row violates check constraint' },
        }),
      })),
    };

    await expect(
      syncSubscription(buildStripeSubscription() as never, supabase as never)
    ).rejects.toThrow('Failed to sync subscription cache');
  });

  it('reconciles the cached row with the live Stripe subscription', async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: buildCachedSubscription(),
        error: null,
      })
      .mockResolvedValueOnce({
        data: buildCachedSubscription({
          status: 'cancelled',
          current_period_start: null,
          current_period_end: null,
        }),
        error: null,
      });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
        upsert: upsertMock,
      })),
    });
    getStripeClientMock.mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(
          buildStripeSubscription({
            status: 'canceled',
            billing_cycle_anchor: null,
            current_period_start: null,
            current_period_end: null,
            items: {
              data: [
                {
                  id: 'si_123',
                  quantity: 1,
                  current_period_start: null,
                  current_period_end: null,
                  price: {
                    id: 'price_pro_monthly',
                  },
                },
              ],
            },
          })
        ),
      },
    });

    const refreshed = await syncSubscriptionCacheForUser('user-1');

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        current_period_start: null,
        current_period_end: null,
      }),
      { onConflict: 'user_id' }
    );
    expect(refreshed).toMatchObject({
      user_id: 'user-1',
      status: 'cancelled',
    });
  });
});
