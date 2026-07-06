---
name: ui-spec
owner: claude-code
model: claude-opus-4-8
description: >
  Frontend UI/UX 스펙/기획을 받아서 mobile-first Tailwind + MD3 토큰 React 컴포넌트 스펙을 작성.
  "화면 만들어줘", "UI 짜줘", "컴포넌트 만들어줘", "이 디자인 구현해줘",
  "UX 개선해줘", "프론트엔드 UI/UX 만들어줘" 요청에 반드시 이 skill을 사용할 것.
  (Coatly 라우팅: 디자인/UI/UX 스펙·결정은 Claude Code 담당. 실제 컴포넌트 구현 + DB/server action 통합은 Codex로 넘긴다.)
---

# UI Spec Skill (Claude Code)

> Owner: **Claude** (Opus 4.8 · extra) — UI/UX 스펙·디자인 결정·컴포넌트 디자인 산출 전용. 산출물(타입 시그니처, 동작, 모바일 케이스, 디자인 토큰 적용)을 Codex(high)가 받아서 구현. 구현/DB/git 실행 금지.
> 디자인 단일 정본 → [`docs/DESIGN.md`](../../docs/DESIGN.md) · 라우팅 표 → [`AGENTS.md`](../../AGENTS.md)

## 작업 순서 (agent loop)

1. 스펙 분석 — 모바일 UX 포인트, 데이터 흐름, 엣지케이스 파악
2. 컴포넌트 **스펙 문서** 산출 (props 타입 시그니처, 상태, 레이아웃, 토큰) — 코드 구현은 Codex
3. 기존 프리미티브 재사용 여부 명시 (`PageHeader`, `PrimaryActionLink`, `FormField`, `FormSection`, `FormFooter`, `ErrorAlert`, `EmptyState`, `NumericInput`)
4. Codex 구현 브리프로 마무리 (변경 파일 경로, AC 체크리스트)

## 설계 원칙 (Coatly 전용)

**사용자 = 현장 페인터**: 장갑 낀 손, 햇빛 반사 화면, 빠른 입력 필요

| 규칙 | 이유 |
|------|------|
| 터치 타겟 최소 44px (`min-h-11`+) | 장갑 낀 손 |
| 핵심 액션은 화면 하단 (`FormFooter`) | 엄지 범위 |
| 숫자 입력은 항상 `inputMode="numeric"` (`NumericInput` 사용) | 키패드 바로 열림 |
| 로딩/에러/빈 상태 필수 (`ErrorAlert`, `EmptyState`) | 현장 네트워크 불안정 |
| 금액은 항상 AUD 포맷, cents 정수 기반 | 호주 사용자 |
| 사용자 노출 문구 기본값은 영어 | 앱 기본 언어는 English |
| 면적 단위 표기는 항상 `sqm` | `m²`, `㎡`, `제곱미터` 표기 금지 |

## 디자인 토큰/컴포넌트 규약 (필수 — 상세는 docs/DESIGN.md)

- **MD3 토큰만 사용**: `text-on-surface`, `bg-primary`, `border-outline-variant`, `bg-error-container` 등. `bg-white`·`text-destructive` 등 raw/shadcn 토큰 금지
- **CTA**: shadcn `<Button>` 금지 — `<PrimaryActionLink>` / `<SecondaryActionLink>` (`components/layout/PageHeader.tsx`)
- **페이지 헤더**: `<PageHeader title subtitle action />` 단일 사용
- **폼 필드**: `components/forms/FormField.tsx` 계열 사용 (inline 필드 상수 금지)
- **CTA 텍스트**: "+ New {Entity}" 패턴 (Add 금지)
- **컨테이너 너비**: 단순 form `max-w-lg md:max-w-2xl` · 설정 `max-w-4xl` · 복합 form `max-w-lg lg:max-w-6xl` · list/dashboard는 layout `max-w-7xl`
- **페이지 spacing**: `flex flex-col gap-4 sm:gap-6`

## 카피/단위 규칙

- 새 화면/폼/버튼/라벨/placeholder/empty state/success/error 문구는 영어로 작성
- 사용자가 명시적으로 요청하지 않으면 영어 이외의 UI 카피를 추가하지 않음
- 면적 관련 라벨/도움말/테이블 헤더/계산 결과/PDF UI 카피는 항상 `sqm`

## 스펙 산출 형식

```md
## Component: <Name>
- 위치: modules/<feature>/ui/<Name>.tsx   ← feature 컴포넌트는 modules/ 하위
- Props: <TypeScript 시그니처>
- 상태: loading / error / empty / success 각각의 UI
- 모바일: 터치 타겟, 하단 CTA, safe-area 처리
- 토큰: 사용할 MD3 토큰 목록
- 재사용: PageHeader / FormField / FormFooter 등 기존 프리미티브
- AC: [ ] 체크리스트
```

## 파일 위치 규칙 (현행 구조)

```
modules/<feature>/ui/        → feature 화면/폼 (QuoteForm, InvoiceKpiBand 등)
modules/<feature>/application/ → server actions (Codex 구현 영역)
modules/<feature>/domain/    → 순수 도메인 로직 (Codex 구현 영역)
components/layout/           → PageHeader, BackButton, PrimaryActionLink
components/forms/            → FormField, FormSection, FormFooter
components/shared/           → ErrorAlert, NumericInput
components/ui/               → 공용 프리미티브 (직접 수정 금지)
lib/pdf/                     → React-PDF 템플릿
```

## 금지 사항

- `components/ui/` 파일 직접 수정 금지
- `onClick` 안에서 직접 Supabase 호출 금지 — Server Action 사용 (구현은 Codex)
- 인라인 스타일 금지 — Tailwind 클래스만
- 이 skill에서 실제 코드 파일 생성/수정·DB·git 실행 금지 — 스펙과 브리프만 산출
