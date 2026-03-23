'use client';

import { useState, useTransition } from 'react';
import { generateAIDraft } from '@/app/actions/ai-drafts';
import { AIDraftPanel } from '@/components/ai/AIDraftPanel';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { AICustomerDraft } from '@/lib/ai/draft-types';

export function CustomerCreateScreen({ canUseAI }: { canUseAI: boolean }) {
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
      ) : (
        <div className="mb-6">
          <UpgradePrompt
            title="AI customer drafting is available on Pro"
            description="Starter includes manual customer management. Upgrade to Pro to turn a quick note into a structured customer draft."
          />
        </div>
      )}

      <CustomerForm key={resetKey} defaultValues={draft ?? undefined} />
    </>
  );
}
