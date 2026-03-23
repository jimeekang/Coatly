import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  generateWorkspaceDraftMock,
  getSubscriptionSnapshotForUserMock,
  isAIDraftConfiguredMock,
} =
  vi.hoisted(() => ({
    createServerClientMock: vi.fn(),
    generateWorkspaceDraftMock: vi.fn(),
    getSubscriptionSnapshotForUserMock: vi.fn(),
    isAIDraftConfiguredMock: vi.fn(),
  }));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/ai/drafts', () => ({
  generateWorkspaceDraft: generateWorkspaceDraftMock,
  isAIDraftConfigured: isAIDraftConfiguredMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: (actionName: string) =>
    `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`,
  getProFeatureMessage: (featureName: string) =>
    `${featureName} is available on the Pro plan. Upgrade in Settings to unlock it.`,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { generateAIDraft } from '@/app/actions/ai-drafts';

describe('generateAIDraft', () => {
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

  it('blocks AI draft generation on Starter', async () => {
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

    const result = await generateAIDraft({
      entity: 'customer',
      prompt: 'Create a new customer for Harbor Cafe',
    });

    expect(result).toEqual({
      data: null,
      error: 'AI draft is available on the Pro plan. Upgrade in Settings to unlock it.',
    });
  });

  it('blocks AI draft generation when there is no active subscription yet', async () => {
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

    const result = await generateAIDraft({
      entity: 'customer',
      prompt: 'Create a new customer for Harbor Cafe',
    });

    expect(result).toEqual({
      data: null,
      error: 'Choose a paid plan to unlock AI draft. Finish checkout before using Coatly tools.',
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

    const result = await generateAIDraft({
      entity: 'customer',
      prompt: 'Create a new customer for Harbor Cafe',
    });

    expect(result).toEqual({
      data: null,
      error: 'AI draft is not configured. Add GEMINI_API_KEY to .env.local.',
    });
  });

  it('passes workspace context into the AI generator', async () => {
    isAIDraftConfiguredMock.mockReturnValue(true);
    generateWorkspaceDraftMock.mockResolvedValue({
      entity: 'invoice',
      summary: 'Prepared a draft invoice.',
      warnings: [],
      customer: null,
      quote: null,
      invoice: {
        customer_id: 'customer-1',
        quote_id: null,
        invoice_type: 'deposit',
        status: 'draft',
        due_date: '2026-04-10',
        notes: '',
        line_items: [],
      },
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
                    name: 'Sarah Johnson',
                    company_name: 'Harbor Cafe',
                    email: 'sarah@example.com',
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
                    title: 'Cafe repaint',
                    customer_id: 'customer-1',
                    status: 'draft',
                    total_cents: 79695,
                    valid_until: '2026-04-10',
                  },
                ],
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await generateAIDraft({
      entity: 'invoice',
      prompt: 'Create a 30% deposit invoice for Harbor Cafe repaint',
    });

    expect(result.error).toBeNull();
    expect(generateWorkspaceDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'invoice',
        prompt: 'Create a 30% deposit invoice for Harbor Cafe repaint',
        customers: expect.arrayContaining([
          expect.objectContaining({ id: 'customer-1', address: '128 Beach Street, Manly, NSW, 2095' }),
        ]),
        quotes: expect.arrayContaining([
          expect.objectContaining({ id: 'quote-1', quote_number: 'QUO-0007' }),
        ]),
      })
    );
    expect(result.data?.invoice?.customer_id).toBe('customer-1');
  });
});
