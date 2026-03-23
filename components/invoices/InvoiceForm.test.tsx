import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';

const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

describe('InvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a DB-compatible payload from the filled form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

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
        quotes={[
          {
            id: 'quote-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0004',
            title: 'Cafe repaint',
            total_cents: 423500,
            status: 'draft',
            valid_until: '2026-04-14',
          },
        ]}
        onSubmit={onSubmit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    await user.selectOptions(screen.getByLabelText(/Linked Quote/), 'quote-1');
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: '2026-04-03' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Deposit invoice' },
    });
    fireEvent.change(screen.getByLabelText('Unit Price (A$)'), {
      target: { value: '250' },
    });
    fireEvent.change(screen.getByPlaceholderText('Add a payment note or job summary'), {
      target: { value: 'Pay within 7 days' },
    });
    await user.click(screen.getByRole('button', { name: 'Save Invoice' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      customer_id: 'customer-1',
      quote_id: 'quote-1',
      invoice_type: 'full',
      status: 'draft',
      due_date: '2026-04-03',
      notes: 'Pay within 7 days',
      line_items: [
        {
          description: 'Deposit invoice',
          quantity: 1,
          unit_price_cents: 25000,
        },
      ],
    });
  });

  it('shows customer snapshot after selecting a customer', async () => {
    const user = userEvent.setup();

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
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');

    expect(screen.getByText('Customer Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Harbor Cafe').length).toBeGreaterThan(0);
    expect(screen.getByText('sarah@example.com')).toBeInTheDocument();
  });
});
