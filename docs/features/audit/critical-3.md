# 앱 결정적 오류 감사 (Part 3) — Recovery Stages & Checklist

*← [critical-2.md](./critical-2.md)*

## 6. 기능 개선 및 추가 제안

### Stage 1. 앱을 다시 출시 가능한 상태로 만들기

목표: "배포 가능한 main branch" 회복.

작업:
1. Jobs query type 오류 제거
2. React 19 lint 실패 제거
3. `schedule_events` migration 추가
4. Stripe webhook route 정리
5. `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run build` 전부 통과

완료 기준:
- Vercel production build와 동일한 local build가 통과한다.
- 새 Supabase 환경도 migration만으로 필요한 테이블을 만들 수 있다.

### Stage 2. 핵심 업무 흐름 안정화

목표: quote → approval → job booking → schedule → invoice 흐름 안정화.

작업:
1. Public quote date booking UX 개선
2. Schedule에서 native event, jobs, Google events의 충돌 표시 강화
3. Job detail에 quote/invoice 연결 상태와 Google sync 상태 표시
4. Invoice reminder cron 로그와 재시도 안정성 추가
5. 승인된 quote에서 job 생성, invoice 생성으로 이어지는 happy path 브라우저 QA

완료 기준:
- 고객이 공개 견적 링크에서 승인하고 날짜를 선택하는 흐름이 모바일에서 자연스럽다.
- reminder와 Google sync 실패가 조용히 묻히지 않는다.

### Stage 3. 제품 가치 향상

추천 기능:
1. **Dashboard analytics** — 월별 매출 추이, quote pipeline, overdue invoice 금액
2. **AI Quote Drafting UX** — 기존 `lib/ai/drafts.ts`와 AIDraftPanel을 Quote 생성 화면에 노출
3. **Job costing** — Job 완료 후 실제 자재비/시간 입력, quote estimate 대비 profit variance
4. **Smart pricing suggestions** — quote/job costing history 기반 suggested rate

### Stage 4. 통합 기능 확장

추천 순서:
1. CSV export를 먼저 제공해 integration 전 사용자 니즈 검증
2. Xero/MYOB export 또는 sync 설계
3. 회계 sync는 invoice/payment data model이 안정된 뒤 진행

## 7. 권장 수정 순서

| 순서 | 작업 | 우선순위 | 예상 효과 |
| --- | --- | --- | --- |
| 1 | `app/actions/jobs.ts` relation select 제거 또는 타입 재생성 | P0 | build 복구 |
| 2 | `PublicDatePickerStep` 초기 데이터 서버 로딩 전환 | P1 | lint 복구 |
| 3 | `schedule_events` migration 추가 | P1 | DB 재현성 복구 |
| 4 | Stripe webhook duplicate route 정리 | P1 | 운영 혼동 제거 |
| 5 | `get_user_active_quote_count` status 갱신 | P1 | 구독 한도 정합성 |
| 6 | docs stack/status/migration 문구 갱신 | P2 | 작업 기준 통일 |
| 7 | cron/logging/Google sync observability 추가 | P2 | 운영 안정성 |
| 8 | Dashboard analytics + AI quote drafting UX | P3 | 제품 가치 향상 |

## 8. 검증 체크리스트

수정 후 반드시 실행:

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
```

브라우저 QA 대상:
- 로그인/회원가입/온보딩
- Quote 생성, 수정, PDF 생성
- Public quote approval, rejection, signature, date booking
- Approved quote → Job 생성
- Approved quote → Invoice 생성
- Jobs list/detail/edit
- Schedule month view
- Google Calendar 연결/해제/실패 상태
- Invoice reminder cron dry-run 또는 test harness

## 9. 2026-04-25 수정 완료 상태

| 순서 | 결과 |
| --- | --- |
| 1 | `app/actions/jobs.ts`의 Supabase relation select를 제거하고 명시 조회 후 서버 매핑으로 전환 |
| 2 | `PublicDatePickerStep` 초기 availability를 서버 로딩해 props로 전달하도록 전환 |
| 3 | `036_schedule_events_and_active_quote_count.sql` 추가: `schedule_events` table/RLS/index/trigger 및 active quote count status 수정 |
| 4 | `/api/stripe/webhook` legacy route를 canonical `/api/webhooks/stripe` 308 redirect로 전환 |
| 5 | `get_user_active_quote_count`가 `draft/sent/approved`를 세도록 migration 추가 |
| 6 | README, CLAUDE, ARCHITECTURE, FRONTEND, product/design docs, generated DB schema, tech debt tracker 갱신 |
| 7 | Job detail에 Google Calendar sync 상태/오류/재시도 UI 추가, invoice reminder cron 응답에 error sample 추가 |
| 8 | Dashboard에 quote pipeline analytics 추가. AI quote drafting UX는 기존 `AIDraftPanel`로 노출됨 |

수정 직후 중간 검증:
- `npx tsc --noEmit` 통과
- `npm run lint` 통과
- 관련 테스트 통과: jobs.test.ts, JobDetail.test.tsx, PublicDatePickerStep.test.tsx, stripe/webhook/route.test.ts
