'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD, formatDate } from '@/utils/format';

const FIELD_CLASS =
  'h-12 w-full rounded-xl border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary transition-colors focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';
const TEXTAREA_CLASS =
  'w-full rounded-xl border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary transition-colors focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-pm-body';

const INVOICE_TYPE_COPY: Record<
  InvoiceFormDefaultValues['invoice_type'],
  { label: string; hint: string }
> = {
  full: { label: 'Full invoice', hint: 'Covers the full quoted scope in one payment.' },
  deposit: { label: 'Deposit invoice', hint: 'Upfront amount to secure the job.' },
  progress: { label: 'Progress invoice', hint: 'Staged claim while work is underway.' },
  final: { label: 'Final invoice', hint: 'Closing balance after the work is complete.' },
};

// Status options only available for manual edit (not shown in create mode)
const EDIT_STATUS_OPTIONS: Array<{
  value: 'draft' | 'paid' | 'cancelled';
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

type InvoiceLineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormCustomerOption = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type InvoiceFormQuoteOption = {
  id: string;
  customer_id: string;
  quote_number: string;
  title: string | null;
  subtotal_cents: number;
  total_cents: number;
  deposit_percent: number;
  status: string;
  valid_until: string | null;
  billed_subtotal_cents: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    is_optional: boolean;
    is_selected: boolean;
  }>;
};

export type InvoiceBusinessDefaults = {
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
};

export type InvoiceFormSubmitPayload = {
  customer_id: string;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
  due_date: string | null;
  notes: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

export type InvoiceFormDefaultValues = {
  customer_id: string;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
  due_date: string | null;
  notes: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

function createInitialInvoiceForm(
  defaultValues?: InvoiceFormDefaultValues,
  businessDefaults?: InvoiceBusinessDefaults
) {
  return {
    customer_id: defaultValues?.customer_id ?? '',
    quote_id: defaultValues?.quote_id ?? '',
    invoice_type: defaultValues?.invoice_type ?? ('full' as const),
    status: defaultValues?.status ?? ('draft' as const),
    business_abn: defaultValues?.business_abn ?? businessDefaults?.business_abn ?? '',
    payment_terms: defaultValues?.payment_terms ?? businessDefaults?.payment_terms ?? '',
    bank_details: defaultValues?.bank_details ?? businessDefaults?.bank_details ?? '',
    due_date: defaultValues?.due_date ?? '',
    notes: defaultValues?.notes ?? '',
  };
}

function createInitialLineItems(defaultValues?: InvoiceFormDefaultValues): InvoiceLineDraft[] {
  if (defaultValues?.line_items.length) {
    return defaultValues.line_items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: (item.unit_price_cents / 100).toFixed(2),
    }));
  }

  return [{ description: '', quantity: '1', unitPrice: '' }];
}

function buildLineItemsFromQuote(quote: InvoiceFormQuoteOption): InvoiceLineDraft[] {
  const includedItems = quote.line_items.filter((item) => !item.is_optional || item.is_selected);

  if (!includedItems.length) {
    return [{ description: '', quantity: '1', unitPrice: '' }];
  }

  return includedItems.map((item) => ({
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: (item.unit_price_cents / 100).toFixed(2),
  }));
}

function buildMoneyInput(amountCents: number) {
  return (Math.max(amountCents, 0) / 100).toFixed(2);
}

function buildSingleAmountLine(description: string, amountCents: number): InvoiceLineDraft[] {
  return [{ description, quantity: '1', unitPrice: buildMoneyInput(amountCents) }];
}

function buildQuoteScopeLabel(quote: InvoiceFormQuoteOption) {
  return quote.title?.trim() ? `${quote.quote_number} - ${quote.title.trim()}` : quote.quote_number;
}

function buildInvoicePreset(
  quote: InvoiceFormQuoteOption,
  invoiceType: InvoiceFormDefaultValues['invoice_type'],
  existingLinkedQuoteSubtotal = 0
): InvoiceLineDraft[] {
  const quoteLabel = buildQuoteScopeLabel(quote);
  const depositSubtotalCents =
    quote.deposit_percent > 0
      ? Math.round((quote.subtotal_cents * quote.deposit_percent) / 100)
      : 0;
  const billedBeforeThisInvoice = Math.max(
    quote.billed_subtotal_cents - existingLinkedQuoteSubtotal,
    0
  );
  const remainingSubtotalCents = Math.max(quote.subtotal_cents - billedBeforeThisInvoice, 0);
  const progressSuggestedSubtotalCents = Math.max(
    quote.subtotal_cents -
      Math.max(billedBeforeThisInvoice, depositSubtotalCents > 0 ? depositSubtotalCents : 0),
    0
  );

  if (invoiceType === 'full') return buildLineItemsFromQuote(quote);
  if (invoiceType === 'deposit') {
    return depositSubtotalCents > 0
      ? buildSingleAmountLine(`Deposit (${quote.deposit_percent}%) for ${quoteLabel}`, depositSubtotalCents)
      : buildLineItemsFromQuote(quote);
  }
  if (invoiceType === 'progress') {
    return buildSingleAmountLine(`Progress claim for ${quoteLabel}`, progressSuggestedSubtotalCents);
  }
  return buildSingleAmountLine(`Final balance for ${quoteLabel}`, remainingSubtotalCents);
}

export function InvoiceForm({
  customers,
  quotes,
  businessDefaults,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  invoiceNumberPreview = 'Assigned on save',
  defaultValues,
  submitLabel = 'Save Invoice',
  mode = 'create',
}: {
  customers: InvoiceFormCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
  businessDefaults?: InvoiceBusinessDefaults;
  onSubmit?: (data: InvoiceFormSubmitPayload) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  invoiceNumberPreview?: string;
  defaultValues?: InvoiceFormDefaultValues;
  submitLabel?: string;
  mode?: 'create' | 'edit';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => createInitialInvoiceForm(defaultValues, businessDefaults));
  const [lineItems, setLineItems] = useState<InvoiceLineDraft[]>(() =>
    createInitialLineItems(defaultValues)
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);

  const filteredQuotes = useMemo(() => {
    if (!form.customer_id) return quotes;
    return quotes.filter((quote) => quote.customer_id === form.customer_id);
  }, [form.customer_id, quotes]);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customer_id) ?? null;
  const selectedQuote = quotes.find((quote) => quote.id === form.quote_id) ?? null;
  const selectedQuoteIncludedItems = useMemo(
    () => selectedQuote?.line_items.filter((item) => !item.is_optional || item.is_selected) ?? [],
    [selectedQuote]
  );

  const existingLinkedQuoteSubtotal = useMemo(() => {
    if (
      mode !== 'edit' ||
      !defaultValues?.quote_id ||
      defaultValues.quote_id !== selectedQuote?.id
    ) {
      return 0;
    }

    return defaultValues.line_items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unit_price_cents),
      0
    );
  }, [defaultValues, mode, selectedQuote]);

  const summary = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
      return sum + Math.round(quantity * unitPrice * 100);
    }, 0);

    const gst = Math.round(subtotal * 0.1);

    return { subtotal, gst, total: subtotal + gst };
  }, [lineItems]);

  const quoteContext = useMemo(() => {
    if (!selectedQuote) return null;

    const billedBeforeThisInvoice = Math.max(
      selectedQuote.billed_subtotal_cents - existingLinkedQuoteSubtotal,
      0
    );
    const billedAfterThisInvoice = billedBeforeThisInvoice + summary.subtotal;
    const remainingSubtotal = Math.max(selectedQuote.subtotal_cents - billedAfterThisInvoice, 0);
    const overBilled = billedAfterThisInvoice > selectedQuote.subtotal_cents;

    return {
      billedBeforeThisInvoice,
      remainingSubtotal,
      overBilled,
    };
  }, [existingLinkedQuoteSubtotal, selectedQuote, summary.subtotal]);

  // For edit mode: only allow manual-settable statuses
  const editStatusOptions = useMemo(() => {
    if (form.status === 'sent' || form.status === 'overdue') {
      return [
        { value: form.status as 'sent' | 'overdue', label: form.status === 'sent' ? 'Sent' : 'Overdue' },
        ...EDIT_STATUS_OPTIONS,
      ];
    }
    return EDIT_STATUS_OPTIONS;
  }, [form.status]);

  const canSubmit =
    Boolean(onSubmit) &&
    Boolean(form.customer_id) &&
    Boolean(form.due_date) &&
    summary.total > 0 &&
    lineItems.some(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0
    );

  function applyQuotePreset(
    quote: InvoiceFormQuoteOption,
    invoiceType: InvoiceFormDefaultValues['invoice_type']
  ) {
    setLineItems(buildInvoicePreset(quote, invoiceType, existingLinkedQuoteSubtotal));
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'quote_id' && value) {
        const matchedQuote = quotes.find((quote) => quote.id === value);
        if (matchedQuote) next.customer_id = matchedQuote.customer_id;
      }

      if (name === 'customer_id' && prev.quote_id) {
        const matchedQuote = quotes.find((quote) => quote.id === prev.quote_id);
        if (matchedQuote && matchedQuote.customer_id !== value) next.quote_id = '';
      }

      return next;
    });

    if (name === 'quote_id' && value) {
      const matchedQuote = quotes.find((quote) => quote.id === value);
      if (matchedQuote) applyQuotePreset(matchedQuote, form.invoice_type);
    }

    if (name === 'invoice_type' && selectedQuote) {
      applyQuotePreset(selectedQuote, value as InvoiceFormDefaultValues['invoice_type']);
    }

    setError(null);
  }

  function handleLineItemChange(index: number, field: keyof InvoiceLineDraft, value: string) {
    setLineItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
    setError(null);
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!onSubmit) {
      setError('Invoice save action is not connected yet.');
      return;
    }

    const preparedLineItems = lineItems
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price_cents: Math.round(Number(item.unitPrice) * 100),
      }));

    startTransition(async () => {
      const result = await onSubmit({
        customer_id: form.customer_id,
        quote_id: form.quote_id || null,
        invoice_type: form.invoice_type,
        // Create mode always saves as draft; edit mode respects current form status
        status: mode === 'create' ? 'draft' : form.status,
        business_abn: form.business_abn.trim() || null,
        payment_terms: form.payment_terms.trim() || null,
        bank_details: form.bank_details.trim() || null,
        due_date: form.due_date,
        notes: form.notes.trim() || null,
        line_items: preparedLineItems,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_300px]">
        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Header: invoice number + live total */}
          <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pm-secondary">
                  Invoice
                </p>
                <p className="mt-1 text-[28px] font-semibold leading-none text-pm-body">
                  {invoiceNumberPreview}
                </p>
              </div>
              <div className="rounded-2xl bg-pm-teal-light px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pm-teal-mid">
                  Total
                </p>
                <p className="mt-1 text-2xl font-semibold text-pm-teal">
                  {formatAUD(summary.total)}
                </p>
              </div>
            </div>
          </section>

          {/* Setup: customer + quote + type + due date */}
          <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-pm-body">Invoice Setup</h3>

            <div className="space-y-4">
              {/* Customer */}
              <div>
                <label htmlFor="customer_id" className={LABEL_CLASS}>
                  Customer
                </label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleFormChange}
                  className={FIELD_CLASS}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name || customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Quote */}
              <div>
                <label htmlFor="quote_id" className={LABEL_CLASS}>
                  Linked Quote{' '}
                  <span className="text-xs font-normal text-pm-secondary">(optional)</span>
                </label>
                <select
                  id="quote_id"
                  name="quote_id"
                  value={form.quote_id}
                  onChange={handleFormChange}
                  className={FIELD_CLASS}
                >
                  <option value="">No linked quote</option>
                  {filteredQuotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quote_number}
                      {quote.title ? ` — ${quote.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Invoice type */}
                <div>
                  <label htmlFor="invoice_type" className={LABEL_CLASS}>
                    Type
                  </label>
                  <select
                    id="invoice_type"
                    name="invoice_type"
                    value={form.invoice_type}
                    onChange={handleFormChange}
                    className={FIELD_CLASS}
                  >
                    <option value="full">Full</option>
                    <option value="deposit">Deposit</option>
                    <option value="progress">Progress</option>
                    <option value="final">Final</option>
                  </select>
                  <p className="mt-1.5 text-xs text-pm-secondary">
                    {INVOICE_TYPE_COPY[form.invoice_type].hint}
                  </p>
                </div>

                {/* Due date */}
                <div>
                  <label htmlFor="due_date" className={LABEL_CLASS}>
                    Due Date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={handleFormChange}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {/* Status — edit mode only */}
              {mode === 'edit' && (
                <div>
                  <label htmlFor="status" className={LABEL_CLASS}>
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className={FIELD_CLASS}
                  >
                    {editStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {(form.status === 'sent' || form.status === 'overdue') && (
                    <p className="mt-1.5 text-xs text-pm-secondary">
                      Sent and overdue are set automatically. You can mark as paid or cancelled here.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quote billing context */}
            {selectedQuote && quoteContext && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-4 ${
                  quoteContext.overBilled ? 'border-amber-200 bg-amber-50' : 'border-pm-border bg-pm-surface/60'
                }`}
              >
                <p className="mb-3 text-sm font-semibold text-pm-body">
                  {selectedQuote.quote_number}
                  {selectedQuote.title ? ` — ${selectedQuote.title}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-pm-secondary">Quote total</p>
                    <p className="mt-0.5 text-sm font-semibold text-pm-body">
                      {formatAUD(selectedQuote.total_cents)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-pm-secondary">Already billed</p>
                    <p className="mt-0.5 text-sm font-semibold text-pm-body">
                      {formatAUD(quoteContext.billedBeforeThisInvoice)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-pm-secondary">Remaining</p>
                    <p className={`mt-0.5 text-sm font-semibold ${quoteContext.overBilled ? 'text-amber-700' : 'text-pm-teal'}`}>
                      {formatAUD(quoteContext.remainingSubtotal)}
                    </p>
                  </div>
                </div>
                {quoteContext.overBilled && (
                  <p className="mt-3 text-xs text-amber-700">
                    This invoice would exceed the quoted subtotal. Check staged billing.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-pm-body">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex min-h-11 items-center rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => {
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);
                const lineTotal =
                  Number.isFinite(quantity) && Number.isFinite(unitPrice)
                    ? Math.round(quantity * unitPrice * 100)
                    : 0;

                return (
                  <div
                    key={`${index}-${item.description.slice(0, 10)}`}
                    className="rounded-2xl border border-pm-border bg-pm-surface/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-pm-body">Item {index + 1}</p>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-pm-secondary transition-colors hover:bg-white hover:text-pm-body"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={LABEL_CLASS} htmlFor={`line-description-${index}`}>
                          Description
                        </label>
                        <textarea
                          id={`line-description-${index}`}
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          placeholder="e.g. Prep, prime and paint — 2 coats"
                          className={TEXTAREA_CLASS}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={LABEL_CLASS} htmlFor={`line-qty-${index}`}>
                            Qty
                          </label>
                          <input
                            id={`line-qty-${index}`}
                            type="number"
                            min="0"
                            step="0.1"
                            inputMode="decimal"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS} htmlFor={`line-price-${index}`}>
                            Unit Price (A$)
                          </label>
                          <input
                            id={`line-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm">
                      <span className="text-pm-secondary">Line total (excl. GST)</span>
                      <span className="font-semibold text-pm-body">{formatAUD(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-pm-body">Notes</h3>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleFormChange}
              placeholder="Payment note or job summary for the client"
              className={TEXTAREA_CLASS}
            />
          </section>

          {/* Business & Payment Details — collapsed by default */}
          <section className="rounded-3xl border border-pm-border bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowBusinessDetails((v) => !v)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <h3 className="text-base font-semibold text-pm-body">Business & Payment Details</h3>
              <span className="text-pm-secondary">{showBusinessDetails ? '▲' : '▼'}</span>
            </button>

            {showBusinessDetails && (
              <div className="space-y-4 border-t border-pm-border px-5 pb-5 pt-4">
                <div>
                  <label htmlFor="business_abn" className={LABEL_CLASS}>
                    ABN
                  </label>
                  <input
                    id="business_abn"
                    name="business_abn"
                    type="text"
                    value={form.business_abn}
                    onChange={handleFormChange}
                    placeholder="12 345 678 901"
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="payment_terms" className={LABEL_CLASS}>
                    Payment Terms
                  </label>
                  <textarea
                    id="payment_terms"
                    name="payment_terms"
                    rows={3}
                    value={form.payment_terms}
                    onChange={handleFormChange}
                    placeholder="Payment due within 7 days from invoice date."
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="bank_details" className={LABEL_CLASS}>
                    Bank Details
                  </label>
                  <textarea
                    id="bank_details"
                    name="bank_details"
                    rows={3}
                    value={form.bank_details}
                    onChange={handleFormChange}
                    placeholder={'Account Name: Your Business\nBSB: 123-456\nAccount: 12345678'}
                    className={TEXTAREA_CLASS}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          {/* Totals */}
          <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-pm-secondary">
              Totals
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-pm-secondary">Subtotal</dt>
                <dd className="font-medium text-pm-body">{formatAUD(summary.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-pm-secondary">GST (10%)</dt>
                <dd className="font-medium text-pm-body">{formatAUD(summary.gst)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-pm-border pt-3">
                <dt className="font-semibold text-pm-body">Total</dt>
                <dd className="text-lg font-semibold text-pm-teal">{formatAUD(summary.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Quote items snapshot */}
          {selectedQuote && selectedQuoteIncludedItems.length > 0 && (
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-pm-secondary">
                Quote Items
              </h3>
              <div className="space-y-2">
                {selectedQuoteIncludedItems.map((item, index) => (
                  <div
                    key={`${item.description}-${index}`}
                    className="rounded-xl bg-pm-surface px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap text-sm font-medium text-pm-body">
                        {item.description}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-pm-body">
                        {formatAUD(item.total_cents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-pm-secondary">
                      Qty {item.quantity} × {formatAUD(item.unit_price_cents)}
                    </p>
                  </div>
                ))}
              </div>
              {selectedQuote.valid_until && (
                <p className="mt-3 text-xs text-pm-secondary">
                  Valid until {formatDate(selectedQuote.valid_until)}
                </p>
              )}
            </section>
          )}

          {/* Customer snapshot */}
          {selectedCustomer && (
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-pm-secondary">
                Customer
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-pm-body">
                  {selectedCustomer.company_name || selectedCustomer.name}
                </p>
                {selectedCustomer.email && (
                  <p className="text-pm-secondary">{selectedCustomer.email}</p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-pm-secondary">{selectedCustomer.phone}</p>
                )}
                {selectedCustomer.address && (
                  <p className="whitespace-pre-wrap text-pm-secondary">{selectedCustomer.address}</p>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {error && (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 z-10 border-t border-pm-border bg-white px-4 pt-4 pb-4 md:bottom-0 md:left-64 md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (onCancel) { onCancel(); return; }
              router.back();
            }}
            disabled={isPending}
            className="h-14 flex-1 rounded-2xl border border-pm-border bg-white text-base font-medium text-pm-body transition-colors hover:bg-pm-surface disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="h-14 flex-[1.6] rounded-2xl bg-pm-teal text-base font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:opacity-50"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
        </div>
        {!customers.length && (
          <div className="mx-auto mt-3 max-w-6xl rounded-lg border border-dashed border-pm-border bg-pm-surface px-4 py-3 text-sm text-pm-secondary">
            Add a customer first in{' '}
            <Link href="/customers/new" className="font-medium text-pm-teal-hover hover:underline">
              Customers
            </Link>
            .
          </div>
        )}
      </div>
    </form>
  );
}
