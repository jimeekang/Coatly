import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/branding/BrandLogo';
import {
  inferOnboardingCompleted,
} from '@/modules/settings/domain/onboarding';
import OnboardingForm from '@/components/onboarding/OnboardingForm';
import { getOnboardingProfileForCurrentUser, requireCurrentUser } from '@/lib/supabase/request-context';

export const metadata = { title: 'Set up your business' };

export default async function OnboardingPage() {
  await requireCurrentUser();
  const { data: profile } = await getOnboardingProfileForCurrentUser(true);

  if (inferOnboardingCompleted(profile)) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-start justify-center bg-surface-container-low px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo width={188} height={42} priority />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Set up your business</h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            This info appears on your quotes and invoices.
          </p>
        </div>

        <OnboardingForm
          defaultValues={{
            businessName: profile?.business_name ?? '',
            abn: profile?.abn ?? '',
            phone: profile?.phone ?? '',
            addressLine1: profile?.address_line1 ?? '',
            city: profile?.city ?? '',
            state: profile?.state ?? '',
            postcode: profile?.postcode ?? '',
          }}
        />
      </div>
    </main>
  );
}
