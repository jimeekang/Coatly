import { describe, expect, it, vi } from 'vitest';

import { getHydratedPublicQuoteDetailByToken } from '@/modules/quotes/infrastructure/quote-repository';

const basePublicQuoteRow = {
  id: 'quote-public-1',
  user_id: 'user-1',
  job_type: 'interior',
  approved_at: null,
  approved_by_name: null,
  approved_by_email: null,
  approval_signature: null,
  customer_email: 'client@example.com',
  customer_address: '128 Beach Street, Manly, NSW, 2095',
  quote_number: 'QUO-2026-001',
  title: 'Public quote',
  status: 'sent',
  valid_until: '2099-04-10',
  working_days: 2,
  notes: 'Client-facing note',
  subtotal_cents: 95000,
  gst_cents: 9500,
  total_cents: 104500,
  discount_cents: 0,
  manual_adjustment_cents: 0,
  deposit_percent: 0,
  customer: {
    id: 'customer-1',
    name: 'Harbor Cafe',
    company_name: null,
    email: 'client@example.com',
    phone: '0412 555 012',
    address_line1: '128 Beach Street',
    address_line2: null,
    city: 'Manly',
    state: 'NSW',
    postcode: '2095',
  },
};

function createQuoteOnlyClient(quote: Record<string, unknown>) {
  const fromMock = vi.fn((table: string) => {
    if (table !== 'quotes') {
      throw new Error(`Unexpected table ${table}`);
    }

    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: quote, error: null }),
        }),
      }),
    };
  });

  return {
    client: { from: fromMock },
    fromMock,
  };
}

describe('getHydratedPublicQuoteDetailByToken', () => {
  it('blocks revoked public quote share links before loading quote relations', async () => {
    const { client, fromMock } = createQuoteOnlyClient({
      ...basePublicQuoteRow,
      public_share_expires_at: null,
      public_share_revoked_at: '2026-04-19T00:00:00.000Z',
    });

    const result = await getHydratedPublicQuoteDetailByToken(
      client as never,
      '11111111-1111-4111-8111-111111111111'
    );

    expect(result).toEqual({
      data: null,
      error: 'This public quote link is no longer available.',
    });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('blocks expired public quote share links before loading quote relations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));

    const { client, fromMock } = createQuoteOnlyClient({
      ...basePublicQuoteRow,
      public_share_expires_at: '2026-04-19T23:59:59.000Z',
      public_share_revoked_at: null,
    });

    const result = await getHydratedPublicQuoteDetailByToken(
      client as never,
      '11111111-1111-4111-8111-111111111111'
    );

    expect(result).toEqual({
      data: null,
      error: 'This public quote link has expired.',
    });
    expect(fromMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
