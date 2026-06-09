import { cache } from 'react';
import { redirect } from 'next/navigation';
import {
  isMissingOnboardingColumnError,
  type OnboardingProfileRecord,
} from '@/modules/settings/domain/onboarding';
import {
  getMonthlyActiveQuoteUsageForUser,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { createServerClient } from '@/lib/supabase/server';

type AppSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

async function getProfileWithOnboardingFallback(
  supabase: AppSupabaseClient,
  userId: string,
  includeAddressFields = false
) {
  const fullSelect = includeAddressFields
    ? 'onboarding_completed, business_name, abn, phone, address_line1, city, state, postcode'
    : 'onboarding_completed, business_name, abn, phone, address_line1, city, state, postcode';

  const fallbackSelect = includeAddressFields
    ? 'business_name, abn, phone, address_line1, city, state, postcode'
    : 'business_name, abn, phone, address_line1, city, state, postcode';

  const initialResult = (await supabase
    .from('profiles')
    .select(fullSelect)
    .eq('user_id', userId)
    .single()) as {
    data: OnboardingProfileRecord | null;
    error: { message?: string } | null;
  };

  if (!isMissingOnboardingColumnError(initialResult.error)) {
    return initialResult;
  }

  return (await supabase
    .from('profiles')
    .select(fallbackSelect)
    .eq('user_id', userId)
    .single()) as {
    data: OnboardingProfileRecord | null;
    error: { message?: string } | null;
  };
}

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
