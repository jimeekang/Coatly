import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getProfileWithOnboardingFallback } from '@/lib/profile/onboarding';
import {
  getMonthlyActiveQuoteUsageForUser,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { createServerClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const requireCurrentUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
});

export const getOnboardingProfileForCurrentUser = cache(
  async (includeAddressFields = false) => {
    const [supabase, user] = await Promise.all([
      createServerClient(),
      requireCurrentUser(),
    ]);

    return getProfileWithOnboardingFallback(supabase, user.id, includeAddressFields);
  }
);

export const getSubscriptionSnapshotForCurrentUser = cache(async () => {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  return getSubscriptionSnapshotForUser(supabase, user.id);
});

export const getMonthlyActiveQuoteUsageForCurrentUser = cache(async () => {
  const [supabase, user, snapshot] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  return getMonthlyActiveQuoteUsageForUser(supabase, user.id, snapshot);
});
