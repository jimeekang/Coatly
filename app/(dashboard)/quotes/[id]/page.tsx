import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Pencil } from 'lucide-react';
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
import { BackLink } from '@/components/layout/BackLink';
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
        <BackLink href="/quotes" label="All quotes" />
      </div>

      {error || !quote ? (
        <ErrorAlert>{error ?? 'Quote not found.'}</ErrorAlert>
      ) : (
        <>
          {/* Banners */}
          {emailSent && (
            <div className="border-primary/20 bg-primary/8 mb-4 rounded-xl border px-4 py-3">
              <p className="text-primary text-sm">
                Quote email sent to {emailSentRecipient}.
              </p>
            </div>
          )}
          {jobError && <ErrorAlert className="mb-4">{jobError}</ErrorAlert>}
          {(editLocked || quote.has_linked_invoices) && (
            <div className="border-warning/20 bg-warning-container mb-4 rounded-xl border px-4 py-3">
              <p className="text-on-warning-container text-sm">
                This quote is locked because at least one linked invoice already
                exists.
              </p>
            </div>
          )}

          {/* ── detail-head ── */}
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <SectionLabel className="mb-1 font-mono">
                {quote.quote_number}
              </SectionLabel>
              <h1 className="text-on-surface mt-1 text-[26px] leading-tight font-extrabold tracking-tight">
                {quote.customer.company_name || quote.customer.name}
              </h1>
              {quote.title && (
                <p className="text-on-surface-variant mt-1 text-sm">
                  {quote.title}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge
                tone={QUOTE_STATUS_TONE[quote.status]}
                label={QUOTE_STATUS_LABELS[quote.status]}
                size="md"
              />
              {!quote.has_linked_invoices && (
                <Link
                  href={`/quotes/${id}/edit`}
                  className="bg-primary text-on-primary focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* ── detail-grid: main card + sidebar ── */}
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            {/* ── Main card: Line items + Totals ── */}
            <div className="bg-surface-container-lowest border-outline-variant min-w-0 self-start rounded-2xl border shadow-sm">
              <div className="p-4">
                <p className="text-on-surface mb-3 text-[13px] font-bold tracking-[-0.005em]">
                  Line items
                </p>

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
            </div>

            {/* ── Sidebar: meta-boxes ── */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Customer meta-box */}
              <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
                <SectionLabel className="text-on-surface mb-1.5">
                  Customer
                </SectionLabel>
                <p className="text-on-surface text-sm font-semibold">
                  {quote.customer.company_name || quote.customer.name}
                </p>
                {quote.customer.company_name && (
                  <p className="text-on-surface-variant mt-0.5 text-xs">
                    {quote.customer.name}
                  </p>
                )}
                {quote.customer.email && (
                  <p className="text-on-surface-variant mt-1 text-xs">
                    {quote.customer.email}
                  </p>
                )}
                {quote.customer.phone && (
                  <p className="text-on-surface-variant mt-0.5 text-xs">
                    {quote.customer.phone}
                  </p>
                )}
                {quote.customer.address && (
                  <p className="text-on-surface-variant mt-1 text-xs">
                    {quote.customer.address}
                  </p>
                )}
              </div>

              {/* Dates meta-box */}
              <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
                <SectionLabel className="text-on-surface mb-1.5">
                  Dates
                </SectionLabel>
                <p className="text-on-surface text-sm font-semibold">
                  Created {formatDate(quote.created_at)}
                </p>
                <p className="text-on-surface-variant mt-1 text-xs">
                  Valid until{' '}
                  {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                </p>
                <p className="text-on-surface-variant mt-0.5 text-xs">
                  Modified {formatDate(quote.updated_at)}
                </p>
              </div>

              {/* Client Link meta-box */}
              {publicQuoteUrl && (
                <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
                  <SectionLabel className="text-on-surface mb-1.5">
                    Client Link
                  </SectionLabel>
                  <p className="text-on-surface text-xs break-all">
                    {publicQuoteUrl}
                  </p>
                </div>
              )}

              {/* Profitability + Cost Breakdown — grouped together */}
              <div className="flex flex-col gap-4">
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
                      <SectionLabel className="text-warning">
                        Cost Breakdown
                      </SectionLabel>
                      <span className="bg-warning/10 text-warning rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
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
                <div className="border-success/20 bg-success-container min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm">
                  <SectionLabel className="text-success mb-1.5">
                    Approved
                  </SectionLabel>
                  <p className="text-on-surface text-sm font-semibold">
                    {formatDate(quote.approved_at)}
                  </p>
                  {quote.approved_by_name && (
                    <p className="text-on-surface-variant mt-0.5 text-xs">
                      by {quote.approved_by_name}
                    </p>
                  )}
                  {quote.approved_by_email && (
                    <p className="text-on-surface-variant mt-0.5 text-xs">
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
                      className="mt-3 max-h-24 w-full max-w-xs rounded-xl border border-success/20 bg-surface-container-lowest object-contain p-2"
                    />
                  )}
                  {quote.approval_signature && !approvalSignatureIsImage && (
                    <p className="mt-1 break-words text-xs text-on-surface-variant">
                      Signed: {quote.approval_signature}
                    </p>
                  )}
                </div>
              )}

              {/* Notes — directly above Billing Progress */}
              {(quote.notes || quote.internal_notes) && (
                <div className="border-outline-variant bg-surface-container-low space-y-3 rounded-2xl border p-4 shadow-sm">
                  {quote.notes && (
                    <div>
                      <SectionLabel className="text-on-surface mb-1.5">
                        Client Notes
                      </SectionLabel>
                      <p className="text-on-surface text-sm whitespace-pre-wrap">
                        {quote.notes}
                      </p>
                    </div>
                  )}
                  {quote.internal_notes && (
                    <div>
                      <SectionLabel className="text-on-surface mb-1.5">
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
                    <SectionLabel className="text-on-surface">
                      Billing Progress
                    </SectionLabel>
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
                        className="hover:bg-surface-container-low focus-visible:ring-primary/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
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
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4">
            <QuoteActions
              quoteId={quote.id}
              quoteNumber={quote.quote_number}
              status={quote.status}
              publicQuoteUrl={publicQuoteUrl}
              recipientEmail={quoteRecipientEmail}
              hasLinkedInvoices={quote.has_linked_invoices}
              convertQuoteToJobAction={createJobFromQuote}
            />
          </div>
        </>
      )}
    </div>
  );
}
