import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuplicateQuoteButton } from '@/modules/quotes/ui/DuplicateQuoteButton';

const { duplicateQuote } = vi.hoisted(() => ({
  duplicateQuote: vi.fn(),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  duplicateQuote,
}));

describe('DuplicateQuoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows duplicate failures inline without opening a native alert', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    duplicateQuote.mockResolvedValue({
      error: 'Quote could not be duplicated.',
    });

    render(<DuplicateQuoteButton quoteId="quote-1" variant="icon" />);

    await user.click(screen.getByRole('button', { name: 'Duplicate quote' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Quote could not be duplicated.'
      )
    );
    expect(duplicateQuote).toHaveBeenCalledWith('quote-1');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
