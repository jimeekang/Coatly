import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, createServerClientMock, requireCurrentUserMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
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

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { createCustomer, getCustomers, updateCustomer } from '@/app/actions/customers';

const BASE_CUSTOMER_INPUT = {
  name: 'Mark Johnson',
  email: '',
  phone: '',
  emails: [''],
  phones: [''],
  company_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  properties: [
    {
      label: 'Primary property',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postcode: '',
      notes: '',
    },
  ],
  notes: '',
};

describe('customers actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
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

  it('falls back to legacy customer columns when multi-contact columns are not migrated yet', async () => {
    const legacyRows = [
      {
        id: 'customer-1',
        name: 'Demo Customer',
        email: 'demo@example.com',
        phone: '0412 345 678',
        company_name: null,
        address_line1: '12 Demo St',
        address_line2: null,
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
      },
    ];
    const selectMock = vi
      .fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'column customers.emails does not exist' },
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: legacyRows,
          error: null,
        }),
      });

    createServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: selectMock,
      })),
    });

    const result = await getCustomers();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'customer-1',
        name: 'Demo Customer',
        email: 'demo@example.com',
        emails: ['demo@example.com'],
        phone: '0412 345 678',
        phones: ['0412 345 678'],
        properties: [
          {
            label: 'Primary property',
            address_line1: '12 Demo St',
            address_line2: '',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
            notes: '',
          },
        ],
      }),
    ]);
    expect(selectMock).toHaveBeenNthCalledWith(1, expect.stringContaining('emails'));
    expect(selectMock).toHaveBeenNthCalledWith(2, expect.not.stringContaining('emails'));
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

    const result = await createCustomer(BASE_CUSTOMER_INPUT);

    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Mark Johnson',
      email: null,
      phone: null,
      emails: [],
      phones: [],
      company_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postcode: null,
      properties: [],
      notes: null,
    });
    expect(redirectMock).toHaveBeenCalledWith('/customers');
  });

  it('creates a customer with multiple emails, phones, and properties', async () => {
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
      ...BASE_CUSTOMER_INPUT,
      email: 'Owner@Example.com',
      emails: ['Owner@Example.com', 'accounts@example.com'],
      phone: '0412 345 678',
      phones: ['0412 345 678', '02 9000 0000'],
      properties: [
        {
          label: 'Home',
          address_line1: '12 Harbor St',
          address_line2: '',
          city: 'Manly',
          state: 'NSW',
          postcode: '2095',
          notes: 'Use side gate',
        },
        {
          label: 'Rental',
          address_line1: '8 Beach Rd',
          address_line2: 'Unit 2',
          city: 'Freshwater',
          state: 'NSW',
          postcode: '2096',
          notes: '',
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        email: 'owner@example.com',
        emails: ['owner@example.com', 'accounts@example.com'],
        phone: '0412 345 678',
        phones: ['0412 345 678', '02 9000 0000'],
        address_line1: '12 Harbor St',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        properties: [
          {
            label: 'Home',
            address_line1: '12 Harbor St',
            address_line2: '',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
            notes: 'Use side gate',
          },
          {
            label: 'Rental',
            address_line1: '8 Beach Rd',
            address_line2: 'Unit 2',
            city: 'Freshwater',
            state: 'NSW',
            postcode: '2096',
            notes: '',
          },
        ],
      })
    );
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

    const result = await updateCustomer('customer-1', BASE_CUSTOMER_INPUT);

    expect(result).toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith({
      name: 'Mark Johnson',
      email: null,
      phone: null,
      emails: [],
      phones: [],
      company_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postcode: null,
      properties: [],
      notes: null,
    });
    expect(eqIdMock).toHaveBeenCalledWith('id', 'customer-1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('returns a clear error when updating multiple properties before the migration is applied', async () => {
    const firstEqUserMock = vi.fn().mockResolvedValue({
      error: { message: "Could not find the 'properties' column of 'customers' in the schema cache" },
    });
    const eqIdMock = vi.fn().mockReturnValueOnce({ eq: firstEqUserMock });
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
      ...BASE_CUSTOMER_INPUT,
      properties: [
        {
          label: 'Home',
          address_line1: '12 Harbor St',
          address_line2: '',
          city: 'Manly',
          state: 'NSW',
          postcode: '2095',
          notes: '',
        },
        {
          label: 'Rental',
          address_line1: '8 Beach Rd',
          address_line2: 'Unit 2',
          city: 'Freshwater',
          state: 'NSW',
          postcode: '2096',
          notes: '',
        },
      ],
    });

    expect(result).toEqual({
      error:
        'Customer properties, extra emails, and extra phone numbers require the latest database migration. Please apply the customer multi-contact migration, then save again.',
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.any(Array),
      })
    );
    expect(redirectMock).not.toHaveBeenCalled();
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

    const result = await createCustomer(BASE_CUSTOMER_INPUT);

    expect(result).toEqual({
      error:
        'Choose a paid plan to unlock customer management. Finish checkout before using Coatly tools.',
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
