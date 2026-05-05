import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIDraftPanel } from '@/components/ai/AIDraftPanel';

describe('AIDraftPanel', () => {
  it('shows a compact AI context and review disclosure', () => {
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
      screen.getByText(/AI may use business, customer, and job context/i),
    ).toBeInTheDocument();
  });
});
