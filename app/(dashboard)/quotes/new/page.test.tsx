import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getLiveMonthlyActiveQuoteUsageForUserMock,
  getMaterialItemsForPickerMock,
  getQuoteFormOptionsMock,
  listQuoteTemplatesMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getLiveMonthlyActiveQuoteUsageForUserMock: vi.fn(),
  getMaterialItemsForPickerMock: vi.fn(),
  getQuoteFormOptionsMock: vi.fn(),
  listQuoteTemplatesMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/modules/billing/application/server', () => ({
  getLiveMonthlyActiveQuoteUsageForUser:
    getLiveMonthlyActiveQuoteUsageForUserMock,
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  generateAIDraft: vi.fn(),
  getQuoteFormOptions: getQuoteFormOptionsMock,
}));

vi.mock('@/modules/materials/application/actions', () => ({
  getMaterialItemsForPicker: getMaterialItemsForPickerMock,
}));

vi.mock('@/modules/quotes/application/template-actions', () => ({
  listQuoteTemplates: listQuoteTemplatesMock,
}));

vi.mock('@/modules/ai/application/drafts', () => ({
  isAIDraftConfigured: () => false,
}));

vi.mock('@/modules/quotes/ui/QuoteCreateScreen', () => ({
  QuoteCreateScreen: () => <div data-testid="quote-create-screen" />,
}));

vi.mock('@/modules/ai/ui/AIDraftPanel', () => ({
  AIDraftPanel: () => null,
}));

vi.mock('@/modules/billing/ui/UpgradePrompt', () => ({
  UpgradePrompt: () => null,
}));

import NewQuotePage from './page';

describe('NewQuotePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    });
    getQuoteFormOptionsMock.mockResolvedValue({
      data: {
        customers: [{ id: 'customer-1', name: 'Jimee' }],
        nextQuoteNumber: 'QUO-0003',
        userRates: null,
      },
      error: null,
    });
    getMaterialItemsForPickerMock.mockResolvedValue({ data: [] });
    listQuoteTemplatesMock.mockResolvedValue({ data: [] });
  });

  it('does not show Starter usage for an unlimited Pro subscription', async () => {
    getLiveMonthlyActiveQuoteUsageForUserMock.mockResolvedValue({
      snapshot: {
        plan: 'pro',
        status: 'active',
        features: { ai: true, activeQuoteLimit: null },
      },
      usage: {
        count: 0,
        limit: null,
        remaining: null,
        reached: false,
      },
    });

    render(await NewQuotePage({}));

    expect(screen.queryByText('Starter Usage')).not.toBeInTheDocument();
  });
});
