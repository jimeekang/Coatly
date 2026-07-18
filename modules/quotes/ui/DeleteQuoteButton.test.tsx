import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteQuoteButton } from '@/modules/quotes/ui/DeleteQuoteButton';

const { deleteQuoteMock } = vi.hoisted(() => ({
  deleteQuoteMock: vi.fn(),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  deleteQuote: deleteQuoteMock,
}));

describe('DeleteQuoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the accessible confirmation flow and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<DeleteQuoteButton quoteId="quote-1" quoteNumber="QUO-0010" />);

    const trigger = screen.getByRole('button', { name: 'Delete Quote' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Delete Quote?' });
    expect(dialog).toHaveAccessibleDescription(
      'QUO-0010 will be permanently deleted. This cannot be undone.'
    );

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('locks dismissal while deleting and shows action errors inline', async () => {
    const user = userEvent.setup();
    let resolveDelete: ((result: { error: string }) => void) | undefined;
    deleteQuoteMock.mockImplementation(
      () =>
        new Promise<{ error: string }>((resolve) => {
          resolveDelete = resolve;
        })
    );

    render(<DeleteQuoteButton quoteId="quote-1" quoteNumber="QUO-0010" />);
    await user.click(screen.getByRole('button', { name: 'Delete Quote' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete Quote' }));

    expect(
      await screen.findByRole('button', { name: 'Deleting…' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('dialog', { name: 'Delete Quote?' })
    ).toBeInTheDocument();

    const backdrop = screen.getByRole('dialog', {
      name: 'Delete Quote?',
    }).previousElementSibling;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(
      screen.getByRole('dialog', { name: 'Delete Quote?' })
    ).toBeInTheDocument();

    resolveDelete?.({ error: 'Quote could not be deleted.' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Quote could not be deleted.'
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Yes, Delete Quote' })
      ).toBeEnabled()
    );
  });
});
