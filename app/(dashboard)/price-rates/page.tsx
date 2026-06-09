import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PriceRatesForm } from '@/modules/price-rates/ui/PriceRatesForm';
import { getBusinessRateSettings } from '@/modules/settings/infrastructure/businesses';
import { DEFAULT_RATE_SETTINGS } from '@/modules/price-rates/domain/rate-settings';
import { getMaterialItems } from '@/modules/materials/application/actions';
import { createServerClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Price Rates' };

export default async function PriceRatesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: rateSettings },
    { data: manualItems, error: manualItemsError },
  ] = await Promise.all([
    getBusinessRateSettings(supabase, user.id),
    getMaterialItems(),
  ]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Price Rates"
        subtitle="Set the default rates used by new quotes and choose which detailed estimate options your quoting workflow offers."
        action={
          <div className="border-outline-variant bg-surface-container inline-flex shrink-0 items-baseline gap-1.5 self-start rounded-lg border px-3 py-2 sm:self-center">
            <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Currency
            </span>
            <span className="text-on-surface text-sm font-bold">AUD</span>
          </div>
        }
      />
      <PriceRatesForm
        defaultRates={rateSettings ?? DEFAULT_RATE_SETTINGS}
        manualItems={manualItems}
        manualItemsError={manualItemsError}
      />
    </div>
  );
}
