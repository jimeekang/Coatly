import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  generateWorkspaceAssistantResultMock,
  getSubscriptionSnapshotForUserMock,
  isAIDraftConfiguredMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  generateWorkspaceAssistantResultMock: vi.fn(),
  getSubscriptionSnapshotForUserMock: vi.fn(),
  isAIDraftConfiguredMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/ai/drafts', () => ({
  generateWorkspaceAssistantResult: generateWorkspaceAssistantResultMock,
  isAIDraftConfigured: isAIDraftConfiguredMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: (actionName: string) =>
    `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`,
  getProFeatureMessage: (featureName: string) =>
    `${featureName} is available on the Pro plan. Upgrade in Settings to unlock it.`,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { runWorkspaceAssistant } from '@/app/actions/workspace-assistant';

describe('runWorkspaceAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: true,
        xeroSync: true,
        jobCosting: true,
        prioritySupport: true,
        unlimitedQuotes: true,
        activeQuoteLimit: null,
      },
    });
  });

  it('blocks dashboard AI on Starter', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'starter',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: false,
        xeroSync: false,
        jobCosting: false,
        prioritySupport: false,
        unlimitedQuotes: false,
        activeQuoteLimit: 10,
      },
    });

    const result = await runWorkspaceAssistant({
      prompt: "When is Shara's invoice due date?",
    });

    expect(result).toEqual({
      data: null,
      error: 'Dashboard AI is available on the Pro plan. Upgrade in Settings to unlock it.',
    });
  });

  it('blocks dashboard AI when there is no active subscription yet', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'starter',
      status: 'none',
      active: false,
      cancelScheduled: false,
      features: {
        ai: false,
        xeroSync: false,
        jobCosting: false,
        prioritySupport: false,
        unlimitedQuotes: false,
        activeQuoteLimit: 10,
      },
    });

    const result = await runWorkspaceAssistant({
      prompt: "When is Shara's invoice due date?",
    });

    expect(result).toEqual({
      data: null,
      error:
        'Choose a paid plan to unlock Dashboard AI. Finish checkout before using Coatly tools.',
    });
  });

  it('returns a configuration error when Gemini is not configured', async () => {
    isAIDraftConfiguredMock.mockReturnValue(false);
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });

    const result = await runWorkspaceAssistant({
      prompt: "When is Shara's invoice due date?",
    });

    expect(result).toEqual({
      data: null,
      error: 'AI draft is not configured. Add GEMINI_API_KEY to .env.local.',
    });
  });

  it('passes customers, quotes, and invoices into the workspace assistant helper', async () => {
    isAIDraftConfiguredMock.mockReturnValue(true);
    generateWorkspaceAssistantResultMock.mockResolvedValue({
      intent: 'answer',
      summary: 'Found Shara invoice details.',
      answer: "Shara's invoice INV-0012 is due on 2026-04-10.",
      warnings: [],
      matches: [],
      customer: null,
      quote: null,
      invoice: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    name: 'Coatly Co',
                    email: 'owner@example.com',
                    phone: '0412 111 222',
                    address: '1 Test St, Sydney NSW 2000',
                  },
                }),
              }),
            }),
          };
        }

        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'customer-1',
                    name: 'Shara Adams',
                    company_name: 'Shara Studio',
                    email: 'shara@example.com',
                    phone: '0412 555 012',
                    address_line1: '128 Beach Street',
                    city: 'Manly',
                    state: 'NSW',
                    postcode: '2095',
                  },
                ],
              }),
            }),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'quote-1',
                    quote_number: 'QUO-0007',
                    title: 'Studio repaint',
                    customer_id: 'customer-1',
                    status: 'draft',
                    total_cents: 79695,
                    valid_until: '2026-04-10',
                    customer: {
                      name: 'Shara Adams',
                      company_name: 'Shara Studio',
                    },
                  },
                ],
              }),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'invoice-1',
                    invoice_number: 'INV-0012',
                    customer_id: 'customer-1',
                    quote_id: 'quote-1',
                    status: 'sent',
                    invoice_type: 'final',
                    total_cents: 230000,
                    due_date: '2026-04-10',
                    customer: {
                      name: 'Shara Adams',
                      company_name: 'Shara Studio',
                    },
                    quote: {
                      quote_number: 'QUO-0007',
                    },
                  },
                ],
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await runWorkspaceAssistant({
      prompt: "When is Shara's invoice due date?",
    });

    expect(result.error).toBeNull();
    expect(generateWorkspaceAssistantResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "When is Shara's invoice due date?",
        customers: expect.arrayContaining([
          expect.objectContaining({
            id: 'customer-1',
            address: '128 Beach Street, Manly, NSW, 2095',
          }),
        ]),
        quotes: expect.arrayContaining([
          expect.objectContaining({
            id: 'quote-1',
            quote_number: 'QUO-0007',
            customer_name: 'Shara Studio',
          }),
        ]),
        invoices: expect.arrayContaining([
          expect.objectContaining({
            id: 'invoice-1',
            invoice_number: 'INV-0012',
            quote_number: 'QUO-0007',
            customer_name: 'Shara Studio',
            due_date: '2026-04-10',
          }),
        ]),
      })
    );
  });
});
