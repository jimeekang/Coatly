import { redirect } from 'next/navigation';
import { inferOnboardingCompleted } from '@/modules/settings/domain/onboarding';
import { signOut } from '@/modules/auth/application/actions';
import { formatPlanName } from '@/modules/billing/application/access';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import {
  getOnboardingProfileForCurrentUser,
  requireCurrentUser,
} from '@/lib/supabase/request-context';
import { getSubscriptionSnapshotForCurrentUser } from '@/modules/billing/application/request-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profileResult, subscription] = await Promise.all([
    requireCurrentUser(),
    getOnboardingProfileForCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  const profile = profileResult.data;
  const onboardingCompleted = inferOnboardingCompleted(profile);

  if (onboardingCompleted === false) redirect('/onboarding');
  if (!subscription.active) redirect('/subscribe');

  const businessName = profile?.business_name?.trim() || user.email || 'My Business';
  const planLabel = formatPlanName(subscription.plan);
  const isPro = subscription.plan === 'pro';

  return (
    <div className="flex min-h-screen bg-surface">
      <DashboardSidebar
        businessName={businessName}
        planLabel={planLabel}
        isPro={isPro}
        signOut={signOut}
      />
      {/* Mobile offsets match the fixed top bar and bottom tab bar, including device safe areas. */}
      <main className="min-w-0 flex-1 overflow-x-clip pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
        <div className="mx-auto w-full max-w-7xl min-w-0 p-3 sm:p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
