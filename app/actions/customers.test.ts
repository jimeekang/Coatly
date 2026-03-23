import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, createServerClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));
const {
  getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUserMock,
} = vi.hoisted(() => ({
  getActiveSubscriptionRequiredMessageMock: vi.fn(
    (actionName: string) =>
      `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`
  ),
  getSubscriptionSnapshotForUserMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { createCustomer, updateCustomer } from '@/app/actions/customers';

describe('customers actions', () => {
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

  it('creates a customer when only the name is provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    });

    const result = await createCustomer({
      name: 'Mark Johnson',
      email: '',
      phone: '',
      company_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postcode: '',
      notes: '',
    });

    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Mark Johnson',
      email: null,
      phone: null,
      company_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postcode: null,
      notes: null,
    });
    expect(redirectMock).toHaveBeenCalledWith('/customers');
  });

  it('updates a customer when only the name is provided', async () => {
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({
      eq: eqUserMock,
    });
    const updateMock = vi.fn().mockReturnValue({
      eq: eqIdMock,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        update: updateMock,
      })),
    });

    const result = await updateCustomer('customer-1', {
      name: 'Mark Johnson',
      email: '',
      phone: '',
      company_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postcode: '',
      notes: '',
    });

    expect(result).toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith({
      name: 'Mark Johnson',
      email: null,
      phone: null,
      company_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postcode: null,
      notes: null,
    });
    expect(eqIdMock).toHaveBeenCalledWith('id', 'customer-1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(redirectMock).toHaveBeenCalledWith('/customers/customer-1');
  });

  it('blocks customer creation when there is no active subscription', async () => {
    const insertMock = vi.fn();

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
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

    const result = await createCustomer({
      name: 'Mark Johnson',
      email: '',
      phone: '',
      company_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postcode: '',
      notes: '',
    });

    expect(result).toEqual({
      error:
        'Choose a paid plan to unlock customer management. Finish checkout before using Coatly tools.',
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
