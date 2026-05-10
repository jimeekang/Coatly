# Coatly

A quote and invoice management SaaS for small Australian painting businesses.
Manage customers, build room-by-room quotes, generate PDFs, issue invoices, and handle Stripe subscriptions — all in one app.

> 📘 More: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`CLAUDE.md`](CLAUDE.md) (project context) · [`AGENTS.md`](AGENTS.md) (agent routing) · [`docs/`](docs/)

---

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage |
| Payments | Stripe (subscriptions) |
| PDF | @react-pdf/renderer |
| AI | Google Gemini via Genkit |
| ABN Lookup | Australian Business Register (ABR) Web Services |
| Form Validation | Zod + React Hook Form |
| State Management | Zustand |
| Deployment | Vercel (Serverless) |
| Testing | Vitest + Testing Library |

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) — only needed for local DB

### 1. Clone and install

```bash
git clone <repo-url>
cd coatly
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...

# ABN Lookup
ABR_GUID=<abr-web-services-guid>

# AI (optional)
GEMINI_API_KEY=<gemini-api-key>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Supabase keys: Dashboard → Project Settings → API
> ABR GUID: register at [abr.business.gov.au](https://abr.business.gov.au/Tools/WebServices)

### 3. Apply DB migrations

**Remote Supabase** (recommended — no extra tooling):
```bash
# Set remote URL/keys in .env.local, then:
npm run dev
```

**Local Supabase** (requires Docker):
```bash
supabase start
supabase db push
```

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Seed demo data

```bash
# Add ALLOW_DEMO_SEED=true to .env.local, then:
npm run seed:demo -- --email=<your-email>

# Or:
ALLOW_DEMO_SEED=true npm run seed:demo -- --user-id=<uuid>
```

Creates 5 customers, 3 quotes, 2 invoices. Re-running wipes and re-creates (idempotent).

### 6. Local Stripe webhook

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run seed:demo` | Seed demo data |

---

## Subscription Plans

| Plan | Price | Limits |
|------|-------|--------|
| Starter | A$39/mo (A$450/yr) | 10 active quotes/month |
| Pro | A$59/mo (A$680/yr) | Unlimited + AI + branding |

---

## Deployment

Pushing to `main` triggers a Vercel production deployment.

Set environment variables at: Vercel Dashboard → Project → Settings → Environment Variables.

> ⚠️ Never set `ALLOW_DEMO_SEED` in production.

---

## 한글 요약

호주 소규모 페인터(1–3인)를 위한 모바일 우선 PWA. 견적·청구·고객·구독을 한 앱에서 처리.

- 개발 시작: `.env.local` 채운 뒤 `npm install && npm run dev`
- DB는 원격 Supabase 권장 (로컬 Docker 불필요)
- 데모 데이터: `ALLOW_DEMO_SEED=true npm run seed:demo -- --email=<이메일>`
- 배포: `main` push → Vercel 자동
- 가격: Starter A$39/월(견적 10건), Pro A$59/월(무제한 + AI)
- 자세한 아키텍처: [`ARCHITECTURE.md`](ARCHITECTURE.md), 작업 라우팅: [`AGENTS.md`](AGENTS.md)
