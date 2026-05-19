# Invoice UI Redesign — Component Spec

> **Source**: Coatly Design System bundle (`ui_kits/app/InvoicesPage.jsx`, `InvoiceDetailPage.jsx`, `styles.css`).
> **담당**: 이 문서 = Claude Code (UI/UX 스펙·디자인 결정). 구현 + DB/server action 통합 = Codex.
> **Status**: ✅ Implemented (2026-05-19) — Claude Code 직접 구현. `tsc`/`eslint` clean, invoice 테스트 16건 통과.
> **Date**: 2026-05-19

UI kit의 invoice 화면(list + detail)을 Coatly 앱에 적용. 디자인 번들은 자체 CSS 변수(`--brand-teal` 등)를 쓰지만, Coatly는 Material Design 3 토큰만 허용하므로 **모든 색·폰트는 아래 매핑 표대로 MD3 토큰으로 변환**한다. 인라인 스타일 금지 — Tailwind 클래스만.

---

## 1. 디자인 토큰 매핑 (필수)

번들 CSS 변수 → Coatly MD3 Tailwind 토큰. Codex는 이 표만 보고 변환한다.

| 번들 변수 | 의미 | Coatly Tailwind 토큰 |
|---|---|---|
| `--brand-teal` | primary accent / progress bar | `primary` (`bg-primary`, `text-primary`) |
| `--brand-navy` | chip active | `primary` (기존 InvoiceTable 칩과 동일) |
| `--success` / `--success-tint` | paid 상태 | `text-success` / `bg-success-container` |
| `--warning` / `--warning-tint` | overdue / due-soon | `text-warning` / `bg-warning-container` |
| `--info` / `--info-tint` | sent 상태 | `text-primary` / `bg-primary/10` |
| `--danger` | 위험 강조 | `text-error` |
| `--fg-1` | 본문 강조 텍스트 | `text-on-surface` |
| `--fg-2` | 보조 텍스트 | `text-on-surface-variant` |
| `--fg-3` | 약한 텍스트 / eyebrow | `text-outline` |
| `--paper-2` | 카드 보조 배경 | `bg-surface-container-low` |
| `--border-subtle` | 가는 구분선 | `border-outline-variant/60` |
| `--ink-100` | totals 굵은 구분선 | `border-outline-variant` |
| `--shadow-sm` | 카드 그림자 | `shadow-sm` (hover `shadow-md`) |
| `--font-mono` (invoice number) | 송장번호 monospace | `font-mono tracking-[0.18em]` |
| 본문/제목 | 일반 텍스트 | 기본 sans (Coatly 기본 폰트) |

**상태별 좌측 보더 / 배지** — 기존 `InvoiceTable.tsx`의 `INVOICE_LEFT_BORDER` / `INVOICE_STATUS_STYLES` 유지(이미 MD3 토큰). detail에도 동일 매핑 사용.

레거시 `pm-*` 토큰은 deprecated. 이번 작업에서 `InvoiceDetail.tsx`의 모든 `pm-*` 클래스를 MD3 토큰으로 교체한다 (CLAUDE.md 규칙).

---

## 2. 컴포넌트 A — `InvoiceKpiBand` (신규)

리스트 상단에 "This month" KPI 3-tile 밴드. 디자인 번들 `InvoiceKpis` 대응. **현재 Coatly 리스트에는 없음 → 신규 추가.**

### 파일
- `components/invoices/InvoiceKpiBand.tsx` (server component, 'use client' 불필요 — 순수 표시)
- 계산 헬퍼: `lib/invoices.ts`에 `summarizeInvoices()` 추가

### 타입 시그니처
```ts
// lib/invoices.ts
export interface InvoiceSummary {
  outstanding_cents: number;   // sent + overdue 의 balance_cents 합
  overdue_cents: number;       // overdue 의 balance_cents 합
  overdue_count: number;       // overdue 건수
  paid_this_month_cents: number; // status==='paid' && paid_date 가 이번 달(Sydney) 인 amount_paid_cents 합
}
export function summarizeInvoices(invoices: InvoiceListItem[]): InvoiceSummary;
```
```tsx
// components/invoices/InvoiceKpiBand.tsx
interface InvoiceKpiBandProps { summary: InvoiceSummary }
export function InvoiceKpiBand({ summary }: InvoiceKpiBandProps): JSX.Element
```

### 레이아웃 / 동작
- `page.tsx`에서 `summarizeInvoices(invoices)` 호출 → `<InvoiceKpiBand summary={...} />`를 `<InvoiceTable>` **위**에 렌더.
- eyebrow 라벨 `This month` — `text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline`.
- 3개 타일 grid: `grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5`.
- 타일 스펙:

| 타일 | label | value | hint | variant |
|---|---|---|---|---|
| 1 | `Outstanding` | `formatAUD(outstanding_cents)` | `Unpaid balance across sent & overdue invoices` | warning |
| 2 | `Overdue` | `formatAUD(overdue_cents)` | `{n} invoice(s) past due` / `Nothing past due — nice work.` | overdue_cents>0 → warning, else neutral |
| 3 | `Paid this month` | `formatAUD(paid_this_month_cents)` | `Settled invoices, Sydney time` | positive |

- 타일 클래스:
  - 공통: `rounded-xl border p-5`
  - warning variant: `bg-warning-container border-warning/20`, value `text-warning`
  - positive variant: `bg-success-container border-success/20`, value `text-success`
  - neutral variant: `bg-surface-container-low border-transparent`, value `text-on-surface`
  - value: `text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums` (모바일 `text-[26px]`)
  - label: `text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline mb-3.5`
  - hint: `mt-2 text-xs text-on-surface-variant`
- Coatly Dashboard에 KPI 타일 컴포넌트가 이미 있으면 재사용 검토(없으면 위 스펙대로 인라인). `components/ui/` 직접 수정 금지.

---

## 3. 컴포넌트 B — `InvoiceTable` 리스트 행 개선

기존 `components/invoices/InvoiceTable.tsx` 수정. 카드 리스트 구조·검색·상태칩은 유지. **3가지 변경:**

### B-1. 상대적 마감(due) 라벨 — tone 색상 적용
현재는 `Due {date}`만 표시. 디자인은 상대 표현 + tone 색. `lib/invoices.ts`에 헬퍼 추가:

```ts
export type InvoiceDueTone = 'paid' | 'overdue' | 'due-soon' | 'due';
export interface InvoiceDueLabel { tone: InvoiceDueTone; text: string }
// draft 또는 due_date 없음 → null
export function getInvoiceDueLabel(invoice: InvoiceListItem): InvoiceDueLabel | null;
```
규칙 (Sydney 기준 `getSydneyTodayDateString()` 사용, diff = 일 단위 반올림):
| 조건 | tone | text |
|---|---|---|
| `status==='paid'` | `paid` | `Paid · {formatDate(paid_date)}` |
| diff < 0 | `overdue` | `{n} day(s) overdue` |
| diff === 0 | `due-soon` | `Due today` |
| 1 ≤ diff ≤ 7 | `due-soon` | `Due in {n} day(s)` |
| diff > 7 | `due` | `Due {formatDate(due_date)}` |

표시 (행 meta 영역, `Created {date}` 옆/아래):
- icon: `overdue` → `alert-triangle`, 그 외 → `clock`
- 색: `overdue` → `text-error font-semibold`, `due-soon` → `text-warning font-semibold`, `paid`/`due` → `text-outline font-medium`

### B-2. 부분 결제 meta 라인 (신규)
`0 < amount_paid_cents < total_cents` 이면 행 meta에 한 줄 추가:
- icon `wallet`, 텍스트 `{formatAUD(amount_paid_cents)} of {formatAUD(total_cents)} received`
- 색 `text-on-surface-variant text-xs font-medium`

### B-3. 행 우측 금액 라벨
- `paid` 상태: 라벨 `Paid`, 값 `formatAUD(total_cents)`
- 그 외: 라벨 `Balance`, 값 `formatAUD(balance_cents)` (현행 유지)
- 값은 `tabular-nums`, `AUD` 접미사 `text-[10px] font-bold text-outline`.

> 카피 규칙: 라벨/문구는 모두 영어. 위 텍스트 그대로 사용.

---

## 4. 컴포넌트 C — `InvoiceDetail` 재설계

기존 `components/invoices/InvoiceDetail.tsx` 전면 개편. **모든 `pm-*` 토큰 → MD3 토큰 교체** + 디자인 번들 `InvoiceDetailPage` 구조 적용. 기능(send / mark-paid / delete / PDF / linked quote)은 **모두 보존**.

### 4-1. 헤더 (`detail-head`)
- 뒤로가기: 기존 라우팅 유지하되 `<BackButton href="/invoices" label="All invoices" />` 사용 (CLAUDE.md 규칙).
- eyebrow = `invoice_number`, `font-mono text-[10.5px] uppercase tracking-[0.18em] text-outline`.
- 제목 = `customer.name`, `text-[26px] font-extrabold tracking-[-0.02em]` (모바일 `text-[22px]`).
- 부제 = invoice type / 연결 견적 라벨 — `text-sm text-on-surface-variant`.
- 우측 액션: 상태 배지 + `PDF` (secondary) + primary CTA.

### 4-2. 결제 진행 밴드 `PaymentProgressBand` — **신규 시그니처 요소**
헤더 바로 아래 풀폭 카드. detail의 핵심.
```
[ Amount due  $X,XXX.XX AUD ]      [ Invoiced | Received | Due/Was due ]
[ ▓▓▓▓▓▓▓░░░░░░ progress bar (pct = amount_paid/total) ]
[ icon + status foot message ]
```
- 컨테이너: `rounded-2xl border border-l-4 p-6` (모바일 `rounded-xl p-4`)
- 상태별 톤:
  | status | 배경 | 좌측 보더 | Amount 색 |
  |---|---|---|---|
  | paid | `bg-success-container` | `border-l-success` | `text-success` |
  | overdue | `bg-warning-container` | `border-l-warning` | `text-warning` |
  | sent | `bg-surface-container-lowest` | `border-l-primary` | `text-on-surface` |
  | draft | `bg-surface-container-low` | `border-l-outline` | `text-on-surface` |
- `Amount due` 값 = `formatAUD(balanceCents)`, `text-[32px] font-extrabold tabular-nums` + `AUD` 접미사.
- meta 3칸: `Invoiced` = total_cents, `Received` = amount_paid_cents, `Due`/`Was due`(overdue) = due_date. 각 `k` 라벨 `text-[10.5px] uppercase tracking-[0.14em] text-outline`, `v` 값 `text-sm font-bold tabular-nums`.
- progress bar: 트랙 `h-1.5 rounded-full bg-outline-variant/40`, 채움 `bg-primary` (overdue → `bg-warning`, paid → `bg-success`), `width = pct%`, `aria-label="{pct}% of invoice paid"`.
- foot 메시지 (icon + 문구):
  | status | icon | 문구 |
  |---|---|---|
  | paid | `check-circle-2` | `Paid in full — settled on {due}` |
  | overdue | `alert-triangle` | `Past due since {due} — consider sending a reminder` |
  | sent | `clock` | `Awaiting payment — due {due}` |
  | draft | `pencil` | `Draft — not yet sent to customer` |

### 4-3. 본문 그리드
`grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5` — 모바일 1열.

**좌측 컬럼:**
- **Line items 카드**: 테이블 헤더 `Item / Qty / Rate / Amount`. 행: name(`font-semibold`) + sub(`text-xs text-outline`), 숫자열 `tabular-nums text-right`. 모바일은 Rate 열 숨김.
- **Totals**: `Subtotal` / `GST (10%)` / `Total`(굵게, `text-lg font-extrabold`, `AUD` 접미사). 상단 `border-t-2 border-outline-variant`.
- **Activity 타임라인 카드** `InvoiceActivityTimeline` — 신규. status에서 파생:
  - 항상: `Invoice created` (icon `file-plus`, tone neutral)
  - `status!=='draft'`: `Invoice sent` (icon `send`, tone info)
  - `status==='overdue'`: `Payment reminder` (icon `alert-triangle`, tone warning)
  - `status==='paid'`: `Payment received` (icon `check-circle-2`, tone success)
  - 부분결제(`0<paid<total`): `Part-payment received` (icon `wallet`, tone success)
  - 최신이 위. 각 항목: 점(dot, `h-7 w-7 rounded-full border`) + label(`text-[13.5px] font-bold`) + when(날짜, `text-[11.5px] text-outline tabular-nums`) + detail(`text-xs text-on-surface-variant`).
  - dot tone: success → `bg-success-container text-success`, warning → `bg-warning-container text-warning`, info → `bg-primary/10 text-primary`, neutral → `bg-surface-container-high text-on-surface-variant`.
  - **데이터 주의**: 디자인 번들의 timeline detail 문구(`Stripe · ...`, `Emailed to ...@example.com.au`, `BSB 062-002` 등)는 **목업 더미값**. 실제 구현은 invoice의 실데이터(`paid_date`, `payment_method`, `customer.email`)만 사용. 추정 이메일·은행정보 생성 금지.

**우측 컬럼 — meta 박스** (`rounded-xl bg-surface-container-low p-[18px]`):
- `Customer` (name + email + phone — 실데이터, 없으면 `—`)
- `Site address` (customer.address)
- `Dates` (Issued / Due 또는 Paid date)
- `Payment method` (있을 때만 — `PAYMENT_METHOD_LABEL` 사용. 은행정보 하드코딩 금지)
- 기존 `Quote Billing` / linked quote / notes / payment terms 섹션은 유지(MD3 토큰으로만 교체).

### 4-4. 액션 / mark-paid 폼
- primary CTA는 status별:
  - `paid` → `Download receipt` (secondary, icon `download`) — 기존 PDF 링크 재사용 가능
  - `draft` → `Send invoice` (primary, icon `send`)
  - `sent`/`overdue` → `Record payment` (primary, icon `wallet`)
- mark-paid 인라인 폼·`ConfirmDialog` 삭제 동작은 **현행 유지**. 폼 입력은 `min-h-11`, 날짜/금액 입력 `inputMode` 규칙 준수.

---

## 5. 모바일 케이스 (필수)

| 영역 | 모바일 동작 |
|---|---|
| KPI 밴드 | 3타일 → 1열 세로 스택, value `text-[26px]` |
| 상태 칩 | 가로 스크롤(`overflow-x-auto`, 스크롤바 숨김) — 현행 패턴 유지 |
| 리스트 행 | 현행 카드 레이아웃 유지, meta는 세로 스택 |
| detail 헤더 | 제목·배지·액션 세로 스택, CTA `flex-1` 풀폭 |
| 결제 진행 밴드 | meta 칸 2열 wrap, Amount `text-[26px]` |
| line items | Rate 열 숨김 (Item/Qty/Amount만) |
| 타임라인 | label/when 세로 정렬 |
| 핵심 CTA | 화면 하단·엄지 범위, 터치 타겟 `min-h-11` 이상 |

---

## 6. 범위 밖 / 오너 결정 필요

구현 전 확인할 항목 (Codex가 임의 결정하지 말 것):

1. **리스트의 날짜 필터 칩** (`All time / This month / 30d / 90d`) — 디자인 번들에는 없음. 제거할지 유지할지 오너 결정. **기본 권장: 유지** (KPI 밴드와 기능 중복 아님).
2. **리스트 행 인라인 mark-paid 폼** — 디자인 번들에는 없음(detail에서만 결제). 빠른 처리 UX이므로 **기본 권장: 유지**.
3. KPI `Paid this month` 의 "이번 달" 기준 = `paid_date`의 Sydney 월. `paid_date` 없으면 제외.

---

## 7. Codex 핸드오프 브리프

> Claude Code가 위 스펙을 확정함. 아래는 Codex 구현 작업 목록.

**구현 파일:**
1. `lib/invoices.ts` — `summarizeInvoices()`, `getInvoiceDueLabel()` 추가 (+ 유닛 테스트).
2. `components/invoices/InvoiceKpiBand.tsx` — 신규.
3. `app/(dashboard)/invoices/page.tsx` — `InvoiceKpiBand` 렌더 추가.
4. `components/invoices/InvoiceTable.tsx` — due 라벨 tone·부분결제 meta·금액 라벨(§3).
5. `components/invoices/InvoiceDetail.tsx` — 전면 개편(§4), 모든 `pm-*` → MD3 토큰.
6. (선택) `components/invoices/PaymentProgressBand.tsx`, `InvoiceActivityTimeline.tsx` 로 분리 가능.

**제약:**
- 인라인 스타일 금지 → Tailwind만. MD3 토큰만(§1). `pm-*` 신규 사용 금지.
- 금액 cents 정수, `formatAUD`/`formatDate` 재사용. `any` 금지.
- 타임라인·meta는 실데이터만 — 디자인 번들의 더미 문자열 복제 금지.
- 모든 쿼리 RLS(`auth.uid()`) 유지. mark-paid/send/delete는 기존 server action 그대로.
- 검증: `npx tsc --noEmit` + `npx eslint` (변경 파일) + 기존 테스트 통과.
