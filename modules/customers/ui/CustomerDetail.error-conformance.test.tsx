import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomerDetail } from '@/modules/customers/ui/CustomerDetail';
import type { Customer } from '@/modules/customers/application/actions';
import type { QuoteListItem } from '@/modules/quotes/domain/quotes';
import type { InvoiceListItem } from '@/modules/invoices/domain/invoice';

const { deleteCustomerMock } = vi.hoisted(() => ({
  deleteCustomerMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/modules/customers/application/actions', () => ({
  deleteCustomer: deleteCustomerMock,
  updateCustomer: vi.fn(),
}));

const customer: Customer = {
  id: 'customer-1',
  name: 'Mark Johnson',
  email: 'mark@example.com',
  phone: null,
  emails: ['mark@example.com'],
  phones: [],
  company_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postcode: null,
  properties: [],
  billing_same_as_site: true,
  billing_address_line1: null,
  billing_address_line2: null,
  billing_city: null,
  billing_state: null,
  billing_postcode: null,
  notes: null,
  created_at: '2026-07-18T00:00:00.000Z',
};

describe('CustomerDetail error conformance', () => {
  it('uses shared status badges and canonical tones for quote and invoice lists', () => {
    const quote = {
      id: 'quote-1',
      quote_number: 'QUO-0012',
      title: 'Exterior repaint',
      status: 'rejected',
      created_at: '2026-07-17T00:00:00.000Z',
      total_cents: 123400,
    } as unknown as QuoteListItem;
    const invoice = {
      id: 'invoice-1',
      invoice_number: 'INV-0012',
      status: 'overdue',
      due_date: '2026-07-15',
      created_at: '2026-07-10T00:00:00.000Z',
      total_cents: 123400,
      quote_stage_label: null,
    } as unknown as InvoiceListItem;

    render(
      <CustomerDetail
        customer={customer}
        quotes={[quote]}
        invoices={[invoice]}
      />
    );

    expect(screen.getByRole('link', { name: 'mark@example.com' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );

    expect(screen.getByText('Rejected')).toHaveClass(
      'bg-error-container',
      'text-error'
    );
    expect(screen.getByText('Overdue')).toHaveClass(
      'bg-error-container',
      'text-error'
    );
    expect(screen.getByRole('link', { name: /QUO-0012/i })).toHaveClass(
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('link', { name: '+ New Quote' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );
  });

  it('uses focused rounded actions and ErrorAlert for delete failures', async () => {
    const user = userEvent.setup();
    deleteCustomerMock.mockResolvedValue({ error: 'Customer delete failed.' });

    render(<CustomerDetail customer={customer} />);

    expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass(
      'rounded-xl',
      'focus-visible:ring-2'
    );
    const deleteAction = screen.getByRole('button', { name: 'Delete' });
    expect(deleteAction).toHaveClass('rounded-xl', 'focus-visible:ring-2');

    await user.click(deleteAction);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      })
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Customer delete failed.');
    expect(alert).toHaveClass('rounded-xl', 'border-error/20');
  });
});
