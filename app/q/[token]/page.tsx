import type { Metadata } from 'next';
import Link from 'next/link';
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
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            This link may have expired or been copied incorrectly. Ask the painting business
            that sent the quote to resend a fresh link.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Return to Coatly
          </Link>
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
