# Coatly — Agent Routing

> Owner: **Shared** — 라우팅 단일 소스. 이 파일만 메인 `AGENTS.md`로 유지합니다.
> Claude 계획 컨텍스트 → [`CLAUDE.md`](./CLAUDE.md)
> Codex 엔지니어링 세부 문서 → [`docs/ENGINEERING.md`](./docs/ENGINEERING.md)

## Division Of Labor

| Tool | 모델 | 담당 영역 | 주요 문서/진입점 |
|------|------|-----------|------------------|
| Claude Code | **Opus 4.8 · extra** | 플랜, 디자인/UI/UX 스펙, 앱 구성 기획, progress 기획, PM, 앱 전체 분석, QA 리포트, 아이디어/기획 | `CLAUDE.md`, `.claude/commands/plan.md`, `.claude/commands/ui-spec.md` |
| Codex | **high** (reasoning effort) | 기능 구현, 코드 리뷰, 오류/버그 해결, 기능 테스트, DB/보안 관리, 배포, git | `docs/ENGINEERING.md`, `.codex/skills/db-schema.md`, `.codex/skills/test-writer.md`, `.codex/skills/resend-document-email.md`, `.codex/skills/commit.md` |

### Model Boundary Rules (침범 금지)

1. 각 md 파일 상단 `> Owner:` 헤더가 소유 도메인의 단일 기준. **Claude 소유 파일은 Claude(Opus 4.8·extra)만, Codex 소유 파일은 Codex(high)만 수정한다.** Shared는 라우팅/소개 파일.
2. Claude는 코드 구현·DB·보안 설정·배포·git 실행을 하지 않는다. Codex는 기획·디자인 결정·우선순위 변경을 하지 않는다.
3. 상대 도메인 변경이 필요하면 직접 수정하지 않고 브리프/finding으로 넘긴다 (Claude `/plan` → Codex 실행, Codex 발견 → `AUDIT.md` 경유 Claude 기획).
4. 모든 md는 300줄 이하 — 완료된 플랜 서술은 삭제(git 보존), 살아있는 규칙만 정본으로 이관.

## Routing

| 요청 유형 | 1차 도구 (모델) | 기준 |
|----------|----------|------|
| 디자인/UI/UX 스펙 | Claude Code (Opus 4.8·extra) | 화면 구조, 컴포넌트 방향, interaction 결정 — 구현 아님 |
| 앱 구성/정보 구조 | Claude Code (Opus 4.8·extra) | navigation, IA, page composition |
| 기능 분해/우선순위/로드맵 | Claude Code (Opus 4.8·extra) | `/plan`, `docs/PLANS.md` |
| progress/PM 정리 | Claude Code (Opus 4.8·extra) | 구현 여부와 다음 phase 정리 |
| 앱 전체 분석/리스크/CEO 리뷰 | Claude Code (Opus 4.8·extra) | 제품/운영 관점 분석 |
| QA 리포트/브라우저 회귀 | Claude Code (Opus 4.8·extra) | 결함 보고와 재현 단계 정리 |
| 기능 구현 | Codex (high) | UI + server action + DB 실행 |
| 코드 리뷰 | Codex (high) | diff 리뷰, 회귀 위험 판단 |
| 오류/버그 해결 | Codex (high) | 원인 분석, 수정, 회귀 테스트 |
| 기능 테스트 작성 | Codex (high) | Vitest/Testing Library |
| DB schema/RLS/migration/보안 | Codex (high) | `db-schema` skill |
| 배포/Vercel 디버깅 | Codex (high) | build/deploy/log 확인 |
| git commit/push/브랜치 연동 | Codex (high) | `.codex/skills/commit.md` — 변경 범위 확인 후 실행 |

경계가 모호하면 **기획/디자인/progress는 Claude Code**, **엔지니어링 실행은 Codex**입니다.

## Default Flow

```text
1. 요청 도착
2. Claude Code가 plan/design/progress 범위인지 판단
3. 기획이 필요하면 Claude Code /plan
4. 구현이 필요하면 Codex가 docs/ENGINEERING.md 기준으로 실행
5. DB 변경 시 Codex db-schema skill 사용
6. 테스트 필요 시 Codex test-writer skill 사용
7. 배포/git 필요 시 Codex가 검증 후 진행
8. 디자인/QA 리포트가 필요하면 Claude Code가 재검토
```

## Codex Subagent Roles

| Role | 담당 | 제한 |
|------|------|------|
| `frontend_uiux` | 화면, 모바일 UX, 폼, 인터랙션 구현 | DB/API 재설계 금지 |
| `backend_supabase` | Supabase 쿼리, RLS, 서버 액션, API, migration | 대규모 UI 재설계 금지 |
| `app_tester_reviewer` | 코드 리뷰, Vitest, 회귀 검사 | 대규모 기능 구현 금지 |
| `data_analyst` | SQL, 메트릭, 리포팅 | 프로덕션 코드 배포 금지 |
| `vercel_deploy` | Vercel 배포, 도메인, 배포 디버깅, git 연동 | 앱 기능 작업 금지 |

## Documentation Map

| 주제 | 파일 | Owner |
|------|------|-------|
| Claude planning context | [`CLAUDE.md`](./CLAUDE.md) | Claude |
| Codex engineering guide | [`docs/ENGINEERING.md`](./docs/ENGINEERING.md) | Codex |
| 기술 아키텍처 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Codex |
| DDD-lite module design and maintenance | [`docs/DDD-MODULES.md`](./docs/DDD-MODULES.md) | Codex |
| **v1 workflow replacement plan** | [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md) | Claude |
| Coatly 가격표 세팅 기준 | [`docs/features/quote/PRICE-BOOK-TEMPLATE.md`](./docs/features/quote/PRICE-BOOK-TEMPLATE.md) | Claude |
| 로드맵 + progress | [`docs/PLANS.md`](./docs/PLANS.md) | Claude |
| 런칭 준비 상태 | [`docs/LAUNCH-READINESS.md`](./docs/LAUNCH-READINESS.md) | Shared |
| Deferred items / TODOs | [`TODOS.md`](./TODOS.md) | Claude |
| 디자인 단일 정본 | [`docs/DESIGN.md`](./docs/DESIGN.md) | Claude |
| 프론트엔드 패턴 | [`docs/FRONTEND.md`](./docs/FRONTEND.md) | Claude |
| 제품 감각 / 시장 분석 | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) | Claude |
| 안정성 | [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) | Codex |
| 보안/RLS | [`docs/SECURITY.md`](./docs/SECURITY.md) | Codex |
| 기능 문서 | [`docs/features/INDEX.md`](./docs/features/INDEX.md) | Shared |
| Audit/Tech debt | [`docs/features/audit/AUDIT.md`](./docs/features/audit/AUDIT.md) | Claude(분석) → Codex(실행) |
| DB 스냅샷 | [`docs/generated/DB-SCHEMA.md`](./docs/generated/DB-SCHEMA.md) | Codex |

> 삭제된 문서(2026-07-05 정리, git 히스토리 보존): `DESIGN_CONSISTENCY_AUDIT.md`, `features/design-system/DESIGN-SYSTEM.md` → `docs/DESIGN.md`로 통합 · `V1-TASK1~6`, `INVOICE-UI-REDESIGN-SPEC.md`, `superpowers/plans/*` → 집행 완료, 살아있는 계약은 `QUOTE.md`/`INVOICE.md`/`DESIGN.md`로 이관 · `.claude/commands/commit.md` → `.codex/skills/commit.md`

## Notion Sync

| 항목 | ID |
|------|----|
| PRD 메인 | `3289ccac-a102-819f-a0e4-ce578509d683` |
| Phase 0 DB | `3c613f77fc57483799caddbbb94394e3` |

배포 후 append-only로 업데이트합니다. 구현 상세 코드는 넣지 않고, 미구현 항목을 Done으로 표시하지 않습니다.
