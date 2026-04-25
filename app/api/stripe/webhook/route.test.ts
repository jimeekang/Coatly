import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/stripe/webhook/route';

describe('/api/stripe/webhook legacy route', () => {
  it('redirects POST requests to the canonical Stripe webhook endpoint', async () => {
    const response = await POST(
      new Request('https://coatly.test/api/stripe/webhook', { method: 'POST' }) as never,
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://coatly.test/api/webhooks/stripe');
  });
});
