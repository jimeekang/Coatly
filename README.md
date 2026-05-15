# Coatly

호주 1–3인 painter를 위한 모바일 우선 SaaS. v1 wedge = **AI Quote Writer** (notes + rough measurements + 보조 사진 + price_rates → polished quote artifact). 견적·청구·고객·구독·일정을 한 앱에서 처리.

> 📘 Navigation: [`ARCHITECTURE.md`](ARCHITECTURE.md) (스택·DB·flow) · [`CLAUDE.md`](CLAUDE.md) (planning context) · [`AGENTS.md`](AGENTS.md) (agent routing) · [`docs/PLANS.md`](docs/PLANS.md) (roadmap) · [`docs/features/ai/V1-PLAN.md`](docs/features/ai/V1-PLAN.md) (v1 wedge) · [`TODOS.md`](TODOS.md) (deferred)

## Tech Stack

기술 스택 전체는 [`ARCHITECTURE.md`](ARCHITECTURE.md#stack) 참조. 핵심: Next.js 16 App Router + React 19 + Supabase(Postgres/Auth/RLS/Storage) + Stripe + React-PDF + Resend + Gemini Flash via Genkit + Vercel.

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- 원격 Supabase 프로젝트(로컬 Docker 불필요)

### 1. Clone and install

```bash
git clone <repo-url>
cd coatly
npm install
```

### 2. Environment variables

`.env.local` 생성:

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

# AI (v1 wedge core)
GEMINI_API_KEY=<gemini-api-key>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Supabase keys: Dashboard → Project Settings → API
> ABR GUID: register at [abr.business.gov.au](https://abr.business.gov.au/Tools/WebServices)
> Gemini API key: [aistudio.google.com](https://aistudio.google.com/)

### 3. Start dev server

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 열기. DB는 원격 Supabase가 자동 연결됨. migration은 MCP 도구로만 적용 ([`.codex/skills/db-schema.md`](.codex/skills/db-schema.md)).

### 4. (Optional) Seed demo data

```bash
ALLOW_DEMO_SEED=true npm run seed:demo -- --email=<your-email>
```

Creates 5 customers, 3 quotes, 2 invoices. 재실행 시 wipe + 재생성 (idempotent).

### 5. Local Stripe webhook

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run db:types` | Regenerate `types/database.ts` |
| `npm run seed:demo` | Seed demo data |

## Subscription Plans

| Plan | Price | Limits |
|------|-------|--------|
| Starter | A$39/mo (A$450/yr) | 월 10 active quotes, AI 없음 |
| Pro | A$59/mo (A$680/yr) | 무제한 quotes + AI Quote Writer + 브랜딩 |

## Deployment

`main` push → Vercel 자동 배포. 환경 변수는 Vercel Dashboard → Project → Settings.

> ⚠️ Never set `ALLOW_DEMO_SEED` in production.

## Out of Scope

GPS · Team scheduling · Supplier integrations · Native app · Multi-language. 자세한 건 [`CLAUDE.md`](CLAUDE.md).

## Tool Routing

| 영역 | 담당 |
|------|------|
| 플랜 / 디자인 / progress / QA | Claude Code (`.claude/commands/`, `.claude/skills/`) |
| 구현 / 버그 / DB / 배포 / git | Codex (`.codex/skills/`, [`docs/ENGINEERING.md`](docs/ENGINEERING.md)) |

자세한 라우팅 표는 [`AGENTS.md`](AGENTS.md).
