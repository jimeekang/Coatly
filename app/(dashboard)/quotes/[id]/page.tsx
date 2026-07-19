import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ExternalLink, Pencil } from 'lucide-react';
import {
  getQuote,
  setQuoteOptionalLineItemSelection,
} from '@/modules/quotes/application/actions';
import { getLinkedInvoicesForQuote } from '@/modules/invoices/application/actions';
import { createJobFromQuote } from '@/modules/jobs/application/actions';
import { APP_URL } from '@/config/constants';
import {
  QUOTE_COATING_LABELS,
  QUOTE_SURFACE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/modules/quotes/domain/quotes';
import { formatAUD, formatDate } from '@/utils/format';
import { ProfitabilityCard } from '@/modules/quotes/ui/ProfitabilityCard';
import { QuoteActions } from '@/modules/quotes/ui/QuoteActions';
import { getBusinessRateSettings } from '@/modules/settings/infrastructure/businesses';
import { createServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { QUOTE_STATUS_TONE } from '@/lib/constants/status-colors';
import { PageHeader, PrimaryActionLink } from '@/components/layout/PageHeader';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

export const metadata: Metadata = { title: 'Quote Detail' };

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    jobError?: string;
    emailDemo?: string;
    emailSent?: string;
    editLocked?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: quote, error }, { data: rateSettings }] = await Promise.all([
    getQuote(id),
    user
      ? getBusinessRateSettings(supabase, user.id)
      : Promise.resolve({ data: null, error: null }),
  ]);
  const linkedInvoiceResult = await getLinkedInvoicesForQuote(id);
  const linkedInvoices = linkedInvoiceResult.data?.invoices ?? [];
  const linkedInvoiceSummary = linkedInvoiceResult.data?.summary ?? null;
  const jobError =
    typeof resolvedSearchParams.jobError === 'string'
      ? resolvedSearchParams.jobError
      : null;
  const emailSent =
    resolvedSearchParams.emailSent === '1' ||
    resolvedSearchParams.emailDemo === '1';
  const editLocked = resolvedSearchParams.editLocked === '1';

  const hasManualRooms = (quote?.rooms?.length ?? 0) > 0;
  const labourBaseTotal = hasManualRooms
    ? (quote?.rooms ?? []).reduce(
        (sum, room) =>
          sum +
          room.surfaces.reduce((s, surf) => s + surf.labour_cost_cents, 0),
        0
      )
    : null;
  const materialsBaseTotal = hasManualRooms
    ? (quote?.rooms ?? []).reduce(
        (sum, room) =>
          sum +
          room.surfaces.reduce((s, surf) => s + surf.material_cost_cents, 0),
        0
      )
    : null;
  const baseSubtotalForMarkup = (() => {
    if (labourBaseTotal !== null && materialsBaseTotal !== null) {
      return labourBaseTotal + materialsBaseTotal;
    }
    if (!quote) return 0;
    const totalMarkupFraction =
      (quote.labour_margin_percent + quote.material_margin_percent) / 100;
    return totalMarkupFraction > 0
      ? Math.round(quote.subtotal_cents / (1 + totalMarkupFraction))
      : quote.subtotal_cents;
  })();
  const labourMarkupAmount = quote
    ? Math.round((baseSubtotalForMarkup * quote.labour_margin_percent) / 100)
    : 0;
  const materialsMarkupAmount = quote
    ? Math.round((baseSubtotalForMarkup * quote.material_margin_percent) / 100)
    : 0;
  const showBreakdown =
    quote &&
    (quote.labour_margin_percent > 0 ||
      quote.material_margin_percent > 0 ||
      hasManualRooms);
  const includedLineItems =
    quote?.line_items.filter((item) => !item.is_optional) ?? [];
  const optionalLineItems =
    quote?.line_items.filter((item) => item.is_optional) ?? [];
  const optionalSelectedTotal = optionalLineItems
    .filter((item) => item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);
  const optionalAvailableTotal = optionalLineItems
    .filter((item) => !item.is_selected)
    .reduce((sum, item) => sum + item.total_cents, 0);
  const publicQuoteUrl = quote?.public_share_token
    ? `${APP_URL}/q/${quote.public_share_token}`
    : null;
  const quoteRecipientEmail =
    quote?.customer_email?.trim() || quote?.customer.email?.trim() || null;
  const emailSentRecipient = quoteRecipientEmail ?? 'the customer';
  const remainingLinkedInvoiceTotal =
    quote && linkedInvoiceSummary
      ? Math.max(quote.total_cents - linkedInvoiceSummary.billed_total_cents, 0)
      : 0;
  const approvalSignatureIsImage =
    quote?.approval_signature?.startsWith('data:image/') ?? false;

  // Flatten every priced source so detail, PDF, and public quote show the same work.
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
        ...(quote.estimate_items ?? []).map((item) => ({
          key: `estimate-${item.id}`,
          name: item.label,
          sub: null as string | null,
          notes: null as string | null,
          qtyLabel: `${item.quantity} ${item.unit}`,
          rateLabel: formatAUD(item.unit_price_cents),
          amount: item.total_cents,
        })),
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
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4 pb-24 sm:gap-6">
      {error || !quote ? (
        <ErrorAlert>{error ?? 'Quote not found.'}</ErrorAlert>
      ) : (
        <>
          {/* Banners */}
          {emailSent && (
            <div className="border-primary/20 bg-primary/8 rounded-xl border px-4 py-3">
              <p className="text-primary text-sm">
                Quote email sent to {emailSentRecipient}.
              </p>
            </div>
          )}
          {jobError && <ErrorAlert>{jobError}</ErrorAlert>}
          {(editLocked || quote.has_linked_invoices) && (
            <div className="border-warning/20 bg-warning-container rounded-xl border px-4 py-3">
              <p className="text-on-warning-container text-sm">
                This quote is locked because at least one linked invoice already
                exists.
              </p>
            </div>
          )}

          <PageHeader
            backHref="/quotes"
            backLabel="All quotes"
            title={quote.customer.company_name || quote.customer.name}
            subtitle={
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase">
                  {quote.quote_number}
                </span>
                {quote.title && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{quote.title}</span>
                  </>
                )}
              </span>
            }
            action={
              <>
                <StatusBadge
                  tone={QUOTE_STATUS_TONE[quote.status]}
                  label={QUOTE_STATUS_LABELS[quote.status]}
                  size="md"
                />
                {!quote.has_linked_invoices && (
                  <PrimaryActionLink
                    href={`/quotes/${id}/edit`}
                    className="gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Edit
                  </PrimaryActionLink>
                )}
              </>
            }
          />

          {/* ── detail-grid: main card + sidebar ── */}
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(18rem,0.9fr)] xl:gap-6">
            {/* ── Main card: Line items + Totals ── */}
            <section className="border-outline-variant bg-surface-container-lowest min-w-0 self-start rounded-2xl border shadow-sm">
              <div className="p-4 sm:p-6">
                <h2 className="text-on-surface mb-4 text-lg font-bold tracking-tight">
                  Line items
                </h2>

                {/* Table header — md+ only */}
                {scopeRows.length > 0 && (
                  <div className="border-outline-variant hidden grid-cols-[1fr_90px_90px_90px] gap-3 border-b pb-2 md:grid">
                    <SectionLabel as="div">Item</SectionLabel>
                    <SectionLabel as="div" className="text-right">
                      Qty
                    </SectionLabel>
                    <SectionLabel as="div" className="text-right">
                      Rate
                    </SectionLabel>
                    <SectionLabel as="div" className="text-right">
                      Amount
                    </SectionLabel>
                  </div>
                )}

                {/* Scope rows (rooms + line items flattened) */}
                {scopeRows.length === 0 ? (
                  <p className="text-on-surface-variant py-4 text-center text-sm">
                    No line items added yet.
                  </p>
                ) : (
                  scopeRows.map((row) => (
                    <div
                      key={row.key}
                      className="border-outline-variant grid grid-cols-[1fr_auto] gap-x-3 border-t py-3 text-sm first:border-t-0 md:grid-cols-[1fr_90px_90px_90px]"
                    >
                      <div className="min-w-0">
                        <p className="text-on-surface font-semibold">
                          {row.name}
                        </p>
                        {row.sub && (
                          <p className="text-on-surface-variant mt-0.5 text-xs">
                            {row.sub}
                          </p>
                        )}
                        {row.notes && (
                          <p className="text-on-surface-variant mt-0.5 text-xs italic">
                            {row.notes}
                          </p>
                        )}
                        {/* Mobile: qty · rate inline */}
                        <p className="text-on-surface-variant mt-1 text-xs md:hidden">
                          {row.qtyLabel} · {row.rateLabel}
                        </p>
                      </div>
                      <div className="text-on-surface-variant hidden self-center text-right tabular-nums md:block">
                        {row.qtyLabel}
                      </div>
                      <div className="text-on-surface-variant hidden self-center text-right tabular-nums md:block">
                        {row.rateLabel}
                      </div>
                      <div className="text-on-surface self-center text-right font-bold tabular-nums">
                        {formatAUD(row.amount)}
                      </div>
                    </div>
                  ))
                )}

                {/* Optional items */}
                {optionalLineItems.length > 0 && (
                  <div className="border-outline-variant mt-5 space-y-3 border-t-2 border-dashed pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <SectionLabel>Optional Items</SectionLabel>
                        <p className="text-on-surface-variant mt-1 text-xs">
                          Toggle customer choices to update the quote total.
                        </p>
                      </div>
                      <div className="text-on-surface-variant shrink-0 text-right text-xs">
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
                        className="border-outline-variant bg-surface-container-low rounded-2xl border px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-on-surface text-sm font-medium">
                                {item.name}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                  item.is_selected
                                    ? 'bg-success-container text-on-success-container'
                                    : 'bg-warning-container text-on-warning-container'
                                }`}
                              >
                                {item.is_selected ? 'Selected' : 'Optional'}
                              </span>
                            </div>
                            <p className="text-on-surface-variant mt-1 text-xs">
                              {item.quantity} {item.unit} at{' '}
                              {formatAUD(item.unit_price_cents)}
                            </p>
                            {item.notes && (
                              <p className="text-on-surface-variant mt-1 text-xs">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <p className="text-on-surface text-sm font-bold tabular-nums">
                              {formatAUD(item.total_cents)}
                            </p>
                            {quote.has_linked_invoices ? (
                              <p className="text-on-surface-variant text-xs">
                                Locked
                              </p>
                            ) : (
                              <form action={setQuoteOptionalLineItemSelection}>
                                <input
                                  type="hidden"
                                  name="quoteId"
                                  value={quote.id}
                                />
                                <input
                                  type="hidden"
                                  name="lineItemId"
                                  value={item.id}
                                />
                                <input
                                  type="hidden"
                                  name="isSelected"
                                  value={item.is_selected ? 'false' : 'true'}
                                />
                                <button
                                  type="submit"
                                  className={`focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                                    item.is_selected
                                      ? 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border'
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
                <div className="border-outline-variant mt-5 space-y-2 border-t-2 pt-4">
                  <div className="text-on-surface-variant flex justify-between text-sm">
                    <span>Subtotal (ex GST)</span>
                    <span className="text-on-surface font-medium tabular-nums">
                      {formatAUD(quote.subtotal_cents)}
                    </span>
                  </div>
                  <div className="text-on-surface-variant flex justify-between text-sm">
                    <span>GST (10%)</span>
                    <span className="text-on-surface font-medium tabular-nums">
                      {formatAUD(quote.gst_cents)}
                    </span>
                  </div>
                  <div className="border-outline-variant flex items-center justify-between border-t pt-3">
                    <span className="text-on-surface text-base font-extrabold">
                      Total (inc GST)
                    </span>
                    <div>
                      <span className="text-on-surface text-[18px] font-extrabold tracking-tight tabular-nums">
                        {formatAUD(quote.total_cents)}
                      </span>
                      <span className="text-on-surface-variant ml-1 text-[10px] font-bold">
                        AUD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Sidebar: meta-boxes ── */}
            <aside className="flex min-w-0 flex-col gap-4">
              <section className="border-outline-variant bg-surface-container-lowest min-w-0 overflow-hidden rounded-2xl border shadow-sm">
                <div className="p-4 sm:p-5">
                  <SectionLabel className="mb-2">Customer</SectionLabel>
                  <p className="text-on-surface text-base font-semibold break-words">
                    {quote.customer.company_name || quote.customer.name}
                  </p>
                  {quote.customer.company_name && (
                    <p className="text-on-surface-variant mt-0.5 text-sm break-words">
                      {quote.customer.name}
                    </p>
                  )}
                  {quote.customer.email && (
                    <p className="text-on-surface-variant mt-2 text-sm break-words">
                      {quote.customer.email}
                    </p>
                  )}
                  {quote.customer.phone && (
                    <p className="text-on-surface-variant mt-0.5 text-sm">
                      {quote.customer.phone}
                    </p>
                  )}
                  {quote.customer.address && (
                    <p className="text-on-surface-variant mt-2 text-sm leading-relaxed break-words">
                      {quote.customer.address}
                    </p>
                  )}
                </div>

                <div className="border-outline-variant border-t p-4 sm:p-5">
                  <SectionLabel className="mb-3">Dates</SectionLabel>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">Created</dt>
                      <dd className="text-on-surface font-semibold">
                        {formatDate(quote.created_at)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">Valid until</dt>
                      <dd className="text-on-surface font-medium">
                        {quote.valid_until
                          ? formatDate(quote.valid_until)
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">Modified</dt>
                      <dd className="text-on-surface font-medium">
                        {formatDate(quote.updated_at)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {publicQuoteUrl && (
                  <div className="border-outline-variant border-t p-4 sm:p-5">
                    <SectionLabel className="mb-2">Customer view</SectionLabel>
                    <Link
                      href={publicQuoteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary/80 focus-visible:ring-primary/40 inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Open shared quote
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </section>

              {/* Profitability + Cost Breakdown — grouped together */}
              <div className="flex min-w-0 flex-col gap-4">
                <ProfitabilityCard
                  quote={quote}
                  targetDailyEarningsCents={
                    rateSettings?.pricing?.target_daily_earnings_cents
                  }
                />

                {/* Cost Breakdown (internal) — directly below Profitability */}
                {showBreakdown && (
                  <div className="border-warning/20 bg-warning-container overflow-hidden rounded-2xl border">
                    <div className="border-warning/20 flex items-center justify-between gap-2 border-b px-4 py-3">
                      <SectionLabel className="text-on-warning-container">
                        Cost Breakdown
                      </SectionLabel>
                      <span className="bg-warning/15 text-on-warning-container rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
                        Internal
                      </span>
                    </div>
                    <div className="space-y-2 px-4 py-3 text-xs">
                      {hasManualRooms &&
                        quote.rooms.map((room) => {
                          const roomLabour = room.surfaces.reduce(
                            (s, surf) => s + surf.labour_cost_cents,
                            0
                          );
                          const roomMaterials = room.surfaces.reduce(
                            (s, surf) => s + surf.material_cost_cents,
                            0
                          );
                          return (
                            <div
                              key={room.id}
                              className="border-warning/20 bg-surface-container-lowest/60 rounded-xl border px-3 py-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-on-surface font-semibold">
                                  {room.name}
                                </span>
                                <span className="text-on-surface font-bold tabular-nums">
                                  {formatAUD(room.total_cents)}
                                </span>
                              </div>
                              <div className="text-on-surface-variant mt-1 flex gap-3">
                                <span>Labour: {formatAUD(roomLabour)}</span>
                                <span>
                                  Materials: {formatAUD(roomMaterials)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {(quote.labour_margin_percent > 0 ||
                        quote.material_margin_percent > 0) && (
                        <div className="border-warning/20 space-y-1.5 border-t pt-2">
                          {labourBaseTotal !== null &&
                            materialsBaseTotal !== null && (
                              <>
                                <div className="text-on-surface-variant flex justify-between">
                                  <span>Labour (base)</span>
                                  <span className="text-on-surface tabular-nums">
                                    {formatAUD(labourBaseTotal)}
                                  </span>
                                </div>
                                <div className="text-on-surface-variant flex justify-between">
                                  <span>Materials (base)</span>
                                  <span className="text-on-surface tabular-nums">
                                    {formatAUD(materialsBaseTotal)}
                                  </span>
                                </div>
                              </>
                            )}
                          {quote.labour_margin_percent > 0 && (
                            <div className="text-on-surface-variant flex justify-between">
                              <span>
                                Labour markup ({quote.labour_margin_percent}%)
                              </span>
                              <span className="text-on-surface tabular-nums">
                                +{formatAUD(labourMarkupAmount)}
                              </span>
                            </div>
                          )}
                          {quote.material_margin_percent > 0 && (
                            <div className="text-on-surface-variant flex justify-between">
                              <span>
                                Materials markup (
                                {quote.material_margin_percent}%)
                              </span>
                              <span className="text-on-surface tabular-nums">
                                +{formatAUD(materialsMarkupAmount)}
                              </span>
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
                <section className="border-success/20 bg-success-container min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5">
                  <SectionLabel className="text-on-success-container mb-2">
                    Approved
                  </SectionLabel>
                  <p className="text-on-success-container text-base font-semibold">
                    {formatDate(quote.approved_at)}
                  </p>
                  {quote.approved_by_name && (
                    <p className="text-on-success-container mt-0.5 text-sm">
                      by {quote.approved_by_name}
                    </p>
                  )}
                  {quote.approved_by_email && (
                    <p className="text-on-success-container mt-0.5 text-sm break-words">
                      {quote.approved_by_email}
                    </p>
                  )}
                  {quote.approval_signature && approvalSignatureIsImage && (
                    <Image
                      src={quote.approval_signature}
                      alt={`Signature by ${quote.approved_by_name || 'customer'}`}
                      width={320}
                      height={96}
                      unoptimized
                      className="border-success/20 bg-surface-container-lowest mt-3 max-h-24 w-full max-w-xs rounded-xl border object-contain p-2"
                    />
                  )}
                  {quote.approval_signature && !approvalSignatureIsImage && (
                    <p className="text-on-success-container mt-2 text-sm break-words">
                      Signed: {quote.approval_signature}
                    </p>
                  )}
                </section>
              )}

              {/* Notes — directly above Billing Progress */}
              {(quote.notes || quote.internal_notes) && (
                <div className="border-outline-variant bg-surface-container-low space-y-3 rounded-2xl border p-4 shadow-sm">
                  {quote.notes && (
                    <div>
                      <SectionLabel className="mb-2">Client Notes</SectionLabel>
                      <p className="text-on-surface text-sm whitespace-pre-wrap">
                        {quote.notes}
                      </p>
                    </div>
                  )}
                  {quote.internal_notes && (
                    <div>
                      <SectionLabel className="mb-2">
                        Internal Notes
                      </SectionLabel>
                      <p className="text-on-surface text-sm whitespace-pre-wrap">
                        {quote.internal_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Billing Progress — directly below Notes */}
              {linkedInvoices.length > 0 && (
                <div className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-2xl border shadow-sm">
                  <div className="bg-surface-container-low border-outline-variant border-b px-4 py-3">
                    <SectionLabel>Billing Progress</SectionLabel>
                  </div>
                  <div className="divide-outline-variant border-outline-variant grid grid-cols-3 divide-x border-b text-center">
                    <div className="px-2 py-3">
                      <SectionLabel className="text-on-surface">
                        Invoices
                      </SectionLabel>
                      <p className="text-on-surface mt-0.5 text-lg font-extrabold tabular-nums">
                        {linkedInvoiceSummary?.linked_invoice_count ??
                          linkedInvoices.length}
                      </p>
                    </div>
                    <div className="px-2 py-3">
                      <SectionLabel className="text-on-surface">
                        Billed
                      </SectionLabel>
                      <p className="text-on-surface mt-0.5 text-sm leading-tight font-bold break-all tabular-nums">
                        {formatAUD(
                          linkedInvoiceSummary?.billed_total_cents ?? 0
                        )}
                      </p>
                    </div>
                    <div className="px-2 py-3">
                      <SectionLabel className="text-on-surface">
                        Remaining
                      </SectionLabel>
                      <p className="text-primary mt-0.5 text-sm leading-tight font-bold break-all tabular-nums">
                        {formatAUD(remainingLinkedInvoiceTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="divide-outline-variant divide-y">
                    {linkedInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="hover:bg-surface-container-low focus-visible:ring-primary/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-on-surface text-sm font-semibold">
                              {invoice.invoice_number}
                            </p>
                            {invoice.quote_stage_label && (
                              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                                {invoice.quote_stage_label}
                              </span>
                            )}
                          </div>
                          <p className="text-on-surface-variant mt-0.5 text-xs">
                            {invoice.status} · {formatDate(invoice.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-on-surface text-sm font-bold tabular-nums">
                            {formatAUD(invoice.total_cents)}
                          </p>
                          <p className="text-on-surface-variant mt-0.5 text-xs">
                            bal {formatAUD(invoice.balance_cents)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          <QuoteActions
            quoteId={quote.id}
            quoteNumber={quote.quote_number}
            status={quote.status}
            publicQuoteUrl={publicQuoteUrl}
            recipientEmail={quoteRecipientEmail}
            hasLinkedInvoices={quote.has_linked_invoices}
            convertQuoteToJobAction={createJobFromQuote}
          />
        </>
      )}
    </div>
  );
}
