import { describe, expect, it, vi } from 'vitest';
import {
  resolvePreviewSmokeConfig,
  runPreviewWorkflowSmoke,
  type BrowserLike,
  type PageLike,
} from './preview-workflow-smoke';

const validEnv = {
  LAUNCH_SMOKE_EMAIL: 'smoke@example.com',
  LAUNCH_SMOKE_PASSWORD: 'password',
  LAUNCH_SMOKE_EDIT_QUOTE_ID: 'quote-edit-1',
  LAUNCH_SMOKE_QUOTE_ID: 'quote-1',
  LAUNCH_SMOKE_QUOTE_TOKEN: 'quote-token',
  LAUNCH_SMOKE_INVOICE_ID: 'invoice-1',
  LAUNCH_SMOKE_INVOICE_TOKEN: 'invoice-token',
  LAUNCH_SMOKE_JOB_ID: 'job-1',
  RESEND_FROM_ADDRESS: 'Coatly <onboarding@resend.dev>',
};

function createPage(overrides: Partial<PageLike> = {}) {
  let currentUrl = 'https://preview.example.com/dashboard';
  const locator = {
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    first: vi.fn().mockReturnThis(),
    waitFor: vi.fn(async () => undefined),
  };

  const page: PageLike = {
    getByLabel: vi.fn(() => locator),
    getByRole: vi.fn(() => locator),
    getByTestId: vi.fn(() => locator),
    getByText: vi.fn(() => locator),
    goto: vi.fn(async (url) => {
      currentUrl = String(url);
      return undefined;
    }),
    waitForLoadState: vi.fn(async () => undefined),
    request: {
      get: vi.fn(async () => ({
        headers: () => ({ 'content-type': 'application/pdf' }),
        status: () => 200,
      })),
    },
    waitForURL: vi.fn(async () => undefined),
    url: vi.fn(() => currentUrl),
    ...overrides,
  };

  return { locator, page };
}

function createBrowser(page: PageLike) {
  const browser: BrowserLike = {
    close: vi.fn(async () => undefined),
    newPage: vi.fn(async () => page),
  };
  return browser;
}

describe('preview workflow smoke runner', () => {
  it('requires app URL and fixture credentials before running', () => {
    expect(() =>
      resolvePreviewSmokeConfig({
        args: [],
        env: {},
      })
    ).toThrow('Missing required preview smoke inputs');
  });

  it('normalizes the app URL and reads fixture env', () => {
    expect(
      resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com/'],
        env: validEnv,
      })
    ).toEqual({
      appUrl: 'https://preview.example.com',
      editQuoteId: 'quote-edit-1',
      email: 'smoke@example.com',
      invoiceId: 'invoice-1',
      invoiceToken: 'invoice-token',
      jobId: 'job-1',
      password: 'password',
      production: false,
      quoteId: 'quote-1',
      quoteToken: 'quote-token',
      sendEmail: false,
    });
  });

  it('falls back to the main quote id when no edit quote fixture is provided', () => {
    const env = { ...validEnv };
    delete env.LAUNCH_SMOKE_EDIT_QUOTE_ID;

    expect(
      resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com'],
        env,
      }).editQuoteId
    ).toBe('quote-1');
  });

  it('refuses production email smoke with a sandbox sender', () => {
    expect(() =>
      resolvePreviewSmokeConfig({
        args: [
          '--app-url=https://coatly.vercel.app',
          '--production',
          '--send-email',
        ],
        env: validEnv,
      })
    ).toThrow('Refusing production email smoke with Resend sandbox sender');
  });

  it('checks authenticated pages and PDF endpoints', async () => {
    const visitedPaths: string[] = [];
    const { page } = createPage();
    vi.mocked(page.goto).mockImplementation(async (url) => {
      visitedPaths.push(new URL(String(url)).pathname);
      return undefined;
    });
    vi.mocked(page.url).mockImplementation(
      () => `https://preview.example.com${visitedPaths.at(-1) ?? '/dashboard'}`
    );
    const browser = createBrowser(page);

    const result = await runPreviewWorkflowSmoke({
      browser,
      config: resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com'],
        env: validEnv,
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.results.map((step) => step.name)).toEqual([
      'login',
      'dashboard-authenticated',
      'quote-detail',
      'quote-edit',
      'quote-pdf-auth',
      'public-quote-page',
      'invoice-detail',
      'invoice-pdf-public-token',
      'schedule-authenticated',
      'job-detail',
    ]);
    expect(page.goto).toHaveBeenCalledWith(
      'https://preview.example.com/quotes/quote-edit-1/edit',
      { waitUntil: 'domcontentloaded' }
    );
    expect(page.goto).toHaveBeenCalledWith(
      'https://preview.example.com/quotes/quote-1',
      { waitUntil: 'domcontentloaded' }
    );
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
    expect(page.request.get).toHaveBeenCalledWith(
      'https://preview.example.com/api/pdf/invoice?token=invoice-token'
    );
    expect(page.getByText).toHaveBeenCalledWith(
      /\[LAUNCH_SMOKE\] Interior repaint/i
    );
    expect(page.getByRole).toHaveBeenCalledWith('link', { name: /pdf/i });
    expect(browser.close).toHaveBeenCalled();
  });

  it('fails authenticated checks when the app redirects to login', async () => {
    const { page } = createPage({
      url: vi.fn(() => 'https://preview.example.com/login'),
    });
    const browser = createBrowser(page);

    const result = await runPreviewWorkflowSmoke({
      browser,
      config: resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com'],
        env: validEnv,
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.results).toContainEqual({
      name: 'dashboard-authenticated',
      ok: false,
      error: 'Expected path /dashboard, got /login',
    });
  });

  it('runs invoice email smoke only when explicitly requested', async () => {
    const { page } = createPage();
    const browser = createBrowser(page);

    const result = await runPreviewWorkflowSmoke({
      browser,
      config: resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com', '--send-email'],
        env: validEnv,
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.results.at(-1)).toEqual({
      name: 'invoice-email-send',
      ok: true,
    });
    expect(page.getByText).toHaveBeenCalledWith(/\[LAUNCH_SMOKE\]/i);
    expect(page.getByRole).toHaveBeenCalledWith('button', {
      name: /send invoice/i,
    });
    expect(page.getByRole).toHaveBeenCalledWith('button', {
      name: /record payment/i,
    });
    expect(page.getByText).toHaveBeenCalledWith(/^Sent$/i);
  });

  it('continues recording later checks when one step fails', async () => {
    const { page } = createPage({
      waitForURL: vi.fn(async () => {
        throw new Error('login failed');
      }),
    });
    const browser = createBrowser(page);

    const result = await runPreviewWorkflowSmoke({
      browser,
      config: resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com'],
        env: validEnv,
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.results[0]).toEqual({
      name: 'login',
      ok: false,
      error: 'login failed',
    });
    expect(result.results).toHaveLength(10);
    expect(browser.close).toHaveBeenCalled();
  });

  it('fails a PDF check when content type is not PDF', async () => {
    const { page } = createPage({
      request: {
        get: vi.fn(async () => ({
          headers: () => ({ 'content-type': 'text/html' }),
          status: () => 200,
        })),
      },
    });
    const browser = createBrowser(page);

    const result = await runPreviewWorkflowSmoke({
      browser,
      config: resolvePreviewSmokeConfig({
        args: ['--app-url=https://preview.example.com'],
        env: validEnv,
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.results).toContainEqual({
      name: 'quote-pdf-auth',
      ok: false,
      error: 'Expected PDF response, got text/html',
    });
  });
});
