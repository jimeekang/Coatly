import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PriceRatesForm } from '@/components/rates/PriceRatesForm';
import { getBusinessRateSettings } from '@/lib/businesses';
import { DEFAULT_RATE_SETTINGS } from '@/lib/rate-settings';
import { createServerClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Price Rates' };

export default async function PriceRatesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: rateSettings } = await getBusinessRateSettings(supabase, user.id);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Price Rates"
        subtitle="Set the default rates used by new quotes and choose which detailed estimate options your quoting workflow offers."
        action={
          <div className="inline-flex shrink-0 items-baseline gap-1.5 self-start rounded-lg border border-outline-variant bg-surface-container px-3 py-2 sm:self-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Currency
            </span>
            <span className="text-sm font-bold text-on-surface">AUD</span>
          </div>
        }
      />
      <PriceRatesForm defaultRates={rateSettings ?? DEFAULT_RATE_SETTINGS} />
    </div>
  );
}
