import type { createServerClient } from '@/lib/supabase/server';

const MISSING_ONBOARDING_COLUMN = "onboarding_completed";

type ProfileRecord = {
  business_name: string | null;
  abn: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  onboarding_completed?: boolean | null;
};

function hasMissingOnboardingColumn(error: { message?: string } | null) {
  return error?.message?.includes(MISSING_ONBOARDING_COLUMN) ?? false;
}

export function inferOnboardingCompleted(profile: ProfileRecord | null | undefined) {
  if (!profile) return false;

  if (typeof profile.onboarding_completed === 'boolean') {
    return profile.onboarding_completed;
  }

  return Boolean(
    profile.business_name?.trim() &&
      profile.abn?.trim() &&
      profile.phone?.trim() &&
      profile.address_line1?.trim() &&
      profile.city?.trim() &&
      profile.state?.trim() &&
      profile.postcode?.trim()
  );
}

export async function getProfileWithOnboardingFallback(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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
    data: ProfileRecord | null;
    error: { message?: string } | null;
  };

  if (!hasMissingOnboardingColumn(initialResult.error)) {
    return initialResult;
  }

  return (await supabase
    .from('profiles')
    .select(fallbackSelect)
    .eq('user_id', userId)
    .single()) as {
    data: ProfileRecord | null;
    error: { message?: string } | null;
  };
}

export function isMissingOnboardingColumnError(error: { message?: string } | null) {
  return hasMissingOnboardingColumn(error);
}
