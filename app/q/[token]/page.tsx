import type { Metadata } from 'next';
import {
  bookJobFromPublicQuote,
  getAvailableDatesForToken,
} from '@/modules/jobs/application/actions';
import { getPublicQuoteByToken } from '@/modules/quotes/application/actions';
import { PublicQuoteClient } from '@/modules/quotes/ui/public/PublicQuoteClient';

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
      <main className="min-h-screen bg-surface px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-error/30 bg-surface-container-lowest shadow-sm">
            <div className="border-b border-error/20 bg-error-container/40 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-error-container">
                Error
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-on-error-container">{error ?? 'Quote not found.'}</p>
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
    <main className="min-h-screen bg-surface">
      <PublicQuoteClient
        token={token}
        quote={data.quote}
        business={data.business}
        bookingAvailability={bookingAvailability}
        getAvailableDatesAction={getAvailableDatesForToken}
        bookJobFromPublicQuoteAction={bookJobFromPublicQuote}
      />
    </main>
  );
}
