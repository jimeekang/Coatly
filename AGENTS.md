# Coatly — Agent Definitions

> 프로젝트 컨텍스트(스택, 제약, 스키마) → [`CLAUDE.md`](./CLAUDE.md)

## Command Routing

| 요청 | 커맨드/Skill |
| ---- | ----------- |
| 기능 범위 분해 / 우선순위 | `/plan` → `.claude/commands/plan.md` |
| 기능 구현 (UI + backend + DB) | `/build` → `.claude/commands/build.md` |
| git commit + push | `/commit` → `.claude/commands/commit.md` |
| DB schema / RLS / 타입 | `.claude/skills/db-schema/SKILL.md` |
| 테스트 작성 / 실행 / 수정 | `.claude/skills/test-writer/SKILL.md` |
| UI / 컴포넌트 구현 | `.claude/skills/ui-spec/SKILL.md` |
| 코드 품질 + 보안 | `gstack-health` + `gstack-review` |
| QA 테스트 + 버그 수정 | `gstack-qa` |
| 브라우저 테스트 / 스크린샷 | `gstack-browse` |
| 라이브 디자인 리뷰 | `gstack-design-review` |
| 배포 후 모니터링 | `gstack-canary` |
| 배포 (commit → push → Vercel) | `gstack-ship` |
| CEO/전략 관점 리뷰 | `gstack-plan-ceo-review` |

## Subagent Roles

| Role | Agent | 담당 | 제한 |
| ---- | ----- | ---- | ---- |
| Frontend UI/UX | `frontend_uiux` | 화면, 모바일 UX, 폼, 인터랙션 | Supabase 스키마/API 재설계 금지 |
| Backend & Data | `backend_supabase` | Supabase 쿼리, RLS, 서버 액션, API, 마이그레이션 | 프론트엔드 대규모 재설계 금지 |
| Tester & Reviewer | `app_tester_reviewer` | 코드 리뷰, 테스트, 회귀 검사 | 대규모 기능 구현 금지 |
| Data Analyst | `data_analyst` | SQL, 메트릭, 리포팅, 비즈니스 분석 | 프로덕션 코드 배포 금지 |
| Deployment | `vercel_deploy` | Vercel 배포, 도메인, 배포 디버깅 | 앱 기능 작업 금지 |

## Documentation Map

| 주제 | 파일 |
| ---- | ---- |
| 기술 아키텍처 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| 디자인 철학 + 컴포넌트 | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 프론트엔드 패턴 | [`docs/FRONTEND.md`](./docs/FRONTEND.md) |
| 로드맵 + Phase 추적 | [`docs/PLANS.md`](./docs/PLANS.md) |
| 제품 감각 + 페르소나 | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md) |
| 안정성 + 복구 전략 | [`docs/RELIABILITY.md`](./docs/RELIABILITY.md) |
| 보안 + RLS 정책 | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 기능별 설계 + 스펙 문서 | [`docs/features/`](./docs/features/index.md) |
| DB 스키마 스냅샷 | [`docs/generated/db-schema.md`](./docs/generated/db-schema.md) |

## Notion

| 항목 | ID |
| ---- | -- |
| PRD 메인 | `3289ccac-a102-819f-a0e4-ce578509d683` |
| Phase 0 DB | `3c613f77fc57483799caddbbb94394e3` |

업데이트 규칙 (배포 후, append-only):

| 변경 유형 | 위치 |
| --------- | ---- |
| 신규 기능 구현 | PRD Feature Priority Matrix 상태 변경 |
| DB schema 변경 | PRD Technical Architecture 섹션 |
| Phase 완료 | Phase 0 DB Task → ✅ Done |
| 범위 변경 | PRD Out of Scope 섹션 |

**금지**: 구현 상세 코드 삽입 / 미구현 항목 Done 표시 / 기존 내용 삭제

## Default Flow

```
1. 모호한 요청 → data_analyst로 scope 확인 (docs/PLANS.md)
2. 구현 → /build
3. DB 변경 → db-schema skill
4. 테스트 → test-writer skill
5. 세부 제약 우선순위는 항상 CLAUDE.md 기준
```
