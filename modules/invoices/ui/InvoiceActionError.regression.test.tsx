import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceDetail } from '@/modules/invoices/ui/InvoiceDetail';
import { InvoiceTable } from '@/modules/invoices/ui/InvoiceTable';
import type { InvoiceListItem, InvoiceWithCustomer } from '@/modules/invoices/domain/invoice';

const { deleteInvoiceMock, markInvoiceAsPaidMock, sendInvoiceMock } = vi.hoisted(() => ({
  deleteInvoiceMock: vi.fn(),
  markInvoiceAsPaidMock: vi.fn(),
  sendInvoiceMock: vi.fn(),
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  deleteInvoice: deleteInvoiceMock,
  markInvoiceAsPaid: markInvoiceAsPaidMock,
  sendInvoice: sendInvoiceMock,
}));

const INVOICE: InvoiceWithCustomer = {
  id: 'invoice-1',
  user_id: 'user-1',
  customer_id: 'customer-1',
  quote_id: null,
  invoice_number: 'INV-0042',
  status: 'draft',
  invoice_type: 'full',
  subtotal_cents: 100000,
  gst_cents: 10000,
  total_cents: 110000,
  amount_paid_cents: 0,
  business_abn: null,
  payment_terms: null,
  bank_details: null,
  due_date: '2026-04-15',
  paid_date: null,
  paid_at: null,
  payment_method: null,
  notes: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
  customer: {
    id: 'customer-1',
    name: 'Mark Johnson',
    email: 'mark@example.com',
    phone: '0412 555 012',
    address: 'Bondi, NSW',
  },
  line_items: [
    {
      id: 'line-item-1',
      invoice_id: 'invoice-1',
      description: 'Interior painting',
      quantity: 1,
      unit_price_cents: 100000,
      gst_cents: 10000,
      total_cents: 110000,
      sort_order: 0,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    },
  ],
};

const TABLE_INVOICE: InvoiceListItem = {
  ...INVOICE,
  status: 'overdue',
  balance_cents: 110000,
  line_item_count: 1,
};

describe('invoice action error recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteInvoiceMock.mockResolvedValue(undefined);
    markInvoiceAsPaidMock.mockResolvedValue(undefined);
    sendInvoiceMock.mockResolvedValue(undefined);
  });

  it('shows returned send errors and re-enables the send action', async () => {
    sendInvoiceMock.mockResolvedValue({ error: 'Customer email is required.' });

    render(<InvoiceDetail invoice={INVOICE} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send invoice' }));

    expect(await screen.findByText('Customer email is required.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send invoice' })).not.toBeDisabled();
    });
  });

  it('shows thrown payment errors while keeping the detail payment form usable', async () => {
    markInvoiceAsPaidMock.mockRejectedValue(new Error('Payment service unavailable.'));
    const invoice = { ...INVOICE, status: 'overdue' as const };

    render(<InvoiceDetail invoice={invoice} />);

    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'card' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText('Payment service unavailable.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save payment' })).not.toBeDisabled();
    });
  });

  it('shows thrown delete errors and closes the confirmation dialog', async () => {
    deleteInvoiceMock.mockRejectedValue(new Error('Invoice could not be deleted.'));

    render(<InvoiceDetail invoice={INVOICE} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete invoice' }));
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }));

    expect(await screen.findByText('Invoice could not be deleted.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete invoice' })).not.toBeDisabled();
    });
  });

  it('shows returned payment errors and clears the table pending state', async () => {
    markInvoiceAsPaidMock.mockResolvedValue({ error: 'Payment method is required.' });

    render(<InvoiceTable invoices={[TABLE_INVOICE]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Paid' }));
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'card' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Payment' }));

    expect(await screen.findByText('Payment method is required.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Payment' })).not.toBeDisabled();
    });
  });

  it('shows thrown table payment errors and clears the table pending state', async () => {
    markInvoiceAsPaidMock.mockRejectedValue(new Error('Payment gateway timed out.'));

    render(<InvoiceTable invoices={[TABLE_INVOICE]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Paid' }));
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'card' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Payment' }));

    expect(await screen.findByText('Payment gateway timed out.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Payment' })).not.toBeDisabled();
    });
  });
});
