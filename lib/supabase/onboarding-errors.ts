const MISSING_ONBOARDING_COLUMN = 'onboarding_completed';

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

export function isMissingOnboardingColumnError(error: { message?: string } | null) {
  return error?.message?.includes(MISSING_ONBOARDING_COLUMN) ?? false;
}
