import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock } = vi.hoisted(() => ({
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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { DELETE, GET, PATCH } from '@/app/api/customers/[id]/route';

function buildContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

describe('/api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      active: true,
    });
  });

  it('returns a single active customer', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'mark@example.com',
        phone: null,
        address_line1: '12 Harbor St',
        address_line2: null,
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        notes: null,
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: maybeSingleMock,
        }),
      })),
    });

    const response = await GET(
      new Request('http://localhost/api/customers/customer-1'),
      buildContext('customer-1')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'mark@example.com',
        phone: null,
        address: '12 Harbor St, Manly, NSW, 2095',
        notes: null,
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
      },
    });
  });

  it('updates a customer and returns the simplified payload', async () => {
    const currentCustomerMock = vi.fn().mockResolvedValue({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'mark@example.com',
        phone: null,
        address_line1: '12 Harbor St',
        address_line2: null,
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        notes: null,
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
      },
      error: null,
    });
    const duplicateCheckMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const updateSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'new@example.com',
        phone: '0400 111 222',
        address_line1: '98 Pitt St, Sydney NSW 2000',
        address_line2: null,
        city: null,
        state: null,
        postcode: null,
        notes: 'Ring the intercom',
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-03T00:00:00.000Z',
      },
      error: null,
    });

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: currentCustomerMock,
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          limit: duplicateCheckMock,
        }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnValue({
            single: updateSingleMock,
          }),
        }),
      });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: fromMock,
    });

    const response = await PATCH(
      new Request('http://localhost/api/customers/customer-1', {
        method: 'PATCH',
        body: JSON.stringify({
          email: 'new@example.com',
          phone: '0400 111 222',
          address: '98 Pitt St, Sydney NSW 2000',
          notes: 'Ring the intercom',
        }),
      }),
      buildContext('customer-1')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'new@example.com',
        phone: '0400 111 222',
        address: '98 Pitt St, Sydney NSW 2000',
        notes: 'Ring the intercom',
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-03T00:00:00.000Z',
      },
    });
  });

  it('soft-deletes a customer', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: null,
        phone: null,
        address_line1: '12 Harbor St',
        address_line2: null,
        city: null,
        state: null,
        postcode: null,
        notes: null,
        is_archived: true,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-03T00:00:00.000Z',
      },
      error: null,
    });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock,
      }),
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

    const response = await DELETE(
      new Request('http://localhost/api/customers/customer-1', {
        method: 'DELETE',
      }),
      buildContext('customer-1')
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ is_archived: true });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: null,
        phone: null,
        address: '12 Harbor St',
        notes: null,
        is_archived: true,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-03T00:00:00.000Z',
      },
    });
  });

  it('returns 404 when the customer does not exist', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })),
    });

    const response = await GET(
      new Request('http://localhost/api/customers/missing'),
      buildContext('missing')
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Customer not found.' });
  });
});
