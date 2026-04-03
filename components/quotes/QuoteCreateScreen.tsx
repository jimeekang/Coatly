'use client';

import { useState, useTransition } from 'react';
import { generateAIDraft } from '@/app/actions/ai-drafts';
import { createQuote } from '@/app/actions/quotes';
import { AIDraftPanel } from '@/components/ai/AIDraftPanel';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { AIQuoteDraft } from '@/lib/ai/draft-types';
import type { QuoteCustomerOption } from '@/lib/quotes';
import type { UserRateSettings } from '@/lib/rate-settings';

export function QuoteCreateScreen({
  customers,
  canUseAI,
  rateSettings,
}: {
  customers: QuoteCustomerOption[];
  canUseAI: boolean;
  rateSettings?: UserRateSettings | null;
}) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AIQuoteDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      setError(null);

      const result = await generateAIDraft({
        entity: 'quote',
        prompt,
      });

      if (result.error || !result.data?.quote) {
        setDraft(null);
        setSummary(null);
        setWarnings([]);
        setError(result.error ?? 'Quote draft could not be prepared.');
        return;
      }

      setDraft(result.data.quote);
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
          entityLabel="Quote"
          prompt={prompt}
          placeholder="Example: Create a standard-complexity quote for Sarah Johnson at Harbor Cafe, living room and ceiling repaint, valid for 14 days, include prep notes and internal timing note."
          examples={[
            'Standard-complexity quote for Harbor Cafe interior repaint',
            'Quote for living room walls and ceiling repaint in Bondi',
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
            title="AI quote drafting is available on Pro"
            description="Starter keeps manual quote building. Upgrade to Pro to turn a plain-English prompt into a quote draft you can review and save."
          />
        </div>
      )}

      <QuoteForm
        key={resetKey}
        customers={customers}
        rateSettings={rateSettings}
        defaultValues={
          draft
            ? {
                customer_id: draft.customer_id ?? '',
                title: draft.title,
                status: draft.status,
                valid_until: draft.valid_until,
                complexity: draft.complexity,
                labour_margin_percent: draft.labour_margin_percent,
                material_margin_percent: draft.material_margin_percent,
                notes: draft.notes,
                internal_notes: draft.internal_notes,
                rooms: draft.rooms,
              }
            : undefined
        }
        onSubmit={createQuote}
      />
    </>
  );
}

