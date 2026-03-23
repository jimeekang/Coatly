import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import {
  getProfileWithOnboardingFallback,
  inferOnboardingCompleted,
} from '@/lib/profile/onboarding';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import { getLiveSubscriptionSnapshotForUser } from '@/lib/subscription/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, subscription] = await Promise.all([
    getProfileWithOnboardingFallback(supabase, user.id),
    getLiveSubscriptionSnapshotForUser(user.id),
  ]);

  if (!inferOnboardingCompleted(profile)) redirect('/onboarding');
  if (!subscription.active) redirect('/subscribe');

  const businessName = profile?.business_name ?? user.email ?? 'My Business';

  return (
    <div className="flex min-h-screen bg-pm-surface">
      <DashboardSidebar businessName={businessName} subscription={subscription} />
      {/* pt-14 offsets fixed mobile top bar; pb-20 for bottom tab bar */}
      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0 overflow-x-hidden">
        <div className="p-4 md:p-6 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
