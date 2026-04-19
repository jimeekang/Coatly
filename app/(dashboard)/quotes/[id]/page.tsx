import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getQuote,
  setQuoteOptionalLineItemSelection,
} from '@/app/actions/quotes';
import { getLinkedInvoicesForQuote } from '@/app/actions/invoices';
import { APP_URL } from '@/config/constants';
import { QUOTE_COATING_LABELS, QUOTE_SURFACE_LABELS, QUOTE_STATUS_LABELS } from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';
import { ProfitabilityCard } from '@/components/quotes/ProfitabilityCard';
import { QuoteActions } from '@/components/quotes/QuoteActions';
import { getBusinessRateSettings } from '@/lib/businesses';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Quote Detail' };

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-surface-container-highest text-on-surface-variant',
  sent:     'bg-primary/10 text-primary',
  approved: 'bg-success-container text-success',
  rejected: 'bg-error-container text-error',
  expired:  'bg-surface-container-highest text-on-surface-variant',
};

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ jobError?: string; emailDemo?: string; editLocked?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: quote, error }, { data: rateSettings }] = await Promise.all([
    getQuote(id),
    user ? getBusinessRateSettings(supabase, user.id) : Promise.resolve({ data: null, error: null }),
  ]);
  const linkedInvoiceResult = await getLinkedInvoicesForQuote(id);
  const linkedInvoices = linkedInvoiceResult.data?.invoices ?? [];
  const linkedInvoiceSummary = linkedInvoiceResult.data?.summary ?? null;
  const jobError =
    typeof resolvedSearchParams.jobError === 'string' ? resolvedSearchParams.jobError : null;
  const emailDemo = resolvedSearchParams.emailDemo === '1';
  const editLocked = resolvedSearchParams.editLocked === '1';

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
  const remainingLinkedInvoiceTotal =
    quote && linkedInvoiceSummary
      ? Math.max(quote.total_cents - linkedInvoiceSummary.billed_total_cents, 0)
      : 0;

  // Flatten all scope rows: rooms→surfaces + included line items
  const scopeRows = quote
    ? [
        ...quote.rooms.flatMap((room) =>
          room.surfaces.map((surface) => ({
            key: surface.id,
            name: `${room.name} — ${QUOTE_SURFACE_LABELS[surface.surface_type]}`,
            sub: QUOTE_COATING_LABELS[surface.coating_type],
            notes: surface.notes ?? null,
            qtyLabel: `${surface.area_m2.toFixed(1)} m²`,
            rateLabel: `${formatAUD(surface.rate_per_m2_cents)}/m²`,
            amount: surface.total_cents,
          }))
        ),
        ...includedLineItems.map((item) => ({
          key: item.id,
          name: item.name,
          sub: item.notes ?? null,
          notes: null as string | null,
          qtyLabel: `${item.quantity} ${item.unit}`,
          rateLabel: formatAUD(item.unit_price_cents),
          amount: item.total_cents,
        })),
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Back nav */}
      <div className="mb-4">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All quotes
        </Link>
      </div>

      {error || !quote ? (
        <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{error ?? 'Quote not found.'}</p>
        </div>
      ) : (
        <>
          {/* Banners */}
          {emailDemo && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/8 px-4 py-3">
              <p className="text-sm text-primary">
                Demo only. This quote was marked as sent to {quote.customer.email ?? 'the customer'}.
              </p>
            </div>
          )}
          {jobError && (
            <div className="mb-4 rounded-lg border border-error/20 bg-error-container px-4 py-3">
              <p className="text-sm text-on-error-container">{jobError}</p>
            </div>
          )}
          {(editLocked || quote.has_linked_invoices) && (
            <div className="mb-4 rounded-lg border border-warning/20 bg-warning-container px-4 py-3">
              <p className="text-sm text-on-warning-container">
                This quote is locked because at least one linked invoice already exists.
              </p>
            </div>
          )}

          {/* ── detail-head ── */}
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline font-mono mb-1">
                {quote.quote_number}
              </p>
              <h1 className="text-[26px] font-extrabold tracking-tight text-on-surface leading-tight mt-1">
                {quote.customer.company_name || quote.customer.name}
              </h1>
              {quote.title && (
                <p className="text-sm text-on-surface-variant mt-1">{quote.title}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded text-[10.5px] font-bold uppercase tracking-[0.14em] ${STATUS_BADGE[quote.status] ?? 'bg-surface-container-highest text-on-surface-variant'}`}
              >
                {QUOTE_STATUS_LABELS[quote.status]}
              </span>
              {!quote.has_linked_invoices && (
                <Link
                  href={`/quotes/${id}/edit`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* ── detail-grid: main card + sidebar ── */}
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">

            {/* ── Main card: Line items + Totals ── */}
            <div className="self-start bg-white border border-outline-variant rounded-3xl shadow-sm">
              <div className="p-4">
                <p className="text-[13px] font-bold text-on-surface mb-3 tracking-[-0.005em]">
                  Line items
                </p>

                {/* Table header — md+ only */}
                {scopeRows.length > 0 && (
                  <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px] gap-3 pb-2 border-b border-outline-variant text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline">
                    <div>Item</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Rate</div>
                    <div className="text-right">Amount</div>
                  </div>
                )}

                {/* Scope rows (rooms + line items flattened) */}
                {scopeRows.length === 0 ? (
                  <p className="text-sm text-on-surface-variant py-4 text-center">No line items added yet.</p>
                ) : (
                  scopeRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_90px_90px_90px] gap-x-3 py-3 border-t border-outline-variant text-sm first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface">{row.name}</p>
                        {row.sub && (
                          <p className="text-xs text-outline mt-0.5">{row.sub}</p>
                        )}
                        {row.notes && (
                          <p className="text-xs text-on-surface-variant mt-0.5 italic">{row.notes}</p>
                        )}
                        {/* Mobile: qty · rate inline */}
                        <p className="text-xs text-outline mt-1 md:hidden">
                          {row.qtyLabel} · {row.rateLabel}
                        </p>
                      </div>
                      <div className="hidden md:block text-right tabular-nums text-on-surface-variant self-center">
                        {row.qtyLabel}
                      </div>
                      <div className="hidden md:block text-right tabular-nums text-on-surface-variant self-center">
                        {row.rateLabel}
                      </div>
                      <div className="text-right tabular-nums font-bold text-on-surface self-center">
                        {formatAUD(row.amount)}
                      </div>
                    </div>
                  ))
                )}

                {/* Optional items */}
                {optionalLineItems.length > 0 && (
                  <div className="mt-5 pt-5 border-t-2 border-dashed border-outline-variant space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline">
                          Optional Items
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Toggle customer choices to update the quote total.
                        </p>
                      </div>
                      <div className="text-right text-xs text-on-surface-variant shrink-0">
                        {optionalSelectedTotal > 0 && (
                          <p>Selected: {formatAUD(optionalSelectedTotal)}</p>
                        )}
                        {optionalAvailableTotal > 0 && (
                          <p>Available: {formatAUD(optionalAvailableTotal)}</p>
                        )}
                      </div>
                    </div>
                    {optionalLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-on-surface text-sm">{item.name}</p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  item.is_selected
                                    ? 'bg-success-container text-success'
                                    : 'bg-warning-container text-warning'
                                }`}
                              >
                                {item.is_selected ? 'Selected' : 'Optional'}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1">
                              {item.quantity} {item.unit} at {formatAUD(item.unit_price_cents)}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-on-surface-variant mt-1">{item.notes}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <p className="text-sm font-bold text-on-surface tabular-nums">
                              {formatAUD(item.total_cents)}
                            </p>
                            {quote.has_linked_invoices ? (
                              <p className="text-xs text-on-surface-variant">Locked</p>
                            ) : (
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
                                  className={`inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                    item.is_selected
                                      ? 'border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low'
                                      : 'bg-primary text-on-primary hover:opacity-90'
                                  }`}
                                >
                                  {item.is_selected ? 'Remove' : 'Add to Total'}
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="mt-5 pt-4 border-t-2 border-outline-variant space-y-2">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal (ex GST)</span>
                    <span className="tabular-nums font-medium text-on-surface">
                      {formatAUD(quote.subtotal_cents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>GST (10%)</span>
                    <span className="tabular-nums font-medium text-on-surface">
                      {formatAUD(quote.gst_cents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                    <span className="text-base font-extrabold text-on-surface">Total (inc GST)</span>
                    <div>
                      <span className="text-[18px] font-extrabold tracking-tight text-on-surface tabular-nums">
                        {formatAUD(quote.total_cents)}
                      </span>
                      <span className="ml-1 text-[10px] font-bold text-outline">AUD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar: meta-boxes ── */}
            <div className="flex flex-col gap-4">

              {/* Customer meta-box */}
              <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                  Customer
                </p>
                <p className="text-sm font-semibold text-on-surface">
                  {quote.customer.company_name || quote.customer.name}
                </p>
                {quote.customer.company_name && (
                  <p className="text-xs text-on-surface-variant mt-0.5">{quote.customer.name}</p>
                )}
                {quote.customer.email && (
                  <p className="text-xs text-on-surface-variant mt-1">{quote.customer.email}</p>
                )}
                {quote.customer.phone && (
                  <p className="text-xs text-on-surface-variant mt-0.5">{quote.customer.phone}</p>
                )}
                {quote.customer.address && (
                  <p className="text-xs text-on-surface-variant mt-1">{quote.customer.address}</p>
                )}
              </div>

              {/* Dates meta-box */}
              <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                  Dates
                </p>
                <p className="text-sm font-semibold text-on-surface">
                  Created {formatDate(quote.created_at)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Valid until {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Modified {formatDate(quote.updated_at)}
                </p>
              </div>

              {/* Client Link meta-box */}
              {publicQuoteUrl && (
                <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                    Client Link
                  </p>
                  <p className="text-xs text-on-surface break-all">{publicQuoteUrl}</p>
                </div>
              )}

              {/* Profitability + Cost Breakdown — grouped together */}
              <div className="flex flex-col gap-4">
              <ProfitabilityCard
                quote={quote}
                targetDailyEarningsCents={rateSettings?.pricing?.target_daily_earnings_cents}
              />

              {/* Cost Breakdown (internal) — directly below Profitability */}
              {showBreakdown && (
                <div className="rounded-3xl border border-warning/20 bg-warning-container overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-warning/20">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-warning">
                      Cost Breakdown
                    </p>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-warning">
                      Internal
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-xs">
                    {hasManualRooms &&
                      quote.rooms.map((room) => {
                        const roomLabour = room.surfaces.reduce((s, surf) => s + surf.labour_cost_cents, 0);
                        const roomMaterials = room.surfaces.reduce((s, surf) => s + surf.material_cost_cents, 0);
                        return (
                          <div key={room.id} className="rounded-lg border border-warning/20 bg-white/60 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-on-surface">{room.name}</span>
                              <span className="font-bold text-on-surface tabular-nums">{formatAUD(room.total_cents)}</span>
                            </div>
                            <div className="mt-1 flex gap-3 text-on-surface-variant">
                              <span>Labour: {formatAUD(roomLabour)}</span>
                              <span>Materials: {formatAUD(roomMaterials)}</span>
                            </div>
                          </div>
                        );
                      })}
                    {(quote.labour_margin_percent > 0 || quote.material_margin_percent > 0) && (
                      <div className="space-y-1.5 pt-2 border-t border-warning/20">
                        {labourBaseTotal !== null && materialsBaseTotal !== null && (
                          <>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Labour (base)</span>
                              <span className="tabular-nums text-on-surface">{formatAUD(labourBaseTotal)}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Materials (base)</span>
                              <span className="tabular-nums text-on-surface">{formatAUD(materialsBaseTotal)}</span>
                            </div>
                          </>
                        )}
                        {quote.labour_margin_percent > 0 && (
                          <div className="flex justify-between text-on-surface-variant">
                            <span>Labour markup ({quote.labour_margin_percent}%)</span>
                            <span className="tabular-nums text-on-surface">+{formatAUD(labourMarkupAmount)}</span>
                          </div>
                        )}
                        {quote.material_margin_percent > 0 && (
                          <div className="flex justify-between text-on-surface-variant">
                            <span>Materials markup ({quote.material_margin_percent}%)</span>
                            <span className="tabular-nums text-on-surface">+{formatAUD(materialsMarkupAmount)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Approval */}
              {quote.approved_at && (
                <div className="p-4 rounded-3xl border border-success/20 bg-success-container shadow-sm">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-success mb-1.5">
                    Approved
                  </p>
                  <p className="text-sm font-semibold text-on-surface">
                    {formatDate(quote.approved_at)}
                  </p>
                  {quote.approved_by_name && (
                    <p className="text-xs text-on-surface-variant mt-0.5">by {quote.approved_by_name}</p>
                  )}
                  {quote.approved_by_email && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{quote.approved_by_email}</p>
                  )}
                  {quote.approval_signature && (
                    <p className="text-xs text-on-surface-variant mt-1">Sig: {quote.approval_signature}</p>
                  )}
                </div>
              )}

              {/* Notes — directly above Billing Progress */}
              {(quote.notes || quote.internal_notes) && (
                <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm space-y-3">
                  {quote.notes && (
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                        Client Notes
                      </p>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                  )}
                  {quote.internal_notes && (
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                        Internal Notes
                      </p>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{quote.internal_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Billing Progress — directly below Notes */}
              {linkedInvoices.length > 0 && (
                <div className="rounded-3xl border border-outline-variant bg-white shadow-sm overflow-hidden">
                  <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface">
                      Billing Progress
                    </p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-outline-variant border-b border-outline-variant text-center">
                    <div className="px-2 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface">Invoices</p>
                      <p className="text-lg font-extrabold text-on-surface tabular-nums mt-0.5">
                        {linkedInvoiceSummary?.linked_invoice_count ?? linkedInvoices.length}
                      </p>
                    </div>
                    <div className="px-2 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface">Billed</p>
                      <p className="text-sm font-bold text-on-surface tabular-nums mt-0.5 break-all leading-tight">
                        {formatAUD(linkedInvoiceSummary?.billed_total_cents ?? 0)}
                      </p>
                    </div>
                    <div className="px-2 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface">Remaining</p>
                      <p className="text-sm font-bold text-primary tabular-nums mt-0.5 break-all leading-tight">
                        {formatAUD(remainingLinkedInvoiceTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-outline-variant">
                    {linkedInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-on-surface">{invoice.invoice_number}</p>
                            {invoice.quote_stage_label && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                                {invoice.quote_stage_label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {invoice.status} · {formatDate(invoice.created_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-on-surface tabular-nums">
                            {formatAUD(invoice.total_cents)}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            bal {formatAUD(invoice.balance_cents)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4">
            <QuoteActions
              quoteId={quote.id}
              quoteNumber={quote.quote_number}
              status={quote.status}
              publicQuoteUrl={publicQuoteUrl}
              hasLinkedInvoices={quote.has_linked_invoices}
            />
          </div>
        </>
      )}
    </div>
  );
}
