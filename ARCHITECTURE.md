# Coatly — Architecture

## Table of Contents

1. [Folder Structure](#folder-structure)
2. [DB Schema](#db-schema)
3. [RLS Policy Summary](#rls-policy-summary)
4. [API Routes](#api-routes)
5. [Auth Flow](#auth-flow)
6. [Core Design Principles](#core-design-principles)

---

## Folder Structure

```
coatly/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no middleware protection)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/              # Protected route group (login required)
│   │   ├── dashboard/            # Home dashboard
│   │   ├── quotes/               # Quote list + [id] detail + new
│   │   ├── invoices/             # Invoice list + [id] detail/edit + new
│   │   ├── customers/            # Customer list + [id] detail + new
│   │   ├── jobs/                 # Job status
│   │   ├── schedule/             # Schedule
│   │   ├── materials-service/    # Materials & services
│   │   └── settings/             # Settings + billing/
│   └── api/                      # API routes (server-only)
│       ├── abn-lookup/           # GET  — Look up business info by ABN
│       ├── business-logo/        # POST — Upload business logo
│       ├── pdf/
│       │   ├── quote/            # GET  — Generate quote PDF
│       │   └── invoice/          # GET  — Generate invoice PDF
│       ├── stripe/
│       │   ├── checkout/         # POST — Create Stripe Checkout session
│       │   ├── portal/           # POST — Create Stripe customer portal URL
│       │   └── renew/            # POST — Renew (un-cancel) subscription
│       └── webhooks/
│           └── stripe/           # POST — Receive Stripe events, sync to DB
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (do not modify)
│   ├── quotes/                   # Quote-specific components (incl. InteriorEstimateBuilder, QuickQuoteBuilder)
│   ├── invoices/                 # Invoice-specific components
│   ├── rates/                    # Price rate form components
│   └── pdf/                      # PDF rendering components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client (cookie-based)
│   │   ├── admin.ts              # Service Role client (bypasses RLS, server-only)
│   │   ├── middleware.ts         # Auth middleware routing logic
│   │   ├── storage.ts            # Storage URL parsing / signed URL generation
│   │   ├── validators.ts         # Zod schemas for quote, invoice, customer input
│   │   └── request-context.ts   # Fetch current user / subscription / quote usage
│   ├── stripe/
│   │   ├── client.ts             # Stripe client singleton
│   │   ├── plans.ts              # Plan → Stripe Price ID mapping
│   │   ├── portal.ts             # Customer portal URL generation
│   │   ├── subscription-sync.ts  # Stripe → Supabase subscription sync
│   │   └── webhook-handler.ts    # Stripe webhook event handling
│   ├── subscription/
│   │   ├── access.ts             # Subscription feature access checks
│   │   └── server.ts             # Server-side subscription state query
│   ├── profile/
│   │   └── onboarding.ts         # Onboarding completion logic
│   ├── ai/
│   │   ├── draft-types.ts        # AI draft types
│   │   └── drafts.ts             # Gemini-based quote draft generation
│   ├── pdf/                      # React-PDF templates
│   ├── quotes.ts                 # Quote business logic (calculations, mapping)
│   ├── invoices.ts               # Invoice business logic
│   ├── businesses.ts             # Business profile query (incl. PDF branding)
│   ├── interior-estimates.ts     # Interior estimate calculation logic
│   ├── rate-settings.ts          # User rate settings (price-rates page)
│   ├── quick-quote-mapper.ts     # QuickQuote → full Quote mapping
│   └── abn-lookup.ts             # ABR web service integration
│
├── config/
│   ├── plans.ts                  # Starter / Pro plan definitions and feature lists
│   ├── paint-rates.ts            # Default paint rate table (surface × coating type)
│   ├── interior-estimate-anchors.ts  # Anchor rates for interior estimate builder
│   └── constants.ts              # App constants: GST_RATE, QUOTE_VALID_DAYS, etc.
│
├── types/
│   ├── database.ts               # Auto-generated DB types (remote Supabase schema)
│   ├── app-database.ts           # Extended Database type (subscription cancel fields)
│   ├── quote.ts                  # Quote / QuoteRoom / QuoteSurface domain types
│   ├── invoice.ts                # Invoice / InvoiceLineItem domain types
│   └── customer.ts               # Customer domain type
│
├── hooks/                        # React custom hooks
├── utils/                        # General utilities
├── scripts/
│   └── seed-demo-data.ts         # Demo data seed script (dev/demo only)
└── supabase/
    └── migrations/               # SQL migration files (001 – 015)
```

---

## DB Schema

All monetary values are stored as **integers in cents**. Divide by 100 for display.
Every table has `created_at` and `updated_at` columns, auto-updated by the `update_updated_at_column()` trigger.

### Entity Relationship

```
auth.users (managed by Supabase)
    │
    ├─── profiles          (1:1)  Business profile
    ├─── businesses        (1:1)  Business details (address, logo, default rates)
    ├─── subscriptions     (1:1)  Stripe subscription state
    ├─── customers         (1:N)  Customer list
    │        │
    │        ├─── quotes   (1:N)  Quotes
    │        │       │
    │        │       ├─── quote_rooms         (1:N)  Rooms / areas
    │        │       │         │
    │        │       │         └─── quote_room_surfaces  (1:N)  Paint surfaces
    │        │       │
    │        │       └─── invoices  (N:1, nullable)  Can be created without a quote
    │        │
    │        └─── invoices  (1:N)
    │                 │
    │                 └─── invoice_line_items  (1:N)  Line items
    │
    └─── (Storage) logos/   Business logos
                   photos/  Job site photos
```

### profiles

Business profile. 1:1 with `auth.users`. `user_id` is the PK.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid PK | References `auth.users.id` |
| business_name | text NOT NULL | Trading name |
| abn | text | Australian Business Number (11 digits) |
| email / phone | text | Contact details |
| address_line1/2, city, state, postcode | text | Business address |
| bank_bsb / bank_account_number / bank_account_name | text | Bank details shown on invoices |
| default_payment_terms | integer | Default payment terms in days (default 14) |
| logo_url | text | Supabase Storage URL |
| onboarding_completed | boolean | Whether onboarding is complete |

### customers

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK | Owner |
| name | text NOT NULL | Customer name |
| email / phone | text | |
| company_name | text | Company name (optional) |
| address_line1/2, city, state, postcode | text | |
| notes | text | Internal notes (hidden from customer) |
| is_archived | boolean | Soft-delete via archiving |

### quotes

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK | |
| customer_id | uuid FK | |
| quote_number | text | `QUO-0001` format, UNIQUE per (user_id, quote_number) |
| title | text | Job title |
| status | text | `draft` \| `sent` \| `accepted` \| `declined` \| `expired` |
| tier | text | `good` \| `better` \| `best` — currently selected pricing tier |
| labour_margin_percent | integer | Labour margin (%) |
| material_margin_percent | integer | Material margin (%) |
| subtotal_cents | integer | Subtotal (excl. GST) |
| gst_cents | integer | GST = subtotal × 10% |
| total_cents | integer | subtotal + gst |
| valid_until | date | Quote expiry date |
| notes | text | Customer-visible notes |
| internal_notes | text | Internal notes (excluded from PDF) |

### quote_rooms

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| quote_id | uuid FK → quotes | Cascade delete |
| name | text | Room name (e.g. `Living Room`, `Front Exterior`) |
| room_type | text | `interior` \| `exterior` |
| length_m / width_m / height_m | numeric(6,2) | Dimensions in metres, height defaults to 2.7 |
| sort_order | integer | Display order (drag-to-sort) |

### quote_room_surfaces

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| room_id | uuid FK → quote_rooms | Cascade delete |
| surface_type | text | `walls` \| `ceiling` \| `trim` \| `doors` \| `windows` \| `exterior_walls` \| `exterior_trim` \| `fascia` \| `gutters` |
| area_m2 | numeric(8,2) | Surface area |
| coating_type | text | `touch_up_1coat` \| `repaint_2coat` \| `new_plaster_3coat` \| `stain` \| `specialty` |
| rate_per_m2_cents | integer | Rate per m² |
| material_cost_cents | integer | Material cost |
| labour_cost_cents | integer | Labour cost |
| paint_litres_needed | numeric(6,2) | Paint volume (auto-calculated) |
| tier | text | `good` \| `better` \| `best` |
| notes | text | Surface-specific notes |

### invoices

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK | |
| customer_id | uuid FK | |
| quote_id | uuid FK (nullable) | Can invoice without a quote |
| invoice_number | text | `INV-0001` format, UNIQUE per (user_id, invoice_number) |
| status | text | `draft` \| `sent` \| `paid` \| `overdue` \| `cancelled` |
| invoice_type | text | `full` \| `deposit` \| `progress` \| `final` |
| subtotal_cents | integer | |
| gst_cents | integer | |
| total_cents | integer | |
| amount_paid_cents | integer | Tracks partial payments |
| due_date | date | Payment due date |
| paid_at | timestamptz | Actual payment timestamp |
| notes | text | Customer-visible notes |

### invoice_line_items

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| invoice_id | uuid FK → invoices | Cascade delete |
| description | text | Line item description |
| quantity | numeric(8,2) | Quantity (default 1) |
| unit_price_cents | integer | Unit price |
| gst_cents | integer | GST for this line |
| total_cents | integer | quantity × unit_price_cents |
| sort_order | integer | Display order |

### subscriptions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid UNIQUE FK | |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan | text | `starter` \| `pro` |
| status | text | `active` \| `cancelled` \| `past_due` \| `trialing` |
| current_period_start / end | timestamptz | Current billing period |
| cancel_at | timestamptz | Scheduled cancellation time |
| cancel_at_period_end | boolean | Whether cancellation is at period end |

---

## RLS Policy Summary

Row Level Security is enabled on all tables.
Clients can only access rows where `user_id = auth.uid()`.

| Table | Policy method | Notes |
|-------|--------------|-------|
| profiles | Direct `user_id = auth.uid()` | INSERT allowed via trigger + direct |
| customers | Direct `user_id = auth.uid()` | |
| quotes | Direct `user_id = auth.uid()` | |
| quote_rooms | EXISTS subquery on parent quotes | No user_id column |
| quote_room_surfaces | EXISTS chain: quote_rooms → quotes | |
| invoices | Direct `user_id = auth.uid()` | |
| invoice_line_items | EXISTS subquery on parent invoices | |
| subscriptions | SELECT only | INSERT/UPDATE/DELETE via Stripe webhook (service_role) only |

> The **admin client** (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS.
> It is server-only (`lib/supabase/admin.ts` uses a `server-only` import guard)
> and is used exclusively for Stripe webhook handling and number generation functions.

---

## API Routes

All API routes live under `app/api/`. Authenticated endpoints verify the current user via `createServerClient()`.

### ABN Lookup

```
GET /api/abn-lookup?abn=<11-digit-abn>
```

Proxies a request to the Australian Business Register (ABR) web service and returns business info.
Requires `ABR_GUID` env var. Auth required.

**Response example:**
```json
{ "data": { "abn": "12345678901", "name": "Smith Painting Pty Ltd", "state": "NSW" } }
```

---

### Business Logo

```
POST /api/business-logo
Content-Type: multipart/form-data
```

Uploads a logo to the Supabase Storage `logos/` bucket and returns the storage URL. Auth required.

---

### PDF Generation

```
GET /api/pdf/quote?id=<quote-uuid>
GET /api/pdf/invoice?id=<invoice-uuid>
```

Renders a PDF server-side using React-PDF and returns it as `application/pdf`.
- Automatically includes business branding (logo, ABN, contact details)
- Auth required; ownership verified
- Works without Puppeteer — fully Vercel-compatible

**Response:** `Content-Type: application/pdf` binary stream

---

### Stripe — Checkout

```
POST /api/stripe/checkout
Body: { planId: "starter" | "pro", interval: "monthly" | "annual", returnPath?: string }
```

Creates a Stripe Checkout session and returns the payment URL.
Reuses an existing Stripe Customer ID if one already exists. Auth required.

**Response:** `{ url: "https://checkout.stripe.com/..." }`

---

### Stripe — Portal

```
POST /api/stripe/portal
Body: { returnPath?: string }
```

Generates a Stripe customer portal URL (manage subscription, update payment method, cancel, etc.). Auth required.

**Response:** `{ url: "https://billing.stripe.com/..." }`

---

### Stripe — Renew

```
POST /api/stripe/renew
```

Resumes a subscription that has been scheduled for cancellation. Auth required.

---

### Stripe — Webhook

```
POST /api/webhooks/stripe
POST /api/stripe/webhook
```

Receives Stripe events and syncs the `subscriptions` table.
Signature verified with `STRIPE_WEBHOOK_SECRET`. No auth required (Stripe → server direct call).

**Handled events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Auth Flow

```
Middleware (middleware.ts)
    │
    ├─ /login, /signup, /forgot-password, /reset-password
    │      → redirect to /dashboard if already logged in
    │
    └─ /dashboard/*, /quotes/*, /invoices/*, ...
           → redirect to /login if not authenticated
           → if authenticated, check onboarding_completed
                  → redirect to /onboarding if false
```

**Server Component pattern (used in all protected pages):**

```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');

// RLS automatically filters by user_id — no extra .eq() needed
const { data } = await supabase.from('quotes').select('*');
```

---

## Core Design Principles

### 1. All amounts in cents
All monetary values are stored as integers (cents) to avoid floating-point errors.
Display with `/100`; GST = `Math.round(subtotal * 0.1)`.

### 2. Multi-tenant isolation
- Every top-level table has a `user_id` column
- RLS enforces isolation at the DB level
- Child tables (e.g. `quote_rooms`) verify ownership through the parent chain

### 3. Serverless constraints
- PDF generation: React-PDF only (Puppeteer is banned — Vercel memory/timeout limits)
- Images: served via Supabase Storage signed URLs

### 4. Type safety
- `types/database.ts`: auto-generated from the remote Supabase schema (always in sync with DB)
- `types/app-database.ts`: extended type for subscription cancel fields
- Domain types (`quote.ts`, `invoice.ts`) are separate from DB types and include UI logic
- No `any` usage; strict mode enabled

### 5. Migration management
Migrations are managed as numbered files in `supabase/migrations/`.
When adding columns or tables, always create a new migration file and apply it through the remote Supabase MCP flow. Local Supabase CLI/Docker is not part of the workflow.

1. Check existing schema with `execute_sql` or `list_tables`
2. Apply DDL with `apply_migration`
3. Regenerate `types/database.ts` with `generate_typescript_types`

---

---

# Coatly — 아키텍처

## 목차

1. [폴더 구조](#폴더-구조)
2. [DB 스키마](#db-스키마)
3. [RLS 정책 요약](#rls-정책-요약)
4. [API 라우트](#api-라우트)
5. [인증 플로우](#인증-플로우)
6. [핵심 설계 원칙](#핵심-설계-원칙)

---

## 폴더 구조

```
coatly/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 라우트 그룹 (레이아웃 공유, 미들웨어 보호 없음)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/              # 보호된 라우트 그룹 (로그인 필수)
│   │   ├── dashboard/            # 홈 대시보드
│   │   ├── quotes/               # 견적서 목록 + [id] 상세 + new
│   │   ├── invoices/             # 청구서 목록 + [id] 상세/편집 + new
│   │   ├── customers/            # 고객 목록 + [id] 상세 + new
│   │   ├── jobs/                 # 작업 현황
│   │   ├── schedule/             # 일정
│   │   ├── materials-service/    # 자재/서비스 관리
│   │   └── settings/             # 설정 + billing/
│   └── api/                      # API 라우트 (서버 전용)
│       ├── abn-lookup/           # GET  — ABN 번호로 사업자 정보 조회
│       ├── business-logo/        # POST — 로고 업로드
│       ├── pdf/
│       │   ├── quote/            # GET  — 견적서 PDF 생성
│       │   └── invoice/          # GET  — 청구서 PDF 생성
│       ├── stripe/
│       │   ├── checkout/         # POST — Stripe Checkout 세션 생성
│       │   ├── portal/           # POST — Stripe 고객 포털 URL 생성
│       │   └── renew/            # POST — 구독 갱신
│       └── webhooks/
│           └── stripe/           # POST — Stripe 이벤트 수신 및 DB 동기화
│
├── components/
│   ├── ui/                       # shadcn/ui 기본 프리미티브 (수정 금지)
│   ├── quotes/                   # 견적서 전용 컴포넌트 (InteriorEstimateBuilder, QuickQuoteBuilder 포함)
│   ├── invoices/                 # 청구서 전용 컴포넌트
│   ├── rates/                    # 단가 설정 폼 컴포넌트
│   └── pdf/                      # PDF 렌더링 컴포넌트
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 Supabase 클라이언트
│   │   ├── server.ts             # 서버 Supabase 클라이언트 (쿠키 기반)
│   │   ├── admin.ts              # Service Role 클라이언트 (RLS 우회, 서버 전용)
│   │   ├── middleware.ts         # 인증 미들웨어 라우팅 로직
│   │   ├── storage.ts            # Storage URL 파싱 / 서명 URL 생성
│   │   ├── validators.ts         # Zod 스키마 (quote, invoice, customer 입력 검증)
│   │   └── request-context.ts   # 현재 사용자 / 구독 / 견적 사용량 조회
│   ├── stripe/
│   │   ├── client.ts             # Stripe 클라이언트 싱글톤
│   │   ├── plans.ts              # 플랜 → Stripe Price ID 매핑
│   │   ├── portal.ts             # 고객 포털 URL 생성
│   │   ├── subscription-sync.ts  # Stripe → Supabase 구독 동기화
│   │   └── webhook-handler.ts    # Stripe 웹훅 이벤트 처리
│   ├── subscription/
│   │   ├── access.ts             # 구독 기능 접근 권한 판단
│   │   └── server.ts             # 서버에서 구독 상태 조회
│   ├── profile/
│   │   └── onboarding.ts         # 온보딩 완료 처리
│   ├── ai/
│   │   ├── draft-types.ts        # AI 초안 타입
│   │   └── drafts.ts             # Gemini 기반 견적 초안 생성
│   ├── pdf/                      # React-PDF 템플릿
│   ├── quotes.ts                 # 견적서 비즈니스 로직 (계산, 매핑)
│   ├── invoices.ts               # 청구서 비즈니스 로직
│   ├── businesses.ts             # 사업자 프로필 조회 (PDF 브랜딩 포함)
│   ├── interior-estimates.ts     # 인테리어 견적 계산 로직
│   ├── rate-settings.ts          # 사용자 단가 설정 (price-rates 페이지)
│   ├── quick-quote-mapper.ts     # QuickQuote → 견적서 변환
│   └── abn-lookup.ts             # ABR 웹서비스 연동
│
├── config/
│   ├── plans.ts                  # Starter / Pro 플랜 정의 및 기능 목록
│   ├── paint-rates.ts            # 기본 도색 단가표 (면 종류 × 코팅 방식)
│   ├── interior-estimate-anchors.ts  # 인테리어 견적 빌더 기준 단가
│   └── constants.ts              # GST_RATE, QUOTE_VALID_DAYS 등 앱 상수
│
├── types/
│   ├── database.ts               # 원격 Supabase schema 기준 자동 생성 DB 타입
│   ├── app-database.ts           # Database 타입 확장 (subscriptions 취소 필드)
│   ├── quote.ts                  # Quote / QuoteRoom / QuoteSurface 도메인 타입
│   ├── invoice.ts                # Invoice / InvoiceLineItem 도메인 타입
│   └── customer.ts               # Customer 도메인 타입
│
├── hooks/                        # React 커스텀 훅
├── utils/                        # 범용 유틸리티
├── scripts/
│   └── seed-demo-data.ts         # 개발/데모 환경 테스트 데이터 시드
└── supabase/
    └── migrations/               # SQL 마이그레이션 파일 (001 ~ 015)
```

---

## DB 스키마

모든 금액은 **cents(정수)** 단위로 저장합니다. 표시 시 `/100` 변환.
모든 테이블은 `created_at`, `updated_at` 컬럼을 가지며 `update_updated_at_column()` 트리거가 자동 갱신합니다.

### 테이블 관계도

```
auth.users (Supabase 관리)
    │
    ├─── profiles          (1:1)  사업자 프로필
    ├─── businesses        (1:1)  비즈니스 상세 정보 (주소, 로고, 기본 단가)
    ├─── subscriptions     (1:1)  Stripe 구독 상태
    ├─── customers         (1:N)  고객 목록
    │        │
    │        ├─── quotes   (1:N)  견적서
    │        │       │
    │        │       ├─── quote_rooms         (1:N)  방/구역
    │        │       │         │
    │        │       │         └─── quote_room_surfaces  (1:N)  도색 면
    │        │       │
    │        │       └─── invoices  (N:1, nullable)  청구서 ← quote 없이도 생성 가능
    │        │
    │        └─── invoices  (1:N)
    │                 │
    │                 └─── invoice_line_items  (1:N)  청구 항목
    │
    └─── (Storage) logos/   비즈니스 로고
                   photos/  현장 사진
```

### profiles

사업자 프로필. `auth.users`와 1:1, `user_id`가 PK.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid PK | `auth.users.id` 참조 |
| business_name | text NOT NULL | 상호명 |
| abn | text | Australian Business Number (11자리) |
| email / phone | text | 연락처 |
| address_line1/2, city, state, postcode | text | 사업장 주소 |
| bank_bsb / bank_account_number / bank_account_name | text | 청구서 하단 표시용 계좌 |
| default_payment_terms | integer | 기본 결제 기한 (일, 기본 14) |
| logo_url | text | Supabase Storage URL |
| onboarding_completed | boolean | 온보딩 완료 여부 |

### customers

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK | 소유자 |
| name | text NOT NULL | 고객명 |
| email / phone | text | |
| company_name | text | 회사명 (선택) |
| address_line1/2, city, state, postcode | text | |
| notes | text | 내부 메모 (고객 비공개) |
| is_archived | boolean | 삭제 대신 보관 처리 |

### quotes

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK | |
| customer_id | uuid FK | |
| quote_number | text | `QUO-0001` 형식, (user_id, quote_number) UNIQUE |
| title | text | 작업 제목 |
| status | text | `draft` \| `sent` \| `accepted` \| `declined` \| `expired` |
| tier | text | `good` \| `better` \| `best` — 현재 선택 티어 |
| labour_margin_percent | integer | 인건비 마진 (%) |
| material_margin_percent | integer | 자재비 마진 (%) |
| subtotal_cents | integer | 합계 (GST 제외) |
| gst_cents | integer | GST = subtotal × 10% |
| total_cents | integer | subtotal + gst |
| valid_until | date | 견적 유효 기간 |
| notes | text | 고객 공개 메모 |
| internal_notes | text | 내부 전용 메모 (PDF 미포함) |

### quote_rooms

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| quote_id | uuid FK → quotes | CASCADE 삭제 |
| name | text | 방 이름 (`Living Room`, `Front Exterior` 등) |
| room_type | text | `interior` \| `exterior` |
| length_m / width_m / height_m | numeric(6,2) | 치수 (m), height 기본 2.7 |
| sort_order | integer | 드래그 정렬 순서 |

### quote_room_surfaces

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| room_id | uuid FK → quote_rooms | CASCADE 삭제 |
| surface_type | text | `walls` \| `ceiling` \| `trim` \| `doors` \| `windows` \| `exterior_walls` \| `exterior_trim` \| `fascia` \| `gutters` |
| area_m2 | numeric(8,2) | 면적 |
| coating_type | text | `touch_up_1coat` \| `repaint_2coat` \| `new_plaster_3coat` \| `stain` \| `specialty` |
| rate_per_m2_cents | integer | m² 당 단가 |
| material_cost_cents | integer | 자재비 |
| labour_cost_cents | integer | 인건비 |
| paint_litres_needed | numeric(6,2) | 필요 도료량 (자동 계산) |
| tier | text | `good` \| `better` \| `best` |
| notes | text | 면 관련 메모 |

### invoices

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK | |
| customer_id | uuid FK | |
| quote_id | uuid FK (nullable) | 견적 없이도 청구 가능 |
| invoice_number | text | `INV-0001` 형식, (user_id, invoice_number) UNIQUE |
| status | text | `draft` \| `sent` \| `paid` \| `overdue` \| `cancelled` |
| invoice_type | text | `full` \| `deposit` \| `progress` \| `final` |
| subtotal_cents | integer | |
| gst_cents | integer | |
| total_cents | integer | |
| amount_paid_cents | integer | 부분 납부 추적 |
| due_date | date | 결제 기한 |
| paid_at | timestamptz | 납부 일시 |
| notes | text | 고객 공개 메모 |

### invoice_line_items

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| invoice_id | uuid FK → invoices | CASCADE 삭제 |
| description | text | 항목 설명 |
| quantity | numeric(8,2) | 수량 (기본 1) |
| unit_price_cents | integer | 단가 |
| gst_cents | integer | 항목별 GST |
| total_cents | integer | quantity × unit_price_cents |
| sort_order | integer | 항목 순서 |

### subscriptions

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid UNIQUE FK | |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan | text | `starter` \| `pro` |
| status | text | `active` \| `cancelled` \| `past_due` \| `trialing` |
| current_period_start / end | timestamptz | 현재 구독 기간 |
| cancel_at | timestamptz | 예약 취소 일시 |
| cancel_at_period_end | boolean | 기간 말 취소 여부 |

---

## RLS 정책 요약

모든 테이블에 Row Level Security가 활성화되어 있습니다.
클라이언트는 자신의 `user_id = auth.uid()` 데이터에만 접근 가능합니다.

| 테이블 | 정책 방식 | 비고 |
|--------|----------|------|
| profiles | `user_id = auth.uid()` 직접 비교 | INSERT는 트리거 + 직접 허용 |
| customers | `user_id = auth.uid()` | |
| quotes | `user_id = auth.uid()` | |
| quote_rooms | 부모 quotes의 `user_id` 확인 (EXISTS 서브쿼리) | user_id 컬럼 없음 |
| quote_room_surfaces | quote_rooms → quotes 체인으로 `user_id` 확인 | |
| invoices | `user_id = auth.uid()` | |
| invoice_line_items | 부모 invoices의 `user_id` 확인 | |
| subscriptions | SELECT만 허용 | INSERT/UPDATE/DELETE는 Stripe webhook (service_role)만 가능 |

> **admin client** (`SUPABASE_SERVICE_ROLE_KEY`)는 RLS를 우회합니다.
> 서버 전용 (`lib/supabase/admin.ts`, `server-only` 임포트 가드 적용)이며
> Stripe webhook 처리, 번호 생성 함수 등에서만 사용합니다.

---

## API 라우트

모든 API 라우트는 `app/api/` 하위에 위치하며, 인증이 필요한 엔드포인트는
`createServerClient()`로 현재 사용자를 확인합니다.

### ABN Lookup

```
GET /api/abn-lookup?abn=<11자리>
```

Australian Business Register(ABR) 웹서비스에 프록시 요청을 보내 사업자 정보를 반환합니다.
ABR_GUID 환경 변수 필요. 인증 필수.

**응답 예시:**
```json
{ "data": { "abn": "12345678901", "name": "Smith Painting Pty Ltd", "state": "NSW" } }
```

---

### Business Logo

```
POST /api/business-logo
Content-Type: multipart/form-data
```

Supabase Storage `logos/` 버킷에 로고를 업로드하고 URL을 반환합니다. 인증 필수.

---

### PDF 생성

```
GET /api/pdf/quote?id=<quote-uuid>
GET /api/pdf/invoice?id=<invoice-uuid>
```

서버에서 React-PDF를 사용해 PDF를 렌더링하여 `application/pdf`로 반환합니다.
- 비즈니스 브랜딩(로고, ABN, 연락처) 자동 포함
- 인증 필수, 본인 데이터 소유 확인
- Serverless 환경에서 Puppeteer 없이 동작 (Vercel 호환)

**응답:** `Content-Type: application/pdf` 바이너리 스트림

---

### Stripe — Checkout

```
POST /api/stripe/checkout
Body: { planId: "starter" | "pro", interval: "monthly" | "annual", returnPath?: string }
```

Stripe Checkout 세션을 생성하고 결제 URL을 반환합니다.
기존 Stripe Customer ID가 있으면 재사용합니다. 인증 필수.

**응답:** `{ url: "https://checkout.stripe.com/..." }`

---

### Stripe — Portal

```
POST /api/stripe/portal
Body: { returnPath?: string }
```

Stripe 고객 포털 URL을 생성합니다 (구독 관리, 결제 수단 변경, 취소 등). 인증 필수.

**응답:** `{ url: "https://billing.stripe.com/..." }`

---

### Stripe — Renew

```
POST /api/stripe/renew
```

취소 예약된 구독을 갱신(취소 철회)합니다. 인증 필수.

---

### Stripe — Webhook

```
POST /api/webhooks/stripe
POST /api/stripe/webhook
```

Stripe 이벤트를 수신하여 `subscriptions` 테이블을 동기화합니다.
`STRIPE_WEBHOOK_SECRET`으로 서명 검증. 인증 불필요 (Stripe → 서버 직접 호출).

**처리 이벤트:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 인증 플로우

```
미들웨어 (middleware.ts)
    │
    ├─ /login, /signup, /forgot-password, /reset-password
    │      → 이미 로그인된 경우 /dashboard 리다이렉트
    │
    └─ /dashboard/*, /quotes/*, /invoices/*, ...
           → 미로그인 시 /login 리다이렉트
           → 로그인된 경우 onboarding_completed 확인
                  → false 이면 /onboarding 리다이렉트
```

**서버 컴포넌트 패턴 (모든 보호된 페이지에서 사용):**

```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');

// RLS가 user_id를 자동 필터링하므로 추가 where 절 불필요
const { data } = await supabase.from('quotes').select('*');
```

---

## 핵심 설계 원칙

### 1. 금액은 항상 cents 단위
소수점 오차를 방지하기 위해 모든 금액을 정수(cents)로 저장합니다.
표시 시 `/100` 변환, GST = `Math.round(subtotal * 0.1)`.

### 2. 멀티테넌트 격리
- 모든 최상위 테이블에 `user_id` 컬럼
- RLS로 DB 레벨에서 강제 격리
- 자식 테이블(quote_rooms 등)은 부모 체인으로 소유권 확인

### 3. Serverless 제약
- PDF 생성: React-PDF만 사용 (Puppeteer 금지 — Vercel 메모리/실행시간 제한)
- 이미지: Supabase Storage 서명 URL로 제공

### 4. 타입 안전성
- `types/database.ts`: 원격 Supabase schema 기준 자동 생성 (DB와 항상 동기화)
- `types/app-database.ts`: 확장 타입 (취소 필드 추가)
- 도메인 타입(`quote.ts`, `invoice.ts`)은 DB 타입과 분리하여 UI 로직 포함
- `any` 사용 금지, strict 모드 활성화

### 5. 마이그레이션 관리
`supabase/migrations/` 에 순번 파일로 관리합니다.
새 컬럼/테이블 추가 시 반드시 새 마이그레이션 파일을 만들고, 로컬 Supabase CLI가 아니라 원격 MCP 흐름으로 적용합니다.

1. `execute_sql` 또는 `list_tables`로 현재 schema 확인
2. `apply_migration`으로 DDL 적용
3. `generate_typescript_types`로 `types/database.ts` 재생성
