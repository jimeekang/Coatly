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

## Color System — "Warm Paper & Eucalyptus" (2026-07-12 v1.1)

Material Design 3 토큰만 사용. 레거시 `pm-*` alias는 제거 완료(프로덕션 0건) — 재도입 금지. `bg-white` 직접 사용 금지(`bg-surface-container-lowest` 등 토큰 사용). 팔레트 원칙: **웜 뉴트럴 단일 세계**(paper surface + stone outline, 쿨 slate 혼용 금지) + 딥 eucalyptus primary + navy ink 텍스트.

| Token | 용도 | 값 (v1.1) |
|-------|------|------|
| `primary` / `on-primary` | 핵심 CTA, 브랜드 | `#0B7A64` / white (AA 5.2:1) |
| `primary-container` / `on-primary-container` | **강조 칩·totals 밴드·focus border** (딥 pine + 라이트 텍스트 — 이 앱은 MD3 pale tint 대신 강조색으로 사용, 극성 변경 금지) | `#095F4E` / `#E9FBF4` |
| `primary-fixed` | pale mint tint | `#BFE8DE` |
| `on-surface` / `on-surface-variant` | 본문 / 보조 텍스트 (ink navy 계열) | `#101828` / `#4C5665` |
| `outline` / `outline-variant` | 경계선 / 가는 구분선 (웜 stone — 텍스트 사용 금지, 대비 미달) | `#C9C1B2` / `#E5DFD3` |
| `surface` | 페이지 배경 (warm paper) | `#FAF7F2` |
| `surface-container-lowest`→`highest` | 카드/배경 5단 계층: `#FFFFFF` → `#F4F0E9` → `#EEE9E0` → `#E8E2D7` → `#E1DACD` | 단계별 상이 — hover는 한 단계 위 티어 |
| `secondary` / `secondary-container` | slate-blue, info·sent | `#3E5266` / `#D9E2EC` (pale + `on-…`=`#24384E`) |
| `tertiary` / `tertiary-container` | navy ink 액센트 (아바타, 이벤트 칩) | `#102B47` / `#1B3D60` |
| `error` / `error-container` / `on-error-container` | 삭제, 에러 | `#B3261E` / `#F9DEDC` / `#7A1714` |
| `success` / `success-container` | 성공, paid (primary teal과 구분되는 leaf green) | `#177D53` / `#DDF3E4` |
| `warning` / `warning-container` | 경고, overdue/due-soon | `#B45309` / `#FBEFC9` |

PWA 크롬 정합: `viewport.themeColor` = `manifest.theme_color` = `manifest.background_color` = `#FAF7F2` (surface). shadcn `:root` 변수(`--primary`, `--border`, `--ring` 등)도 동일 팔레트의 hex로 일치시킴. 다크모드는 **토글 미제공 = 미지원** — `.dark` 블록은 브랜드 정합 placeholder일 뿐 프로덕션 경로 아님.

### 상태색 매핑 (invoice 기준, 앱 전역 재사용)

| 상태 | 배경 | 텍스트/보더 |
|------|------|-------------|
| paid | `bg-success-container` | `text-success` / `border-l-success` |
| overdue / due-soon | `bg-warning-container` | `text-warning` / `border-l-warning` |
| sent | `bg-primary/10` (또는 `surface-container-lowest`) | `text-primary` / `border-l-primary` |
| draft (칩) | `bg-surface-container-highest` (`STATUS_TONE_BG.neutral` 코드 기준) | `text-on-surface-variant` / `border-l-outline` |

상태색 정본 구현은 `lib/constants/status-colors.ts` (`STATUS_TONE_*` + `QUOTE/INVOICE/JOB_STATUS_TONE`) — 배지·리스트 카드·캘린더는 반드시 이 맵을 통해 사용(로컬 재정의 금지).

**실데이터 원칙**: 타임라인·meta·결제정보는 실데이터(`paid_date`, `payment_method`, `customer.email`)만 사용. Stripe 세부, 이메일 주소, BSB 같은 목업 더미값 생성·하드코딩 금지. `InvoiceKpiBand`의 `paid_this_month`는 `paid_date`의 **Sydney 월** 기준 `amount_paid_cents` 합으로 정의.

## Typography

- 서체: **Manrope 단일** (`--font-sans`, next/font, w400–800). Geist는 제거됨 — 재도입 금지
- 본문: `text-base` (16px) — 가독성 우선. input도 `text-base` (iOS 자동 줌 방지)
- 제목: `text-lg` ~ `text-2xl`, 페이지 타이틀 상한 `text-4xl` = **32px** (글로벌 스케일에서 2rem으로 재정의 — 유틸리티 앱 스케일)
- 숫자: **전역 `tabular-nums`** (body에 `font-variant-numeric` 적용됨) — 금액·날짜 컬럼 자동 정렬. 금액 강조는 `text-xl font-semibold`
- 송장번호: `font-mono tracking-[0.18em]` (시스템 mono 폴백 — 전용 mono 폰트 미로드)
- 마이크로 라벨(overline): 정본은 **`<SectionLabel>`** (`components/shared/SectionLabel.tsx` — `text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant`, `as` prop 지원). 기존 `text-[10px]~[11px]` 잔존분은 tracking `0.14em`/`0.18em` 2종만 허용, 신규 arbitrary px 추가 금지
- `h1`/`h2`는 전역 `text-wrap: balance`
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

Radius 베이스는 `--radius: 0.75rem` (12px) — `rounded-lg`=12px, `xl`≈17px, `2xl`≈22px로 소프트하게 스케일됨. 컴포넌트는 named radius만 사용(arbitrary 금지).

### z-index 레이어

| 레이어 | z-index |
|--------|---------|
| 폼 footer 액션 바 (`FormFooter`) | `z-30` |
| 모바일 탭바 / nav / 데스크탑 sidebar | `z-40` |
| 모달 · 오버레이 | `z-50` |
| Toast (`ToastProvider`) | `z-[100]` |

새 shared footer 적용 시 기존 `z-50` 모달을 낮추지 말 것. 데스크탑 sidebar는 `z-40` 하향 완료(2026-07-19) — 모달이 sidebar 위에 정상 렌더.

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
              application/ · domain/ · infrastructure/pdf/ (quote-template.tsx)
  invoices/   ui/ (InvoiceForm, InvoiceTable, InvoiceDetail, InvoiceKpiBand,
              InvoiceCreateScreen) · application/ · domain/ ·
              infrastructure/pdf/ (invoice-template.tsx)
  customers/  ui/ (CustomerForm, CustomerTable, CustomerDetail, CreateScreen) ·
              application/ · infrastructure/
  jobs/       ui/ (JobDetail, JobEditForm — JobsWorkspace는 삭제됨 2026-07-19) ·
              application/ · domain/
  schedule/   ui/ (ScheduleCalendar)
  assistant/  ui/ (WorkspaceAssistant)
  auth/       ui/ (AuthShell, *PageClient)
  onboarding/ ui/ (OnboardingForm)
  billing/    ui/ (UpgradePrompt) · application/
  materials/  ui/ (MaterialItemForm, MaterialItemList) · application/ · domain/
  price-rates/ ui/ (PriceRatesForm, QuickEstimateTab) · domain/
  settings/   ui/ (BusinessProfileForm, PricingSection, GoogleCalendarCard) ·
              application/ · domain/ · infrastructure/

components/
  ui/         → shadcn/ui primitives + ConfirmDialog, StatusBadge, toast, modal
                (button.tsx 死코드는 삭제됨 2026-07-19)
  forms/      → FormField, FormSection, FormFooter, GoogleAddressAutocomplete
  layout/     → PageHeader(+PrimaryActionLink/SecondaryActionLink), BackButton, BackLink
  shared/     → ErrorAlert, NumericInput, SectionLabel
  dashboard/  → Sidebar
  branding/   → BrandLogo
```

## Shared Form Primitives

세 폼(Quote/Invoice/Customer)의 입력·섹션·footer 스타일은 `components/forms/`로 통일:
- `FormField` — label + control + error 묶음. `input: h-12 rounded-xl border-outline-variant`, focus `border-primary` + `ring-primary/20`, error `text-error`.
- `FormSection` — `rounded-2xl border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6` 카드 래퍼.
- `FormFooter` — 고정 하단 액션 바. `z-30`, 모바일은 탭바 위(`bottom-[calc(4rem+...)]`), 태블릿/데스크탑은 sidebar offset(`md:left-60 lg:left-64`). Primary `h-14 bg-primary`, Secondary `h-14 border-outline-variant`.

폼별 inline `FIELD`/`LABEL`/`TEXTAREA` const는 폐기 — 위 프리미티브 사용. 컨테이너 너비는 Container Width Rules 준수(변경 금지).

## Design Rules

1. **shadcn/ui 수정 금지** — `components/ui/` 프리미티브 직접 편집하지 않음
2. **Tailwind만 사용** — 인라인 스타일 금지
3. **Server Action 패턴** — onClick에서 직접 Supabase 호출 금지
4. **상태 3종 필수** — 모든 비동기 UI에 loading/error/empty 상태 구현
5. **접근성** — aria-label, 키보드 네비게이션, 충분한 색상 대비

## Open Items

감사 정본·집행 현황은 **[`docs/features/audit/DESIGN-AUDIT-2026-07-12.md`](./features/audit/DESIGN-AUDIT-2026-07-12.md)** 참조. 2026-07-19 집행으로 `bg-white`/`text-outline`(텍스트)/네이티브 `alert()` **전부 0건** (예외: PDF 템플릿·global-error). 잔여 long-tail:

- **`types/database.ts` 재생성** — `quotes.customer_email/customer_address`가 생성 타입에 없어 call site들이 cast로 우회 중 (Codex, DB).
- **`QuickEstimateTab` → NumericInput 이관** — PriceRatesForm.test 12+ assertion 동반 수정 필요해 보류 (Codex).
- **JobDetail/jobs 로컬 status map 3곳 → StatusBadge 통합** + JobDetail overline 10곳 SectionLabel 이관 (디자인 판단 후 Codex).
- **PriceRatesForm 밀집 rate-matrix `rounded-lg`** — 의도적 밀도, 유지 판정. 재론 시 이 문서 갱신.
