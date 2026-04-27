# Rate Settings Redesign — Design & UX

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

| 행/열 | Refresh (1 coat) | Repaint (2 coats) | New Plaster (3 coats) |
|-------|-----------------|-------------------|----------------------|
| Walls | rate | rate | rate |
| Ceiling | rate | rate | rate |

- `New Plaster (3 coats)`는 `walls`, `ceiling`에만 노출
- 이 표는 rate/m² 기준의 coating matrix 역할

### 2. Trim Rates

`trim`은 별도 섹션으로 분리한다.

옵션:
- `Refresh (1 coat)`
- `Repaint (2 coats)`

- `trim`에는 `New Plaster (3 coats)`를 노출하지 않음
- trim은 skirting / trim metre pricing으로 연결 가능

### 3. Door Rates

현재 구조 유지:
- paint base / system별 unit price (Oil Base / Water Base)
- door type × scope 조합
- 문은 `new_plaster_3coat` 개념을 사용하지 않음

### 4. Window Rates

현재 구조 유지:
- paint base / system별 unit price
- window type × scope 조합
- 창문도 `new_plaster_3coat` 개념을 사용하지 않음

## Quote UX

### Quick Quote

상단 `Paint System` 라벨 개선:
- `Standard repaint (2 coats)`
- `New plaster (3 coats)`

trim 영역은 별도로 유지:
- `Trim Paint Base`: Oil Base / Water Base

### Interior Estimate Builder

현재 누락된 wall/ceiling coating selector를 추가한다.

위치: property/scope 설정 다음, room list 이전

필드:
- `Wall & Ceiling Coating`
  - Refresh (1 coat)
  - Repaint (2 coats)
  - New Plaster (3 coats)

trim / doors / windows는 coating selector를 공유하지 않는다.

### Quote Settings Link

`Quote` 화면에 작은 안내를 추가한다.
- `Using default rates from Price Rates`
- `Edit default rates` 링크
