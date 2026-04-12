# Coatly — Project Context

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS + Storage) · Stripe · React-PDF · Resend · Vercel

## Key Constraints

- Mobile-first PWA — 터치 타겟 44px+, 핵심 액션 화면 하단 배치
- 사용자: 비기술적인 호주 페인터, 1–3인 업체
- Serverless on Vercel → React-PDF만 사용 (Puppeteer 금지)
- RLS 필수: 모든 쿼리 `auth.uid()` 기준
- 금액은 항상 cents 정수로 저장, `any` 타입 금지
- 로컬 Supabase CLI/Docker 기반 제어는 사용하지 않음
- Supabase 스키마 변경은 `.claude/skills/db-schema/SKILL.md` 기준으로 MCP 원격 도구만 사용
- schema 적용은 `apply_migration`, 확인은 `execute_sql`/`list_migrations`, 타입 갱신은 `generate_typescript_types`로 처리

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
| 안정성 + 복구 전략 | → [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) |
| 보안 + RLS 정책 | → [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 기능별 설계 문서 | → [`docs/design-docs/`](./docs/design-docs/index.md) |
| 실행 계획 | → [`docs/exec-plans/`](./docs/exec-plans/) |
| 제품 스펙 (PRD) | → [`docs/product-specs/`](./docs/product-specs/index.md) |
| DB 스키마 스냅샷 | → [`docs/generated/db-schema.md`](./docs/generated/db-schema.md) |
| LLM 참조 자료 | → [`docs/references/`](./docs/references/) |

## Skills (작업 유형별 자동 트리거)

### 개발 스킬

| 요청 유형 | Skill |
|-----------|-------|
| DB 타입/RLS/schema 관련 | `.claude/skills/db-schema/SKILL.md` |
| 테스트 작성/실행/수정 | `.claude/skills/test-writer/SKILL.md` |
| UI/컴포넌트 구현 | `.claude/skills/ui-spec/SKILL.md` |

### 계획 · 검토 · 릴리즈

| 요청 유형 | Command |
|-----------|---------|
| 새 기능 기획/분해 | `.claude/commands/plan.md` |
| 구현 (UI + backend + DB 통합) | `.claude/commands/build.md` |
| 코드 품질 검증 + 보안 체크 | `gstack-health` + `gstack-review` |
| QA 테스트 + 버그 수정 | `gstack-qa` |
| 리포트 전용 QA | `gstack-qa-only` |
| 브라우저 테스트 / 스크린샷 | `gstack-browse` |
| 라이브 디자인 리뷰 | `gstack-design-review` |
| 배포 후 모니터링 | `gstack-canary` |
| 배포 (commit → push → Vercel) | `gstack-ship` |
| CEO/전략 관점 리뷰 | `gstack-plan-ceo-review` |

### 마케팅 · 제품 감각

| 요청 유형 | 참조 문서 |
|-----------|-----------|
| 페르소나 / 페인포인트 분석 | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) |
| 사용자 플로우 / UX 개선 제안 | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 로드맵 우선순위 결정 | [`docs/PLANS.md`](./docs/PLANS.md) |

## Notion

| 항목 | ID |
|------|----|
| PRD 메인 | `3289ccac-a102-819f-a0e4-ce578509d683` |
| Phase 0 DB | `3c613f77fc57483799caddbbb94394e3` |

**Notion 업데이트 규칙** (배포 후 적용)

| 변경 유형 | 업데이트 위치 |
|-----------|--------------|
| 신규 기능 구현 | PRD Feature Priority Matrix 상태 변경 |
| DB schema 변경 | PRD Technical Architecture 섹션 |
| Phase 완료 | Phase 0 DB Task → ✅ Done |
| 범위 변경 | PRD Out of Scope 섹션 |

**금지**: PRD에 구현 상세 코드 삽입 / 미구현 항목 Done 표시 / 기존 내용 삭제 (append-only)

## Agents

### 일반적인 작업 흐름

```
/plan 새 기능 추가
  → /build 기능 구현
  → /gstack-health 검증
  → /gstack-ship "feat: 기능명"
```

## Out of Scope (제안 금지)

GPS tracking · Team scheduling · Supplier integrations · Native app · Multi-language

## File Paths

- Skill 파일: `.claude/skills/`
- Slash command: `.claude/commands/`
