# Coatly — Agent Routing

> 이 파일만 메인 `AGENTS.md`로 유지합니다.
> Claude 계획 컨텍스트 → [`CLAUDE.md`](./CLAUDE.md)
> Codex 엔지니어링 세부 문서 → [`docs/ENGINEERING.md`](./docs/ENGINEERING.md)

## Division Of Labor

| Tool | 담당 영역 | 주요 문서/진입점 |
|------|-----------|------------------|
| Claude Code | 플랜, 디자인, UI/UX, 앱 구성 기획, progress 기획, 앱 전체 분석, QA 리포트 | `CLAUDE.md`, `.claude/commands/plan.md`, `.claude/skills/ui-spec.md` |
| Codex | 기능 구현, 오류/버그 해결, 기능 테스트, DB 관리, 배포, git 연동 | `docs/ENGINEERING.md`, `.codex/skills/db-schema.md`, `.codex/skills/test-writer.md` |

## Routing

| 요청 유형 | 1차 도구 | 기준 |
|----------|----------|------|
| 디자인/UI/UX 스펙 | Claude Code | 화면 구조, 컴포넌트 방향, interaction 결정 |
| 앱 구성/정보 구조 | Claude Code | navigation, IA, page composition |
| 기능 분해/우선순위/로드맵 | Claude Code | `/plan`, `docs/PLANS.md` |
| progress 정리 | Claude Code | 구현 여부와 다음 phase 정리 |
| 앱 전체 분석/리스크/CEO 리뷰 | Claude Code | 제품/운영 관점 분석 |
| QA 리포트/브라우저 회귀 | Claude Code | 결함 보고와 재현 단계 정리 |
| 기능 구현 | Codex | UI + server action + DB 실행 |
| 오류/버그 해결 | Codex | 원인 분석, 수정, 회귀 테스트 |
| 기능 테스트 작성 | Codex | Vitest/Testing Library |
| DB schema/RLS/migration | Codex | `db-schema` skill |
| 배포/Vercel 디버깅 | Codex | build/deploy/log 확인 |
| git commit/push/브랜치 연동 | Codex | 변경 범위 확인 후 실행 |

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

| 주제 | 파일 |
|------|------|
| Claude planning context | [`CLAUDE.md`](./CLAUDE.md) |
| Codex engineering guide | [`docs/ENGINEERING.md`](./docs/ENGINEERING.md) |
| 기술 아키텍처 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **v1 workflow replacement plan** | [`docs/features/ai/V1-PLAN.md`](./docs/features/ai/V1-PLAN.md) |
| Coatly 가격표 세팅 기준 | [`docs/features/quote/PRICE-BOOK-TEMPLATE.md`](./docs/features/quote/PRICE-BOOK-TEMPLATE.md) |
| 로드맵 + progress | [`docs/PLANS.md`](./docs/PLANS.md) |
| Deferred items / TODOs | [`TODOS.md`](./TODOS.md) |
| 디자인 정책 | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 디자인 일관성 감사 | [`docs/DESIGN_CONSISTENCY_AUDIT.md`](./docs/DESIGN_CONSISTENCY_AUDIT.md) |
| 프론트엔드 패턴 | [`docs/FRONTEND.md`](./docs/FRONTEND.md) |
| 제품 감각 | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) |
| 안정성 | [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) |
| 보안/RLS | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 기능 문서 | [`docs/features/INDEX.md`](./docs/features/INDEX.md) |
| Audit/Tech debt | [`docs/features/audit/AUDIT.md`](./docs/features/audit/AUDIT.md) |
| DB 스냅샷 | [`docs/generated/DB-SCHEMA.md`](./docs/generated/DB-SCHEMA.md) |

## Notion Sync

| 항목 | ID |
|------|----|
| PRD 메인 | `3289ccac-a102-819f-a0e4-ce578509d683` |
| Phase 0 DB | `3c613f77fc57483799caddbbb94394e3` |

배포 후 append-only로 업데이트합니다. 구현 상세 코드는 넣지 않고, 미구현 항목을 Done으로 표시하지 않습니다.
