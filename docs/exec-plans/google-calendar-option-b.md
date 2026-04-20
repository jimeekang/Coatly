# Google Calendar Integration — Option B Execution Plan

> 기준안: **Option B — Google Calendar를 일정 source of truth로 사용하고, Coatly는 booking/job 운영 시스템으로 유지**
> 작성일: 2026-04-20
> 관련 Phase: Phase 2

## 1. 목표

`Schedule` 화면에서 사용자가 Coatly 안에 직접 일정을 만들지 않아도 되도록 한다.

핵심 방향:

- 사용자는 평소 일정을 Google Calendar에서 관리한다.
- Coatly `Schedule`은 Google Calendar 이벤트를 읽어 보여준다.
- Coatly의 quote booking 흐름은 유지한다.
- 고객이 날짜를 예약하면 Coatly는 `job`을 생성하고 Google Calendar 이벤트도 자동 생성한다.
- `jobs`는 일정 입력 도구가 아니라 고객/견적/상태 추적용 업무 레코드로 재정의한다.

## 2. 왜 Option B인가

현재 Coatly는 단순 일정 보기 앱이 아니라 아래 흐름을 이미 가지고 있다.
ㅐ
- quote 승인 후 고객이 날짜 선택
- blocked dates 계산
- `jobs`를 통한 상태 관리
- customer / quote / job 연결

즉, `Schedule`만 Google Calendar로 바꾸는 것은 쉬우나, `jobs`를 바로 제거하면 예약 가능일 계산과 상태 추적이 깨질 수 있다.

Option B는 다음 균형이 좋다.

- 사용자 경험: 직접 일정 입력을 안 해도 됨
- 정확도: 실제 사용하는 Google Calendar를 기준으로 표시/가용일 계산 가능
- 구현 리스크: 기존 `jobs`/booking 흐름을 완전히 갈아엎지 않아도 됨

## 3. Product Decision

### In Scope

- Google Calendar 연결/해제
- 연결된 캘린더 이벤트를 `Schedule` 페이지에 표시
- 선택된 캘린더 기준으로 blocked dates 계산
- quote booking 완료 시 Google Calendar 이벤트 자동 생성
- Coatly `job`과 Google event 연결

### Out of Scope

- Team scheduling
- 다수 작업자별 개인 캘린더 분배
- GPS / route planning
- supplier / accounting calendar sync
- native mobile calendar deep integration

## 4. 성공 기준

아래가 만족되면 1차 성공으로 본다.

- 사용자가 Google Calendar를 연결할 수 있다.
- `Schedule` 페이지에서 향후 일정을 Google 기반으로 볼 수 있다.
- 고객 예약 가능일 계산이 Google busy 상태를 반영한다.
- 고객이 날짜를 예약하면 Coatly `job`과 Google Calendar 이벤트가 함께 생성된다.
- 사용자는 Coatly에서 별도 일정 입력을 거의 하지 않는다.

## 5. 현재 상태 요약

현재 구조:

- [app/(dashboard)/schedule/page.tsx](/Users/jimee/Desktop/Project/Coatly/app/(dashboard)/schedule/page.tsx): `getJobs()` 기반 일정 목록
- [components/jobs/JobsWorkspace.tsx](/Users/jimee/Desktop/Project/Coatly/components/jobs/JobsWorkspace.tsx): 수동 job 생성/수정 폼
- [app/actions/jobs.ts](/Users/jimee/Desktop/Project/Coatly/app/actions/jobs.ts): quote booking 시 `jobs` 생성 및 blocked dates 반환

현재 한계:

- 실제 현업 일정 source와 Coatly 일정이 분리됨
- 사용자가 일정 정보를 이중 입력해야 할 수 있음
- blocked dates 계산이 로컬 `jobs`만 기준이라 외부 일정 충돌을 반영하지 못함

## 6. 최종 UX

### 사용자 관점

1. Settings에서 Google Calendar를 연결한다.
2. 어느 캘린더를 표시/가용일 계산 기준으로 쓸지 선택한다.
3. `Schedule` 페이지에서는 Google Calendar 일정이 보인다.
4. 고객이 공개 quote 링크에서 날짜를 선택하면 Coatly가:
   - 예약 가능 여부 확인
   - `job` 생성
   - Google Calendar 이벤트 생성
5. 이후 사용자는 Coatly에서 직접 schedule을 만들지 않는다.

### 내부 시스템 관점

- Google Calendar = 일정 표시와 availability 계산의 기준
- Coatly `jobs` = 고객/견적/상태/업무 기록
- Google event와 Coatly job은 연결 필드로 매핑

## 7. 설계 원칙

1. **Google을 일정 source로 사용하되, Coatly 비즈니스 레코드는 유지**
2. **초기 범위는 1 user = 1 connected Google account**
3. **처음에는 primary calendar 또는 단일 선택 calendar 중심으로 시작**
4. **개인 일정 세부 제목은 고객-facing 흐름에 노출하지 않음**
5. **MVP는 polling/server fetch 중심, push sync는 후순위**
6. **OAuth scope는 최소 권한부터 시작하되, event 생성이 필요하면 쓰기 scope까지 포함**

## 8. 데이터 모델 제안

## 8.1 신규 테이블

### `google_calendar_connections`

사용자별 Google Calendar 연결 정보 저장.

필드 초안:

- `id`
- `user_id`
- `google_account_email`
- `google_account_subject`
- `encrypted_refresh_token`
- `access_token_expires_at` 또는 access token 비저장 정책
- `granted_scopes`
- `is_active`
- `last_sync_at`
- `last_sync_error`
- `created_at`
- `updated_at`

### `google_calendar_settings`

연결 후 사용자 설정 저장.

필드 초안:

- `user_id`
- `display_calendar_ids` 또는 초기에는 `primary` 단일값
- `availability_calendar_ids`
- `event_destination_calendar_id`
- `timezone`
- `created_at`
- `updated_at`

## 8.2 기존 테이블 확장

### `jobs`

추가 필드 초안:

- `google_calendar_event_id`
- `google_calendar_id`
- `schedule_source` (`manual`, `google_booking_sync`, `google_import`)
- `external_schedule_status` 또는 초기에는 생략 가능

비고:

- 기존 `scheduled_date`, `start_date`, `end_date`는 유지
- Coatly 쿼리/상태/리포트 호환성을 위해 삭제하지 않음

## 9. API / 서버 액션 설계

### Auth / OAuth

- `GET /api/integrations/google-calendar/connect`
- `GET /api/integrations/google-calendar/callback`
- `POST /api/integrations/google-calendar/disconnect`

### Calendar data

- `getGoogleCalendarConnection()`
- `getGoogleCalendarList()`
- `getGoogleCalendarEventsForRange({ start, end })`
- `getGoogleBusyDatesForRange({ start, end })`

### Booking sync

- `createGoogleCalendarEventForJob(jobId)`
- `updateGoogleCalendarEventForJob(jobId)`
- `deleteGoogleCalendarEventForJob(jobId)` 또는 취소 시 상태 반영

## 10. 구현 단계

## Phase A — Foundation

목표: Google 계정을 안전하게 연결하고 설정 정보를 저장한다.

작업:

1. Google Cloud Console에서 Calendar API 활성화
2. OAuth consent / redirect URI 설정
3. 환경변수 추가
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALENDAR_REDIRECT_URI`
4. DB migration 추가
   - `google_calendar_connections`
   - `google_calendar_settings`
   - `jobs` 확장 필드
5. 서버 유틸 추가
   - OAuth URL 생성
   - code exchange
   - refresh token 갱신
   - token encrypt/decrypt 래퍼

완료 조건:

- 사용자가 연결 버튼 클릭 후 Google 인증을 끝낼 수 있다.
- DB에 연결 상태와 기본 설정이 저장된다.

## Phase B — Settings UI

목표: 사용자가 연결 상태를 이해하고 캘린더 선택을 설정할 수 있다.

작업:

1. Settings에 `Google Calendar` 섹션 추가
2. 상태 UI
   - Connected / Not connected
   - 연결된 계정 이메일
   - 마지막 동기화 시간
   - 최근 오류 메시지
3. 액션 UI
   - Connect
   - Disconnect
   - Retry sync
4. 캘린더 선택 UI
   - 표시용 캘린더
   - availability 계산용 캘린더
   - 이벤트 생성 대상 캘린더

완료 조건:

- 연결/해제가 동작한다.
- 사용자가 기준 캘린더를 저장할 수 있다.

## Phase C — Schedule 읽기 전환

목표: `Schedule` 페이지를 Google event 기반으로 전환한다.

작업:

1. Google events fetch 서버 레이어 구현
2. `Schedule` 페이지에서 Google 연결 여부 확인
3. 연결된 경우:
   - Google 이벤트 목록 표시
   - 일정 카드에 title, date range, all-day/time, location 표시
4. 미연결 경우:
   - 연결 CTA 표시
   - 필요 시 기존 local jobs fallback 유지
5. 이벤트 정렬/표시 규칙 확정
   - upcoming 우선
   - cancelled event 제외
   - recurring event는 API 반환 기준으로 렌더

완료 조건:

- `Schedule` 화면에서 실제 Google 일정이 보인다.

## Phase D — Availability 계산 교체

목표: 공개 quote booking에서 Google busy 상태를 반영한다.

작업:

1. `getAvailableDatesForToken()` 흐름 분석
2. blocked dates 계산 로직을 아래 기준으로 변경
   - Coatly active jobs
   - Google selected availability calendars
3. busy date 계산 규칙 정의
   - all-day event는 해당 날짜 전체 차단
   - timed event는 MVP에서 날짜 전체 차단으로 단순화
4. working days와 연속 날짜 예약 규칙에 맞춰 blocked dates 생성
5. 공개 페이지에서 private event 제목은 절대 노출하지 않음

완료 조건:

- 고객 예약 달력에서 Google 일정 충돌이 막힌 날짜로 반영된다.

## Phase E — Booking 시 Google event 자동 생성

목표: 고객 예약 완료 후 Coatly와 Google이 함께 갱신된다.

작업:

1. quote booking 완료 시 기존 `job` 생성 유지
2. `job` 생성 직후 Google Calendar event 생성
3. 생성된 event id를 `jobs.google_calendar_event_id`에 저장
4. 이벤트 제목 포맷 규칙 정의
   - 예: `{customerLabel} - {quoteTitle}`
5. 이벤트 설명 본문 규칙 정의
   - customer name
   - address
   - quote number
   - internal deep link
6. Google API 실패 시 처리 정책 정의
   - 권장: job은 생성, Google sync는 재시도 가능 상태로 남김

완료 조건:

- 고객 예약 시 Google Calendar에 이벤트가 자동 생성된다.

## Phase F — Jobs UX 정리

목표: Coatly 내부에서 “수동 일정 입력” 비중을 줄인다.

작업:

1. Jobs 생성 폼에서 수동 `scheduled_date` 입력 비중 축소
2. Google 연동 사용자에게는 문구 변경
   - “Schedule is managed through Google Calendar”
3. 수동 일정 생성 기능 유지 여부 결정
   - 권장: 초기엔 숨기지 말고 보조 경로로 유지
   - 안정화 후 Google 연결 사용자에게는 축소 가능
4. job 상세에 sync 상태 표시
   - synced
   - pending
   - failed

완료 조건:

- 사용자에게 Coatly가 “job 관리” 앱이고, 일정은 Google 중심이라는 모델이 명확해진다.

## 11. 권장 구현 순서

실제 작업은 아래 순서로 진행한다.

1. DB schema 추가
2. Google OAuth connect/callback/disconnect 구현
3. Settings UI 구현
4. Google calendar list fetch + 저장
5. `Schedule` 페이지 읽기 전환
6. `getAvailableDatesForToken()`에 Google availability 반영
7. booking 완료 시 Google event 생성
8. `jobs`에 Google sync 상태 표시
9. fallback / retry / error UX 보강

## 12. 파일 단위 작업 예상

예상 생성/수정 대상:

- `app/api/integrations/google-calendar/connect/route.ts`
- `app/api/integrations/google-calendar/callback/route.ts`
- `app/api/integrations/google-calendar/disconnect/route.ts`
- `app/(dashboard)/settings/...`
- `app/(dashboard)/schedule/page.tsx`
- `app/actions/jobs.ts`
- `components/jobs/JobsWorkspace.tsx`
- `lib/google-calendar/...`
- `lib/supabase/validators.ts`
- `types/database.ts` 또는 생성 타입 확장 레이어
- `supabase/migrations/...`

## 13. 테스트 계획

### Unit

- OAuth state 생성/검증
- token refresh 로직
- Google event → UI view model 변환
- busy dates 계산
- booking → event payload 생성

### Integration

- 연결 후 설정 저장
- `Schedule` 페이지 이벤트 렌더
- 공개 booking blocked dates 반영
- booking 완료 후 job + event id 저장

### Regression

- Google 미연결 사용자의 기존 booking 흐름
- 기존 `jobs` CRUD
- `schedule` 페이지 에러/빈 상태

## 14. 리스크와 대응

### 1. Google token 만료 / revoke

대응:

- refresh 시도 후 실패하면 연결 상태를 inactive로 표시
- Settings에서 재연결 CTA 제공

### 2. 일정 충돌 계산 복잡도

대응:

- MVP에서는 timed event도 날짜 전체 차단
- 시간 단위 정교화는 후속 단계로 미룸

### 3. Google API 실패 시 예약 저장 불일치

대응:

- `job` 생성은 우선 성공 처리
- Google sync 실패 상태 저장
- 재시도 액션 제공

### 4. 개인정보 노출

대응:

- 공개 booking에는 busy 여부만 사용
- event 제목/상세는 고객-facing UI에 절대 노출하지 않음

### 5. 다중 캘린더 복잡성

대응:

- MVP는 primary 또는 단일 선택 calendar
- 다중 calendar는 운영 안정화 후 확장

## 15. MVP 범위

반드시 먼저 끝낼 범위:

1. Google 연결
2. Settings에서 기준 calendar 선택
3. `Schedule` 페이지 Google 읽기 표시
4. 공개 booking blocked dates에 Google busy 반영
5. booking 완료 시 Google event 자동 생성

이 단계에서는 제외 가능:

- push notifications
- incremental sync token 고도화
- event 양방향 수정 동기화
- 다중 계정/다중 팀원 캘린더

## 16. 후속 개선 항목

- incremental sync token 기반 성능 최적화
- background sync / cron 재동기화
- Google에서 이동된 event와 Coatly job reconcile
- job 상태 변경 시 Google event 업데이트
- 캘린더 색상/소스별 구분
- `Schedule` 월간 요약 카드 개선

## 17. 작업 분해 초안

### Track 1 — Integration Foundation

- migration 작성
- OAuth route 구현
- Google client 유틸 추가

### Track 2 — User Settings

- Settings 섹션 UI
- calendar picker
- 연결 상태 표시

### Track 3 — Schedule Read Path

- event fetch
- view model 변환
- `Schedule` 페이지 렌더

### Track 4 — Booking Availability

- blocked dates 계산 교체
- 공개 booking 회귀 테스트

### Track 5 — Booking Write Path

- Google event 생성
- `jobs` 연결 필드 저장
- retry/failure 상태 처리

## 18. 최종 판단

Option B는 현재 Coatly 구조에서 가장 현실적이다.

- `Schedule` 직접 입력 문제를 해결한다.
- 예약 가능일 정확도를 높인다.
- 기존 `quote → booking → job` 흐름을 유지한다.
- 향후 양방향 sync로 확장할 수 있다.

따라서 구현은 **“Google 읽기 전환 → availability 반영 → booking 자동 생성”** 순으로 진행한다.
