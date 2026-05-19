# Coatly — Architecture

> 이 문서는 현재 구현된 시스템의 짧은 기술 지도입니다. 상세 DB 원장은 `supabase/migrations/`와 [`docs/generated/DB-SCHEMA.md`](./docs/generated/DB-SCHEMA.md)를 기준으로 합니다.

## Product Shape

Coatly는 호주 소규모 페인터를 위한 모바일 우선 SaaS입니다. 고객 관리, 견적, PDF, 청구, 일정, 자재/서비스 카탈로그, Stripe 구독, **AI Quote Writer (v1 wedge)**, Google Calendar 연동을 한 워크스페이스에서 처리합니다. v1 wedge 자세한 건 [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md).

## Stack {#stack}

| 영역 | 기술 |
|------|------|
| App | Next.js 16 App Router, React 19, TypeScript strict |
| UI | Tailwind CSS 4, shadcn/ui 기반 로컬 컴포넌트, lucide-react |
| Data | Supabase Postgres, Auth, RLS, Storage |
| Payments | Stripe Checkout, Portal, Webhook |
| PDF/Email | `@react-pdf/renderer`, Resend |
| AI | Alibaba Cloud / Qwen `qwen3-vl-flash` for v1 AI Quote Writer, photo analysis, Today Assistant, and Follow-up Writer |
| Calendar | Google Calendar OAuth + Calendar API |
| Deploy | Vercel serverless |

## Runtime Boundaries

- Server Components와 Server Actions가 데이터 접근의 기본 진입점입니다.
- 모든 보호 페이지는 `createServerClient()`와 `auth.getUser()` 또는 `requireCurrentUser()`로 사용자 확인 후 실행합니다.
- Supabase RLS는 `auth.uid()` 기준으로 사용자 데이터를 격리합니다.
- PDF는 Vercel serverless 제약 때문에 React-PDF만 사용합니다. Puppeteer는 금지입니다.
- 금액은 항상 정수 cents로 저장하고 표시 시 `formatAUD()`를 사용합니다.

## Folder Map

| 경로 | 책임 |
|------|------|
| `app/(auth)/` | 로그인, 가입, 비밀번호 재설정 |
| `app/(onboarding)/` | 사업자 프로필/ABN/로고 온보딩 |
| `app/(dashboard)/` | dashboard, customers, quotes, invoices, schedule, settings |
| `app/actions/` | 서버 액션: CRUD, 이메일, AI, jobs, schedule |
| `app/api/` | ABN, PDF, Stripe, cron, Google Calendar OAuth |
| `app/q/[token]/` | 고객용 공개 견적 검토/승인/예약 |
| `components/` | 도메인별 React 컴포넌트 |
| `lib/` | 계산, Supabase, Stripe, email, calendar, AI, validators |
| `supabase/migrations/` | 원격 DB 변경 이력 |
| `docs/` | 기능/보안/신뢰성/로드맵 문서 |

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

사용자는 manual/room/day-rate/detailed quick 방식으로 견적을 작성합니다. 견적은 `draft → sent → approved/rejected/expired`로 이동하며 PDF 생성, Resend 발송, 공개 `/q/[token]` 승인, 서명, 선택 항목, 예약 날짜 선택을 지원합니다.

### Invoice

승인된 견적 또는 독립 입력에서 invoice를 생성합니다. line item, invoice type, partial payment, public PDF token, Resend 발송, cron reminder를 지원합니다.

### Schedule & Jobs

Schedule 화면은 jobs, internal events, Google Calendar events를 통합해 보여줍니다. 공개 견적 승인 후 고객이 날짜를 선택하면 job과 schedule days가 생성되고 겹침 검사를 통과해야 합니다.

### AI

Pro 사용자는 dashboard workspace assistant와 quote 생성 화면의 AI draft panel을 사용할 수 있습니다. 감사/사용량 추적은 `ai_usage_events`에 저장하는 방향입니다.

## API Routes

| Route | 역할 |
|-------|------|
| `GET /api/abn-lookup` | ABR business name lookup |
| `POST /api/business-logo` | Supabase Storage 로고 업로드 |
| `GET /api/pdf/quote` | 로그인 또는 public token 기반 견적 PDF |
| `GET /api/pdf/invoice` | 로그인 또는 public token 기반 invoice PDF |
| `POST /api/stripe/checkout` | 구독 checkout 생성 |
| `POST /api/stripe/portal` | customer portal 생성 |
| `POST /api/webhooks/stripe` | Stripe webhook sync |
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
