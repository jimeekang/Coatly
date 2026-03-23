import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import BusinessProfileForm from '@/components/settings/BusinessProfileForm';
import { getBusinessProfile } from '@/lib/businesses';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: business, error } = await getBusinessProfile(
    supabase,
    user.id,
    user.email ?? null
  );

  if (error || !business) {
    return (
      <div className="rounded-2xl border border-pm-coral bg-pm-coral-light px-5 py-4 text-sm text-pm-coral-dark">
        {error ?? 'Business settings could not be loaded.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-pm-body">Business Settings</h2>
        <p className="mt-1 text-sm text-pm-secondary">
          Manage the business details shown on your quotes and invoices.
        </p>
      </div>

      <BusinessProfileForm defaultValues={business} />

      <hr className="border-pm-border" />

      <section className="rounded-2xl border border-pm-border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-pm-body">Billing & subscription</h3>
            <p className="mt-1 text-sm text-pm-secondary">
              Manage your plan, billing portal, payment method, and cancellation options.
            </p>
          </div>

          <Link
            href="/settings/billing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pm-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
          >
            Open billing
          </Link>
        </div>
      </section>
    </div>
  );
}
