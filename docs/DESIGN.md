# Coatly — Design 단일 정본

> Owner: **Claude** (Opus 4.8 · extra) — 기획/디자인/QA/분석 문서. 구현·DB·git 결정은 Codex(high) 영역.

디자인/UI/UX의 단일 정본. 색·토큰·컴포넌트·레이아웃 규칙은 이 문서를 기준으로 한다.

## User Persona

**Alex, 호주 소규모 페인터**
- 1~3인 업체 운영, 기술에 익숙하지 않음
- 현장에서 장갑 끼고 스마트폰 사용
- 햇빛 아래 화면 확인, 불안정한 네트워크
- 견적서를 빠르게 작성하고 고객에게 전문적인 PDF를 보내고 싶음

## Core Design Principles

### 1. Mobile-First, Touch-First

모든 화면은 모바일 뷰포트에서 먼저 설계한다.

| 규칙 | 값 | 이유 |
|------|-----|------|
| 최소 터치 타겟 | 44px (h-11+) | 장갑 낀 손으로 탭 가능 |
| 핵심 CTA 위치 | 화면 하단 | 엄지 도달 범위 |
| 숫자 입력 | `inputMode="numeric"` | 키패드 즉시 표시 |
| 폼 간격 | `gap-4` 이상 | 오탭 방지 |

### 2. Progressive Disclosure

- 첫 화면은 최소 정보만 표시
- 상세 정보는 탭/확장으로 접근
- 필수 입력 최소화, 선택 입력은 "고급 옵션"으로 분리

### 3. Instant Feedback

- 모든 액션에 로딩 상태 표시 (Skeleton, Spinner)
- 에러는 인라인으로 즉시 표시 (`ErrorAlert`)
- 성공은 toast 또는 페이지 전환으로 확인

### 4. Professional Output

- PDF 견적서/청구서는 비즈니스 로고, ABN, 연락처 자동 포함
- 깔끔한 레이아웃으로 고객에게 전문적 이미지 전달

## Color System

Material Design 3 토큰만 사용. 레거시 `pm-*` alias는 제거 완료(프로덕션 0건) — 재도입 금지. `bg-white` 직접 사용 금지(`bg-surface-container-lowest` 등 토큰 사용).

| Token | 용도 | 참고 |
|-------|------|------|
| `primary` / `on-primary` | 핵심 CTA, 브랜드 | `#0D8068` 계열 |
| `primary-container` / `primary-fixed` | primary 배경/pale | |
| `on-surface` / `on-surface-variant` | 본문 / 보조 텍스트 | `#0F1620` / `#475569` |
| `outline` / `outline-variant` | 경계선 / 가는 구분선 | `#CBD5E1` / `#E2E8F0` |
| `surface-container-lowest`~`high` | 카드/배경 계층 | `bg-white` 대체 |
| `error` / `error-container` / `on-error-container` | 삭제, 에러 | `#B91C1C` 계열 |
| `success` / `success-container` | 성공, paid 상태 | |
| `warning` / `warning-container` | 경고, overdue/due-soon | |

### 상태색 매핑 (invoice 기준, 앱 전역 재사용)

| 상태 | 배경 | 텍스트/보더 |
|------|------|-------------|
| paid | `bg-success-container` | `text-success` / `border-l-success` |
| overdue / due-soon | `bg-warning-container` | `text-warning` / `border-l-warning` |
| sent | `bg-primary/10` (또는 `surface-container-lowest`) | `text-primary` / `border-l-primary` |
| draft | `bg-surface-container-low` | `text-on-surface` / `border-l-outline` |

**실데이터 원칙**: 타임라인·meta·결제정보는 실데이터(`paid_date`, `payment_method`, `customer.email`)만 사용. Stripe 세부, 이메일 주소, BSB 같은 목업 더미값 생성·하드코딩 금지. `InvoiceKpiBand`의 `paid_this_month`는 `paid_date`의 **Sydney 월** 기준 `amount_paid_cents` 합으로 정의.

## Typography

- 본문: `text-base` (16px) — 가독성 우선
- 제목: `text-lg` ~ `text-2xl` — 계층 구조
- 금액: `text-xl font-semibold` + `tabular-nums` — 시각적 강조
- 송장번호: `font-mono tracking-[0.18em]`
- 모든 금액은 AUD 포맷: `$1,234.56` (`formatAUD`)

## Canonical Rules (필수)

| 영역 | 표준 |
|------|------|
| Page title | `<PageHeader>` (`components/layout/PageHeader.tsx`) |
| Primary CTA | `<PrimaryActionLink>` |
| Secondary CTA | `<SecondaryActionLink>` |
| Error box | `<ErrorAlert>` (`components/shared/ErrorAlert.tsx`) |
| Back nav | `<BackButton>` (`components/layout/BackButton.tsx`) — `hover:` + `active:` 둘 다 |
| Tokens | Material Design 3 토큰만 |
| CTA copy | `+ New {Entity}` (Add 금지) |
| Mobile target | 44px 이상 |
| Page wrapper | `flex flex-col gap-4 sm:gap-6` |

### 터치 · Radius 규칙

| 항목 | 값 |
|------|-----|
| 보조 액션 버튼 | `h-11` |
| 주요 인라인 버튼 | `min-h-12` |
| 고정 footer 버튼 | `h-14` |
| input 높이 | `h-12` |
| 섹션 카드 radius | `rounded-2xl` |
| button · input radius | `rounded-xl` |

### z-index 레이어

| 레이어 | z-index |
|--------|---------|
| 폼 footer 액션 바 (`FormFooter`) | `z-30` |
| 모바일 탭바 / nav | `z-40` |
| 모달 · 오버레이 | `z-50` |

새 shared footer 적용 시 기존 `z-50` 모달을 낮추지 말 것.

## Container Width Rules

| 화면 유형 | 너비 |
|-----------|------|
| dashboard / list | layout `max-w-7xl` 의존 |
| simple form | `max-w-lg md:max-w-2xl` |
| settings | `max-w-4xl` |
| complex form / line items | `max-w-lg lg:max-w-6xl` |
| public quote | content-first, mobile readable |

## New UI Checklist

- [ ] MD3 token만 사용 (`bg-white`·`pm-*` 없음)
- [ ] `PageHeader` 사용
- [ ] CTA는 `PrimaryActionLink` / `SecondaryActionLink`
- [ ] 오류는 `ErrorAlert`
- [ ] interactive target 44px 이상
- [ ] loading / error / empty 상태 포함
- [ ] mobile 390px에서 텍스트 겹침 없음
- [ ] desktop에서 container width 규칙 준수

## Component Architecture

feature UI/action/domain은 `modules/<feature>/{ui,application,domain,infrastructure}`에 위치한다. 공유 프리미티브·레이아웃·순수 표시 컴포넌트만 `components/`에 남는다.

```
modules/
  quotes/     ui/ (QuoteForm, QuoteTable, QuoteCreateScreen, QuoteDetail 계열,
              LineItemsSection, ScopeBuilder, *EstimateBuilder, public/) ·
              application/ (actions.ts, *-service.ts) · domain/ · infrastructure/
  invoices/   ui/ (InvoiceForm, InvoiceTable, InvoiceDetail, InvoiceKpiBand,
              InvoiceCreateScreen) · application/ · domain/ · infrastructure/
  customers/  ui/ (CustomerForm, CustomerTable, CustomerDetail, CreateScreen) ·
              application/ · infrastructure/
  jobs/       ui/ (JobsWorkspace, JobDetail, JobEditForm) · application/ · domain/
  materials/  ui/ (MaterialItemForm, MaterialItemList) · application/ · domain/
  price-rates/ ui/ (PriceRatesForm, QuickEstimateTab) · domain/
  settings/   ui/ (BusinessProfileForm, PricingSection, GoogleCalendarCard) ·
              application/ (business/profile/settings-actions.ts) · domain/ · infrastructure/

components/
  ui/         → shadcn/ui primitives + ConfirmDialog, input, select (프리미티브)
  forms/      → FormField, FormSection, FormFooter, GoogleAddressAutocomplete
  layout/     → PageHeader, BackButton, BackLink
  shared/     → ErrorAlert, NumericInput
  dashboard/  → Sidebar, WorkspaceAssistant
  schedule/   → ScheduleCalendar
  auth/       → AuthShell, *PageClient
  branding/   → BrandLogo
  onboarding/ → OnboardingForm
  subscription/ → UpgradePrompt
  ai/         → AIDraftPanel

lib/pdf/      → React-PDF 템플릿 (quote-template.tsx, invoice-template.tsx)
```

## Shared Form Primitives

세 폼(Quote/Invoice/Customer)의 입력·섹션·footer 스타일은 `components/forms/`로 통일:
- `FormField` — label + control + error 묶음. `input: h-12 rounded-xl border-outline-variant`, focus `border-primary` + `ring-primary/20`, error `text-error`.
- `FormSection` — `rounded-2xl border-outline-variant bg-white p-4 shadow-sm sm:p-6` 카드 래퍼.
- `FormFooter` — 고정 하단 액션 바. `z-30`, 모바일은 탭바 위(`bottom-[calc(4rem+...)]`), 태블릿/데스크탑은 sidebar offset(`md:left-60 lg:left-64`). Primary `h-14 bg-primary`, Secondary `h-14 border-outline-variant`.

폼별 inline `FIELD`/`LABEL`/`TEXTAREA` const는 폐기 — 위 프리미티브 사용. 컨테이너 너비는 Container Width Rules 준수(변경 금지).

## Design Rules

1. **shadcn/ui 수정 금지** — `components/ui/` 프리미티브 직접 편집하지 않음
2. **Tailwind만 사용** — 인라인 스타일 금지
3. **Server Action 패턴** — onClick에서 직접 Supabase 호출 금지
4. **상태 3종 필수** — 모든 비동기 UI에 loading/error/empty 상태 구현
5. **접근성** — aria-label, 키보드 네비게이션, 충분한 색상 대비

## Open Items

디자인 부채 (Codex 구현 대상, AUDIT 참조):

- **`bg-white` 하드코딩 다수** — `components/schedule/ScheduleCalendar.tsx` 28회, QuoteForm 등. `bg-surface-container-lowest`(또는 계층 토큰)로 치환 예정.
- **`components/ui/button.tsx` 기본 44px 위반** — `size: default`가 `h-8`(32px), `sm` `h-7`, `lg`도 `h-9`뿐. 모바일 터치 타겟 44px 규칙 미충족. 앱 CTA는 `PrimaryActionLink`/`SecondaryActionLink`(min-h-11+)로 우회 중이나, shadcn `<Button>` 직접 사용 지점은 높이 점검 필요.
- **프리미티브 이원화 (AUDIT A14)** — `components/ui/input.tsx`(label/error 래핑 보유)와 `components/forms/FormField.tsx`가 병존. 어느 쪽을 정본으로 할지 미정.
- **D5 모바일 spacing 점검 미완** — detailed quote/job 화면의 모바일 screenshot 기반 spacing 감사 미완료.
- **`ConfirmDialog` focus trap 부재** — `components/ui/ConfirmDialog.tsx`가 `role="dialog"`만 두고 focus trap/키보드 포커스 순환 미구현. 접근성 보강 필요.
