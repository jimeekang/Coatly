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

import { GET, POST } from '@/app/api/customers/route';

describe('/api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      active: true,
    });
  });

  it('lists active customers for the current user', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'customer-1',
          user_id: 'user-1',
          name: 'Mark Johnson',
          email: 'mark@example.com',
          phone: '0412 345 678',
          address_line1: '12 Harbor St',
          address_line2: null,
          city: 'Manly',
          state: 'NSW',
          postcode: '2095',
          notes: 'Call before arrival',
          is_archived: false,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
        },
      ],
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
          order: orderMock,
        }),
      })),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'customer-1',
          user_id: 'user-1',
          name: 'Mark Johnson',
          email: 'mark@example.com',
          phone: '0412 345 678',
          address: '12 Harbor St, Manly, NSW, 2095',
          notes: 'Call before arrival',
          is_archived: false,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
        },
      ],
    });
  });

  it('requires authentication for reads', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('creates a customer from the simplified API payload', async () => {
    const insertSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'mark@example.com',
        phone: '0412 345 678',
        address_line1: '12 Harbor St, Manly NSW 2095',
        address_line2: null,
        city: null,
        state: null,
        postcode: null,
        notes: 'Gate code 1024',
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
      error: null,
    });
    const insertSelectMock = vi.fn().mockReturnValue({
      single: insertSingleMock,
    });
    const insertMock = vi.fn().mockReturnValue({
      select: insertSelectMock,
    });

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: insertMock,
      });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: fromMock,
    });

    const response = await POST(
      new Request('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Mark Johnson',
          email: 'Mark@Example.com',
          phone: '0412 345 678',
          address: '12 Harbor St, Manly NSW 2095',
          notes: 'Gate code 1024',
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Mark Johnson',
      email: 'mark@example.com',
      phone: '0412 345 678',
      address_line1: '12 Harbor St, Manly NSW 2095',
      address_line2: null,
      city: null,
      state: null,
      postcode: null,
      notes: 'Gate code 1024',
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'customer-1',
        user_id: 'user-1',
        name: 'Mark Johnson',
        email: 'mark@example.com',
        phone: '0412 345 678',
        address: '12 Harbor St, Manly NSW 2095',
        notes: 'Gate code 1024',
        is_archived: false,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    });
  });

  it('rejects duplicate customers with the same name and address', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'customer-1',
              user_id: 'user-1',
              name: 'Mark Johnson',
              email: null,
              phone: null,
              address_line1: '12 Harbor St, Manly NSW 2095',
              address_line2: null,
              city: null,
              state: null,
              postcode: null,
              notes: null,
              is_archived: false,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            },
          ],
          error: null,
        }),
      }),
      insert: vi.fn(),
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: fromMock,
    });

    const response = await POST(
      new Request('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Mark Johnson',
          address: '12 Harbor St, Manly NSW 2095',
        }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'A customer with this name and address already exists.',
    });
  });
});
