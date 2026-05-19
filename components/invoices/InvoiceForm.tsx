'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InvoicePaymentMethod } from '@/types/invoice';
import { getGSTFromExAmount } from '@/utils/gst';
import { formatAUD, formatDate } from '@/utils/format';
import { buildQuoteInvoicePresetLines } from '@/lib/invoice-quote-presets';
import {
  FormField,
  formControlClassName,
  formLabelClassName,
  formTextareaClassName,
} from '@/components/forms/FormField';
import { FormFooter, FormFooterButton } from '@/components/forms/FormFooter';
import { FormSection } from '@/components/forms/FormSection';

const INVOICE_TYPE_COPY: Record<
  InvoiceFormDefaultValues['invoice_type'],
  { label: string; hint: string }
> = {
  full: { label: 'Full invoice', hint: 'Covers the full quoted scope in one payment.' },
  deposit: { label: 'Deposit invoice', hint: 'Upfront amount to secure the job.' },
  progress: { label: 'Progress invoice', hint: 'Staged claim while work is underway.' },
  final: { label: 'Final invoice', hint: 'Closing balance after the work is complete.' },
};

const MANUAL_STATUS_OPTIONS: Array<{
  value: 'draft' | 'paid' | 'cancelled';
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHOD_OPTIONS: Array<{
  value: InvoicePaymentMethod;
  label: string;
}> = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

type InvoiceLineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
};

function buildDefaultDueDate() {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 14);

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildTodayDate() {
  const baseDate = new Date();
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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
  gst_cents: number;
  total_cents: number;
  discount_cents: number;
  manual_adjustment_cents: number;
  deposit_percent: number;
  status: string;
  valid_until: string | null;
  billed_subtotal_cents: number;
  billed_total_cents: number;
  linked_invoice_count: number;
  has_linked_invoices: boolean;
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
  paid_date: string | null;
  payment_method: InvoicePaymentMethod | null;
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
  paid_date: string | null;
  payment_method: InvoicePaymentMethod | null;
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
  const dueDate =
    defaultValues == null
      ? buildDefaultDueDate()
      : (defaultValues.due_date ?? '');

  return {
    customer_id: defaultValues?.customer_id ?? '',
    quote_id: defaultValues?.quote_id ?? '',
    invoice_type: defaultValues?.invoice_type ?? ('full' as const),
    status: defaultValues?.status ?? ('draft' as const),
    business_abn: defaultValues?.business_abn ?? businessDefaults?.business_abn ?? '',
    payment_terms: defaultValues?.payment_terms ?? businessDefaults?.payment_terms ?? '',
    bank_details: defaultValues?.bank_details ?? businessDefaults?.bank_details ?? '',
    due_date: dueDate,
    paid_date: defaultValues?.paid_date ?? '',
    payment_method: defaultValues?.payment_method ?? '',
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

function buildMoneyInput(amountCents: number) {
  return (Math.max(amountCents, 0) / 100).toFixed(2);
}

function buildInvoicePreset(
  quote: InvoiceFormQuoteOption,
  invoiceType: InvoiceFormDefaultValues['invoice_type'],
  existingLinkedQuoteSubtotal = 0,
  progressPercent = 100
): { error: string | null; lineItems: InvoiceLineDraft[] } {
  const result = buildQuoteInvoicePresetLines(quote, {
    invoice_type: invoiceType,
    existing_linked_quote_subtotal_cents: existingLinkedQuoteSubtotal,
    progress_percent: progressPercent,
  });

  return {
    error: result.error,
    lineItems:
      result.line_items.length > 0
        ? result.line_items.map((item) => ({
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: buildMoneyInput(item.unit_price_cents),
          }))
        : [{ description: '', quantity: '1', unitPrice: '' }],
  };
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
  const [progressPercent, setProgressPercent] = useState('100');
  const [lineItems, setLineItems] = useState<InvoiceLineDraft[]>(() =>
    createInitialLineItems(defaultValues)
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(
    () => Boolean(businessDefaults?.business_abn || businessDefaults?.payment_terms || businessDefaults?.bank_details)
  );

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

  const existingLinkedQuoteTotal = useMemo(() => {
    if (
      mode !== 'edit' ||
      !defaultValues?.quote_id ||
      defaultValues.quote_id !== selectedQuote?.id
    ) {
      return 0;
    }

    return defaultValues.line_items.reduce((sum, item) => {
      const lineSubtotal = Math.round(item.quantity * item.unit_price_cents);
      const lineGst = Math.round(lineSubtotal * 0.1);

      return sum + lineSubtotal + lineGst;
    }, 0);
  }, [defaultValues, mode, selectedQuote]);

  const summary = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
      return sum + Math.round(quantity * unitPrice * 100);
    }, 0);

    const gst = getGSTFromExAmount(subtotal);

    return { subtotal, gst, total: subtotal + gst };
  }, [lineItems]);

  const quoteContext = useMemo(() => {
    if (!selectedQuote) return null;

    const billedBeforeThisInvoiceSubtotal = Math.max(
      selectedQuote.billed_subtotal_cents - existingLinkedQuoteSubtotal,
      0
    );
    const billedBeforeThisInvoiceTotal = Math.max(
      selectedQuote.billed_total_cents - existingLinkedQuoteTotal,
      0
    );
    const billedAfterThisInvoiceSubtotal = billedBeforeThisInvoiceSubtotal + summary.subtotal;
    const billedAfterThisInvoiceTotal = billedBeforeThisInvoiceTotal + summary.total;
    const remainingSubtotal = Math.max(
      selectedQuote.subtotal_cents - billedAfterThisInvoiceSubtotal,
      0
    );
    const remainingTotal = Math.max(selectedQuote.total_cents - billedAfterThisInvoiceTotal, 0);
    const overBilled = billedAfterThisInvoiceTotal > selectedQuote.total_cents;

    return {
      billedBeforeThisInvoiceSubtotal,
      billedBeforeThisInvoiceTotal,
      remainingSubtotal,
      remainingTotal,
      overBilled,
    };
  }, [existingLinkedQuoteSubtotal, existingLinkedQuoteTotal, selectedQuote, summary.subtotal, summary.total]);

  const statusOptions = useMemo(() => {
    if (form.status === 'sent' || form.status === 'overdue') {
      return [
        { value: form.status as 'sent' | 'overdue', label: form.status === 'sent' ? 'Sent' : 'Overdue' },
        ...MANUAL_STATUS_OPTIONS,
      ];
    }
    return MANUAL_STATUS_OPTIONS;
  }, [form.status]);

  const canSubmit =
    Boolean(onSubmit) &&
    Boolean(form.customer_id) &&
    (form.status !== 'paid' || (Boolean(form.paid_date) && Boolean(form.payment_method))) &&
    summary.total > 0 &&
    lineItems.some(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0
    );

  function applyQuotePreset(
    quote: InvoiceFormQuoteOption,
    invoiceType: InvoiceFormDefaultValues['invoice_type'],
    progressPercentValue = 100
  ) {
    const preset = buildInvoicePreset(
      quote,
      invoiceType,
      existingLinkedQuoteSubtotal,
      progressPercentValue
    );
    setLineItems(preset.lineItems);
    setError(preset.error);
    return preset.error;
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

      if (name === 'status') {
        if (value !== 'paid') {
          next.paid_date = '';
          next.payment_method = '';
        } else if (!prev.paid_date) {
          next.paid_date = buildTodayDate();
        }
      }

      return next;
    });

    if (name === 'quote_id' && value) {
      const matchedQuote = quotes.find((quote) => quote.id === value);
      if (matchedQuote) {
        const presetError = applyQuotePreset(
          matchedQuote,
          form.invoice_type,
          Number(progressPercent)
        );
        if (presetError) return;
      }
    }

    if (name === 'invoice_type' && selectedQuote) {
      const presetError = applyQuotePreset(
        selectedQuote,
        value as InvoiceFormDefaultValues['invoice_type'],
        Number(progressPercent)
      );
      if (presetError) return;
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
        status: form.status,
        business_abn: form.business_abn.trim() || null,
        payment_terms: form.payment_terms.trim() || null,
        bank_details: form.bank_details.trim() || null,
        due_date: form.due_date || null,
        paid_date: form.status === 'paid' ? form.paid_date || null : null,
        payment_method:
          form.status === 'paid'
            ? ((form.payment_method || null) as InvoicePaymentMethod | null)
            : null,
        notes: form.notes.trim() || null,
        line_items: preparedLineItems,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleProgressPercentChange(value: string) {
    setProgressPercent(value);
    if (!selectedQuote || form.invoice_type !== 'progress') return;
    applyQuotePreset(selectedQuote, 'progress', Number(value));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_300px]">
        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Header: invoice number + live total */}
          <FormSection>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Invoice
                </p>
                <p className="mt-1 text-[28px] font-semibold leading-none text-on-surface">
                  {invoiceNumberPreview}
                </p>
              </div>
              <div className="rounded-2xl bg-success-container px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-container">
                  Total
                </p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {formatAUD(summary.total)}
                </p>
              </div>
            </div>
          </FormSection>

          {/* Setup: customer + quote + type + due date */}
          <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-on-surface">Invoice Setup</h3>

            <div className="space-y-4">
              {/* Customer */}
              <div>
                <label htmlFor="customer_id" className={formLabelClassName}>
                  Customer
                </label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleFormChange}
                  className={formControlClassName}
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
                <label htmlFor="quote_id" className={formLabelClassName}>
                  Linked Quote{' '}
                  <span className="text-xs font-normal text-on-surface-variant">(optional)</span>
                </label>
                <select
                  id="quote_id"
                  name="quote_id"
                  value={form.quote_id}
                  onChange={handleFormChange}
                  className={formControlClassName}
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
                  <label htmlFor="invoice_type" className={formLabelClassName}>
                    Type
                  </label>
                  <select
                    id="invoice_type"
                    name="invoice_type"
                    value={form.invoice_type}
                    onChange={handleFormChange}
                    className={formControlClassName}
                  >
                    <option value="full">Full</option>
                    <option value="deposit">Deposit</option>
                    <option value="progress">Progress</option>
                    <option value="final">Final</option>
                  </select>
                  <p className="mt-1.5 text-xs text-on-surface-variant">
                    {form.invoice_type === 'deposit' && selectedQuote && selectedQuote.deposit_percent > 0
                      ? `Deposit invoice uses the ${selectedQuote.deposit_percent}% deposit saved on the linked quote.`
                      : INVOICE_TYPE_COPY[form.invoice_type].hint}
                  </p>
                  {form.invoice_type === 'progress' && selectedQuote && (
                    <div className="mt-3 space-y-2 rounded-xl border border-outline-variant bg-surface-container-low/50 p-3">
                      <label htmlFor="progress_percent" className="block text-xs font-medium text-on-surface-variant">
                        Progress Percent (%)
                      </label>
                      <input
                        id="progress_percent"
                        type="number"
                        min="1"
                        max="100"
                        inputMode="numeric"
                        value={progressPercent}
                        onChange={(event) => handleProgressPercentChange(event.target.value)}
                        className={formControlClassName}
                      />
                      <div className="flex flex-wrap gap-2">
                        {[25, 50, 75, 100].map((percent) => (
                          <button
                            key={percent}
                            type="button"
                            onClick={() => handleProgressPercentChange(String(percent))}
                            className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-3 text-xs font-medium text-on-surface transition-colors hover:bg-white"
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Applies to the remaining staged subtotal for this linked quote.
                      </p>
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <label htmlFor="due_date" className={formLabelClassName}>
                    Due Date <span className="text-xs font-normal text-on-surface-variant">(optional)</span>
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={handleFormChange}
                    className={formControlClassName}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, due_date: buildDefaultDueDate() }));
                        setError(null);
                      }}
                      className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-3 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                      Set +14 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, due_date: '' }));
                        setError(null);
                      }}
                      className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-on-surface-variant">
                    Leave this blank if the invoice does not need a payment deadline yet.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="status" className={formLabelClassName}>
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className={formControlClassName}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {(form.status === 'sent' || form.status === 'overdue') && (
                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      Sent and overdue are set automatically. You can mark this invoice as paid or cancelled here.
                    </p>
                  )}
                  {form.status === 'paid' && (
                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      Marking as paid will store the paid date and set the invoice balance to zero.
                    </p>
                  )}
                </div>

                {(form.status === 'paid' || form.paid_date || form.payment_method) && (
                  <div>
                    <label htmlFor="paid_date" className={formLabelClassName}>
                      Paid Date
                    </label>
                    <input
                      id="paid_date"
                      name="paid_date"
                      type="date"
                      value={form.paid_date}
                      onChange={handleFormChange}
                      className={formControlClassName}
                      required={form.status === 'paid'}
                    />
                  </div>
                )}
              </div>

              {(form.status === 'paid' || form.payment_method || form.paid_date) && (
                <div>
                  <label htmlFor="payment_method" className={formLabelClassName}>
                    Payment Method
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleFormChange}
                    className={formControlClassName}
                  >
                    <option value="">Select a payment method</option>
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-on-surface-variant">
                    {form.status === 'paid'
                      ? 'Required when status is paid.'
                      : 'Optional, but useful for reconciling paid invoices later.'}
                  </p>
                </div>
              )}
            </div>

            {/* Quote billing context */}
            {selectedQuote && quoteContext && (
              <div
                className={`mt-5 rounded-xl border px-4 py-4 ${
                  quoteContext.overBilled ? 'border-amber-200 bg-amber-50' : 'border-outline-variant bg-surface-container-low/60'
                }`}
              >
                <p className="mb-3 text-sm font-semibold text-on-surface">
                  {selectedQuote.quote_number}
                  {selectedQuote.title ? ` — ${selectedQuote.title}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-on-surface-variant">Quote total</p>
                    <p className="mt-0.5 text-sm font-semibold text-on-surface">
                      {formatAUD(selectedQuote.total_cents)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-on-surface-variant">Already invoiced</p>
                    <p className="mt-0.5 text-sm font-semibold text-on-surface">
                      {formatAUD(quoteContext.billedBeforeThisInvoiceTotal)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs text-on-surface-variant">Remaining</p>
                    <p className={`mt-0.5 text-sm font-semibold ${quoteContext.overBilled ? 'text-amber-700' : 'text-primary'}`}>
                      {formatAUD(quoteContext.remainingTotal)}
                    </p>
                  </div>
                </div>
                  {quoteContext.overBilled && (
                  <p className="mt-3 text-xs text-amber-700">
                    This invoice would exceed the quoted total. Check staged billing.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-on-surface">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex min-h-11 items-center rounded-xl border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
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
                const lineGst = Math.round(lineTotal * 0.1);
                const lineGrandTotal = lineTotal + lineGst;

                return (
                  <div
                    key={`${index}-${item.description.slice(0, 10)}`}
                    className="rounded-xl border border-outline-variant bg-surface-container-low/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-on-surface">Item {index + 1}</p>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={formLabelClassName} htmlFor={`line-description-${index}`}>
                          Description
                        </label>
                        <textarea
                          id={`line-description-${index}`}
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          placeholder="e.g. Prep, prime and paint — 2 coats"
                          className={formTextareaClassName}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={formLabelClassName} htmlFor={`line-qty-${index}`}>
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
                            className={formControlClassName}
                          />
                        </div>
                        <div>
                          <label className={formLabelClassName} htmlFor={`line-price-${index}`}>
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
                            className={formControlClassName}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">Line total</span>
                        <span className="font-semibold text-on-surface">{formatAUD(lineTotal)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">GST (10%)</span>
                        <span className="font-medium text-on-surface">{formatAUD(lineGst)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-outline-variant pt-2">
                        <span className="font-medium text-on-surface">Item total</span>
                        <span className="font-semibold text-primary">
                          {formatAUD(lineGrandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes & Terms */}
          <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-on-surface">Notes & Terms</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className={formLabelClassName}>
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Add a payment note or job summary"
                  className={formTextareaClassName}
                />
              </div>

              <FormField
                as="textarea"
                htmlFor="payment_terms"
                label="Payment Terms"
                name="payment_terms"
                rows={3}
                value={form.payment_terms}
                onChange={handleFormChange}
                placeholder="Payment due within 14 days from invoice date."
              />
            </div>
          </section>

          {/* Business & Payment Details — collapsed by default */}
          <section className="rounded-2xl border border-outline-variant bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowBusinessDetails((v) => !v)}
              className="flex w-full items-center justify-between p-4 text-left sm:p-6"
            >
              <h3 className="text-base font-semibold text-on-surface">Business & Payment Details</h3>
              <span className="text-on-surface-variant">{showBusinessDetails ? '▲' : '▼'}</span>
            </button>

            {showBusinessDetails && (
              <div className="space-y-4 border-t border-outline-variant px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
                <div>
                  <label htmlFor="business_abn" className={formLabelClassName}>
                    ABN
                  </label>
                  <input
                    id="business_abn"
                    name="business_abn"
                    type="text"
                    value={form.business_abn}
                    onChange={handleFormChange}
                    placeholder="12 345 678 901"
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label htmlFor="bank_details" className={formLabelClassName}>
                    Bank Details
                  </label>
                  <textarea
                    id="bank_details"
                    name="bank_details"
                    rows={3}
                    value={form.bank_details}
                    onChange={handleFormChange}
                    placeholder={'Account Name: Your Business\nBSB: 123-456\nAccount: 12345678'}
                    className={formTextareaClassName}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          {/* Totals */}
          <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
              Totals
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="font-medium text-on-surface">{formatAUD(summary.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-on-surface-variant">GST (10%)</dt>
                <dd className="font-medium text-on-surface">{formatAUD(summary.gst)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-outline-variant pt-3">
                <dt className="font-semibold text-on-surface">Total</dt>
                <dd className="text-lg font-semibold text-primary">{formatAUD(summary.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Quote items snapshot */}
          {selectedQuote && selectedQuoteIncludedItems.length > 0 && (
            <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Quote items
              </h3>
              <div className="space-y-2">
                {selectedQuoteIncludedItems.map((item, index) => (
                  <div
                    key={`${item.description}-${index}`}
                    className="rounded-xl bg-surface-container-low px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap text-sm font-medium text-on-surface">
                        {item.description}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-on-surface">
                        {formatAUD(item.total_cents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      Qty {item.quantity} × {formatAUD(item.unit_price_cents)}
                    </p>
                  </div>
                ))}
              </div>
              {selectedQuote.valid_until && (
                <p className="mt-3 text-xs text-on-surface-variant">
                  Valid until {formatDate(selectedQuote.valid_until)}
                </p>
              )}
            </section>
          )}

          {/* Customer snapshot */}
          {selectedCustomer && (
            <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Customer Snapshot
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-on-surface">
                  {selectedCustomer.company_name || selectedCustomer.name}
                </p>
                {selectedCustomer.email && (
                  <p className="text-on-surface-variant">{selectedCustomer.email}</p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-on-surface-variant">{selectedCustomer.phone}</p>
                )}
                {selectedCustomer.address && (
                  <p className="whitespace-pre-wrap text-on-surface-variant">{selectedCustomer.address}</p>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {error && (
        <div className="rounded-xl border border-error bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      {/* Fixed bottom CTA */}
      <FormFooter contentClassName="max-w-6xl flex-col">
        <div className="flex flex-col gap-3 sm:flex-row">
          <FormFooterButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) { onCancel(); return; }
              router.back();
            }}
            disabled={isPending}
            className="flex-1 font-medium"
          >
            {cancelLabel}
          </FormFooterButton>
          <FormFooterButton
            type="submit"
            disabled={isPending || !canSubmit}
            className="flex-[1.6]"
          >
            {isPending ? 'Saving...' : submitLabel}
          </FormFooterButton>
        </div>
        {!customers.length && (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            Add a customer first in{' '}
            <Link href="/customers/new" className="font-medium text-primary hover:underline">
              Customers
            </Link>
            .
          </div>
        )}
      </FormFooter>
    </form>
  );
}
