import type { Metadata } from 'next';
import {
  bookJobFromPublicQuote,
  getAvailableDatesForToken,
} from '@/modules/jobs/application/actions';
import { getPublicQuoteByToken } from '@/modules/quotes/application/actions';
import { PublicQuoteClient } from '@/modules/quotes/ui/public/PublicQuoteClient';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

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
      <main className="bg-surface min-h-screen px-4 py-12">
        <div className="mx-auto max-w-lg">
          <ErrorAlert>{error ?? 'Quote not found.'}</ErrorAlert>
        </div>
      </main>
    );
  }

  const bookingAvailability = data.quote.approved_at
    ? await getAvailableDatesForToken(token)
    : null;

  return (
    <main className="bg-surface min-h-screen">
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
