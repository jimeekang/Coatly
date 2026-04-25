import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceCreateScreen } from '@/components/invoices/InvoiceCreateScreen';

const { invoiceFormSpy } = vi.hoisted(() => ({
  invoiceFormSpy: vi.fn(),
}));

vi.mock('@/app/actions/ai-drafts', () => ({
  generateAIDraft: vi.fn(),
}));

vi.mock('@/app/actions/invoices', () => ({
  createInvoice: vi.fn(),
}));

vi.mock('@/components/ai/AIDraftPanel', () => ({
  AIDraftPanel: () => <div>AI Draft Panel</div>,
}));

vi.mock('@/components/subscription/UpgradePrompt', () => ({
  UpgradePrompt: () => <div>Upgrade Prompt</div>,
}));

vi.mock('@/components/invoices/InvoiceForm', () => ({
  InvoiceForm: (props: unknown) => {
    invoiceFormSpy(props);
    return <div data-testid="invoice-form">Invoice Form</div>;
  },
}));

const CUSTOMERS = [
  {
    id: 'customer-1',
    name: 'Sarah Johnson',
    company_name: 'Harbor Cafe',
    email: 'sarah@example.com',
    phone: '0412 555 012',
    address: '128 Beach Street, Manly, NSW 2095',
  },
];

describe('InvoiceCreateScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preselects the requested customer when opened from the customer workflow', () => {
    render(
      <InvoiceCreateScreen
        customers={CUSTOMERS}
        quotes={[]}
        businessDefaults={{
          business_abn: null,
          payment_terms: null,
          bank_details: null,
        }}
        initialCustomerId="customer-1"
        canUseAI={false}
      />
    );

    expect(screen.getByTestId('invoice-form')).toBeInTheDocument();
    expect(invoiceFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultValues: expect.objectContaining({
          customer_id: 'customer-1',
        }),
      })
    );
  });
});
