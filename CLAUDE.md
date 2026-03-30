# Coatly — Project Context

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

## Key Constraints

- Mobile-first PWA — 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1–3인 업체
- Serverless on Vercel → React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준
- 금액은 항상 cents 정수로 저장, `any` 타입 금지

## Critical Pattern

```ts
// Server Component (항상 이 패턴)
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase.from('quotes').select('*');
```

## Documentation Map

| 주제 | 파일 |
|------|------|
| 기술 아키텍처 | → [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| 에이전트 정의 | → [`AGENTS.md`](./AGENTS.md) |
| 디자인 철학 + 컴포넌트 규칙 | → [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 프론트엔드 패턴 | → [`docs/FRONTEND.md`](./docs/FRONTEND.md) |
| 로드맵 + Phase 추적 | → [`docs/PLANS.md`](./docs/PLANS.md) |
| 제품 감각 + 페르소나 | → [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) |
| 품질 기준 + 체크리스트 | → [`docs/QUALITY_SCORE.md`](./docs/QUALITY_SCORE.md) |
| 안정성 + 복구 전략 | → [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) |
| 보안 + RLS 정책 | → [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 기능별 설계 문서 | → [`docs/design-docs/`](./docs/design-docs/index.md) |
| 실행 계획 | → [`docs/exec-plans/`](./docs/exec-plans/) |
| 제품 스펙 (PRD) | → [`docs/product-specs/`](./docs/product-specs/index.md) |
| DB 스키마 스냅샷 | → [`docs/generated/db-schema.md`](./docs/generated/db-schema.md) |
| LLM 참조 자료 | → [`docs/references/`](./docs/references/) |

## Skills (작업 유형별 자동 트리거)

| 요청 유형 | Skill |
|-----------|-------|
| DB 타입/RLS/schema 관련 | `.claude/skills/db-schema/SKILL.md` |
| 테스트 작성/실행/수정 | `.claude/skills/test-writer/SKILL.md` |
| UI/컴포넌트 구현 | `.claude/skills/ui-spec/SKILL.md` |
| PRD/Notion 문서 업데이트 | `.claude/skills/doc-sync/SKILL.md` |

## Agents (slash command로 호출)

| Command | 설명 |
|---------|------|
| `/plan [기능]` | 작업 분해 + 라우팅 결정 |
| `/build [기능]` | UI + backend + DB 통합 구현 |
| `/quality [파일]` | 테스트 + 리뷰 + 타입 검증 |
| `/release [msg]` | git + vercel + 문서 동기화 |

### Codex Subagents

| Role | Agent | 용도 |
|------|-------|------|
| Frontend UI/UX | `frontend_uiux` | 화면, 모바일 UX, 폼 |
| Backend & Data | `backend_supabase` | Supabase, RLS, 서버 액션 |
| Tester & Reviewer | `app_tester_reviewer` | 테스트, 코드 리뷰 |
| Data Analyst | `data_analyst` | SQL, 메트릭, 분석 |
| Deployment | `vercel_deploy` | Vercel 배포, 도메인 |

핸드오프 템플릿: `.codex/AGENTS.md`

### 일반적인 작업 흐름

```
/plan 새 기능 추가
  → /build 기능 구현
  → /quality 검증
  → /release "feat: 기능명"
```

## Out of Scope (제안 금지)

GPS tracking · Team scheduling · Supplier integrations · Native app · Multi-language

## File Paths

- Skill 파일: `.claude/skills/`
- Slash command: `.claude/commands/`
- Codex subagent: `.codex/AGENTS.md`
