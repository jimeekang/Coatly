import { describe, expect, it, vi } from 'vitest';
import {
  resolveLaunchSmokeSeedConfig,
  runLaunchSmokeSeed,
  type LaunchSmokeDb,
} from './seed-fixture';

const validEnv = {
  ALLOW_LAUNCH_SMOKE_SEED: 'true',
  LAUNCH_SMOKE_EMAIL: 'smoke@example.com',
  LAUNCH_SMOKE_PASSWORD: 'correct-horse-battery-staple',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  RESEND_TEST_RECIPIENT: 'verified@example.com',
};

function createFakeDb(overrides: Partial<LaunchSmokeDb> = {}) {
  const calls: string[] = [];
  let quoteCreateCount = 0;
  const quoteIds = ['quote-1', 'quote-edit-1', 'quote-approval-1'];
  const quoteTokens = ['quote-token', null, 'approval-quote-token'];
  const db: LaunchSmokeDb = {
    cleanupFixture: vi.fn(async () => void calls.push('cleanupFixture')),
    createCustomer: vi.fn(async () => {
      calls.push('createCustomer');
      return 'customer-1';
    }),
    createInvoice: vi.fn(async () => {
      calls.push('createInvoice');
      return {
        id: 'invoice-1',
        public_share_token: 'invoice-token',
      };
    }),
    createInvoiceLineItem: vi.fn(async () =>
      void calls.push('createInvoiceLineItem')
    ),
    createJob: vi.fn(async () => {
      calls.push('createJob');
      return 'job-1';
    }),
    createJobScheduleDay: vi.fn(async () =>
      void calls.push('createJobScheduleDay')
    ),
    createQuote: vi.fn(async () => {
      calls.push('createQuote');
      quoteCreateCount += 1;
      return {
        id: quoteIds[quoteCreateCount - 1] ?? `quote-${quoteCreateCount}`,
        public_share_token: quoteTokens[quoteCreateCount - 1] ?? null,
      };
    }),
    createQuoteLineItem: vi.fn(async () => void calls.push('createQuoteLineItem')),
    createUser: vi.fn(async () => {
      calls.push('createUser');
      return { id: 'user-1', email: 'smoke@example.com' };
    }),
    findExistingFixtureIds: vi.fn(async () => {
      calls.push('findExistingFixtureIds');
      return {
        customerIds: ['customer-old'],
        invoiceIds: ['invoice-old'],
        jobIds: ['job-old'],
        quoteIds: ['quote-old'],
      };
    }),
    listUsers: vi.fn(async () => {
      calls.push('listUsers');
      return [];
    }),
    upsertProfile: vi.fn(async () => void calls.push('upsertProfile')),
    upsertSubscription: vi.fn(async () => void calls.push('upsertSubscription')),
    ...overrides,
  };

  return { calls, db };
}

describe('launch smoke fixture seed', () => {
  it('requires explicit opt-in before seeding', () => {
    expect(() =>
      resolveLaunchSmokeSeedConfig({
        ...validEnv,
        ALLOW_LAUNCH_SMOKE_SEED: '',
      })
    ).toThrow('ALLOW_LAUNCH_SMOKE_SEED=true');
  });

  it('refuses to run with NODE_ENV=production', () => {
    expect(() =>
      resolveLaunchSmokeSeedConfig({
        ...validEnv,
        NODE_ENV: 'production',
      })
    ).toThrow('Refusing to seed launch smoke data with NODE_ENV=production');
  });

  it('requires extra opt-in for the known live Supabase project', () => {
    expect(() =>
      resolveLaunchSmokeSeedConfig({
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_URL:
          'https://qwjpqujdykojxsisjltd.supabase.co',
      })
    ).toThrow('ALLOW_LIVE_SUPABASE_SMOKE_SEED=true');
  });

  it('requires smoke account credentials and Supabase service role env', () => {
    expect(() =>
      resolveLaunchSmokeSeedConfig({
        ALLOW_LAUNCH_SMOKE_SEED: 'true',
      })
    ).toThrow('Missing required launch smoke seed env');
  });

  it('reuses an existing smoke user and prepares dashboard access', async () => {
    const { calls, db } = createFakeDb({
      listUsers: vi.fn(async () => {
        calls.push('listUsers');
        return [{ id: 'user-existing', email: 'smoke@example.com' }];
      }),
    });

    const result = await runLaunchSmokeSeed({
      db,
      env: validEnv,
      now: new Date('2026-06-28T00:00:00.000Z'),
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('quote-token')
        .mockReturnValueOnce('approval-quote-token')
        .mockReturnValueOnce('invoice-token'),
    });

    expect(result).toMatchObject({
      ok: true,
      userId: 'user-existing',
      email: 'smoke@example.com',
      editQuoteId: 'quote-edit-1',
      quoteId: 'quote-1',
      approvalQuoteId: 'quote-approval-1',
      approvalQuoteToken: 'approval-quote-token',
      bookingDate: '2026-07-08',
      invoiceId: 'invoice-1',
      jobId: 'job-1',
    });
    expect(db.createUser).not.toHaveBeenCalled();
    expect(db.upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-existing',
        onboarding_completed: true,
      })
    );
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-existing',
        status: 'trialing',
        plan: 'pro',
      })
    );
    expect(calls.indexOf('cleanupFixture')).toBeLessThan(
      calls.indexOf('createCustomer')
    );
  });

  it('creates tagged customer, quote line item, invoice and invoice line item', async () => {
    const { db } = createFakeDb();

    await runLaunchSmokeSeed({
      db,
      env: validEnv,
      now: new Date('2026-06-28T00:00:00.000Z'),
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('quote-token')
        .mockReturnValueOnce('approval-quote-token')
        .mockReturnValueOnce('invoice-token'),
    });

    expect(db.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: '[LAUNCH_SMOKE] Preview Customer',
        email: 'verified@example.com',
      })
    );
    expect(db.createQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        customer_id: 'customer-1',
        public_share_token: 'quote-token',
        quote_number: 'SMOKE-Q-20260628',
        status: 'sent',
      })
    );
    expect(db.createQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        customer_id: 'customer-1',
        quote_number: 'SMOKE-Q-EDIT-20260628',
        status: 'draft',
        title: '[LAUNCH_SMOKE] Editable smoke quote',
      })
    );
    expect(db.createQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        customer_id: 'customer-1',
        public_share_token: 'approval-quote-token',
        quote_number: 'SMOKE-Q-APPROVE-20260628',
        status: 'sent',
        title: '[LAUNCH_SMOKE] Approval booking smoke quote',
        working_days: 1,
      })
    );
    expect(db.createQuoteLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        quote_id: 'quote-1',
        name: '[LAUNCH_SMOKE] Interior repaint labour',
        is_selected: true,
      })
    );
    expect(db.createQuoteLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        quote_id: 'quote-edit-1',
        name: '[LAUNCH_SMOKE] Editable quote labour',
        is_selected: true,
      })
    );
    expect(db.createQuoteLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        quote_id: 'quote-approval-1',
        name: '[LAUNCH_SMOKE] Approval quote labour',
        is_selected: true,
      })
    );
    expect(db.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'SMOKE-I-20260628',
        public_share_token: 'invoice-token',
        status: 'draft',
      })
    );
    expect(db.createInvoiceLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: 'invoice-1',
        description: '[LAUNCH_SMOKE] Interior repaint labour',
      })
    );
    expect(db.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        customer_id: 'customer-1',
        quote_id: 'quote-1',
        title: '[LAUNCH_SMOKE] Scheduled smoke job',
      })
    );
    expect(db.createJobScheduleDay).toHaveBeenCalledWith({
      date: '2026-07-01',
      job_id: 'job-1',
      user_id: 'user-1',
    });
  });

  it('cleans up only ids resolved for the smoke user before creating new records', async () => {
    const { db } = createFakeDb();

    await runLaunchSmokeSeed({
      db,
      env: validEnv,
      now: new Date('2026-06-28T00:00:00.000Z'),
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('quote-token')
        .mockReturnValueOnce('approval-quote-token')
        .mockReturnValueOnce('invoice-token'),
    });

    expect(db.findExistingFixtureIds).toHaveBeenCalledWith({
      tag: '[LAUNCH_SMOKE]',
      userId: 'user-1',
    });
    expect(db.cleanupFixture).toHaveBeenCalledWith({
      customerIds: ['customer-old'],
      invoiceIds: ['invoice-old'],
      jobIds: ['job-old'],
      quoteIds: ['quote-old'],
    });
  });
});
