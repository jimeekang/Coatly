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
            subtotal_cents: 385000,
            total_cents: 423500,
            deposit_percent: 30,
            status: 'draft',
            valid_until: '2026-04-14',
            billed_subtotal_cents: 0,
            line_items: [
              {
                description: 'Interior repaint\nWalls and ceiling',
                quantity: 2,
                unit_price_cents: 12500,
                total_cents: 25000,
                is_optional: false,
                is_selected: true,
              },
            ],
          },
        ]}
        businessDefaults={{
          business_abn: '12345678901',
          payment_terms: 'Payment due within 7 days',
          bank_details: 'BSB: 123-456\nAccount: 12345678',
        }}
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
      business_abn: '12345678901',
      payment_terms: 'Payment due within 7 days',
      bank_details: 'BSB: 123-456\nAccount: 12345678',
      due_date: '2026-04-03',
      notes: 'Pay within 7 days',
      line_items: [
        {
          description: 'Deposit invoice',
          quantity: 2,
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
        businessDefaults={{
          business_abn: '12345678901',
          payment_terms: 'Payment due within 7 days',
          bank_details: 'BSB: 123-456\nAccount: 12345678',
        }}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');

    expect(screen.getByText('Customer Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Harbor Cafe').length).toBeGreaterThan(0);
    expect(screen.getByText('sarah@example.com')).toBeInTheDocument();
  });

  it('prefills invoice footer defaults from business settings', () => {
    render(
      <InvoiceForm
        customers={[]}
        quotes={[]}
        businessDefaults={{
          business_abn: '12345678901',
          payment_terms: 'Payment due within 7 days',
          bank_details: 'BSB: 123-456\nAccount: 12345678',
        }}
      />
    );

    expect(screen.getByLabelText('ABN')).toHaveValue('12345678901');
    expect(screen.getByLabelText('Payment Terms')).toHaveValue('Payment due within 7 days');
    expect(screen.getByLabelText('Bank Details')).toHaveValue(
      'BSB: 123-456\nAccount: 12345678'
    );
  });

  it('shows linked quote context and autofills blank invoice items from included quote items', async () => {
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
        quotes={[
          {
            id: 'quote-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0004',
            title: 'Cafe repaint',
            subtotal_cents: 385000,
            total_cents: 423500,
            deposit_percent: 30,
            status: 'approved',
            valid_until: '2026-04-14',
            billed_subtotal_cents: 125000,
            line_items: [
              {
                description: 'Interior repaint\nWalls and ceiling',
                quantity: 2,
                unit_price_cents: 12500,
                total_cents: 25000,
                is_optional: false,
                is_selected: true,
              },
            ],
          },
        ]}
        businessDefaults={{
          business_abn: '12345678901',
          payment_terms: 'Payment due within 7 days',
          bank_details: 'BSB: 123-456\nAccount: 12345678',
        }}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    await user.selectOptions(screen.getByLabelText(/Linked Quote/), 'quote-1');

    expect(screen.getAllByText('Linked Quote').length).toBeGreaterThan(0);
    expect(screen.getByText('Quote total')).toBeInTheDocument();
    expect(screen.getByText('Already billed')).toBeInTheDocument();
    expect(screen.getByText('Quote items')).toBeInTheDocument();
    expect(screen.getAllByText(/Walls and ceiling/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Description')).toHaveValue('Interior repaint\nWalls and ceiling');
    expect(screen.queryByRole('option', { name: 'Sent' })).not.toBeInTheDocument();
  });

  it('rebuilds linked quote lines for deposit and progress invoice presets', async () => {
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
        quotes={[
          {
            id: 'quote-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0004',
            title: 'Cafe repaint',
            subtotal_cents: 300000,
            total_cents: 330000,
            deposit_percent: 20,
            status: 'approved',
            valid_until: '2026-04-14',
            billed_subtotal_cents: 110000,
            line_items: [
              {
                description: 'Interior repaint\nWalls and ceiling',
                quantity: 2,
                unit_price_cents: 12500,
                total_cents: 25000,
                is_optional: false,
                is_selected: true,
              },
            ],
          },
        ]}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    await user.selectOptions(screen.getByLabelText(/Linked Quote/), 'quote-1');
    await user.selectOptions(screen.getByLabelText('Type'), 'deposit');

    expect(screen.getByLabelText('Description')).toHaveValue(
      'Deposit (20%) for QUO-0004 - Cafe repaint'
    );
    expect(screen.getByLabelText('Unit Price (A$)')).toHaveValue(600);
    expect(
      screen.getByText('Deposit invoice uses the 20% deposit saved on the linked quote.')
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'progress');

    expect(screen.getByLabelText('Description')).toHaveValue(
      'Progress claim for QUO-0004 - Cafe repaint'
    );
    expect(screen.getByLabelText('Unit Price (A$)')).toHaveValue(1900);
  });
});
