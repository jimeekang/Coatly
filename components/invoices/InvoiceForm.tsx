'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD, formatDate } from '@/utils/format';

const FIELD_CLASS =
  'h-12 w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';

const LABEL_CLASS = 'mb-1 block text-sm font-medium text-pm-body';

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
  total_cents: number;
  status: string;
  valid_until: string | null;
};

type InvoiceFormSubmitPayload = {
  customer_id: string;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

type InvoiceFormDefaultValues = {
  customer_id: string;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

function createInitialInvoiceForm(defaultValues?: InvoiceFormDefaultValues) {
  return {
    customer_id: defaultValues?.customer_id ?? '',
    quote_id: defaultValues?.quote_id ?? '',
    invoice_type: defaultValues?.invoice_type ?? ('full' as const),
    status: defaultValues?.status ?? ('draft' as const),
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

export function InvoiceForm({
  customers,
  quotes,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  invoiceNumberPreview = 'Assigned on save',
  defaultValues,
  submitLabel = 'Save Invoice',
}: {
  customers: InvoiceFormCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
  onSubmit?: (data: InvoiceFormSubmitPayload) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  invoiceNumberPreview?: string;
  defaultValues?: InvoiceFormDefaultValues;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => createInitialInvoiceForm(defaultValues));
  const [lineItems, setLineItems] = useState<InvoiceLineDraft[]>(() =>
    createInitialLineItems(defaultValues)
  );

  const filteredQuotes = useMemo(() => {
    if (!form.customer_id) return quotes;
    return quotes.filter((quote) => quote.customer_id === form.customer_id);
  }, [form.customer_id, quotes]);

  const selectedCustomer =
    customers.find((customer) => customer.id === form.customer_id) ?? null;
  const selectedQuote = quotes.find((quote) => quote.id === form.quote_id) ?? null;

  const summary = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
      return sum + Math.round(quantity * unitPrice * 100);
    }, 0);

    const gst = Math.round(subtotal * 0.1);

    return {
      subtotal,
      gst,
      total: subtotal + gst,
    };
  }, [lineItems]);

  const canSubmit =
    Boolean(onSubmit) &&
    Boolean(form.customer_id) &&
    Boolean(form.due_date) &&
    lineItems.some(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0
    );

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'quote_id' && value) {
        const matchedQuote = quotes.find((quote) => quote.id === value);
        if (matchedQuote) {
          next.customer_id = matchedQuote.customer_id;
        }
      }

      if (name === 'customer_id' && prev.quote_id) {
        const matchedQuote = quotes.find((quote) => quote.id === prev.quote_id);
        if (matchedQuote && matchedQuote.customer_id !== value) {
          next.quote_id = '';
        }
      }

      return next;
    });

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Invoice Number
            </p>
            <p className="mt-1 text-lg font-semibold text-pm-body">
              {invoiceNumberPreview}
            </p>
          </div>
          <div className="rounded-xl bg-pm-teal-light px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pm-teal-mid">
              Total
            </p>
            <p className="mt-1 text-lg font-semibold text-pm-teal">
              {formatAUD(summary.total)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Invoice Details
        </h3>
        <div className="flex flex-col gap-4">
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

          <div>
            <label htmlFor="quote_id" className={LABEL_CLASS}>
              Linked Quote
              <span className="ml-1.5 text-xs font-normal text-pm-secondary">(optional)</span>
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
                  {quote.title ? ` - ${quote.title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            </div>
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

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
      </section>

      {selectedCustomer && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Customer Snapshot
          </h3>
          <div className="mt-3 space-y-1 text-sm text-pm-body">
            <p className="font-medium text-pm-body">
              {selectedCustomer.company_name || selectedCustomer.name}
            </p>
            {selectedCustomer.email && <p>{selectedCustomer.email}</p>}
            {selectedCustomer.phone && <p>{selectedCustomer.phone}</p>}
            {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
          </div>
        </section>
      )}

      {selectedQuote && (
        <section className="rounded-2xl border border-pm-border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Linked Quote
          </h3>
          <div className="mt-3 flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="font-medium text-pm-body">{selectedQuote.quote_number}</p>
              {selectedQuote.title && <p className="mt-1 text-pm-secondary">{selectedQuote.title}</p>}
              <p className="mt-1 capitalize text-pm-secondary">{selectedQuote.status}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-pm-body">
                {formatAUD(selectedQuote.total_cents)}
              </p>
              <p className="mt-1 text-xs text-pm-secondary">
                {selectedQuote.valid_until
                  ? `Valid until ${formatDate(selectedQuote.valid_until)}`
                  : 'No expiry'}
              </p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Line Items
          </h3>
          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex min-h-11 items-center rounded-lg border border-pm-border px-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
          >
            + Add Item
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {lineItems.map((item, index) => {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            const lineTotal =
              Number.isFinite(quantity) && Number.isFinite(unitPrice)
                ? Math.round(quantity * unitPrice * 100)
                : 0;

            return (
              <div
                key={`${index}-${item.description}`}
                className="rounded-2xl border border-pm-border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-pm-body">Item {index + 1}</p>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-pm-secondary hover:bg-pm-surface hover:text-pm-body"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className={LABEL_CLASS} htmlFor={`line-description-${index}`}>
                      Description
                    </label>
                    <input
                      id={`line-description-${index}`}
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleLineItemChange(index, 'description', e.target.value)
                      }
                      placeholder="Prep, paint, touch-ups"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                        onChange={(e) =>
                          handleLineItemChange(index, 'quantity', e.target.value)
                        }
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
                        onChange={(e) =>
                          handleLineItemChange(index, 'unitPrice', e.target.value)
                        }
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-pm-surface px-3 py-2 text-sm text-pm-secondary">
                  Line total:{' '}
                  <span className="font-semibold text-pm-body">{formatAUD(lineTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Notes
        </h3>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={form.notes}
          onChange={handleFormChange}
          placeholder="Add a payment note or job summary"
          className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
        />
      </section>

      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Totals
        </h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-pm-secondary">Subtotal</dt>
            <dd className="font-medium text-pm-body">{formatAUD(summary.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-pm-secondary">GST</dt>
            <dd className="font-medium text-pm-body">{formatAUD(summary.gst)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-pm-border pt-3">
            <dt className="font-semibold text-pm-body">Total</dt>
            <dd className="text-base font-semibold text-pm-body">
              {formatAUD(summary.total)}
            </dd>
          </div>
        </dl>
      </section>

      {!onSubmit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">Invoice save action is not connected yet.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-pm-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              router.back();
            }}
            disabled={isPending}
            className="h-14 flex-1 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body transition-colors active:bg-pm-surface disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="h-14 flex-[2] rounded-xl bg-pm-teal text-base font-semibold text-white transition-colors active:bg-pm-teal-hover disabled:opacity-50"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
        </div>
        {!customers.length && (
          <div className="mx-auto mt-3 max-w-lg rounded-lg border border-dashed border-pm-border bg-pm-surface px-4 py-3 text-sm text-pm-secondary">
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
