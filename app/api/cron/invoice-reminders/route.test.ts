import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminClientMock, sendInvoiceReminderMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  sendInvoiceReminderMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/email/resend', () => ({
  sendInvoiceReminder: sendInvoiceReminderMock,
}));

import { GET } from '@/app/api/cron/invoice-reminders/route';

describe('invoice reminder cron', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T08:00:00.000+11:00'));
    process.env.CRON_SECRET = 'test-cron-secret';
    sendInvoiceReminderMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    vi.useRealTimers();
  });

  it('skips a due-soon reminder when an idempotency event already exists', async () => {
    const dueSoonInvoice = {
      id: 'invoice-1',
      invoice_number: 'INV-001',
      total_cents: 165000,
      due_date: '2026-04-04',
      status: 'sent',
      due_reminder_sent_at: null,
      overdue_reminder_sent_at: null,
      user_id: 'user-1',
      customers: {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
      },
    };
    const dueSoonQuery = {
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [dueSoonInvoice], error: null }),
    };
    const overdueQuery = {
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    let invoiceSelectCalls = 0;
    const invoiceUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const reminderEventQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          invoice_id: 'invoice-1',
          reminder_type: 'due_soon',
          status: 'sent',
        },
        error: null,
      }),
    };

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn(() => {
              invoiceSelectCalls += 1;
              return invoiceSelectCalls === 1 ? dueSoonQuery : overdueQuery;
            }),
            update: invoiceUpdateMock,
          };
        }

        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ user_id: 'user-1', business_name: 'Coatly Painting' }],
                error: null,
              }),
            }),
          };
        }

        if (table === 'invoice_reminder_events') {
          return {
            select: vi.fn().mockReturnValue(reminderEventQuery),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await GET(
      new Request('https://coatly.test/api/cron/invoice-reminders', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }) as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(sendInvoiceReminderMock).not.toHaveBeenCalled();
    expect(invoiceUpdateMock).not.toHaveBeenCalled();
    expect(payload.results.due_soon.skipped).toBe(1);
  });
});
