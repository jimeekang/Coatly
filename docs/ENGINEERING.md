# Coatly — Codex Engineering Guide

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
3. Server Action 또는 API route
4. Domain library (`lib/`)
5. React component (`components/`)
6. Page wiring (`app/(dashboard)/`)
7. Tests

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

1. `git status --short`로 사용자 변경과 Codex 변경을 분리합니다.
2. lint/test/build 또는 요청된 검증을 실행합니다.
3. 의도적인 commit message를 작성합니다.
4. `git push` 또는 Vercel 배포 명령을 실행합니다.
5. 배포 URL, 검증 결과, 실패 시 원인을 보고합니다.

주의:
- 사용자 변경을 되돌리지 않습니다.
- destructive git command는 명시 요청 없이는 사용하지 않습니다.
- 배포 실패는 로그를 보고 수정한 뒤 재검증합니다.

## Out of Scope

GPS tracking, team scheduling, supplier integrations, native app, multi-language는 제안하지 않습니다.
