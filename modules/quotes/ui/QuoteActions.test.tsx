import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteActions } from '@/modules/quotes/ui/QuoteActions';

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

vi.mock('@/modules/quotes/application/actions', () => ({
  approveQuote: approveQuoteMock,
  duplicateQuote: duplicateQuoteMock,
}));

vi.mock('@/modules/jobs/application/actions', () => ({
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

  it('opens the quote PDF in a separate downloadable tab', () => {
    render(
      <QuoteActions
        quoteId="quote-1"
        quoteNumber="QUO-0010"
        status="sent"
        publicQuoteUrl={null}
      />
    );

    const pdfLink = screen.getByRole('link', { name: 'PDF' });

    expect(pdfLink).toHaveAttribute('href', '/api/pdf/quote?id=quote-1');
    expect(pdfLink).toHaveAttribute('target', '_blank');
    expect(pdfLink).toHaveAttribute('rel', 'noreferrer');
    expect(pdfLink).toHaveAttribute('download', 'quote-QUO-0010.pdf');
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
