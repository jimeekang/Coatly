# Feature: Quote Builder

## User Stories

> 페인터로서, 현장에서 방별로 면적을 입력하면 자동으로 가격이 계산되고, 전문적인 PDF 견적서를 고객에게 보내고 싶다.

> 페인터로서, 집 타입과 방 수만 입력하면 내부 도색 견적가를 빠르게 뽑고 싶다.

## 두 가지 견적 모드

### 1. Interior Estimate Builder (전체 집 견적)

1. 물건 유형 선택: Apartment (studio ~ 3bed) / House (1~3 storey)
2. 견적 모드 선택: 전체 집(`entire_property`) / 특정 구역(`specific_areas`)
3. 각 방별 scope 선택: 벽(walls), 천장(ceiling), 트림(trim)
4. 도어/윈도우 상세: 종류(standard/flush/panelled 등) × 범위(door_and_frame/door_only/frame_only)
5. 페인트 시스템 선택: 트림 — Oil Base / Water Base, 벽/천장 — Standard 2-coat / New Plaster 3-coat
6. 벽 상태(Condition): Excellent / Fair / Poor
7. 가격 자동 계산 → 견적서 저장

### 2. Quick Quote Builder (간편 현장 견적)

1. 방 추가: 방 이름 + 타입(Master Bedroom, Living Room 등) 선택
2. 방별 입력:
   - 크기: Small / Medium / Large
   - 상태: Good / Normal / Poor
   - scope 토글: walls / ceiling / trim
   - trim 포함 시: 도어 수/종류/범위, 윈도우 수/종류/범위, 스커팅 보드 여부
3. 페인트 시스템: 방별 트림 페인트 선택 (Oil / Water base)
4. 가격 자동 계산 → 견적서 저장

## Rate Settings (단가 설정)

1. `/settings/price-rates` 접근
2. `walls`, `ceiling`은 `Refresh (1 coat) / Repaint (2 coats) / New Plaster (3 coats)` 기준으로 단가 수정
3. `trim`, `doors`, `windows`는 별도 가격 체계로 관리
4. 저장 → 이후 모든 견적 계산에 반영

- 기본 rate preset 관리는 `Quote`가 아니라 `Price Rates`에서 수행
- `new_plaster_3coat`는 `walls`, `ceiling`에만 적용
- 사용자 라벨은 `Touch-up` 대신 `Refresh`로 표기
- 상세 설계: [`rate-settings-design.md`](./rate-settings-design.md)

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

- `config/paint-rates.ts`에 면 종류 × 코팅 방식별 기본 단가 정의
- Complexity는 labour cost에 적용되는 배율

## 상태 워크플로우

```
draft → sent → approved
                 ↓
              rejected
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

## Acceptance Criteria

- [ ] 견적 번호 자동 채번 (QUO-0001, user별 unique)
- [ ] 방별 면적 자동 계산 (2 × (L+W) × H for 벽)
- [ ] GST 10% 자동 계산
- [ ] 금액은 AUD 포맷 ($1,234.56)
- [ ] PDF에 비즈니스 브랜딩 (로고, ABN, 연락처) 포함
- [ ] Starter 플랜 월 10건 제한
- [ ] 유효기간(valid_until) 기본 30일
- [ ] 집 타입 + 방 조합으로 자동 가격 계산 (anchor 가격 × 조건 보정)
- [ ] 방 크기 S/M/L → size_multiplier 자동 적용
- [ ] 단가 미설정 시 `config/paint-rates.ts` 기본값 사용

## Constraints

- 숫자 입력: `inputMode="numeric"` 필수
- 터치 타겟: 44px+ 필수
- 견적 수정은 draft 상태에서만 가능

## Edge Cases

- 단가가 0으로 설정된 경우: 0으로 계산 허용 (의도적 설정 가능)
- 방이 0개인 경우: "방을 추가해주세요" 안내 + 저장 불가
- 도어/윈도우 수가 0인 경우: 트림 scope에서 자동 제외

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
