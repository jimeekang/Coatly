# Coatly — Agent Definitions

> 프로젝트 컨텍스트(스택, 제약, 스키마)는 → [`CLAUDE.md`](./CLAUDE.md)
> 기술 아키텍처 상세는 → [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Slash Commands

| Command                  | 설명                              | 파일                                |
| ------------------------ | --------------------------------- | ----------------------------------- |
| `/plan [기능]`           | 작업 분해 + 라우팅 결정           | `.claude/commands/plan.md`          |
| `/build [기능]`          | UI + backend + DB 통합 구현       | `.claude/commands/build.md`         |
| `/quality [파일]`        | 테스트 + 리뷰 + 타입 검증         | `.claude/commands/quality.md`       |
| `/release [msg]`         | git + vercel + 문서 동기화        | `.claude/commands/release.md`       |
| `/gstack [skill] [args]` | 외부 gstack skill 라우터          | `.claude/commands/gstack.md`        |
| `/qa [대상]`             | gstack 기반 QA 테스트 + 버그 수정 | `.claude/commands/qa.md`            |
| `/qa-only [대상]`        | gstack 기반 리포트 전용 QA        | `.claude/commands/qa-only.md`       |
| `/browse [URL/흐름]`     | gstack 브라우저 테스트/스크린샷   | `.claude/commands/browse.md`        |
| `/design-review [대상]`  | gstack 디자인/시각 QA             | `.claude/commands/design-review.md` |
| `/canary [URL]`          | gstack 배포 후 모니터링           | `.claude/commands/canary.md`        |

### 워크플로우

```
/plan 새 기능 추가
  → /build 기능 구현
  → /quality 검증
  → /release "feat: 기능명"
```

## Codex Subagents

| Role              | Agent                 | 담당                                             | 제한                            |
| ----------------- | --------------------- | ------------------------------------------------ | ------------------------------- |
| Frontend UI/UX    | `frontend_uiux`       | 화면, 모바일 UX, 폼, 인터랙션                    | Supabase 스키마/API 재설계 금지 |
| Backend & Data    | `backend_supabase`    | Supabase 쿼리, RLS, 서버 액션, API, 마이그레이션 | 프론트엔드 대규모 재설계 금지   |
| Tester & Reviewer | `app_tester_reviewer` | 코드 리뷰, 테스트, 회귀 검사                     | 대규모 기능 구현 금지           |
| Data Analyst      | `data_analyst`        | SQL, 메트릭, 리포팅, 비즈니스 분석               | 프로덕션 코드 배포 금지         |
| Deployment        | `vercel_deploy`       | Vercel 배포, 도메인, 배포 디버깅                 | 앱 기능 작업 금지               |

핸드오프 템플릿 및 상세 역할 정의: `.codex/AGENTS.md`

## Recommended Flow

```
1. 요구사항이 모호하면 → data_analyst로 scope 확인
2. UI 구현 → frontend_uiux, 데이터 → backend_supabase (범위 한정)
3. 완료 후 → app_tester_reviewer로 검증
4. UI QA / 브라우저 테스트 / 스크린샷 / 배포 후 화면 검증 → `gstack` skill
5. 배포 → vercel_deploy
```

## Skills

모든 skill 파일은 `.claude/skills/`에 위치 (단일 canonical 위치).

| Skill       | 트리거                                         | 파일                                  |
| ----------- | ---------------------------------------------- | ------------------------------------- |
| db-schema   | DB 타입/RLS/schema 변경                        | `.claude/skills/db-schema/SKILL.md`   |
| test-writer | 테스트 작성/실행/수정                          | `.claude/skills/test-writer/SKILL.md` |
| ui-spec     | UI/컴포넌트 구현                               | `.claude/skills/ui-spec/SKILL.md`     |
| doc-sync    | PRD/Notion 문서 업데이트                       | `.claude/skills/doc-sync/SKILL.md`    |
| gstack      | UI QA, 브라우저 테스트, 스크린샷, 배포 후 검증 | `gstack` skill                        |

## External Skills

- 사용 시점: 브라우저에서 실제 화면 확인이 필요할 때, QA가 필요할 때, 스크린샷/버그 증거가 필요할 때
- 상세 동작 규칙은 [`CLAUDE.md`](./CLAUDE.md)의 Skills 섹션을 우선 참조
