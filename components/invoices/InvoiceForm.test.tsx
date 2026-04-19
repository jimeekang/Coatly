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
    vi.useRealTimers();
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
            billed_total_cents: 0,
            linked_invoice_count: 0,
            has_linked_invoices: false,
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
    fireEvent.change(screen.getByLabelText(/Due Date/), {
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
      paid_date: null,
      payment_method: null,
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
            billed_total_cents: 137500,
            linked_invoice_count: 1,
            has_linked_invoices: true,
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
    expect(screen.getByText('Already invoiced')).toBeInTheDocument();
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
            billed_total_cents: 121000,
            linked_invoice_count: 1,
            has_linked_invoices: true,
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
      'Progress claim (100%) for QUO-0004 - Cafe repaint'
    );
    expect(screen.getByLabelText('Unit Price (A$)')).toHaveValue(1900);

    await user.clear(screen.getByLabelText('Progress Percent (%)'));
    await user.type(screen.getByLabelText('Progress Percent (%)'), '50');

    expect(screen.getByLabelText('Description')).toHaveValue(
      'Progress claim (50%) for QUO-0004 - Cafe repaint'
    );
    expect(screen.getByLabelText('Unit Price (A$)')).toHaveValue(950);
  });

  it('defaults the due date to 14 days ahead on create', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T10:00:00Z'));

    render(<InvoiceForm customers={[]} quotes={[]} />);

    expect(screen.getByLabelText(/Due Date/)).toHaveValue('2026-04-23');
  });

  it('updates item GST and invoice totals in real time when line items change', () => {
    render(<InvoiceForm customers={[]} quotes={[]} />);

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Interior repaint' },
    });
    fireEvent.change(screen.getByLabelText('Qty'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Unit Price (A$)'), {
      target: { value: '150' },
    });

    expect(screen.getAllByText('GST (10%)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$30.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$330.00').length).toBeGreaterThan(0);
  });

  it('allows adding and removing line items', async () => {
    const user = userEvent.setup();

    render(<InvoiceForm customers={[]} quotes={[]} />);

    await user.click(screen.getByRole('button', { name: '+ Add Item' }));
    expect(screen.getAllByLabelText('Description')).toHaveLength(2);
    expect(screen.getAllByLabelText('Qty')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getAllByLabelText('Description')).toHaveLength(1);
  });

  it('shows notes and payment terms as visible editable fields', () => {
    render(
      <InvoiceForm
        customers={[]}
        quotes={[]}
        businessDefaults={{
          business_abn: '12345678901',
          payment_terms: 'Payment due within 14 days',
          bank_details: 'BSB: 123-456\nAccount: 12345678',
        }}
      />
    );

    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment Terms')).toHaveValue('Payment due within 14 days');
  });

  it('shows paid date and payment method fields when marking an invoice as paid', async () => {
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
        quotes={[]}
        onSubmit={onSubmit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    await user.selectOptions(screen.getByLabelText('Status'), 'paid');
    fireEvent.change(screen.getByLabelText('Paid Date'), {
      target: { value: '2026-04-09' },
    });
    await user.selectOptions(screen.getByLabelText('Payment Method'), 'card');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Final invoice' },
    });
    fireEvent.change(screen.getByLabelText('Unit Price (A$)'), {
      target: { value: '550' },
    });

    await user.click(screen.getByRole('button', { name: 'Save Invoice' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paid',
        paid_date: '2026-04-09',
        payment_method: 'card',
      })
    );
  });

  it('allows clearing the due date and submits it as null', async () => {
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
        quotes={[]}
        onSubmit={onSubmit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Final invoice' },
    });
    fireEvent.change(screen.getByLabelText('Unit Price (A$)'), {
      target: { value: '550' },
    });

    await user.click(screen.getByRole('button', { name: 'Save Invoice' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        due_date: null,
      })
    );
  });

  it('keeps an explicitly empty due date blank when default values provide null', () => {
    render(
      <InvoiceForm
        customers={[]}
        quotes={[]}
        defaultValues={{
          customer_id: '',
          quote_id: null,
          invoice_type: 'full',
          status: 'draft',
          business_abn: null,
          payment_terms: null,
          bank_details: null,
          due_date: null,
          paid_date: null,
          payment_method: null,
          notes: null,
          line_items: [
            {
              description: 'Prep and paint',
              quantity: 1,
              unit_price_cents: 42000,
            },
          ],
        }}
      />
    );

    expect(screen.getByLabelText(/Due Date/)).toHaveValue('');
  });
});
