# Coatly UI/UX 일관성 감사 및 디자인 시스템 통합 계획

## Context
Coatly는 호주 페인터를 위한 모바일 우선 PWA(Next.js 16 + Tailwind + Supabase). 감사 결과 두 디자인 시스템(레거시 `pm-*` 색상 vs. Material Design 토큰)이 공존하고, 페이지마다 헤더·상태 배지·폼 필드·버튼 스타일이 재구현되어 일관성이 깨져 있다. 또한 일부 모바일 터치 타겟이 40px(h-10)로 표준 미달이고, 견적/인보이스 작성 폼의 line items UX가 모바일에서 사용성이 떨어진다. 본 계획은 **(1) 발견한 모든 문제를 정리**하고 **(2) 단일 디자인 시스템·재사용 컴포넌트·모바일 핵심 기능 가용성**을 확보한다.

---

## 1. 발견된 문제 요약

### A. 디자인 토큰 이원화
- `app/globals.css`에 Material Design 토큰(`--color-primary`, `--color-on-surface` 등)과 레거시 `pm-teal`, `pm-coral`, `pm-border` alias가 공존.
- 코드베이스에 `pm-*` 클래스 참조 **1,282개** — 주로 폼/테이블 컴포넌트.
- 같은 페이지 그룹 내에서도 혼재: `/dashboard`는 Material Design 토큰, `/quotes/new`·`/invoices/new`는 `bg-pm-teal` 레거시.

### B. 컴포넌트 중복
- **상태 배지 매핑**이 3곳에 중복 정의: [QuoteTable.tsx:14-28](components/quotes/QuoteTable.tsx:14), [InvoiceTable.tsx:10-24](components/invoices/InvoiceTable.tsx:10), [QuoteStatusCard.tsx:4-10](components/quotes/QuoteStatusCard.tsx:4).
- **폼 필드 스타일** 상수가 [QuoteForm.tsx:65-69](components/quotes/QuoteForm.tsx:65)와 [InvoiceForm.tsx:10-14](components/invoices/InvoiceForm.tsx:10)에 동일 코드로 복제.
- **페이지 헤더**(제목+설명+액션) 패턴이 `/dashboard`, `/quotes`, `/quotes/new`, `/invoices/new` 등에서 각자 재구현.
- **Empty/Error state UI**가 페이지마다 다른 색상·레이아웃으로 구현([quotes/new/page.tsx:85-101](app/(dashboard)/quotes/new/page.tsx:85), [invoices/new/page.tsx:73-85](app/(dashboard)/invoices/new/page.tsx:73)).

### C. 타이포그래피 hierarchy 불일치
- h1 크기가 페이지마다 다름:
  - `/dashboard`, `/quotes`: `text-3xl sm:text-4xl`
  - `/schedule`, `/invoices`: `text-[28px]`
  - `/quotes/new`: `text-2xl`
  - `/invoices/new`: `text-[22px]`
- 임의의 `text-[Npx]` 사용 → Tailwind 토큰 시스템 우회.

### D. 모바일/태블릿 사용성 이슈
- 터치 타겟 혼재: `h-10`(40px, 미달), `h-11`(44px, 최소), `min-h-12`(48px, 권장).
- [InvoiceDetail.tsx:152](components/quotes/InvoiceDetail.tsx:152) — `hidden md:grid` 헤더, 모바일은 별도 레이아웃 없음.
- [Sidebar.tsx:112](components/dashboard/Sidebar.tsx:112) — inline `style={{ letterSpacing }}`.
- [ScheduleCalendar.tsx:49-61](components/schedule/ScheduleCalendar.tsx:49) — `bg-pm-teal`/`bg-amber-400`/`bg-emerald-500` Tailwind 기본색 혼용.

### E. 모바일 핵심 기능 가용성
- 모바일에서 **schedule 일정 추가/편집**, **quote line items 추가/삭제**, **invoice 작성** UX가 단순 desktop 폼을 그대로 보여줌. 모바일 전용 step 분리, sticky bottom action bar, 큰 터치 타겟 미적용.

---

## 2. 개선 계획

### Step 1 — 디자인 토큰 단일화
- **목표**: Material Design 토큰만 사용. 레거시 `pm-*` 제거.
- **작업**:
  - [tailwind.config.ts](tailwind.config.ts), [app/globals.css](app/globals.css)에서 `pm-*` alias 정리(또는 Material 토큰으로 매핑하는 임시 alias 유지).
  - 코드베이스 일괄 치환: `pm-teal` → `primary`, `pm-coral` → `error`, `pm-border` → `outline-variant`, `pm-secondary` → `secondary` 등.
  - `text-on-primary`, `bg-error-container`, `text-on-error-container` 등 Material on-color 토큰 활용.

### Step 2 — 공통 컴포넌트 추출
신규 파일 생성:
- `lib/constants/status-colors.ts` — quote/invoice/schedule 상태 → Material 토큰 매핑 단일 출처. `QuoteTable`, `InvoiceTable`, `QuoteStatusCard`에서 재사용.
- `components/ui/PageHeader.tsx` — `<PageHeader title description action backHref />` 표준 헤더. `/dashboard`, `/quotes*`, `/invoices*`, `/schedule`, `/customers`, `/settings` 적용.
- `components/ui/StatusBadge.tsx` — 상태 + 종류(quote/invoice/schedule) prop. 색상 매핑은 `status-colors.ts` 사용.
- `components/ui/FormField.tsx` — label + input/textarea + error message. 폼 필드 클래스 중앙화. `QuoteForm`·`InvoiceForm`·`CustomerForm`·`SettingsForm`에 적용.
- `components/ui/EmptyState.tsx`, `components/ui/ErrorState.tsx` — 일관된 빈/에러 UI.
- `components/forms/LineItemsEditor.tsx` — Quote와 Invoice가 공유하는 line items 편집기. 모바일 카드형/데스크톱 테이블형 둘 다 지원.

### Step 3 — 타이포그래피 표준
- `app/globals.css`에 typography utility 정의 또는 컴포넌트화: `h1` = `text-3xl sm:text-4xl font-bold tracking-tight`, `h2` = `text-2xl font-semibold`, `h3` = `text-lg font-semibold`.
- 모든 임의 `text-[Npx]` 제거. `PageHeader`가 h1 스타일 강제.

### Step 4 — 모바일 사용성 개선
- **공통 룰**: 모든 인터랙티브 요소 `min-h-11` 이상(주요 액션 `min-h-12`). 화면 하단 sticky action bar로 Save/Submit 배치.
- **Schedule** ([app/(dashboard)/schedule](app/(dashboard)/schedule)): 모바일에서 캘린더 + 리스트 토글, FAB로 일정 추가, 일정 편집 시트(bottom sheet) 사용.
- **Quote/Invoice 작성** ([components/quotes/QuoteForm.tsx](components/quotes/QuoteForm.tsx), [components/invoices/InvoiceForm.tsx](components/invoices/InvoiceForm.tsx)): 모바일은 `LineItemsEditor`의 카드형 레이아웃, 추가/삭제 버튼 큰 터치 타겟, 화면 하단 sticky "저장" 바.
- **InvoiceDetail/QuoteDetail**: `hidden md:grid` 대신 모바일 카드 레이아웃 명시적 구현.
- **테이블**: `/quotes`, `/invoices`, `/customers`, `/jobs` 리스트는 모바일에서 카드, 데스크톱에서 테이블(이중 렌더 또는 `md:` 분기).

### Step 5 — 잔여 정리
- inline style 제거(Sidebar.tsx letterSpacing → Tailwind `tracking-tight` 또는 globals.css).
- `ScheduleCalendar`의 `amber-400`/`emerald-500` → status 토큰으로.

---

## 3. 변경 대상 핵심 파일

**신규**
- `lib/constants/status-colors.ts`
- `components/ui/PageHeader.tsx`
- `components/ui/StatusBadge.tsx`
- `components/ui/FormField.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/ErrorState.tsx`
- `components/forms/LineItemsEditor.tsx`

**수정**
- `app/globals.css`, `tailwind.config.ts` — 토큰 정리
- `components/quotes/QuoteForm.tsx`, `QuoteTable.tsx`, `QuoteStatusCard.tsx`, `InvoiceDetail.tsx`
- `components/invoices/InvoiceForm.tsx`, `InvoiceTable.tsx`
- `components/schedule/ScheduleCalendar.tsx`, schedule 페이지들
- `components/dashboard/Sidebar.tsx`
- `app/(dashboard)/{dashboard,quotes,quotes/new,quotes/[id],invoices,invoices/new,schedule,customers,settings,price-rates,materials-service}/page.tsx`

---

## 4. 검증 방법
1. `npm run typecheck && npm run lint` 통과.
2. `pm-` 클래스 참조 grep → 0건(또는 Material 매핑 alias만 남김).
3. 데스크톱·태블릿(768px)·모바일(375px) viewport에서 각 페이지 시각 확인:
   - 헤더 크기·여백 동일
   - primary 버튼 동일 색
   - 상태 배지 동일 색 매핑
4. 모바일에서 핵심 시나리오 end-to-end 수행: 일정 추가→편집→삭제, 견적 작성(line items 5개 추가)→PDF, 인보이스 작성→발송.
5. 모든 인터랙티브 요소 터치 타겟 `>= 44px`(주요 `>= 48px`) DevTools로 확인.

---

## 5. 단계적 실행 권장 순서
1. **Step 1 (토큰 단일화)** — 일괄 치환, 비교적 mechanical.
2. **Step 2 (공통 컴포넌트)** — PageHeader → StatusBadge → FormField → LineItemsEditor 순.
3. **Step 3 (타이포그래피)** — Step 2 결과로 자동 일관성 확보.
4. **Step 4 (모바일 UX)** — 핵심 페이지부터: Schedule → Quote 작성 → Invoice 작성 → Detail 페이지.
5. **Step 5 (정리)** — inline style/잔여 색상.

각 단계 별도 PR 권장. Step 1·2 이후 시각 회귀 확인 시점.
