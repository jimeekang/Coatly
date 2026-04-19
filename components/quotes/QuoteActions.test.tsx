import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteActions } from '@/components/quotes/QuoteActions';

const { pushMock, approveQuoteMock, duplicateQuoteMock, createJobFromQuoteMock } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    approveQuoteMock: vi.fn(),
    duplicateQuoteMock: vi.fn(),
    createJobFromQuoteMock: vi.fn(),
  })
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/app/actions/quotes', () => ({
  approveQuote: approveQuoteMock,
  duplicateQuote: duplicateQuoteMock,
}));

vi.mock('@/app/actions/jobs', () => ({
  createJobFromQuote: createJobFromQuoteMock,
}));

describe('QuoteActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approveQuoteMock.mockResolvedValue(undefined);
    duplicateQuoteMock.mockResolvedValue(undefined);
    createJobFromQuoteMock.mockResolvedValue({
      error: null,
      jobId: 'job-1',
      existing: false,
    });
  });

  it('allows manual approval without signature from More menu', async () => {
    const user = userEvent.setup();

    render(
      <QuoteActions
        quoteId="quote-1"
        quoteNumber="QUO-0010"
        status="draft"
        publicQuoteUrl={null}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Approve without signature' }));

    await waitFor(() => {
      expect(approveQuoteMock).toHaveBeenCalledWith('quote-1');
    });
  });

  it('approves then converts to job from More menu when quote is not approved yet', async () => {
    const user = userEvent.setup();

    render(
      <QuoteActions
        quoteId="quote-2"
        quoteNumber="QUO-0011"
        status="sent"
        publicQuoteUrl={null}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Approve and convert to job' }));

    await waitFor(() => {
      expect(approveQuoteMock).toHaveBeenCalledWith('quote-2');
      expect(createJobFromQuoteMock).toHaveBeenCalledWith('quote-2');
      expect(pushMock).toHaveBeenCalledWith('/jobs');
    });
  });
});
