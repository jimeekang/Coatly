# Coatly — Codex Agent Context

> Codex가 이 프로젝트에서 담당하는 영역과 작업 패턴.
> 공용 프로젝트 컨텍스트(스택·제약·디자인 컨벤션) → [`../CLAUDE.md`](../CLAUDE.md)
> 두 도구 라우팅 표 → [`../AGENTS.md`](../AGENTS.md)
> 기술 아키텍처 → [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

---

## Codex의 책임 영역

| 영역 | 담당 여부 |
|------|-----------|
| 신규 기능 구현 (UI + server action + DB) | ✅ 메인 |
| 기능 테스트 작성 (Vitest 단위/통합/회귀) | ✅ 메인 |
| DB 스키마 변경 / RLS / 마이그레이션 / 타입 생성 | ✅ 메인 |
| 디자인/UI/UX 스펙 작성 | ❌ → Claude Code |
| 앱 전체 분석 / CEO 리뷰 / 우선순위 / 로드맵 | ❌ → Claude Code |
| 브라우저 QA / 시각 회귀 / 디자인 리뷰 | ❌ → Claude Code |

---

## Codex Skills (이 디렉토리 안)

| Skill | 용도 | 진입점 |
|-------|------|--------|
| db-schema | Supabase schema → TS types + RLS + Zod | [`./skills/db-schema/SKILL.md`](./skills/db-schema/SKILL.md) |
| test-writer | 컴포넌트/함수/API route Vitest 테스트 자동 작성 + 실행 | [`./skills/test-writer/SKILL.md`](./skills/test-writer/SKILL.md) |

---

## 기능 구현 작업 순서

1. (사전) Claude Code의 `/plan` 결과를 받았는지 확인 — 받지 않았다면 사용자에게 plan 먼저 요청
2. 변경/생성할 파일 목록 출력
3. 아래 레이어 순서로 구현:
   1. DB schema 변경 (필요 시) — `db-schema` skill 호출
   2. TypeScript types 업데이트
   3. Server Action (`app/actions/`)
   4. React 컴포넌트 (`components/`) — Claude Code가 만든 UI 스펙을 따름
   5. Page (`app/(dashboard)/`)
4. `npx tsc --noEmit` 실행
5. `npx eslint` 변경된 파일들에 실행
6. 오류 있으면 수정 후 4번부터 반복 (최대 3회)
7. 기능 테스트 작성 — `test-writer` skill 호출

### 구현 체크리스트

- [ ] Server Component에서 `auth.getUser()` 확인
- [ ] 모든 Supabase query에 RLS 검증 (서버에서 user 체크는 `getUser` 한 번이면 충분)
- [ ] 모든 숫자 입력에 `inputMode="numeric"`
- [ ] 모든 CTA 버튼 `min-h-11` (44px+, 모바일 우선)
- [ ] loading/error 상태 처리
- [ ] 금액 표시는 `formatAUD()` 사용
- [ ] Server Action에서 `revalidatePath()` 호출
- [ ] CTA 텍스트는 `+ New {Entity}` 패턴

### 금지 사항

- `onClick` 안에서 직접 Supabase 호출 — Server Action 사용
- `any` 타입
- `components/ui/` 파일 직접 수정 — shadcn 소유
- Puppeteer (PDF는 React-PDF만)
- `tsc` 에러 무시
- 인라인 스타일 (`style={{}}`)

---

## Critical Coding Rules (CLAUDE.md 발췌)

### Money
- 정수 cents (e.g. `2500` = $25.00)
- float 금지

### TypeScript
- `any` 금지
- Supabase schema에서 `generate_typescript_types`로 자동 생성

### Database / Supabase
- RLS 필수: 모든 쿼리 `auth.uid()` 기준
- 로컬 CLI/Docker 미사용 — MCP 도구만
- Schema 변경: `apply_migration` → `execute_sql`/`list_migrations`로 검증 → `generate_typescript_types`

### Server Component (필수 패턴)

```ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
const { data } = await supabase.from('quotes').select('*');
```

### Mobile-first
- 터치 타겟 44px+
- 핵심 액션 화면 하단

---

## Out of Scope (제안 금지)

GPS · Team scheduling · Supplier integrations · Native app · Multi-language

---

## Key Reference Docs

| 주제 | 파일 |
|------|------|
| Design system + 컴포넌트 | `../docs/DESIGN.md` |
| Frontend 패턴 | `../docs/FRONTEND.md` |
| 로드맵 | `../docs/PLANS.md` |
| Security / RLS | `../docs/SECURITY.md` |
| DB schema 스냅샷 | `../docs/generated/db-schema.md` |
| Feature 스펙 | `../docs/features/index.md` |
| Audit / Tech Debt | `../docs/features/audit/audit.md` |
