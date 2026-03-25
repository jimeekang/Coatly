# Coatly

A quote and invoice management SaaS for small Australian painting businesses.
Manage customers, build room-by-room quotes, generate PDFs, issue invoices, and handle Stripe subscriptions — all in one app.

---

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js 15 (App Router) |
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

## Local Development Guide

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

### 2. Set up environment variables

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

**Using a remote Supabase project** (recommended — no extra tooling):
```bash
# Just set the remote URL/keys in .env.local and run the dev server
npm run dev
```

**Using a local Supabase instance** (requires Docker):
```bash
supabase start        # start local instance
supabase db push      # apply all 13 migrations
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. (Optional) Seed demo data

After signing up, quickly populate test data:

```bash
# Add ALLOW_DEMO_SEED=true to .env.local, then:
npm run seed:demo -- --email=<your-email>

# Or specify user-id directly:
ALLOW_DEMO_SEED=true npm run seed:demo -- --user-id=<uuid>
```

Creates 5 customers, 3 quotes, and 2 invoices. Re-running wipes and re-creates the demo data (idempotent).

### 6. Local Stripe webhook testing

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

Pushing to `main` automatically triggers a Vercel production deployment.

Set environment variables at: Vercel Dashboard → Project → Settings → Environment Variables

> **Warning:** Never set `ALLOW_DEMO_SEED` in production.

---

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

---

# Coatly

호주 소규모 페인팅 업체를 위한 견적·청구서 관리 SaaS.
고객 관리, 견적서 작성(방/면적 기반), PDF 생성, 청구서 발행, Stripe 구독까지 하나의 앱에서 처리합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript 5 (strict) |
| 스타일 | Tailwind CSS 4 |
| UI 컴포넌트 | shadcn/ui |
| 데이터베이스 | Supabase (PostgreSQL 15) |
| 인증 | Supabase Auth (이메일/비밀번호) |
| 스토리지 | Supabase Storage |
| 결제 | Stripe (구독) |
| PDF | @react-pdf/renderer |
| AI | Google Gemini via Genkit |
| ABN 조회 | Australian Business Register (ABR) Web Services |
| 폼 검증 | Zod + React Hook Form |
| 상태 관리 | Zustand |
| 배포 | Vercel (Serverless) |
| 테스트 | Vitest + Testing Library |

---

## 로컬 개발 가이드

### 요구 사항

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) — 로컬 DB 사용 시

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repo-url>
cd coatly
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성합니다:

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

# ABN Lookup (호주 사업자 번호 자동완성)
ABR_GUID=<abr-web-services-guid>

# AI (선택 — AI 기능 사용 시)
GEMINI_API_KEY=<gemini-api-key>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Supabase 키: 대시보드 → Project Settings → API
> ABR GUID: [abr.business.gov.au](https://abr.business.gov.au/Tools/WebServices) 에서 등록

### 3. DB 마이그레이션 적용

**원격 Supabase 사용 시** (권장 — 별도 설치 불필요):
```bash
# .env.local에 원격 URL/키 설정 후 바로 개발 서버 실행
npm run dev
```

**로컬 Supabase 사용 시** (Docker 필요):
```bash
supabase start          # 로컬 인스턴스 시작
supabase db push        # 마이그레이션 13개 적용
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

### 5. (선택) 데모 데이터 시드

가입 후 테스트 데이터를 빠르게 생성합니다:

```bash
# .env.local에 ALLOW_DEMO_SEED=true 추가 후
npm run seed:demo -- --email=<가입한 이메일>

# 또는 user-id 직접 지정
ALLOW_DEMO_SEED=true npm run seed:demo -- --user-id=<uuid>
```

고객 5명, 견적 3건, 인보이스 2건이 생성됩니다.
재실행 시 이전 데모 데이터를 지우고 새로 생성합니다 (idempotent).

### 6. Stripe 웹훅 로컬 테스트

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Vitest watch 모드 |
| `npm run test:run` | Vitest 단일 실행 |
| `npm run seed:demo` | 데모 데이터 시드 |

---

## 구독 플랜

| 플랜 | 가격 | 제한 |
|------|------|------|
| Starter | A$39/월 (A$450/년) | 월 활성 견적 10건 |
| Pro | A$59/월 (A$680/년) | 무제한 + AI + 브랜딩 |

---

## 배포

`main` 브랜치 푸시 시 Vercel 프로덕션 배포가 자동으로 트리거됩니다.

환경 변수: Vercel 대시보드 → Project → Settings → Environment Variables

> **주의:** 프로덕션에는 `ALLOW_DEMO_SEED` 환경 변수를 절대 설정하지 마세요.

---

더 자세한 아키텍처 정보는 [ARCHITECTURE.md](ARCHITECTURE.md)를 참고하세요.
