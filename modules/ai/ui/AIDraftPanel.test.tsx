import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIDraftPanel } from '@/modules/ai/ui/AIDraftPanel';

describe('AIDraftPanel', () => {
  it('shows a compact AI draft and deterministic pricing disclosure', () => {
    render(
      <AIDraftPanel
        entityLabel="Quote"
        prompt=""
        placeholder="Describe the job"
        examples={[]}
        pending={false}
        error={null}
        summary={null}
        warnings={[]}
        onPromptChange={vi.fn()}
        onGenerate={vi.fn()}
        onApply={vi.fn()}
        canApply={false}
      />,
    );

    expect(
      screen.getByText(/AI drafts scope and questions only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Prices stay tied to your saved rates/i),
    ).toBeInTheDocument();
  });
});
