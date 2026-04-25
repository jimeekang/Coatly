import type { Metadata } from 'next';
import { getAvailableDatesForToken } from '@/app/actions/jobs';
import { getPublicQuoteByToken } from '@/app/actions/quotes';
import { PublicQuoteClient } from '@/components/quotes/public/PublicQuoteClient';

export const metadata: Metadata = { title: 'Quote' };

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data, error } = await getPublicQuoteByToken(token);

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#fcf9f4] px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-pm-coral/30 bg-white shadow-sm">
            <div className="border-b border-pm-coral/20 bg-pm-coral-light/40 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-pm-coral-dark">
                Error
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-pm-coral-dark">{error ?? 'Quote not found.'}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const bookingAvailability = data.quote.approved_at
    ? await getAvailableDatesForToken(token)
    : null;

  return (
    <main className="min-h-screen bg-[#f6f3ee]">
      <PublicQuoteClient
        token={token}
        quote={data.quote}
        business={data.business}
        bookingAvailability={bookingAvailability}
      />
    </main>
  );
}
