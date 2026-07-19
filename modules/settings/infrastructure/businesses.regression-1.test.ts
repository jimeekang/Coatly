import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSignedStorageUrlMock } = vi.hoisted(() => ({
  createSignedStorageUrlMock: vi.fn(),
}));

vi.mock('@/lib/supabase/storage', () => ({
  createSignedStorageUrl: createSignedStorageUrlMock,
}));

import { getBusinessProfile } from '@/modules/settings/infrastructure/businesses';

function createQuery(result: unknown) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.eq.mockReturnValue(query);
  return query;
}

describe('business profile schema fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedStorageUrlMock.mockResolvedValue(null);
  });

  it('retains invoice defaults when structured address columns are unavailable', async () => {
    const businessResults = [
      {
        data: null,
        error: { message: 'column businesses.address_line1 does not exist' },
      },
      {
        data: {
          user_id: 'user-1',
          name: 'QA Painting',
          abn: null,
          address: '1 Test Street, Sydney, NSW, 2000',
          phone: null,
          email: 'owner@example.com',
          invoice_payment_terms: 'Due within 7 days',
          invoice_bank_details: 'BSB 000-000',
          logo_url: null,
        },
        error: null,
      },
    ];
    const businessSelects: string[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn((columns: string) => {
              businessSelects.push(columns);
              return createQuery(businessResults.shift());
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: vi.fn(() =>
              createQuery({
                data: {
                  business_name: 'QA Painting',
                  abn: null,
                  phone: null,
                  email: 'owner@example.com',
                  logo_url: null,
                  address_line1: '1 Test Street',
                  city: 'Sydney',
                  state: 'NSW',
                  postcode: '2000',
                },
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await getBusinessProfile(
      supabase as never,
      'user-1',
      'owner@example.com'
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual(
      expect.objectContaining({
        paymentTerms: 'Due within 7 days',
        bankDetails: 'BSB 000-000',
        addressLine1: '1 Test Street',
      })
    );
    expect(businessSelects).toHaveLength(2);
    expect(businessSelects[1]).toContain('invoice_payment_terms');
    expect(businessSelects[1]).not.toContain('address_line1');
  });
});
