import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getInvoiceMock, getInvoiceFormOptionsMock, notFoundMock } = vi.hoisted(
  () => ({
    getInvoiceMock: vi.fn(),
    getInvoiceFormOptionsMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
  })
);

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  getInvoice: getInvoiceMock,
  getInvoiceFormOptions: getInvoiceFormOptionsMock,
  updateInvoice: vi.fn(),
}));

vi.mock('@/modules/invoices/ui/InvoiceForm', () => ({
  InvoiceForm: () => <div>Invoice form</div>,
}));

import EditInvoicePage from './page';

const INVOICE = {
  id: 'invoice-1',
  invoice_number: 'INV-0042',
  status: 'draft',
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

describe('EditInvoicePage error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvoiceMock.mockResolvedValue({ data: INVOICE, error: null });
    getInvoiceFormOptionsMock.mockResolvedValue({
      data: FORM_OPTIONS,
      error: null,
    });
  });

  it('shows a retryable ErrorAlert for an invoice query failure', async () => {
    getInvoiceMock.mockResolvedValue({
      data: null,
      error: 'Invoice query failed.',
    });

    render(
      await EditInvoicePage({
        params: Promise.resolve({ id: 'invoice-1' }),
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invoice query failed.'
    );
    expect(screen.getByRole('alert')).toHaveClass(
      'rounded-xl',
      'border-error/20'
    );
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Try again' }).closest('form')
    ).toHaveAttribute('action', '/invoices/invoice-1/edit');
  });

  it('keeps a genuinely missing invoice on the not-found path', async () => {
    getInvoiceMock.mockResolvedValue({ data: null, error: null });

    await expect(
      EditInvoicePage({
        params: Promise.resolve({ id: 'missing-invoice' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it('uses the shared error alert when invoice form options fail', async () => {
    getInvoiceFormOptionsMock.mockResolvedValue({
      data: FORM_OPTIONS,
      error: 'Invoice options failed.',
    });

    render(
      await EditInvoicePage({
        params: Promise.resolve({ id: 'invoice-1' }),
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invoice options failed.'
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass(
      'rounded-xl',
      'focus-visible:ring-2'
    );
  });
});
