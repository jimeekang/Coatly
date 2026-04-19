import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';

const { markInvoiceAsPaidMock } = vi.hoisted(() => ({
  markInvoiceAsPaidMock: vi.fn(),
}));

vi.mock('@/app/actions/invoices', () => ({
  markInvoiceAsPaid: markInvoiceAsPaidMock,
}));

describe('InvoiceTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(screen.getAllByText('INV-0012').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0013')).not.toBeInTheDocument();

    // Status filter chips replace the old dropdown — click the 'Paid' chip
    fireEvent.click(screen.getByRole('button', { name: 'Paid' }));

    expect(screen.getByText('No invoices match this search.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search by invoice/i), {
      target: { value: '' },
    });

    expect(screen.getAllByText('INV-0013').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV-0012')).not.toBeInTheDocument();
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
});
