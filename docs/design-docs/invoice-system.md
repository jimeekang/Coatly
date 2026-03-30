# Design Doc: Invoice System

## Overview

견적서를 기반으로 청구서를 생성하거나, 독립적으로 청구서를 작성하는 시스템.

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

| Type | 용도 | 설명 |
|------|------|------|
| `full` | 전액 청구 | 기본, 전체 금액 한 번에 |
| `deposit` | 계약금 | 착수 전 일부 금액 |
| `progress` | 진행 청구 | 작업 진행 중 중간 청구 |
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
- Quote의 room/surface 데이터를 line item으로 변환
- `quote_id` 필드로 연결 관계 유지
- 변환 후에도 line item 수정 가능

## 부분 납부

`amount_paid_cents` 필드로 추적:
- 전액 납부: `amount_paid_cents === total_cents` → status = `paid`
- 부분 납부: `0 < amount_paid_cents < total_cents` → 잔액 표시
- 미납: `amount_paid_cents === 0`

## 설계 결정

### 왜 quote_id가 nullable?

모든 청구서가 견적서에서 시작하지 않는다.
정기 유지보수, 추가 작업 등은 견적 없이 직접 청구.

### 왜 invoice_type을 분리?

deposit → progress → final 순으로 분할 청구하는 패턴이 호주 페인팅 업계에서 일반적.
하나의 견적에서 여러 유형의 청구서를 생성할 수 있어야 함.
