# Launch Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the remaining launch blockers into repeatable release gates, then clear the gates for preview and production.

**Architecture:** Do not add new product surface first. Add small verification scripts, a tagged launch fixture, stable smoke selectors, and release documentation so the current quote/email/public approval/invoice/job workflow can be tested every time before deploy. Keep customer-facing behavior unchanged unless smoke testing exposes a real bug.

**Tech Stack:** Next.js 16 App Router, Supabase Auth/Postgres/RLS, Vercel Preview/Production envs, Resend, Stripe test env, Vitest, optional Playwright for authenticated browser smoke.

---

## Current Analysis

External launch is still blocked, but not because the whole product is missing. The core quote, PDF, public quote, invoice, job, schedule, durable public rate limit, and basic preview deployment paths exist and pass local quality gates.

The remaining blockers are operational confidence blockers:

1. **P0: Authenticated Preview Workflow Smoke**
   The preview deployment has only unauthenticated smoke evidence. There is no repeatable proof that a logged-in user can create/edit/send a quote, load PDFs, approve/reject from the public link, send invoice email, and convert an approved quote to job/schedule on the deployed app.

2. **P0: Production Email/Cron Verification**
   Preview uses safe Resend sandbox/test-recipient settings. Production still needs customer-safe Resend sender/API config and `CRON_SECRET` verification before customers can receive real emails or invoice reminders.

3. **P1: A Real Workflow Fixture**
   v1 is an Excel/PDF/email workflow replacement. A's actual price sheet and one recent quote/email still need to be recreated in Coatly to prove totals, PDF presentation, send loop, approval, invoice, and scheduling work for the real use case.

4. **P1: Supabase CLI Bookkeeping**
   Supabase MCP is working and live drift was repaired. CLI link/token repair remains useful for future DB lint/repair, but it is not the next launch blocker if MCP remains available.

5. **P2: Mobile Detail Spacing**
   Important for polish, but it should follow the P0 workflow gates unless smoke testing finds a mobile-blocking defect.

## Direction

Proceed in this order:

1. Build a repeatable **preview smoke pack**: test account, tagged fixture data, browser/API smoke runner, and checklist output.
2. Build a **production email/cron gate**: env classifier plus controlled live email/cron verification.
3. Run the **A workflow fixture** through the app and record gaps.
4. Only then decide whether product/UI fixes are required.

This avoids adding features before proving the current product can safely run.

## Files To Create Or Modify

- Create `scripts/launch-smoke/env-check.mjs`
  - Validates required env names for preview or production.
  - Classifies Resend sender as sandbox or customer-safe.
  - Verifies public app URL and cron unauthorized behavior.

- Create `scripts/launch-smoke/seed-fixture.mjs`
  - Creates or refreshes a tagged launch smoke fixture using Supabase service role.
  - Uses a test account only.
  - Creates one customer, one sent quote with public token, one draft invoice, and one approved-quote-ready path.

- Create `scripts/launch-smoke/preview-workflow-smoke.mjs`
  - Runs against a Vercel Preview URL.
  - Logs in as the test user.
  - Opens dashboard, quote detail/edit/PDF, public quote, invoice detail/PDF, and schedule/job paths.
  - Emits a compact pass/fail JSON summary.

- Modify `package.json`
  - Add `smoke:env`, `smoke:seed`, and `smoke:preview` scripts.
  - Add Playwright only if the runner needs real browser login.

- Modify selected UI files only if needed for stable selectors:
  - `components/auth/LoginPageClient.tsx`
  - `modules/quotes/ui/QuoteForm.tsx`
  - `modules/quotes/ui/QuoteActions.tsx`
  - `modules/invoices/ui/InvoiceDetail.tsx`
  - `modules/quotes/ui/public/PublicApprovalForm.tsx`
  - `modules/quotes/ui/public/PublicDatePickerStep.tsx`

- Create `docs/launch/SMOKE-CHECKLIST.md`
  - Human-readable checklist for preview and production smoke.
  - Records the exact test account, fixture tag, URLs, and expected outcomes without secrets.

- Modify `docs/LAUNCH-READINESS.md`, `docs/SECURITY.md`, and `docs/PLANS.md`
  - Update only after smoke has actually passed.

## Task 1: Environment Gate Script

**Files:**
- Create: `scripts/launch-smoke/env-check.mjs`
- Modify: `package.json`
- Test: run script locally against `.env.local` and target preview URL.

- [ ] **Step 1: Create the script skeleton**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv.includes('--production') ? 'production' : 'preview';
const appUrlArg = process.argv.find((arg) => arg.startsWith('--app-url='));
const appUrl = appUrlArg?.slice('--app-url='.length) ?? process.env.NEXT_PUBLIC_APP_URL;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_ADDRESS',
  'CRON_SECRET',
];

const missing = required.filter((key) => !process.env[key]?.trim());
const from = process.env.RESEND_FROM_ADDRESS?.trim() ?? '';
const fromAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
const sandboxSender = fromAddress.toLowerCase().endsWith('@resend.dev');

if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, mode, missing }, null, 2));
  process.exit(1);
}

if (mode === 'production' && sandboxSender) {
  console.error(JSON.stringify({
    ok: false,
    mode,
    error: 'Production cannot use a Resend sandbox sender.',
    resendFrom: from,
  }, null, 2));
  process.exit(1);
}

if (!appUrl) {
  console.error(JSON.stringify({ ok: false, mode, error: 'Missing --app-url or NEXT_PUBLIC_APP_URL.' }, null, 2));
  process.exit(1);
}

const cronResponse = await fetch(`${appUrl.replace(/\/$/, '')}/api/cron/invoice-reminders`);
if (cronResponse.status !== 401) {
  console.error(JSON.stringify({
    ok: false,
    mode,
    error: 'Cron endpoint must return 401 without Authorization.',
    status: cronResponse.status,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mode,
  appUrl,
  resendMode: sandboxSender ? 'sandbox-test-recipient' : 'customer-safe-sender',
  cronWithoutSecret: 401,
}, null, 2));
```

- [ ] **Step 2: Add package script**

```json
{
  "scripts": {
    "smoke:env": "node scripts/launch-smoke/env-check.mjs"
  }
}
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run smoke:env -- --app-url=https://coatly-2ir6cs2rb-kjm12081-3858s-projects.vercel.app
```

Expected:

```json
{
  "ok": true,
  "mode": "preview",
  "resendMode": "sandbox-test-recipient",
  "cronWithoutSecret": 401
}
```

## Task 2: Tagged Launch Fixture

**Files:**
- Create: `scripts/launch-smoke/seed-fixture.mjs`
- Modify: `package.json`
- Optional reference: `scripts/seed-demo-data.ts`

- [ ] **Step 1: Create a fixture seed script with hard safety guards**

```js
#!/usr/bin/env node
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const tag = '[LAUNCH_SMOKE]';
const email = process.env.LAUNCH_SMOKE_EMAIL;
const password = process.env.LAUNCH_SMOKE_PASSWORD;

if (process.env.ALLOW_LAUNCH_SMOKE_SEED !== 'true') {
  throw new Error('Set ALLOW_LAUNCH_SMOKE_SEED=true to seed launch smoke data.');
}

if (!email || !password) {
  throw new Error('Set LAUNCH_SMOKE_EMAIL and LAUNCH_SMOKE_PASSWORD.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase env.');
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (usersError) throw usersError;

let user = users.users.find((candidate) => candidate.email === email);
if (!user) {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { launch_smoke: true },
  });
  if (created.error) throw created.error;
  user = created.data.user;
}

if (!user) throw new Error('Launch smoke user could not be created.');

const userId = user.id;
await db.from('invoice_line_items').delete().like('description', `${tag}%`);
await db.from('invoices').delete().eq('user_id', userId).like('invoice_number', 'SMOKE-%');
await db.from('quote_line_items').delete().like('description', `${tag}%`);
await db.from('quotes').delete().eq('user_id', userId).like('quote_number', 'SMOKE-%');
await db.from('customers').delete().eq('user_id', userId).like('name', `${tag}%`);

const customerInsert = await db.from('customers').insert({
  user_id: userId,
  name: `${tag} Preview Customer`,
  email: process.env.RESEND_TEST_RECIPIENT || email,
  phone: '0400 000 000',
  address_line1: '1 Smoke Street',
  city: 'Sydney',
  state: 'NSW',
  postcode: '2000',
}).select('id').single();
if (customerInsert.error) throw customerInsert.error;

const publicToken = crypto.randomUUID();
const quoteInsert = await db.from('quotes').insert({
  user_id: userId,
  customer_id: customerInsert.data.id,
  quote_number: `SMOKE-Q-${Date.now()}`,
  title: `${tag} Interior repaint`,
  status: 'sent',
  tier: 'standard',
  job_type: 'interior',
  valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  working_days: 2,
  subtotal_cents: 100000,
  gst_cents: 10000,
  total_cents: 110000,
  labour_margin_percent: 0,
  material_margin_percent: 0,
  public_share_token: publicToken,
  customer_email: process.env.RESEND_TEST_RECIPIENT || email,
  customer_address: '1 Smoke Street, Sydney NSW 2000',
}).select('id, public_share_token').single();
if (quoteInsert.error) throw quoteInsert.error;

const invoiceToken = crypto.randomUUID();
const invoiceInsert = await db.from('invoices').insert({
  user_id: userId,
  customer_id: customerInsert.data.id,
  quote_id: quoteInsert.data.id,
  invoice_number: `SMOKE-I-${Date.now()}`,
  status: 'draft',
  invoice_type: 'full',
  subtotal_cents: 100000,
  gst_cents: 10000,
  total_cents: 110000,
  amount_paid_cents: 0,
  public_share_token: invoiceToken,
}).select('id, public_share_token').single();
if (invoiceInsert.error) throw invoiceInsert.error;

console.log(JSON.stringify({
  ok: true,
  userId,
  email,
  customerId: customerInsert.data.id,
  quoteId: quoteInsert.data.id,
  quoteToken: quoteInsert.data.public_share_token,
  invoiceId: invoiceInsert.data.id,
  invoiceToken: invoiceInsert.data.public_share_token,
}, null, 2));
```

- [ ] **Step 2: Add package script**

```json
{
  "scripts": {
    "smoke:seed": "node scripts/launch-smoke/seed-fixture.mjs"
  }
}
```

- [ ] **Step 3: Verify**

Run:

```bash
ALLOW_LAUNCH_SMOKE_SEED=true npm run smoke:seed
```

Expected: JSON with `ok: true`, `quoteToken`, and `invoiceToken`.

## Task 3: Authenticated Preview Workflow Smoke

**Files:**
- Create: `scripts/launch-smoke/preview-workflow-smoke.mjs`
- Modify: `package.json`
- Modify UI files only if selectors are unstable.

- [ ] **Step 1: Add Playwright dependency if browser login is required**

Run:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create the smoke runner**

```js
#!/usr/bin/env node
import { chromium } from '@playwright/test';

const baseUrl = process.argv.find((arg) => arg.startsWith('--app-url='))?.slice('--app-url='.length);
const email = process.env.LAUNCH_SMOKE_EMAIL;
const password = process.env.LAUNCH_SMOKE_PASSWORD;
const quoteId = process.env.LAUNCH_SMOKE_QUOTE_ID;
const quoteToken = process.env.LAUNCH_SMOKE_QUOTE_TOKEN;
const invoiceId = process.env.LAUNCH_SMOKE_INVOICE_ID;
const invoiceToken = process.env.LAUNCH_SMOKE_INVOICE_TOKEN;

if (!baseUrl || !email || !password || !quoteId || !quoteToken || !invoiceId || !invoiceToken) {
  throw new Error('Missing app URL or launch smoke fixture env.');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await check('login', async () => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/dashboard|onboarding|quotes/, { timeout: 15000 });
});

await check('dashboard-authenticated', async () => {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/dashboard|quotes|revenue/i).first().waitFor({ timeout: 10000 });
});

await check('quote-detail', async () => {
  await page.goto(`${baseUrl}/quotes/${quoteId}`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/SMOKE|Interior repaint|Quote/i).first().waitFor({ timeout: 10000 });
});

await check('quote-pdf-auth', async () => {
  const response = await page.request.get(`${baseUrl}/api/pdf/quote?id=${quoteId}`);
  if (response.status() !== 200) throw new Error(`Expected 200, got ${response.status()}`);
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('application/pdf')) throw new Error(`Expected PDF, got ${contentType}`);
});

await check('public-quote-page', async () => {
  await page.goto(`${baseUrl}/q/${quoteToken}`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/approve|decline|quote/i).first().waitFor({ timeout: 10000 });
});

await check('invoice-detail', async () => {
  await page.goto(`${baseUrl}/invoices/${invoiceId}`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/invoice|SMOKE/i).first().waitFor({ timeout: 10000 });
});

await check('invoice-pdf-public-token', async () => {
  const response = await page.request.get(`${baseUrl}/api/pdf/invoice?token=${invoiceToken}`);
  if (response.status() !== 200) throw new Error(`Expected 200, got ${response.status()}`);
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('application/pdf')) throw new Error(`Expected PDF, got ${contentType}`);
});

await check('schedule-authenticated', async () => {
  await page.goto(`${baseUrl}/schedule`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/schedule|job/i).first().waitFor({ timeout: 10000 });
});

await browser.close();

const ok = results.every((result) => result.ok);
console.log(JSON.stringify({ ok, results }, null, 2));
process.exit(ok ? 0 : 1);
```

- [ ] **Step 3: Add package script**

```json
{
  "scripts": {
    "smoke:preview": "node scripts/launch-smoke/preview-workflow-smoke.mjs"
  }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run smoke:preview -- --app-url=https://coatly-2ir6cs2rb-kjm12081-3858s-projects.vercel.app
```

Expected: JSON with `ok: true`.

## Task 4: Quote/Invoice Email Smoke

**Files:**
- Modify: `scripts/launch-smoke/preview-workflow-smoke.mjs`
- Modify UI files only if stable selectors are needed.

- [ ] **Step 1: Add a safe email-send smoke**

Use the existing fixture customer email. In preview, Resend sandbox must route the email to `RESEND_TEST_RECIPIENT`. The smoke runner should trigger quote send or invoice send only on `[LAUNCH_SMOKE]` fixture records.

```js
await check('invoice-email-send', async () => {
  await page.goto(`${baseUrl}/invoices/${invoiceId}`, { waitUntil: 'domcontentloaded' });
  const sendButton = page.getByRole('button', { name: /send invoice|email invoice/i }).first();
  await sendButton.click();
  await page.getByText(/emailed|sent|error/i).first().waitFor({ timeout: 20000 });
});
```

- [ ] **Step 2: Guard production**

If `--production` is passed and `RESEND_FROM_ADDRESS` ends with `@resend.dev`, fail before sending.

```js
if (process.argv.includes('--production') && (process.env.RESEND_FROM_ADDRESS ?? '').includes('@resend.dev')) {
  throw new Error('Refusing production email smoke with Resend sandbox sender.');
}
```

- [ ] **Step 3: Verify**

Expected:

- Preview email smoke sends only to `RESEND_TEST_RECIPIENT`.
- Production email smoke is run only after the sender domain is verified and the recipient is controlled.

## Task 5: Production Email/Cron Gate

**Files:**
- Create: `docs/launch/SMOKE-CHECKLIST.md`
- Modify: `scripts/launch-smoke/env-check.mjs`

- [ ] **Step 1: Document required production env state**

```md
# Launch Smoke Checklist

## Production Env Gate

- [ ] `RESEND_API_KEY` is a production-safe key.
- [ ] `RESEND_FROM_ADDRESS` uses a verified customer-safe domain, not `@resend.dev`.
- [ ] `RESEND_TEST_RECIPIENT` is present only for controlled smoke or preview routing.
- [ ] `CRON_SECRET` is present and different from preview/local examples.
- [ ] `/api/cron/invoice-reminders` returns 401 without `Authorization`.
- [ ] `/api/cron/invoice-reminders` returns `{ "ok": true }` with `Authorization: Bearer <CRON_SECRET>`.
- [ ] One controlled quote email was delivered.
- [ ] One controlled invoice email or reminder path was delivered.
```

- [ ] **Step 2: Add authorized cron check to env script**

```js
if (process.argv.includes('--check-cron-authorized')) {
  const authorized = await fetch(`${appUrl.replace(/\/$/, '')}/api/cron/invoice-reminders`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  if (authorized.status !== 200) {
    throw new Error(`Authorized cron expected 200, got ${authorized.status}`);
  }
}
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run smoke:env -- --production --app-url=https://coatly.vercel.app --check-cron-authorized
```

Expected:

```json
{
  "ok": true,
  "mode": "production",
  "resendMode": "customer-safe-sender"
}
```

## Task 6: A Workflow Fixture

**Files:**
- Create: `docs/launch/A-WORKFLOW-FIXTURE.md`
- Modify: `docs/LAUNCH-READINESS.md` only after real evidence exists.

- [ ] **Step 1: Create fixture worksheet**

```md
# A Workflow Fixture

## Source Inputs

- Price sheet received date:
- Recent quote/email received date:
- Customer details anonymized:
- Quote type:
- Existing Excel total ex GST:
- Existing Excel GST:
- Existing Excel total inc GST:

## Coatly Setup

| Existing item | Coatly item | Unit | Price | Category | Notes |
| --- | --- | --- | ---: | --- | --- |

## Quote Recreation

| Check | Expected | Actual | Pass |
| --- | --- | --- | --- |
| Subtotal | | | |
| GST | | | |
| Total | | | |
| Optional items | | | |
| PDF customer-ready | yes | | |
| Email delivered | yes | | |
| Public approval works | yes | | |
| Invoice created | yes | | |
| Job scheduled | yes | | |

## Gaps

| Gap | Severity | Fix owner | Decision |
| --- | --- | --- | --- |
```

- [ ] **Step 2: Run A quote through Coatly**

Use app UI, not direct DB writes, for the actual A workflow. Direct DB seeding is acceptable only for smoke fixtures, not for proving v1 workflow usability.

- [ ] **Step 3: Record gaps**

Only mark v1 gate passed when the worksheet has actual totals and pass/fail evidence.

## Task 7: Update Launch Readiness

**Files:**
- Modify: `docs/LAUNCH-READINESS.md`
- Modify: `docs/SECURITY.md`
- Modify: `docs/PLANS.md`

- [ ] **Step 1: Update status after smoke passes**

Change P0 blockers to done only if:

```text
npm run lint
npm run test:run
npm run build
npm run smoke:env -- --app-url=<preview-url>
npm run smoke:seed
npm run smoke:preview -- --app-url=<preview-url>
```

all pass.

- [ ] **Step 2: Keep production blocked until production smoke passes**

Do not mark external launch ready until:

```text
npm run smoke:env -- --production --app-url=https://coatly.vercel.app --check-cron-authorized
```

passes and controlled production email delivery is confirmed.

- [ ] **Step 3: Commit**

```bash
git add scripts/launch-smoke package.json package-lock.json docs/launch docs/LAUNCH-READINESS.md docs/SECURITY.md docs/PLANS.md
git commit -m "chore: add launch smoke gates"
```

## Acceptance Criteria

- Preview smoke is repeatable and can be rerun without polluting live data.
- Preview smoke covers authenticated login, quote detail/edit/PDF, public quote, invoice detail/PDF/email, and schedule/job visibility.
- Production env gate refuses sandbox email sender.
- Cron endpoint is verified as 401 without secret and 200 with secret.
- A workflow fixture has real totals and actual pass/fail evidence.
- Launch readiness docs are updated only after evidence exists.

## Open Decisions Needed Before Execution

- Provide or approve a launch smoke test account email/password.
- Confirm whether creating tagged `[LAUNCH_SMOKE]` records in the live Supabase project is acceptable.
- Provide customer-safe production Resend sender/API details before production email smoke.
- Provide A's actual price sheet and one recent sent quote/email for the v1 fixture.
