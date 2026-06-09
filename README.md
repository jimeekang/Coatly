# Coatly

호주 1–3인 painter/tradie를 위한 모바일 우선 SaaS. v1 wedge = **Excel 기반 quote workflow replacement**: 기존 가격표를 참고해 Coatly 앱 안에서 단순 price book을 세팅하고, 견적 작성 → PDF → 이메일 발송 → follow-up → invoice/schedule 전환까지 한 흐름으로 처리한다.

AI, 사진 분석, 자동 damage 판단은 v1 구매 이유가 아니다. core workflow가 실제 painter의 Excel/PDF/email 업무를 완전히 대체하고 릴리즈된 뒤, AI는 quote 설명과 follow-up 문구를 줄여주는 보조 레이어로만 추가한다.

> 📘 Navigation: [`ARCHITECTURE.md`](ARCHITECTURE.md) (스택·DB·flow) · [`CLAUDE.md`](CLAUDE.md) (planning context) · [`AGENTS.md`](AGENTS.md) (agent routing) · [`docs/PLANS.md`](docs/PLANS.md) (roadmap) · [`docs/features/ai/V1-PLAN.md`](docs/features/ai/V1-PLAN.md) (v1 workflow + deferred AI) · [`docs/features/quote/PRICE-BOOK-TEMPLATE.md`](docs/features/quote/PRICE-BOOK-TEMPLATE.md) (simple price book setup) · [`TODOS.md`](TODOS.md) (deferred)

## Tech Stack

기술 스택 전체는 [`ARCHITECTURE.md`](ARCHITECTURE.md#stack) 참조. 핵심: Next.js 16 App Router + React 19 + Supabase(Postgres/Auth/RLS/Storage) + Stripe + React-PDF + Resend + Vercel. AI provider는 post-core workflow 단계에서만 사용한다.

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

# AI (post-core workflow only)
# Enable only after quote workflow replacement is released and verified.
QWEN_API_KEY=<qwen-api-key>
QWEN_MODEL=qwen3-vl-flash

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Supabase keys: Dashboard → Project Settings → API
> ABR GUID: register at [abr.business.gov.au](https://abr.business.gov.au/Tools/WebServices)
> Qwen API key: Alibaba Cloud Model Studio / Qwen Cloud. 현재 v1 core workflow 검증에는 필요하지 않음.

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
| Starter | A$39/mo (A$450/yr) | 월 10 active quotes, quote/PDF/email/follow-up 기본 workflow |
| Pro | A$59/mo (A$680/yr) | 무제한 quotes + templates + workflow automation + 브랜딩 |

## Deployment

`main` push → Vercel 자동 배포. 환경 변수는 Vercel Dashboard → Project → Settings.

> ⚠️ Never set `ALLOW_DEMO_SEED` in production.

## Out of Scope

v1 core workflow 전에는 arbitrary Excel 자동 import, 복잡한 Excel 템플릿 필수 onboarding, AI 견적 자동화, 사진 분석, damage 판별, AI 가격 산출, GPS, team scheduling, supplier integrations, native app, multi-language를 제안하지 않는다. 가격표 세팅은 앱 내 직접 추가를 기본으로 하고, Excel/CSV 템플릿은 선택적 대량 입력 도구로만 다룬다. 자세한 건 [`CLAUDE.md`](CLAUDE.md).

## Tool Routing

| 영역 | 담당 |
|------|------|
| 플랜 / 디자인 / progress / QA | Claude Code (`.claude/commands/`, `.claude/skills/`) |
| 구현 / 버그 / DB / 배포 / git | Codex (`.codex/skills/`, [`docs/ENGINEERING.md`](docs/ENGINEERING.md)) |

자세한 라우팅 표는 [`AGENTS.md`](AGENTS.md).
