'use client';

import { useState, useTransition } from 'react';
import { createInvoice } from '@/app/actions/invoices';
import { generateAIDraft } from '@/app/actions/ai-drafts';
import { AIDraftPanel } from '@/components/ai/AIDraftPanel';
import {
  InvoiceForm,
  type InvoiceFormCustomerOption,
  type InvoiceFormQuoteOption,
} from '@/components/invoices/InvoiceForm';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { AIInvoiceDraft } from '@/lib/ai/draft-types';

export function InvoiceCreateScreen({
  customers,
  quotes,
  canUseAI,
}: {
  customers: InvoiceFormCustomerOption[];
  quotes: InvoiceFormQuoteOption[];
  canUseAI: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AIInvoiceDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      setError(null);

      const result = await generateAIDraft({
        entity: 'invoice',
        prompt,
      });

      if (result.error || !result.data?.invoice) {
        setDraft(null);
        setSummary(null);
        setWarnings([]);
        setError(result.error ?? 'Invoice draft could not be prepared.');
        return;
      }

      setDraft(result.data.invoice);
      setSummary(result.data.summary);
      setWarnings(result.data.warnings);
    });
  }

  function handleApply() {
    if (!draft) return;
    setResetKey((current) => current + 1);
  }

  return (
    <>
      {canUseAI ? (
        <AIDraftPanel
          entityLabel="Invoice"
          prompt={prompt}
          placeholder="Example: Create a 30% deposit invoice for Harbor Cafe repaint, linked to Sarah Johnson, due in 7 days, with one line item for the deposit."
          examples={[
            '30% deposit invoice for Harbor Cafe repaint',
            'Final invoice for two-bedroom interior repaint',
          ]}
          pending={isPending}
          error={error}
          summary={summary}
          warnings={warnings}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          onApply={handleApply}
          canApply={Boolean(draft)}
        />
      ) : (
        <div className="mb-6">
          <UpgradePrompt
            title="AI invoice drafting is available on Pro"
            description="Starter covers manual invoicing. Upgrade to Pro to generate invoice drafts from a short prompt and review them before saving."
          />
        </div>
      )}

      <InvoiceForm
        key={resetKey}
        customers={customers}
        quotes={quotes}
        defaultValues={
          draft
            ? {
                customer_id: draft.customer_id ?? '',
                quote_id: draft.quote_id,
                invoice_type: draft.invoice_type,
                status: draft.status,
                due_date: draft.due_date,
                notes: draft.notes,
                line_items: draft.line_items,
              }
            : undefined
        }
        onSubmit={createInvoice}
      />
    </>
  );
}
