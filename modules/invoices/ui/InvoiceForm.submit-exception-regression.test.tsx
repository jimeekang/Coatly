import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceForm } from '@/modules/invoices/ui/InvoiceForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

describe('InvoiceForm submission exception handling', () => {
  it('shows the rejected action error and exits the saving state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invoice service unavailable.'));

    render(
      <InvoiceForm
        customers={[
          {
            id: 'customer-1',
            name: 'Sarah Johnson',
            company_name: 'Harbor Cafe',
            email: 'sarah@example.com',
            phone: '0412 555 012',
            address: '128 Beach Street, Manly, NSW 2095',
          },
        ]}
        quotes={[]}
        onSubmit={onSubmit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Final invoice' },
    });
    fireEvent.change(screen.getByLabelText('Unit price (A$)'), {
      target: { value: '550' },
    });
    await user.click(screen.getByRole('button', { name: 'Save Invoice' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invoice service unavailable.');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Invoice' })).toBeEnabled();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
