import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PriceRatesForm } from '@/components/rates/PriceRatesForm';
import { getBusinessRateSettings } from '@/lib/businesses';
import { DEFAULT_RATE_SETTINGS } from '@/lib/rate-settings';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Price Rates' };

export default async function PriceRatesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: rateSettings } = await getBusinessRateSettings(supabase, user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-pm-border bg-white shadow-sm">
        <div className="border-b border-pm-border bg-pm-surface/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-pm-teal">
            Business defaults
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-pm-body sm:text-[28px]">Price Rates</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-pm-secondary">
                Set the default rates used by new quotes and choose which detailed estimate options
                your quoting workflow offers.
              </p>
            </div>
            <div className="rounded-xl border border-pm-teal-light bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Currency
              </p>
              <p className="mt-0.5 text-base font-semibold text-pm-body">AUD</p>
            </div>
          </div>
        </div>
      </div>

      <PriceRatesForm defaultRates={rateSettings ?? DEFAULT_RATE_SETTINGS} />
    </div>
  );
}
