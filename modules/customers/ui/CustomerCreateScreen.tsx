'use client';

import { useState, useTransition, type ComponentType } from 'react';
import { CustomerForm } from '@/modules/customers/ui/CustomerForm';
import type {
  AICustomerDraft,
  WorkspaceDraftEntity,
  WorkspaceDraftResult,
} from '@/modules/ai/domain/draft-types';

/**
 * AIDraftPanel and UpgradePrompt are injected by the composition layer
 * (app/(dashboard)/customers/new/page.tsx) so this screen carries no runtime
 * coupling to the ai/ui or billing/ui modules. The prop shapes are defined
 * locally to match exactly what this screen passes to each component.
 */
type AIDraftPanelComponent = ComponentType<{
  entityLabel: string;
  prompt: string;
  placeholder: string;
  examples: string[];
  pending: boolean;
  error: string | null;
  summary: string | null;
  warnings: string[];
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onApply: () => void;
  canApply: boolean;
}>;

type UpgradePromptComponent = ComponentType<{
  title: string;
  description: string;
}>;

export function CustomerCreateScreen({
  canUseAI,
  showAIUpgrade = true,
  generateAIDraft,
  AIDraftPanel,
  UpgradePrompt,
}: {
  canUseAI: boolean;
  showAIUpgrade?: boolean;
  AIDraftPanel: AIDraftPanelComponent;
  UpgradePrompt: UpgradePromptComponent;
  generateAIDraft: (input: {
    entity: WorkspaceDraftEntity;
    prompt: string;
  }) => Promise<{ data: WorkspaceDraftResult | null; error: string | null }>;
}) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AICustomerDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      setError(null);

      const result = await generateAIDraft({
        entity: 'customer',
        prompt,
      });

      if (result.error || !result.data?.customer) {
        setDraft(null);
        setSummary(null);
        setWarnings([]);
        setError(result.error ?? 'Customer draft could not be prepared.');
        return;
      }

      setDraft(result.data.customer);
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
          entityLabel="Customer"
          prompt={prompt}
          placeholder="Example: Add Sarah Johnson from Harbor Cafe in Manly. Email is sarah@harborcafe.com.au, phone 0412 555 012, 128 Beach Street, Manly NSW 2095, note that she prefers work before 9am."
          examples={[
            'Add Sarah Johnson from Harbor Cafe in Manly',
            'New client for a townhouse repaint in Bondi',
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
      ) : showAIUpgrade ? (
        <div className="mb-6">
          <UpgradePrompt
            title="AI customer drafting is available on Pro"
            description="Starter includes manual customer management. Upgrade to Pro to turn a quick note into a structured customer draft."
          />
        </div>
      ) : null}

      <CustomerForm key={resetKey} defaultValues={draft ?? undefined} />
    </>
  );
}
