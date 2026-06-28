import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkPublicQuoteRateLimit } from '@/lib/security/public-rate-limit';

describe('checkPublicQuoteRateLimit', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co/');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('checks a hashed client IP against the durable Supabase rate limit RPC', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            { allowed: true, retry_after_seconds: 0, hit_count: 1 },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkPublicQuoteRateLimit(
      new NextRequest('https://coatly.app/q/public-token', {
        headers: {
          'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        },
      })
    );

    expect(result).toEqual({ allowed: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/check_public_route_rate_limit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'service-secret',
          Authorization: 'Bearer service-secret',
          'Content-Type': 'application/json',
        }),
      })
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      p_route_key: 'public_quote',
      p_limit: 60,
      p_window_seconds: 60,
    });
    expect(body.p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.p_ip_hash).not.toContain('203.0.113.10');
  });

  it('returns the RPC retry window when the request is over limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify([
              { allowed: false, retry_after_seconds: 42, hit_count: 61 },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        )
    );

    const result = await checkPublicQuoteRateLimit(
      new NextRequest('https://coatly.app/q/public-token', {
        headers: { 'x-real-ip': '203.0.113.11' },
      })
    );

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });

  it('fails closed in production when the durable limiter cannot be reached', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down'))
    );

    const result = await checkPublicQuoteRateLimit(
      new NextRequest('https://coatly.app/q/public-token')
    );

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });
});
