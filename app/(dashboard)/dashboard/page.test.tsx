import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getInvoiceQuoteOptionsMock,
  getSubscriptionSnapshotMock,
  isAIDraftConfiguredMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getInvoiceQuoteOptionsMock: vi.fn(),
  getSubscriptionSnapshotMock: vi.fn(),
  isAIDraftConfiguredMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/billing/application/request-context', () => ({
  getSubscriptionSnapshotForCurrentUser: getSubscriptionSnapshotMock,
}));

vi.mock('@/modules/ai/application/drafts', () => ({
  isAIDraftConfigured: isAIDraftConfiguredMock,
}));

vi.mock('@/modules/invoices/infrastructure/invoice-options', () => ({
  getInvoiceQuoteOptions: getInvoiceQuoteOptionsMock,
}));

vi.mock('@/modules/billing/ui/UpgradePrompt', () => ({
  UpgradePrompt: () => <div data-testid="upgrade-prompt">Upgrade Prompt</div>,
}));

vi.mock('@/modules/assistant/ui/WorkspaceAssistant', () => ({
  WorkspaceAssistant: () => <div data-testid="workspace-assistant" />,
}));

vi.mock('@/modules/customers/ui/CustomerForm', () => ({
  CustomerForm: () => null,
}));
vi.mock('@/modules/quotes/ui/QuoteForm', () => ({ QuoteForm: () => null }));
vi.mock('@/modules/invoices/ui/InvoiceForm', () => ({
  InvoiceForm: () => null,
}));
vi.mock('@/modules/quotes/application/actions', () => ({
  createQuote: vi.fn(),
}));
vi.mock('@/modules/invoices/application/actions', () => ({
  createInvoice: vi.fn(),
}));

import DashboardPage from './page';

function createQuery(data: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue({ data, error: null });
  return query;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T00:00:00.000Z'));
    isAIDraftConfiguredMock.mockReturnValue(true);
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'alex@example.com',
      user_metadata: { business_name: 'Alex Painting' },
    });
    getSubscriptionSnapshotMock.mockResolvedValue({
      plan: 'starter',
      features: { ai: false, activeQuoteLimit: null },
    });
    getInvoiceQuoteOptionsMock.mockResolvedValue({ data: [], error: null });

    const tableData: Record<string, unknown[]> = {
      customers: [],
      quotes: [],
      invoices: [
        {
          id: 'invoice-current',
          status: 'paid',
          total_cents: 999999,
          amount_paid_cents: 25000,
          paid_at: '2026-06-30T23:00:00.000Z',
          paid_date: '2026-07-05',
          due_date: '2026-07-05',
        },
        {
          id: 'invoice-previous',
          status: 'paid',
          total_cents: 50000,
          amount_paid_cents: 50000,
          paid_at: '2026-07-05T00:00:00.000Z',
          paid_date: '2026-06-30',
          due_date: '2026-06-30',
        },
      ],
    };

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => createQuery(tableData[table] ?? [])),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the canonical dashboard wrapper spacing', async () => {
    const { container } = render(await DashboardPage());

    expect(container.firstElementChild).toHaveClass(
      'flex',
      'flex-col',
      'gap-4',
      'sm:gap-6'
    );
  });

  it('shows receivables KPIs before the AI upgrade prompt', async () => {
    render(await DashboardPage());

    const outstanding = screen.getByText('Outstanding');
    const upgradePrompt = screen.getByTestId('upgrade-prompt');

    expect(
      outstanding.compareDocumentPosition(upgradePrompt) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('uses the invoice KPI paid-date definition for monthly revenue', async () => {
    render(await DashboardPage());

    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('uses canonical new invoice copy', async () => {
    render(await DashboardPage());

    expect(screen.getByText('+ New Invoice')).toBeInTheDocument();
  });

  it('shows a real aging signal for sent quote follow-up', async () => {
    const tableData: Record<string, unknown[]> = {
      customers: [],
      invoices: [],
      quotes: [
        {
          id: 'quote-sent',
          quote_number: 'QUO-0012',
          title: 'Exterior repaint',
          customer_id: 'customer-1',
          total_cents: 120000,
          status: 'sent',
          valid_until: '2026-07-25',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-08T00:00:00.000Z',
        },
      ],
    };
    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => createQuery(tableData[table] ?? [])),
    });

    render(await DashboardPage());

    expect(
      screen.getByText('Oldest sent quote activity was 10 days ago.')
    ).toBeInTheDocument();
  });
});
