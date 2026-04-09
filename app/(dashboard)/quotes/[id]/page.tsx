import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getQuote,
  setQuoteOptionalLineItemSelection,
} from '@/app/actions/quotes';
import { createJobFromQuoteAndRedirect } from '@/app/actions/jobs';
import { APP_URL } from '@/config/constants';
import { QUOTE_COATING_LABELS, QUOTE_SURFACE_LABELS, QUOTE_STATUS_LABELS } from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';
import { ProfitabilityCard } from '@/components/quotes/ProfitabilityCard';
import { QuoteStatusCard } from '@/components/quotes/QuoteStatusCard';
import { DuplicateQuoteButton } from '@/components/quotes/DuplicateQuoteButton';
import { DeleteQuoteButton } from '@/components/quotes/DeleteQuoteButton';
import { getBusinessRateSettings } from '@/lib/businesses';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Quote Detail' };

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ jobError?: string; emailDemo?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: quote, error }, { data: rateSettings }] = await Promise.all([
    getQuote(id),
    user ? getBusinessRateSettings(supabase, user.id) : Promise.resolve({ data: null, error: null }),
  ]);
  const jobError =
    typeof resolvedSearchParams.jobError === 'string' ? resolvedSearchParams.jobError : null;
  const emailDemo = resolvedSearchParams.emailDemo === '1';

  // ── Internal cost breakdown (not shown in PDF) ──────────────────────────
  const hasManualRooms = (quote?.rooms?.length ?? 0) > 0;
  const labourBaseTotal = hasManualRooms
    ? (quote?.rooms ?? []).reduce(
        (sum, room) => sum + room.surfaces.reduce((s, surf) => s + surf.labour_cost_cents, 0),
        0
      )
    : null;
  const materialsBaseTotal = hasManualRooms
    ? (quote?.rooms ?? []).reduce(
        (sum, room) => sum + room.surfaces.reduce((s, surf) => s + surf.material_cost_cents, 0),
        0
      )
    : null;
  // Total pre-markup base: for manual rooms = sum of surfaces, for interior = reverse-calculate
  const baseSubtotalForMarkup = (() => {
    if (labourBaseTotal !== null && materialsBaseTotal !== null) {
      return labourBaseTotal + materialsBaseTotal;
    }
    if (!quote) return 0;
    const totalMarkupFraction = (quote.labour_margin_percent + quote.material_margin_percent) / 100;
    return totalMarkupFraction > 0
      ? Math.round(quote.subtotal_cents / (1 + totalMarkupFraction))
      : quote.subtotal_cents;
  })();
  const labourMarkupAmount = quote
    ? Math.round(baseSubtotalForMarkup * quote.labour_margin_percent / 100)
    : 0;
  const materialsMarkupAmount = quote
    ? Math.round(baseSubtotalForMarkup * quote.material_margin_percent / 100)
    : 0;
  const showBreakdown =
    quote && (quote.labour_margin_percent > 0 || quote.material_margin_percent > 0 || hasManualRooms);
  const includedLineItems = quote?.line_items.filter((item) => !item.is_optional) ?? [];
  const optionalLineItems = quote?.line_items.filter((item) => item.is_optional) ?? [];
  const optionalSelectedTotal = optionalLineItems
    .filter((item) => item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);
  const optionalAvailableTotal = optionalLineItems
    .filter((item) => !item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);
  const publicQuoteUrl = quote?.public_share_token
    ? `${APP_URL}/q/${quote.public_share_token}`
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/quotes"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
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
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-pm-body">
            {quote?.quote_number ?? 'Quote'}
          </h1>
          <p className="mt-0.5 text-sm text-pm-secondary">
            {quote ? QUOTE_STATUS_LABELS[quote.status] : 'Quote not found'}
          </p>
        </div>
        {quote && (
          <Link
            href={`/quotes/${id}/edit`}
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
        )}
      </div>

      {error || !quote ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error ?? 'Quote not found.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          {emailDemo && (
            <div className="rounded-lg border border-pm-teal-mid bg-pm-teal-pale/20 px-4 py-3">
              <p className="text-sm text-pm-teal">
                Demo only. This quote was marked as sent to {quote.customer.email ?? 'the customer'}.
                Resend delivery will be connected later.
              </p>
            </div>
          )}
          {jobError && (
            <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
              <p className="text-sm text-pm-coral-dark">{jobError}</p>
            </div>
          )}

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
              <QuoteStatusCard status={quote.status} validUntil={quote.valid_until} />
              <p>Quote number: {quote.quote_number}</p>
              <p>Valid until: {quote.valid_until ? formatDate(quote.valid_until) : '—'}</p>
              <p>Total: {formatAUD(quote.total_cents)}</p>
              <p className="text-xs text-pm-secondary">
                Last modified: {formatDate(quote.updated_at)}
              </p>
              {publicQuoteUrl && (
                <div className="rounded-xl border border-pm-border bg-pm-surface px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Client Link
                  </p>
                  <p className="mt-2 break-all text-sm text-pm-body">{publicQuoteUrl}</p>
                </div>
              )}
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

          {quote.approved_at && (
            <section className="rounded-xl border border-pm-border bg-white">
              <div className="rounded-t-xl bg-pm-surface px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Approval
                </h2>
              </div>
              <div className="grid gap-2 px-5 py-4 text-sm text-pm-body">
                <p>Approved at: {formatDate(quote.approved_at)}</p>
                {quote.approved_by_name && <p>Approved by: {quote.approved_by_name}</p>}
                {quote.approved_by_email && <p>Email: {quote.approved_by_email}</p>}
                {quote.approval_signature && <p>Signature: {quote.approval_signature}</p>}
              </div>
            </section>
          )}

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

          {(includedLineItems.length > 0 || optionalLineItems.length > 0) && (
            <section className="rounded-xl border border-pm-border bg-white">
              <div className="rounded-t-xl bg-pm-surface px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Materials &amp; Services
                </h2>
              </div>
              <div className="space-y-4 px-5 py-4">
                {includedLineItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-pm-secondary">
                      Included
                    </p>
                    {includedLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-pm-border bg-pm-surface px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-pm-body">{item.name}</p>
                            <p className="mt-1 text-xs text-pm-secondary">
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-pm-secondary">
                          Optional Items
                        </p>
                        <p className="mt-1 text-sm text-pm-secondary">
                          Toggle customer choices to update the saved quote total.
                        </p>
                      </div>
                      <div className="text-right text-xs text-pm-secondary">
                        <p>Selected: {formatAUD(optionalSelectedTotal)}</p>
                        {optionalAvailableTotal > 0 && (
                          <p>Available: {formatAUD(optionalAvailableTotal)}</p>
                        )}
                      </div>
                    </div>

                    {optionalLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-pm-border bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                            <p className="mt-1 text-xs text-pm-secondary">
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
                            <form action={setQuoteOptionalLineItemSelection}>
                              <input type="hidden" name="quoteId" value={quote.id} />
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
                                {item.is_selected ? 'Remove from Total' : 'Add to Total'}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

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

          {/* Internal Cost Breakdown — not shown on PDF */}
          <ProfitabilityCard
            quote={quote}
            targetDailyEarningsCents={rateSettings?.pricing?.target_daily_earnings_cents}
          />

          {showBreakdown && (
            <section className="rounded-xl border border-pm-border bg-white">
              <div className="flex items-center justify-between gap-2 rounded-t-xl bg-amber-50 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Cost Breakdown
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Internal
                </span>
              </div>
              <div className="space-y-3 px-5 py-4 text-sm">
                {/* Per-room subtotals with labour/materials split (manual rooms only) */}
                {hasManualRooms && quote.rooms.map((room) => {
                  const roomLabour = room.surfaces.reduce((s, surf) => s + surf.labour_cost_cents, 0);
                  const roomMaterials = room.surfaces.reduce((s, surf) => s + surf.material_cost_cents, 0);
                  return (
                    <div key={room.id} className="rounded-lg border border-pm-border bg-pm-surface px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-pm-body">{room.name}</span>
                        <span className="font-semibold text-pm-body">{formatAUD(room.total_cents)}</span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-pm-secondary">
                        <span>Labour: {formatAUD(roomLabour)}</span>
                        <span>Materials: {formatAUD(roomMaterials)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Aggregate markup breakdown */}
                {(quote.labour_margin_percent > 0 || quote.material_margin_percent > 0) && (
                  <div className="space-y-2 border-t border-pm-border pt-3">
                    {labourBaseTotal !== null && materialsBaseTotal !== null && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-pm-secondary">Labour (base)</span>
                          <span className="text-pm-body">{formatAUD(labourBaseTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-pm-secondary">Materials (base)</span>
                          <span className="text-pm-body">{formatAUD(materialsBaseTotal)}</span>
                        </div>
                      </>
                    )}
                    {quote.labour_margin_percent > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-pm-secondary">
                          Labour markup ({quote.labour_margin_percent}%)
                        </span>
                        <span className="text-pm-body">+{formatAUD(labourMarkupAmount)}</span>
                      </div>
                    )}
                    {quote.material_margin_percent > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-pm-secondary">
                          Materials markup ({quote.material_margin_percent}%)
                        </span>
                        <span className="text-pm-body">+{formatAUD(materialsMarkupAmount)}</span>
                      </div>
                    )}
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
                <span className="text-pm-secondary">Subtotal (ex GST)</span>
                <span className="font-medium text-pm-body">
                  {formatAUD(quote.subtotal_cents)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pm-secondary">GST (10%)</span>
                <span className="font-medium text-pm-body">{formatAUD(quote.gst_cents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-pm-border pt-3">
                <span className="font-semibold text-pm-body">Total (inc GST)</span>
                <span className="text-base font-semibold text-pm-body">
                  {formatAUD(quote.total_cents)}
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            {quote.status === 'approved' && (
              <Link
                href={`/invoices/new?quoteId=${quote.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
              >
                Create Invoice
              </Link>
            )}
            <form action={createJobFromQuoteAndRedirect}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pm-teal px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
              >
                Create Job
              </button>
            </form>
            <Link
              href={`/api/pdf/quote?id=${quote.id}`}
              target="_blank"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors active:bg-pm-surface"
            >
              Open PDF
            </Link>
            {publicQuoteUrl && (
              <Link
                href={publicQuoteUrl}
                target="_blank"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors active:bg-pm-surface"
              >
                Open Client Page
              </Link>
            )}
            <DuplicateQuoteButton quoteId={quote.id} />
            <DeleteQuoteButton quoteId={quote.id} quoteNumber={quote.quote_number} />
          </div>
        </div>
      )}
    </div>
  );
}
