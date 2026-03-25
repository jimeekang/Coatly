# Coatly - Project Context

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

## Key Constraints

- Mobile-first PWA - 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1-3인 업체
- Serverless on Vercel -> React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준

## DB Schema (core tables)

```text
profiles             -> id (= auth.uid), business_name, abn, phone, logo_url, subscription_tier, onboarding_completed
customers            -> id, user_id, name, email, phone, address
quotes               -> id, user_id, customer_id, status, total, valid_until
quote_rooms          -> id, quote_id, name, area_m2
quote_room_surfaces  -> id, room_id, surface_type, rate_tier (good/better/best), price
invoices             -> id, user_id, quote_id, status, due_date, paid_at
invoice_line_items   -> id, invoice_id, description, qty, unit_price
subscriptions        -> id, user_id, stripe_customer_id, stripe_sub_id, plan, status
```

모든 테이블: `created_at timestamptz default now()`, RLS enabled.

## Pricing

| Plan | Price | Limits |
| --- | --- | --- |
| Starter | A$29/mo | 10 active quotes/mo |
| Pro | A$49/mo | Unlimited + branding |

## File Structure

```text
app/
  (auth)/          -> login, signup, reset
  (dashboard)/     -> protected routes
    quotes/
    customers/
    invoices/
    settings/
  api/
    webhooks/stripe/
components/
  ui/              -> shadcn primitives only (수정 금지)
  quotes/
  invoices/
  pdf/
lib/
  supabase/        -> client.ts, server.ts, middleware.ts
  stripe/          -> client.ts, webhooks.ts
  pdf/             -> templates
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

## Skills

| 요청 유형 | Skill |
| --- | --- |
| DB 타입/RLS/schema 관련 | `.agents/skills/db-schema/SKILL.md` |
| 테스트 작성/실행/수정 | `.agents/skills/test-writer/SKILL.md` |
| UI/컴포넌트 구현 | `.agents/skills/ui-spec/SKILL.md` |
| PRD/Notion 문서 업데이트 | `.agents/skills/doc-sync/SKILL.md` |

참고: `.claude/skills/`에도 동일 계열 스킬이 있으나, 현재 프로젝트 기준 로컬 에이전트 스킬 경로는 `.agents/skills/`를 우선 사용.

## Current Phase

Phase 0 - Foundation (Week 1-2)

- [ ] Project init + folder structure
- [ ] Supabase schema + RLS policies
- [ ] Auth flows (email/password)
- [ ] Stripe subscription setup
- [ ] Vercel deployment

## Out Of Scope

GPS tracking · Team scheduling · Supplier integrations · Native app · Multi-language

## Agents

| Role | Codex agent | Use for |
| --- | --- | --- |
| Frontend UI/UX | `frontend_uiux` | Next.js App Router screens, mobile UX, form flows, visual polish |
| Backend & Data API | `backend_supabase` | Supabase queries, RLS-safe data access, server actions, API routes, onboarding/profile schema migrations |
| App Tester & Reviewer | `app_tester_reviewer` | Bug reproduction, code review, tests, regression checks |
| Data Analyst | `data_analyst` | SQL, metrics, reporting logic, business and product analysis |
| Vercel Deployment | `vercel_deploy` | Vercel login 확인, preview/production 배포, alias/domain 조정, 배포 검증 |

Subagent definitions live under `.codex/agents/`.
Shared handoff templates live in `.codex/AGENTS.md`.

## Default Workflow

```text
feature intake
  -> clarify scope with `data_analyst` when requirements or metrics are vague
  -> implement UI in `frontend_uiux` and data flow in `backend_supabase` with bounded scope
  -> verify with `app_tester_reviewer`
  -> release after checks pass
```

## Agent And Skill Paths

- Codex subagents: `.codex/agents/`
- Codex subagent templates: `.codex/AGENTS.md`
- Project skills: `.agents/skills/`
- Legacy Claude skills: `.claude/skills/`
