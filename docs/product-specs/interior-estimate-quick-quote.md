# Spec: Interior Estimate & Quick Quote

> 기술 구현 상세(계산 로직, 데이터 모델) → [`design-docs/quote-builder.md`](../design-docs/quote-builder.md)

## User Stories

> 페인터로서, 집 타입과 방 수만 입력하면 내부 도색 견적가를 빠르게 뽑고 싶다.

> 페인터로서, 현장에서 방별로 S/M/L 크기와 상태만 선택하면 상세 측정 없이도 견적서를 만들고 싶다.

## 두 가지 흐름

### 1. Interior Estimate Builder (전체 집 견적)

집 전체 또는 특정 구역을 대상으로 한 상세 견적 흐름.

1. 물건 유형 선택: Apartment (studio ~ 3bed) / House (1~3 storey)
2. 견적 모드 선택: 전체 집(`entire_property`) / 특정 구역(`specific_areas`)
3. 각 방별 scope 선택: 벽(walls), 천장(ceiling), 트림(trim)
4. 도어/윈도우 상세: 종류(standard/flush/panelled 등) × 범위(door_and_frame/door_only/frame_only)
5. 페인트 시스템 선택: 트림 — Oil Base / Water Base, 벽/천장 — Standard 2-coat / New Plaster 3-coat
6. 벽 상태(Condition): Excellent / Fair / Poor
7. 가격 자동 계산 → 견적서 저장

### 2. Quick Quote Builder (간편 현장 견적)

상세 측정 없이 S/M/L 크기와 상태만으로 빠르게 견적을 뽑는 흐름.

1. 방 추가: 방 이름 + 타입(Master Bedroom, Living Room 등) 선택
2. 방별 입력:
   - 크기: Small / Medium / Large
   - 상태: Good / Normal / Poor
   - scope 토글: walls / ceiling / trim
   - trim 포함 시: 도어 수/종류/범위, 윈도우 수/종류/범위, 스커팅 보드 여부
3. 페인트 시스템: 방별 트림 페인트 선택 (Oil / Water base)
4. 가격 자동 계산 → 견적서 저장

## Rate Settings (단가 설정)

페인터가 자신의 단가를 커스터마이즈하는 흐름.

1. `/settings/price-rates` 접근
2. `walls`, `ceiling`은 `Refresh (1 coat) / Repaint (2 coats) / New Plaster (3 coats)` 기준으로 단가 수정
3. `trim`, `doors`, `windows`는 별도 가격 체계로 관리
4. 저장 → 이후 모든 견적 계산에 반영

### 설계 결정

- 기본 rate preset 관리는 `Quote`가 아니라 `Price Rates`에서 수행
- `new_plaster_3coat`는 `walls`, `ceiling`에만 적용
- `trim`, `doors`, `windows`는 `new_plaster_3coat`를 사용하지 않음
- 사용자 라벨은 `Touch-up` 대신 `Refresh`로 표기

## Acceptance Criteria

- [ ] 집 타입 + 방 조합으로 자동 가격 계산 (anchor 가격 × 조건 보정)
- [ ] 방 크기 S/M/L → size_multiplier 자동 적용
- [ ] 상태(condition)에 따른 가격 보정 (poor → 높은 단가)
- [ ] GST 10% 자동 계산
- [ ] 계산 결과를 Quote로 저장 가능
- [ ] 저장된 Quote는 기존 Quote 워크플로우(draft → sent → accepted)를 따름
- [ ] 단가 미설정 시 config/paint-rates.ts 기본값 사용
- [ ] Pro 플랜 전용 기능 여부 표시

## Edge Cases

- 단가가 0으로 설정된 경우: 0으로 계산 허용 (의도적 설정 가능)
- 방이 0개인 경우: "방을 추가해주세요" 안내 + 저장 불가
- 도어/윈도우 수가 0인 경우: 트림 scope에서 자동 제외
