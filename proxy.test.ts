import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkPublicQuoteRateLimitMock, updateSessionMock } = vi.hoisted(() => ({
  checkPublicQuoteRateLimitMock: vi.fn(),
  updateSessionMock: vi.fn(),
}));

vi.mock('@/lib/security/public-rate-limit', () => ({
  checkPublicQuoteRateLimit: checkPublicQuoteRateLimitMock,
}));

vi.mock('@/lib/supabase/session', () => ({
  updateSession: updateSessionMock,
}));

import { proxy } from '@/proxy';

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSessionMock.mockResolvedValue(NextResponse.next());
    checkPublicQuoteRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it('returns 429 before session handling when the public quote route is over limit', async () => {
    checkPublicQuoteRateLimitMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 37,
    });

    const response = await proxy(
      new NextRequest('https://coatly.app/q/public-token')
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('37');
    expect(await response.text()).toBe('Too Many Requests');
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it('continues through normal session handling when public quote access is allowed', async () => {
    const request = new NextRequest('https://coatly.app/q/public-token');

    await proxy(request);

    expect(checkPublicQuoteRateLimitMock).toHaveBeenCalledWith(request);
    expect(updateSessionMock).toHaveBeenCalledWith(request);
  });
});
