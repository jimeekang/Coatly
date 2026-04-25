'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateJob, saveJobVariations } from '@/app/actions/jobs';
import {
  JOB_STATUS_LABELS,
  type JobCustomerOption,
  type JobDetail,
  type JobQuoteOption,
  type JobStatus,
  type JobVariation,
} from '@/lib/jobs';
import { formatAUD } from '@/utils/format';

type FormState = {
  title: string;
  customer_id: string;
  quote_id: string;
  status: JobStatus;
  scheduled_date: string;
  notes: string;
};

type VariationRow = {
  key: string;
  name: string;
  quantity: string;
  unit_price: string;
  notes: string;
};

function getCustomerLabel(c: JobCustomerOption) {
  return c.company_name || c.name;
}

function newVariationRow(): VariationRow {
  return { key: crypto.randomUUID(), name: '', quantity: '1', unit_price: '', notes: '' };
}

function parseVariationRow(row: VariationRow) {
  const qty = parseFloat(row.quantity);
  const price = Math.round(parseFloat(row.unit_price) * 100);
  return {
    name: row.name.trim(),
    quantity: isNaN(qty) ? 1 : qty,
    unit_price_cents: isNaN(price) ? 0 : price,
    notes: row.notes.trim() || null,
  };
}

export function JobEditForm({
  job,
  customers,
  quotes,
  initialVariations,
}: {
  job: JobDetail;
  customers: JobCustomerOption[];
  quotes: JobQuoteOption[];
  initialVariations: JobVariation[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    title: job.title,
    customer_id: job.customer_id,
    quote_id: job.quote_id ?? '',
    status: job.status,
    scheduled_date: job.scheduled_date,
    notes: job.notes ?? '',
  });

  const [variations, setVariations] = useState<VariationRow[]>(
    initialVariations.length > 0
      ? initialVariations.map((v) => ({
          key: v.id,
          name: v.name,
          quantity: String(v.quantity),
          unit_price: (v.unit_price_cents / 100).toFixed(2),
          notes: v.notes ?? '',
        }))
      : [],
  );

  const filteredQuotes = quotes.filter((q) =>
    form.customer_id ? q.customer_id === form.customer_id : true,
  );

  const variationsTotal = variations.reduce((sum, row) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.unit_price) || 0;
    return sum + Math.round(qty * price * 100);
  }, 0);

  function handleCustomerChange(customerId: string) {
    setForm((cur) => {
      const selectedQuote = quotes.find((q) => q.id === cur.quote_id);
      const nextQuoteId =
        selectedQuote && selectedQuote.customer_id === customerId ? cur.quote_id : '';
      return { ...cur, customer_id: customerId, quote_id: nextQuoteId };
    });
  }

  function handleQuoteChange(quoteId: string) {
    const selectedQuote = quotes.find((q) => q.id === quoteId);
    setForm((cur) => ({
      ...cur,
      quote_id: quoteId,
      customer_id: selectedQuote?.customer_id ?? cur.customer_id,
    }));
  }

  function addVariation() {
    setVariations((cur) => [...cur, newVariationRow()]);
  }

  function updateVariation(key: string, field: keyof VariationRow, value: string) {
    setVariations((cur) =>
      cur.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function removeVariation(key: string) {
    setVariations((cur) => cur.filter((row) => row.key !== key));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validVariations = variations.filter((row) => row.name.trim().length > 0);

    startTransition(() => {
      void (async () => {
        const [jobResult, variationsResult] = await Promise.all([
          updateJob(job.id, {
            customer_id: form.customer_id,
            quote_id: form.quote_id || null,
            title: form.title,
            status: form.status,
            scheduled_date: form.scheduled_date,
            notes: form.notes,
          }),
          saveJobVariations(job.id, validVariations.map(parseVariationRow)),
        ]);

        const err = jobResult.error ?? variationsResult.error;
        if (err) {
          setFormError(err);
          return;
        }
        router.push(`/jobs/${job.id}`);
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
          Job Title
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            placeholder="e.g. Harbour kitchen repaint"
            className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
          Scheduled Date
          <input
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm((c) => ({ ...c, scheduled_date: e.target.value }))}
            className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
          Customer
          <select
            value={form.customer_id}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{getCustomerLabel(c)}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
          Linked Quote
          <select
            value={form.quote_id}
            onChange={(e) => handleQuoteChange(e.target.value)}
            className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">No linked quote</option>
            {filteredQuotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quote_number}{q.title ? ` · ${q.title}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-on-surface">Status</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((status) => {
            const active = form.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setForm((c) => ({ ...c, status }))}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {JOB_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
        Notes
        <textarea
          value={form.notes}
          onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
          rows={4}
          placeholder="Site access, paint spec, or handover notes"
          className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </label>

      {/* Variations */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-on-surface">Variations</p>
          <button
            type="button"
            onClick={addVariation}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add item
          </button>
        </div>

        {variations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant px-4 py-3 text-sm text-on-surface-variant">
            No variations. Add extra work items not in the original quote.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="hidden grid-cols-[1fr_80px_100px_100px_32px] gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant md:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            {variations.map((row) => {
              const qty = parseFloat(row.quantity) || 0;
              const price = parseFloat(row.unit_price) || 0;
              const total = Math.round(qty * price * 100);
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 md:grid-cols-[1fr_80px_100px_100px_32px] md:items-center md:rounded-lg md:border-none md:bg-transparent md:p-0"
                >
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateVariation(row.key, 'name', e.target.value)}
                      placeholder="Description"
                      className="h-9 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateVariation(row.key, 'notes', e.target.value)}
                      placeholder="Notes (optional)"
                      className="h-8 rounded-lg border border-outline-variant bg-white px-3 text-xs text-on-surface-variant outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateVariation(row.key, 'quantity', e.target.value)}
                    min="0"
                    step="0.5"
                    placeholder="1"
                    className="h-9 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">$</span>
                    <input
                      type="number"
                      value={row.unit_price}
                      onChange={(e) => updateVariation(row.key, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-9 w-full rounded-lg border border-outline-variant bg-white pl-6 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <p className="text-right text-sm font-semibold text-on-surface self-center">
                    {formatAUD(total)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeVariation(row.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container self-center"
                    aria-label="Remove variation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {variationsTotal > 0 && (
              <div className="flex justify-between border-t border-outline-variant pt-2 text-sm">
                <span className="font-medium text-on-surface-variant">Variations total</span>
                <span className="font-bold text-on-surface">{formatAUD(variationsTotal)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {formError && (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{formError}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/jobs/${job.id}`)}
          className="inline-flex h-11 items-center rounded-lg border border-outline-variant px-5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
