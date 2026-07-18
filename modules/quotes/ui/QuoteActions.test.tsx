import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteActions } from '@/modules/quotes/ui/QuoteActions';

const {
  pushMock,
  approveQuoteMock,
  duplicateQuoteMock,
  sendQuoteToClientMock,
  createJobFromQuoteMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  approveQuoteMock: vi.fn(),
  duplicateQuoteMock: vi.fn(),
  sendQuoteToClientMock: vi.fn(),
  createJobFromQuoteMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  approveQuote: approveQuoteMock,
  duplicateQuote: duplicateQuoteMock,
  sendQuoteToClient: sendQuoteToClientMock,
}));

describe('QuoteActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approveQuoteMock.mockResolvedValue(undefined);
    duplicateQuoteMock.mockResolvedValue(undefined);
    sendQuoteToClientMock.mockResolvedValue(undefined);
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
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(
      screen.getByRole('button', { name: 'Approve without signature' })
    );

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
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
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
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(
      screen.getByRole('button', { name: 'Approve and convert to job' })
    );

    await waitFor(() => {
      expect(approveQuoteMock).toHaveBeenCalledWith('quote-2');
      expect(createJobFromQuoteMock).toHaveBeenCalledWith('quote-2');
      expect(pushMock).toHaveBeenCalledWith('/jobs');
    });
  });

  it('sends a draft quote directly from the detail actions', async () => {
    const user = userEvent.setup();

    render(
      <QuoteActions
        quoteId="quote-draft"
        quoteNumber="QUO-0012"
        status="draft"
        publicQuoteUrl={null}
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Send to Client' }));

    await waitFor(() => {
      expect(sendQuoteToClientMock).toHaveBeenCalledWith('quote-draft');
    });
  });

  it('uses the canonical primary treatment for draft sending', () => {
    render(
      <QuoteActions
        quoteId="quote-draft"
        quoteNumber="QUO-0012"
        status="draft"
        publicQuoteUrl={null}
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    expect(screen.getByRole('button', { name: 'Send to Client' })).toHaveClass(
      'bg-primary'
    );
  });

  it('resends a sent quote directly from the detail actions', async () => {
    const user = userEvent.setup();

    render(
      <QuoteActions
        quoteId="quote-sent"
        quoteNumber="QUO-0013"
        status="sent"
        publicQuoteUrl={null}
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Resend to Client' }));

    await waitFor(() => {
      expect(sendQuoteToClientMock).toHaveBeenCalledWith('quote-sent');
    });
  });

  it('disables detail sending when the quote has no customer email', () => {
    render(
      <QuoteActions
        quoteId="quote-no-email"
        quoteNumber="QUO-0014"
        status="draft"
        publicQuoteUrl={null}
        recipientEmail={null}
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Send to Client' })
    ).toBeDisabled();
  });

  it('opens an accessible delete dialog and closes it with Escape', async () => {
    const user = userEvent.setup();

    render(
      <QuoteActions
        quoteId="quote-1"
        quoteNumber="QUO-0010"
        status="draft"
        publicQuoteUrl={null}
        recipientEmail="client@example.com"
        convertQuoteToJobAction={createJobFromQuoteMock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(
      screen.getByRole('dialog', { name: 'Delete Quote?' })
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Delete Quote?' })
    ).not.toBeInTheDocument();
  });
});
