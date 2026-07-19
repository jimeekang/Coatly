'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatAUD, formatDate } from '@/utils/format';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  QUOTE_STATUS_TONE,
  STATUS_TONE_BG,
  STATUS_TONE_DOT,
} from '@/lib/constants/status-colors';
import type { PublicQuoteDetail } from '@/modules/quotes/domain/quotes';
import { PublicOptionalItems } from './PublicOptionalItems';
import { PublicApprovalForm } from './PublicApprovalForm';
import {
  PublicDatePickerStep,
  type BookJobFromPublicQuoteAction,
  type GetAvailableDatesAction,
  type PublicDateAvailabilityResult,
} from './PublicDatePickerStep';
import {
  QUOTE_COATING_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_SURFACE_LABELS,
  calculateDepositCents,
  calculateQuoteTotals,
  groupQuoteLineItemsByCategory,
} from '@/modules/quotes/domain/quotes';

interface Business {
  name: string;
  abn: string | null;
  phone: string | null;
  email: string | null;
}

interface PublicQuoteClientProps {
  token: string;
  quote: PublicQuoteDetail;
  business: Business | null;
  bookingAvailability?: PublicDateAvailabilityResult | null;
  getAvailableDatesAction: GetAvailableDatesAction;
  bookJobFromPublicQuoteAction: BookJobFromPublicQuoteAction;
}

function getQuotePdfFilename(quoteNumber: string) {
  const safeQuoteNumber =
    quoteNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'document';
  return `quote-${safeQuoteNumber}.pdf`;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function PriceSummary({
  displaySubtotal,
  displayGst,
  displayTotal,
  displayDiscount,
  displayAdjustment,
  displayDeposit,
  depositPercent,
  optionalSelectedCents,
  optionalAvailableCents,
  validUntil,
  approvedAt,
  sidebar = false,
}: {
  displaySubtotal: number;
  displayGst: number;
  displayTotal: number;
  displayDiscount: number;
  displayAdjustment: number;
  displayDeposit: number;
  depositPercent: number;
  optionalSelectedCents: number;
  optionalAvailableCents: number;
  validUntil: string | null;
  approvedAt: string | null;
  sidebar?: boolean;
}) {
  return (
    <div className="space-y-0">
      {optionalSelectedCents > 0 && (
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-on-surface-variant">Add-ons selected</span>
          <span className="font-medium text-on-success-container">
            +{formatAUD(optionalSelectedCents)}
          </span>
        </div>
      )}
      {optionalAvailableCents > 0 && (
        <div className="border-outline/60 flex items-center justify-between border-t py-2.5 text-sm">
          <span className="text-on-surface-variant">Add-ons available</span>
          <span className="text-on-surface-variant">
            {formatAUD(optionalAvailableCents)}
          </span>
        </div>
      )}
      <div className="border-outline/60 flex items-center justify-between border-t py-2.5 text-sm">
        <span className="text-on-surface-variant">Subtotal</span>
        <span className="text-on-surface font-medium">
          {formatAUD(displaySubtotal)}
        </span>
      </div>
      {displayDiscount > 0 && (
        <div className="border-outline/60 flex items-center justify-between border-t py-2.5 text-sm">
          <span className="text-on-surface-variant">Discount</span>
          <span className="text-on-error-container font-medium">
            -{formatAUD(displayDiscount)}
          </span>
        </div>
      )}
      <div className="border-outline/60 flex items-center justify-between border-t py-2.5 text-sm">
        <span className="text-on-surface-variant">GST (10%)</span>
        <span className="text-on-surface font-medium">
          {formatAUD(displayGst)}
        </span>
      </div>
      {displayAdjustment !== 0 && (
        <div className="border-outline/60 flex items-center justify-between border-t py-2.5 text-sm">
          <span className="text-on-surface-variant">Adjustment</span>
          <span
            className={
              displayAdjustment < 0
                ? 'text-on-error-container font-medium'
                : 'text-on-surface font-medium'
            }
          >
            {displayAdjustment > 0 ? '+' : '-'}
            {formatAUD(Math.abs(displayAdjustment))}
          </span>
        </div>
      )}
      <div className="border-outline mt-1 border-t-2 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-on-surface font-semibold">Total (inc. GST)</span>
          <span
            className={
              sidebar
                ? 'text-primary text-2xl font-bold'
                : 'text-on-surface text-xl font-bold'
            }
          >
            {formatAUD(displayTotal)}
          </span>
        </div>
        {validUntil && (
          <p className="text-on-surface-variant mt-2 text-xs">
            Valid until {formatDate(validUntil)}
          </p>
        )}
        {displayDeposit > 0 && (
          <div className="border-outline/60 mt-3 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Deposit ({depositPercent}%)
              </span>
              <span className="text-on-surface font-medium">
                {formatAUD(displayDeposit)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Balance</span>
              <span className="text-on-surface font-medium">
                {formatAUD(Math.max(0, displayTotal - displayDeposit))}
              </span>
            </div>
          </div>
        )}
        {approvedAt && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-success-container px-3 py-2">
            <svg
              className="h-4 w-4 shrink-0 text-on-success-container"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs font-medium text-on-success-container">
              Approved {formatDate(approvedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-outline overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="border-outline/60 bg-surface-container-low border-b px-5 py-3.5">
      <SectionLabel>{label}</SectionLabel>
      {description && (
        <p className="text-on-surface-variant/80 mt-0.5 text-xs">{description}</p>
      )}
    </div>
  );
}

export function PublicQuoteClient({
  token,
  quote,
  business,
  bookingAvailability = null,
  getAvailableDatesAction,
  bookJobFromPublicQuoteAction,
}: PublicQuoteClientProps) {
  const includedLineItems = quote.line_items.filter(
    (item) => !item.is_optional
  );
  const optionalLineItems = quote.line_items.filter((item) => item.is_optional);
  const includedLineItemGroups =
    groupQuoteLineItemsByCategory(includedLineItems);

  const currentOptionalSelectedCents = optionalLineItems
    .filter((i) => i.is_selected)
    .reduce((s, i) => s + i.total_cents, 0);
  const baseSubtotal = quote.subtotal_cents - currentOptionalSelectedCents;

  const initialSelected = new Set(
    optionalLineItems.filter((i) => i.is_selected).map((i) => i.id)
  );
  const [selectedOptionalIds, setSelectedOptionalIds] =
    useState<Set<string>>(initialSelected);

  const optionalSelectedCents = optionalLineItems
    .filter((i) => selectedOptionalIds.has(i.id))
    .reduce((s, i) => s + i.total_cents, 0);
  const optionalAvailableCents = optionalLineItems
    .filter((i) => !selectedOptionalIds.has(i.id))
    .reduce((s, i) => s + i.total_cents, 0);

  const displayTotals = calculateQuoteTotals({
    base_subtotal_cents: baseSubtotal,
    discount_cents: quote.discount_cents,
    manual_adjustment_cents: quote.manual_adjustment_cents,
    line_items: optionalLineItems.map((item) => ({
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
      is_optional: true,
      is_selected: selectedOptionalIds.has(item.id),
    })),
  });
  const displaySubtotal = displayTotals.subtotal_cents;
  const displayDiscount =
    displaySubtotal - displayTotals.discounted_subtotal_cents;
  const displayGst = displayTotals.gst_cents;
  const displayTotal = displayTotals.total_cents;
  const displayDeposit = calculateDepositCents(
    displayTotal,
    quote.deposit_percent
  );
  const scopeSections = quote.scope_sections.filter(
    (section) => !section.is_optional || section.is_selected
  );
  const reportSections = scopeSections.filter(
    (section) => section.report_context
  );

  const canApprove = quote.status === 'sent';
  const canEditOptional = quote.status === 'sent';

  const approvalHelperText =
    quote.status === 'expired'
      ? 'This quote has expired and can no longer be approved.'
      : quote.status === 'rejected'
        ? 'This quote has already been declined.'
        : quote.status === 'approved'
          ? 'This quote has been approved. Thank you!'
          : canApprove
            ? 'Review the total, sign below, and approve to confirm your job.'
            : 'This quote has already been processed.';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="lg:grid lg:grid-cols-[1fr_296px] lg:items-start lg:gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-5">
          {/* Quote hero card */}
          <div className="overflow-hidden rounded-2xl shadow-md">
            {/* Brand header */}
            <div className="bg-primary px-6 py-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SectionLabel className="tracking-[0.18em] text-on-primary/70">
                    {business?.name || 'Painting Quote'}
                  </SectionLabel>
                  <h1 className="mt-2 text-2xl leading-tight font-bold text-on-primary sm:text-3xl">
                    {quote.title || 'Painting Quote'}
                  </h1>
                  <p className="mt-1.5 text-sm text-on-primary/75">
                    {quote.quote_number}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Status badge */}
                  <StatusBadge
                    tone={QUOTE_STATUS_TONE[quote.status]}
                    label={QUOTE_STATUS_LABELS[quote.status]}
                    size="md"
                  />
                  <a
                    href={`/api/pdf/quote?token=${encodeURIComponent(token)}`}
                    target="_blank"
                    rel="noreferrer"
                    download={getQuotePdfFilename(quote.quote_number)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-on-primary/30 px-4 text-xs font-semibold text-on-primary transition-colors hover:bg-on-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60"
                  >
                    PDF
                  </a>
                </div>
              </div>
            </div>

            {/* Customer + dates */}
            <div className="bg-surface-container-lowest px-6 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <SectionLabel>Prepared For</SectionLabel>
                  <p className="text-on-surface mt-1.5 text-base font-semibold">
                    {quote.customer.company_name || quote.customer.name}
                  </p>
                  {quote.customer.address && (
                    <p className="text-on-surface-variant mt-0.5 text-sm">
                      {quote.customer.address}
                    </p>
                  )}
                  {quote.customer.email && (
                    <p className="text-on-surface-variant mt-0.5 text-sm">
                      {quote.customer.email}
                    </p>
                  )}
                </div>
                {quote.notes && (
                  <div>
                    <SectionLabel>Notes</SectionLabel>
                    <p className="text-on-surface-variant mt-1.5 text-sm whitespace-pre-wrap">
                      {quote.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile-only price summary */}
              <div className="border-outline bg-surface-container-low mt-5 rounded-xl border px-4 py-1 lg:hidden">
                <PriceSummary
                  displaySubtotal={displaySubtotal}
                  displayGst={displayGst}
                  displayTotal={displayTotal}
                  displayDiscount={displayDiscount}
                  displayAdjustment={quote.manual_adjustment_cents}
                  displayDeposit={displayDeposit}
                  depositPercent={quote.deposit_percent}
                  optionalSelectedCents={optionalSelectedCents}
                  optionalAvailableCents={optionalAvailableCents}
                  validUntil={quote.valid_until}
                  approvedAt={quote.approved_at}
                />
              </div>
            </div>
          </div>

          {/* Customer-visible scope */}
          {scopeSections.length > 0 && (
            <SectionCard>
              <SectionHeader
                label="Scope of Work"
                description="Customer-visible work sections and site notes"
              />
              <div className="space-y-4 p-5">
                {reportSections.length > 0 && (
                  <div className="border-outline bg-surface-container-low rounded-xl border px-4 py-3">
                    <p className="text-on-surface text-sm font-semibold">
                      Maintenance Summary
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {reportSections.map((section) => (
                        <p
                          key={section.id}
                          className="text-on-surface-variant text-sm"
                        >
                          {section.area_label ? `${section.area_label}: ` : ''}
                          {section.title}
                          {section.visible_defects.length > 0
                            ? ` (${section.visible_defects.join(', ')})`
                            : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {scopeSections.map((section) => (
                  <div
                    key={section.id}
                    className="border-outline overflow-hidden rounded-xl border"
                  >
                    <div className="bg-surface-container-low flex items-start justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="text-on-surface font-semibold">
                          {section.title}
                        </p>
                        <p className="text-on-surface-variant mt-0.5 text-xs capitalize">
                          {section.area_label ||
                            formatLabel(section.section_kind)}
                        </p>
                      </div>
                      <span className="text-primary shrink-0 rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-bold tracking-wide uppercase">
                        {formatLabel(section.pricing_status) ?? 'Included'}
                      </span>
                    </div>
                    <div className="space-y-3 bg-surface-container-lowest px-4 py-3">
                      {section.description && (
                        <p className="text-on-surface text-sm whitespace-pre-wrap">
                          {section.description}
                        </p>
                      )}
                      <div className="text-on-surface-variant flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span>
                          Measurement:{' '}
                          {formatLabel(section.measurement_status) ??
                            'To Confirm'}
                        </span>
                        {section.surface_category && (
                          <span>
                            Surface: {formatLabel(section.surface_category)}
                          </span>
                        )}
                      </div>
                      {section.visible_defects.length > 0 && (
                        <p className="text-on-surface-variant text-xs">
                          Visible defects: {section.visible_defects.join(', ')}
                        </p>
                      )}
                      {section.steps.length > 0 && (
                        <div className="border-outline/60 divide-outline/60 divide-y rounded-xl border">
                          {section.steps.map((step) => (
                            <div key={step.id} className="px-3 py-2">
                              <SectionLabel>
                                {step.label || formatLabel(step.step_type)}
                              </SectionLabel>
                              <p className="text-on-surface mt-0.5 text-sm">
                                {step.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Pricing summary */}
          {(quote.rooms.length > 0 || quote.estimate_items.length > 0) && (
            <SectionCard>
              <SectionHeader
                label="Pricing Summary"
                description="Priced rows included in this quote"
              />
              <div className="space-y-3 p-5">
                {quote.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="border-outline overflow-hidden rounded-xl border"
                  >
                    {/* Room header */}
                    <div className="bg-surface-container-low flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-on-surface font-semibold">
                          {room.name}
                        </p>
                        <p className="text-on-surface-variant text-xs capitalize">
                          {room.room_type}
                        </p>
                      </div>
                      <p className="text-on-surface text-sm font-bold">
                        {formatAUD(room.total_cents)}
                      </p>
                    </div>
                    {/* Surfaces */}
                    <div className="divide-outline/50 divide-y bg-surface-container-lowest">
                      {room.surfaces.map((surface) => (
                        <div
                          key={surface.id}
                          className="flex items-start justify-between gap-4 px-4 py-3"
                        >
                          <div>
                            <p className="text-on-surface text-sm font-medium">
                              {QUOTE_SURFACE_LABELS[surface.surface_type]}
                            </p>
                            <p className="text-on-surface-variant mt-0.5 text-xs">
                              {QUOTE_COATING_LABELS[surface.coating_type]}
                            </p>
                            <div className="text-on-surface-variant mt-1 flex flex-wrap gap-x-3 text-xs">
                              <span>{surface.area_m2.toFixed(1)} sqm</span>
                              <span>
                                {formatAUD(surface.rate_per_m2_cents)}/sqm
                              </span>
                            </div>
                            {surface.notes && (
                              <p className="text-on-surface-variant mt-1 text-xs">
                                {surface.notes}
                              </p>
                            )}
                          </div>
                          <p className="text-on-surface shrink-0 text-sm font-semibold">
                            {formatAUD(surface.total_cents)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {quote.estimate_items.map((item) => (
                  <div
                    key={item.id}
                    className="border-outline bg-surface-container-low flex items-start justify-between gap-4 rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="text-on-surface font-medium">{item.label}</p>
                      <p className="text-on-surface-variant mt-0.5 text-xs tracking-wide uppercase">
                        {item.category.replaceAll('_', ' ')}
                      </p>
                      <p className="text-on-surface-variant mt-1 text-sm">
                        {item.quantity} {item.unit} @{' '}
                        {formatAUD(item.unit_price_cents)}
                      </p>
                    </div>
                    <p className="text-on-surface shrink-0 text-sm font-semibold">
                      {formatAUD(item.total_cents)}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Materials & Add-ons */}
          {(includedLineItems.length > 0 || optionalLineItems.length > 0) && (
            <SectionCard>
              <SectionHeader
                label="Materials & Add-ons"
                description={
                  optionalLineItems.length > 0
                    ? 'Included items are part of the total. Toggle optional extras below.'
                    : 'Materials included in this quote.'
                }
              />
              <div className="space-y-4 p-5">
                {includedLineItems.length > 0 && (
                  <div className="space-y-2">
                    {includedLineItems.length > 0 &&
                      optionalLineItems.length > 0 && (
                        <SectionLabel>Included</SectionLabel>
                      )}
                    {includedLineItemGroups.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <SectionLabel>{group.label}</SectionLabel>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className="border-outline bg-surface-container-low flex items-start justify-between gap-4 rounded-xl border px-4 py-3"
                            >
                              <div>
                                <p className="text-on-surface font-medium">
                                  {item.name}
                                </p>
                                <p className="text-on-surface-variant mt-0.5 text-sm">
                                  {item.quantity} {item.unit} @{' '}
                                  {formatAUD(item.unit_price_cents)}
                                </p>
                                {item.notes && (
                                  <p className="text-on-surface-variant mt-1 text-sm">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <p className="text-on-surface shrink-0 text-sm font-semibold">
                                {formatAUD(item.total_cents)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {optionalLineItems.length > 0 && (
                  <div
                    className={
                      includedLineItems.length > 0
                        ? 'border-outline/60 border-t pt-4'
                        : ''
                    }
                  >
                    {includedLineItems.length > 0 && (
                      <SectionLabel className="mb-3">
                        Optional add-ons
                      </SectionLabel>
                    )}
                    <PublicOptionalItems
                      quoteToken={token}
                      items={optionalLineItems}
                      canEdit={canEditOptional}
                      onSelectionsChange={setSelectedOptionalIds}
                    />
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Clauses */}
          {quote.clause_items.length > 0 && (
            <SectionCard>
              <SectionHeader
                label="Clauses & Terms"
                description="Customer-visible inclusions, exclusions, and site conditions"
              />
              <div className="divide-outline/60 divide-y p-5 pt-2">
                {quote.clause_items.map((clause) => (
                  <div key={clause.id} className="py-3">
                    <p className="text-on-surface text-sm font-semibold">
                      {clause.title}
                    </p>
                    <p className="text-on-surface-variant mt-1 text-sm whitespace-pre-wrap">
                      {clause.body}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Approval */}
          <SectionCard>
            <SectionHeader
              label="Approve Quote"
              description={approvalHelperText}
            />
            <div className="p-5">
              <PublicApprovalForm
                quoteToken={token}
                canApprove={canApprove}
                approvalHelperText={approvalHelperText}
                approvedAt={quote.approved_at}
                approvedByName={quote.approved_by_name}
                approvedByEmail={quote.approved_by_email}
                approvalSignature={quote.approval_signature}
                customerName={quote.customer.name}
                customerEmail={quote.customer.email}
                formatDate={formatDate}
              />
            </div>
          </SectionCard>

          {/* Date Booking — only shown after approval */}
          {quote.approved_at && (
            <SectionCard>
              <SectionHeader
                label="Book Your Dates"
                description="Select your preferred start date. We'll block out the required days automatically."
              />
              <div className="p-5">
                <PublicDatePickerStep
                  token={token}
                  workingDays={quote.working_days ?? 1}
                  customerName={quote.customer.name}
                  initialBlockedDates={bookingAvailability?.blockedDates ?? []}
                  initialWorkingDays={
                    bookingAvailability?.workingDays ?? quote.working_days ?? 1
                  }
                  initialLoadError={bookingAvailability?.error ?? null}
                  initialAvailabilityStatus={
                    bookingAvailability?.availabilityStatus
                  }
                  initialAvailabilityMessage={
                    bookingAvailability?.availabilityMessage
                  }
                  contractorName={business?.name ?? null}
                  contractorPhone={business?.phone ?? null}
                  contractorEmail={business?.email ?? null}
                  getAvailableDatesAction={getAvailableDatesAction}
                  bookJobFromPublicQuoteAction={bookJobFromPublicQuoteAction}
                />
              </div>
            </SectionCard>
          )}

          {/* Business contact — mobile only (sidebar shows it on desktop) */}
          {business && (
            <SectionCard className="lg:hidden">
              <SectionHeader label="Business Contact" />
              <div className="grid gap-1.5 p-5 text-sm">
                <p className="text-on-surface font-semibold">{business.name}</p>
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {business.phone}
                  </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {business.email}
                  </a>
                )}
                {business.abn && (
                  <p className="text-on-surface-variant">ABN: {business.abn}</p>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── RIGHT COLUMN — sticky price sidebar (desktop) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-3">
            {/* Price card */}
            <div className="border-outline overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm">
              <div className="bg-primary px-5 py-4">
                <SectionLabel className="text-on-primary/70">
                  Quote Total
                </SectionLabel>
                <p className="mt-1 text-3xl font-bold text-on-primary">
                  {formatAUD(displayTotal)}
                </p>
                <p className="mt-0.5 text-xs text-on-primary/60">Including GST</p>
              </div>
              <div className="px-5 py-1">
                <PriceSummary
                  displaySubtotal={displaySubtotal}
                  displayGst={displayGst}
                  displayTotal={displayTotal}
                  displayDiscount={displayDiscount}
                  displayAdjustment={quote.manual_adjustment_cents}
                  displayDeposit={displayDeposit}
                  depositPercent={quote.deposit_percent}
                  optionalSelectedCents={optionalSelectedCents}
                  optionalAvailableCents={optionalAvailableCents}
                  validUntil={quote.valid_until}
                  approvedAt={quote.approved_at}
                  sidebar
                />
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 ${STATUS_TONE_BG[QUOTE_STATUS_TONE[quote.status]]}`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_TONE_DOT[QUOTE_STATUS_TONE[quote.status]]}`}
              />
              <span className="text-sm font-medium">
                {QUOTE_STATUS_LABELS[quote.status]}
              </span>
            </div>

            {/* Business contact (full detail) */}
            {business && (
              <div className="border-outline overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm">
                <div className="border-outline/60 bg-surface-container-low border-b px-4 py-3">
                  <SectionLabel>Business Contact</SectionLabel>
                </div>
                <div className="space-y-2.5 px-4 py-4 text-sm">
                  <p className="text-on-surface font-semibold">{business.name}</p>
                  {business.phone && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="text-on-surface-variant h-3.5 w-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                        />
                      </svg>
                      <a
                        href={`tel:${business.phone}`}
                        className="text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {business.phone}
                      </a>
                    </div>
                  )}
                  {business.email && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="text-on-surface-variant h-3.5 w-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
                      <a
                        href={`mailto:${business.email}`}
                        className="text-on-surface-variant hover:text-primary break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {business.email}
                      </a>
                    </div>
                  )}
                  {business.abn && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="text-on-surface-variant h-3.5 w-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      <span className="text-on-surface-variant">
                        ABN: {business.abn}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
