# Coatly — Design Consistency Audit

> Claude Code가 디자인/UX 정책과 progress 계획을 관리합니다. Codex는 이 문서의 구현 작업을 받아 컴포넌트와 테스트를 수정합니다.

## Summary

2026-05-10 기준 P0/P1 디자인 일관성 이슈는 대부분 해결되었습니다. 남은 작업은 legacy token 완전 제거, 일부 상세 컴포넌트의 색상/상태 badge 정리, 모바일 시각 회귀입니다.

## Canonical Rules

| 영역 | 표준 |
|------|------|
| Page title | `components/layout/PageHeader.tsx` |
| Primary CTA | `PrimaryActionLink` |
| Secondary CTA | `SecondaryActionLink` |
| Error box | `components/shared/ErrorAlert.tsx` |
| Back nav | `components/layout/BackButton.tsx` |
| Tokens | Material Design 3 tokens only |
| CTA copy | `+ New {Entity}` |
| Mobile target | 44px minimum |
| Page wrapper | `flex flex-col gap-4 sm:gap-6` |

## Completed Fixes

| ID | 기존 문제 | 상태 |
|----|-----------|------|
| P0-1 | 페이지 title typography 불일치 | 해결: dashboard route page에 `PageHeader` 적용 |
| P0-2 | MD3 token과 legacy `pm-*` 혼용 | 대부분 해결: page-level MD3 적용, legacy alias deprecated |
| P0-3 | CTA 색상/굵기 혼용 | 해결: CTA link 컴포넌트화 |
| P1-1 | 오류 박스 스타일 4종 | 해결: `ErrorAlert` 단일화 |
| P1-2 | CTA prefix 불일치 | 해결: `+ New {Entity}` |
| P1-3 | Back button 터치 피드백 누락 | 해결: `hover:` + `active:` |
| P2-2 | 헤더 spacing 혼용 | 개선: PageHeader 중심 |
| P2-3 | subtitle 색상 혼용 | 개선: `text-on-surface-variant` |

## Remaining Findings

| ID | 우선순위 | 위치 | 작업 |
|----|----------|------|------|
| D1 | P1 | `components/ui/badge.tsx` | legacy `pm-*` 색상 제거 |
| D2 | P1 | `components/customers/CustomerDetail.tsx` | legacy status 색상 제거 |
| D3 | P2 | `app/globals.css` | legacy alias 삭제 가능 시점 재검토 |
| D4 | P2 | `eslint.config.mjs` | `pm-*` whitelist 제거 가능 시점 재검토 |
| D5 | P2 | detailed quote/job screens | 모바일 screenshot 기반 spacing 점검 |

## Container Width Rules

| 화면 유형 | 너비 |
|-----------|------|
| dashboard/list | layout `max-w-7xl` |
| simple form | `max-w-lg md:max-w-2xl` |
| settings | `max-w-4xl` |
| complex form/line items | `max-w-lg lg:max-w-6xl` |
| public quote | content-first, mobile readable |

## New UI Checklist

- [ ] MD3 token만 사용
- [ ] `PageHeader` 사용
- [ ] CTA는 `PrimaryActionLink`/`SecondaryActionLink`
- [ ] 오류는 `ErrorAlert`
- [ ] interactive target 44px 이상
- [ ] loading/error/empty 상태 포함
- [ ] mobile 390px에서 텍스트 겹침 없음
- [ ] desktop에서 container width 규칙 준수

## Handoff

Claude Code:
- 디자인 정책 수립
- 화면/플로우 리뷰
- progress/roadmap 정리
- 브라우저 기반 디자인 회귀 확인

Codex:
- 컴포넌트 구현
- legacy token 제거
- lint/test/build 검증
- 회귀 테스트 추가
