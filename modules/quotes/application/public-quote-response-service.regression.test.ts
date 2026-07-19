import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getBusinessDocumentBrandingMock, sendQuoteApprovalNotificationMock } =
  vi.hoisted(() => ({
    getBusinessDocumentBrandingMock: vi.fn(),
    sendQuoteApprovalNotificationMock: vi.fn(),
  }));

vi.mock('@/modules/settings/application/business-branding', () => ({
  getBusinessDocumentBranding: getBusinessDocumentBrandingMock,
}));

vi.mock('@/lib/email/resend', () => ({
  sendQuoteApprovalNotification: sendQuoteApprovalNotificationMock,
}));

import { approvePublicQuoteResponse } from '@/modules/quotes/application/public-quote-response-service';

describe('approvePublicQuoteResponse regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBusinessDocumentBrandingMock.mockResolvedValue({
      data: { name: 'Harbor Painting', email: 'owner@example.com' },
      error: null,
    });
  });

  it('returns a warning after saving approval when the owner notification fails', async () => {
    sendQuoteApprovalNotificationMock.mockResolvedValue({
      error: 'Resend is unavailable',
    });

    const updateResult = vi.fn().mockResolvedValue({ error: null });
    const quoteQuery = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'quote-1',
          user_id: 'user-1',
          customer_email: 'client@example.com',
          customer_address: null,
          quote_number: 'QUO-2026-001',
          title: 'Cafe repaint',
          status: 'sent',
          valid_until: '2099-04-10',
          total_cents: 104500,
          customer: {
            id: 'customer-1',
            name: 'Harbor Cafe',
            company_name: null,
            email: 'client@example.com',
            phone: null,
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            postcode: null,
          },
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'quotes') {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn().mockReturnValue(quoteQuery),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: updateResult,
            }),
          }),
        };
      }),
    } as unknown as Parameters<typeof approvePublicQuoteResponse>[0]['supabase'];

    const result = await approvePublicQuoteResponse({
      supabase,
      quoteToken: 'quote-token',
      approvedByName: 'Alex Harper',
      approvedByEmail: 'alex@example.com',
      approvalSignature: 'Alex Harper',
    });

    expect(result).toEqual({
      data: { quoteId: 'quote-1' },
      error: null,
      warning:
        'Your quote was approved, but we could not notify the business by email. Your approval was saved.',
    });
    expect(updateResult).toHaveBeenCalledOnce();
  });
});
