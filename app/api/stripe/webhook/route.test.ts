import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleStripeWebhookMock } = vi.hoisted(() => ({
  handleStripeWebhookMock: vi.fn(),
}));

vi.mock('@/lib/stripe/webhook-handler', () => ({
  handleStripeWebhook: handleStripeWebhookMock,
}));

import { POST } from '@/app/api/stripe/webhook/route';

describe('/api/stripe/webhook legacy route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleStripeWebhookMock.mockResolvedValue(new Response('ok', { status: 200 }));
  });

  it('handles POST requests directly with the Stripe webhook handler', async () => {
    const request = new Request('https://coatly.test/api/stripe/webhook', {
      method: 'POST',
    }) as never;
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(handleStripeWebhookMock).toHaveBeenCalledWith(request);
  });
});
