#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

type EnvMap = Record<string, string | undefined>;

type LocatorLike = {
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  first(): LocatorLike;
  waitFor(options?: { timeout?: number }): Promise<void>;
};

type ResponseLike = {
  headers(): Record<string, string>;
  status(): number;
};

export type PageLike = {
  getByLabel(text: RegExp | string): LocatorLike;
  getByRole(
    role: string,
    options?: { name?: RegExp | string }
  ): LocatorLike;
  getByTestId(testId: string): LocatorLike;
  getByText(text: RegExp | string): LocatorLike;
  goto(
    url: string,
    options?: { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle' }
  ): Promise<unknown>;
  waitForLoadState(state: 'domcontentloaded' | 'load' | 'networkidle'): Promise<void>;
  request: {
    get(url: string): Promise<ResponseLike>;
  };
  waitForURL(url: RegExp | string, options?: { timeout?: number }): Promise<void>;
  url(): string;
};

export type BrowserLike = {
  close(): Promise<void>;
  newPage(options?: { viewport?: { width: number; height: number } }): Promise<PageLike>;
};

export type PreviewSmokeConfig = {
  appUrl: string;
  editQuoteId: string;
  email: string;
  invoiceId: string;
  invoiceToken: string;
  jobId: string;
  password: string;
  production: boolean;
  quoteId: string;
  quoteToken: string;
  sendEmail: boolean;
};

type SmokeStepResult =
  | { name: string; ok: true }
  | { name: string; ok: false; error: string };

export type PreviewSmokeResult = {
  ok: boolean;
  results: SmokeStepResult[];
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getArg(args: string[], name: string) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function extractEmailAddress(value: string) {
  const bracketMatch = value.match(/<([^>]+)>/);
  return (bracketMatch?.[1] ?? value).trim().toLowerCase();
}

function requireInput(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required preview smoke inputs: ${name}`);
  }

  return value.trim();
}

export function resolvePreviewSmokeConfig({
  args = process.argv.slice(2),
  env = process.env,
}: {
  args?: string[];
  env?: EnvMap;
}): PreviewSmokeConfig {
  const appUrl =
    getArg(args, 'app-url') ?? env.LAUNCH_SMOKE_APP_URL ?? env.NEXT_PUBLIC_APP_URL;

  const production = args.includes('--production');
  const sendEmail = args.includes('--send-email');
  const resendFrom = env.RESEND_FROM_ADDRESS?.trim() ?? '';
  const resendAddress = extractEmailAddress(resendFrom);

  if (
    production &&
    sendEmail &&
    (resendAddress.endsWith('@resend.dev') ||
      env.RESEND_FORCE_TEST_RECIPIENT === 'true')
  ) {
    throw new Error(
      'Refusing production email smoke with Resend sandbox sender or forced test recipient routing.'
    );
  }

  return {
    appUrl: normalizeBaseUrl(requireInput('app-url', appUrl)),
    editQuoteId:
      env.LAUNCH_SMOKE_EDIT_QUOTE_ID?.trim() ||
      requireInput('LAUNCH_SMOKE_QUOTE_ID', env.LAUNCH_SMOKE_QUOTE_ID),
    email: requireInput('LAUNCH_SMOKE_EMAIL', env.LAUNCH_SMOKE_EMAIL),
    invoiceId: requireInput('LAUNCH_SMOKE_INVOICE_ID', env.LAUNCH_SMOKE_INVOICE_ID),
    invoiceToken: requireInput(
      'LAUNCH_SMOKE_INVOICE_TOKEN',
      env.LAUNCH_SMOKE_INVOICE_TOKEN
    ),
    jobId: requireInput('LAUNCH_SMOKE_JOB_ID', env.LAUNCH_SMOKE_JOB_ID),
    password: requireInput(
      'LAUNCH_SMOKE_PASSWORD',
      env.LAUNCH_SMOKE_PASSWORD
    ),
    production,
    quoteId: requireInput('LAUNCH_SMOKE_QUOTE_ID', env.LAUNCH_SMOKE_QUOTE_ID),
    quoteToken: requireInput(
      'LAUNCH_SMOKE_QUOTE_TOKEN',
      env.LAUNCH_SMOKE_QUOTE_TOKEN
    ),
    sendEmail,
  };
}

async function assertPdfResponse(response: ResponseLike) {
  if (response.status() !== 200) {
    throw new Error(`Expected 200, got ${response.status()}`);
  }

  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new Error(`Expected PDF response, got ${contentType || 'unknown'}`);
  }
}

function assertCurrentPath(page: PageLike, expectedPath: string) {
  const currentUrl = new URL(page.url());
  if (currentUrl.pathname !== expectedPath) {
    throw new Error(
      `Expected path ${expectedPath}, got ${currentUrl.pathname}`
    );
  }
}

async function runStep(
  results: SmokeStepResult[],
  name: string,
  step: () => Promise<void>
) {
  try {
    await step();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function runPreviewWorkflowSmoke({
  browser,
  config,
}: {
  browser: BrowserLike;
  config: PreviewSmokeConfig;
}): Promise<PreviewSmokeResult> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const results: SmokeStepResult[] = [];

  try {
    await runStep(results, 'login', async () => {
      await page.goto(`${config.appUrl}/login`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('networkidle');
      await page.getByLabel(/email/i).fill(config.email);
      await page.getByLabel(/password/i).fill(config.password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL(/dashboard|onboarding|quotes/, {
        timeout: 15_000,
      });
    });

    await runStep(results, 'dashboard-authenticated', async () => {
      await page.goto(`${config.appUrl}/dashboard`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, '/dashboard');
      await page.getByText(/dashboard|quotes|revenue/i).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'quote-detail', async () => {
      await page.goto(`${config.appUrl}/quotes/${config.quoteId}`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, `/quotes/${config.quoteId}`);
      await page.getByText(/\[LAUNCH_SMOKE\] Interior repaint/i).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'quote-edit', async () => {
      await page.goto(`${config.appUrl}/quotes/${config.editQuoteId}/edit`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, `/quotes/${config.editQuoteId}/edit`);
      await page.getByText(/\[LAUNCH_SMOKE\] Editable smoke quote/i).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'quote-pdf-auth', async () => {
      await assertPdfResponse(
        await page.request.get(`${config.appUrl}/api/pdf/quote?id=${config.quoteId}`)
      );
    });

    await runStep(results, 'public-quote-page', async () => {
      await page.goto(`${config.appUrl}/q/${config.quoteToken}`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, `/q/${config.quoteToken}`);
      await page.getByText(/\[LAUNCH_SMOKE\] Interior repaint/i).first().waitFor({
        timeout: 10_000,
      });
      await page.getByRole('link', { name: /pdf/i }).first().waitFor({
        timeout: 10_000,
      });
      await page.getByRole('button', { name: /approve quote/i }).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'invoice-detail', async () => {
      await page.goto(`${config.appUrl}/invoices/${config.invoiceId}`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, `/invoices/${config.invoiceId}`);
      await page.getByText(/\[LAUNCH_SMOKE\]/i).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'invoice-pdf-public-token', async () => {
      await assertPdfResponse(
        await page.request.get(
          `${config.appUrl}/api/pdf/invoice?token=${config.invoiceToken}`
        )
      );
    });

    await runStep(results, 'schedule-authenticated', async () => {
      await page.goto(`${config.appUrl}/schedule`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, '/schedule');
      await page.getByText(/schedule|job/i).first().waitFor({
        timeout: 10_000,
      });
    });

    await runStep(results, 'job-detail', async () => {
      await page.goto(`${config.appUrl}/jobs/${config.jobId}`, {
        waitUntil: 'domcontentloaded',
      });
      assertCurrentPath(page, `/jobs/${config.jobId}`);
      await page.getByText(/\[LAUNCH_SMOKE\] Scheduled smoke job/i).first().waitFor({
        timeout: 10_000,
      });
    });

    if (config.sendEmail) {
      await runStep(results, 'invoice-email-send', async () => {
        await page.goto(`${config.appUrl}/invoices/${config.invoiceId}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.getByText(/\[LAUNCH_SMOKE\]/i).first().waitFor({
          timeout: 10_000,
        });
        await page.getByRole('button', { name: /send invoice/i }).click();
        await page.getByText(/^Sent$/i).first().waitFor({
          timeout: 20_000,
        });
        await page.getByRole('button', { name: /record payment/i }).first().waitFor({
          timeout: 20_000,
        });
      });
    }
  } finally {
    await browser.close();
  }

  return {
    ok: results.every((result) => result.ok),
    results,
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

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const config = resolvePreviewSmokeConfig({});
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const result = await runPreviewWorkflowSmoke({
    browser,
    config,
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
