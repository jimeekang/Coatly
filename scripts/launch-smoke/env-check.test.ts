import { describe, expect, it, vi } from 'vitest';
import {
  classifyResendSender,
  runLaunchEnvCheck,
} from './env-check';

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_ADDRESS: 'Coatly <onboarding@resend.dev>',
  RESEND_TEST_RECIPIENT: 'verified@example.com',
  CRON_SECRET: 'cron-secret',
};

describe('launch smoke env check', () => {
  it('classifies Resend sandbox senders', () => {
    expect(classifyResendSender('Coatly <onboarding@resend.dev>')).toBe(
      'sandbox-test-recipient'
    );
    expect(classifyResendSender('quotes@example.com')).toBe(
      'customer-safe-sender'
    );
  });

  it('fails when required environment variables are missing', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://preview.example.com',
      env: {},
      fetchFn: vi.fn(),
      mode: 'preview',
    });

    expect(result).toMatchObject({
      ok: false,
      mode: 'preview',
      missing: expect.arrayContaining([
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RESEND_API_KEY',
        'RESEND_FROM_ADDRESS',
        'CRON_SECRET',
      ]),
    });
  });

  it('fails production when the sender is still the Resend sandbox sender', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://coatly.vercel.app',
      env: validEnv,
      fetchFn: vi.fn(),
      mode: 'production',
    });

    expect(result).toMatchObject({
      ok: false,
      mode: 'production',
      error: 'Production cannot use a Resend sandbox sender.',
      resendMode: 'sandbox-test-recipient',
    });
  });

  it('requires a test recipient when preview uses the Resend sandbox sender', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://preview.example.com',
      env: {
        ...validEnv,
        RESEND_TEST_RECIPIENT: '',
      },
      fetchFn: vi.fn(),
      mode: 'preview',
    });

    expect(result).toMatchObject({
      ok: false,
      error:
        'RESEND_TEST_RECIPIENT is required when using the Resend sandbox sender.',
      resendMode: 'sandbox-test-recipient',
    });
  });

  it('fails production when forced test recipient routing is enabled', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://coatly.vercel.app',
      env: {
        ...validEnv,
        RESEND_FROM_ADDRESS: 'Coatly <quotes@coatly.com.au>',
        RESEND_FORCE_TEST_RECIPIENT: 'true',
      },
      fetchFn: vi.fn(),
      mode: 'production',
    });

    expect(result).toMatchObject({
      ok: false,
      mode: 'production',
      error:
        'Production cannot force customer emails to the test recipient.',
    });
  });

  it('requires explicit live cron permission for authorised cron checks', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://coatly.vercel.app',
      env: {
        ...validEnv,
        RESEND_FROM_ADDRESS: 'Coatly <quotes@coatly.com.au>',
      },
      fetchFn: vi.fn().mockResolvedValue({ status: 401 }),
      mode: 'production',
      checkCronAuthorized: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error:
        'Authorised production cron checks can send real reminders. Pass --allow-live-cron only for a controlled manual smoke.',
    });
  });

  it('requires the cron endpoint to reject unauthorised requests', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://preview.example.com',
      env: validEnv,
      fetchFn: vi.fn().mockResolvedValue({ status: 200 }),
      mode: 'preview',
    });

    expect(result).toMatchObject({
      ok: false,
      error: 'Cron endpoint must return 401 without Authorization.',
      status: 200,
    });
  });

  it('passes preview with sandbox email routing and cron 401', async () => {
    const result = await runLaunchEnvCheck({
      appUrl: 'https://preview.example.com/',
      env: validEnv,
      fetchFn: vi.fn().mockResolvedValue({ status: 401 }),
      mode: 'preview',
    });

    expect(result).toEqual({
      ok: true,
      mode: 'preview',
      appUrl: 'https://preview.example.com',
      resendMode: 'sandbox-test-recipient',
      cronWithoutSecret: 401,
    });
  });

  it('passes production with a verified sender and authorised cron check', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          results: {
            due_soon: { errors: 0 },
            overdue: { errors: 0 },
          },
        }),
        status: 200,
      });

    const result = await runLaunchEnvCheck({
      appUrl: 'https://coatly.vercel.app',
      env: {
        ...validEnv,
        RESEND_FROM_ADDRESS: 'Coatly <quotes@coatly.com.au>',
      },
      fetchFn,
      mode: 'production',
      checkCronAuthorized: true,
      allowLiveCron: true,
    });

    expect(result).toEqual({
      ok: true,
      mode: 'production',
      appUrl: 'https://coatly.vercel.app',
      resendMode: 'customer-safe-sender',
      cronWithoutSecret: 401,
      cronWithSecret: 200,
    });
    expect(fetchFn).toHaveBeenLastCalledWith(
      'https://coatly.vercel.app/api/cron/invoice-reminders',
      { headers: { authorization: 'Bearer cron-secret' } }
    );
  });

  it('fails an authorised cron check when the response reports reminder errors', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          results: {
            due_soon: { errors: 1 },
            overdue: { errors: 0 },
          },
        }),
        status: 200,
      });

    const result = await runLaunchEnvCheck({
      appUrl: 'https://coatly.vercel.app',
      env: {
        ...validEnv,
        RESEND_FROM_ADDRESS: 'Coatly <quotes@coatly.com.au>',
      },
      fetchFn,
      mode: 'production',
      checkCronAuthorized: true,
      allowLiveCron: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error: 'Authorized cron response reported reminder errors.',
    });
  });
});
