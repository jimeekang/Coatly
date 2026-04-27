# Google Calendar Integration — Overview & Design

*기준안: Option B — Google Calendar를 일정 source of truth로 사용*  
*작성일: 2026-04-20 | Phase 2*

→ 구현 단계: [calendar-phases.md](./calendar-phases.md)  
→ 테스트/리스크/MVP: [calendar-impl.md](./calendar-impl.md)

## 1. 목표

`Schedule` 화면에서 사용자가 Coatly 안에 직접 일정을 만들지 않아도 되도록 한다.

핵심 방향:
- 사용자는 평소 일정을 Google Calendar에서 관리한다.
- Coatly `Schedule`은 Google Calendar 이벤트를 읽어 보여준다.
- Coatly의 quote booking 흐름은 유지한다.
- 고객이 날짜를 예약하면 Coatly는 `job`을 생성하고 Google Calendar 이벤트도 자동 생성한다.
- `jobs`는 일정 입력 도구가 아니라 고객/견적/상태 추적용 업무 레코드로 재정의한다.

## 2. 왜 Option B인가

현재 Coatly는 단순 일정 보기 앱이 아니라 아래 흐름을 이미 가지고 있다:
- quote 승인 후 고객이 날짜 선택
- blocked dates 계산
- `jobs`를 통한 상태 관리
- customer / quote / job 연결

Option B는 다음 균형이 좋다:
- 사용자 경험: 직접 일정 입력을 안 해도 됨
- 정확도: 실제 사용하는 Google Calendar를 기준으로 표시/가용일 계산 가능
- 구현 리스크: 기존 `jobs`/booking 흐름을 완전히 갈아엎지 않아도 됨

## 3. Product Decision

**In Scope:**
- Google Calendar 연결/해제
- 연결된 캘린더 이벤트를 `Schedule` 페이지에 표시
- 선택된 캘린더 기준으로 blocked dates 계산
- quote booking 완료 시 Google Calendar 이벤트 자동 생성
- Coatly `job`과 Google event 연결

**Out of Scope:**
- Team scheduling
- 다수 작업자별 개인 캘린더 분배
- GPS / route planning
- supplier / accounting calendar sync

## 4. 성공 기준

- 사용자가 Google Calendar를 연결할 수 있다.
- `Schedule` 페이지에서 향후 일정을 Google 기반으로 볼 수 있다.
- 고객 예약 가능일 계산이 Google busy 상태를 반영한다.
- 고객이 날짜를 예약하면 Coatly `job`과 Google Calendar 이벤트가 함께 생성된다.

## 5. 현재 상태 요약

현재 구조:
- `app/(dashboard)/schedule/page.tsx`: `getJobs()` 기반 일정 목록
- `components/jobs/JobsWorkspace.tsx`: 수동 job 생성/수정 폼
- `app/actions/jobs.ts`: quote booking 시 `jobs` 생성 및 blocked dates 반환

현재 한계:
- 실제 현업 일정 source와 Coatly 일정이 분리됨
- 사용자가 일정 정보를 이중 입력해야 할 수 있음
- blocked dates 계산이 로컬 `jobs`만 기준이라 외부 일정 충돌을 반영하지 못함

## 6. 최종 UX

1. Settings에서 Google Calendar를 연결한다.
2. 어느 캘린더를 표시/가용일 계산 기준으로 쓸지 선택한다.
3. `Schedule` 페이지에서는 Google Calendar 일정이 보인다.
4. 고객이 공개 quote 링크에서 날짜를 선택하면 Coatly가:
   - 예약 가능 여부 확인 → `job` 생성 → Google Calendar 이벤트 생성
5. 이후 사용자는 Coatly에서 직접 schedule을 만들지 않는다.

## 7. 설계 원칙

1. Google을 일정 source로 사용하되, Coatly 비즈니스 레코드는 유지
2. 초기 범위는 1 user = 1 connected Google account
3. 처음에는 primary calendar 또는 단일 선택 calendar 중심으로 시작
4. 개인 일정 세부 제목은 고객-facing 흐름에 노출하지 않음
5. MVP는 polling/server fetch 중심, push sync는 후순위
6. OAuth scope는 최소 권한부터 시작하되, event 생성이 필요하면 쓰기 scope까지 포함

## 8. 데이터 모델

### `google_calendar_connections`

사용자별 Google Calendar 연결 정보 저장.

필드: `id`, `user_id`, `google_account_email`, `google_account_subject`, `encrypted_refresh_token`, `access_token_expires_at`, `granted_scopes`, `is_active`, `last_sync_at`, `last_sync_error`, `created_at`, `updated_at`

### `google_calendar_settings`

연결 후 사용자 설정 저장.

필드: `user_id`, `display_calendar_ids`, `availability_calendar_ids`, `event_destination_calendar_id`, `timezone`, `created_at`, `updated_at`

### `jobs` 확장 필드

- `google_calendar_event_id`
- `google_calendar_id`
- `schedule_source` (`manual`, `google_booking_sync`, `google_import`)

기존 `scheduled_date`, `start_date`, `end_date`는 유지.
