# Coatly — Codex Engineering Guide

> Owner: **Codex** (high) — 구현/DB/보안/배포/git 문서. 기획·디자인 결정은 Claude(Opus 4.8·extra) 영역.
> Codex가 담당하는 엔지니어링 실행 문서입니다. 메인 라우팅은 [`../AGENTS.md`](../AGENTS.md), 계획/progress는 [`../CLAUDE.md`](../CLAUDE.md)와 [`PLANS.md`](./PLANS.md)를 봅니다.

## Codex Ownership

| 영역 | 담당 |
|------|------|
| 기능 구현 | UI, Server Action, API route, Supabase 쿼리 |
| 오류/버그 해결 | 재현, 원인 분석, 수정, 회귀 테스트 |
| 기능 테스트 | Vitest 단위/통합/회귀 |
| DB 관리 | migration, RLS, RPC, 타입 생성 |
| 배포 | Vercel 배포, 빌드 오류 수정, 배포 로그 확인 |
| git 연동 | status 확인, commit, push, 충돌/브랜치 정리 |

Codex가 담당하지 않는 것:
- 제품/기능 우선순위 결정
- 디자인/UI/UX 스펙 작성
- 앱 전체 로드맵/progress 기획
- 디자인 리뷰/브라우저 QA 리포트 작성

## Skills

| Skill | 용도 |
|-------|------|
| `.codex/skills/db-schema.md` | Supabase schema, RLS, migration, 타입 생성 |
| `.codex/skills/test-writer.md` | Vitest/Testing Library 테스트 작성과 실행 |
| `.codex/skills/resend-document-email.md` | Resend 견적서/인보이스 이메일, PDF 첨부, 공개 링크 |

## Engineering Flow

1. 요청이 plan/design/progress면 Claude Code로 라우팅합니다.
2. 구현/버그/DB/배포/git 요청이면 Codex가 바로 처리합니다.
3. 변경 전 `git status --short`로 기존 사용자 변경을 확인합니다.
4. 변경 범위를 작게 잡고 관련 파일만 수정합니다.
5. DB 변경이 있으면 `db-schema` skill을 사용합니다.
6. 기능 테스트가 필요하면 `test-writer` skill을 사용합니다.
7. 검증 후 결과와 남은 리스크를 요약합니다.

## Implementation Order

1. DB schema/RLS/RPC 변경
2. Supabase TypeScript types 업데이트
3. Feature module domain (`modules/<feature>/domain/`)
4. Feature module application/server action (`modules/<feature>/application/`)
5. Infrastructure adapter (`modules/<feature>/infrastructure/`) 또는 API route
6. Feature UI (`modules/<feature>/ui/`) 또는 shared component (`components/`)
7. Page wiring (`app/(dashboard)/`)
8. Tests

## DDD-Lite Module Rules

- Dashboard 기능은 기본적으로 `modules/<feature>/` 아래에서 소유합니다.
- Use [`DDD-MODULES.md`](./DDD-MODULES.md) as the detailed module design and maintenance guide.
- `app/(dashboard)/`와 `app/q/`는 route/page 조립만 담당하고 업무 규칙을 두지 않습니다.
- `domain/`은 가능한 한 순수 함수와 타입을 두고 Supabase/Next 의존을 피합니다.
- Feature-owned form/input schemas should live in that feature's `domain/` layer. Shared validator files may keep compatibility re-exports during migration, but new feature code should import the feature-owned schema directly.
- `application/`은 server action과 workflow orchestration을 둡니다.
- `infrastructure/`는 API/repository/외부 adapter가 필요할 때만 둡니다.
- Large server action files should be split by moving Supabase row types, select strings, relation loaders, and persistence helpers into feature-owned `infrastructure/` repositories before changing public action signatures.
- Document generation and email side effects should live in feature-owned application services. Server actions should validate the request, call the service with authenticated context, then handle status updates and cache invalidation.
- `ui/`는 feature-owned 컴포넌트를 둡니다. 재사용 범위가 앱 전체이면 `components/shared`, `components/forms`, `components/layout`에 둡니다.
- shared integration은 `lib/supabase`, `lib/stripe`, `lib/email`, `lib/pdf`, `lib/ai`, `lib/google-calendar`에 유지합니다.
- New code should not introduce boundary lint warnings. Existing violations should be reduced incrementally, then cleaned areas can be promoted from `warn` to `error`.

### Dependency Direction

```text
app/page or api route
  -> modules/<feature>/ui or application
  -> modules/<feature>/application
  -> modules/<feature>/infrastructure
  -> modules/<feature>/domain
  -> shared types/config/utils
```

Forbidden directions:

- `domain` importing Next.js, Supabase clients, email, PDF, Stripe, or other side-effect integrations
- `lib` importing feature `application` or `ui`
- feature UI directly calling another feature's `application` action
- route/page files owning long DB queries and business rules

## Verification

일반 변경:

```bash
npm run lint
npm run test:run
npm run build
```

DB 변경:

```bash
npm run db:types
```

필요 시 변경 파일 중심으로 더 좁은 테스트를 먼저 돌린 뒤 전체 검증으로 마무리합니다.

## Security & Release Gate

대규모 리팩터링, DB 변경, public token route, billing/webhook, cron, AI 기능을 배포하기 전에는 아래 순서로 확인합니다.

1. `git status --short`로 의도한 변경 범위와 사용자 변경을 분리합니다.
2. Supabase migration history와 로컬 migration 파일이 일치하는지 확인합니다.
3. public schema table RLS, security definer function execute 권한, public view 권한을 점검합니다.
4. `.env.example`, `.env.local`, Vercel preview/prod env var 이름이 맞는지 비교합니다.
5. public route(`/q/[token]`, public invoice PDF)는 invalid/expired/mismatched token regression을 포함합니다.
6. `/q/[token]` rate limit은 Vercel serverless에서 공유되는 durable store 기반이어야 합니다.
7. `npm run lint`, `npm run test:run`, `npm run build`를 통과시킵니다.
8. Vercel preview deployment에서 auth, customer, quote, PDF, invoice, schedule, public quote smoke를 확인합니다.

## Coding Checklist

- [ ] Server Component/API/Action에서 사용자 인증 확인
- [ ] Supabase 접근은 RLS와 `user_id` ownership을 고려
- [ ] `any` 타입 사용 금지
- [ ] 금액은 cents 정수로 저장
- [ ] 표시 금액은 `formatAUD()` 사용
- [ ] 숫자 입력은 `inputMode="numeric"` 고려
- [ ] Server Action 변경 후 필요한 `revalidatePath()` 호출
- [ ] loading/error/empty 상태 처리
- [ ] 모바일 터치 타겟 44px 이상
- [ ] CTA 텍스트는 `+ New {Entity}` 패턴

## Database Rules

- 로컬 Docker/Supabase CLI에 의존하지 않고 원격 Supabase 흐름을 우선합니다.
- migration은 되돌리기보다 새 migration으로 보정합니다.
- 모든 새 테이블은 RLS를 켜고 `auth.uid()` 기반 정책을 추가합니다.
- RPC/security definer는 최소 권한으로 제한하고 anon execute를 차단합니다.
- migration 적용 후 타입과 문서 스냅샷을 갱신합니다.

## Deployment / Git

git 실행은 [`.codex/skills/commit.md`](../.codex/skills/commit.md)를 따릅니다: 민감 파일(`.env*`, key/secret) 커밋 금지, `main` push 전 확인.

1. `git status --short`로 사용자 변경과 Codex 변경을 분리합니다.
2. lint/test/build 또는 요청된 검증을 실행합니다.
3. DB/security 영향이 있으면 [`SECURITY.md`](./SECURITY.md)의 Active Security Findings & Fix Plan을 갱신합니다.
4. 의도적인 commit message를 작성합니다.
5. `git push` 또는 Vercel 배포 명령을 실행합니다.
6. 배포 URL, 검증 결과, 실패 시 원인을 보고합니다.

주의:
- 사용자 변경을 되돌리지 않습니다.
- destructive git command는 명시 요청 없이는 사용하지 않습니다.
- 배포 실패는 로그를 보고 수정한 뒤 재검증합니다.

## AI 재활성 (deferred)

AI(Qwen) provider 코드는 존재하지만 env-gated dormant 상태입니다. 재활성 env는 `QWEN_API_KEY`, `QWEN_MODEL`(기본 `qwen3-vl-flash`, `lib/ai/providers/qwen.ts`)입니다. core quote workflow release 전에는 이 env를 켜거나 AI surface를 활성화하지 않습니다.

## Out of Scope

GPS tracking, team scheduling, supplier integrations, native app, multi-language는 제안하지 않습니다.
