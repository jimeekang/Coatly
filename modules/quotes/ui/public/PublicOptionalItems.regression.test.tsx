import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicOptionalItems } from './PublicOptionalItems';

const { setPublicQuoteOptionalLineItemSelectionMock } = vi.hoisted(() => ({
  setPublicQuoteOptionalLineItemSelectionMock: vi.fn(),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  setPublicQuoteOptionalLineItemSelection:
    setPublicQuoteOptionalLineItemSelectionMock,
}));

const items = [
  {
    id: 'line-1',
    name: 'Fence repaint',
    category: 'exterior',
    quantity: 1,
    unit: 'job',
    unit_price_cents: 30000,
    total_cents: 30000,
    notes: null,
    is_selected: false,
  },
];

function renderItems(onSelectionsChange = vi.fn()) {
  return {
    onSelectionsChange,
    ...render(
      <PublicOptionalItems
        quoteToken="quote-token"
        items={items}
        canEdit
        onSelectionsChange={onSelectionsChange}
      />
    ),
  };
}

describe('PublicOptionalItems regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a successful toggle selected after the transition settles', async () => {
    let resolveAction: (result: {
      error: string | null;
      selectedIds: string[];
    }) => void;
    setPublicQuoteOptionalLineItemSelectionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    const onSelectionsChange = vi.fn();
    const user = userEvent.setup();

    renderItems(onSelectionsChange);

    const optionButton = screen.getByRole('button', { name: /fence repaint/i });
    expect(optionButton).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByText('Other')).toHaveClass('font-bold', 'uppercase');

    await user.click(optionButton);
    expect(screen.getByText('Added')).toBeInTheDocument();

    resolveAction!({ error: null, selectedIds: ['line-1'] });

    await waitFor(() => expect(onSelectionsChange).toHaveBeenCalled());
    expect(screen.getByText('Added')).toBeInTheDocument();
  });

  it('rolls a failed toggle back to its previous selection', async () => {
    setPublicQuoteOptionalLineItemSelectionMock.mockResolvedValue({
      error: 'Selection failed',
      selectedIds: [],
    });
    const user = userEvent.setup();

    renderItems();

    await user.click(screen.getByRole('button', { name: /fence repaint/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Selection failed')
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.queryByText('Added')).not.toBeInTheDocument();
  });

  it('allows another toggle after refreshed props confirm the prior selection', async () => {
    setPublicQuoteOptionalLineItemSelectionMock
      .mockResolvedValueOnce({ error: null, selectedIds: ['line-1'] })
      .mockResolvedValueOnce({ error: null, selectedIds: [] });
    const user = userEvent.setup();
    const onSelectionsChange = vi.fn();
    const view = renderItems(onSelectionsChange);

    await user.click(screen.getByRole('button', { name: /fence repaint/i }));
    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument());

    view.rerender(
      <PublicOptionalItems
        quoteToken="quote-token"
        items={[{ ...items[0], is_selected: true }]}
        canEdit
        onSelectionsChange={onSelectionsChange}
      />
    );
    await user.click(screen.getByRole('button', { name: /fence repaint/i }));

    await waitFor(() =>
      expect(setPublicQuoteOptionalLineItemSelectionMock).toHaveBeenCalledTimes(
        2
      )
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.queryByText('Added')).not.toBeInTheDocument();
  });
});
