# AI Quote Writer Validation, Build, and Trial Checklist

> 기준일: 2026-05-16. Phase 0 validation 기간: 2026-05-15 금요일부터 2026-05-29 금요일까지 14일. 이후 GREEN이면 8주 build, 4주 paid trial tracking으로 이어진다.

## Rule

- Phase 0 목적은 기능을 만들기 전에 **5명 painter가 실제로 돈을 낼 문제인지** 확인하는 것이다.
- GREEN gate 전에는 v1 build를 시작하지 않는다.
- 모든 인터뷰 결과는 이 파일에 기록하고, 미확인 항목은 "미기록"으로 둔다.
- 과거 quote는 고객 이름, 주소, 전화번호, 이메일을 지운 뒤 eval seed로만 사용한다.
- v1 기본 모델 후보는 Alibaba Cloud / Qwen `qwen3-vl-flash`다. 가격/성능은 Phase 0 D6/D11에 공식 문서 기준으로 다시 확인한다.
- AI 비용 계산은 실행 당일 공식 model pricing으로 다시 입력한다. 2026-05-16 확인 기준은 Qwen3-VL-Flash 32K 이하 tier input $0.05 / 1M tokens, output $0.40 / 1M tokens지만, 최종 spreadsheet는 실행일 가격을 사용한다.
- 실제 사용량 트래킹은 앱 구현 후 paid trial에서만 판정한다. 인터뷰 단계의 중간 점검은 build 여부를 위한 정성/선결제 신호만 본다.

## Full Timeline

| Phase | 기간 | 날짜 | 목적 | 판정 |
|-------|------|------|------|------|
| Phase 0 Validation | 2주 | 2026-05-15 ~ 2026-05-29 | 인터뷰, 과거 quote 확보, 비용 계산, 선결제 의향 확인 | GREEN/YELLOW/RED build decision |
| v1 Build | 8주 | 2026-06-01 ~ 2026-07-24 | AI Quote Writer, 보조 AI, usage log, tracking instrumentation 구현 | Internal readiness |
| Integration + Onboarding | 1주 | 2026-07-27 ~ 2026-07-31 | production deploy, pilot painter 세팅, price_rates 입력, 첫 quote 생성 확인 | Trial start readiness |
| Paid Trial Tracking | 4주 | 2026-08-03 ~ 2026-08-28 | 실제 사용량, AI 품질, 비용, quote outcome 측정 | Midpoint + final decision |

## v1 Build Plan Before Usage Tracking

실제 사용량을 보려면 아래 구현이 먼저 끝나야 한다. 이 기간 전에는 "사용량"이 아니라 인터뷰 답변과 선결제 의향만 기록한다.

| Week | 날짜 | 목표 | 구현 방법 | 완료 기준 | 결과 |
|------|------|------|-----------|-----------|------|
| Build W1 | 2026-06-01 ~ 2026-06-05 | AI input schema + provider + usage logging foundation | `photos`, `price_rates`, `job_type`, `scope_notes`, `rough_measurements` 입력 구조 확장. Qwen3-VL-Flash adapter 설계. `ai_usage_logs` migration 설계/적용. streaming spike 실행 | AI draft 요청마다 provider/model/attempt/cost를 기록할 수 있음 | 미기록 |
| Build W2 | 2026-06-08 ~ 2026-06-12 | AI Quote Writer core | Quote create flow에 AIDraftPanel 연결. price_rates 기반 deterministic pricing pass 추가. Starter/Pro gating 연결 | Pro user가 quote draft를 만들고 edit할 수 있음 | 미기록 |
| Build W3 | 2026-06-15 ~ 2026-06-19 | AU prompt + eval + validator | golden quote seed로 prompt 튜닝. rate/GST/hidden work hallucination validator 추가 | 가격은 AI가 정하지 않고, quote artifact 품질을 eval로 확인 | 미기록 |
| Build W4 | 2026-06-22 ~ 2026-06-26 | Today Assistant + Follow-up Writer | dashboard task list, Pro AI summary, quote/customer/invoice follow-up draft CTA 구현 | 보조 AI가 요약/문구 초안만 만들고 자동 발송/상태 변경은 하지 않음 | 미기록 |
| Build W5 | 2026-06-29 ~ 2026-07-03 | Photo helper + graceful fallback | Qwen3-VL-Flash vision input 연결. max 3 photos, resize/compress, photo metadata log, 1 retry, manual fallback CTA 구현 | 사진은 scope 보조로만 쓰이고 photo-only auto takeoff는 막힘 | 미기록 |
| Build W6 | 2026-07-06 ~ 2026-07-10 | Usage page + draft marker | settings AI usage page, DRAFT marker, ToS disclaimer, monthly limit UI 구현 | user/founder가 사용량과 비용을 확인할 수 있음 | 미기록 |
| Build W7 | 2026-07-13 ~ 2026-07-17 | Regression + production hardening | quote draft, usage limit, follow-up writer, today assistant 테스트 작성. build/test 통과 | trial 전에 핵심 flow 회귀 테스트 통과 | 미기록 |
| Build W8 | 2026-07-20 ~ 2026-07-24 | Pilot readiness | 5명 painter account 세팅, price_rates 입력 flow 점검, seed quote import, production smoke test | paid trial을 시작할 수 있음 | 미기록 |

## Phase 0 Day-by-Day Plan

| Day | 날짜 | 목표 | 방법 | 산출물 | 결과 |
|-----|------|------|------|--------|------|
| D0 | 2026-05-15 Fri | 인터뷰어 5명 섭외 완료 | 직접 연락, 지인 소개, 로컬 painter outreach | 5명 후보 리스트 | 완료 |
| D1 | 2026-05-16 Sat | 운영 문서 준비 | 이 체크리스트 작성, 질문 script 확정, quote 공유 요청 문구 준비 | `PHASE0-CHECKLIST.md` | 진행 중 |
| D2 | 2026-05-17 Sun | 인터뷰 일정 확정 | 각 painter에게 30분 slot 2개 제안, 과거 quote 1개 선공유 요청 | 확정된 interview calendar | 미기록 |
| D3 | 2026-05-18 Mon | 인터뷰 1–2 진행 | Zoom/전화 30분. 현재 quote 작성 flow, AI 반응, price_rates 동의 확인 | Interview Log P1/P2 | 미기록 |
| D4 | 2026-05-19 Tue | 인터뷰 3–4 진행 | 같은 script로 진행. 사진 사용 의향과 follow-up pain을 깊게 확인 | Interview Log P3/P4 | 미기록 |
| D5 | 2026-05-20 Wed | 인터뷰 5 진행 + 누락 quote 회수 | 마지막 인터뷰 후 미제출 quote 재요청 | Interview Log P5, quote 5개 목표 | 미기록 |
| D6 | 2026-05-21 Thu | AI cost economics 1차 계산 | Qwen3-VL-Flash 공식 pricing 확인 후 text draft, photo draft, today summary, follow-up draft 비용을 월 사용량으로 계산 | Cost Log v1 | 미기록 |
| D7 | 2026-05-22 Fri | Validation 중간 점검 | 5명 반응을 GREEN/YELLOW/RED 신호로 분류. script에서 약한 질문 보완. 실제 사용량 판정은 build 후 paid trial에서만 진행 | Midpoint Decision Notes | 미기록 |
| D8 | 2026-05-23 Sat | follow-up 보강 | 애매한 painter에게 짧은 follow-up. 선결제 의향과 quote 공유 재확인 | Follow-up Notes | 미기록 |
| D9 | 2026-05-24 Sun | golden set 정리 | 받은 quote 익명화, 품질 체크, AI eval에 쓸 입력/정답 형태로 분류 | Golden Set Tracker | 미기록 |
| D10 | 2026-05-25 Mon | Stripe manual payment link 발송 | 높은 의향 painter에게 A$59 선결제 링크 발송. 결제 아니면 거절 이유 기록 | Payment Link Tracker | 미기록 |
| D11 | 2026-05-26 Tue | 비용/limit 최종안 | Qwen3-VL-Flash 기준 월 draft limit, quote당 사진 수, assistant generation limit을 결정. 품질 실패 시 fallback 모델 후보와 사용 조건 기록 | Cost Log final | 미기록 |
| D12 | 2026-05-27 Wed | scope 결정안 | T2 photo, T3 streaming, T13/T14 보조 AI를 GREEN/YELLOW별로 정리 | Scope Decision Draft | 미기록 |
| D13 | 2026-05-28 Thu | gate packet 준비 | 인터뷰 evidence, quote seed, cost, payment 상태를 한 페이지로 요약 | Gate Packet | 미기록 |
| D14 | 2026-05-29 Fri | GREEN/YELLOW/RED 결정 | 기준표로 build start, reduced scope, kill/pivot 중 하나 결정 | Gate Result | 미기록 |

## Paid Trial Usage Tracking

앱 구현과 pilot onboarding이 끝난 뒤 2026-08-03부터 실제 사용량을 측정한다. 이 구간의 midpoint가 진짜 "사용 기반 중간 판정"이다.

| Week | 날짜 | 목표 | 측정 방법 | 성공 기준 | 결과 |
|------|------|------|-----------|-----------|------|
| Trial W1 | 2026-08-03 ~ 2026-08-07 | 첫 사용 활성화 | 각 painter가 price_rates 입력 후 첫 AI quote draft 생성 | 5명 중 3명 이상 첫 draft 생성 | 미기록 |
| Trial W2 | 2026-08-10 ~ 2026-08-14 | 사용 기반 중간 판정 | `ai_usage_logs`, quote sent 여부, edit ratio, follow-up draft 사용 여부 확인 | 3명 이상 반복 사용, AI cost ≤30% ARPU | 미기록 |
| Trial W3 | 2026-08-17 ~ 2026-08-21 | quote outcome 확인 | AI draft가 실제 고객 발송/수정/승인으로 이어졌는지 기록 | 발송된 AI quote 5건 이상, critical error 0건 | 미기록 |
| Trial W4 | 2026-08-24 ~ 2026-08-28 | paid conversion 최종 판정 | 계속 사용할 의향, A$59 결제 유지, churn reason 확인 | 1명 이상 paid 유지, 2명 이상 강한 사용 의향 | 미기록 |

## Usage Tracking Metrics

| Metric | 데이터 위치 | 보는 이유 | 결과 |
|--------|-------------|-----------|------|
| AI draft 생성 수 | `ai_usage_logs.feature = quote_draft` | 실제 반복 사용 여부 | 미기록 |
| AI draft edit ratio | quote draft metadata | AI 초안 품질 | 미기록 |
| Quote sent count | `quotes.status` | 초안이 실제 업무로 이어졌는지 | 미기록 |
| Follow-up draft 사용 수 | `ai_usage_logs.feature = follow_up_writer` | 보조 AI 가치 | 미기록 |
| Today Assistant 노출/사용 | dashboard event or `ai_usage_logs.feature = today_assistant` | dashboard helper 가치 | 미기록 |
| AI cost / Pro ARPU | `ai_usage_logs.cost_cents` | A$59 가격에서 감당 가능한지 | 미기록 |
| Critical AI error | manual review log | 가격/GST/분류 사고 방지 | 미기록 |

## Interview Script

각 painter에게 같은 순서로 묻는다. 답은 아래 Interview Log에 그대로 적는다.

1. 한 달에 quote를 몇 개 정도 작성하나요?
2. 지금 quote는 어떤 도구로 만들고, 한 건당 얼마나 걸리나요?
3. 가장 귀찮은 부분은 site measurement, line item 계산, 문장 정리, follow-up 중 무엇인가요?
4. 현장 노트와 rough measurements를 넣으면 AI가 scope, assumptions, exclusions를 초안 작성하는 기능을 쓸 것 같나요?
5. 사진은 quote 작성에 얼마나 자주 쓰나요? 사진이 있으면 AI가 어떤 도움을 주면 좋나요?
6. 사진만으로 자동 면적/가격 산출을 기대하나요, 아니면 노트/측정값 기반 초안 보조면 충분한가요?
7. 본인 price_rates를 앱에 입력하고, AI는 rate를 정하지 않게 하는 방식에 동의하나요?
8. AI draft가 실시간으로 조금씩 나타나는 streaming이 중요한가요, 아니면 10–20초 후 한 번에 나와도 괜찮나요?
9. 오늘 할 일 요약, overdue invoice, quote follow-up 알림이 dashboard에 나오면 유용한가요?
10. 고객에게 보낼 quote check-in, booking request, invoice reminder 문구 초안이 유용한가요?
11. 과거 quote 1개를 익명화해서 eval seed로 공유할 수 있나요?
12. 이 기능이 있으면 A$59/월 Pro를 결제할 의향이 있나요? 지금 선결제 링크를 보내면 결제할 수 있나요?

## Interview Log

| Painter | 날짜 | Quotes/월 | 현재 도구 | Quote 작성 시간 | 핵심 pain | AI Quote Writer 반응 | Photo 기대 | price_rates 동의 | Today Assistant | Follow-up Writer | 과거 quote 공유 | A$59 선결제 | 결정 근거 |
|---------|------|-----------|-----------|-----------------|-----------|----------------------|------------|------------------|-----------------|------------------|----------------|------------|-----------|
| P1 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| P2 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| P3 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| P4 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| P5 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |

## Golden Set Tracker

| Quote ID | Painter | 받는 날짜 | 익명화 상태 | 포함 데이터 | 품질 | eval 사용 가능 | 결과/메모 |
|----------|---------|-----------|-------------|-------------|------|---------------|-----------|
| QG-1 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| QG-2 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| QG-3 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| QG-4 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| QG-5 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |

## Cost Economics Log

목표: A$59 Pro ARPU 기준, 전체 AI cost가 ARPU의 30% 이하인지 확인한다.

| 항목 | 입력값 | 방법 | 결과 |
|------|--------|------|------|
| 기본 provider/model | Alibaba Cloud / Qwen `qwen3-vl-flash` | 사진 분석 + AI quote/follow-up 초안 기본 모델 | 후보 확정 |
| 공식 pricing 확인일 | 2026-05-16 1차 확인 | 실행 당일 provider pricing page 재확인 | Qwen3-VL-Flash 32K 이하 tier input $0.05 / 1M tokens, output $0.40 / 1M tokens |
| quote draft 평균 text input/output | 미기록 | 실제 prompt 초안 기준 token estimate | 미기록 |
| quote당 사진 수 | 기본 3장 | 인터뷰와 비용 계산으로 조정 | 미기록 |
| 사진 resize 정책 | 1920px JPEG 85% | 업로드 전 압축 기준 | 유지 |
| photo analysis cache | image hash/storage path + prompt version | 같은 사진 세트 재분석 방지 | 계획 |
| painter당 quote draft/월 | 미기록 | 인터뷰 quotes/월 평균으로 산정 | 미기록 |
| painter당 Today Assistant/월 | 미기록 | daily usage 또는 dashboard visits 기준 | 미기록 |
| painter당 Follow-up Writer/월 | 미기록 | quote follow-up + invoice reminder 빈도 기준 | 미기록 |
| 월 AI cost / Pro user | 미기록 | draft + photo + assistant generation 합산 | 미기록 |
| AI cost / ARPU | 미기록 | 월 AI cost ÷ A$59 | 미기록 |
| fallback 모델 조건 | 미기록 | Qwen3-VL-Flash가 golden set 품질 기준 미달일 때만 Plus/타 모델 eval | 미기록 |
| 결론 | 미기록 | ≤30%면 통과, 초과면 T2 또는 limit 축소 | 미기록 |

## Stripe Payment Link Tracker

| Link | Painter | 발송일 | 상태 | 결제/거절 이유 | 후속 action |
|------|---------|--------|------|----------------|-------------|
| L1 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| L2 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| L3 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| L4 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |
| L5 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |

## Gate Decision

| 기준 | GREEN | YELLOW | RED | 실제 결과 |
|------|-------|--------|-----|-----------|
| 사용 의향 | 5명 중 3명 이상 "쓸 것 같다" | 5명 중 2명 긍정 | 5명 중 1명 이하 긍정 | 미기록 |
| 선결제 | 1명 이상 A$59 선결제 | 선결제 0명 | 선결제 0명 | 미기록 |
| 과거 quote 공유 | 5개 이상 확보 | 3–4개 확보 | 2개 이하 확보 | 미기록 |
| price_rates 입력 | 대부분 동의 | 일부만 동의 | 대부분 거부 | 미기록 |
| AI 비용 | ARPU 30% 이하 | 30% 초과, limit 조정 가능 | limit 조정해도 30% 초과 | 미기록 |

### GREEN Result

- Build start.
- T2 photo upload는 인터뷰에서 사진 유용성 3/5 이상일 때만 포함한다.
- T3 streaming은 "기다리는 경험"이 pain으로 확인될 때만 포함한다.
- T13/T14는 Pro 보조 AI로 유지한다.

### YELLOW Result

- Reduced scope.
- T2/T3는 defer한다.
- T8 prompt depth를 줄이고, T13/T14는 deterministic UI + template fallback 중심으로 축소한다.
- 1주 추가 validation 후 다시 gate를 연다.

### RED Result

- Build를 멈춘다.
- AI Quote Writer wedge를 재검토한다.
- 대안은 Estimator-as-a-Service, follow-up automation first, 또는 non-AI painter ops app으로 다시 비교한다.

## Final Gate Notes

- 결정일: 미기록
- 최종 판정: 미기록
- build 시작 여부: 미기록
- v1 scope 변경: 미기록
- 다음 문서 업데이트: `V1-PLAN.md`, `docs/PLANS.md`, `docs/features/ai/AI-ASSISTANT.md`
