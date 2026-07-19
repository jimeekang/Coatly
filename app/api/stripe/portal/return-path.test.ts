import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getStripeClientMock,
  syncSubscriptionCacheForUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getStripeClientMock: vi.fn(),
  syncSubscriptionCacheForUserMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/modules/billing/infrastructure/stripe/client', () => ({
  getStripeClient: getStripeClientMock,
}));

vi.mock('@/modules/billing/application/subscription-sync', () => ({
  syncSubscriptionCacheForUser: syncSubscriptionCacheForUserMock,
}));

import { POST } from '@/app/api/stripe/portal/route';

function createRequest(body: Record<string, unknown>) {
  return { json: vi.fn().mockResolvedValue(body) };
}

describe('/api/stripe/portal return path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
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
    getStripeClientMock.mockReturnValue({
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.test/session' }),
        },
      },
    });
  });

  it('returns to billing settings after the Stripe portal session', async () => {
    const response = await POST(
      createRequest({ returnPath: '/settings/billing' }) as never
    );

    expect(response.status).toBe(200);
    const stripe = getStripeClientMock.mock.results[0].value as {
      billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } };
    };
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: 'http://localhost:3000/settings/billing' })
    );
  });

  it('falls back to settings for an external return path', async () => {
    await POST(createRequest({ returnPath: 'https://evil.example' }) as never);

    const stripe = getStripeClientMock.mock.results[0].value as {
      billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } };
    };
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: 'http://localhost:3000/settings' })
    );
  });
});
