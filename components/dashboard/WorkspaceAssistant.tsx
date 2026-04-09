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
} from '@/components/invoices/InvoiceForm';
import type { WorkspaceAssistantMatch, WorkspaceAssistantResult } from '@/lib/ai/draft-types';
import type { QuoteCustomerOption } from '@/lib/quotes';
import { createInvoice } from '@/app/actions/invoices';
import { createQuote } from '@/app/actions/quotes';
import { formatAUD, formatDate } from '@/utils/format';

const CustomerForm = dynamic(
  () => import('@/components/customers/CustomerForm').then((module) => module.CustomerForm),
  {
    loading: () => <AssistantFormLoading />,
  }
);
const QuoteForm = dynamic(
  () => import('@/components/quotes/QuoteForm').then((module) => module.QuoteForm),
  {
    loading: () => <AssistantFormLoading />,
  }
);
const InvoiceForm = dynamic(
  () => import('@/components/invoices/InvoiceForm').then((module) => module.InvoiceForm),
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
    <div className="rounded-2xl border border-pm-border bg-pm-surface px-4 py-6 text-sm text-pm-secondary">
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
    <section className="mb-10 overflow-hidden rounded-3xl border border-pm-border bg-white shadow-sm">
      <div className="border-b border-pm-border bg-gradient-to-br from-pm-teal-light via-white to-pm-coral-light px-4 py-5 md:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2.5 shadow-sm">
            <Sparkles className="h-5 w-5 text-pm-teal" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pm-teal">
              Dashboard AI
            </p>
            <h2 className="mt-1 text-xl font-bold text-pm-body">
              Ask once. Search records or draft the next job.
            </h2>
            <p className="mt-1 text-sm text-pm-secondary">
              One prompt can find customers, quotes, and invoices or prepare a form draft
              for review before saving.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-pm-border bg-white p-3 shadow-sm">
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
            className="w-full resize-none border-0 bg-transparent px-1 py-1 text-base text-pm-body placeholder:text-pm-secondary focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-pm-border bg-pm-surface px-3 py-1.5 text-xs font-medium text-pm-body transition-colors hover:bg-white"
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
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-pm-teal px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isPending ? 'Working...' : 'Run Prompt'}
            </button>
            <button
              type="button"
              onClick={clearAssistant}
              disabled={isPending && !result}
              className="min-h-11 rounded-2xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {(error || result) && (
        <div className="px-4 py-5 md:px-5">
          <div className="rounded-2xl border border-pm-border bg-pm-surface p-4">
            {result && (
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 shadow-sm">
                  <MessageSquareText className="h-4 w-4 text-pm-teal" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pm-secondary">
                    {getIntentLabel(result.intent)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pm-body">{result.summary}</p>
                  {result.answer && (
                    <p className="mt-3 rounded-2xl border border-pm-border bg-white px-4 py-3 text-sm text-pm-body">
                      {result.answer}
                    </p>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <ul className="space-y-1 text-sm text-amber-900">
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
              <div className="rounded-2xl border border-pm-coral bg-pm-coral-light px-4 py-3">
                <p className="text-sm text-pm-coral-dark">{error}</p>
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
                    className="rounded-2xl border border-pm-border bg-white p-4 shadow-sm transition-colors hover:bg-pm-surface"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-2xl bg-pm-teal-light p-2.5">
                          <Icon className="h-4 w-4 text-pm-teal" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-pm-body">
                            {match.title}
                          </p>
                          <p className="mt-0.5 text-sm text-pm-secondary">{match.subtitle}</p>
                          {match.description && (
                            <p className="mt-1 text-sm text-pm-secondary">{match.description}</p>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-pm-secondary" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {match.badge && (
                        <span className="rounded-full bg-pm-teal-light px-2.5 py-1 font-medium text-pm-teal">
                          {match.badge}
                        </span>
                      )}
                      {match.amount_cents != null && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-pm-body ring-1 ring-pm-border">
                          {formatAUD(match.amount_cents)}
                        </span>
                      )}
                      {match.date_label && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-pm-body ring-1 ring-pm-border">
                          {formatMatchDate(match.date_label)}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-pm-secondary">{match.reason}</p>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {isCreateIntent && (
            <div className="mt-5 rounded-3xl border border-pm-border bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pm-secondary">
                  Review Before Save
                </p>
                <h3 className="mt-1 text-lg font-bold text-pm-body">
                  {getIntentLabel(result.intent)}
                </h3>
                <p className="mt-1 text-sm text-pm-secondary">
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
