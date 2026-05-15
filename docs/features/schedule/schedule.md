# Feature: Schedule + Google Calendar

> 기준: Option B. Google Calendar를 외부 일정 source로 읽고, Coatly jobs/internal events와 통합 표시합니다.

## Goal

페인터가 견적 승인 이후 작업 날짜를 안전하게 잡고, 기존 Google Calendar 일정과 Coatly 작업 일정을 한 화면에서 확인하게 합니다.

## Current Status

| 영역 | 상태 | 구현 근거 |
|------|------|-----------|
| Google OAuth 연결 | 구현됨 | `app/api/integrations/google-calendar/*`, `app/actions/google-calendar.ts` |
| Calendar settings | 구현됨 | `google_calendar_settings`, `components/settings/GoogleCalendarCard.tsx` |
| Schedule 통합 화면 | 구현됨 | `app/(dashboard)/schedule/page.tsx`, `ScheduleCalendar` |
| Jobs 리다이렉트 | 구현됨 | `/jobs` → `/schedule?view=list&source=jobs` |
| 내부 일정 | 구현됨 | `schedule_events`, `getScheduleEvents()` |
| 다일 작업 일정 | 구현됨 | `job_schedule_days`, `start_date`, `end_date`, `duration_days` |
| 겹침 검사 | 구현됨 | `check_job_date_overlap`, `check_job_schedule_dates_overlap` |
| 공개 견적 예약 | 구현됨 | `/q/[token]`, `bookJobFromPublicQuote()` |
| Google event 자동 생성 | 부분 구현 | service/action 기반 존재, 실패 처리 강화 필요 |

## Data Model

| 테이블/필드 | 역할 |
|-------------|------|
| `google_calendar_connections` | 사용자별 refresh token, scope, sync 상태 |
| `google_calendar_settings` | display/availability/destination calendar 설정 |
| `jobs.start_date`, `jobs.end_date`, `jobs.duration_days` | 작업 범위 |
| `jobs.schedule_source`, `jobs.google_sync_status` | 일정 출처와 동기화 상태 |
| `job_schedule_days` | 비연속/다일 작업 날짜 단위 저장 |
| `schedule_events` | Coatly 내부 일정 |

## Server/API Surface

| 파일 | 책임 |
|------|------|
| `app/api/integrations/google-calendar/connect/route.ts` | OAuth 시작 |
| `app/api/integrations/google-calendar/callback/route.ts` | OAuth callback, token 저장 |
| `app/actions/google-calendar.ts` | 연결/해제/설정 액션 |
| `app/actions/schedule.ts` | 내부 일정 조회 |
| `app/actions/jobs.ts` | job CRUD, public booking, blocked dates |
| `lib/google-calendar/service.ts` | Calendar API read/write |
| `lib/google-calendar/crypto.ts` | refresh token 암호화 |

## UX

- Schedule는 calendar/list 관점을 전환합니다.
- source 필터로 jobs, native events, Google events를 구분합니다.
- status/search 필터로 작업 목록을 좁힙니다.
- Google 미연결 사용자는 Coatly jobs/internal events만 봅니다.
- Google 오류는 전체 schedule을 막지 않고 연결 상태/오류 상태로 노출합니다.

## Completed Build Steps

- [x] Google OAuth DB schema와 암호화 저장
- [x] Settings UI에서 Google Calendar 연결/해제
- [x] Schedule page가 Google + jobs + internal events를 함께 조회
- [x] Jobs page를 Schedule list view로 통합
- [x] Public quote approval 후 날짜 선택/booking
- [x] Job date overlap RPC와 blocked date 조회
- [x] Schedule/job 단위 테스트 추가

## Remaining Work

| 우선순위 | 작업 | 담당 |
|----------|------|------|
| P1 | Google event 생성 실패 시 booking 확정 정책을 fail-closed로 명확화 | Codex |
| P1 | sync 실패/재시도 UI와 운영 로그 정리 | Codex |
| P2 | Google event 변경을 Coatly job에 반영하는 one-way sync | Codex |
| P2 | Schedule 화면의 빈 상태/오류 상태 디자인 재검토 | Claude Code |
| P3 | multi-calendar availability rule 확장 | Claude Code plan → Codex |

## Acceptance Criteria

- [x] Google Calendar 연결 없이도 Schedule 사용 가능
- [x] Google 연결 시 외부 일정이 Schedule에 표시됨
- [x] 공개 견적 예약은 승인된 quote에서만 가능
- [x] 작업 날짜 겹침은 서버/RPC에서 차단
- [x] 다일 작업이 Calendar와 list 양쪽에 일관되게 표시됨
- [ ] Google write 실패가 customer booking 성공으로 오인되지 않음

## Risks

- Google token 만료/권한 회수: 연결 상태와 재연결 CTA 필요
- 외부 Calendar write 실패: job 생성과 Google event 생성의 원자성 정책 필요
- timezone: Sydney 기준 표시와 Google event 시간대 변환을 계속 테스트해야 함
