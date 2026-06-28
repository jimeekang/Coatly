#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

type EnvMap = Record<string, string | undefined>;

export type LaunchEnvCheckMode = 'preview' | 'production';
export type ResendSenderMode =
  | 'sandbox-test-recipient'
  | 'customer-safe-sender';

type FetchFn = (
  input: string,
  init?: { headers?: Record<string, string> }
) => Promise<{ json?: () => Promise<unknown>; status: number }>;

type RunLaunchEnvCheckInput = {
  allowLiveCron?: boolean;
  appUrl: string | null | undefined;
  checkCronAuthorized?: boolean;
  env?: EnvMap;
  fetchFn?: FetchFn;
  mode: LaunchEnvCheckMode;
};

type LaunchEnvCheckResult =
  | {
      ok: true;
      mode: LaunchEnvCheckMode;
      appUrl: string;
      resendMode: ResendSenderMode;
      cronWithoutSecret: 401;
      cronWithSecret?: 200;
    }
  | {
      ok: false;
      mode: LaunchEnvCheckMode;
      appUrl?: string;
      error?: string;
      missing?: string[];
      resendMode?: ResendSenderMode;
      status?: number;
    };

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_ADDRESS',
  'CRON_SECRET',
] as const;

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function extractEmailAddress(value: string) {
  const bracketMatch = value.match(/<([^>]+)>/);
  return (bracketMatch?.[1] ?? value).trim().toLowerCase();
}

export function classifyResendSender(value: string): ResendSenderMode {
  return extractEmailAddress(value).endsWith('@resend.dev')
    ? 'sandbox-test-recipient'
    : 'customer-safe-sender';
}

function missingRequiredKeys(env: EnvMap) {
  return REQUIRED_ENV_KEYS.filter((key) => !env[key]?.trim());
}

function buildCronUrl(appUrl: string) {
  return `${normalizeBaseUrl(appUrl)}/api/cron/invoice-reminders`;
}

function cronPayloadHasErrors(payload: unknown) {
  if (!payload || typeof payload !== 'object') return true;
  const results = (payload as { results?: unknown }).results;
  if (!results || typeof results !== 'object') return false;
  const buckets = Object.values(results as Record<string, unknown>);

  return buckets.some((bucket) => {
    if (!bucket || typeof bucket !== 'object') return false;
    const errors = (bucket as { errors?: unknown }).errors;
    return typeof errors === 'number' && errors > 0;
  });
}

export async function runLaunchEnvCheck({
  allowLiveCron = false,
  appUrl,
  checkCronAuthorized = false,
  env = process.env,
  fetchFn = fetch,
  mode,
}: RunLaunchEnvCheckInput): Promise<LaunchEnvCheckResult> {
  const missing = missingRequiredKeys(env);
  if (missing.length > 0) {
    return { ok: false, mode, missing };
  }

  if (!appUrl?.trim()) {
    return {
      ok: false,
      mode,
      error: 'Missing --app-url or NEXT_PUBLIC_APP_URL.',
    };
  }

  const normalizedAppUrl = normalizeBaseUrl(appUrl);
  const resendMode = classifyResendSender(env.RESEND_FROM_ADDRESS ?? '');

  if (mode === 'production' && resendMode === 'sandbox-test-recipient') {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error: 'Production cannot use a Resend sandbox sender.',
      resendMode,
    };
  }

  if (resendMode === 'sandbox-test-recipient' && !env.RESEND_TEST_RECIPIENT?.trim()) {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error:
        'RESEND_TEST_RECIPIENT is required when using the Resend sandbox sender.',
      resendMode,
    };
  }

  if (mode === 'production' && env.RESEND_FORCE_TEST_RECIPIENT === 'true') {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error:
        'Production cannot force customer emails to the test recipient.',
      resendMode,
    };
  }

  const cronUrl = buildCronUrl(normalizedAppUrl);
  const unauthorizedCronResponse = await fetchFn(cronUrl);
  if (unauthorizedCronResponse.status !== 401) {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error: 'Cron endpoint must return 401 without Authorization.',
      resendMode,
      status: unauthorizedCronResponse.status,
    };
  }

  if (!checkCronAuthorized) {
    return {
      ok: true,
      mode,
      appUrl: normalizedAppUrl,
      resendMode,
      cronWithoutSecret: 401,
    };
  }

  if (mode === 'production' && !allowLiveCron) {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error:
        'Authorised production cron checks can send real reminders. Pass --allow-live-cron only for a controlled manual smoke.',
      resendMode,
    };
  }

  const authorizedCronResponse = await fetchFn(cronUrl, {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (authorizedCronResponse.status !== 200) {
    return {
      ok: false,
      mode,
      appUrl: normalizedAppUrl,
      error: 'Authorized cron endpoint must return 200.',
      resendMode,
      status: authorizedCronResponse.status,
    };
  }

  if (authorizedCronResponse.json) {
    const cronPayload = await authorizedCronResponse.json();
    if (cronPayloadHasErrors(cronPayload)) {
      return {
        ok: false,
        mode,
        appUrl: normalizedAppUrl,
        error: 'Authorized cron response reported reminder errors.',
        resendMode,
        status: authorizedCronResponse.status,
      };
    }
  }

  return {
    ok: true,
    mode,
    appUrl: normalizedAppUrl,
    resendMode,
    cronWithoutSecret: 401,
    cronWithSecret: 200,
  };
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const raw = trimmed.slice(separatorIndex + 1).trim();
    const value = raw.replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readCliFlag(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const mode: LaunchEnvCheckMode = process.argv.includes('--production')
    ? 'production'
    : 'preview';
  const result = await runLaunchEnvCheck({
    appUrl: readCliFlag('app-url') ?? process.env.NEXT_PUBLIC_APP_URL,
    allowLiveCron: process.argv.includes('--allow-live-cron'),
    checkCronAuthorized: process.argv.includes('--check-cron-authorized'),
    mode,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  });
}
