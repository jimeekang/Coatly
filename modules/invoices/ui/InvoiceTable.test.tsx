import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceTable } from '@/modules/invoices/ui/InvoiceTable';

const { markInvoiceAsPaidMock } = vi.hoisted(() => ({
  markInvoiceAsPaidMock: vi.fn(),
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  markInvoiceAsPaid: markInvoiceAsPaidMock,
}));

describe('InvoiceTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers a 44px new-invoice action in the initial empty state', () => {
    render(<InvoiceTable invoices={[]} />);

    const newInvoiceLink = screen.getByRole('link', { name: '+ New Invoice' });
    expect(newInvoiceLink).toHaveAttribute('href', '/invoices/new');
    expect(newInvoiceLink).toHaveClass(
      'min-h-11',
      'bg-primary',
      'text-on-primary'
    );
  });

  it('filters invoices by search query and status', () => {
    render(
      <InvoiceTable
        invoices={[
          {
            id: 'invoice-1',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_id: 'quote-1',
            invoice_number: 'INV-0012',
            status: 'sent',
            invoice_type: 'deposit',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            amount_paid_cents: 0,
            business_abn: null,
            payment_terms: null,
            bank_details: null,
            due_date: '2026-04-10',
            paid_date: null,
            paid_at: null,
            payment_method: null,
            notes: null,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Mark Johnson',
              email: 'mark@example.com',
              phone: '0412 555 012',
              address: 'Bondi, NSW',
            },
            balance_cents: 110000,
            line_item_count: 1,
            quote_stage_label: '1/3',
          },
          {
            id: 'invoice-2',
            user_id: 'user-1',
            customer_id: 'customer-2',
            quote_id: null,
            invoice_number: 'INV-0013',
            status: 'paid',
            invoice_type: 'final',
            subtotal_cents: 200000,
            gst_cents: 20000,
            total_cents: 220000,
            amount_paid_cents: 220000,
            business_abn: null,
            payment_terms: null,
            bank_details: null,
            due_date: '2026-04-15',
            paid_date: '2026-04-12',
            paid_at: '2026-04-12T00:00:00.000Z',
            payment_method: 'bank_transfer',
            notes: null,
            created_at: '2026-03-02T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
            customer: {
              id: 'customer-2',
              name: 'Shara Adams',
              email: 'shara@example.com',
              phone: '0413 555 013',
              address: 'Manly, NSW',
            },
            balance_cents: 0,
            line_item_count: 2,
            quote_stage_label: null,
          },
        ]}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search by invoice/i), {
      target: { value: 'Mark' },
    });

    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveClass(
      'h-11',
      'w-11'
    );

    expect(screen.getAllByText('INV-0012').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0013')).not.toBeInTheDocument();

    // Status filter chips replace the old dropdown — click the 'Paid' chip
    fireEvent.click(screen.getByRole('button', { name: 'Paid' }));

    expect(
      screen.getByText('No invoices match this search.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear search and filters' })
    ).toHaveClass('min-h-11');

    fireEvent.change(screen.getByPlaceholderText(/Search by invoice/i), {
      target: { value: '' },
    });

    expect(screen.getAllByText('INV-0013').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0012')).not.toBeInTheDocument();
  });

  it('uses the canonical status badge tone for invoice cards', () => {
    render(
      <InvoiceTable
        invoices={[
          {
            id: 'invoice-overdue',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_id: null,
            invoice_number: 'INV-OVERDUE',
            status: 'overdue',
            invoice_type: 'final',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            amount_paid_cents: 0,
            business_abn: null,
            payment_terms: null,
            bank_details: null,
            due_date: '2026-04-01',
            paid_date: null,
            paid_at: null,
            payment_method: null,
            notes: null,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Mark Johnson',
              email: 'mark@example.com',
              phone: null,
              address: 'Bondi, NSW',
            },
            balance_cents: 110000,
            line_item_count: 1,
            quote_stage_label: null,
          },
        ]}
      />
    );

    const overdueBadge = screen
      .getAllByText('Overdue')
      .find((element) => element.tagName === 'SPAN');

    expect(overdueBadge).toHaveClass(
      'bg-error-container',
      'text-error',
      'uppercase'
    );
    const invoiceLink = screen.getByRole('link', { name: /INV-OVERDUE/i });
    expect(invoiceLink).toHaveClass('rounded-2xl', 'focus-visible:ring-2');
    expect(invoiceLink.closest('li')).toHaveClass('rounded-2xl');
  });

  it('submits quick mark-as-paid from the invoice list card', async () => {
    markInvoiceAsPaidMock.mockResolvedValue(undefined);

    render(
      <InvoiceTable
        invoices={[
          {
            id: 'invoice-1',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_id: null,
            invoice_number: 'INV-0042',
            status: 'overdue',
            invoice_type: 'final',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            amount_paid_cents: 0,
            business_abn: null,
            payment_terms: null,
            bank_details: null,
            due_date: '2026-04-01',
            paid_date: null,
            paid_at: null,
            payment_method: null,
            notes: null,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Mark Johnson',
              email: 'mark@example.com',
              phone: '0412 555 012',
              address: 'Bondi, NSW',
            },
            balance_cents: 110000,
            line_item_count: 1,
            quote_stage_label: null,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Paid' }));
    expect(screen.getByLabelText('Paid date')).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'focus:ring-2'
    );
    expect(screen.getByLabelText('Payment method')).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'focus:ring-2'
    );
    expect(screen.getByRole('button', { name: 'Save Payment' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    fireEvent.change(screen.getByLabelText('Paid date'), {
      target: { value: '2026-04-13' },
    });
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'card' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Payment' }));

    await waitFor(() => {
      expect(markInvoiceAsPaidMock).toHaveBeenCalledWith('invoice-1', {
        paid_date: '2026-04-13',
        payment_method: 'card',
      });
    });
  });

  it('wraps filters and keeps invoice cards fluid on small mobile screens', () => {
    const { container } = render(
      <InvoiceTable
        invoices={[
          {
            id: 'invoice-1',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_id: 'quote-1',
            invoice_number: 'INV-0012-LONG',
            status: 'sent',
            invoice_type: 'deposit',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            amount_paid_cents: 0,
            business_abn: null,
            payment_terms: null,
            bank_details: null,
            due_date: '2026-04-10',
            paid_date: null,
            paid_at: null,
            payment_method: null,
            notes: null,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Very Long Customer Name That Should Stay Inside',
              email: 'mark@example.com',
              phone: '0412 555 012',
              address: 'Bondi, NSW',
            },
            balance_cents: 110000,
            line_item_count: 1,
            quote_stage_label: '1/3',
          },
        ]}
      />
    );

    const filters = container.querySelectorAll('.flex-wrap');
    expect(filters.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument();
    expect(
      screen.getByText('Very Long Customer Name That Should Stay Inside')
    ).toHaveClass('truncate');
  });
});
