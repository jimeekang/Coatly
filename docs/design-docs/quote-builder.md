# Design Doc: Quote Builder

> 사용자 스토리·수용 기준 → [`product-specs/quote-workflow.md`](../product-specs/quote-workflow.md)

## Overview

페인터가 현장에서 방별로 도색 면적을 입력하면 자동으로 가격을 계산하고 PDF 견적서를 생성하는 시스템.

## Data Model

```
Quote (견적서)
  ├── QuoteRoom (방/구역) × N
  │     ├── name: "Living Room"
  │     ├── room_type: interior | exterior
  │     ├── dimensions: length × width × height(m)
  │     └── QuoteRoomSurface (도색 면) × N
  │           ├── surface_type: walls | ceiling | trim | doors | ...
  │           ├── area_sqm: 자동 계산 or 수동 입력
  │           ├── coating_type: refresh_1coat | repaint_2coat | ...
  │           ├── complexity: standard | moderate | complex
  │           ├── rate_per_sqm_cents: 단가 (base × complexity multiplier)
  │           ├── material_cost_cents, labour_cost_cents
  │           └── paint_litres_needed: 필요 도료량
  └── Totals
        ├── subtotal_cents (GST 제외)
        ├── gst_cents (= subtotal × 10%)
        └── total_cents
```

## 가격 티어 시스템

| Complexity | 의미 | Labour multiplier |
|------------|------|-------------------|
| Standard | 일반 조건 (쉬운 접근, 양호한 표면) | 1.0× (기준) |
| Moderate | 일부 어려움 (2층, 소규모 prep, 좁은 공간) | 1.25× |
| Complex | 난이도 높음 (비계, 대규모 prep, 헤리티지, 고천장) | 1.5× |

- Complexity는 **labour cost에 적용되는 배율**로, 같은 면적·코팅이어도 현장 조건에 따라 단가가 달라짐
- `config/paint-rates.ts`에 면 종류 × 코팅 방식별 기본 단가 정의
- 사용자가 단가 커스터마이즈 가능
- 사용자 용어는 `Touch-up` 대신 `Refresh`를 사용하고, `New Plaster (3 coats)`는 walls/ceiling 전용으로 제한

## 상태 워크플로우

```
draft → sent → accepted
                 ↓
              declined
                 ↓
              expired (valid_until 지나면 자동)
```

## 핵심 계산 로직

위치: `lib/quotes.ts`, `utils/calculations.ts`

```ts
// 면적 자동 계산 (벽)
wallArea = 2 × (length + width) × height

// GST
gst_cents = Math.round(subtotal_cents * 0.1)

// 합계
total_cents = subtotal_cents + gst_cents
```

## 설계 결정

### 왜 Room → Surface 2단계 구조?

페인터는 "거실 벽, 거실 천장, 거실 트림"처럼 방 단위로 작업한다.
한 방에 여러 면이 있고, 각 면의 코팅/단가가 다르다.
플랫 구조(quote → items)로는 이 관계를 표현할 수 없다.

### 왜 cents 정수?

$1,500.50 + $2,300.75 같은 계산에서 부동소수점 오류 방지.
모든 금액을 cents로 저장하고 표시 시에만 /100 변환.

### 왜 마진을 별도 필드로?

페인터마다 인건비/자재비 마진이 다르다.
`labour_margin_percent`, `material_margin_percent`를 분리하여 유연하게 조정.
