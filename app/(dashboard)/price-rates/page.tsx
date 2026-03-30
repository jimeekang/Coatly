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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-pm-body">Price Rates</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Set your default rates for surfaces, doors and windows. These pre-fill new quotes and
          control which options appear in the estimator.
        </p>
      </div>

      <PriceRatesForm defaultRates={rateSettings ?? DEFAULT_RATE_SETTINGS} />
    </div>
  );
}
