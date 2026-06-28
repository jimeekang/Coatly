# Coatly Launch Smoke Checklist

> 기준일: 2026-06-28. 이 문서는 배포 전 반복 확인용입니다. 비밀값은 기록하지 않습니다.

## Preview Gate

- [ ] Preview deployment is `Ready`.
- [ ] Preview uses test-safe Supabase/Stripe/Resend configuration.
- [ ] If `RESEND_FROM_ADDRESS` uses `@resend.dev`, `RESEND_TEST_RECIPIENT` is set.
- [ ] Cron endpoint returns 401 without `Authorization`.

Run:

```bash
npm run smoke:env -- --app-url=<preview-url>
```

## Preview Fixture

Fixture seeding writes tagged records for a controlled smoke account only.

Required env:

- `ALLOW_LAUNCH_SMOKE_SEED=true`
- `ALLOW_LIVE_SUPABASE_SMOKE_SEED=true` if the target is the known live Supabase project
- `LAUNCH_SMOKE_EMAIL`
- `LAUNCH_SMOKE_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_TEST_RECIPIENT` when using Resend sandbox routing

Run:

```bash
ALLOW_LAUNCH_SMOKE_SEED=true npm run smoke:seed
```

After the command returns JSON, export the returned ids/tokens for the browser smoke:

- `LAUNCH_SMOKE_QUOTE_ID`
- `LAUNCH_SMOKE_QUOTE_TOKEN`
- `LAUNCH_SMOKE_INVOICE_ID`
- `LAUNCH_SMOKE_INVOICE_TOKEN`
- `LAUNCH_SMOKE_JOB_ID`

## Authenticated Preview Workflow

Install the Playwright browser once on any new machine:

```bash
npm run smoke:install-browser
```

Run read-only smoke first:

```bash
npm run smoke:preview -- --app-url=<preview-url>
```

Expected coverage:

- [ ] Login succeeds.
- [ ] `/dashboard` stays authenticated and does not redirect to onboarding/subscribe.
- [ ] Quote detail loads.
- [ ] Authenticated quote PDF returns `application/pdf`.
- [ ] Public quote page loads from token.
- [ ] Invoice detail loads.
- [ ] Public invoice PDF returns `application/pdf`.
- [ ] Schedule page loads.
- [ ] Job detail loads.

Optional controlled email smoke:

```bash
npm run smoke:preview -- --app-url=<preview-url> --send-email
```

Rules:

- [ ] Use only `[LAUNCH_SMOKE]` fixture records.
- [ ] In preview, Resend sandbox must route to `RESEND_TEST_RECIPIENT`.
- [ ] Do not use real customer recipients.

## Production Gate

Production smoke starts with non-destructive checks only.

- [ ] `RESEND_FROM_ADDRESS` uses a verified customer-safe sender domain, not `@resend.dev`.
- [ ] `RESEND_FORCE_TEST_RECIPIENT` is not enabled for customer launch mode.
- [ ] `CRON_SECRET` is present and not an example value.
- [ ] `NEXT_PUBLIC_APP_URL` or equivalent production app URL is explicit.
- [ ] `/api/cron/invoice-reminders` returns 401 without `Authorization`.

Run:

```bash
npm run smoke:env -- --production --app-url=https://coatly.vercel.app
```

## Production Live Checks

Do not run live production actions automatically.

- [ ] Controlled quote email delivered to a known internal/test recipient.
- [ ] Controlled invoice email delivered to a known internal/test recipient.
- [ ] Authorized cron check is run only when the fixture and eligible invoice state are controlled.

Authorized cron can send real invoice reminders. Only run this manually when the controlled smoke state is prepared:

```bash
npm run smoke:env -- --production --app-url=https://coatly.vercel.app --check-cron-authorized --allow-live-cron
```

## Final Release Gate

- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] Preview smoke passed.
- [ ] Production non-destructive env smoke passed.
- [ ] Controlled production email smoke passed.
- [ ] A workflow fixture passed or remaining product gaps are explicitly accepted.
