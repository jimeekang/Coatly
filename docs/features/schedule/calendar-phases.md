# Google Calendar Integration — API & Implementation Phases

*← [calendar-overview.md](./calendar-overview.md) | → [calendar-impl.md](./calendar-impl.md)*

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

### Phase A — Foundation

목표: Google 계정을 안전하게 연결하고 설정 정보를 저장한다.

작업:
1. Google Cloud Console에서 Calendar API 활성화
2. OAuth consent / redirect URI 설정
3. 환경변수 추가: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`
4. DB migration 추가: `google_calendar_connections`, `google_calendar_settings`, `jobs` 확장 필드
5. 서버 유틸 추가: OAuth URL 생성, code exchange, refresh token 갱신, token encrypt/decrypt 래퍼

완료 조건:
- 사용자가 연결 버튼 클릭 후 Google 인증을 끝낼 수 있다.
- DB에 연결 상태와 기본 설정이 저장된다.

### Phase B — Settings UI

목표: 사용자가 연결 상태를 이해하고 캘린더 선택을 설정할 수 있다.

작업:
1. Settings에 `Google Calendar` 섹션 추가
2. 상태 UI: Connected / Not connected, 연결된 계정 이메일, 마지막 동기화 시간, 최근 오류 메시지
3. 액션 UI: Connect / Disconnect / Retry sync
4. 캘린더 선택 UI: 표시용 캘린더, availability 계산용 캘린더, 이벤트 생성 대상 캘린더

완료 조건:
- 연결/해제가 동작한다.
- 사용자가 기준 캘린더를 저장할 수 있다.

### Phase C — Schedule 읽기 전환

목표: `Schedule` 페이지를 Google event 기반으로 전환한다.

작업:
1. Google events fetch 서버 레이어 구현
2. `Schedule` 페이지에서 Google 연결 여부 확인
3. 연결된 경우: Google 이벤트 목록 표시 (title, date range, all-day/time, location)
4. 미연결 경우: 연결 CTA 표시, 필요 시 기존 local jobs fallback 유지
5. 이벤트 정렬/표시 규칙: upcoming 우선, cancelled event 제외

완료 조건:
- `Schedule` 화면에서 실제 Google 일정이 보인다.

### Phase D — Availability 계산 교체

목표: 공개 quote booking에서 Google busy 상태를 반영한다.

작업:
1. `getAvailableDatesForToken()` 흐름 분석
2. blocked dates 계산 로직을 아래 기준으로 변경:
   - Coatly active jobs
   - Google selected availability calendars
3. busy date 계산 규칙: all-day event는 해당 날짜 전체 차단, timed event는 MVP에서 날짜 전체 차단으로 단순화
4. 공개 페이지에서 private event 제목은 절대 노출하지 않음

완료 조건:
- 고객 예약 달력에서 Google 일정 충돌이 막힌 날짜로 반영된다.

### Phase E — Booking 시 Google event 자동 생성

목표: 고객 예약 완료 후 Coatly와 Google이 함께 갱신된다.

작업:
1. quote booking 완료 시 기존 `job` 생성 유지
2. `job` 생성 직후 Google Calendar event 생성
3. 생성된 event id를 `jobs.google_calendar_event_id`에 저장
4. 이벤트 제목 포맷: `{customerLabel} - {quoteTitle}`
5. 이벤트 설명: customer name, address, quote number, internal deep link
6. Google API 실패 시: job은 생성, Google sync는 재시도 가능 상태로 남김

완료 조건:
- 고객 예약 시 Google Calendar에 이벤트가 자동 생성된다.

### Phase F — Jobs UX 정리

목표: Coatly 내부에서 "수동 일정 입력" 비중을 줄인다.

작업:
1. Jobs 생성 폼에서 수동 `scheduled_date` 입력 비중 축소
2. Google 연동 사용자에게는 문구 변경: "Schedule is managed through Google Calendar"
3. 수동 일정 생성 기능 유지 여부 결정: 초기엔 숨기지 말고 보조 경로로 유지
4. job 상세에 sync 상태 표시: synced / pending / failed

완료 조건:
- 사용자에게 Coatly가 "job 관리" 앱이고, 일정은 Google 중심이라는 모델이 명확해진다.

## 11. 권장 구현 순서

1. DB schema 추가
2. Google OAuth connect/callback/disconnect 구현
3. Settings UI 구현
4. Google calendar list fetch + 저장
5. `Schedule` 페이지 읽기 전환
6. `getAvailableDatesForToken()`에 Google availability 반영
7. booking 완료 시 Google event 생성
8. `jobs`에 Google sync 상태 표시
9. fallback / retry / error UX 보강
