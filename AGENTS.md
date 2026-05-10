# Coatly — Agent Definitions

> 프로젝트 컨텍스트(스택, 제약, 스키마) → [`CLAUDE.md`](./CLAUDE.md)
> Codex 전용 컨텍스트 → [`.codex/AGENTS.md`](./.codex/AGENTS.md)

---

## Tool Division of Labor

> 두 도구는 자기 영역 안에서만 작업한다. 영역 밖 요청은 라우팅 표대로 다른 도구로 넘긴다.

| Tool | 담당 영역 | 사용처 |
|------|---------|--------|
| **Claude Code** (`.claude/`) | 디자인 · UI / UX · 계획 · 앱 전체 분석 · 테스트 (탐색·QA·회귀) | `.claude/skills/ui-spec`, `.claude/commands/plan.md`, gstack-design-review, gstack-qa, gstack-plan-* |
| **Codex** (`.codex/`) | 기능 구현 · 기능 테스트 (Vitest 단위/통합), DB 스키마 마이그레이션 | `.codex/skills/db-schema`, `.codex/skills/test-writer`, `.codex/AGENTS.md` |

### Routing — 어떤 요청이 누구한테?

| 요청 유형 | 1차 도구 | 진입점 |
|----------|----------|--------|
| 디자인/UI/UX 스펙 작성, 컴포넌트 디자인 | **Claude Code** | `.claude/skills/ui-spec/SKILL.md` |
| 화면/플로우 디자인 리뷰, 일관성 감사 | **Claude Code** | gstack-design-review · gstack-plan-design-review |
| 기능 분해 / 우선순위 / 로드맵 | **Claude Code** | `/plan` → `.claude/commands/plan.md` |
| 앱 전체 분석 / 리스크 / 보안 / CEO 리뷰 | **Claude Code** | gstack-plan-ceo-review · gstack-cso · gstack-review |
| QA 테스트 / 브라우저 회귀 / 버그 리포트 | **Claude Code** | gstack-qa · gstack-qa-only · gstack-browse |
| 라이브 디자인 폴리시 + 시각 회귀 | **Claude Code** | gstack-design-review |
| **기능 구현** (UI + backend + Supabase) | **Codex** | `.codex/AGENTS.md` 참조 후 작업 |
| **기능 테스트** (Vitest 단위/통합/회귀 작성) | **Codex** | `.codex/skills/test-writer/SKILL.md` |
| **DB 스키마 변경** (migration / RLS / 타입 생성) | **Codex** | `.codex/skills/db-schema/SKILL.md` |
| 코드 품질 + 보안 검사 | Claude Code | gstack-health · gstack-cso |
| 배포 후 모니터링 | Claude Code | gstack-canary |
| 배포 (commit → push → Vercel) | Claude Code | gstack-ship |
| git commit + push | Claude Code | `/commit` → `.claude/commands/commit.md` |

> 경계가 모호한 경우: **신규 기능 구현은 Codex**, **기존 기능 분석/리뷰/리팩터링 계획은 Claude Code**. Claude Code가 plan을 세우고 → Codex가 implement → Claude Code가 QA/리뷰.

---

## Default Flow

```
1. 요청 도착
2. Claude Code /plan
   → CLAUDE.md Out of Scope + docs/PLANS.md 확인
   → subtask 분해 + 우선순위
3. (디자인/UI 변경 포함 시) Claude Code ui-spec
   → 스펙 작성 / 컴포넌트 디자인 결정
4. Codex implement
   → 기능 구현 (UI + server action + DB)
   → DB 변경 시 db-schema skill
   → 기능 테스트 시 test-writer skill
5. Claude Code QA + design-review
   → gstack-qa / gstack-design-review로 회귀 확인
6. Claude Code /commit + ship
```

---

## Subagent Roles (Codex)

> Codex 측 서브에이전트. Codex 안에서 호출.

| Role | Agent | 담당 | 제한 |
|------|-------|------|------|
| Frontend UI/UX | `frontend_uiux` | 화면, 모바일 UX, 폼, 인터랙션 | Supabase 스키마/API 재설계 금지 |
| Backend & Data | `backend_supabase` | Supabase 쿼리, RLS, 서버 액션, API, 마이그레이션 | 프론트엔드 대규모 재설계 금지 |
| Tester & Reviewer | `app_tester_reviewer` | 코드 리뷰, 테스트, 회귀 검사 | 대규모 기능 구현 금지 |
| Data Analyst | `data_analyst` | SQL, 메트릭, 리포팅, 비즈니스 분석 | 프로덕션 코드 배포 금지 |
| Deployment | `vercel_deploy` | Vercel 배포, 도메인, 배포 디버깅 | 앱 기능 작업 금지 |

---

## Documentation Map

| 주제 | 파일 |
|------|------|
| 기술 아키텍처 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| 디자인 철학 + 컴포넌트 | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 디자인 일관성 감사 + 가드레일 | [`docs/DESIGN_CONSISTENCY_AUDIT.md`](./docs/DESIGN_CONSISTENCY_AUDIT.md) |
| 프론트엔드 패턴 | [`docs/FRONTEND.md`](./docs/FRONTEND.md) |
| 로드맵 + Phase 추적 | [`docs/PLANS.md`](./docs/PLANS.md) |
| 제품 감각 + 페르소나 | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) |
| 안정성 + 복구 전략 | [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) |
| 보안 + RLS 정책 | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 기능별 설계 + 스펙 문서 | [`docs/features/`](./docs/features/index.md) |
| Audit + Tech Debt 트래커 | [`docs/features/audit/audit.md`](./docs/features/audit/audit.md) |
| DB 스키마 스냅샷 | [`docs/generated/db-schema.md`](./docs/generated/db-schema.md) |

---

## Notion 동기화 규칙

| 항목 | ID |
|------|----|
| PRD 메인 | `3289ccac-a102-819f-a0e4-ce578509d683` |
| Phase 0 DB | `3c613f77fc57483799caddbbb94394e3` |

업데이트 규칙 (배포 후, append-only):

| 변경 유형 | 위치 |
|---------|------|
| 신규 기능 구현 | PRD Feature Priority Matrix 상태 변경 |
| DB schema 변경 | PRD Technical Architecture 섹션 |
| Phase 완료 | Phase 0 DB Task → ✅ Done |
| 범위 변경 | PRD Out of Scope 섹션 |

**금지**: 구현 상세 코드 삽입 / 미구현 항목 Done 표시 / 기존 내용 삭제
