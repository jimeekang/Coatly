import type { Metadata } from 'next';
import {
  approvePublicQuote,
  getPublicQuoteByToken,
  setPublicQuoteOptionalLineItemSelection,
} from '@/app/actions/quotes';
import {
  QUOTE_COATING_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_SURFACE_LABELS,
} from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';

export const metadata: Metadata = { title: 'Quote' };

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data, error } = await getPublicQuoteByToken(token);
  const quote = data?.quote ?? null;
  const business = data?.business ?? null;
  const canEditOptionalItems = quote?.status === 'sent';
  const canApproveQuote = quote?.status === 'sent';
  const includedLineItems = quote?.line_items.filter((item) => !item.is_optional) ?? [];
  const optionalLineItems = quote?.line_items.filter((item) => item.is_optional) ?? [];
  const optionalSelectedTotal = optionalLineItems
    .filter((item) => item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);
  const optionalAvailableTotal = optionalLineItems
    .filter((item) => !item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_45%),linear-gradient(180deg,#f8fffd_0%,#f5f7f6_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {error || !quote ? (
          <section className="rounded-3xl border border-pm-coral bg-white px-6 py-8 shadow-sm">
            <p className="text-sm font-medium text-pm-coral-dark">
              {error ?? 'Quote not found.'}
            </p>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[28px] border border-pm-border bg-white shadow-sm">
              <div className="bg-pm-teal px-6 py-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  {business?.name || 'Coatly Quote'}
                </p>
                <h1 className="mt-3 text-3xl font-bold">
                  {quote.title || 'Painting Quote'}
                </h1>
                <p className="mt-2 text-sm text-white/85">
                  {quote.quote_number} · {QUOTE_STATUS_LABELS[quote.status]}
                </p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3 text-sm text-pm-body">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                      Prepared For
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {quote.customer.company_name || quote.customer.name}
                    </p>
                    {quote.customer.address && (
                      <p className="mt-1 text-pm-secondary">{quote.customer.address}</p>
                    )}
                  </div>
                  {quote.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                        Notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-pm-secondary">{quote.notes}</p>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-pm-border bg-pm-surface p-4 text-sm text-pm-body">
                  <div className="flex items-center justify-between">
                    <span className="text-pm-secondary">Valid until</span>
                    <span className="font-medium">
                      {quote.valid_until ? formatDate(quote.valid_until) : 'Not specified'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-pm-secondary">Subtotal</span>
                    <span className="font-medium">{formatAUD(quote.subtotal_cents)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-pm-secondary">GST</span>
                    <span className="font-medium">{formatAUD(quote.gst_cents)}</span>
                  </div>
                  <div className="mt-4 border-t border-pm-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold">{formatAUD(quote.total_cents)}</span>
                    </div>
                    {quote.approved_at && (
                      <p className="mt-2 text-xs font-medium text-pm-teal">
                        Approved on {formatDate(quote.approved_at)} by{' '}
                        {quote.approved_by_name || 'customer'}.
                      </p>
                    )}
                    {optionalSelectedTotal > 0 && (
                      <p className="mt-2 text-xs text-pm-secondary">
                        Includes selected add-ons worth {formatAUD(optionalSelectedTotal)}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {(quote.rooms.length > 0 || quote.estimate_items.length > 0) && (
              <section className="rounded-[28px] border border-pm-border bg-white px-6 py-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-pm-body">Scope of work</h2>
                    <p className="mt-1 text-sm text-pm-secondary">
                      Review the included areas and pricing basis for this quote.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {quote.rooms.map((room) => (
                    <div key={room.id} className="rounded-2xl border border-pm-border bg-pm-surface p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-pm-body">{room.name}</p>
                          <p className="text-sm capitalize text-pm-secondary">{room.room_type}</p>
                        </div>
                        <p className="text-sm font-semibold text-pm-body">
                          {formatAUD(room.total_cents)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {room.surfaces.map((surface) => (
                          <div
                            key={surface.id}
                            className="rounded-xl border border-pm-border bg-white px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-pm-body">
                                  {QUOTE_SURFACE_LABELS[surface.surface_type]}
                                </p>
                                <p className="mt-1 text-xs text-pm-secondary">
                                  {QUOTE_COATING_LABELS[surface.coating_type]}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-pm-body">
                                {formatAUD(surface.total_cents)}
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pm-secondary">
                              <span>{surface.area_m2.toFixed(1)} m²</span>
                              <span>{formatAUD(surface.rate_per_m2_cents)}/m²</span>
                            </div>
                            {surface.notes && (
                              <p className="mt-2 text-sm text-pm-secondary">{surface.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {quote.estimate_items.length > 0 && (
                    <div className="grid gap-3">
                      {quote.estimate_items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-pm-border bg-pm-surface px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-pm-body">{item.label}</p>
                              <p className="mt-1 text-xs uppercase tracking-wide text-pm-secondary">
                                {item.category.replaceAll('_', ' ')}
                              </p>
                              <p className="mt-2 text-sm text-pm-secondary">
                                {item.quantity} {item.unit} at {formatAUD(item.unit_price_cents)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-pm-body">
                              {formatAUD(item.total_cents)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {(includedLineItems.length > 0 || optionalLineItems.length > 0) && (
              <section className="rounded-[28px] border border-pm-border bg-white px-6 py-6 shadow-sm">
                <h2 className="text-lg font-semibold text-pm-body">Materials and add-ons</h2>
                <p className="mt-1 text-sm text-pm-secondary">
                  Included items are already part of the total. Optional add-ons can be added
                  below while this quote is in sent status.
                </p>

                {includedLineItems.length > 0 && (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                      Included
                    </p>
                    {includedLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-pm-border bg-pm-surface px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-pm-body">{item.name}</p>
                            <p className="mt-1 text-sm text-pm-secondary">
                              {item.quantity} {item.unit} at {formatAUD(item.unit_price_cents)}
                            </p>
                            {item.notes && (
                              <p className="mt-2 text-sm text-pm-secondary">{item.notes}</p>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-pm-body">
                            {formatAUD(item.total_cents)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {optionalLineItems.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                          Optional add-ons
                        </p>
                        <p className="mt-1 text-sm text-pm-secondary">
                          {canEditOptionalItems
                            ? 'Select extras to update the total above.'
                            : 'Selections are locked because this quote is no longer in sent status.'}
                        </p>
                      </div>
                      <div className="text-sm text-pm-secondary">
                        <p>Selected: {formatAUD(optionalSelectedTotal)}</p>
                        {optionalAvailableTotal > 0 && (
                          <p>Available: {formatAUD(optionalAvailableTotal)}</p>
                        )}
                      </div>
                    </div>

                    {optionalLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-pm-border bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-pm-body">{item.name}</p>
                              <span
                                className={[
                                  'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                                  item.is_selected
                                    ? 'bg-pm-teal-pale/30 text-pm-teal'
                                    : 'bg-amber-100 text-amber-700',
                                ].join(' ')}
                              >
                                {item.is_selected ? 'Selected' : 'Optional'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-pm-secondary">
                              {item.quantity} {item.unit} at {formatAUD(item.unit_price_cents)}
                            </p>
                            {item.notes && (
                              <p className="mt-2 text-sm text-pm-secondary">{item.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <p className="text-sm font-semibold text-pm-body">
                              {formatAUD(item.total_cents)}
                            </p>
                            {canEditOptionalItems ? (
                              <form action={setPublicQuoteOptionalLineItemSelection}>
                                <input type="hidden" name="quoteToken" value={token} />
                                <input type="hidden" name="lineItemId" value={item.id} />
                                <input
                                  type="hidden"
                                  name="isSelected"
                                  value={item.is_selected ? 'false' : 'true'}
                                />
                                <button
                                  type="submit"
                                  className={[
                                    'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                                    item.is_selected
                                      ? 'border border-pm-border bg-white text-pm-body hover:bg-pm-surface'
                                      : 'bg-pm-teal text-white hover:bg-pm-teal-hover',
                                  ].join(' ')}
                                >
                                  {item.is_selected ? 'Remove' : 'Add to Quote'}
                                </button>
                              </form>
                            ) : (
                              <span className="rounded-xl border border-pm-border bg-pm-surface px-4 py-2 text-sm font-medium text-pm-secondary">
                                {item.is_selected ? 'Included in total' : 'Not selected'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-[28px] border border-pm-border bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-pm-body">Approval</h2>
              <p className="mt-1 text-sm text-pm-secondary">
                {canApproveQuote
                  ? 'Review the final total, enter your details, and approve the quote.'
                  : 'This quote has already been processed. Approval inputs are now locked.'}
              </p>

              {quote.approved_at ? (
                <div className="mt-5 rounded-2xl border border-pm-border bg-pm-surface px-4 py-4 text-sm text-pm-body">
                  <p className="font-semibold text-pm-body">Approved</p>
                  <p className="mt-2">Approved at: {formatDate(quote.approved_at)}</p>
                  {quote.approved_by_name && <p>Approved by: {quote.approved_by_name}</p>}
                  {quote.approved_by_email && <p>Email: {quote.approved_by_email}</p>}
                  {quote.approval_signature && (
                    <p>Signature: {quote.approval_signature}</p>
                  )}
                </div>
              ) : (
                <form action={approvePublicQuote} className="mt-5 grid gap-4">
                  <input type="hidden" name="quoteToken" value={token} />
                  <label className="grid gap-2 text-sm text-pm-body">
                    <span className="font-medium">Your name</span>
                    <input
                      name="approvedByName"
                      type="text"
                      required
                      disabled={!canApproveQuote}
                      className="min-h-12 rounded-2xl border border-pm-border bg-white px-4 py-3 outline-none transition-colors focus:border-pm-teal disabled:bg-pm-surface"
                      placeholder="Full name"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-pm-body">
                    <span className="font-medium">Your email</span>
                    <input
                      name="approvedByEmail"
                      type="email"
                      required
                      disabled={!canApproveQuote}
                      className="min-h-12 rounded-2xl border border-pm-border bg-white px-4 py-3 outline-none transition-colors focus:border-pm-teal disabled:bg-pm-surface"
                      placeholder="name@example.com"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-pm-body">
                    <span className="font-medium">Typed signature</span>
                    <input
                      name="approvalSignature"
                      type="text"
                      required
                      disabled={!canApproveQuote}
                      className="min-h-12 rounded-2xl border border-pm-border bg-white px-4 py-3 outline-none transition-colors focus:border-pm-teal disabled:bg-pm-surface"
                      placeholder="Type your full name as signature"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!canApproveQuote}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pm-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:cursor-not-allowed disabled:bg-pm-border"
                  >
                    Approve Quote
                  </button>
                </form>
              )}
            </section>

            <section className="rounded-[28px] border border-pm-border bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-pm-body">Business contact</h2>
              <div className="mt-4 grid gap-2 text-sm text-pm-secondary">
                <p className="font-medium text-pm-body">{business?.name || 'Painting contractor'}</p>
                {business?.email && <p>{business.email}</p>}
                {business?.phone && <p>{business.phone}</p>}
                {business?.abn && <p>ABN: {business.abn}</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
