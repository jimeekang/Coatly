const MISSING_ONBOARDING_COLUMN = "onboarding_completed";

export type OnboardingProfileRecord = {
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

export function getOnboardingCompletedFromHeaders(headerStore: Headers) {
  const value = headerStore.get('x-coatly-onboarding-completed');

  if (value === 'true') return true;
  if (value === 'false') return false;

  return null;
}

export function getBusinessNameFromHeaders(headerStore: Headers) {
  const value = headerStore.get('x-coatly-business-name')?.trim();
  return value ? value : null;
}

export function inferOnboardingCompleted(profile: OnboardingProfileRecord | null | undefined) {
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

export function isMissingOnboardingColumnError(error: { message?: string } | null) {
  return hasMissingOnboardingColumn(error);
}
