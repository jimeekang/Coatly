# Coatly — Architecture

> Owner: **Codex** (high) — 구현/DB/보안/배포/git 문서. 기획·디자인 결정은 Claude(Opus 4.8·extra) 영역.
> 이 문서는 현재 구현된 시스템의 짧은 기술 지도입니다. 상세 DB 원장은 `supabase/migrations/`와 [`docs/generated/DB-SCHEMA.md`](./docs/generated/DB-SCHEMA.md)를 기준으로 합니다.

## Product Shape

Coatly는 호주 소규모 painter/tradie를 위한 모바일 우선 SaaS입니다. v1 wedge는 **Excel quote workflow replacement**입니다. 기존 Excel 가격표를 참고해 Coatly 앱 안에서 단순 price book을 세팅하고, 고객 관리, 견적 작성, PDF, 이메일 발송, follow-up, 청구, 일정 전환을 한 워크스페이스에서 처리합니다.

v1은 arbitrary Excel parser가 아닙니다. Excel 파일은 reference 또는 선택적 bulk input이고, 저장 후 quote 계산은 Coatly price book data를 기준으로 합니다. 단순 가격표 세팅 기준은 [`docs/features/quote/PRICE-BOOK-TEMPLATE.md`](./docs/features/quote/PRICE-BOOK-TEMPLATE.md)에 둡니다.

AI Quote Writer, 사진 분석, damage 판별은 현재 핵심 workflow가 아닙니다. core quote workflow가 실제 Excel/PDF/email 업무를 완전히 대체하고 릴리즈된 뒤, AI는 설명 작성과 follow-up 문구 보조로만 검토합니다. 자세한 건 [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md).

## Stack {#stack}

| 영역 | 기술 |
|------|------|
| App | Next.js 16 App Router, React 19, TypeScript strict |
| UI | Tailwind CSS 4, shadcn/ui 기반 로컬 컴포넌트, lucide-react |
| Data | Supabase Postgres, Auth, RLS, Storage |
| Payments | Stripe Checkout, Portal, Webhook |
| PDF/Email | `@react-pdf/renderer`, Resend |
| AI | Post-core workflow only. Provider adapter code may exist, but AI/photo analysis is deferred until quote workflow replacement is released and verified |
| Calendar | Google Calendar OAuth + Calendar API |
| Deploy | Vercel serverless |

## Runtime Boundaries

- Server Components와 Server Actions가 데이터 접근의 기본 진입점입니다.
- 모든 보호 페이지는 `createServerClient()`와 `auth.getUser()` 또는 `requireCurrentUser()`로 사용자 확인 후 실행합니다.
- Supabase RLS는 `auth.uid()` 기준으로 사용자 데이터를 격리합니다.
- PDF는 Vercel serverless 제약 때문에 React-PDF만 사용합니다. Puppeteer는 금지입니다.
- 금액은 항상 정수 cents로 저장하고 표시 시 `formatAUD()`를 사용합니다.

## Error Boundaries

Next.js App Router 세그먼트 에러 경계를 3층으로 둡니다:

- `app/global-error.tsx` — root layout 자체 크래시 fallback. `<html><body>`를 직접 렌더하고 `globals.css` 없이 인라인 스타일만 씁니다.
- `app/error.tsx` — 최상위 세그먼트 에러 fallback. `components/ui/error-page`의 `ErrorPage`(500)를 렌더합니다.
- `app/(dashboard)/error.tsx` — dashboard 세그먼트 에러 fallback. 동일 `ErrorPage`를 쓰고 `console.error`로 리포팅 hook을 남깁니다.

모두 `'use client'`이며 `reset()`으로 재시도를 제공합니다. 기능 모듈은 자체 error 경계를 두지 않고 route 세그먼트 경계에 위임합니다.

## Folder Map

| 경로 | 책임 |
|------|------|
| `app/(auth)/` | 로그인, 가입, 비밀번호 재설정 |
| `app/(onboarding)/` | 사업자 프로필/ABN/로고 온보딩 |
| `app/(dashboard)/` | dashboard, customers, quotes, invoices, schedule, settings |
| `app/api/` | ABN, PDF, Stripe, cron, Google Calendar OAuth |
| `app/q/[token]/` | 고객용 공개 견적 검토/승인/예약 |
| `modules/` | DDD-lite 기능 모듈 13개(domain/application/infrastructure/ui). 서버 액션은 각 모듈 `application`에 위치 (`app/actions/`는 비움) |
| `components/` | design system과 cross-feature shell(ui/shared/forms/layout/branding/dashboard) — 특정 feature 전용 컴포넌트는 두지 않음 |
| `lib/` | Supabase, email, config, security, constants, ABN/address helpers, utils 등 shared kernel (Stripe/PDF/AI/Google Calendar adapter는 각 모듈 `infrastructure`로 이동) |
| `types/` | `database.ts`, `app-database.ts`만 (엔티티 타입은 각 모듈 domain으로 이동) |
| `supabase/migrations/` | 원격 DB 변경 이력 |
| `docs/` | 기능/보안/신뢰성/로드맵 문서 |

## Feature Modules

Coatly uses a DDD-lite module layout. Each feature owns up to four layers:

```text
modules/<feature>/
  domain/          pure business rules, calculations, types, pure tests (no IO)
  application/     'use server' actions + workflow orchestration
  infrastructure/  Supabase/Stripe/Resend/Google adapters, PDF templates
  ui/              feature-owned React components and component tests
  index.ts         defineFeatureModule() manifest + public type exports
```

Modules register in `modules/index.ts` and split by surface:

- Dashboard features (`DASHBOARD_FEATURE_MODULES`): `materials`, `customers`, `quotes`, `invoices`, `jobs`, `price-rates`, `settings`, `schedule`, `billing`, `ai`, `assistant`
- Platform features (`PLATFORM_FEATURE_MODULES`): `auth`, `onboarding`

The 2026-07 DDD migration folded former `lib/` and `app/actions/` integration code into its owning module:

| Module | Domain | Application | Infrastructure | UI |
|--------|--------|-------------|----------------|-----|
| `schedule` | NSW public-holiday rules | schedule + Google Calendar actions, job-calendar sync | Google Calendar OAuth/crypto/service | `ScheduleCalendar` |
| `auth` | — | sign-in/up/reset actions | base-url helper | auth shells + page clients |
| `billing` | — | subscription access policy, Stripe webhook orchestration | Stripe client/plans/portal | `UpgradePrompt` |
| `ai` | draft-types, validator, deterministic pricing | AI draft actions | Qwen provider | `AIDraftPanel` |
| `onboarding` | — | — | — | `OnboardingForm` |
| `assistant` | — | workspace-assistant actions | — | `WorkspaceAssistant` |
| `quotes` / `invoices` | entity types + calculations | quote/invoice actions | repository + `infrastructure/pdf/*-template.tsx` | forms/tables/public views |

Entity types moved from `types/` into their owning module domain: `types/quote.ts` → `modules/quotes/domain`, `types/invoice.ts` → `modules/invoices/domain`, `types/customer.ts` → `modules/customers/domain`. Address composition lives in each owning domain (`customers/domain/customer-address.ts`, `quotes/domain` own copy) so no cross-feature domain import remains.

Route files in `app/` stay thin: authenticate, call a module `application` loader, compose module `ui`. Cross-feature workflows are assembled in `app/` or an application service — a feature `ui` never imports another feature's runtime (types only, via `import type`; behaviour is injected as props/callbacks).

### Layer import rules (enforced mechanically)

- `domain`: only its own domain, `utils/`, `types/database|app-database`. No Next.js, Supabase, other modules, or UI. Pure types/rules, no IO.
- `application`: its whole module + other modules' `application`/`domain` + `lib/supabase` and shared `lib` utils. No other module's `ui`/`infrastructure`, no `components/`, no `app/`. `'use server'` actions live here.
- `infrastructure`: its own `domain` + provider SDKs (`lib/supabase`, Stripe, Resend, Google) + `utils/`. No `application`/`ui`/other modules.
- `ui`: its whole module + `components/` design system + `utils/`; other modules only via `import type` of domain types. No `app/` import.
- `app/`: composition layer — imports module `ui`/`application`/`domain`, `components`, `lib`. Wrap module `infrastructure` behind `application`.
- `components/`, `lib/`, `utils/`, `types/`, `hooks/` are the shared kernel and never import `modules/` or `app/`. No runtime import cycles between modules.

Detailed rationale, layer responsibilities, and maintenance checklists live in [`docs/DDD-MODULES.md`](./docs/DDD-MODULES.md). The dashboard/platform module rosters are pinned by [`modules/module-boundaries.test.ts`](./modules/module-boundaries.test.ts), so adding or renaming a module requires updating its manifest and that test together.

## Core Data Model

| 테이블 | 역할 |
|--------|------|
| `profiles`, `businesses` | 사용자 프로필, 사업자 정보, 로고, 기본 단가 |
| `customers` | 고객/현장 정보, 보관 처리 |
| `quotes` | 견적 헤더, 상태, 공개 토큰, AI/가격 스냅샷 |
| `quote_rooms`, `quote_room_surfaces` | 방/표면 기반 상세 견적 |
| `quote_estimate_items`, `quote_line_items` | quick estimate 및 자재/서비스 line item |
| `quote_templates` | Starter 5개, Pro 무제한 견적 템플릿 |
| `invoices`, `invoice_line_items` | 청구서, 부분 납부, 공개 PDF 토큰 |
| `invoice_reminder_events` | due soon/overdue 리마인더 멱등성 |
| `jobs`, `job_schedule_days`, `job_variations` | 작업, 다일 일정, 추가 작업 |
| `schedule_events` | Coatly 내부 일정 |
| `material_items` | 자재/서비스 카탈로그 |
| `subscriptions` | Stripe 구독 상태 |
| `google_calendar_connections`, `google_calendar_settings` | OAuth 토큰과 캘린더 설정 |
| `ai_usage_events`, `public_quote_events` | AI/공개 견적 운영 감사 |

## Main Flows

### Auth & Onboarding

`/signup` → email confirm → `/login` → middleware/session guard → `/onboarding` if `onboarding_completed = false` → `/dashboard`.

### Quote

사용자는 앱 안에서 직접 세팅한 price book 또는 manual/room/day-rate/detailed quick 방식으로 견적을 작성합니다. 견적은 `draft → sent → approved/rejected/expired`로 이동하며 PDF 생성, Resend 발송, 공개 `/q/[token]` 승인, 서명, 선택 항목, 예약 날짜 선택을 지원합니다.

follow-up reminder cron은 미구현(AUDIT A9)입니다. 현재는 quote의 follow-up due 상태 표시만 존재하고, 자동 리마인더 발송 cron은 invoice(`/api/cron/invoice-reminders`)에만 있습니다.

### Invoice

승인된 견적 또는 독립 입력에서 invoice를 생성합니다. line item, invoice type, partial payment, public PDF token, Resend 발송, cron reminder를 지원합니다.

### Schedule & Jobs

Schedule 화면은 jobs, internal events, Google Calendar events를 통합해 보여줍니다. 공개 견적 승인 후 고객이 날짜를 선택하면 job과 schedule days가 생성되고 겹침 검사를 통과해야 합니다.

### AI

AI surfaces are not the v1 release gate. Existing Workspace Assistant / AI draft code is treated as dormant or experimental until the core quote workflow passes release criteria: simple in-app price book setup, real price book validation, quote PDF/email send, follow-up status, invoice conversion, schedule conversion, tests, build, and preview/prod smoke.

Post-core AI rules:

- AI may draft customer-facing quote explanations, assumptions, exclusions, and follow-up messages.
- AI must not set price, rate, GST, total, schedule, invoice status, or send messages automatically.
- Photo analysis must not infer hidden damage, exact sqm/lm, or price. It can only become a user-reviewed hint after the manual workflow is stable.

## API Routes

| Route | 역할 |
|-------|------|
| `GET /api/abn-lookup` | ABR business name lookup |
| `POST /api/business-logo` | Supabase Storage 로고 업로드 |
| `GET /api/pdf/quote` | 로그인 또는 public token 기반 견적 PDF |
| `GET /api/pdf/invoice` | 로그인 또는 public token 기반 invoice PDF |
| `POST /api/stripe/checkout` | 구독 checkout 생성 |
| `POST /api/stripe/portal` | customer portal 생성 |
| `POST /api/stripe/renew` | cancel-at-period-end 구독 갱신 재개 |
| `POST /api/webhooks/stripe` | Stripe webhook sync |
| `POST /api/stripe/webhook` | Stripe webhook sync (중복 라우트 — 정리 예정 AUDIT A10) |
| `GET /api/cron/invoice-reminders` | invoice 리마인더 발송 |
| `GET /api/integrations/google-calendar/connect` | Google OAuth 시작 |
| `GET /api/integrations/google-calendar/callback` | OAuth callback 처리 |

## Database Rules

- 스키마 변경은 Codex가 담당합니다.
- 로컬 Docker/Supabase CLI 의존 대신 원격 Supabase MCP/API 흐름을 우선합니다.
- migration 적용 후 `execute_sql` 검증과 TypeScript 타입 재생성을 수행합니다.
- Security definer/RPC 권한은 최소화하고 anon execute는 명시적으로 차단합니다.
- FK 인덱스와 RLS 성능 경고는 migration 046–049에서 정리했습니다.

## Design Rules

- MD3 토큰만 사용합니다. 신규 UI에서 legacy `pm-*` 토큰을 추가하지 않습니다.
- 페이지 헤더는 `components/layout/PageHeader.tsx`를 사용합니다.
- CTA는 `PrimaryActionLink`/`SecondaryActionLink`를 우선 사용하고 모바일 44px 이상을 유지합니다.
- 오류 박스는 `components/shared/ErrorAlert.tsx`로 통일합니다.

## Ownership

| 영역 | 담당 |
|------|------|
| 계획, 디자인, 앱 구성, progress 계획 | Claude Code |
| 구현, 버그 수정, DB, 배포, git 연동 | Codex |
| 브라우저 QA/디자인 회귀 | Claude Code가 계획/검증, Codex가 결함 수정 |

## Verification

일반 변경 후 최소 확인:

```bash
npm run lint
npm run test:run
npm run build
```

DB 변경 후 추가 확인:

```bash
npm run db:types
```
