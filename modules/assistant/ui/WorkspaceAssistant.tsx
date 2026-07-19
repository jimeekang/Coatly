'use client';

import Link from 'next/link';
import { useState, useTransition, type ComponentType } from 'react';
import {
  ArrowUpRight,
  FileText,
  MessageSquareText,
  Receipt,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { runWorkspaceAssistant } from '@/modules/assistant/application/actions';
import type {
  WorkspaceAssistantMatch,
  WorkspaceAssistantResult,
} from '@/modules/ai/domain/draft-types';
import type { QuoteCustomerOption } from '@/modules/quotes/domain/quotes';
import type { QuoteCreateInput } from '@/modules/quotes/domain/quote-schema';
import type { QuoteFormDefaultValues } from '@/modules/quotes/ui/QuoteForm';
import type {
  InvoiceFormCustomerOption,
  InvoiceFormDefaultValues,
  InvoiceFormQuoteOption,
  InvoiceFormSubmitPayload,
} from '@/modules/invoices/ui/InvoiceForm';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { formatAUD, formatDate } from '@/utils/format';

/**
 * The draft forms and create actions are injected as props by the composition
 * layer (app/(dashboard)/dashboard/page.tsx). This keeps the assistant UI free
 * of any runtime coupling to other feature modules; the remaining cross-module
 * imports are type-only (erased at build) and only shape the injected props.
 */
export type WorkspaceAssistantCustomerForm = ComponentType<{
  defaultValues?: NonNullable<WorkspaceAssistantResult['customer']> | undefined;
  onCancel?: () => void;
  cancelLabel?: string;
}>;

export type WorkspaceAssistantQuoteForm = ComponentType<{
  customers: QuoteCustomerOption[];
  defaultValues?: QuoteFormDefaultValues;
  onSubmit?: (data: QuoteCreateInput) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
}>;

export type WorkspaceAssistantInvoiceForm = ComponentType<{
  customers: InvoiceFormCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
  defaultValues?: InvoiceFormDefaultValues;
  onSubmit?: (
    data: InvoiceFormSubmitPayload
  ) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
}>;

export type WorkspaceAssistantProps = {
  customers: QuoteCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
  CustomerForm: WorkspaceAssistantCustomerForm;
  QuoteForm: WorkspaceAssistantQuoteForm;
  InvoiceForm: WorkspaceAssistantInvoiceForm;
  createQuote: (data: QuoteCreateInput) => Promise<{ error: string } | void>;
  createInvoice: (
    data: InvoiceFormSubmitPayload
  ) => Promise<{ error: string } | void>;
};

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

export function WorkspaceAssistant({
  customers,
  quotes,
  CustomerForm,
  QuoteForm,
  InvoiceForm,
  createQuote,
  createInvoice,
}: WorkspaceAssistantProps) {
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
        setError(
          response.error ?? 'The assistant could not complete that request.'
        );
        return;
      }

      setResult(response.data);
      setFormKey((current) => current + 1);
    });
  }

  function handlePromptKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
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
    <section className="border-outline bg-surface-container-lowest mb-10 overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-outline from-success-container via-surface-container-lowest to-error-container border-b bg-gradient-to-br px-4 py-5 md:px-5">
        <div className="flex items-start gap-3">
          <div className="bg-surface-container-lowest rounded-2xl p-2.5 shadow-sm">
            <Sparkles className="text-primary h-5 w-5" />
          </div>
          <div className="min-w-0">
            <SectionLabel className="text-primary">Dashboard AI</SectionLabel>
            <h2 className="text-on-surface mt-1 text-xl font-bold">
              Ask once. Search records or draft the next job.
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              One prompt can find customers, quotes, and invoices or prepare a
              form draft for review before saving.
            </p>
            <p className="border-outline-variant bg-surface-container-lowest/75 text-on-surface-variant mt-2 rounded-xl border px-3 py-2 text-xs">
              AI may use business, customer, quote, and invoice context. Review
              drafts before saving or sending.
            </p>
          </div>
        </div>

        <div className="border-outline bg-surface-container-lowest mt-4 rounded-2xl border p-3 shadow-sm">
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
            className="text-on-surface placeholder:text-on-surface-variant w-full resize-none border-0 bg-transparent px-1 py-1 text-base focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="border-outline bg-surface-container-low text-on-surface hover:bg-surface-container-lowest focus-visible:ring-primary/30 min-h-11 rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isPending ? 'Working...' : 'Run Prompt'}
            </button>
            <button
              type="button"
              onClick={clearAssistant}
              disabled={isPending && !result}
              className="border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 min-h-12 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {(error || result) && (
        <div className="px-4 py-5 md:px-5">
          <div className="border-outline bg-surface-container-low rounded-2xl border p-4">
            {result && (
              <div className="flex items-start gap-3">
                <div className="bg-surface-container-lowest rounded-2xl p-2 shadow-sm">
                  <MessageSquareText className="text-primary h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <SectionLabel>{getIntentLabel(result.intent)}</SectionLabel>
                  <p className="text-on-surface mt-1 text-sm font-semibold">
                    {result.summary}
                  </p>
                  {result.answer && (
                    <p className="border-outline bg-surface-container-lowest text-on-surface mt-3 rounded-2xl border px-4 py-3 text-sm">
                      {result.answer}
                    </p>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="border-warning/30 bg-warning-container mt-3 rounded-2xl border px-4 py-3">
                      <ul className="text-on-warning-container space-y-1 text-sm">
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </div>

          {result?.matches.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.matches.map((match) => {
                const Icon = getMatchIcon(match.type);
                return (
                  <Link
                    key={`${match.type}-${match.id}`}
                    href={match.href}
                    className="border-outline bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/30 rounded-2xl border p-4 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="bg-success-container rounded-2xl p-2.5">
                          <Icon className="text-primary h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-on-surface truncate text-sm font-semibold">
                            {match.title}
                          </p>
                          <p className="text-on-surface-variant mt-0.5 text-sm">
                            {match.subtitle}
                          </p>
                          {match.description && (
                            <p className="text-on-surface-variant mt-1 text-sm">
                              {match.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="text-on-surface-variant mt-0.5 h-4 w-4 flex-shrink-0" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {match.badge && (
                        <span className="bg-success-container text-primary rounded-full px-2.5 py-1 font-medium">
                          {match.badge}
                        </span>
                      )}
                      {match.amount_cents != null && (
                        <span className="bg-surface-container-lowest text-on-surface ring-outline rounded-full px-2.5 py-1 font-medium ring-1">
                          {formatAUD(match.amount_cents)}
                        </span>
                      )}
                      {match.date_label && (
                        <span className="bg-surface-container-lowest text-on-surface ring-outline rounded-full px-2.5 py-1 font-medium ring-1">
                          {formatMatchDate(match.date_label)}
                        </span>
                      )}
                    </div>

                    <p className="text-on-surface-variant mt-3 text-sm">
                      {match.reason}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {isCreateIntent && (
            <div className="border-outline bg-surface-container-lowest mt-5 rounded-2xl border p-4 shadow-sm">
              <div className="mb-4">
                <SectionLabel>Review Before Save</SectionLabel>
                <h3 className="text-on-surface mt-1 text-lg font-bold">
                  {getIntentLabel(result.intent)}
                </h3>
                <p className="text-on-surface-variant mt-1 text-sm">
                  AI filled the draft. Check the form, adjust anything missing,
                  then save through the normal validated action.
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
                          labour_margin_percent:
                            result.quote.labour_margin_percent,
                          material_margin_percent:
                            result.quote.material_margin_percent,
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
