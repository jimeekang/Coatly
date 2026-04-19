# Coatly — Codex Agent Context

> Full project context: [`CLAUDE.md`](../CLAUDE.md)
> Agent definitions & slash commands: [`AGENTS.md`](../AGENTS.md)
> Architecture: [`ARCHITECTURE.md`](../ARCHITECTURE.md)

## Project Overview

Coatly is a mobile-first PWA for Australian painters (1–3 person businesses).
Core features: quotes, invoices, jobs, PDF generation, Stripe subscriptions.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict — `any` type is forbidden)
- **Styling**: Tailwind CSS
- **Database**: Supabase (Postgres + Auth + RLS + Storage)
- **Payments**: Stripe
- **PDF**: React-PDF (Puppeteer is forbidden — serverless on Vercel)
- **Email**: Resend
- **Deployment**: Vercel

## Directory Structure

```
app/                   # Next.js App Router pages
  (auth)/              # Login, signup flows
  (dashboard)/         # Main app screens
  (onboarding)/        # New user setup
  actions/             # Server Actions
  api/                 # API routes
components/            # Shared UI components
lib/                   # Business logic, Supabase queries
  supabase/            # Supabase client helpers
  stripe/              # Stripe helpers
  pdf/                 # PDF generation
types/                 # TypeScript types (generated from DB)
utils/                 # Utility functions
docs/                  # Design, plans, product specs
  DESIGN.md            # Design philosophy + component rules
  FRONTEND.md          # Frontend patterns
  PLANS.md             # Roadmap + Phase tracking
  SECURITY.md          # RLS policies
  generated/db-schema.md  # DB schema snapshot
.claude/skills/        # Skill definitions
  db-schema/SKILL.md   # DB type/RLS/schema changes
  ui-spec/SKILL.md     # UI component implementation
  test-writer/SKILL.md # Test writing
.claude/commands/      # Slash command definitions
  plan.md
  build.md
```

## Critical Coding Rules

### Money
- Always store amounts as **integer cents** (e.g. `2500` = $25.00)
- Never use floats for money

### TypeScript
- `any` type is **forbidden** — use proper types or `unknown`
- Types are generated from Supabase schema via `generate_typescript_types`

### Database / Supabase
- **RLS is mandatory**: every query must be scoped to `auth.uid()`
- No local Supabase CLI/Docker — use MCP remote tools only
- Schema changes: `apply_migration` → verify with `execute_sql` / `list_migrations` → `generate_typescript_types`

### Server Components (always use this pattern)
```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase.from('quotes').select('*');
```

### Mobile-first UI
- Touch targets: 44px minimum
- Primary actions: bottom of screen
- No GPS tracking, team scheduling, supplier integrations, native app, or multi-language features

## Key Reference Docs

| Topic | File |
|-------|------|
| Design system + components | `docs/DESIGN.md` |
| Frontend patterns | `docs/FRONTEND.md` |
| Roadmap | `docs/PLANS.md` |
| Security / RLS | `docs/SECURITY.md` |
| DB schema snapshot | `docs/generated/db-schema.md` |
| Product specs | `docs/product-specs/` |
| Design docs | `docs/design-docs/` |

## Out of Scope — Do Not Suggest

GPS tracking · Team scheduling · Supplier integrations · Native app · Multi-language
