# Coatly — Security

> Current security snapshot: 2026-06-01. This document records both the intended security model and the active remediation queue.

## Current Security Snapshot

Latest checked state:

| Area | Status | Notes |
|------|--------|-------|
| App security headers | In place | `next.config.ts` sets CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, and Permissions-Policy. |
| Stripe webhook signature | In place | Webhook handler validates `stripe-signature` against `STRIPE_WEBHOOK_SECRET` before processing. |
| Vercel cron auth | In place | `/api/cron/invoice-reminders` requires `Authorization: Bearer ${CRON_SECRET}`. |
| Supabase RLS | Verified 2026-06-01 | Live public base tables returned no RLS-disabled rows in the spot check. |
| Public security definer functions | Restricted | `before_user_created_signup_guard`, `enforce_job_schedule_day_owner`, and `handle_new_user` exist in `public`, but `anon` and `authenticated` do not have direct execute permission. |
| Production deployment | Live | `https://coatly.vercel.app` returned HTTP 200 and Vercel status `Ready`. |

## Active Security Findings & Fix Plan

| Priority | Finding | Risk | Current mitigation | Required fix |
|----------|---------|------|--------------------|--------------|
| P1 | Public quote rate limit is in memory in `proxy.ts` | Vercel serverless instances do not share memory, so `/q/[token]` abuse protection is best-effort only. | 60 requests/minute/IP per warm instance. | Move public quote rate limiting to durable storage such as Upstash Redis, Vercel KV, or Supabase-backed counters with expiry. |
| P1 | Supabase CLI project is not linked locally | `supabase db lint --linked` cannot run from the repo, so DB advisor/lint checks can be missed before release. | Manual Management API SQL spot checks were used on 2026-06-01. | Link the Supabase project or document the approved remote lint command, then add it to the release checklist. |
| P1 | Local migration history needs reconciliation | Local file `20260517020123_quote_estimate_item_task2_categories.sql` was not visible in live migration history during the 2026-06-01 spot check. | Live DB does include `20260524022420 / 050_quote_form_structure`. | Confirm whether the local migration was superseded, manually applied, or missed. If missed, add a new corrective migration instead of rewriting history. |
| P2 | Duplicate env var keys in `.env.local` | Duplicate names can hide the effective runtime value and cause local/Vercel drift. | `.env.example` remains clean enough for onboarding. | Remove duplicate local keys and compare Vercel production/preview env names against `.env.example`. |
| P2 | Public quote and public invoice token routes need periodic abuse review | Tokenized public routes are intentionally unauthenticated. Weak rate limiting or leaked tokens can expose customer documents. | Token lookup and RLS-aware server code protect normal access paths. | Add token audit logging, durable throttling, and smoke tests for invalid/expired/mismatched public tokens. |
| P2 | DDD module refactor is not yet deployed | Local code passes build/tests but production is still the previous deployment. | Production is stable and `Ready`. | Land DDD refactor through preview deployment, browser smoke QA, then production promotion/deploy. |

## Implementation Direction

Security work should move in this order:

1. Stabilize the current DDD module refactor without changing behavior. Keep route files thin and preserve existing auth checks while moving feature code under `modules/`.
2. Reconcile Supabase migrations before shipping new schema work. Treat migration mismatches as release blockers.
3. Replace best-effort public route rate limiting with durable rate limiting before increasing public quote usage.
4. Add a release security gate: RLS check, security definer execute check, webhook/cron secret check, lint, tests, build, Vercel preview smoke.
5. Resume v1 core workflow release after the security gate is green: A price book setup, quote recreation, PDF/email, public quote, follow-up, invoice, and schedule smoke. AI/photo work remains deferred until that workflow is released and verified.

## RLS (Row Level Security) Policy Matrix

모든 테이블에 RLS가 활성화되어 있으며, 클라이언트는 자신의 데이터에만 접근 가능하다.

### Direct Ownership Tables

`user_id = auth.uid()` 직접 비교.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | ✅ own | ✅ own + trigger | ✅ own | ❌ |
| customers | ✅ own | ✅ own | ✅ own | ✅ own |
| quotes | ✅ own | ✅ own | ✅ own | ✅ own |
| invoices | ✅ own | ✅ own | ✅ own | ✅ own |
| subscriptions | ✅ own | ❌ (service_role only) | ❌ (service_role only) | ❌ |

### Parent-Chain Tables

user_id 컬럼 없음 — 부모 테이블 EXISTS 서브쿼리로 소유권 확인.

| Table | Parent Chain | 정책 |
|-------|-------------|------|
| quote_rooms | → quotes.user_id | EXISTS (quotes WHERE id = quote_id AND user_id = auth.uid()) |
| quote_room_surfaces | → quote_rooms → quotes.user_id | EXISTS chain |
| invoice_line_items | → invoices.user_id | EXISTS (invoices WHERE id = invoice_id AND user_id = auth.uid()) |

## Authentication Flow

```
사용자 요청
    │
    ├── proxy.ts (Supabase Auth 세션 확인)
    │   ├── /login, /signup → 로그인 상태면 /dashboard 리다이렉트
    │   └── /dashboard/* → 미로그인 시 /login 리다이렉트
    │                       로그인 + onboarding 미완료 → /onboarding
    │
    ├── Server Component
    │   └── supabase.auth.getUser() → 실패 시 redirect('/login')
    │
    └── Server Action / API Route
        └── supabase.auth.getUser() → 실패 시 { error: 'Unauthorized' }
```

## Admin Client 격리

```ts
// lib/supabase/admin.ts
import 'server-only'  // 클라이언트 번들에 포함 방지

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // RLS 우회
)
```

**사용처 제한:**
- Stripe webhook handler (구독 상태 동기화)
- 번호 생성 함수 (quote_number, invoice_number)
- 그 외 사용 금지

## Webhook Security

### Stripe Webhook 서명 검증

```ts
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

- 서명 불일치 시 400 반환
- Raw body 사용 (JSON parse 전)

## Environment Variables

### 노출 금지 (서버 전용)

| 변수 | 용도 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 — 서버에서만 사용 |
| `STRIPE_SECRET_KEY` | Stripe API 호출 |
| `STRIPE_WEBHOOK_SECRET` | 웹훅 서명 검증 |
| `ABR_GUID` | ABN 조회 API 인증 |

### 공개 가능 (NEXT_PUBLIC_)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (RLS로 보호) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 결제 UI |
| `NEXT_PUBLIC_APP_URL` | 앱 기본 URL |

## Security Checklist

배포 전 `/quality` 커맨드가 검증하는 보안 항목:

- [ ] 모든 테이블에 RLS 활성화
- [ ] user_id 필터 누락 없음
- [ ] Admin client 사용처가 webhook/번호생성으로 제한
- [ ] 환경변수 하드코딩 없음
- [ ] .env 파일 .gitignore에 포함
- [ ] `.env.example`과 Vercel env var 이름 불일치 없음
- [ ] `.env.local` 중복 key 없음
- [ ] Stripe webhook signature 검증
- [ ] Vercel cron endpoint가 `CRON_SECRET` 없이는 실패
- [ ] Server Action에서 auth 체크
- [ ] API route에서 auth 체크
- [ ] `server-only` import guard 적용 (admin.ts)
- [ ] public token route는 invalid/expired/mismatched token 테스트 포함
- [ ] `/q/[token]` rate limit은 durable store 기반
- [ ] Supabase migration history와 로컬 migration 파일 불일치 없음
- [ ] production 배포 전 Vercel preview에서 smoke QA 완료
