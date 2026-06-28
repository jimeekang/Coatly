import { describe, expect, it } from 'vitest';
import { getAppBaseUrl } from '@/lib/config/app-url';

describe('getAppBaseUrl', () => {
  it('uses an explicit app URL first', () => {
    expect(
      getAppBaseUrl({
        env: {
          NEXT_PUBLIC_APP_URL: 'https://coatly.vercel.app/',
          VERCEL_URL: 'preview-coatly.vercel.app',
        },
      })
    ).toBe('https://coatly.vercel.app');
  });

  it('uses VERCEL_URL when no explicit app URL is configured', () => {
    expect(
      getAppBaseUrl({
        env: {
          VERCEL_URL: 'preview-coatly.vercel.app',
        },
      })
    ).toBe('https://preview-coatly.vercel.app');
  });

  it('normalizes a VERCEL_URL that already includes a protocol', () => {
    expect(
      getAppBaseUrl({
        env: {
          VERCEL_URL: 'https://preview-coatly.vercel.app/',
        },
      })
    ).toBe('https://preview-coatly.vercel.app');
  });

  it('falls back to the provided URL', () => {
    expect(
      getAppBaseUrl({
        env: {},
        fallback: 'http://localhost:3000/',
      })
    ).toBe('http://localhost:3000');
  });
});
