# PaintMate — Project Context

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

## Key Constraints

- Mobile-first PWA — 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1–3인 업체
- Serverless on Vercel → React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준

## DB Schema (core tables)

```
profiles          → id (= auth.uid), business_name, abn, phone, logo_url, subscription_tier
customers         → id, user_id, name, email, phone, address
quotes            → id, user_id, customer_id, status, total, valid_until
quote_rooms       → id, quote_id, name, area_m2
quote_room_surfaces → id, room_id, surface_type, rate_tier (good/better/best), price
invoices          → id, user_id, quote_id, status, due_date, paid_at
invoice_line_items → id, invoice_id, description, qty, unit_price
subscriptions     → id, user_id, stripe_customer_id, stripe_sub_id, plan, status
```

모든 테이블: `created_at timestamptz default now()`, RLS enabled.

## Pricing

| Plan    | Price   | Limits               |
| ------- | ------- | -------------------- |
| Starter | A$29/mo | 10 active quotes/mo  |
| Pro     | A$49/mo | Unlimited + branding |

## File Structure

```
app/
  (auth)/          → login, signup, reset
  (dashboard)/     → protected routes
    quotes/
    customers/
    invoices/
    settings/
  api/
    webhooks/stripe/
components/
  ui/              → shadcn primitives only (수정 금지)
  quotes/
  invoices/
  pdf/
lib/
  supabase/        → client.ts, server.ts, middleware.ts
  stripe/          → client.ts, webhooks.ts
  pdf/             → templates
```

## Critical Patterns

```ts
// Server Component (항상 이 패턴)
const supabase = createServerClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase
  .from('quotes')
  .select('*')
  .eq('user_id', user.id);
```

## Skills (작업 유형별 자동 트리거)

| 요청 유형                | Skill                                 |
| ------------------------ | ------------------------------------- |
| DB 타입/RLS/schema 관련  | `.claude/skills/db-schema/SKILL.md`   |
| 테스트 작성/실행/수정    | `.claude/skills/test-writer/SKILL.md` |
| UI/컴포넌트 구현         | `.claude/skills/ui-spec/SKILL.md`     |
| PRD/Notion 문서 업데이트 | `.claude/skills/doc-sync/SKILL.md`    |

## Current Phase

Phase 0 — Foundation (Week 1–2)

- [ ] Project init + folder structure
- [ ] Supabase schema + RLS policies
- [ ] Auth flows (email/password)
- [ ] Stripe subscription setup
- [ ] Vercel deployment

## Out of Scope (제안 금지)

GPS tracking · Team scheduling · Supplier integrations · Native app · Multi-language

## Agents (slash command로 호출)

| Command           | Agent        | 설명                        |
| ----------------- | ------------ | --------------------------- |
| `/plan [기능]`    | orchestrator | 작업 분해 + 라우팅 결정     |
| `/build [기능]`   | builder      | UI + backend + DB 통합 구현 |
| `/quality [파일]` | quality      | 테스트 + 리뷰 + 타입 검증   |
| `/release [msg]`  | release      | git + vercel + 문서 동기화  |

### 일반적인 작업 흐름

```
/plan 새 기능 추가
  → /build 기능 구현
  → /quality 검증
  → /release "feat: 기능명"
```

Agent 파일 위치: `.claude/agents/`
Skill 파일 위치: `.claude/skills/`
