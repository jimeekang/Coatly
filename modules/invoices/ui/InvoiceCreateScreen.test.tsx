import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceCreateScreen } from '@/modules/invoices/ui/InvoiceCreateScreen';

const { invoiceFormSpy } = vi.hoisted(() => ({
  invoiceFormSpy: vi.fn(),
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  createInvoice: vi.fn(),
}));

vi.mock('@/modules/invoices/ui/InvoiceForm', () => ({
  InvoiceForm: (props: unknown) => {
    invoiceFormSpy(props);
    return <div data-testid="invoice-form">Invoice Form</div>;
  },
}));

// AIDraftPanel and UpgradePrompt are injected into the screen as props, so the
// tests provide lightweight stubs instead of mocking the ai/ui + billing/ui modules.
const StubAIDraftPanel = () => <div>AI Draft Panel</div>;
const StubUpgradePrompt = () => <div>Upgrade Prompt</div>;

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
        generateAIDraft={vi.fn()}
        AIDraftPanel={StubAIDraftPanel}
        UpgradePrompt={StubUpgradePrompt}
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
