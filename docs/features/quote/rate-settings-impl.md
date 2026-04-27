# Rate Settings Redesign — Data Model & Implementation

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

## Calculation Rules

### Walls / Ceiling

선택한 coating에 따라 직접 해당 rate를 사용해야 한다.

- Refresh → refresh rate
- Repaint → repaint rate
- New Plaster → new plaster rate

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

1. 기본값 관리는 `Price Rates`
2. `new_plaster_3coat`는 `walls`, `ceiling` 전용
3. `trim`, `doors`, `windows`는 별도 가격 체계 유지
4. 사용자 라벨은 `Refresh / Repaint / New Plaster`
5. `Quote`는 설정 편집이 아니라 설정 소비자 역할만 담당
