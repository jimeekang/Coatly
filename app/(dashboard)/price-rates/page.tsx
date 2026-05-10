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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Business defaults
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
                Price Rates
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-on-surface-variant">
                Set the default rates used by new quotes and choose which detailed estimate options
                your quoting workflow offers.
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Currency
              </p>
              <p className="mt-0.5 text-base font-semibold text-on-surface">AUD</p>
            </div>
          </div>
        </div>
      </div>

      <PriceRatesForm defaultRates={rateSettings ?? DEFAULT_RATE_SETTINGS} />
    </div>
  );
}
