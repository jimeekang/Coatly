# Coatly — Agent Definitions

> 프로젝트 컨텍스트(스택, 제약, 스키마)는 → [`CLAUDE.md`](./CLAUDE.md)
> 기술 아키텍처 상세는 → [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Slash Commands

| Command                  | 설명                              | 파일                                |
| ------------------------ | --------------------------------- | ----------------------------------- |
| `/plan [기능]`           | 작업 분해 + 라우팅 결정           | `.claude/commands/plan.md`          |
| `/build [기능]`          | UI + backend + DB 통합 구현       | `.claude/commands/build.md`         |
| `/qa [대상]`             | gstack 기반 QA 테스트 + 버그 수정 | `gstack-qa`                         |
| `/qa-only [대상]`        | gstack 기반 리포트 전용 QA        | `gstack-qa-only`                    |
| `/browse [URL/흐름]`     | gstack 브라우저 테스트/스크린샷   | `gstack-browse`                     |
| `/design-review [대상]`  | gstack 디자인/시각 QA             | `gstack-design-review`              |
| `/canary [URL]`          | gstack 배포 후 모니터링           | `gstack-canary`                     |
| `/ship [msg]`            | commit → push → Vercel 배포       | `gstack-ship`                       |

### 워크플로우

```
/plan 새 기능 추가
  → /build 기능 구현
  → gstack-health 검증
  → /ship "feat: 기능명"
```

## Subagent 역할 정의

| Role              | Agent                 | 담당                                             | 제한                            |
| ----------------- | --------------------- | ------------------------------------------------ | ------------------------------- |
| Frontend UI/UX    | `frontend_uiux`       | 화면, 모바일 UX, 폼, 인터랙션                    | Supabase 스키마/API 재설계 금지 |
| Backend & Data    | `backend_supabase`    | Supabase 쿼리, RLS, 서버 액션, API, 마이그레이션 | 프론트엔드 대규모 재설계 금지   |
| Tester & Reviewer | `app_tester_reviewer` | 코드 리뷰, 테스트, 회귀 검사                     | 대규모 기능 구현 금지           |
| Data Analyst      | `data_analyst`        | SQL, 메트릭, 리포팅, 비즈니스 분석               | 프로덕션 코드 배포 금지         |
| Deployment        | `vercel_deploy`       | Vercel 배포, 도메인, 배포 디버깅                 | 앱 기능 작업 금지               |

## Skills

모든 skill 파일은 `.claude/skills/`에 위치 (단일 canonical 위치).

### 개발 스킬

| Skill       | 트리거                          | 파일                                  |
| ----------- | ------------------------------- | ------------------------------------- |
| db-schema   | DB 타입/RLS/schema 변경         | `.claude/skills/db-schema/SKILL.md`   |
| test-writer | 테스트 작성/실행/수정           | `.claude/skills/test-writer/SKILL.md` |
| ui-spec     | UI/컴포넌트 구현                | `.claude/skills/ui-spec/SKILL.md`     |

### gstack Skills (브라우저/QA/배포)

| Skill                  | 트리거                              |
| ---------------------- | ----------------------------------- |
| `gstack-qa`            | QA 테스트 + 버그 수정               |
| `gstack-qa-only`       | 리포트 전용 QA                      |
| `gstack-browse`        | 브라우저 테스트 / 스크린샷          |
| `gstack-design-review` | 라이브 디자인/시각 QA               |
| `gstack-canary`        | 배포 후 모니터링                    |
| `gstack-health`        | 코드 품질 대시보드                  |
| `gstack-review`        | PR 사전 코드 리뷰                   |
| `gstack-ship`          | commit → push → Vercel 배포         |
| `gstack-plan-ceo-review` | CEO/전략 관점 플랜 리뷰           |

## 참조 문서 맵

| 주제                    | 파일                                                          |
| ----------------------- | ------------------------------------------------------------- |
| 디자인 철학 + 컴포넌트  | [`docs/DESIGN.md`](./docs/DESIGN.md)                         |
| 프론트엔드 패턴         | [`docs/FRONTEND.md`](./docs/FRONTEND.md)                     |
| 로드맵 + Phase 추적     | [`docs/PLANS.md`](./docs/PLANS.md)                           |
| 제품 감각 + 페르소나    | [`docs/PRODUCT_SENSE.md`](./docs/PRODUCT_SENSE.md)           |
| 안정성 + 복구 전략      | [`docs/RELIABILITY.md`](./docs/RELIABILITY.md)               |
| 보안 + RLS 정책         | [`docs/SECURITY.md`](./docs/SECURITY.md)                     |
| 기능별 설계 문서        | [`docs/design-docs/`](./docs/design-docs/index.md)           |
| 실행 계획               | [`docs/exec-plans/`](./docs/exec-plans/)                     |
| 제품 스펙 (PRD)         | [`docs/product-specs/`](./docs/product-specs/index.md)       |
| DB 스키마 스냅샷        | [`docs/generated/db-schema.md`](./docs/generated/db-schema.md) |

## Recommended Flow

```
1. 요구사항이 모호하면 → data_analyst로 scope 확인 (docs/PLANS.md 참조)
2. UI 구현 → frontend_uiux (.claude/skills/ui-spec/SKILL.md)
3. 데이터/DB → backend_supabase (.claude/skills/db-schema/SKILL.md)
4. 완료 후 → app_tester_reviewer (.claude/skills/test-writer/SKILL.md)
5. UI QA / 브라우저 / 스크린샷 / 배포 후 검증 → gstack skills
6. 배포 → vercel_deploy (gstack-ship)
```
