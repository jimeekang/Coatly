export type QuoteInvoicePresetLine = {
  description: string;
  quantity: number;
  unit_price_cents: number;
};

export type QuoteInvoicePresetQuote = {
  id: string;
  quote_number: string;
  title: string | null;
  subtotal_cents: number;
  total_cents: number;
  discount_cents: number;
  manual_adjustment_cents: number;
  deposit_percent: number;
  billed_subtotal_cents: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents?: number;
    is_optional: boolean;
    is_selected: boolean;
  }>;
};

export type QuoteInvoicePresetType = 'full' | 'deposit' | 'progress' | 'final';

export type QuoteInvoicePresetResult = {
  error: string | null;
  line_items: QuoteInvoicePresetLine[];
};

export const QUOTE_MANUAL_ADJUSTMENT_INVOICE_PRESET_ERROR =
  'This quote has a manual adjustment. Create the invoice manually or remove the adjustment before using a quote preset.';

function buildQuoteScopeLabel(quote: Pick<QuoteInvoicePresetQuote, 'quote_number' | 'title'>) {
  return quote.title?.trim()
    ? `${quote.quote_number} - ${quote.title.trim()}`
    : quote.quote_number;
}

function buildSingleAmountLine(
  description: string,
  amountCents: number
): QuoteInvoicePresetLine[] {
  return [
    {
      description,
      quantity: 1,
      unit_price_cents: Math.max(0, Math.round(amountCents)),
    },
  ];
}

function normalizeProgressPercent(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function grossToExGstCents(grossCents: number) {
  return Math.round(Math.max(0, grossCents) / 1.1);
}

function getIncludedQuoteLineItems(quote: QuoteInvoicePresetQuote) {
  return quote.line_items.filter((item) => !item.is_optional || item.is_selected);
}

function getQuoteLineItemSnapshotTotal(item: QuoteInvoicePresetQuote['line_items'][number]) {
  return item.total_cents ?? Math.round(item.quantity * item.unit_price_cents);
}

function getDiscountedSubtotalCents(quote: QuoteInvoicePresetQuote) {
  const discountCents = Math.min(
    Math.max(0, Math.round(quote.discount_cents)),
    Math.max(0, Math.round(quote.subtotal_cents))
  );
  return Math.max(0, Math.round(quote.subtotal_cents) - discountCents);
}

function buildFullInvoiceLines(quote: QuoteInvoicePresetQuote): QuoteInvoicePresetLine[] {
  const quoteLabel = buildQuoteScopeLabel(quote);
  const discountedSubtotalCents = getDiscountedSubtotalCents(quote);

  if (quote.discount_cents > 0) {
    return buildSingleAmountLine(
      `Approved quote scope - ${quoteLabel} (discount applied)`,
      discountedSubtotalCents
    );
  }

  const includedItems = getIncludedQuoteLineItems(quote);
  const includedItemsSubtotal = includedItems.reduce(
    (sum, item) => sum + getQuoteLineItemSnapshotTotal(item),
    0
  );
  const baseSubtotalCents = Math.max(
    0,
    Math.round(quote.subtotal_cents) - includedItemsSubtotal
  );

  return [
    ...(baseSubtotalCents > 0
      ? buildSingleAmountLine(`Approved quote scope - ${quoteLabel}`, baseSubtotalCents)
      : []),
    ...includedItems.map((item) => ({
      description: item.description,
      quantity: 1,
      unit_price_cents: getQuoteLineItemSnapshotTotal(item),
    })),
  ];
}

export function buildQuoteInvoicePresetLines(
  quote: QuoteInvoicePresetQuote,
  options: {
    invoice_type?: QuoteInvoicePresetType;
    existing_linked_quote_subtotal_cents?: number;
    progress_percent?: number;
  } = {}
): QuoteInvoicePresetResult {
  if (quote.manual_adjustment_cents !== 0) {
    return {
      error: QUOTE_MANUAL_ADJUSTMENT_INVOICE_PRESET_ERROR,
      line_items: [],
    };
  }

  const quoteLabel = buildQuoteScopeLabel(quote);
  const invoiceType = options.invoice_type ?? 'full';
  const invoiceableSubtotalCents = getDiscountedSubtotalCents(quote);
  const existingLinkedQuoteSubtotalCents = Math.max(
    0,
    options.existing_linked_quote_subtotal_cents ?? 0
  );
  const billedBeforeThisInvoiceCents = Math.max(
    quote.billed_subtotal_cents - existingLinkedQuoteSubtotalCents,
    0
  );

  if (invoiceType === 'full') {
    return { error: null, line_items: buildFullInvoiceLines(quote) };
  }

  if (invoiceType === 'deposit') {
    if (quote.deposit_percent <= 0) {
      return { error: null, line_items: buildFullInvoiceLines(quote) };
    }

    const depositGrossCents = Math.round(
      (Math.max(0, quote.total_cents) * quote.deposit_percent) / 100
    );
    return {
      error: null,
      line_items: buildSingleAmountLine(
        `Deposit (${quote.deposit_percent}%) for ${quoteLabel}`,
        grossToExGstCents(depositGrossCents)
      ),
    };
  }

  if (invoiceType === 'progress') {
    const progressPercent = normalizeProgressPercent(options.progress_percent ?? 100);
    const depositGrossCents =
      quote.deposit_percent > 0
        ? Math.round((Math.max(0, quote.total_cents) * quote.deposit_percent) / 100)
        : 0;
    const depositSubtotalCents = grossToExGstCents(depositGrossCents);
    const progressBaseCents = Math.max(
      invoiceableSubtotalCents -
        Math.max(billedBeforeThisInvoiceCents, depositSubtotalCents),
      0
    );
    const progressSubtotalCents = Math.round(
      (progressBaseCents * progressPercent) / 100
    );

    return {
      error: null,
      line_items: buildSingleAmountLine(
        `Progress claim (${progressPercent}%) for ${quoteLabel}`,
        progressSubtotalCents
      ),
    };
  }

  return {
    error: null,
    line_items: buildSingleAmountLine(
      `Final balance for ${quoteLabel}`,
      Math.max(invoiceableSubtotalCents - billedBeforeThisInvoiceCents, 0)
    ),
  };
}
