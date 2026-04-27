# UI/UX 일관성 감사 및 디자인 시스템 통합 계획

## Context

Coatly는 호주 페인터를 위한 모바일 우선 PWA(Next.js 16 + Tailwind + Supabase). 감사 결과 두 디자인 시스템(레거시 `pm-*` 색상 vs. Material Design 토큰)이 공존하고, 페이지마다 헤더·상태 배지·폼 필드·버튼 스타일이 재구현되어 일관성이 깨져 있다.

---

## 1. 발견된 문제 요약

### A. 디자인 토큰 이원화
- `app/globals.css`에 Material Design 토큰과 레거시 `pm-teal`, `pm-coral`, `pm-border` alias가 공존.
- 코드베이스에 `pm-*` 클래스 참조 **1,282개**
- `/dashboard`는 Material Design 토큰, `/quotes/new`·`/invoices/new`는 `bg-pm-teal` 레거시.

### B. 컴포넌트 중복
- **상태 배지 매핑**이 3곳에 중복 정의: QuoteTable.tsx, InvoiceTable.tsx, QuoteStatusCard.tsx
- **폼 필드 스타일** 상수가 QuoteForm.tsx와 InvoiceForm.tsx에 동일 코드로 복제
- **페이지 헤더** 패턴이 /dashboard, /quotes, /quotes/new, /invoices/new 등에서 각자 재구현
- **Empty/Error state UI**가 페이지마다 다른 색상·레이아웃으로 구현

### C. 타이포그래피 hierarchy 불일치
- h1 크기가 페이지마다 다름:
  - `/dashboard`, `/quotes`: `text-3xl sm:text-4xl`
  - `/schedule`, `/invoices`: `text-[28px]`
  - `/quotes/new`: `text-2xl`
  - `/invoices/new`: `text-[22px]`
- 임의의 `text-[Npx]` 사용 → Tailwind 토큰 시스템 우회.

### D. 모바일/태블릿 사용성 이슈
- 터치 타겟 혼재: `h-10`(40px, 미달), `h-11`(44px, 최소), `min-h-12`(48px, 권장)
- `hidden md:grid` 헤더 사용 — 모바일 별도 레이아웃 없음
- `ScheduleCalendar.tsx` — `bg-pm-teal`/`bg-amber-400`/`bg-emerald-500` Tailwind 기본색 혼용

### E. 모바일 핵심 기능 가용성
- 모바일에서 quote line items 추가/삭제, invoice 작성 UX가 단순 desktop 폼을 그대로 보여줌.
- 모바일 전용 step 분리, sticky bottom action bar, 큰 터치 타겟 미적용.

---

## 2. 개선 계획

### Step 1 — 디자인 토큰 단일화
- Material Design 토큰만 사용. 레거시 `pm-*` 제거.
- `tailwind.config.ts`, `app/globals.css`에서 `pm-*` alias 정리
- 코드베이스 일괄 치환: `pm-teal` → `primary`, `pm-coral` → `error`, etc.

### Step 2 — 공통 컴포넌트 추출

신규 파일:
- `lib/constants/status-colors.ts` — quote/invoice/schedule 상태 → Material 토큰 매핑 단일 출처
- `components/ui/PageHeader.tsx` — 표준 헤더
- `components/ui/StatusBadge.tsx` — 상태 + 종류(quote/invoice/schedule) prop
- `components/ui/FormField.tsx` — label + input/textarea + error message
- `components/ui/EmptyState.tsx`, `components/ui/ErrorState.tsx`
- `components/forms/LineItemsEditor.tsx` — Quote와 Invoice가 공유하는 line items 편집기

### Step 3 — 타이포그래피 표준
- `app/globals.css`에 typography utility 정의: `h1` = `text-3xl sm:text-4xl font-bold`, etc.
- 모든 임의 `text-[Npx]` 제거. `PageHeader`가 h1 스타일 강제.

### Step 4 — 모바일 사용성 개선
- 모든 인터랙티브 요소 `min-h-11` 이상(주요 액션 `min-h-12`)
- 화면 하단 sticky action bar로 Save/Submit 배치
- Quote/Invoice 작성: 모바일은 `LineItemsEditor`의 카드형 레이아웃
- 테이블 목록: 모바일에서 카드, 데스크톱에서 테이블

### Step 5 — 잔여 정리
- inline style 제거 (Sidebar.tsx letterSpacing → Tailwind `tracking-tight`)
- `ScheduleCalendar`의 `amber-400`/`emerald-500` → status 토큰으로

---

## 3. 검증 방법
1. `npm run typecheck && npm run lint` 통과
2. `pm-` 클래스 참조 grep → 0건 (또는 Material 매핑 alias만 남김)
3. 데스크톱·태블릿(768px)·모바일(375px) viewport에서 각 페이지 시각 확인
4. 모바일에서 핵심 시나리오 end-to-end: 견적 작성→PDF, 인보이스 작성→발송

---

## 4. 단계적 실행 권장 순서

1. **Step 1** — 토큰 단일화 (mechanical)
2. **Step 2** — PageHeader → StatusBadge → FormField → LineItemsEditor 순
3. **Step 3** — Step 2 결과로 자동 일관성 확보
4. **Step 4** — 핵심 페이지부터: Quote 작성 → Invoice 작성 → Detail 페이지
5. **Step 5** — inline style/잔여 색상

각 단계 별도 PR 권장. Step 1·2 이후 시각 회귀 확인 시점.
