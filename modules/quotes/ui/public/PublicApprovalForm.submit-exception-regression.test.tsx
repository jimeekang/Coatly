import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicApprovalForm } from './PublicApprovalForm';

const { approvePublicQuoteMock, rejectPublicQuoteMock, refreshMock } =
  vi.hoisted(() => ({
    approvePublicQuoteMock: vi.fn(),
    rejectPublicQuoteMock: vi.fn(),
    refreshMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  approvePublicQuote: approvePublicQuoteMock,
  rejectPublicQuote: rejectPublicQuoteMock,
}));

vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange('Alex Harper')}>
      Add signature
    </button>
  ),
}));

describe('PublicApprovalForm submission exceptions', () => {
  it('uses the public form field and action accessibility contract', () => {
    render(
      <PublicApprovalForm
        quoteToken="quote-token"
        canApprove
        approvalHelperText=""
        approvedAt={null}
        approvedByName={null}
        approvedByEmail={null}
        approvalSignature={null}
        customerName="Alex Harper"
        customerEmail="alex@example.com"
        formatDate={(value) => value}
      />
    );

    expect(screen.getByText('Your Name')).toHaveClass('font-bold', 'uppercase');
    expect(screen.getByRole('textbox', { name: 'Your Name' })).toHaveClass(
      'min-h-12',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('button', { name: 'Approve Quote' })).toHaveClass(
      'min-h-14',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('button', { name: 'Decline Quote' })).toHaveClass(
      'min-h-14',
      'rounded-xl',
      'focus-visible:ring-2'
    );
  });

  it('shows a rejected approval error and allows retrying', async () => {
    approvePublicQuoteMock.mockRejectedValue(
      new Error('Approval service unavailable.')
    );
    const user = userEvent.setup();

    render(
      <PublicApprovalForm
        quoteToken="quote-token"
        canApprove
        approvalHelperText=""
        approvedAt={null}
        approvedByName={null}
        approvedByEmail={null}
        approvalSignature={null}
        customerName="Alex Harper"
        customerEmail="alex@example.com"
        formatDate={(value) => value}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add signature' }));
    const approveButton = screen.getByRole('button', { name: 'Approve Quote' });
    await user.click(approveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Approval service unavailable.'
    );
    await waitFor(() => expect(approveButton).toBeEnabled());
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('requires confirmation before declining a quote', async () => {
    rejectPublicQuoteMock.mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <PublicApprovalForm
        quoteToken="quote-token"
        canApprove
        approvalHelperText=""
        approvedAt={null}
        approvedByName={null}
        approvedByEmail={null}
        approvalSignature={null}
        customerName="Alex Harper"
        customerEmail="alex@example.com"
        formatDate={(value) => value}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Decline Quote' }));

    expect(rejectPublicQuoteMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Decline this quote?' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Decline quote' }));

    await waitFor(() => expect(rejectPublicQuoteMock).toHaveBeenCalledTimes(1));
    expect(refreshMock).toHaveBeenCalled();
  });
});
