# Google Calendar Integration — Test, Risk & MVP

*← [calendar-phases.md](./calendar-phases.md)*

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

## 17. 작업 분해 초안

**Track 1 — Integration Foundation**
- migration 작성, OAuth route 구현, Google client 유틸 추가

**Track 2 — User Settings**
- Settings 섹션 UI, calendar picker, 연결 상태 표시

**Track 3 — Schedule Read Path**
- event fetch, view model 변환, `Schedule` 페이지 렌더

**Track 4 — Booking Availability**
- blocked dates 계산 교체, 공개 booking 회귀 테스트

**Track 5 — Booking Write Path**
- Google event 생성, `jobs` 연결 필드 저장, retry/failure 상태 처리

## 18. 최종 판단

Option B는 현재 Coatly 구조에서 가장 현실적이다.

- `Schedule` 직접 입력 문제를 해결한다.
- 예약 가능일 정확도를 높인다.
- 기존 `quote → booking → job` 흐름을 유지한다.
- 향후 양방향 sync로 확장할 수 있다.

따라서 구현은 **"Google 읽기 전환 → availability 반영 → booking 자동 생성"** 순으로 진행한다.
