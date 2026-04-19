# Coatly — Project Context

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

## Key Constraints
- Mobile-first PWA — 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1–3인 업체
- Serverless on Vercel → React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준
- 금액 cents 정수 저장, `any` 타입 금지
- 로컬 Supabase CLI/Docker 미사용 — MCP 원격 도구만 (`apply_migration` → `execute_sql` → `generate_typescript_types`)

## Critical Pattern
```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase.from('quotes').select('*');
```

## Out of Scope (제안 금지)
GPS · Team scheduling · Supplier integrations · Native app · Multi-language

## Navigation
- 에이전트/스킬/커맨드/Notion 라우팅: [`AGENTS.md`](./AGENTS.md)
- 기술 아키텍처: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Skills: `.claude/skills/` | Commands: `.claude/commands/`
- 작업 흐름: `/plan` → `/build` → `/gstack-health` → `/gstack-ship`
