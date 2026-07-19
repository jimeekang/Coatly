import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyQuickQuoteState,
  QuickQuoteBuilder,
} from '@/modules/quotes/ui/QuickQuoteBuilder';
import { TemplatePicker } from '@/modules/quotes/ui/TemplatePicker';
import type {
  QuoteTemplate,
  QuoteTemplatePayload,
} from '@/modules/quotes/application/template-actions';

vi.mock('@/modules/quotes/application/template-actions', () => ({
  deleteQuoteTemplate: vi.fn(),
}));

const TEMPLATE: QuoteTemplate = {
  id: 'template-1',
  name: 'Standard repaint',
  payload: {} as QuoteTemplatePayload,
  created_at: '2026-04-01T00:00:00.000Z',
};

describe('quote UI control normalization', () => {
  it('keeps quick-room inputs and actions on the canonical control contract', async () => {
    const user = userEvent.setup();

    function Harness() {
      const state = createEmptyQuickQuoteState();
      return <QuickQuoteBuilder value={state} onChange={vi.fn()} />;
    }

    const { rerender } = render(<Harness />);
    const addBedroom = screen.getByRole('button', { name: /Bedroom/i });
    expect(addBedroom).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );

    const state = createEmptyQuickQuoteState();
    const onChange = vi.fn();
    rerender(<QuickQuoteBuilder value={state} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Bedroom/i }));
    const nextState = onChange.mock.calls[0][0];
    rerender(<QuickQuoteBuilder value={nextState} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Room name')).toHaveClass(
      'h-12',
      'rounded-xl',
      'text-base',
      'focus:ring-2'
    );
    expect(screen.getByRole('button', { name: 'Remove room' })).toHaveClass(
      'h-11',
      'w-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );
  });

  it('uses canonical template disclosure and row actions', async () => {
    const user = userEvent.setup();
    render(<TemplatePicker templates={[TEMPLATE]} onApply={vi.fn()} />);

    const disclosure = screen.getByRole('button', {
      name: 'Start from a saved template',
    });
    expect(disclosure).toHaveClass(
      'h-12',
      'rounded-xl',
      'text-base',
      'focus-visible:ring-2'
    );

    await user.click(disclosure);
    expect(
      screen.getByRole('button', { name: 'Standard repaint' })
    ).toHaveClass('min-h-11', 'rounded-xl', 'focus-visible:ring-2');
  });
});
