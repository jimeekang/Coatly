# Feature: Invoice System

> Owner: **Shared** — 기획 판단: Claude(Opus 4.8·extra) · 구현 사실: Codex(high).

## User Story

> 페인터로서, 견적서를 승인받은 후 청구서를 생성하고, 고객의 결제 상태를 추적하고 싶다.

## Flow

1. 견적 approved → "Create Invoice" 버튼
2. 또는 `/invoices/new` → 독립 청구서 생성
3. Line item 입력/수정
4. 저장 (draft) → PDF 미리보기 → 발송 (sent)
5. 결제 추적: partial → paid | overdue

## Data Model

```
Invoice (청구서)
  ├── customer_id → Customer
  ├── quote_id → Quote (nullable, 견적 없이도 생성 가능)
  ├── invoice_number: "INV-0001" (user별 UNIQUE)
  ├── invoice_type: full | deposit | progress | final
  ├── status: draft | sent | paid | overdue | cancelled
  ├── subtotal_cents, gst_cents, total_cents
  ├── amount_paid_cents (부분 납부 추적)
  ├── due_date, paid_at
  └── InvoiceLineItem × N
        ├── description, quantity, unit_price_cents
        ├── gst_cents, total_cents
        └── sort_order
```

## 청구서 유형

| Type | 용도 | Flow |
|------|------|------|
| `full` | 전액 청구 | 견적 전액 → 1장 |
| `deposit` | 계약금 | 착수금 (보통 30-50%) |
| `progress` | 진행 청구 | 중간 작업 완료 시 |
| `final` | 잔금 | 작업 완료 후 나머지 금액 |

## 상태 워크플로우

```
draft → sent → paid
          ↓
        overdue (due_date 초과)
          ↓
       cancelled
```

## 견적서 → 청구서 변환

견적서 accept 후 "Create Invoice" 버튼으로 변환:
- Quote의 approved total을 설명할 수 있는 invoice line item으로 변환
- base quote scope가 `quote_line_items`에 없으면 base scope invoice line을 생성
- selected optional add-on만 invoice에 포함하고, unselected optional add-on은 제외
- quote discount/manual adjustment가 있으면 approved quote total과 invoice preset total이 달라지지 않도록 단일 parity-safe line 또는 명확한 block message를 사용
- `quote_id` 필드로 연결 관계 유지
- 변환 후에도 line item 수정 가능

관련 계산 규칙은 [QUOTE.md](../quote/QUOTE.md)의 "Pricing & Data Contracts" — Canonical Money Contract의 quote-to-invoice parity 기준을 따른다.

## 부분 납부

`amount_paid_cents` 필드로 추적:
- 전액 납부: `amount_paid_cents === total_cents` → status = `paid`
- 부분 납부: `0 < amount_paid_cents < total_cents` → 잔액 표시
- 미납: `amount_paid_cents === 0`

## UI / Screens

Design System UI kit 기준으로 invoice list/detail/new 화면 재설계 적용 (2026-05-19, 구현 완료). 컴포넌트는 `modules/invoices/ui/`, 집계 헬퍼는 `modules/invoices/domain/invoices.ts`.

### Invoices list (`/invoices`)
- **KPI 밴드** (`modules/invoices/ui/InvoiceKpiBand.tsx`) — "This month" 3-tile: Outstanding(sent+overdue 잔액) / Overdue(연체 잔액 + 건수) / Paid this month. 집계는 `summarizeInvoices()` (`modules/invoices/domain/invoices.ts`).
- **카드 행** (`modules/invoices/ui/InvoiceTable.tsx`) — 상대적 due 라벨(`getInvoiceDueLabel()`, 같은 domain 파일): `7 days overdue` · `Due in 3 days` · `Due today` · `Paid · {date}`, tone 색상(overdue=error, due-soon=warning). 부분 결제 시 `{paid} of {total} received` 라인. 우측 금액 라벨은 paid면 `Paid`/총액, 그 외 `Balance`/잔액.

### Invoice detail (`/invoices/[id]`)
- **헤더** (`modules/invoices/ui/InvoiceDetail.tsx`) — invoice number(mono eyebrow) + 고객명 제목 + 상태 배지 + PDF CTA. paid 상태는 `PDF` + `Download receipt` 2버튼, draft는 Send/Edit, sent·overdue는 Record payment.
- **결제 진행 밴드** — Amount due 큰 숫자 + Invoiced/Received/Due meta + 진행 바 + 상태별 안내 문구.
- **Activity 타임라인** — 생성/발송/연체/입금 이벤트. status·실데이터에서만 파생(추정값 생성 안 함).

### New / Edit invoice (`/invoices/new`, `/invoices/[id]/edit`, `modules/invoices/ui/InvoiceForm.tsx`)
- 헤더는 detail과 동일 패턴 + `text-[22px]/sm:text-[26px]` 제목. 폼 상단에는 mono invoice number eyebrow + 상태 배지 strip.
- 섹션 카드 통일 — `rounded-2xl border-outline-variant/60 bg-surface-container-lowest p-5 sm:p-6`.
- **Invoice type** — 4-카드 grid picker (`grid-cols-2 sm:grid-cols-4`), 선택 시 `border-primary bg-primary/[0.06] ring-primary/20`.
- **Payment method** — 카드 grid picker, paid 상태/값 있을 때만 노출.
- **Amount due 요약 레일** — 우측 sticky `bg-primary text-on-primary` 패널. `xl` 미만에서는 하단 stack.
- Progress percent는 number input + quick % 버튼(25/50/75/100).

### UI 스펙 (REDESIGN-SPEC에서 이관)

삭제 예정 `INVOICE-UI-REDESIGN-SPEC.md`의 살아있는 규칙만 흡수:

- **상태색 매핑 (MD3 토큰만)**: paid → `text-success`/`bg-success-container`, overdue·due-soon → `text-warning`/`bg-warning-container`, sent → `text-primary`/`bg-primary/10`, 위험 강조 → `text-error`. detail의 결제 진행 밴드 좌측 보더도 동일 tone(paid=`border-l-success`, overdue=`border-l-warning`, sent=`border-l-primary`, draft=`border-l-outline`). 인라인 스타일 금지, Tailwind MD3 토큰만. 레거시 `pm-*` 토큰 제거 완료.
- **실데이터만 원칙**: Activity 타임라인·meta 박스는 invoice 실데이터(`paid_date`, `payment_method`, `customer.email`)만 사용. 디자인 번들의 목업 문구(`Stripe · …`, 예시 이메일, `BSB 062-002` 등 은행정보)는 추정 생성 금지.
- **`Paid this month` 정의**: `status==='paid'` && `paid_date`가 이번 달(Sydney 기준, `getSydneyTodayDateString()`)인 `amount_paid_cents` 합. `paid_date` 없으면 제외.
- 터치 타겟 `min-h-11` 유지, 모바일에서 line items 테이블은 Rate 열 숨김, KPI 밴드는 1열 세로 스택.

## Acceptance Criteria

- [x] 청구서 번호 자동 채번 (INV-0001, user별 unique)
- [x] 견적서에서 변환 시 line item 자동 생성
- [x] 부분 납부 추적 (`amount_paid_cents`)
- [x] 기한 초과 시 overdue 상태 resolve
- [x] PDF에 은행 정보 포함
- [x] GST 10% 자동 계산
- [x] 고객 이메일 발송 + public PDF token
- [x] due soon/overdue reminder cron 멱등성
- [x] quote base scope invoice line 생성
- [x] selected optional add-on만 invoice preset에 포함
- [x] quote discount는 parity-safe single line으로 처리
- [x] manual adjustment quote는 preset 생성 차단 메시지 표시

## Remaining Work

- [ ] PDF/public quote까지 포함한 end-to-end total parity 회귀 테스트
- [ ] manual adjustment를 invoice에서 과세/비과세 조정 row로 지원할지 별도 decision
- [ ] Invoice reminder 실패/재시도 운영 UI
- [ ] 저장 원자성 RPC 검토

## Payment Terms

기본: 14일 (`profiles.default_payment_terms` — integer, 일 단위)
사용자가 Settings에서 커스터마이즈 가능

## 설계 결정

### 왜 quote_id가 nullable?

모든 청구서가 견적서에서 시작하지 않는다.
정기 유지보수, 추가 작업 등은 견적 없이 직접 청구.

### 왜 invoice_type을 분리?

deposit → progress → final 순으로 분할 청구하는 패턴이 호주 페인팅 업계에서 일반적.
하나의 견적에서 여러 유형의 청구서를 생성할 수 있어야 함.
