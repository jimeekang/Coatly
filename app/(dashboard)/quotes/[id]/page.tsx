import Link from 'next/link';
import type { Metadata } from 'next';
import { getQuote } from '@/app/actions/quotes';
import { QUOTE_COATING_LABELS, QUOTE_SURFACE_LABELS, QUOTE_STATUS_LABELS } from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';

export const metadata: Metadata = { title: 'Quote Detail' };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: quote, error } = await getQuote(id);

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/quotes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
          aria-label="Back to quotes"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-pm-body">
            {quote?.quote_number ?? 'Quote'}
          </h1>
          <p className="mt-0.5 text-sm text-pm-secondary">
            {quote ? QUOTE_STATUS_LABELS[quote.status] : 'Quote not found'}
          </p>
        </div>
      </div>

      {error || !quote ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error ?? 'Quote not found.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          <section className="rounded-xl border border-pm-border bg-white">
            <div className="rounded-t-xl bg-pm-surface px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Quote Details
              </h2>
            </div>
            <div className="grid gap-4 px-5 py-4 text-sm text-pm-body">
              <p className="text-lg font-semibold text-pm-body">
                {quote.title || 'Untitled quote'}
              </p>
              <p>Status: {QUOTE_STATUS_LABELS[quote.status]}</p>
              <p>Valid until: {quote.valid_until ? formatDate(quote.valid_until) : '—'}</p>
              <p>Total: {formatAUD(quote.total_cents)}</p>
            </div>
          </section>

          <section className="rounded-xl border border-pm-border bg-white">
            <div className="rounded-t-xl bg-pm-surface px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Customer
              </h2>
            </div>
            <div className="grid gap-2 px-5 py-4 text-sm text-pm-body">
              <p className="font-medium text-pm-body">
                {quote.customer.company_name || quote.customer.name}
              </p>
              {quote.customer.email && <p>{quote.customer.email}</p>}
              {quote.customer.phone && <p>{quote.customer.phone}</p>}
              {quote.customer.address && <p>{quote.customer.address}</p>}
            </div>
          </section>

          <section className="rounded-xl border border-pm-border bg-white">
            <div className="rounded-t-xl bg-pm-surface px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Scope
              </h2>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {quote.rooms.map((room) => (
                <div key={room.id} className="rounded-xl border border-pm-border bg-pm-surface p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-pm-body">{room.name}</p>
                      <p className="text-sm capitalize text-pm-secondary">{room.room_type}</p>
                    </div>
                    <p className="text-sm font-medium text-pm-body">
                      {formatAUD(room.total_cents)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    {room.surfaces.map((surface) => (
                      <div
                        key={surface.id}
                        className="rounded-lg border border-pm-border bg-white px-3 py-3 text-sm text-pm-body"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-pm-body">
                              {QUOTE_SURFACE_LABELS[surface.surface_type]}
                            </p>
                            <p className="text-xs text-pm-secondary">
                              {QUOTE_COATING_LABELS[surface.coating_type]}
                            </p>
                          </div>
                          <p className="font-medium text-pm-body">
                            {formatAUD(surface.total_cents)}
                          </p>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-pm-secondary">
                          <p>Area: {surface.area_m2.toFixed(1)} m²</p>
                          <p>Rate: {formatAUD(surface.rate_per_m2_cents)}/m²</p>
                          {surface.notes && <p>{surface.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(quote.notes || quote.internal_notes) && (
            <section className="rounded-xl border border-pm-border bg-white">
              <div className="rounded-t-xl bg-pm-surface px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Notes
                </h2>
              </div>
              <div className="grid gap-3 px-5 py-4 text-sm text-pm-body">
                {quote.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-pm-secondary">
                      Client Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
                {quote.internal_notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-pm-secondary">
                      Internal Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{quote.internal_notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-pm-border bg-white">
            <div className="rounded-t-xl bg-pm-surface px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Totals
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-pm-secondary">Subtotal</span>
                <span className="font-medium text-pm-body">
                  {formatAUD(quote.subtotal_cents)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pm-secondary">GST</span>
                <span className="font-medium text-pm-body">{formatAUD(quote.gst_cents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-pm-border pt-3">
                <span className="font-semibold text-pm-body">Total</span>
                <span className="text-base font-semibold text-pm-body">
                  {formatAUD(quote.total_cents)}
                </span>
              </div>
            </div>
          </section>

          <Link
            href={`/api/pdf/quote?id=${quote.id}`}
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors active:bg-pm-surface"
          >
            Open PDF
          </Link>
        </div>
      )}
    </div>
  );
}
