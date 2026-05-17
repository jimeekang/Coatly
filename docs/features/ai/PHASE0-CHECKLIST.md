# AI-assisted Quote Form Builder Validation, Build, and Trial Checklist

> 기준일: 2026-05-16. Phase 0 validation 기간: 2026-05-15 금요일부터 2026-05-29 금요일까지 14일. 2026-05-17 기준 GREEN으로 판정했고, 이후 8주 build와 4주 Free Pro Trial + Paid Conversion Tracking으로 이어진다.

## Rule

- Phase 0 목적은 기능을 만들기 전에 **5명 painter가 실제로 돈을 낼 문제인지** 확인하는 것이다.
- GREEN gate 전에는 v1 build를 시작하지 않는다.
- 모든 인터뷰 결과는 이 파일에 기록하고, 미확인 항목은 "미기록"으로 둔다.
- 과거 quote는 고객 이름, 주소, 전화번호, 이메일을 지운 뒤 eval seed로만 사용한다.
- v1 기본 모델 후보는 Alibaba Cloud / Qwen `qwen3-vl-flash`다. 가격/성능은 Phase 0 D6/D11에 공식 문서 기준으로 다시 확인한다.
- AI 비용 계산은 실행 당일 공식 model pricing으로 다시 입력한다. 2026-05-16 확인 기준은 Qwen3-VL-Flash 32K 이하 tier input $0.05 / 1M tokens, output $0.40 / 1M tokens지만, 최종 spreadsheet는 실행일 가격을 사용한다.
- 실제 사용량 트래킹은 앱 구현 후 Free Pro Trial + Paid Conversion Tracking에서만 판정한다. 인터뷰 단계의 중간 점검은 build 여부를 위한 정성 신호와 trial 후보 확보를 본다.
- v1 build는 AI 연동부터 시작하지 않는다. **price_rates, quote item 구조, subtotal/GST/total 계산, quote form structure가 먼저 안정돼야 AI-assisted Quote Form Builder를 붙인다.**
- AI는 가격을 만들거나 rate를 고르지 않는다. AI는 scope 문장, surface 후보, assumptions/exclusions만 초안 작성하고, 금액은 앱의 deterministic quote calculation engine이 계산한다.
- 과거 견적서 form은 AI eval seed일 뿐 아니라 quote form data model seed로 사용한다. v1 quote form은 `scope section` + `pricing row` + `clause library`를 분리한다.
- 2026-05-17 pricing decision: Basic은 A$29/month, Pro는 A$59/month로 둔다. 첫 사용자 cohort는 Pro 1개월 무료 trial을 제공하고, 이후 Pro 결제로 전환을 유도한다. 사용자는 언제든지 취소할 수 있다.
- Gate decision은 선결제 1건이 아니라 **Pro 무료 trial cohort 확보 + 가격/limit 정책 확정 + trial 이후 paid conversion 측정 가능성**을 기준으로 GREEN으로 전환한다.

## Full Timeline

| Phase | 기간 | 날짜 | 목적 | 판정 |
|-------|------|------|------|------|
| Phase 0 Validation | 2주 | 2026-05-15 ~ 2026-05-29 | 인터뷰, 과거 quote 확보, 비용 계산, trial 후보와 가격 반응 확인 | GREEN/YELLOW/RED build decision |
| v1 Build | 8주 | 2026-06-01 ~ 2026-07-24 | price rate/quote calculation foundation → quote form structure → AI-assisted Quote Form Builder → 보조 AI/usage tracking 구현 | Internal readiness |
| Integration + Onboarding | 1주 | 2026-07-27 ~ 2026-07-31 | production deploy, pilot painter 세팅, price_rates 입력, 첫 quote 생성 확인 | Trial start readiness |
| Free Pro Trial + Paid Conversion Tracking | 4주 | 2026-08-03 ~ 2026-08-28 | 실제 사용량, AI 품질, 비용, quote outcome, trial 이후 결제 전환 측정 | Midpoint + final decision |

## v1 Build Plan Before Usage Tracking

실제 사용량을 보려면 앱 구현이 먼저 끝나야 한다. 기능 구현 순서, 파일별 작업 범위, AI 연동, 사진 분석, usage/cost logging 방법은 [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md)를 기준 문서로 둔다. Task 1 세부 구현은 [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md), Task 2 Quick/Advanced rate boundary 세부 구현은 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)를 참조한다.

이 체크리스트에는 validation 결과와 trial tracking 기록만 남긴다. 세부 구현 설명은 build plan과 [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md)에 분리한다.

| Week | 날짜 | 목표 | 상세 방법 | 결과 기록 |
|------|------|------|-----------|-----------|
| Build W1 | 2026-06-01 ~ 2026-06-05 | Pricing source audit + canonical total path | [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md) Task 1 + [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md) | 완료. 2026-05-17 기준 canonical totals/optional add-on/public quote/invoice preset parity, duplicate priced scope guard, PDF regression, full suite/build/lint 통과 |
| Build W2 | 2026-06-08 ~ 2026-06-12 | Price Rates setup + Room Price Library boundary | Task 2-3. Task 2 세부 계획: [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md), Task 3 세부 계획: [V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md](./V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md) | Task 2 완료. Quick metadata completeness, Advanced numeric snapshot, setup diagnostics, A$0 selected-source blocking, invalid surface validation, stale-rate tests, full suite/build/lint 통과. 다음은 Task 3 Room Price Library redesign |
| Build W3 | 2026-06-15 ~ 2026-06-19 | Quote form schema + Scope/Clause builder UI | Task 4-5 | Task 3 이후 customer-visible scope/clause UI 구현으로 진행 |
| Build W4 | 2026-06-22 ~ 2026-06-26 | Regression suite + legacy quote reconstruction | Task 5 + Test matrix | 미기록 |
| Build W5 | 2026-06-29 ~ 2026-07-03 | AI input schema + Qwen adapter + usage logging | Task 6-7 | 미기록 |
| Build W6 | 2026-07-06 ~ 2026-07-10 | AI Quote Form Builder core | Task 8 | 미기록 |
| Build W7 | 2026-07-13 ~ 2026-07-17 | Photo helper + Today Assistant + Follow-up Writer | Task 9-12 | 미기록 |
| Build W8 | 2026-07-20 ~ 2026-07-24 | Pilot readiness + production hardening | Task 13-14 | 미기록 |

## Phase 0 Day-by-Day Plan

| Day | 날짜 | 목표 | 방법 | 산출물 | 결과 |
|-----|------|------|------|--------|------|
| D0 | 2026-05-15 Fri | 인터뷰어 5명 섭외 완료 | 직접 연락, 지인 소개, 로컬 painter outreach | 5명 후보 리스트 | 완료. P1-P5 응답 원문 확보됨 |
| D1 | 2026-05-16 Sat | 운영 문서 준비 | 이 체크리스트 작성, 질문 script 확정, quote 공유 요청 문구 준비 | `PHASE0-CHECKLIST.md` | 완료. Phase 0 체크리스트, AI model policy, quote form structure 링크, legacy quote form tracker 작성됨 |
| D2 | 2026-05-17 Sun | 인터뷰 일정 확정 | 각 painter에게 30분 slot 2개 제안, 과거 quote 1개 선공유 요청 | 확정된 interview calendar | 완료/대체. 30분 calendar 대신 written survey 5명분을 2026-05-16 기준 수집. follow-up 질문은 D8로 이동 |
| D3 | 2026-05-18 Mon | 인터뷰 1–2 진행 | Zoom/전화 30분. 현재 quote 작성 flow, quick/advanced rate 구조, AI 반응, price_rates 동의 확인 | Interview Log P1/P2, Pricing Notes | 완료/앞당김. P1/P2 log 반영. P1은 문장 정리와 follow-up pain, P2는 measurement/line item/photo expectation 강함 |
| D4 | 2026-05-19 Tue | 인터뷰 3–4 진행 | 같은 script로 진행. 사진 사용 의향, follow-up pain, room/surface/add-on 이중 계산 위험을 깊게 확인 | Interview Log P3/P4, Pricing Notes | 완료/앞당김. P3/P4 log 반영. P3은 A$59 강한 긍정, P4는 현재 quote volume 0으로 pilot fit 낮음 |
| D5 | 2026-05-20 Wed | 인터뷰 5 진행 + 누락 quote 회수 | 마지막 인터뷰 후 미제출 quote 재요청 | Interview Log P5, quote 5개 목표 | 진행 중. P5 log 반영 완료. legacy PDF 3개 확보. painter별 과거 quote 5개 목표는 아직 미달 |
| D6 | 2026-05-21 Thu | pricing model + AI cost economics 1차 계산 | painter 답변을 기준으로 quick/advanced rate 구조 초안 작성. Qwen3-VL-Flash 공식 pricing 확인 후 text draft, photo draft, today summary, follow-up draft 비용을 월 사용량으로 계산 | Pricing Model Draft, Cost Log v1 | 진행 중. quote volume range 0-10/month 확인, active 응답자 평균 약 4-6 quotes/month. Qwen3-VL-Flash 2026-05-16 1차 가격 기록 완료, 공식 재확인과 spreadsheet 필요 |
| D7 | 2026-05-22 Fri | Validation 중간 점검 | 5명 반응을 GREEN/YELLOW/RED 신호로 분류. script에서 약한 질문 보완. 실제 사용량 판정은 build 후 Free Pro Trial + Paid Conversion Tracking에서만 진행 | Midpoint Decision Notes | 완료/앞당김. 정성 사용 의향 5/5, Today/Follow-up 5/5 긍정. A$59 선결제 검증 대신 Pro 1개월 무료 trial 후 paid conversion 측정으로 gate 기준 변경 |
| D8 | 2026-05-23 Sat | follow-up 보강 | 애매한 painter에게 짧은 follow-up. 선결제 의향과 quote 공유 재확인 | Follow-up Notes | 필요. P1/P2에게 eval seed 의미 재설명, P3에게 AI pricing boundary 설명, P4/P5에게 current usage fit 확인, 추가 quote 공유 재요청 |
| D9 | 2026-05-24 Sun | golden set + quote form structure 정리 | 받은 quote 익명화, 품질 체크, AI eval과 price calculation scenario에 쓸 입력/정답 형태로 분류. 과거 견적서 form을 scope/pricing/clause 구조로 분해 | Golden Set Tracker, Price Scenario Tracker, Legacy Quote Form Tracker | 진행 중. legacy PDF 3개는 scope/pricing/clause 분석 완료. painter별 anonymized quote golden set은 추가 회수 필요 |
| D10 | 2026-05-25 Mon | Pro trial 초대 기준 정리 | 높은 의향 painter에게 Pro 1개월 무료 trial 조건, A$59 전환 가격, cancel anytime 정책을 설명한다. 선결제 링크는 보내지 않고 trial 후보/거절 이유를 기록한다 | Pro Trial Invite Tracker | 완료/대체. 선결제 검증 대신 Pro trial → A$59 conversion 검증으로 변경. P1/P2/P3는 trial 후보, P4/P5는 insight/adjacent 후보 |
| D11 | 2026-05-26 Tue | 비용/limit 최종안 | Qwen3-VL-Flash 기준 월 draft limit, quote당 사진 수, assistant generation limit을 결정. 품질 실패 시 fallback 모델 후보와 사용 조건 기록 | Cost Log final | 진행 중. 비용 단가는 1차 기록됐지만 prompt token estimate, photo count별 cost, monthly limit은 미확정 |
| D12 | 2026-05-27 Wed | scope 결정안 | T2 photo, T3 streaming, T13/T14 보조 AI를 GREEN/YELLOW별로 정리 | Scope Decision Draft | 진행 중. Photo helper는 5/5 관심 있으나 photo-only auto takeoff 기대는 제한해야 함. Streaming은 P1만 강한 선호, T3는 조건부. Today/Follow-up은 v1 유지 신호 강함 |
| D13 | 2026-05-28 Thu | gate packet 준비 | 인터뷰 evidence, quote seed, cost, payment 상태를 한 페이지로 요약 | Gate Packet | 완료/앞당김. 가격 정책과 trial 정책을 기준으로 gate packet 요약 반영 |
| D14 | 2026-05-29 Fri | GREEN/YELLOW/RED 결정 | 기준표로 build start, reduced scope, kill/pivot 중 하나 결정 | Gate Result | 완료/앞당김. 2026-05-17 기준 GREEN. Basic A$29, Pro A$59, Pro 1개월 무료 trial, anytime cancel 정책으로 진행 |

## Free Pro Trial and Paid Conversion Tracking

앱 구현과 pilot onboarding이 끝난 뒤 2026-08-03부터 첫 사용자에게 Pro 1개월 무료 trial을 제공한다. 이 구간의 midpoint가 진짜 "사용 기반 중간 판정"이고, trial 종료 후 A$59/month Pro 결제 전환을 본다. 사용자는 언제든지 취소할 수 있다.

| Week | 날짜 | 목표 | 측정 방법 | 성공 기준 | 결과 |
|------|------|------|-----------|-----------|------|
| Trial W1 | 2026-08-03 ~ 2026-08-07 | Pro 무료 trial 시작 + 첫 사용 활성화 | 각 painter에게 Pro trial 부여, price_rates 입력 후 첫 AI quote draft 생성 | 5명 중 3명 이상 첫 draft 생성 | 미기록 |
| Trial W2 | 2026-08-10 ~ 2026-08-14 | 사용 기반 중간 판정 | `ai_usage_logs`, quote sent 여부, edit ratio, follow-up draft 사용 여부 확인 | 3명 이상 반복 사용, AI cost ≤30% ARPU | 미기록 |
| Trial W3 | 2026-08-17 ~ 2026-08-21 | quote outcome 확인 | AI draft가 실제 고객 발송/수정/승인으로 이어졌는지 기록 | 발송된 AI quote 5건 이상, critical error 0건 | 미기록 |
| Trial W4 | 2026-08-24 ~ 2026-08-28 | paid conversion 최종 판정 | 계속 사용할 의향, A$59 Pro 전환 의향, cancel reason 확인 | 1명 이상 A$59 Pro 전환, 2명 이상 강한 사용 의향 | 미기록 |

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
| Quote total mismatch | quote preview/save/detail/PDF/invoice 비교 | 계산 경로 불일치 방지 | 미기록 |
| Duplicate anchor prevented | validation/error log | room anchor/line item 이중 청구 방지 | 미기록 |
| Rate setup completion | pilot onboarding checklist | painter별 price_rates 준비 상태 | 미기록 |

## Interview Script

각 painter에게 같은 순서로 묻는다. 답은 아래 Interview Log에 그대로 적는다.

1. 한 달에 quote를 몇 개 정도 작성하나요?
2. 지금 quote는 어떤 도구로 만들고, 한 건당 얼마나 걸리나요?
3. 가장 귀찮은 부분은 site measurement, line item 계산, 문장 정리, follow-up 중 무엇인가요?
4. 현장 노트와 rough measurements를 넣으면 AI가 scope, assumptions, exclusions를 초안 작성하는 기능을 쓸 것 같나요?
5. 사진은 quote 작성에 얼마나 자주 쓰나요? 사진이 있으면 AI가 어떤 도움을 주면 좋나요?
6. 사진만으로 자동 면적/가격 산출을 기대하나요, 아니면 노트/측정값 기반 초안 보조면 충분한가요?
7. 본인 price_rates를 앱에 입력하고, AI는 rate를 정하지 않게 하는 방식에 동의하나요?
8. 지금 가격을 잡을 때 room 기준, surface 기준, day rate, material/service add-on 중 무엇을 가장 많이 쓰나요?
9. Quick mode에서는 방 타입 + 크기 + walls/ceiling/trim 선택만으로 충분한가요, 아니면 door/window/skirting까지 빠른 입력이 필요하나요?
10. Advanced mode에서는 어떤 항목을 반드시 세밀하게 나눠야 하나요? 예: room anchor, wall/ceiling/trim, doors, windows, skirting, prep, access, material.
11. 같은 작업이 room price에 포함됐는지, 별도 line item인지 헷갈려서 중복으로 넣는 경우가 있나요?
12. 기존 quote에서 "included scope"와 "optional add-on"은 어떻게 구분하나요?
13. AI draft가 실시간으로 조금씩 나타나는 streaming이 중요한가요, 아니면 10–20초 후 한 번에 나와도 괜찮나요?
14. 오늘 할 일 요약, overdue invoice, quote follow-up 알림이 dashboard에 나오면 유용한가요?
15. 고객에게 보낼 quote check-in, booking request, invoice reminder 문구 초안이 유용한가요?
16. 과거 quote 1개를 익명화해서 eval seed와 price calculation scenario로 공유할 수 있나요?
17. 이 기능이 있으면 A$59/월 Pro를 결제할 의향이 있나요? Pro 1개월 무료 trial 후 계속 쓴다면 결제 전환할 수 있나요?

## Interview Log

원문: [docs/inverview-answer.txt](../../inverview-answer.txt). 원문은 이전 12문항 script로 수집되어 현재 script의 Quick/Advanced 상세 질문 일부는 follow-up이 필요하다.

| Painter | 날짜 | Quotes/월 | 현재 도구 | Quote 작성 시간 | 핵심 pain | AI Quote Form 반응 | Photo 기대 | price_rates 동의 | Today Assistant | Follow-up Writer | 과거 quote 공유 | A$59/Pro trial 반응 | 결정 근거 |
|---------|------|-----------|-----------|-----------------|-----------|----------------------|------------|------------------|-----------------|------------------|----------------|------------|-----------|
| P1 | 2026-05-16 수집 | 4-8 | Word | 10-20분 | 문장 정리, follow-up. Residential에서는 site measure/line item pain 낮음 | 조건부 긍정. site 문제점까지 자동 작성되면 사용 | Quote 사진은 드묾. 사진은 별도 report, photo-only 산출보다 notes/measurement 보조 충분 | 동의 | 매우 유용 | 유용 | 의미 설명 필요 | 거절 | A$59는 quote volume 대비 비쌈. 하루 10건 이상이면 고려 |
| P2 | 2026-05-16 수집 | 1-2 | 현장 눈대중 M2/LM + 수기 판단 | 1-2시간 | site measurement, line item, 문장, follow-up 모두 | 강한 긍정 | 사진 많이 사용. photo-only measurement/cost expectation 강함 | 동의 | 긍정 | 긍정 | 동의, 용어 설명 필요 | 거절 | 기능 pain은 크지만 A$59는 매우 비쌈. under A$20이면 고려 |
| P3 | 2026-05-16 수집 | 약 10 | Word + ChatGPT | 약 20분 | ChatGPT 사용 후 큰 pain은 낮음 | 긍정 | 사진은 드묾. 고객이 중요하게 보는 부분에 사진+작업 설명 필요 | 부분 동의 | 긍정 | 긍정 | 동의 | 강한 긍정 | A$59 사용 의향 있음. 다만 AI price 반영을 원해 deterministic pricing boundary 설명 필요 |
| P4 | 2026-05-16 수집 | 0 | GPT | 약 20분 | site measurement | 정확도에 따라 조건부 | 사진은 condition check 용도. 측정값 기반 + 사진 상태 확인 선호 | 동의 | 긍정 | 긍정 | 미응답 | 조건부 | 현재 quote volume 0. 월 50건 이상 상황이면 고려 |
| P5 | 2026-05-16 수집 | 현재 0, 과거 약 2/month | ChatGPT | 약 20분 | line item 계산. 비전문가라 정확성 확신 어려움 | 긍정 | 사진 주로 사용. AI estimate 기대도 있으나 사진과 실사 차이 때문에 초안 보조면 충분 | 동의 | 긍정 | 긍정 | 동의 | 조건부 | 전문 painter는 아니지만 일이 많다면 결제 의향. handyman/maintenance 확장 신호 |

### Interview Findings Summary

| 항목 | 현재 확인 |
|------|-----------|
| AI Quote Form 사용 의향 | 5/5 긍정 또는 조건부 긍정. 다만 P3/P5는 이미 ChatGPT를 쓰고 있어 Coatly의 차별점은 quote form structure, pricing safety, PDF/public flow가 되어야 함 |
| Photo 기능 | 5/5 관심. P2는 photo-only measurement/cost를 기대하지만, P1/P4/P5는 notes/measurement 중심 + condition/scope 보조가 더 현실적이라고 답변 |
| `price_rates` 입력 | 4/5 동의, P3는 AI price 반영을 원함. v1에서는 AI가 rate를 만들지 않고 painter review + deterministic calculator로 제한해야 함 |
| Today Assistant | 5/5 긍정. v1 보조 AI 범위에 유지할 근거 있음 |
| Follow-up Writer | 5/5 긍정. 자동 발송 없이 초안 작성 범위로 유지 |
| A$59/Pro trial 반응 | 강한 긍정 1/5(P3), 명확한 가격 반대 2/5(P1/P2), volume 조건부 2/5(P4/P5). Basic A$29 + Pro trial로 가격/패키징 risk를 낮춘다 |
| Pilot fit | P1/P2/P3가 painter pilot 후보. P4/P5는 사용량이 낮아 interview insight는 유효하지만 Free Pro Trial cohort로는 약함 |

## Pricing Interview Notes

각 painter가 실제로 어떻게 가격을 잡는지 별도로 기록한다. 이 표의 목적은 Quick/Advanced 구조를 단순하지만 안전하게 만드는 것이다.

| Painter | 주 pricing 방식 | Quick에 필요한 최소 입력 | Advanced에 필요한 상세 항목 | included vs add-on 구분 | 중복 계산 위험 | rate setup 난이도 | 결과/메모 |
|---------|----------------|---------------------------|-----------------------------|-------------------------|----------------|------------------|-----------|
| P1 | Residential quote는 line item보다 scope wording 중심 | 방/표면 선택 + 문장 초안이면 충분할 가능성 | commercial/detail 필요성 낮다고 봄. site issue 자동 문장화가 더 중요 | 미기록 | 낮음-중간. line item을 크게 쓰지 않음 | 낮음 | Follow-up: included/add-on 구분과 실제 rate 방식 확인 필요 |
| P2 | Ceiling/walls는 M2, woodwork는 LM, 현장 눈대중 | surface + M2/LM rough input 필요 | ceiling/walls/woodwork, photo condition, site visit fallback | 미기록 | 높음. photo estimate와 manual M2/LM이 겹칠 수 있음 | 중간 | Photo-only expectation을 v1 scope 보조로 재정렬해야 함 |
| P3 | Word + ChatGPT 기반, 구체 pricing 방식 미기록 | room/surface quick input needs follow-up | AI price suggestion 요구. painter rate + app calculator 원칙 설명 필요 | 미기록 | 높음. AI price와 app price가 이중 anchor가 될 수 있음 | 중간 | Strong paid signal. Pricing boundary 교육 후 pilot 후보 |
| P4 | 현재 quote 없음. measurement pain 중심 | measurements + photo condition check | condition, site measurement, accuracy confidence | 미기록 | 중간. 낮은 사용량 때문에 실제 검증 약함 | 낮음 | Pilot보다는 insight용. current quote volume follow-up 필요 |
| P5 | line item 계산 pain. 비전문가/maintenance 성격 | photo + notes + guided line item choices | scope, line items, condition, trade-specific template | 미기록 | 높음. 비전문가에게 자동 가격처럼 보이면 위험 | 높음 | Guided presets와 deterministic calculator가 핵심. handyman/maintenance 확장 신호 |

## Golden Set Tracker

| Quote ID | Painter | 받는 날짜 | 익명화 상태 | 포함 데이터 | 품질 | eval 사용 가능 | 결과/메모 |
|----------|---------|-----------|-------------|-------------|------|---------------|-----------|
| QG-1 | Legacy PDF | 2026-05-16 | 익명화 필요 | Winchester interior sent quote | 높음 | 가능 | scope/clause eval seed. customer/address redaction 필요 |
| QG-2 | Legacy PDF | 2026-05-16 | 개인정보 낮음 | Edgar interior/exterior intake checklist | 중간 | 부분 가능 | AI intake taxonomy seed. 가격 eval보다는 form coverage용 |
| QG-3 | Legacy PDF | 2026-05-16 | 익명화 필요 | Paint Buddy exterior sent quote | 높음 | 가능 | exterior scope, optional item, clause eval seed |
| QG-4 | P3/P2/P5 후보 | 미수령 | 미기록 | painter별 실제 quote | 미기록 | 대기 | 공유 의향은 확인됐지만 파일 회수 필요 |
| QG-5 | P1/P4 후보 | 미수령 | 미기록 | painter별 실제 quote | 미기록 | 대기 | P1은 eval seed 용어 설명 필요, P4는 미응답 |

## Price Scenario Tracker

과거 quote를 AI eval뿐 아니라 계산 회귀 테스트 seed로도 쓴다. 고객 정보는 반드시 제거한다.

| Scenario ID | Painter | Quote source | Mode 후보 | 포함 scope | Optional/add-on | Expected subtotal | GST | Total | 중복 anchor check | 결과/메모 |
|-------------|---------|--------------|-----------|------------|-----------------|-------------------|-----|-------|------------------|-----------|
| PS-1 | Legacy PDF | Winchester interior quote | Advanced/manual interior | Ceiling, Walls, Doors & Door Frames, Bathroom | 없음 | PDF total-only라 row 역산 필요 | 확인 필요 | 확인 필요 | section과 priced row 분리 필요 | form reconstruction 가능, numeric fixture는 redaction 후 작성 |
| PS-2 | Legacy PDF | Edgar checklist | Intake/form taxonomy | Interior rooms/surfaces, Exterior surfaces | 없음 | 없음 | 없음 | 없음 | 가격 scenario 아님 | AI intake checklist와 item taxonomy seed |
| PS-3 | Legacy PDF | Paint Buddy exterior quote | Exterior estimate | Eaves, rendered walls, cladding, retaining walls, front door, timber | Fence optional | PDF 기준 입력 필요 | PDF 기준 입력 필요 | PDF 기준 입력 필요 | optional fence가 base total에 섞이지 않게 확인 | exterior regression seed로 사용 가능 |
| PS-4 | P2 interview | 답변 기반 scenario | Advanced surface | ceiling/walls M2, woodwork LM | 미기록 | 미기록 | 미기록 | 미기록 | photo estimate와 manual M2/LM 중복 방지 | 실제 quote 파일 회수 필요 |
| PS-5 | P5 interview | 답변 기반 scenario | Guided manual/service | line item 계산 보조, photo/notes scope | 미기록 | 미기록 | 미기록 | 미기록 | 비전문가에게 자동 가격처럼 보이지 않게 guard 필요 | maintenance/handyman 확장 검토용 |

## Legacy Quote Form Tracker

과거 quote를 고객용 form 구조 재현 테스트로 쓴다. 고객 정보는 반드시 제거한다.

| Form ID | Source | Quote type | Scope sections | Pricing rows | Clause items | Optional items | Data structure result | 결과/메모 |
|---------|--------|------------|----------------|--------------|--------------|----------------|-----------------------|-----------|
| QF-1 | Winchester St quote | Interior | Ceiling, Walls, Doors & Door Frames, Bathroom | Total-only quote로 priced row 역산 필요 | Inclusions, terms, paint risks | 없음 | `scope_sections` + `clauses` seed | 완료. Interior sent quote structure 분석됨 |
| QF-2 | Edgar checklist | Interior/Exterior intake | checklist form | 없음 | payment/signature shell | 없음 | AI intake taxonomy seed | 완료. Intake checklist와 surface taxonomy seed로 분류됨 |
| QF-3 | Paint Buddy quote | Exterior | Eaves, Rendered walls, Cladding, Retaining walls, Front door, Timber, Fence | base total + optional fence | Exceptions, efflorescence, peeling, furniture, warranty, deposit, validity | Fence | exterior scope + optional item + clause seed | 완료. Exterior sent quote + optional item + clause library seed로 분류됨 |

## Cost Economics Log

목표: A$59 Pro ARPU 기준, 전체 AI cost가 ARPU의 30% 이하인지 확인한다.

| 항목 | 입력값 | 방법 | 결과 |
|------|--------|------|------|
| 기본 provider/model | Alibaba Cloud / Qwen `qwen3-vl-flash` | 사진 분석 + AI quote/follow-up 초안 기본 모델 | 후보 확정 |
| 공식 pricing 확인일 | 2026-05-16 1차 확인 | 실행 당일 provider pricing page 재확인 | Qwen3-VL-Flash 32K 이하 tier input $0.05 / 1M tokens, output $0.40 / 1M tokens |
| quote draft 평균 text input/output | 미기록 | 실제 prompt 초안 기준 token estimate | 미기록 |
| quote당 사진 수 | Basic 3장, Pro 5장 | plan별 photo limit으로 비용과 오남용 통제 | 5/5 사진 기능 관심. photo-only takeoff는 제한하고 Basic 3/photo quote, Pro 5/photo quote로 확정 |
| 사진 resize 정책 | 1920px JPEG 85% | 업로드 전 압축 기준 | 유지 |
| photo analysis cache | image hash/storage path + prompt version | 같은 사진 세트 재분석 방지 | 계획 |
| painter당 quote draft/월 | 0-10 range | 인터뷰 quotes/월 평균으로 산정 | active 후보 기준 약 4-6/month. cost spreadsheet는 low 2, base 5, high 10으로 계산 |
| painter당 Today Assistant/월 | 미기록 | daily usage 또는 dashboard visits 기준 | 5/5 유용하다고 응답. 실제 횟수는 Free Pro Trial + Paid Conversion Tracking에서 측정 |
| painter당 Follow-up Writer/월 | 미기록 | quote follow-up + invoice reminder 빈도 기준 | 5/5 유용하다고 응답. quote volume과 invoice reminder 빈도 follow-up 필요 |
| 월 AI cost / Pro user | Pro draft 25/month, photo 100/month, follow-up 50/month 기준 | draft + photo + assistant generation 합산 | D11 spreadsheet에서 최종 산정. Qwen 단가 기준 30% ARPU 이하로 통제 가능성이 높음 |
| AI cost / ARPU | Pro A$59, Basic A$29 | 월 AI cost ÷ plan ARPU | plan별 monthly limit으로 통제. Basic은 photo 15/month, Pro는 photo 100/month |
| fallback 모델 조건 | 미기록 | Qwen3-VL-Flash가 golden set 품질 기준 미달일 때만 Plus/타 모델 eval | 미기록 |
| 결론 | GREEN 방향 | ≤30%면 통과, 초과면 T2 또는 limit 축소 | Basic/Pro limit 확정으로 gate는 GREEN. 최종 비용 spreadsheet는 D11에 숫자로 확정 |

## Pricing and Packaging Decision

2026-05-17 기준 가격 정책이다. Basic에도 AI를 제공해 "AI quote app" 가치를 바로 느끼게 하되, 사진 분석과 고급 quote form generation은 Pro 업그레이드 이유로 둔다.

| 항목 | Basic | Pro |
|------|-------|-----|
| 월 가격 | A$29/month | A$59/month |
| 첫 사용자 offer | 없음. 필요 시 launch discount 별도 검토 | 첫 cohort Pro 1개월 무료 trial |
| 취소 정책 | 언제든지 취소 가능 | 언제든지 취소 가능 |
| Quote / Invoice / Customer | 포함 | 포함 |
| PDF quote / public quote link | 포함 | 포함 |
| Price rates setup | 포함 | 포함 |
| Quick quote / manual quote | 포함 | 포함 |
| AI quote draft | 5/month | 25/month |
| Photos per quote | 3 | 5 |
| Monthly photo AI limit | 15 photos/month | 100 photos/month |
| Photo AI 역할 | visible condition + scope wording 보조 | multi-photo scope, condition, assumption/exclusion 보조 |
| Follow-up Writer | 10/month | 50/month |
| Today Assistant | deterministic task list only | deterministic task list + AI summary |
| Advanced AI scope/clause builder | 제한된 scope draft | 전체 Scope section + pricing candidate + clause review flow |
| Clause library | 기본 clause | 전체 clause library + custom clause 저장 |
| AI usage/cost view | 기본 사용량 표시 | 사용량, photo count, estimated cost 표시 |
| Support | 기본 support | priority support |

### Pricing Boundary

- Basic/Pro 모두 AI가 price, rate, GST, total을 만들지 않는다.
- Basic의 AI는 notes 기반 quote wording helper로 제한한다.
- Basic photo AI는 quote당 3장, 월 15장으로 제한한다.
- Pro photo AI는 quote당 5장, 월 100장으로 제한한다.
- Pro 1개월 무료 trial은 기능 제한 없이 Pro limit을 사용하게 한다.
- 무료 trial 종료 후 A$59/month 결제 전환을 측정한다.
- trial 중 언제든 cancel할 수 있으며, cancel reason을 반드시 기록한다.

## Pro Trial and Conversion Tracker

| Trial | Painter | 초대일 | 상태 | 가격 반응 | 후속 action |
|-------|---------|--------|------|-----------|-------------|
| T1 | P3 | 미발송 | Pro trial 후보 | A$59 사용 의향 있음 | pricing boundary 설명 후 1개월 Pro trial 초대 |
| T2 | P1 | 미발송 | Basic/Pro trial 후보 | A$59는 quote volume 대비 비쌈 | Basic A$29 + Pro trial 비교 제안 |
| T3 | P2 | 미발송 | Basic/Pro trial 후보 | A$59는 비싸고 under A$20 선호 | Basic A$29 가치 검증, photo limit 기대치 조정 |
| T4 | P4 | 미발송 | insight용 | 현재 quote volume 0 | trial cohort보다는 product feedback 후보 |
| T5 | P5 | 미발송 | adjacent user 후보 | 일이 많다면 결제 의향 | handyman/maintenance 확장성 확인 |

## Gate Decision

| 기준 | GREEN | YELLOW | RED | 실제 결과 |
|------|-------|--------|-----|-----------|
| 사용 의향 | 5명 중 3명 이상 "쓸 것 같다" | 5명 중 2명 긍정 | 5명 중 1명 이하 긍정 | GREEN 신호. 5/5 긍정 또는 조건부 긍정 |
| 가격 정책 | A$29 Basic + A$59 Pro + trial 이후 paid conversion 측정 가능 | 가격은 있으나 plan boundary가 약함 | 사용자가 A$19 이하만 원함 | GREEN. Basic A$29, Pro A$59, Pro 1개월 무료 trial, cancel anytime 정책 확정 |
| Trial commitment | 3명 이상 Pro trial 후보 | 1-2명 trial 후보 | trial 후보 없음 | GREEN. P1/P2/P3는 painter trial 후보, P4/P5는 insight/adjacent 후보 |
| 과거 quote 공유 | 5개 이상 확보 | 3–4개 확보 | 2개 이하 확보 | YELLOW 신호. legacy PDF 3개 확보, painter별 quote 추가 필요 |
| price_rates 입력 | 대부분 동의 | 일부만 동의 | 대부분 거부 | GREEN/YELLOW. 4/5 동의, P3는 AI price 반영 원함 |
| pricing 구조 명확도 | 5명 중 3명 이상 quick/advanced rate 구조에 동의 | 구조는 필요하지만 일부 혼란 | 대부분 "가격 구조 입력이 어렵다" | YELLOW. P2만 M2/LM 명확, Quick/Advanced follow-up 필요 |
| quote 계산 안전성 | golden price scenario 5개 이상 만들 수 있음 | 3–4개만 만들 수 있음 | 2개 이하만 만들 수 있음 | YELLOW. legacy 3개 scenario 가능, numeric fixture와 painter quotes 부족 |
| quote form coverage | legacy quote form 3개를 scope/pricing/clause 구조로 재현 가능 | 2개만 재현 가능 | 1개 이하만 재현 가능 | GREEN. 3개 legacy form 분석 완료 |
| AI 비용 | ARPU 30% 이하 | 30% 초과, limit 조정 가능 | limit 조정해도 30% 초과 | GREEN 방향. Qwen 단가가 낮고 Basic/Pro 월 photo limit으로 비용 통제 가능. 최종 spreadsheet는 D11에 확정 |

### Final Gate Result

- 최종 판정: **GREEN**
- build 시작: 진행
- pricing decision: Basic A$29/month, Pro A$59/month
- first user offer: Pro 1개월 무료 trial
- cancellation: anytime cancel
- payment validation: 선결제 대신 trial 종료 후 A$59 Pro conversion으로 측정
- build prerequisite: price_rates, quote calculation boundary, quote form structure를 AI 연동보다 먼저 구현

### GREEN Result

- Build start.
- T0/T0A pricing foundation은 무조건 먼저 진행한다.
- T2 photo upload는 인터뷰에서 사진 유용성 3/5 이상일 때만 포함한다.
- T3 streaming은 "기다리는 경험"이 pain으로 확인될 때만 포함한다.
- T13/T14는 Pro 보조 AI로 유지한다.

### YELLOW Result

- Reduced scope.
- T0/T0A pricing foundation은 유지한다. 가격 구조가 불명확하면 AI scope를 더 줄인다.
- T2/T3는 defer한다.
- T8 prompt depth를 줄이고, T13/T14는 deterministic UI + template fallback 중심으로 축소한다.
- 1주 추가 validation 후 다시 gate를 연다.

### RED Result

- Build를 멈춘다.
- AI-assisted Quote Form Builder wedge를 재검토한다.
- 대안은 Estimator-as-a-Service, follow-up automation first, 또는 non-AI painter ops app으로 다시 비교한다.

## Final Gate Notes

- 결정일: 2026-05-17
- 최종 판정: GREEN
- build 시작 여부: 진행
- v1 scope 변경: Basic A$29에도 제한된 AI 제공. Pro A$59는 full AI Quote Form Builder + photo AI + Today Assistant AI summary + Follow-up Writer 확장 제공
- trial 정책: 첫 사용자에게 Pro 1개월 무료 사용 제공, 이후 A$59/month 결제 전환 유도, 언제든 취소 가능
- 다음 문서 업데이트: `V1-PLAN.md`, `docs/PLANS.md`, `docs/features/ai/AI-ASSISTANT.md`
