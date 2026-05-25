import { describe, expect, it } from 'vitest';
import { canUserConnectGoogleCalendar } from '@/lib/google-calendar/oauth';
import type { UserIdentity } from '@supabase/supabase-js';

function identity(provider: string) {
  return { provider } as UserIdentity;
}

describe('canUserConnectGoogleCalendar', () => {
  it('allows users with Google in auth metadata providers', () => {
    expect(
      canUserConnectGoogleCalendar({
        app_metadata: { providers: ['email', 'google'] },
        identities: [],
      })
    ).toBe(true);
  });

  it('allows users with a Google identity', () => {
    expect(
      canUserConnectGoogleCalendar({
        app_metadata: { provider: 'email' },
        identities: [identity('google')],
      })
    ).toBe(true);
  });

  it('blocks email-only users', () => {
    expect(
      canUserConnectGoogleCalendar({
        app_metadata: { provider: 'email', providers: ['email'] },
        identities: [identity('email')],
      })
    ).toBe(false);
  });
});
