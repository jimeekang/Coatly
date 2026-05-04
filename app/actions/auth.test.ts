import { describe, expect, it } from 'vitest';
import { resolveAuthBaseUrl } from '@/lib/auth/base-url';

describe('resolveAuthBaseUrl', () => {
  it('uses the localhost request host instead of the production app URL', () => {
    const baseUrl = resolveAuthBaseUrl({
      envUrl: 'https://coatly.vercel.app',
      host: 'localhost:3000',
      forwardedProto: null,
    });

    expect(baseUrl).toBe('http://localhost:3000');
  });

  it('keeps localhost on http even when a forwarded protocol is present', () => {
    const baseUrl = resolveAuthBaseUrl({
      envUrl: 'https://coatly.vercel.app',
      host: '127.0.0.1:3000',
      forwardedProto: 'https',
    });

    expect(baseUrl).toBe('http://127.0.0.1:3000');
  });
});
