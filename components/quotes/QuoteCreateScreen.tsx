'use client';

import { useState, useTransition } from 'react';
import { generateAIDraft } from '@/app/actions/ai-drafts';
import { createQuote } from '@/app/actions/quotes';
import { saveQuoteTemplate } from '@/app/actions/quote-templates';
import {
  AIDraftPanel,
  type AIDraftPhotoAttachment,
} from '@/components/ai/AIDraftPanel';
import {
  QuoteForm,
  type QuoteFormDefaultValues,
} from '@/components/quotes/QuoteForm';
import { TemplatePicker } from '@/components/quotes/TemplatePicker';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { AIQuoteDraft } from '@/lib/ai/draft-types';
import type { QuoteCustomerOption } from '@/lib/quotes';
import type { UserRateSettings } from '@/lib/rate-settings';
import type { MaterialItem, QuoteCreateInput } from '@/lib/supabase/validators';
import type { QuoteAiIntakeSnapshotInput } from '@/types/quote';
import type {
  QuoteTemplate,
  QuoteTemplatePayload,
} from '@/app/actions/quote-templates';

type QuoteSubmitIntent = 'save' | 'send_email';

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function aiDraftTitle(draft: AIQuoteDraft, prompt: string) {
  const sectionTitle = draft.scope_sections[0]?.title?.trim();
  if (sectionTitle) return sectionTitle;

  const trimmedPrompt = prompt.trim();
  return trimmedPrompt.length > 80
    ? `${trimmedPrompt.slice(0, 77).trim()}...`
    : trimmedPrompt;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function buildAiIntakeSnapshot(
  draft: AIQuoteDraft,
  prompt: string,
  photos: AIDraftPhotoAttachment[]
): QuoteAiIntakeSnapshotInput {
  const photoRefs = photos.map((photo) => ({
    id: photo.id,
    description: photo.description ?? photo.name,
  }));

  return {
    job_type: draft.job_type,
    ...(draft.maintenance_job_pack
      ? { maintenance_job_pack: draft.maintenance_job_pack }
      : {}),
    provider: 'alibaba-qwen',
    model: 'qwen3-vl-flash',
    prompt_version: 'v1-task6-quote-form',
    input_json: {
      prompt,
      job_type: draft.job_type,
      maintenance_job_pack: draft.maintenance_job_pack,
      photo_count: photoRefs.length,
    },
    output_json: toRecord(draft),
    photo_refs: photoRefs,
    metadata: {
      questions_for_user_count: draft.questions_for_user.length,
      assumptions_count: draft.assumptions.length,
      photo_count: photoRefs.length,
    },
  };
}

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
  const [photos, setPhotos] = useState<AIDraftPhotoAttachment[]>([]);
  const [draft, setDraft] = useState<AIQuoteDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Template state
  const [templateDefault, setTemplateDefault] =
    useState<QuoteTemplatePayload | null>(null);
  const [pendingSavePayload, setPendingSavePayload] =
    useState<QuoteCreateInput | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(
    null
  );
  const [isSavingTemplate, startSaveTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      setError(null);

      const result = await generateAIDraft({
        entity: 'quote',
        prompt,
        photo_refs: photos.map((photo) => ({
          id: photo.id,
          url: photo.dataUrl,
          description: photo.description ?? photo.name,
        })),
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
      setWarnings([
        ...result.data.warnings,
        ...result.data.quote.questions_for_user.map((question) => question.question),
      ]);
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

  async function handleSubmit(
    data: QuoteCreateInput,
    intent: QuoteSubmitIntent = 'save'
  ) {
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
      job_type: pendingSavePayload.job_type,
      complexity: pendingSavePayload.complexity,
      labour_margin_percent: pendingSavePayload.labour_margin_percent,
      material_margin_percent: pendingSavePayload.material_margin_percent,
      notes: pendingSavePayload.notes,
      internal_notes: pendingSavePayload.internal_notes,
      working_days: pendingSavePayload.working_days,
      rooms: pendingSavePayload.rooms,
      scope_sections: pendingSavePayload.scope_sections,
      clause_items: pendingSavePayload.clause_items,
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

  const formDefaultValues: QuoteFormDefaultValues | undefined = draft
    ? {
        customer_id: initialCustomerId ?? '',
        title: aiDraftTitle(draft, prompt),
        status: 'draft' as const,
        valid_until: defaultValidUntil(),
        working_days: 1,
        complexity: 'standard' as const,
        labour_margin_percent: 0,
        material_margin_percent: 0,
        notes: draft.assumptions.join('\n'),
        internal_notes: draft.questions_for_user
          .map((question) => question.question)
          .join('\n'),
        rooms: [],
        job_type: draft.job_type,
        scope_sections: draft.scope_sections,
        clause_items: draft.clauses,
        ai_intake_snapshot: buildAiIntakeSnapshot(draft, prompt, photos),
      }
    : templateDefault
      ? {
          customer_id: initialCustomerId ?? '',
          title: templateDefault.title ?? '',
          status: 'draft' as const,
          valid_until: '',
          working_days: templateDefault.working_days ?? 1,
          complexity: templateDefault.complexity,
          labour_margin_percent: templateDefault.labour_margin_percent,
          material_margin_percent: templateDefault.material_margin_percent,
          notes: templateDefault.notes ?? '',
          internal_notes: templateDefault.internal_notes ?? '',
          rooms: [],
          job_type: templateDefault.job_type,
          scope_sections:
            templateDefault.scope_sections as QuoteFormDefaultValues['scope_sections'],
          clause_items:
            templateDefault.clause_items as QuoteFormDefaultValues['clause_items'],
        }
      : initialCustomerId
        ? {
            customer_id: initialCustomerId,
            title: '',
            status: 'draft' as const,
            valid_until: '',
            working_days: 1,
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
          photos={photos}
          maxPhotos={3}
          pending={isPending}
          error={error}
          summary={summary}
          warnings={warnings}
          onPromptChange={setPrompt}
          onPhotosChange={setPhotos}
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
        <div className="border-outline-variant bg-surface-container-lowest mt-6 rounded-xl border p-5">
          <p className="text-on-surface text-sm font-semibold">
            Save this quote as a template?
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            Reuse the rooms, margins, and line items next time.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. 2-bed interior standard)"
              className="border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:ring-primary/30 min-h-11 flex-1 rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate || !templateName.trim()}
                className="bg-primary text-on-primary inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5"
              >
                {isSavingTemplate ? 'Saving…' : 'Save Template'}
              </button>
              <button
                type="button"
                onClick={() => setPendingSavePayload(null)}
                className="border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-outline-variant inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors sm:px-5"
              >
                Skip
              </button>
            </div>
          </div>
          {saveTemplateError && (
            <p className="text-error mt-2 text-xs">{saveTemplateError}</p>
          )}
        </div>
      )}
    </>
  );
}
