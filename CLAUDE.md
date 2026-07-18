# Coatly — Claude Planning Context

> Owner: **Claude** (Opus 4.8 · extra) — 플랜, 디자인, 앱 구성 기획, progress 기획, 분석/QA 리포트 담당.
> 기능 구현/버그/DB/보안/배포/git은 **Codex (high)** → [`docs/ENGINEERING.md`](./docs/ENGINEERING.md). 두 도메인은 상호 침범 금지.
> 라우팅 표 → [`AGENTS.md`](./AGENTS.md).

## v1 Wedge (2026-06-03 REFRAMED)

**Excel quote workflow replacement for Australian painters/tradies.** 실제 painter A의 현재 업무는 Excel 가격표 → PDF 변환 → 직접 이메일 발송 → 사람이 follow-up 체크다. v1의 구매 이유는 AI가 아니라, 기존 가격표를 참고해 Coatly 앱 안에서 단순 price book을 세팅하고 이 반복 workflow를 끝까지 대체하는 것이다.

v1 core: 기존 Excel 가격표 참고 → 앱 내 price item 직접 추가 또는 선택적 단순 Excel/CSV 붙여넣기 → saved Coatly price book → quote 작성 → PDF → email send → follow-up reminder/status → accepted quote → invoice/schedule. AI, 사진 분석, damage 판별, AI 가격 산출은 core workflow가 실제 Excel/PDF/email 업무를 완전히 재현하고 릴리즈된 뒤에만 검토한다.

자세한 건 [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md). 파일명은 기존 링크 호환을 위해 유지하지만, 현재 내용은 workflow-first plan이다.

포지셔닝 한 줄: **"Your Excel price list, now an app"** — anti-AI(painter 단가 존중), anti-job-management. 가격 방향은 단일 A$39/월 flat + 30일 무카드 trial. 상품화 전략/경쟁/비용/GTM 정본: [`docs/COMMERCIALIZATION.md`](./docs/COMMERCIALIZATION.md) (2026-07-12 분석).

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel. AI provider는 post-core workflow 단계에서만 활성화.

## Key Constraints
- Mobile-first PWA — 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1–3인 업체
- Serverless on Vercel → React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준
- 금액 cents 정수 저장, `any` 타입 금지
- 로컬 Supabase CLI/Docker 미사용 — MCP 원격 도구만 (`apply_migration` → `execute_sql` → `generate_typescript_types`)
- Excel import boundary: v1은 arbitrary Excel 자동 해석이나 복잡한 템플릿 필수 onboarding을 약속하지 않는다. 가격표 세팅은 앱 내 직접 추가가 기본이고, Excel/CSV 템플릿은 `Service / Item`, `Unit`, `Price`, 선택 `Category`, 선택 `Customer Description`만 받는 보조 bulk input으로 본다.
- AI/photo work sequencing: core quote workflow release 전에는 Qwen/Gemini, photo analysis, damage classification, AI-generated pricing, AI-first onboarding을 새 우선순위로 올리지 않음
- v1 validation source: A의 실제 Excel 가격표와 최근 quote PDF/email 1개를 Coatly에서 end-to-end 재현하는 테스트

## Critical Pattern
```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase.from('quotes').select('*');
```

## Design Conventions (필수)
- **색상 토큰**: Material Design 3 토큰만 사용 (`text-on-surface`, `bg-primary`, `border-outline`, `bg-error-container` 등). 레거시 `pm-*` alias는 제거 완료(프로덕션 0건) — 재도입 금지. `bg-white` 직접 사용 금지(`bg-surface-container-lowest` 등 토큰 사용).
- **페이지 헤더**: `<PageHeader title=… subtitle=… action={<PrimaryActionLink>} />` ([`components/layout/PageHeader.tsx`](./components/layout/PageHeader.tsx))
- **CTA 버튼**: shadcn `<Button>` 대신 `<PrimaryActionLink>` / `<SecondaryActionLink>` (모바일 `min-h-11` 필수)
- **CTA 텍스트**: "+ New {Entity}" 패턴 (Add 금지)
- **에러 박스**: `<ErrorAlert>` ([`components/shared/ErrorAlert.tsx`](./components/shared/ErrorAlert.tsx))
- **뒤로가기**: `<BackButton href=… label=… />` (`hover:` + `active:` 둘 다 정의)
- **컨테이너 너비**: list/dashboard 페이지는 layout의 `max-w-7xl` 의존, 단순 form은 `max-w-lg md:max-w-2xl`, 설정 페이지는 `max-w-4xl`, 복합 form(line items 포함)은 `max-w-lg lg:max-w-6xl`
- **페이지 spacing**: `flex flex-col gap-4 sm:gap-6` (top-level wrapper)

상세(디자인 단일 정본): [`docs/DESIGN.md`](./docs/DESIGN.md)

## Out of Scope (제안 금지)
Core workflow release 전: arbitrary Excel auto-import, 복잡한 Excel template onboarding, AI quote automation, photo damage analysis, AI pricing, generic AI assistant, GPS, team scheduling, supplier integrations, native app, multi-language.

Core workflow release 후 별도 검증 필요: AI quote explanation helper, Follow-up Writer, photo scope hints, learning-based pricing.

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

| 영역 | 담당 | 모델 |
|------|------|------|
| 플랜 / 디자인(스펙) / 앱 구성 / progress 기획 / 앱 분석 / QA 리포트 / PM | **Claude Code** (`.claude/commands/`) | **Opus 4.8 · extra** |
| 기능 구현 / 코드 리뷰 / 버그 해결 / DB / 보안 / 배포 / git / 기능 테스트 | **Codex** (`.codex/skills/`, `docs/ENGINEERING.md`) | **high** |

**상호 침범 금지**: Claude 소유 문서/기능에서 구현·DB·git을 실행하지 않고, Codex 소유 문서/기능에서 기획·디자인 결정을 내리지 않는다. 각 md 파일 상단 `Owner:` 헤더가 소유 도메인의 단일 기준이다.

## Documentation Rules
- 모든 md 파일은 **300줄 이하** — 중복/완료된 과거 플랜 서술 제거로 달성 (디테일은 유지)
- 모든 md 파일 상단에 `> Owner: Claude (Opus 4.8 · extra) | Codex (high) | Shared` 헤더 필수
- 집행 완료된 플랜 문서는 삭제 (git 히스토리가 보존) — 살아있는 규칙/계약만 정본 문서로 이관
- 코드 경로 인용은 현행 구조 기준: feature 컴포넌트/액션은 `modules/<feature>/{ui,application,domain,infrastructure}`

상세: [`AGENTS.md`](./AGENTS.md)

## Navigation
- 기술 아키텍처: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- v1 build plan: [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md)
- Simple price book setup: [`docs/features/quote/PRICE-BOOK-TEMPLATE.md`](./docs/features/quote/PRICE-BOOK-TEMPLATE.md)
- Phase progress: [`docs/PLANS.md`](./docs/PLANS.md)
- Deferred items: [`TODOS.md`](./TODOS.md)
- 디자인 정본: [`docs/DESIGN.md`](./docs/DESIGN.md)
- Claude Code commands: [`.claude/commands/`](./.claude/commands/) — `plan`, `ui-spec` (git용 `commit`은 Codex로 이관: [`.codex/skills/commit.md`](./.codex/skills/commit.md))
- Codex skills: [`.codex/skills/`](./.codex/skills/) (lowercase = skill name) | engineering guide: [`docs/ENGINEERING.md`](./docs/ENGINEERING.md)
- 작업 흐름: `/plan` (Claude) → Codex 구현/검증/배포/git → Claude QA/design-review 필요 시 재검토
- 가장 최근 audit / tech debt: [`docs/features/audit/AUDIT.md`](./docs/features/audit/AUDIT.md) (2026-07-12 상품화/UX 분석 반영: A1–A20)
- 런칭 준비 상태: [`docs/LAUNCH-READINESS.md`](./docs/LAUNCH-READINESS.md)
- 상품화 전략 정본: [`docs/COMMERCIALIZATION.md`](./docs/COMMERCIALIZATION.md)
