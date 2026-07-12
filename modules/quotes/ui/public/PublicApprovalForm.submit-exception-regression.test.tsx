import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicApprovalForm } from './PublicApprovalForm';

const { approvePublicQuoteMock, refreshMock } = vi.hoisted(() => ({
  approvePublicQuoteMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  approvePublicQuote: approvePublicQuoteMock,
  rejectPublicQuote: vi.fn(),
}));

vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange('Alex Harper')}>
      Add signature
    </button>
  ),
}));

describe('PublicApprovalForm submission exceptions', () => {
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

    expect(await screen.findByText('Approval service unavailable.')).toBeVisible();
    await waitFor(() => expect(approveButton).toBeEnabled());
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
