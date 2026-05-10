# Feature: Schedule + Google Calendar Integration

*기준안: Option B — Google Calendar를 일정 source of truth로 사용. 작성일: 2026-04-20 / Phase 2*

목차:
1. 목표 & 의사결정
2. 데이터 모델
3. API / 서버 액션
4. 구현 단계 (Phase A–F)
5. 테스트 / 리스크 / MVP

---

## 1. 목표 & 의사결정

### 1.1 목표

Coatly `Schedule`은 사용자가 앱 안에 직접 일정을 만들지 않아도 된다. 사용자는 평소 Google Calendar에서 일정 관리. Coatly는:
- Google Calendar 이벤트를 `Schedule`에 표시
- Google busy 상태를 quote booking blocked dates 계산에 반영
- 고객 예약 시 Coatly `job` + Google Calendar event를 함께 생성
- `jobs`는 일정 입력 도구가 아니라 고객/견적/상태 추적용 업무 레코드

### 1.2 왜 Option B

Coatly는 단순 일정 보기 앱이 아니라 quote → 고객 날짜 선택 → blocked dates → `jobs` 상태 → customer/quote/job 연결 흐름이 이미 있다. Option B는:
- UX: 직접 일정 입력 안 해도 됨
- 정확도: 실제 사용 Google Calendar 기준 표시/가용일
- 구현 리스크: 기존 jobs/booking 흐름 재사용

### 1.3 In Scope / Out of Scope

**In**: Google Calendar 연결/해제, 이벤트 표시, 선택 캘린더 기준 blocked dates, quote booking 시 자동 event 생성, `job` ↔ event 연결
**Out**: Team scheduling, 다수 작업자 캘린더 분배, GPS/route planning, supplier/accounting calendar sync

### 1.4 성공 기준

- 사용자가 Google Calendar 연결 가능
- `Schedule` 페이지에서 향후 일정을 Google 기반으로 봄
- 고객 예약 가능일이 Google busy 반영
- 고객 예약 시 Coatly `job` + Google event 함께 생성

### 1.5 현재 상태

| 영역 | 상태 |
|------|------|
| `app/(dashboard)/schedule/page.tsx` | `getJobs()` 기반 일정 목록 |
| `components/jobs/JobsWorkspace.tsx` | 수동 job 생성/수정 폼 |
| `app/actions/jobs.ts` | quote booking 시 jobs 생성 + blocked dates |

한계:
- 실제 일정 source와 Coatly 일정 분리 → 이중 입력
- blocked dates가 로컬 jobs 기준 → 외부 일정 충돌 미반영

### 1.6 최종 UX

1. Settings에서 Google Calendar 연결
2. 표시/가용일 기준 캘린더 선택
3. `Schedule` 페이지에 Google 일정 표시
4. 고객 공개 quote 링크에서 날짜 선택 → Coatly가 가용 확인 → `job` 생성 → Google event 생성
5. 이후 사용자는 Coatly에서 직접 schedule 만들지 않음

### 1.7 설계 원칙

1. Google = 일정 source, Coatly = 비즈니스 레코드 유지
2. 초기: 1 user = 1 connected Google account
3. primary calendar 또는 단일 선택 calendar 중심
4. 개인 일정 세부 제목은 고객-facing UI 노출 X
5. MVP는 polling/server fetch, push sync는 후순위
6. OAuth scope 최소부터 (event 생성 시 쓰기 scope 포함)

---

## 2. 데이터 모델

### `google_calendar_connections`

사용자별 Google Calendar 연결 정보.

필드: `id`, `user_id`, `google_account_email`, `google_account_subject`, `encrypted_refresh_token`, `access_token_expires_at`, `granted_scopes`, `is_active`, `last_sync_at`, `last_sync_error`, `created_at`, `updated_at`

### `google_calendar_settings`

연결 후 사용자 설정.

필드: `user_id`, `display_calendar_ids`, `availability_calendar_ids`, `event_destination_calendar_id`, `timezone`, `created_at`, `updated_at`

### `jobs` 확장 필드

- `google_calendar_event_id`
- `google_calendar_id`
- `schedule_source` (`manual`, `google_booking_sync`, `google_import`)

기존 `scheduled_date`, `start_date`, `end_date` 유지.

---

## 3. API / 서버 액션 설계

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

---

## 4. 구현 단계

### Phase A — Foundation

목표: Google 계정 안전 연결 + 설정 저장.

작업:
1. Google Cloud Console에서 Calendar API 활성화
2. OAuth consent / redirect URI 설정
3. 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`
4. DB migration: `google_calendar_connections`, `google_calendar_settings`, `jobs` 확장
5. 서버 유틸: OAuth URL 생성, code exchange, refresh token 갱신, token encrypt/decrypt

완료 조건: 사용자가 Google 인증 완료 → DB에 연결 상태/기본 설정 저장.

### Phase B — Settings UI

목표: 연결 상태 이해 + 캘린더 선택.

작업:
1. Settings에 `Google Calendar` 섹션
2. 상태 UI: Connected / Not connected, 연결 계정 이메일, 마지막 동기화 시간, 최근 오류
3. 액션: Connect / Disconnect / Retry sync
4. 캘린더 선택: 표시용 / availability 계산용 / 이벤트 생성 대상

완료 조건: 연결/해제 동작, 사용자가 기준 캘린더 저장 가능.

### Phase C — Schedule 읽기 전환

목표: `Schedule` 페이지를 Google event 기반으로.

작업:
1. Google events fetch 서버 레이어
2. `Schedule`이 Google 연결 여부 확인
3. 연결 시 Google 이벤트 표시 (title, date range, all-day/time, location)
4. 미연결 시 연결 CTA + 기존 local jobs fallback
5. 정렬/표시: upcoming 우선, cancelled 제외

완료 조건: `Schedule`에서 실제 Google 일정 표시.

### Phase D — Availability 계산 교체

목표: 공개 quote booking에서 Google busy 반영.

작업:
1. `getAvailableDatesForToken()` 분석
2. blocked dates 계산을 Coatly active jobs + Google selected availability calendars 기준으로
3. busy date 규칙: all-day → 해당 날짜 전체 차단, timed → MVP에서 날짜 전체 차단 (단순화)
4. 공개 페이지에 private event 제목 절대 노출 X

완료 조건: 고객 예약 달력에서 Google 일정 충돌이 막힌 날짜로 반영.

> ⚠️ **현재 audit issue**: Google busy lookup 실패 시 fail closed 처리 필요. `app/actions/jobs.ts:1168-1282` 참조. 자세한 내용은 [`audit.md` § 1.1-B](../audit/audit.md#b-공개-예약--google-calendar-실패변경-미차단).

### Phase E — Booking 시 Google event 자동 생성

목표: 고객 예약 후 Coatly + Google이 함께 갱신.

작업:
1. quote booking 완료 시 기존 `job` 생성 유지
2. `job` 생성 직후 Google Calendar event 생성
3. 생성된 event id를 `jobs.google_calendar_event_id`에 저장
4. 이벤트 제목 포맷: `{customerLabel} - {quoteTitle}`
5. 이벤트 설명: customer name, address, quote number, internal deep link
6. Google API 실패 시: job은 생성, Google sync는 재시도 가능 상태로

완료 조건: 고객 예약 시 Google에 이벤트 자동 생성.

### Phase F — Jobs UX 정리

목표: Coatly 내부에서 "수동 일정 입력" 비중 축소.

작업:
1. Jobs 생성 폼에서 수동 `scheduled_date` 입력 비중 축소
2. Google 연동 사용자에게 "Schedule is managed through Google Calendar" 문구
3. 수동 일정 생성 기능 유지 (초기엔 보조 경로)
4. job 상세에 sync 상태: synced / pending / failed

완료 조건: "job 관리 = Coatly, 일정 = Google 중심" 모델 명확.

### 권장 구현 순서

1. DB schema 추가
2. OAuth connect/callback/disconnect
3. Settings UI
4. Google calendar list fetch + 저장
5. `Schedule` 페이지 읽기 전환
6. `getAvailableDatesForToken()`에 Google availability 반영
7. Booking 완료 시 Google event 생성
8. `jobs`에 Google sync 상태 표시
9. fallback / retry / error UX

---

## 5. 파일 단위 작업 / 테스트 / 리스크 / MVP

### 5.1 파일 예상

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

### 5.2 테스트 계획

**Unit:** OAuth state 생성/검증, token refresh, Google event → UI view model 변환, busy dates 계산, booking → event payload 생성.

**Integration:** 연결 후 설정 저장, `Schedule` 이벤트 렌더, 공개 booking blocked dates 반영, booking 완료 후 job + event id 저장.

**Regression:** Google 미연결 사용자 기존 booking 흐름, 기존 `jobs` CRUD, `schedule` 페이지 에러/빈 상태.

### 5.3 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| Google token 만료/revoke | refresh 시도 후 실패 시 connection inactive, Settings 재연결 CTA |
| 일정 충돌 계산 복잡도 | MVP는 timed event도 날짜 전체 차단. 시간 단위 정교화는 후속 |
| Google API 실패 시 예약 저장 불일치 | `job`은 우선 생성, Google sync 실패 상태 저장, 재시도 액션 |
| 개인정보 노출 | 공개 booking에는 busy 여부만, event 제목/상세는 노출 X |
| 다중 캘린더 복잡성 | MVP는 primary 또는 단일 선택, 다중은 운영 안정화 후 |

### 5.4 MVP 범위

먼저 끝낼 것:
1. Google 연결
2. Settings 기준 calendar 선택
3. `Schedule` Google 읽기 표시
4. 공개 booking blocked dates에 Google busy 반영
5. Booking 완료 시 Google event 자동 생성

이 단계에서 제외 가능:
- Push notifications
- Incremental sync token 고도화
- Event 양방향 수정 동기화
- 다중 계정/팀원 캘린더

### 5.5 후속 개선

- Incremental sync token 기반 성능 최적화
- Background sync / cron 재동기화
- Google에서 이동된 event와 Coatly job reconcile
- Job 상태 변경 시 Google event 업데이트
- 캘린더 색상/소스별 구분

### 5.6 작업 분해

| Track | 영역 |
|-------|------|
| 1. Integration Foundation | migration, OAuth route, Google client 유틸 |
| 2. User Settings | Settings 섹션 UI, calendar picker, 연결 상태 |
| 3. Schedule Read Path | event fetch, view model, `Schedule` 렌더 |
| 4. Booking Availability | blocked dates 교체, 공개 booking 회귀 |
| 5. Booking Write Path | Google event 생성, jobs 연결 필드, retry/failure |

### 5.7 최종 판단

Option B는 현 Coatly 구조에서 가장 현실적. `Schedule` 직접 입력 문제 해결, 예약 가능일 정확도 향상, 기존 quote → booking → job 흐름 유지, 향후 양방향 sync 확장 가능.

구현 순서: **Google 읽기 전환 → availability 반영 → booking 자동 생성**.
