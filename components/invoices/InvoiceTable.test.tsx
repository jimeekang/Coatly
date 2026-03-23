import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';

describe('InvoiceTable', () => {
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
            due_date: '2026-04-10',
            paid_at: null,
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
            due_date: '2026-04-15',
            paid_at: '2026-04-12T00:00:00.000Z',
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
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Search by invoice/i), {
      target: { value: 'Mark' },
    });

    expect(screen.getAllByText('INV-0012').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0013')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter by invoice status/i), {
      target: { value: 'paid' },
    });

    expect(screen.getByText('No invoices match this search.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search by invoice/i), {
      target: { value: '' },
    });

    expect(screen.getAllByText('INV-0013').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0012')).not.toBeInTheDocument();
  });
});
