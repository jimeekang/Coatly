'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  ArrowUpRight,
  FileText,
  MessageSquareText,
  Receipt,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { runWorkspaceAssistant } from '@/app/actions/workspace-assistant';
import type {
  InvoiceFormCustomerOption,
  InvoiceFormQuoteOption,
} from '@/modules/invoices/ui/InvoiceForm';
import type { WorkspaceAssistantMatch, WorkspaceAssistantResult } from '@/lib/ai/draft-types';
import type { QuoteCustomerOption } from '@/modules/quotes/domain/quotes';
import { createInvoice } from '@/modules/invoices/application/actions';
import { createQuote } from '@/modules/quotes/application/actions';
import { formatAUD, formatDate } from '@/utils/format';

const CustomerForm = dynamic(
  () => import('@/modules/customers/ui/CustomerForm').then((module) => module.CustomerForm),
  {
    loading: () => <AssistantFormLoading />,
  }
);
const QuoteForm = dynamic(
  () => import('@/modules/quotes/ui/QuoteForm').then((module) => module.QuoteForm),
  {
    loading: () => <AssistantFormLoading />,
  }
);
const InvoiceForm = dynamic(
  () => import('@/modules/invoices/ui/InvoiceForm').then((module) => module.InvoiceForm),
  {
    loading: () => <AssistantFormLoading />,
  }
);

const EXAMPLES = [
  'Add Mark Johnson as a new customer in Bondi',
  "Create a better quote for Mark's living room and ceiling repaint",
  "Find Mark's latest quote",
  "When is Shara's invoice due date?",
] as const;

function getMatchIcon(type: WorkspaceAssistantMatch['type']) {
  switch (type) {
    case 'customer':
      return UserRound;
    case 'quote':
      return FileText;
    case 'invoice':
      return Receipt;
  }
}

function getIntentLabel(intent: WorkspaceAssistantResult['intent']) {
  switch (intent) {
    case 'create_customer':
      return 'Review Customer Draft';
    case 'create_quote':
      return 'Review Quote Draft';
    case 'create_invoice':
      return 'Review Invoice Draft';
    case 'search':
      return 'Matching Records';
    case 'answer':
      return 'Answer';
  }
}

function formatMatchDate(dateLabel: string | null) {
  if (!dateLabel) return null;

  if (dateLabel.startsWith('Due ')) {
    return `Due ${formatDate(dateLabel.slice(4))}`;
  }

  if (dateLabel.startsWith('Valid until ')) {
    return `Valid until ${formatDate(dateLabel.slice(12))}`;
  }

  return dateLabel;
}

function AssistantFormLoading() {
  return (
    <div className="rounded-2xl border border-outline bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
      Loading draft form...
    </div>
  );
}

export function WorkspaceAssistant({
  customers,
  quotes,
}: {
  customers: QuoteCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
}) {
  const invoiceCustomers = customers as InvoiceFormCustomerOption[];
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<WorkspaceAssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isCreateIntent =
    result?.intent === 'create_customer' ||
    result?.intent === 'create_quote' ||
    result?.intent === 'create_invoice';

  function clearAssistant() {
    setPrompt('');
    setResult(null);
    setError(null);
    setFormKey((current) => current + 1);
  }

  function handleRunPrompt() {
    startTransition(async () => {
      setError(null);

      const response = await runWorkspaceAssistant({ prompt });
      if (response.error || !response.data) {
        setResult(null);
        setError(response.error ?? 'The assistant could not complete that request.');
        return;
      }

      setResult(response.data);
      setFormKey((current) => current + 1);
    });
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isPending || !prompt.trim()) {
      return;
    }

    handleRunPrompt();
  }

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-outline bg-white shadow-sm">
      <div className="border-b border-outline bg-gradient-to-br from-success-container via-white to-error-container px-4 py-5 md:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2.5 shadow-sm">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Dashboard AI
            </p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              Ask once. Search records or draft the next job.
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              One prompt can find customers, quotes, and invoices or prepare a form draft
              for review before saving.
            </p>
            <p className="mt-2 rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-xs text-on-surface-variant">
              AI may use business, customer, quote, and invoice context. Review drafts before saving or sending.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-outline bg-white p-3 shadow-sm">
          <label htmlFor="workspace-ai-prompt" className="sr-only">
            Dashboard AI prompt
          </label>
          <textarea
            id="workspace-ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            rows={4}
            placeholder="Example: Find Mark's latest quote, or create a deposit invoice for Shara due next Friday."
            className="w-full resize-none border-0 bg-transparent px-1 py-1 text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-outline bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-white"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleRunPrompt}
              disabled={isPending || !prompt.trim()}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isPending ? 'Working...' : 'Run Prompt'}
            </button>
            <button
              type="button"
              onClick={clearAssistant}
              disabled={isPending && !result}
              className="min-h-11 rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {(error || result) && (
        <div className="px-4 py-5 md:px-5">
          <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
            {result && (
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 shadow-sm">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    {getIntentLabel(result.intent)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{result.summary}</p>
                  {result.answer && (
                    <p className="mt-3 rounded-2xl border border-outline bg-white px-4 py-3 text-sm text-on-surface">
                      {result.answer}
                    </p>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-warning/30 bg-warning-container px-4 py-3">
                      <ul className="space-y-1 text-sm text-on-warning-container">
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-error bg-error-container px-4 py-3">
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
            )}
          </div>

          {result?.matches.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.matches.map((match) => {
                const Icon = getMatchIcon(match.type);
                return (
                  <Link
                    key={`${match.type}-${match.id}`}
                    href={match.href}
                    className="rounded-2xl border border-outline bg-white p-4 shadow-sm transition-colors hover:bg-surface-container-low"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-2xl bg-success-container p-2.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">
                            {match.title}
                          </p>
                          <p className="mt-0.5 text-sm text-on-surface-variant">{match.subtitle}</p>
                          {match.description && (
                            <p className="mt-1 text-sm text-on-surface-variant">{match.description}</p>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-on-surface-variant" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {match.badge && (
                        <span className="rounded-full bg-success-container px-2.5 py-1 font-medium text-primary">
                          {match.badge}
                        </span>
                      )}
                      {match.amount_cents != null && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-on-surface ring-1 ring-outline">
                          {formatAUD(match.amount_cents)}
                        </span>
                      )}
                      {match.date_label && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-on-surface ring-1 ring-outline">
                          {formatMatchDate(match.date_label)}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-on-surface-variant">{match.reason}</p>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {isCreateIntent && (
            <div className="mt-5 rounded-2xl border border-outline bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                  Review Before Save
                </p>
                <h3 className="mt-1 text-lg font-bold text-on-surface">
                  {getIntentLabel(result.intent)}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  AI filled the draft. Check the form, adjust anything missing, then save
                  through the normal validated action.
                </p>
              </div>

              {result.intent === 'create_customer' && (
                <CustomerForm
                  key={`customer-${formKey}`}
                  defaultValues={result.customer ?? undefined}
                  onCancel={clearAssistant}
                  cancelLabel="Clear Draft"
                />
              )}

              {result.intent === 'create_quote' && (
                <QuoteForm
                  key={`quote-${formKey}`}
                  customers={customers}
                  defaultValues={
                    result.quote
                      ? {
                          customer_id: result.quote.customer_id ?? '',
                          title: result.quote.title,
                          status: result.quote.status,
                          valid_until: result.quote.valid_until,
                          complexity: result.quote.complexity,
                          labour_margin_percent: result.quote.labour_margin_percent,
                          material_margin_percent: result.quote.material_margin_percent,
                          notes: result.quote.notes,
                          internal_notes: result.quote.internal_notes,
                          rooms: result.quote.rooms,
                        }
                      : undefined
                  }
                  onSubmit={(data) => createQuote(data)}
                  onCancel={clearAssistant}
                  cancelLabel="Clear Draft"
                />
              )}

              {result.intent === 'create_invoice' && (
                <InvoiceForm
                  key={`invoice-${formKey}`}
                  customers={invoiceCustomers}
                  quotes={quotes}
                  defaultValues={
                    result.invoice
                      ? {
                          customer_id: result.invoice.customer_id ?? '',
                          quote_id: result.invoice.quote_id,
                          invoice_type: result.invoice.invoice_type,
                          status: result.invoice.status,
                          business_abn: null,
                          payment_terms: null,
                          bank_details: null,
                          due_date: result.invoice.due_date,
                          paid_date: null,
                          payment_method: null,
                          notes: result.invoice.notes,
                          line_items: result.invoice.line_items,
                        }
                      : undefined
                  }
                  onSubmit={createInvoice}
                  onCancel={clearAssistant}
                  cancelLabel="Clear Draft"
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
