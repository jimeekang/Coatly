import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIDraftPanel } from '@/modules/ai/ui/AIDraftPanel';

describe('AIDraftPanel', () => {
  it('shows a compact AI draft and deterministic pricing disclosure', () => {
    const { container } = render(
      <AIDraftPanel
        entityLabel="Quote"
        prompt=""
        placeholder="Describe the job"
        examples={['Paint a two-bedroom unit']}
        pending={false}
        error={null}
        summary="Draft ready"
        warnings={[]}
        onPromptChange={vi.fn()}
        onGenerate={vi.fn()}
        onApply={vi.fn()}
        canApply={false}
      />
    );

    expect(
      screen.getByText(/AI drafts scope and questions only/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Prices stay tied to your saved rates/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the job')).toHaveClass(
      'text-base',
      'rounded-xl',
      'focus:ring-2'
    );
    expect(
      screen.getByRole('button', { name: 'Paint a two-bedroom unit' })
    ).toHaveClass('min-h-11', 'rounded-xl', 'focus-visible:ring-2');
    expect(container.querySelectorAll('.rounded-2xl').length).toBeGreaterThan(
      1
    );
  });
});
