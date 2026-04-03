import { redirect } from 'next/navigation';
import { inferOnboardingCompleted } from '@/lib/profile/onboarding';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import {
  getOnboardingProfileForCurrentUser,
  getSubscriptionSnapshotForCurrentUser,
  requireCurrentUser,
} from '@/lib/supabase/request-context';

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

  return (
    <div className="flex min-h-screen bg-surface">
      <DashboardSidebar businessName={businessName} subscription={subscription} />
      {/* pt-14 offsets fixed mobile top bar; pb-20 for bottom tab bar */}
      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0 overflow-x-clip">
        <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
