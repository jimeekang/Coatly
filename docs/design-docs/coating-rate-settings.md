# Coating Rate Settings Redesign

## Goal

Surface type별 기본 rate/m² 설정을 더 명확하게 관리한다.

- `walls`, `ceiling`은 coating type 중심으로 관리
- `trim`, `doors`, `windows`는 별도 가격 체계로 분리
- 기본값 관리는 `Quote`가 아니라 `Price Rates`에서 수행
- 사용자 용어는 `Touch-up` 대신 `Refresh`로 표기

## Decision

기본 rate preset 관리 화면은 `Price Rates`로 유지한다.

- `Price Rates`는 business-level default 설정의 source of truth
- `Quote`는 해당 기본값을 읽어 견적 계산에만 사용
- `Quote` 안에서는 read-only 안내와 settings 이동 링크만 제공

## Why

`Quote`에서 기본 단가를 수정하면 아래 문제가 생긴다.

- 이번 견적만 바꾸는 것인지, 전체 기본값을 바꾸는 것인지 모호함
- 견적 저장과 설정 저장이 한 흐름에 섞임
- 같은 설정 UI를 `Quote`와 `Price Rates` 양쪽에 중복 구현해야 함
- 실수로 글로벌 단가를 변경할 위험이 큼

`Price Rates`는 이미 아래 책임을 갖고 있다.

- 새 견적의 기본 pricing method 저장
- day rate / room rate preset 저장
- 문/창문 unit rate 저장
- `businesses.default_rates`에 business-level 설정 저장

## Terminology

사용자에게 보이는 coating type 라벨은 아래처럼 정리한다.

- `Refresh (1 coat)`
- `Repaint (2 coats)`
- `New Plaster (3 coats)`

주의:

- 내부 키는 당장은 유지 가능
- UI 라벨만 먼저 `Refresh`로 변경
- 내부 키 리네임은 별도 refactor로 분리

## Information Architecture

### 1. Surface Rates

`walls`, `ceiling` 전용 표로 관리한다.

행:

- Walls
- Ceiling

열:

- Refresh (1 coat)
- Repaint (2 coats)
- New Plaster (3 coats)

설명:

- `New Plaster (3 coats)`는 `walls`, `ceiling`에만 노출
- 이 표는 rate/m² 기준의 coating matrix 역할

### 2. Trim Rates

`trim`은 별도 섹션으로 분리한다.

옵션:

- `Refresh (1 coat)`
- `Repaint (2 coats)`

설명:

- `trim`에는 `New Plaster (3 coats)`를 노출하지 않음
- trim은 skirting / trim metre pricing으로 연결 가능

### 3. Door Rates

현재 구조 유지:

- paint base / system별 unit price
- door type × scope 조합

사용자 라벨:

- Oil Base
- Water Base

설명:

- 문은 `new_plaster_3coat` 개념을 사용하지 않음
- 문 가격은 coating matrix가 아니라 unit pricing 체계

### 4. Window Rates

현재 구조 유지:

- paint base / system별 unit price
- window type × scope 조합

설명:

- 창문도 `new_plaster_3coat` 개념을 사용하지 않음

## Quote UX

### Quick Quote

상단 `Paint System` 라벨을 아래처럼 명확히 한다.

- `Refresh / Repaint`
- `New Plaster (3 coats)`

또는 초기 단계에서는 현재 2-option 구조를 유지하되 문구만 개선한다.

- `Standard repaint (2 coats)`
- `New plaster (3 coats)`

trim 영역은 별도로 유지한다.

- `Trim Paint Base`
- Oil Base / Water Base

### Interior Estimate Builder

현재 누락된 wall/ceiling coating selector를 추가한다.

위치:

- property/scope 설정 다음
- room list 이전

필드:

- `Wall & Ceiling Coating`
  - Refresh (1 coat)
  - Repaint (2 coats)
  - New Plaster (3 coats)

trim / doors / windows는 coating selector를 공유하지 않는다.

### Quote Settings Link

`Quote` 화면에 작은 안내를 추가한다.

- `Using default rates from Price Rates`
- `Edit default rates`

## Data Model Recommendation

목표는 semantic mismatch를 줄이는 것이다.

### Preferred shape

```ts
surface_rates: {
  walls: {
    refresh_1coat: number;
    repaint_2coats: number;
    new_plaster_3coats: number;
  };
  ceiling: {
    refresh_1coat: number;
    repaint_2coats: number;
    new_plaster_3coats: number;
  };
  trim: {
    refresh_1coat: number;
    repaint_2coats: number;
  };
}
```

별도 유지:

```ts
door_unit_rates
window_unit_rates
pricing
room_rate_presets
```

### Transitional compatibility

1차 구현에서는 DB shape를 크게 바꾸지 않아도 된다.

- 기존 `businesses.default_rates` 유지
- UI에서만 `walls`, `ceiling`, `trim`을 다르게 렌더링
- `trim.new_plaster_3coat`, `doors.new_plaster_3coat`, `windows.new_plaster_3coat`는 더 이상 UI에 노출하지 않음
- 계산 로직도 실제로 필요한 항목만 읽도록 정리

즉, 단계적으로 간다.

## Calculation Rules

### Walls / Ceiling

선택한 coating에 따라 직접 해당 rate를 사용해야 한다.

- Refresh → refresh rate
- Repaint → repaint rate
- New Plaster → new plaster rate

중요:

현재 quick quote의 `new_plaster_3coat = 1.2x multiplier` 방식은 임시 구조다.
최종 구조에서는 multiplier가 아니라 직접 rate table을 읽는 것이 더 일관적이다.

### Trim

- Refresh / Repaint만 사용
- `New Plaster (3 coats)` 없음

### Doors / Windows

- unit rate 체계 사용
- paint base 기준 유지
- coating matrix와 섞지 않음

## Implementation Plan

### Phase 1. UX 정리

- `Touch-up` → `Refresh` 라벨 변경
- `Price Rates`에서 `Surface Rates`를 `walls`, `ceiling`, `trim` 기준으로 재배치
- `New Plaster (3 coats)`를 `walls`, `ceiling`에만 노출
- `Quote`에 `Edit default rates` 링크 추가

### Phase 2. Quote 선택지 정리

- `Quick Quote` wall/ceiling coating 라벨 개선
- `Interior Estimate Builder`에 wall/ceiling coating selector 추가
- trim/door/window는 기존 base selector 체계 유지

### Phase 3. 계산 로직 정리

- quick quote에서 `new_plaster`를 multiplier가 아니라 명시적 coating 선택으로 정리
- interior estimate가 실제 coating별 surface rate를 직접 참조하도록 보정
- 불필요한 `new_plaster_3coat` 참조를 trim/door/window 경로에서 제거

### Phase 4. Optional refactor

필요 시 내부 키 리네임:

- `touch_up_2coat` → `refresh_1coat`
- `repaint_2coat` → `repaint_2coats`
- `new_plaster_3coat` → `new_plaster_3coats`

이 단계는 영향 범위가 크므로 별도 작업으로 분리한다.

## Recommendation Summary

최종 추천안은 아래와 같다.

1. 기본값 관리는 `Price Rates`
2. `new_plaster_3coat`는 `walls`, `ceiling` 전용
3. `trim`, `doors`, `windows`는 별도 가격 체계 유지
4. 사용자 라벨은 `Refresh / Repaint / New Plaster`
5. `Quote`는 설정 편집이 아니라 설정 소비자 역할만 담당
