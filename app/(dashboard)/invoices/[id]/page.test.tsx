import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getInvoiceFormOptionsMock,
  getInvoiceMock,
  getLinkedInvoicesForQuoteMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getInvoiceFormOptionsMock: vi.fn(),
  getInvoiceMock: vi.fn(),
  getLinkedInvoicesForQuoteMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  getInvoice: getInvoiceMock,
  getInvoiceFormOptions: getInvoiceFormOptionsMock,
  getLinkedInvoicesForQuote: getLinkedInvoicesForQuoteMock,
}));

vi.mock('@/modules/invoices/ui/InvoiceDetail', () => ({
  InvoiceDetail: ({ invoice }: { invoice: { invoice_number: string } }) => (
    <div>Invoice detail: {invoice.invoice_number}</div>
  ),
}));

import InvoiceDetailPage from './page';

const INVOICE = {
  id: 'invoice-1',
  invoice_number: 'INV-0042',
  quote_id: null,
  quote_stage_label: null,
};

const FORM_OPTIONS = {
  customers: [],
  quotes: [],
  businessDefaults: {
    business_abn: null,
    payment_terms: null,
    bank_details: null,
  },
};

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvoiceMock.mockResolvedValue({ data: INVOICE, error: null });
    getInvoiceFormOptionsMock.mockResolvedValue({
      data: FORM_OPTIONS,
      error: null,
    });
    getLinkedInvoicesForQuoteMock.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('renders a retryable inline alert when the invoice query fails', async () => {
    getInvoiceMock.mockResolvedValue({
      data: null,
      error: 'Invoice query failed.',
    });

    render(
      await InvoiceDetailPage({ params: Promise.resolve({ id: 'invoice-1' }) })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invoice query failed.'
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass(
      'min-h-11'
    );
    expect(
      screen.getByRole('button', { name: 'Try again' }).closest('form')
    ).toHaveAttribute('action', '/invoices/invoice-1');
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('keeps a genuinely missing invoice on the not-found path', async () => {
    getInvoiceMock.mockResolvedValue({ data: null, error: null });

    await expect(
      InvoiceDetailPage({ params: Promise.resolve({ id: 'missing-invoice' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it('renders a retryable inline alert when supporting invoice options fail', async () => {
    getInvoiceFormOptionsMock.mockResolvedValue({
      data: FORM_OPTIONS,
      error: 'Invoice options failed.',
    });

    render(
      await InvoiceDetailPage({ params: Promise.resolve({ id: 'invoice-1' }) })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invoice options failed.'
    );
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('renders a retryable inline alert when linked invoice billing fails', async () => {
    getInvoiceMock.mockResolvedValue({
      data: { ...INVOICE, quote_id: 'quote-1' },
      error: null,
    });
    getInvoiceFormOptionsMock.mockResolvedValue({
      data: {
        ...FORM_OPTIONS,
        quotes: [{ id: 'quote-1', total_cents: 110000 }],
      },
      error: null,
    });
    getLinkedInvoicesForQuoteMock.mockResolvedValue({
      data: null,
      error: 'Linked invoices failed.',
    });

    render(
      await InvoiceDetailPage({ params: Promise.resolve({ id: 'invoice-1' }) })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Linked invoices failed.'
    );
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('still renders the invoice detail when all queries succeed', async () => {
    render(
      await InvoiceDetailPage({ params: Promise.resolve({ id: 'invoice-1' }) })
    );

    expect(screen.getByText('Invoice detail: INV-0042')).toBeInTheDocument();
  });
});
