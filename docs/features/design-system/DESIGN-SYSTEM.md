# Design System — Core Beliefs + UI Audit

Coatly 디자인 시스템의 단일 문서. 핵심 원칙(Core Beliefs) → UI 일관성 감사 → 통합 계획 순서.

> 디자인 철학(persona, 컬러 시스템, 컴포넌트 아키텍처)은 [`docs/DESIGN.md`](../../DESIGN.md), 프론트엔드 구현 패턴은 [`docs/FRONTEND.md`](../../FRONTEND.md), 가장 최근 일관성 감사 + 가드레일 기록은 [`docs/DESIGN_CONSISTENCY_AUDIT.md`](../../DESIGN_CONSISTENCY_AUDIT.md) 참조.

---

## 1. Core Design Beliefs

Coatly의 모든 설계 결정을 지배하는 원칙.

### 1.1 Cents, Not Dollars

모든 금액은 **정수(cents)** 로 저장. 부동소수점 오류 원천 차단.

```ts
// ✅
subtotal_cents: 150000  // = $1,500.00
gst_cents: 15000        // = $150.00
total_cents: 165000     // = $1,650.00

// ❌
total: 1500.00  // 부동소수점 오류 가능
```

GST 계산: `Math.round(subtotal_cents * 0.1)`

### 1.2 RLS Is Law

Row Level Security는 선택이 아닌 필수. DB 레벨에서 멀티테넌트 격리 강제.

- 모든 최상위 테이블: `user_id = auth.uid()`
- 자식 테이블: 부모 체인 EXISTS로 소유권
- Admin client: webhook + 번호생성 한정

### 1.3 Server-First

데이터 fetch는 항상 Server Component. Client Component는 인터랙션 전용.

- Server Component → Supabase 쿼리 (RLS 자동)
- Client Component → form 상태, 이벤트 핸들러
- Server Action → 데이터 변경 (insert / update / delete)

### 1.4 Mobile Is Default

"반응형"이 아니라 "모바일 퍼스트". 데스크톱은 보너스.

- 터치 타겟 44px+
- 핵심 CTA 화면 하단
- 숫자 입력 키패드 자동 전환
- 네트워크 불안정 대응 (loading/error)

### 1.5 Serverless Constraints

Vercel serverless 제약 수용.

- PDF: React-PDF만 (Puppeteer 금지 — 메모리/시간 초과)
- 이미지: Supabase Storage signed URL
- 장기 실행: edge function 또는 분할

### 1.6 Type Safety Over Speed

`any` 절대 금지. 타입 에러 즉시 수정.

- `types/database.ts`: Supabase CLI 자동 생성
- 도메인 타입: DB 타입과 분리, UI 로직 포함
- Zod validator: 런타임 입력 검증

---

## 2. UI/UX 일관성 감사 — 발견된 문제

Coatly = Next.js 16 + Tailwind + Supabase 모바일 우선 PWA. 감사 결과 두 디자인 시스템(레거시 `pm-*` ↔ Material Design 3 토큰) 공존 + 페이지마다 헤더·상태 배지·폼 필드·버튼이 재구현돼 일관성 훼손.

### 2.1 디자인 토큰 이원화

- `app/globals.css`에 MD3 토큰과 레거시 `pm-teal`, `pm-coral`, `pm-border` alias 공존
- 코드베이스에 `pm-*` 클래스 참조 **1,282개**
- `/dashboard`는 MD3 토큰, `/quotes/new`·`/invoices/new`는 `bg-pm-teal` 레거시

### 2.2 컴포넌트 중복

- **상태 배지 매핑** 3곳 중복: `QuoteTable.tsx`, `InvoiceTable.tsx`, `QuoteStatusCard.tsx`
- **폼 필드 스타일** 상수가 `QuoteForm.tsx`와 `InvoiceForm.tsx`에 동일 코드 복제
- **페이지 헤더** 패턴이 `/dashboard`, `/quotes`, `/quotes/new`, `/invoices/new` 등에서 각자 재구현
- **Empty/Error state UI**가 페이지마다 다른 색상·레이아웃

### 2.3 타이포그래피 hierarchy 불일치

`h1` 크기가 페이지마다 다름:
- `/dashboard`, `/quotes`: `text-3xl sm:text-4xl`
- `/schedule`, `/invoices`: `text-[28px]`
- `/quotes/new`: `text-2xl`
- `/invoices/new`: `text-[22px]`

임의의 `text-[Npx]` 사용 → Tailwind 토큰 시스템 우회.

### 2.4 모바일/태블릿 사용성

- 터치 타겟 혼재: `h-10` (40px, 미달), `h-11` (44px, 최소), `min-h-12` (48px, 권장)
- `hidden md:grid` 헤더 — 모바일 별도 레이아웃 없음
- `ScheduleCalendar.tsx` — `bg-pm-teal` / `bg-amber-400` / `bg-emerald-500` Tailwind 기본색 혼용

### 2.5 모바일 핵심 기능 가용성

모바일에서 quote line items 추가/삭제, invoice 작성이 단순 desktop 폼 그대로. 모바일 전용 step 분리, sticky bottom action bar, 큰 터치 타겟 미적용.

---

## 3. 개선 계획

### Step 1 — 디자인 토큰 단일화

- MD3만 사용, 레거시 `pm-*` 제거
- `tailwind.config.ts`, `app/globals.css`에서 `pm-*` alias 정리
- 코드베이스 일괄 치환:
  - `pm-teal` → `primary`
  - `pm-coral` → `error`
  - 등

### Step 2 — 공통 컴포넌트 추출

신규 파일:
- `lib/constants/status-colors.ts` — quote/invoice/schedule 상태 → MD3 토큰 단일 출처
- `components/ui/PageHeader.tsx` — 표준 헤더
- `components/ui/StatusBadge.tsx` — 상태 + kind(quote/invoice/schedule) prop
- `components/ui/FormField.tsx` — label + input/textarea + error
- `components/ui/EmptyState.tsx`, `components/ui/ErrorState.tsx`
- `components/forms/LineItemsEditor.tsx` — Quote와 Invoice 공유 line items 편집기

### Step 3 — 타이포그래피 표준

- `app/globals.css`에 typography utility: `h1` = `text-3xl sm:text-4xl font-bold` 등
- 임의 `text-[Npx]` 제거. `PageHeader`가 h1 스타일 강제

### Step 4 — 모바일 사용성

- 모든 인터랙티브 요소 `min-h-11` (주요 액션 `min-h-12`)
- 화면 하단 sticky action bar로 Save/Submit
- Quote/Invoice 작성: 모바일은 `LineItemsEditor` 카드형
- 테이블 목록: 모바일 카드, 데스크톱 테이블

### Step 5 — 잔여 정리

- inline style 제거 (Sidebar.tsx letterSpacing → Tailwind `tracking-tight`)
- `ScheduleCalendar`의 `amber-400`/`emerald-500` → status 토큰

### 검증 방법

1. `npm run typecheck && npm run lint` 통과
2. `pm-` 클래스 grep → 0건 (또는 MD3 매핑 alias만)
3. 데스크톱·태블릿(768px)·모바일(375px) viewport 시각 확인
4. 모바일 end-to-end: 견적 작성 → PDF, 인보이스 작성 → 발송

### 단계적 실행 순서

1. **Step 1** — 토큰 단일화 (mechanical)
2. **Step 2** — PageHeader → StatusBadge → FormField → LineItemsEditor 순
3. **Step 3** — Step 2 결과로 자동 일관성
4. **Step 4** — 핵심 페이지부터: Quote 작성 → Invoice 작성 → Detail
5. **Step 5** — inline style / 잔여 색상

각 단계 별도 PR. Step 1·2 이후 시각 회귀 확인 시점.

---

> 가장 최근 적용 기록(2026-05-10 P0+P1+P2)과 ESLint 가드레일 정책은 [`docs/DESIGN_CONSISTENCY_AUDIT.md`](../../DESIGN_CONSISTENCY_AUDIT.md) 후반부 "실행 기록" 섹션에서 확인.
