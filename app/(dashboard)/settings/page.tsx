import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BusinessProfileForm from '@/components/settings/BusinessProfileForm';
import GoogleCalendarCard from '@/components/settings/GoogleCalendarCard';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import {
  PageHeader,
  PrimaryActionLink,
} from '@/components/layout/PageHeader';
import { getGoogleCalendarIntegrationSummary } from '@/lib/google-calendar/service';
import { getBusinessProfile } from '@/lib/businesses';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const params = searchParams ? await searchParams : undefined;
  const { data: business, error } = await getBusinessProfile(
    supabase,
    user.id,
    user.email ?? null
  );
  const googleCalendar = await getGoogleCalendarIntegrationSummary(supabase, user.id);
  const calendarError = typeof params?.calendar_error === 'string' ? params.calendar_error : null;
  const calendarSuccess =
    params?.calendar_success === 'connected' ? 'Google Calendar connected.' : null;

  if (error || !business) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorAlert>{error ?? 'Business settings could not be loaded.'}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 sm:gap-10">
      <PageHeader
        title="Business Settings"
        subtitle="Manage the business details shown on your quotes and invoices."
      />

      <BusinessProfileForm defaultValues={business} />

      <hr className="border-outline-variant" />

      <GoogleCalendarCard
        integration={googleCalendar}
        errorMessage={calendarError}
        successMessage={calendarSuccess}
      />

      <hr className="border-outline-variant" />

      <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Price Rates</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Configure your default rates for surfaces, doors and windows — and control which options appear in the estimator.
            </p>
          </div>
          <PrimaryActionLink href="/price-rates">Manage rates</PrimaryActionLink>
        </div>
      </section>

      <hr className="border-outline-variant" />

      <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Billing & subscription</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Manage your plan, billing portal, payment method, and cancellation options.
            </p>
          </div>
          <PrimaryActionLink href="/settings/billing">Open billing</PrimaryActionLink>
        </div>
      </section>
    </div>
  );
}
