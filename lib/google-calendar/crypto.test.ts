import { describe, expect, it, vi } from 'vitest';
import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
} from '@/lib/google-calendar/crypto';

describe('google calendar crypto', () => {
  it('round-trips refresh tokens safely', () => {
    process.env.GOOGLE_CALENDAR_TOKEN_SECRET = 'test-secret-for-google-calendar';

    const encrypted = encryptGoogleRefreshToken('refresh-token-123');

    expect(encrypted).not.toContain('refresh-token-123');
    expect(decryptGoogleRefreshToken(encrypted)).toBe('refresh-token-123');
  });

  it('throws when payload format is invalid', () => {
    process.env.GOOGLE_CALENDAR_TOKEN_SECRET = 'test-secret-for-google-calendar';

    expect(() => decryptGoogleRefreshToken('not-a-valid-token')).toThrow(
      'Stored Google Calendar token could not be decrypted.'
    );
  });

  it('requires an encryption secret', () => {
    const originalSecret = process.env.GOOGLE_CALENDAR_TOKEN_SECRET;
    delete process.env.GOOGLE_CALENDAR_TOKEN_SECRET;

    expect(() => encryptGoogleRefreshToken('refresh-token-123')).toThrow(
      'Missing GOOGLE_CALENDAR_TOKEN_SECRET'
    );

    process.env.GOOGLE_CALENDAR_TOKEN_SECRET = originalSecret;
    vi.restoreAllMocks();
  });
});
