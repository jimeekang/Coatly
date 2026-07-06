# Coatly — Security

> Owner: **Codex** (high) — 구현/DB/보안/배포/git 문서. 기획·디자인 결정은 Claude(Opus 4.8·extra) 영역.
> Current security snapshot: 2026-06-28. This document records both the intended security model and the active remediation queue.

## Current Security Snapshot

Latest checked state:

| Area                              | Status              | Notes                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App security headers              | In place            | `next.config.ts` sets CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, and Permissions-Policy.                                                                                                                                                |
| Stripe webhook signature          | In place            | Webhook handler validates `stripe-signature` against `STRIPE_WEBHOOK_SECRET` before processing. 단 event 멱등성은 미구현(AUDIT A10) — `event.id` 재처리 방어 없음.                                                                                          |
| Vercel cron auth                  | In place            | `/api/cron/invoice-reminders` requires `Authorization: Bearer ${CRON_SECRET}`.                                                                                                                                                                              |
| Supabase RLS                      | Verified 2026-06-01 | Live public base tables returned no RLS-disabled rows in the spot check. spot-check 일자가 2026-06-01로 오래됨 — 재검증 필요.                                                                                                                                |
| Public security definer functions | Restricted          | `before_user_created_signup_guard`, `enforce_job_schedule_day_owner`, and `handle_new_user` exist in `public`, but `anon` and `authenticated` do not have direct execute permission.                                                                        |
| Public quote rate limit           | Verified remotely   | `proxy.ts` now calls service-role-only Supabase RPC `check_public_route_rate_limit`; remote migration `20260626233104 / public_route_rate_limits` is applied, grants are service-role-only, and RPC allow/deny behavior passed.                         |
| Auth env failure mode             | Hardened locally    | Protected routes now redirect to `/login` when Supabase auth env is missing, preventing Preview deployments with missing env from becoming fail-open.                                                                                                       |
| Vercel Preview env                | Ready for smoke     | Preview env now includes Supabase, Stripe test, Resend sandbox/test recipient, cron, ABR, and Google OAuth secret values. `NEXT_PUBLIC_APP_URL` is omitted so server links fall back to the active Vercel deployment URL.                                  |
| Vercel Preview deployment         | Basic smoke passed  | Preview `coatly-2ir6cs2rb-kjm12081-3858s-projects.vercel.app` is Ready; unauthenticated smoke returned expected 200/307/404/401 statuses and no error logs were found.                                                                                      |
| Launch smoke tooling              | Preview smoke passed | `smoke:env`, `smoke:seed`, and `smoke:preview` are available for repeatable release checks. Tagged fixture and authenticated Preview browser smoke passed on 2026-06-28. Production live cron remains manual-only because it can send real reminders.     |
| Production deployment             | Live                | `https://coatly.vercel.app` returned HTTP 200 and Vercel status `Ready`.                                                                                                                                                                                    |

## Active Security Findings & Fix Plan

| Priority | Finding                                                                 | Risk                                                                                                                                                            | Current mitigation                                                                                                                              | Required fix                                                                                                                                             |
| -------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Supabase CLI project is not linked locally                              | `supabase db lint --linked` cannot run from the repo, so DB advisor/lint checks can be missed before release.                                                   | Supabase MCP is authenticated and was used for remote migration/history checks on 2026-06-27.                                                   | Replace the legacy local CLI token or relink the project, then add the approved remote lint command to the release checklist.                            |
| P1       | Local migration bookkeeping needs cleanup                               | MCP-applied live migration versions differ from local timestamped filenames, so CLI repair/lint should be cleaned up before future schema-heavy work.            | Live DB now includes `20260626233104 / public_route_rate_limits` and `20260626233327 / quote_estimate_item_task2_categories`; constraints match. | Use Supabase CLI migration repair after token/link restoration or document MCP-first migration flow for this project.                                   |
| P1       | Production email/cron env needs launch verification                     | Production customer email and invoice reminder cron can fail or route to the wrong recipient if Resend/cron values are missing or sandbox-only.                  | Preview uses Resend sandbox/test recipient for safe smoke.                                                                                      | Add customer-safe Production Resend sender/API config, verify `CRON_SECRET`, then run live email and cron smoke before external launch.                  |
| P2       | Public quote and public invoice token routes need periodic abuse review | Tokenized public routes are intentionally unauthenticated. Leaked tokens can expose customer documents.                                                          | Token lookup, RLS-aware server code, and durable public quote rate limiting protect normal access paths.                                        | Add token audit logging and periodic smoke tests for invalid/expired/mismatched public tokens.                                                           |
| P2       | DDD module refactor is not yet deployed                                 | Local code passes build/tests but production is still the previous deployment.                                                                                  | Production is stable and `Ready`.                                                                                                               | Land DDD refactor through preview deployment, browser smoke QA, then production promotion/deploy.                                                        |
| P1       | Stripe webhook event 멱등성 부재 (AUDIT A10)                            | `webhook-handler.ts`가 `event.id`를 체크하지 않아 Stripe 재전송/중복 delivery 시 같은 event를 다시 처리. `039` operational event 테이블이 아직 사용되지 않음.  | Signature 검증은 통과하고 subscription sync는 ID 기준 upsert라 대부분 상태 동기화는 안전.                                                        | Processed `event.id`를 operational event 테이블에 기록하고 재수신 시 early-return. 멱등 처리 회귀 테스트 추가.                                            |
| P1       | `invoice.payment_failed` no-op (매출 누수)                              | `webhook-handler.ts`의 `invoice.payment_failed` 케이스가 `console.warn`만 하고 subscription 상태를 `past_due`로 반영하지 않음. 결제 실패가 접근 제어에 미반영. | 없음 — 로그만 남음.                                                                                                                             | payment_failed에서 subscription 상태를 `past_due`로 동기화하고 접근 게이트에 반영. 회귀 테스트 추가.                                                     |
| P1       | Stripe webhook 라우트 중복                                              | `app/api/stripe/webhook`과 `app/api/webhooks/stripe` 두 개가 공존. Stripe endpoint 설정과 실제 처리 경로가 갈릴 수 있음.                                        | 두 경로 모두 동일 핸들러를 호출하도록 유지되고 있음.                                                                                             | 한 경로만 남기고 나머지 삭제 후 Stripe dashboard endpoint를 정본 경로로 정리.                                                                            |
| P1       | `/demo/schedule` 무인증 프로덕션 노출                                   | `app/demo/schedule/page.tsx`가 auth 없이 렌더(파일 주석에도 "no auth required"). 데모 데이터지만 프로덕션 라우트로 공개 노출.                                    | 데모 데이터만 표시 — 실제 고객 데이터는 없음.                                                                                                    | 프로덕션 빌드에서 제거하거나 route를 비공개(개발 전용)로 격리.                                                                                           |

## Implementation Direction

Security work should move in this order:

1. Stabilize the current DDD module refactor without changing behavior. Keep route files thin and preserve existing auth checks while moving feature code under `modules/`.
2. Keep Supabase MCP or CLI available for every schema change. Treat unverified live schema drift as a release blocker.
3. Add a release security gate: RLS check, security definer execute check, webhook/cron secret check, lint, tests, build, Vercel preview smoke.
4. Resume v1 core workflow release after the security gate is green: A price book setup, quote recreation, PDF/email, public quote, follow-up, invoice, and schedule smoke. AI/photo work remains deferred until that workflow is released and verified.

## RLS (Row Level Security) Policy Matrix

모든 테이블에 RLS가 활성화되어 있으며, 클라이언트는 자신의 데이터에만 접근 가능하다.

### Direct Ownership Tables

`user_id = auth.uid()` 직접 비교.

| Table         | SELECT | INSERT                 | UPDATE                 | DELETE |
| ------------- | ------ | ---------------------- | ---------------------- | ------ |
| profiles      | ✅ own | ✅ own + trigger       | ✅ own                 | ❌     |
| customers     | ✅ own | ✅ own                 | ✅ own                 | ✅ own |
| quotes        | ✅ own | ✅ own                 | ✅ own                 | ✅ own |
| invoices      | ✅ own | ✅ own                 | ✅ own                 | ✅ own |
| subscriptions | ✅ own | ❌ (service_role only) | ❌ (service_role only) | ❌     |

### Parent-Chain Tables

user_id 컬럼 없음 — 부모 테이블 EXISTS 서브쿼리로 소유권 확인.

| Table               | Parent Chain                   | 정책                                                             |
| ------------------- | ------------------------------ | ---------------------------------------------------------------- |
| quote_rooms         | → quotes.user_id               | EXISTS (quotes WHERE id = quote_id AND user_id = auth.uid())     |
| quote_room_surfaces | → quote_rooms → quotes.user_id | EXISTS chain                                                     |
| invoice_line_items  | → invoices.user_id             | EXISTS (invoices WHERE id = invoice_id AND user_id = auth.uid()) |

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
import 'server-only'; // 클라이언트 번들에 포함 방지

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // RLS 우회
);
```

**사용처 제한:**

- Stripe webhook handler (구독 상태 동기화)
- 번호 생성 함수 (quote_number, invoice_number)
- public quote rate-limit RPC 호출 (server/proxy only, hashed IP only)
- 그 외 사용 금지

## Webhook Security

### Stripe Webhook 서명 검증

```ts
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

- 서명 불일치 시 400 반환
- Raw body 사용 (JSON parse 전)
- 단 event 멱등성은 미구현(AUDIT A10): `event.id` 중복 방어가 없어 재전송/중복 delivery가 다시 처리됨. operational event 테이블(039) 미사용.

## Environment Variables

### 노출 금지 (서버 전용)

| 변수                        | 용도                       |
| --------------------------- | -------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 — 서버에서만 사용 |
| `STRIPE_SECRET_KEY`         | Stripe API 호출            |
| `STRIPE_WEBHOOK_SECRET`     | 웹훅 서명 검증             |
| `ABR_GUID`                  | ABN 조회 API 인증          |

### 공개 가능 (NEXT*PUBLIC*)

| 변수                                 | 용도                          |
| ------------------------------------ | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase 프로젝트 URL         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase 공개 키 (RLS로 보호) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 결제 UI                |
| `NEXT_PUBLIC_APP_URL`                | 앱 기본 URL                   |

## Security Checklist

배포 전 `/quality` 커맨드가 검증하는 보안 항목:

- [ ] 모든 테이블에 RLS 활성화
- [ ] user_id 필터 누락 없음
- [ ] Admin client 사용처가 webhook/번호생성으로 제한
- [ ] 환경변수 하드코딩 없음
- [ ] .env 파일 .gitignore에 포함
- [ ] `.env.example`과 Vercel env var 이름 불일치 없음
- [x] `.env.local` 중복 key 없음 (local 2026-06-27)
- [ ] Stripe webhook signature 검증
- [ ] Vercel cron endpoint가 `CRON_SECRET` 없이는 실패
- [ ] Server Action에서 auth 체크
- [ ] API route에서 auth 체크
- [ ] `server-only` import guard 적용 (admin.ts)
- [ ] public token route는 invalid/expired/mismatched token 테스트 포함
- [x] `/q/[token]` rate limit은 durable store 기반 (remote migration/RPC verified 2026-06-27)
- [ ] Supabase CLI/link와 migration version bookkeeping 정리 완료
- [x] Launch smoke tooling exists for env, fixture seed, and authenticated preview checks
- [ ] production 배포 전 Vercel preview에서 authenticated workflow smoke QA 완료
