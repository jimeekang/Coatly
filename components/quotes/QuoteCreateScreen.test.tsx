import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteCreateScreen } from '@/components/quotes/QuoteCreateScreen';

const { quoteFormSpy } = vi.hoisted(() => ({
  quoteFormSpy: vi.fn(),
}));

vi.mock('@/app/actions/ai-drafts', () => ({
  generateAIDraft: vi.fn(),
}));

vi.mock('@/app/actions/quotes', () => ({
  createQuote: vi.fn(),
}));

vi.mock('@/app/actions/quote-templates', () => ({
  saveQuoteTemplate: vi.fn(),
}));

vi.mock('@/components/ai/AIDraftPanel', () => ({
  AIDraftPanel: () => <div>AI Draft Panel</div>,
}));

vi.mock('@/components/quotes/TemplatePicker', () => ({
  TemplatePicker: () => <div>Template Picker</div>,
}));

vi.mock('@/components/subscription/UpgradePrompt', () => ({
  UpgradePrompt: () => <div>Upgrade Prompt</div>,
}));

vi.mock('@/components/quotes/QuoteForm', () => ({
  QuoteForm: (props: unknown) => {
    quoteFormSpy(props);
    return <div data-testid="quote-form">Quote Form</div>;
  },
}));

const CUSTOMERS = [
  {
    id: 'customer-1',
    name: 'Sarah Johnson',
    company_name: 'Harbor Cafe',
    email: 'sarah@example.com',
    emails: ['sarah@example.com'],
    phone: '0412 555 012',
    address: '128 Beach Street, Manly, NSW 2095',
    properties: [],
  },
];

describe('QuoteCreateScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preselects the requested customer when opened from the customer workflow', () => {
    render(
      <QuoteCreateScreen
        customers={CUSTOMERS}
        canUseAI={false}
        initialCustomerId="customer-1"
      />
    );

    expect(screen.getByTestId('quote-form')).toBeInTheDocument();
    expect(quoteFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultValues: expect.objectContaining({
          customer_id: 'customer-1',
        }),
      })
    );
  });
});
