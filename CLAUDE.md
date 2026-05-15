# Coatly — Claude Planning Context

> Claude Code는 **플랜, 디자인, 앱 구성 기획, progress 기획**을 담당합니다.
> 기능 구현/버그/DB/배포/git은 Codex 엔지니어링 문서 → [`docs/ENGINEERING.md`](./docs/ENGINEERING.md).
> 라우팅 표 → [`AGENTS.md`](./AGENTS.md).

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

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

## Design Conventions (필수)
- **색상 토큰**: Material Design 3 토큰만 사용 (`text-on-surface`, `bg-primary`, `border-outline`, `bg-error-container` 등). 레거시 `pm-*` alias는 deprecated — ESLint warn.
- **페이지 헤더**: `<PageHeader title=… subtitle=… action={<PrimaryActionLink>} />` ([`components/layout/PageHeader.tsx`](./components/layout/PageHeader.tsx))
- **CTA 버튼**: shadcn `<Button>` 대신 `<PrimaryActionLink>` / `<SecondaryActionLink>` (모바일 `min-h-11` 필수)
- **CTA 텍스트**: "+ New {Entity}" 패턴 (Add 금지)
- **에러 박스**: `<ErrorAlert>` ([`components/shared/ErrorAlert.tsx`](./components/shared/ErrorAlert.tsx))
- **뒤로가기**: `<BackButton href=… label=… />` (`hover:` + `active:` 둘 다 정의)
- **컨테이너 너비**: list/dashboard 페이지는 layout의 `max-w-7xl` 의존, 단순 form은 `max-w-lg md:max-w-2xl`, 설정 페이지는 `max-w-4xl`, 복합 form(line items 포함)은 `max-w-lg lg:max-w-6xl`
- **페이지 spacing**: `flex flex-col gap-4 sm:gap-6` (top-level wrapper)

상세: [`docs/DESIGN_CONSISTENCY_AUDIT.md`](./docs/DESIGN_CONSISTENCY_AUDIT.md), [`docs/features/design-system/design-system.md`](./docs/features/design-system/design-system.md)

## Out of Scope (제안 금지)
GPS · Team scheduling · Supplier integrations · Native app · Multi-language

## Claude Code Ownership

Claude Code가 담당:
- 제품/기능 플랜과 우선순위
- 디자인/UI/UX 스펙
- 앱 구성/정보 구조/흐름 기획
- `docs/PLANS.md` progress 정리
- 디자인 리뷰, 앱 전체 분석, 브라우저 QA 리포트

Claude Code가 직접 담당하지 않음:
- 기능 구현
- 오류/버그 수정
- DB schema/migration/RLS
- 배포/Vercel/git commit/push

## Tool Routing (요약)

| 영역 | 담당 |
|------|------|
| 플랜 / 디자인 / 앱 구성 / progress 기획 / 앱 분석 / QA 리포트 | **Claude Code** (`.claude/skills/`, `.claude/commands/`) |
| 기능 구현 / 버그 해결 / DB / 배포 / git / 기능 테스트 | **Codex** (`.codex/skills/`, `docs/ENGINEERING.md`) |

상세: [`AGENTS.md`](./AGENTS.md)

## Navigation
- 기술 아키텍처: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Claude Code skills: [`.claude/skills/`](./.claude/skills/) | commands: [`.claude/commands/`](./.claude/commands/)
- Codex skills: [`.codex/skills/`](./.codex/skills/) | engineering guide: [`docs/ENGINEERING.md`](./docs/ENGINEERING.md)
- 작업 흐름: `/plan` (Claude) → Codex 구현/검증/배포/git → Claude QA/design-review 필요 시 재검토
- 가장 최근 audit / tech debt: [`docs/features/audit/audit.md`](./docs/features/audit/audit.md)
