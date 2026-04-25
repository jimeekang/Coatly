'use client';

import { useState, useTransition } from 'react';
import { generateAIDraft } from '@/app/actions/ai-drafts';
import { createQuote } from '@/app/actions/quotes';
import { saveQuoteTemplate } from '@/app/actions/quote-templates';
import { AIDraftPanel } from '@/components/ai/AIDraftPanel';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { TemplatePicker } from '@/components/quotes/TemplatePicker';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { AIQuoteDraft } from '@/lib/ai/draft-types';
import type { QuoteCustomerOption } from '@/lib/quotes';
import type { UserRateSettings } from '@/lib/rate-settings';
import type { MaterialItem, QuoteCreateInput } from '@/lib/supabase/validators';
import type { QuoteTemplate, QuoteTemplatePayload } from '@/app/actions/quote-templates';

type QuoteSubmitIntent = 'save' | 'send_email';

export function QuoteCreateScreen({
  customers,
  canUseAI,
  quoteNumberPreview,
  rateSettings,
  libraryItems = [],
  templates = [],
  initialCustomerId,
}: {
  customers: QuoteCustomerOption[];
  canUseAI: boolean;
  quoteNumberPreview?: string;
  rateSettings?: UserRateSettings | null;
  libraryItems?: MaterialItem[];
  templates?: QuoteTemplate[];
  initialCustomerId?: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AIQuoteDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Template state
  const [templateDefault, setTemplateDefault] = useState<QuoteTemplatePayload | null>(null);
  const [pendingSavePayload, setPendingSavePayload] = useState<QuoteCreateInput | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [isSavingTemplate, startSaveTransition] = useTransition();

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

  function handleApplyTemplate(payload: QuoteTemplatePayload) {
    setTemplateDefault(payload);
    setDraft(null);
    setResetKey((current) => current + 1);
  }

  async function handleSubmit(data: QuoteCreateInput, intent: QuoteSubmitIntent = 'save') {
    const result = await createQuote(data, { submitIntent: intent });
    if (!result?.error) {
      // Offer to save as template after successful submission
      setPendingSavePayload(data);
    }
    return result;
  }

  function handleSaveTemplate() {
    if (!pendingSavePayload) return;
    setSaveTemplateError(null);

    const payload: QuoteTemplatePayload = {
      title: pendingSavePayload.title,
      complexity: pendingSavePayload.complexity,
      labour_margin_percent: pendingSavePayload.labour_margin_percent,
      material_margin_percent: pendingSavePayload.material_margin_percent,
      notes: pendingSavePayload.notes,
      internal_notes: pendingSavePayload.internal_notes,
      rooms: pendingSavePayload.rooms,
      line_items: pendingSavePayload.line_items,
    };

    startSaveTransition(async () => {
      const result = await saveQuoteTemplate(templateName, payload);
      if (result.error) {
        setSaveTemplateError(result.error);
      } else {
        setPendingSavePayload(null);
        setTemplateName('');
      }
    });
  }

  const formDefaultValues =
    draft
      ? {
          customer_id: draft.customer_id ?? initialCustomerId ?? '',
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
      : templateDefault
        ? {
            customer_id: initialCustomerId ?? '',
            title: templateDefault.title ?? '',
            status: 'draft' as const,
            valid_until: '',
            complexity: templateDefault.complexity,
            labour_margin_percent: templateDefault.labour_margin_percent,
            material_margin_percent: templateDefault.material_margin_percent,
            notes: templateDefault.notes ?? '',
            internal_notes: templateDefault.internal_notes ?? '',
            rooms: [],
          }
        : initialCustomerId
          ? {
              customer_id: initialCustomerId,
              title: '',
              status: 'draft' as const,
              valid_until: '',
              notes: '',
              internal_notes: '',
              rooms: [],
            }
          : undefined;

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

      <TemplatePicker templates={templates} onApply={handleApplyTemplate} />

      <QuoteForm
        key={resetKey}
        customers={customers}
        quoteNumberPreview={quoteNumberPreview}
        rateSettings={rateSettings}
        libraryItems={libraryItems}
        defaultValues={formDefaultValues}
        onSubmit={handleSubmit}
        showSendQuoteButton
      />

      {/* Save as Template prompt — shown after a successful quote submission */}
      {pendingSavePayload && (
        <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <p className="text-sm font-semibold text-on-surface">Save this quote as a template?</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Reuse the rooms, margins, and line items next time.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. 2-bed interior standard)"
              className="h-12 flex-1 rounded-lg border border-outline-variant px-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="h-12 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {isSavingTemplate ? 'Saving…' : 'Save Template'}
            </button>
            <button
              type="button"
              onClick={() => setPendingSavePayload(null)}
              className="h-12 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Skip
            </button>
          </div>
          {saveTemplateError && (
            <p className="mt-2 text-xs text-error">{saveTemplateError}</p>
          )}
        </div>
      )}
    </>
  );
}
