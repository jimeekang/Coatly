'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InvoicePaymentMethod } from '@/modules/invoices/domain/invoice';
import { cn } from '@/lib/utils';
import { getGSTFromExAmount } from '@/utils/gst';
import { formatAUD, formatDate } from '@/utils/format';
import { buildQuoteInvoicePresetLines } from '@/modules/invoices/domain/invoice-quote-presets';
import {
  FormField,
  formControlClassName,
  formLabelClassName,
  formTextareaClassName,
} from '@/components/forms/FormField';
import { FormFooter, FormFooterButton } from '@/components/forms/FormFooter';
import { FormSection } from '@/components/forms/FormSection';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { INVOICE_STATUS_TONE } from '@/lib/constants/status-colors';

/* ──────────────────────────────────────────────────────────
   Inline icon set — Lucide-style stroke paths. Keeps the new
   invoice form visually aligned with the Coatly design system
   without pulling a runtime icon dependency.
   ────────────────────────────────────────────────────────── */
const ICON_PATHS = {
  full: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h4',
  ],
  deposit: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M12 7v10',
    'M14.5 9.3a2.7 2.7 0 0 0-2.5-1.3c-1.6 0-2.5.9-2.5 2s.9 1.7 2.5 2 2.5.9 2.5 2-1 2-2.5 2a2.7 2.7 0 0 1-2.5-1.3',
  ],
  progress: ['M5 21V11', 'M12 21V4', 'M19 21v-7'],
  final: ['M5 21V4', 'M5 4h12l-2.5 4 2.5 4H5'],
  bank: [
    'M3 21h18',
    'M5 21V10',
    'M19 21V10',
    'M9 21v-6',
    'M15 21v-6',
    'M3 10 12 4l9 6',
  ],
  card: ['M3 6h18v12H3z', 'M3 10h18'],
  cash: ['M3 7h18v10H3z', 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  cheque: ['M4 5h16v14H4z', 'M8 9.5h8', 'M8 13.5h5'],
  other: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
} as const;

function Icon({
  name,
  className,
}: {
  name: keyof typeof ICON_PATHS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const INVOICE_TYPE_OPTIONS: Array<{
  value: InvoiceFormDefaultValues['invoice_type'];
  label: string;
  icon: keyof typeof ICON_PATHS;
  hint: string;
}> = [
  {
    value: 'full',
    label: 'Full',
    icon: 'full',
    hint: 'One invoice for the full quoted scope.',
  },
  {
    value: 'deposit',
    label: 'Deposit',
    icon: 'deposit',
    hint: 'Upfront amount to secure the job.',
  },
  {
    value: 'progress',
    label: 'Progress',
    icon: 'progress',
    hint: 'Staged claim while work is underway.',
  },
  {
    value: 'final',
    label: 'Final',
    icon: 'final',
    hint: 'Closing balance after completion.',
  },
];

const INVOICE_TYPE_HINT: Record<
  InvoiceFormDefaultValues['invoice_type'],
  string
> = {
  full: 'Covers the full quoted scope in one payment.',
  deposit: 'Upfront amount to secure the job.',
  progress: 'Staged claim while work is underway.',
  final: 'Closing balance after the work is complete.',
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
  icon: keyof typeof ICON_PATHS;
  hint: string;
}> = [
  {
    value: 'bank_transfer',
    label: 'Bank transfer',
    icon: 'bank',
    hint: 'BSB and account on the PDF',
  },
  { value: 'card', label: 'Card', icon: 'card', hint: 'Customer pays by card' },
  {
    value: 'cash',
    label: 'Cash',
    icon: 'cash',
    hint: 'Marked paid on receipt',
  },
  {
    value: 'cheque',
    label: 'Cheque',
    icon: 'cheque',
    hint: 'Made out to your business',
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'other',
    hint: 'Another payment arrangement',
  },
];

const INVOICE_STATUS_LABELS: Record<
  InvoiceFormDefaultValues['status'],
  string
> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const CARD_CLASS = 'border-outline-variant/60 p-5 sm:p-6';

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
    business_abn:
      defaultValues?.business_abn ?? businessDefaults?.business_abn ?? '',
    payment_terms:
      defaultValues?.payment_terms ?? businessDefaults?.payment_terms ?? '',
    bank_details:
      defaultValues?.bank_details ?? businessDefaults?.bank_details ?? '',
    due_date: dueDate,
    paid_date: defaultValues?.paid_date ?? '',
    payment_method: defaultValues?.payment_method ?? '',
    notes: defaultValues?.notes ?? '',
  };
}

function createInitialLineItems(
  defaultValues?: InvoiceFormDefaultValues
): InvoiceLineDraft[] {
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

function isNextNavigationSignal(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
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
  onSubmit?: (
    data: InvoiceFormSubmitPayload
  ) => Promise<{ error?: string } | void>;
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
  const [form, setForm] = useState(() =>
    createInitialInvoiceForm(defaultValues, businessDefaults)
  );
  const [progressPercent, setProgressPercent] = useState('100');
  const [lineItems, setLineItems] = useState<InvoiceLineDraft[]>(() =>
    createInitialLineItems(defaultValues)
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(() =>
    Boolean(
      businessDefaults?.business_abn ||
      businessDefaults?.payment_terms ||
      businessDefaults?.bank_details
    )
  );

  const filteredQuotes = useMemo(() => {
    if (!form.customer_id) return quotes;
    return quotes.filter((quote) => quote.customer_id === form.customer_id);
  }, [form.customer_id, quotes]);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customer_id) ?? null;
  const selectedQuote =
    quotes.find((quote) => quote.id === form.quote_id) ?? null;
  const selectedQuoteIncludedItems = useMemo(
    () =>
      selectedQuote?.line_items.filter(
        (item) => !item.is_optional || item.is_selected
      ) ?? [],
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
    const billedAfterThisInvoiceSubtotal =
      billedBeforeThisInvoiceSubtotal + summary.subtotal;
    const billedAfterThisInvoiceTotal =
      billedBeforeThisInvoiceTotal + summary.total;
    const remainingSubtotal = Math.max(
      selectedQuote.subtotal_cents - billedAfterThisInvoiceSubtotal,
      0
    );
    const remainingTotal = Math.max(
      selectedQuote.total_cents - billedAfterThisInvoiceTotal,
      0
    );
    const overBilled = billedAfterThisInvoiceTotal > selectedQuote.total_cents;

    return {
      billedBeforeThisInvoiceSubtotal,
      billedBeforeThisInvoiceTotal,
      remainingSubtotal,
      remainingTotal,
      overBilled,
    };
  }, [
    existingLinkedQuoteSubtotal,
    existingLinkedQuoteTotal,
    selectedQuote,
    summary.subtotal,
    summary.total,
  ]);

  const statusOptions = useMemo(() => {
    if (form.status === 'sent' || form.status === 'overdue') {
      return [
        {
          value: form.status as 'sent' | 'overdue',
          label: form.status === 'sent' ? 'Sent' : 'Overdue',
        },
        ...MANUAL_STATUS_OPTIONS,
      ];
    }
    return MANUAL_STATUS_OPTIONS;
  }, [form.status]);

  const lineCount = lineItems.filter((item) => item.description.trim()).length;

  const canSubmit =
    Boolean(onSubmit) &&
    Boolean(form.customer_id) &&
    (form.status !== 'paid' ||
      (Boolean(form.paid_date) && Boolean(form.payment_method))) &&
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
        if (matchedQuote && matchedQuote.customer_id !== value)
          next.quote_id = '';
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

    setError(null);
  }

  function selectInvoiceType(value: InvoiceFormDefaultValues['invoice_type']) {
    setForm((prev) => ({ ...prev, invoice_type: value }));

    if (selectedQuote) {
      const presetError = applyQuotePreset(
        selectedQuote,
        value,
        Number(progressPercent)
      );
      if (presetError) return;
    }

    setError(null);
  }

  function selectPaymentMethod(value: InvoicePaymentMethod) {
    setForm((prev) => ({
      ...prev,
      payment_method: prev.payment_method === value ? '' : value,
    }));
    setError(null);
  }

  function handleLineItemChange(
    index: number,
    field: keyof InvoiceLineDraft,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
    setError(null);
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: '', quantity: '1', unitPrice: '' },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!onSubmit) {
      setError('Invoice save action is not connected yet.');
      return;
    }

    setError(null);

    const preparedLineItems = lineItems
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price_cents: Math.round(Number(item.unitPrice) * 100),
      }));

    startTransition(async () => {
      try {
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
      } catch (submitError) {
        if (isNextNavigationSignal(submitError)) {
          throw submitError;
        }

        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Invoice could not be saved. Please try again.'
        );
      }
    });
  }

  function handleProgressPercentChange(value: string) {
    setProgressPercent(value);
    if (!selectedQuote || form.invoice_type !== 'progress') return;
    applyQuotePreset(selectedQuote, 'progress', Number(value));
  }

  const showPaymentDetails = Boolean(
    form.status === 'paid' || form.paid_date || form.payment_method
  );
  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-32 sm:space-y-6">
      {/* ── Invoice meta strip ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'text-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase',
            /\d/.test(invoiceNumberPreview) && 'font-mono tracking-[0.18em]'
          )}
        >
          {invoiceNumberPreview}
        </span>
        <StatusBadge
          tone={INVOICE_STATUS_TONE[form.status]}
          label={INVOICE_STATUS_LABELS[form.status]}
        />
      </div>

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.4fr)_300px]">
        {/* ── Left column ── */}
        <div className="space-y-5 sm:space-y-6">
          {/* Customer + linked quote */}
          <FormSection className={CARD_CLASS}>
            <h2 className="text-on-surface text-base font-bold">Customer</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              Who is this invoice for? Link an approved quote to pull in its
              line items.
            </p>

            <div className="mt-4 space-y-4">
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

              <div>
                <label htmlFor="quote_id" className={formLabelClassName}>
                  Linked quote{' '}
                  <span className="text-on-surface-variant text-xs font-normal">
                    (optional)
                  </span>
                </label>
                <select
                  id="quote_id"
                  name="quote_id"
                  value={form.quote_id}
                  onChange={handleFormChange}
                  className={formControlClassName}
                >
                  <option value="">No linked quote — blank invoice</option>
                  {filteredQuotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quote_number}
                      {quote.title ? ` — ${quote.title}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-on-surface-variant mt-1.5 text-xs">
                  Start blank or pull lines and totals from an approved quote.
                </p>
              </div>
            </div>

            {/* Quote billing context */}
            {selectedQuote && quoteContext && (
              <div
                className={cn(
                  'mt-5 rounded-xl border px-4 py-4',
                  quoteContext.overBilled
                    ? 'border-warning/30 bg-warning-container'
                    : 'border-outline-variant/60 bg-surface-container-low'
                )}
              >
                <p className="text-on-surface mb-3 text-sm font-semibold">
                  {selectedQuote.quote_number}
                  {selectedQuote.title ? ` — ${selectedQuote.title}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-lowest rounded-xl px-3 py-2">
                    <p className="text-on-surface-variant text-xs">
                      Quote total
                    </p>
                    <p className="text-on-surface mt-0.5 text-sm font-semibold tabular-nums">
                      {formatAUD(selectedQuote.total_cents)}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest rounded-xl px-3 py-2">
                    <p className="text-on-surface-variant text-xs">
                      Already invoiced
                    </p>
                    <p className="text-on-surface mt-0.5 text-sm font-semibold tabular-nums">
                      {formatAUD(quoteContext.billedBeforeThisInvoiceTotal)}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest rounded-xl px-3 py-2">
                    <p className="text-on-surface-variant text-xs">Remaining</p>
                    <p
                      className={cn(
                        'mt-0.5 text-sm font-semibold tabular-nums',
                        quoteContext.overBilled
                          ? 'text-warning'
                          : 'text-primary'
                      )}
                    >
                      {formatAUD(quoteContext.remainingTotal)}
                    </p>
                  </div>
                </div>
                {quoteContext.overBilled && (
                  <p className="text-warning mt-3 text-xs">
                    This invoice would exceed the quoted total. Check staged
                    billing.
                  </p>
                )}
              </div>
            )}
          </FormSection>

          {/* Invoice type */}
          <FormSection className={CARD_CLASS}>
            <h2 className="text-on-surface text-base font-bold">
              Invoice type
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              {form.invoice_type === 'deposit' &&
              selectedQuote &&
              selectedQuote.deposit_percent > 0
                ? `Deposit invoice uses the ${selectedQuote.deposit_percent}% deposit saved on the linked quote.`
                : INVOICE_TYPE_HINT[form.invoice_type]}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {INVOICE_TYPE_OPTIONS.map((option) => {
                const isOn = form.invoice_type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectInvoiceType(option.value)}
                    aria-pressed={isOn}
                    className={cn(
                      'focus-visible:ring-primary/30 flex min-h-11 flex-col gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      isOn
                        ? 'border-primary bg-primary/[0.06] ring-primary/20 ring-1'
                        : 'border-outline-variant hover:bg-surface-container-low'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg',
                        isOn
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      )}
                    >
                      <Icon name={option.icon} className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isOn ? 'text-primary' : 'text-on-surface'
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-on-surface-variant text-xs leading-snug">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {form.invoice_type === 'progress' && selectedQuote && (
              <div className="border-outline-variant bg-surface-container-low/60 mt-4 rounded-xl border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <SectionLabel as="span">Progress percent</SectionLabel>
                  <span className="text-primary text-xl font-extrabold tabular-nums">
                    {progressPercent || 0}%
                  </span>
                </div>
                <div className="mt-3">
                  <label htmlFor="progress_percent" className="sr-only">
                    Progress percent
                  </label>
                  <input
                    id="progress_percent"
                    type="number"
                    min="1"
                    max="100"
                    inputMode="numeric"
                    value={progressPercent}
                    onChange={(event) =>
                      handleProgressPercentChange(event.target.value)
                    }
                    className={formControlClassName}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() =>
                        handleProgressPercentChange(String(percent))
                      }
                      className={cn(
                        'focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
                        Number(progressPercent) === percent
                          ? 'border-primary bg-primary/[0.06] text-primary'
                          : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                      )}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                <p className="text-on-surface-variant mt-2 text-xs">
                  Applies to the remaining staged subtotal for this linked
                  quote.
                </p>
              </div>
            )}
          </FormSection>

          {/* Details: due date + status */}
          <FormSection className={CARD_CLASS}>
            <h2 className="text-on-surface text-base font-bold">Details</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              Set the payment deadline and the current status of this invoice.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Due date */}
              <div>
                <label htmlFor="due_date" className={formLabelClassName}>
                  Due date{' '}
                  <span className="text-on-surface-variant text-xs font-normal">
                    (optional)
                  </span>
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
                      setForm((prev) => ({
                        ...prev,
                        due_date: buildDefaultDueDate(),
                      }));
                      setError(null);
                    }}
                    className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Set +14 days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, due_date: '' }));
                      setError(null);
                    }}
                    className="border-outline-variant text-on-surface-variant hover:bg-surface-container-low focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-on-surface-variant mt-1.5 text-xs">
                  Leave blank if the invoice does not need a payment deadline
                  yet.
                </p>
              </div>

              {/* Status */}
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
                  <p className="text-on-surface-variant mt-1.5 text-xs">
                    Sent and overdue are set automatically. You can mark this
                    invoice as paid or cancelled here.
                  </p>
                )}
                {form.status === 'paid' && (
                  <p className="text-on-surface-variant mt-1.5 text-xs">
                    Marking as paid stores the paid date and sets the balance to
                    zero.
                  </p>
                )}
              </div>
            </div>

            {showPaymentDetails && (
              <div className="border-outline-variant/60 mt-4 space-y-4 border-t pt-4">
                <div>
                  <label htmlFor="paid_date" className={formLabelClassName}>
                    Paid date
                  </label>
                  <input
                    id="paid_date"
                    name="paid_date"
                    type="date"
                    value={form.paid_date}
                    onChange={handleFormChange}
                    className={cn(formControlClassName, 'sm:max-w-xs')}
                    required={form.status === 'paid'}
                  />
                </div>

                <div>
                  <span className={formLabelClassName}>Payment method</span>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {PAYMENT_METHOD_OPTIONS.map((option) => {
                      const isOn = form.payment_method === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => selectPaymentMethod(option.value)}
                          aria-pressed={isOn}
                          className={cn(
                            'focus-visible:ring-primary/30 flex min-h-11 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                            isOn
                              ? 'border-primary bg-primary/[0.06] ring-primary/20 ring-1'
                              : 'border-outline-variant hover:bg-surface-container-low'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              isOn
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            )}
                          >
                            <Icon name={option.icon} className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn(
                                'block text-sm font-bold',
                                isOn ? 'text-primary' : 'text-on-surface'
                              )}
                            >
                              {option.label}
                            </span>
                            <span className="text-on-surface-variant block truncate text-xs">
                              {option.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-on-surface-variant mt-1.5 text-xs">
                    {form.status === 'paid'
                      ? 'Required when status is paid.'
                      : 'Optional, but useful for reconciling paid invoices later.'}
                  </p>
                </div>
              </div>
            )}
          </FormSection>

          {/* Line Items */}
          <FormSection className={CARD_CLASS}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-on-surface text-base font-bold">
                  Line items
                </h2>
                <p className="text-on-surface-variant mt-1 text-sm">
                  {lineCount === 0
                    ? 'No items yet — add the first one below.'
                    : `${lineCount} item${lineCount === 1 ? '' : 's'} on this invoice.`}
                </p>
              </div>
              <span className="bg-surface-container-high text-on-surface-variant inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
                Subtotal
                <strong className="text-on-surface tabular-nums">
                  {formatAUD(summary.subtotal)}
                </strong>
              </span>
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
                    className="border-outline-variant bg-surface-container-low/50 rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-on-surface text-sm font-semibold">
                        Item {index + 1}
                      </p>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label
                          className={formLabelClassName}
                          htmlFor={`line-description-${index}`}
                        >
                          Description
                        </label>
                        <textarea
                          id={`line-description-${index}`}
                          rows={2}
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="e.g. Prep, prime and paint — 2 coats"
                          className={formTextareaClassName}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            className={formLabelClassName}
                            htmlFor={`line-qty-${index}`}
                          >
                            Qty
                          </label>
                          <input
                            id={`line-qty-${index}`}
                            type="number"
                            min="0"
                            step="0.1"
                            inputMode="decimal"
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                            className={formControlClassName}
                          />
                        </div>
                        <div>
                          <label
                            className={formLabelClassName}
                            htmlFor={`line-price-${index}`}
                          >
                            Unit price (A$)
                          </label>
                          <input
                            id={`line-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleLineItemChange(
                                index,
                                'unitPrice',
                                e.target.value
                              )
                            }
                            className={formControlClassName}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest mt-3 rounded-xl px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">
                          Line total
                        </span>
                        <span className="text-on-surface font-semibold tabular-nums">
                          {formatAUD(lineTotal)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">
                          GST (10%)
                        </span>
                        <span className="text-on-surface font-medium tabular-nums">
                          {formatAUD(lineGst)}
                        </span>
                      </div>
                      <div className="border-outline-variant mt-2 flex items-center justify-between gap-3 border-t pt-2">
                        <span className="text-on-surface font-medium">
                          Item total
                        </span>
                        <span className="text-primary font-semibold tabular-nums">
                          {formatAUD(lineGrandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="border-primary/50 text-primary hover:bg-primary/[0.06] focus-visible:ring-primary/30 mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add line item
            </button>

            <dl className="border-outline-variant mt-5 space-y-2.5 border-t-2 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Subtotal (ex GST)</dt>
                <dd className="text-on-surface font-medium tabular-nums">
                  {formatAUD(summary.subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">GST (10%)</dt>
                <dd className="text-on-surface font-medium tabular-nums">
                  {formatAUD(summary.gst)}
                </dd>
              </div>
              <div className="border-outline-variant flex items-center justify-between gap-3 border-t pt-2.5">
                <dt className="text-on-surface text-base font-bold">
                  Amount due
                </dt>
                <dd className="text-on-surface text-base font-extrabold tabular-nums">
                  {formatAUD(summary.total)}
                  <span className="text-on-surface-variant ml-1 text-xs font-bold">
                    AUD
                  </span>
                </dd>
              </div>
            </dl>
          </FormSection>

          {/* Notes & Terms */}
          <FormSection className={CARD_CLASS}>
            <h2 className="text-on-surface text-base font-bold">
              Notes &amp; terms
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              Notes appear on the PDF. Payment terms set the expectation for the
              customer.
            </p>
            <div className="mt-4 space-y-4">
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
                label="Payment terms"
                name="payment_terms"
                rows={3}
                value={form.payment_terms}
                onChange={handleFormChange}
                placeholder="Payment due within 14 days from invoice date."
              />
            </div>
          </FormSection>

          {/* Business & Payment Details — collapsed by default */}
          <section className="border-outline-variant/60 bg-surface-container-lowest rounded-2xl border shadow-sm">
            <button
              type="button"
              onClick={() => setShowBusinessDetails((v) => !v)}
              aria-expanded={showBusinessDetails}
              className="focus-visible:ring-primary/30 flex min-h-11 w-full items-center justify-between rounded-2xl p-5 text-left focus-visible:ring-2 focus-visible:outline-none sm:p-6"
            >
              <span className="text-on-surface text-base font-bold">
                Business &amp; payment details
              </span>
              <span className="text-on-surface-variant">
                {showBusinessDetails ? '▲' : '▼'}
              </span>
            </button>

            {showBusinessDetails && (
              <div className="border-outline-variant/60 space-y-4 border-t px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
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
                    Bank details
                  </label>
                  <textarea
                    id="bank_details"
                    name="bank_details"
                    rows={3}
                    value={form.bank_details}
                    onChange={handleFormChange}
                    placeholder={
                      'Account Name: Your Business\nBSB: 123-456\nAccount: 12345678'
                    }
                    className={formTextareaClassName}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          {/* Amount due summary */}
          <section className="bg-primary text-on-primary rounded-2xl p-5 shadow-sm sm:p-6">
            <SectionLabel className="text-on-primary/65">
              Amount due
            </SectionLabel>
            <p className="mt-2 text-[34px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
              {formatAUD(summary.total)}
              <span className="text-on-primary/55 ml-1.5 text-xs font-bold">
                AUD
              </span>
            </p>
            <p className="text-on-primary/70 mt-2 text-xs">
              GST 10% included · {lineCount} line item
              {lineCount === 1 ? '' : 's'}
            </p>
            <dl className="border-on-primary/15 mt-4 space-y-2 border-t pt-4 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-on-primary/78">Subtotal</dt>
                <dd className="font-semibold tabular-nums">
                  {formatAUD(summary.subtotal)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-on-primary/78">GST (10%)</dt>
                <dd className="font-semibold tabular-nums">
                  {formatAUD(summary.gst)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-on-primary/78">Type</dt>
                <dd className="font-semibold">
                  {
                    INVOICE_TYPE_OPTIONS.find(
                      (o) => o.value === form.invoice_type
                    )?.label
                  }
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-on-primary/78">Due</dt>
                <dd className="font-semibold">
                  {form.due_date ? formatDate(form.due_date) : 'No due date'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Quote items snapshot */}
          {selectedQuote && selectedQuoteIncludedItems.length > 0 && (
            <FormSection className={CARD_CLASS}>
              <SectionLabel className="mb-3">Quote items</SectionLabel>
              <div className="space-y-2">
                {selectedQuoteIncludedItems.map((item, index) => (
                  <div
                    key={`${item.description}-${index}`}
                    className="bg-surface-container-low rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-on-surface text-sm font-medium whitespace-pre-wrap">
                        {item.description}
                      </p>
                      <p className="text-on-surface shrink-0 text-sm font-semibold tabular-nums">
                        {formatAUD(item.total_cents)}
                      </p>
                    </div>
                    <p className="text-on-surface-variant mt-0.5 text-xs">
                      Qty {item.quantity} × {formatAUD(item.unit_price_cents)}
                    </p>
                  </div>
                ))}
              </div>
              {selectedQuote.valid_until && (
                <p className="text-on-surface-variant mt-3 text-xs">
                  Valid until {formatDate(selectedQuote.valid_until)}
                </p>
              )}
            </FormSection>
          )}

          {/* Customer snapshot */}
          {selectedCustomer && (
            <FormSection className={CARD_CLASS}>
              <SectionLabel className="mb-3">Customer snapshot</SectionLabel>
              <div className="space-y-1 text-sm">
                <p className="text-on-surface font-semibold">
                  {selectedCustomer.company_name || selectedCustomer.name}
                </p>
                {selectedCustomer.email && (
                  <p className="text-on-surface-variant">
                    {selectedCustomer.email}
                  </p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-on-surface-variant">
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.address && (
                  <p className="text-on-surface-variant whitespace-pre-wrap">
                    {selectedCustomer.address}
                  </p>
                )}
              </div>
            </FormSection>
          )}
        </aside>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {/* Fixed bottom CTA */}
      <FormFooter contentClassName="max-w-6xl flex-col">
        <div className="flex flex-col gap-3 sm:flex-row">
          <FormFooterButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
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
          <div className="border-outline-variant bg-surface-container-low text-on-surface-variant rounded-xl border border-dashed px-4 py-3 text-sm">
            Add a customer first in{' '}
            <Link
              href="/customers/new"
              className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-2 font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              Customers
            </Link>
            .
          </div>
        )}
      </FormFooter>
    </form>
  );
}
