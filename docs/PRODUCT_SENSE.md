# Coatly — Product Sense

> Owner: **Claude** (Opus 4.8 · extra) — 제품 기획/시장 분석 문서. 구현·DB·git 결정은 Codex(high) 영역.

## v1 Wedge (2026-06-03 REFRAMED)

Coatly의 v1 구매 이유는 **AI Quote Writer**가 아니다. 실제 painter A의 현재 workflow는:

1. Excel에 이미 정해둔 가격표로 quote 금액 작성
2. PDF로 변환
3. 고객에게 직접 이메일 발송
4. 보낸 quote follow-up을 사람이 기억하고 체크
5. 승인되면 invoice / schedule로 다시 운영 연결

A는 AI 없이도 이 workflow가 Coatly 안에서 안정적으로 끝나면 돈을 낼 수 있다고 답했다. 따라서 v1 wedge는:

> **Excel quote workflow replacement for Australian painters/tradies.**

여기서 Excel은 앱의 live calculation engine이 아니다. v1은 사용자의 기존 Excel 파일을 원본 자료로 보고, 앱 안에서 단순 price item을 직접 추가해 Coatly price book으로 저장하는 방식이다. Excel/CSV 템플릿은 선택적 bulk input일 뿐, 시작 조건이 아니다.

AI, 사진 분석, damage 판별, AI 가격 산출은 core workflow가 완성되고 릴리즈된 뒤에만 검토한다. 현장 damage와 scope 판단은 painter가 눈으로 확인하는 것이 현재 더 정확하며, v1의 AI 역할은 나중에 quote 설명과 follow-up 문구를 줄이는 보조 레이어로 제한한다.

## Problem Statement

호주 소규모 painter/tradie는 견적 자체를 이미 나름의 방식으로 처리한다. 문제는 “견적 계산을 못한다”가 아니라, **Excel/PDF/email/follow-up/invoice/schedule이 끊어진 도구에 흩어져 반복 admin이 생긴다**는 점이다.

- 주 2–4개 quote 작성
- quote 하나당 30분 이상 소요 가능
- Excel 가격표는 익숙하지만 PDF/email/follow-up이 수동
- quote 설명, scope, exclusions가 약하면 고객 신뢰와 질문 대응이 약해짐
- follow-up을 놓치면 이미 보낸 quote가 inbox에서 식음

## Value Proposition

**Coatly = painter/tradie용 quote-to-follow-up workflow replacement**

| 가치 | 설명 |
|------|------|
| Existing price book setup | 기존 Excel 가격표를 참고해 앱 안에서 service/unit/price 중심의 단순 price book을 직접 세팅. Excel/CSV는 선택적 bulk input |
| Fast quote creation | 현장에서 painter가 확인한 scope를 바탕으로 quote 작성 |
| Professional PDF/email | 앱에서 PDF 생성과 고객 이메일 발송을 한 번에 처리 |
| Quote follow-up loop | sent/viewed/approved/rejected/follow-up due 상태와 다음 액션을 추적 |
| Quote-to-invoice/schedule | 승인된 quote를 invoice와 schedule/job으로 연결 |
| AI admin layer (post-core) | core workflow 릴리즈 후 quote 설명, assumptions/exclusions, follow-up 문구 초안 작성 |

## Target User

| 속성 | 값 |
|------|-----|
| 직업 | Residential & commercial painter, painting-adjacent small tradie |
| 위치 | 호주 (AUD, GST 10%, ABN) |
| 업체 규모 | 1–3인 |
| 기술 수준 | 스마트폰은 사용 가능, 복잡한 SaaS 세팅은 부담 |
| 현재 도구 | Excel, Word/PDF, email, calendar, manual reminders |
| 핵심 니즈 | 기존 가격표 유지, 빠른 quote send, follow-up 누락 방지, invoice/schedule 연결 |

## Competitive Landscape (2026-06-03)

| 경쟁사 | 강점 | Coatly에 주는 의미 |
|--------|------|--------------------|
| QuoteMate | 호주 tradie용 AI quote/invoice, supplier pricing, PDF, Xero, follow-up, Pro A$29/mo | generic AI tradie quote 시장은 이미 붐빔. Coatly가 AI-first면 직접 충돌 |
| Sammy AI Estimator | 호주 tradie용 AI estimator, voice-to-quote, PDF, price lists, job/client tracking | “AI로 견적 생성”은 차별점이 아님 |
| Let’s Quote | 호주 painter 전용, paint defaults, rooms, area/rates, worksheets, job/customer/invoice | painter-specific workflow 기준 경쟁자 |
| ServiceM8 / Tradify | quote, invoice, schedule, templates, follow-up, AI writing까지 보유 | all-in-one generic field service로 정면승부하면 불리함 |
| WonDeal / QuoteChase | quote follow-up만 좁게 자동화 | follow-up pain이 실제이며, Coatly workflow가 무거우면 더 쉬운 대안에 밀림 |
| PaintScout / BrushQuote / Paint Quote Now | painting proposal, e-sign, viewed tracking, room scan/AI quote, auto follow-up | proposal quality와 quote speed 기대치를 높임 |
| PaintLike Pro / QuoteReady / Estimo / PaintQuote Pro | 신규 또는 소규모 quoting 앱도 offline-first, AI estimating, room-by-room quote, low monthly pricing을 전면에 둠 | 인스타/검색 광고에서 보이는 "빠른 quote app" 포지션은 이미 붐빔. Coatly는 기존 Excel 업무 이관과 후속 운영 루프를 더 명확히 잡아야 함 |

### Research Sources

- [QuoteMate](https://quotemateapp.au/)
- [Sammy AI Estimator](https://www.withsammy.ai/)
- [Let's Quote](https://letsquote.com.au/)
- [ServiceM8 AU Pricing](https://www.servicem8.com/au/pricing)
- [WonDeal](https://wondeal.au/)
- [QuoteChase](https://quotechase.app/)
- [PaintScout](https://www.paintscout.com/)
- [BrushQuote](https://brushquote.app/)
- [PaintLike Pro](https://paintlike.com.au/)
- [QuoteReady](https://www.quoteready.com.au/)
- [Estimo](https://estimo.com.au/)
- [PaintQuote Pro](https://www.paintquoteapp.com/)

## Market Snapshot (2026-07-05 리서치 반영)

12-agent 교차 검증 분석에서 확정된 시장 사실:

- **시장 규모**: 호주 페인팅/데코 사업체 약 23–24k, 사업체당 평균 2.5명 — 솔로/마이크로 80–90% 추정. 좁게 잡은 SAM ~20k 소규모 업체.
- **진짜 경쟁자는 Excel/종이** — 소규모 트레이디의 50–60%가 여전히 수기/스프레드시트 운영. 병목은 가격이 아니라 습관 교체 비용.
- **WTP 앵커**: A$29–50/월. ServiceM8 A$29(job수 과금, 무료 티어)가 심리적 하한. Starter A$39는 "더 싸다"로는 못 이김 — 가벼움·follow-up으로 이겨야 함.
- **PaintScout**(유일한 페인터 전용 직접 경쟁): USD $119+/user + CRM $49 — 미국 중심·중대형 지향·호주 존재감 낮음. 호주 솔로 페인터용 저가·경량 견적 워크플로우 자리는 실제로 비어 있음.
- **follow-up 자동화는 경쟁사 전원이 상위 티어/유료 add-on에 gating** (Jobber Connect, PaintScout CRM). **저가 기본 제공이 유일하게 방어 가능한 차별점** — 단, quote follow-up reminder cron은 현재 미구현(AUDIT A9)이라 이 차별점은 코드로 완성돼야 성립.
- **과금 구조 마찰**이 이 시장 최대 심리 장벽: job수 제한(ServiceM8)·per-user(Tradify/Fergus) 불만 반복 — Coatly의 flat 과금은 유효한 선택.
- **계절성**: 9–12월 성수기, 겨울 비수기 churn 증폭 위험 → 연간 플랜(A$450/A$680)으로 방어, 신규 획득은 late-winter 집중.
- **CAC**: 유료 광고 CAC는 이 세그먼트에서 비싸고 데이터 불확실 — 유닛경제는 저CAC 채널(Master Painters 협회, 페인트 도매상, 로컬 FB 그룹, 리퍼럴) 전제로만 성립. 1→10명은 수동 확보, 10→100에서 첫 CAC/churn 실측 후 가격 재검토.
- **포지셔닝 주의**: 랜딩의 "Job Management" 프레임은 ServiceM8/Tradify와 정면 비교를 자초 — "Excel 대체" wedge 언어로 교체 필요(PLANS P2).

## Differentiation

Coatly가 이길 수 있는 지점은 “AI가 있다”가 아니라 다음 세 가지다.

1. **Simple price book setup-first**
   기존 가격표를 버리라고 하지 않는다. 하지만 사용자가 복잡한 Excel 템플릿을 먼저 정리해야 한다고 만들지도 않는다. 앱 안에서 `Service / Item`, `Unit`, `Price`만으로 시작하고, Excel/CSV는 대량 입력이 필요한 경우의 선택 옵션으로 둔다.

2. **Painting-first workflow depth**
   generic tradie AI보다 좁게 간다. Interior/exterior painter의 rooms, surfaces, prep, coating, colour, optional items, exclusions, warranty, access, water damage limitation, touch-up limitation을 제대로 다룬다.

3. **Quote send loop, not quote generator**
   `create quote`에서 끝나지 않는다. `send -> follow-up -> accept -> invoice/schedule`까지 끊기지 않는 운영 루프가 제품의 중심이다. 경쟁사는 follow-up 자동화를 상위 플랜에 gating하므로 **저가 기본 제공**이 핵심 차별점 — 단 quote follow-up reminder cron이 미구현(AUDIT A9)이라 최우선 구현 대상.

## Pricing Strategy

현재 코드 기준 customer-facing plan은 Starter / Pro다.

| Plan | 가격 | v1 기준 가치 |
|------|------|--------------|
| Starter | A$39/mo | 월 10 active quotes, quote/PDF/email/follow-up 기본 workflow |
| Pro | A$59/mo | unlimited quotes/templates, workflow automation, branding, priority support |

이전 Basic A$29 + AI limits 가정은 AI-first plan이므로 superseded 상태다. A의 실제 workflow 재현 테스트와 경쟁 가격(QuoteMate/WonDeal A$29, ServiceM8 Starter A$29)을 본 뒤 pricing은 별도 재검토한다.

## AI Policy

AI는 core v1 scope가 아니다.

Core workflow 릴리즈 전 금지:

- AI quote automation
- AI photo/damage analysis
- photo-only takeoff
- AI-generated price/rate/GST/total
- generic workspace chatbot
- 자동 follow-up 발송 또는 상태 변경

Core workflow 릴리즈 후 검토:

- quote explanation helper
- assumptions/exclusions wording helper
- follow-up email/SMS draft
- deterministic task summary
- photo hints for visible conditions only, user-reviewed, no pricing

## Validation Plan

가장 중요한 다음 검증은 경쟁 분석이 아니라 A의 실제 업무 재현이다.

1. A의 실제 Excel 가격표를 확보한다.
2. 최근 보낸 quote PDF/email 1개에 필요한 price items만 골라 앱 안에서 직접 세팅한다.
3. 선택적 simple Excel/CSV paste/upload가 필요하면 `Service / Item`, `Unit`, `Price` 중심으로만 검증한다.
4. Coatly에 saved price book을 만든다.
5. 같은 quote를 Coatly에서 처음부터 재현한다.
6. PDF/email/follow-up/invoice/schedule까지 end-to-end로 테스트한다.
7. 막힌 지점을 `docs/PLANS.md`와 관련 feature docs에 반영한다.

Pass 기준:

- A가 quote 하나에 필요한 service/unit/price를 앱 안에서 직접 세팅 가능
- Excel/CSV bulk input을 쓰더라도 단순 컬럼만 요구하고 복잡한 템플릿 정리를 요구하지 않음
- Excel quote와 Coatly quote total이 의도한 차이 없이 일치
- PDF가 A가 고객에게 보낼 수 있는 수준
- email send와 public quote link가 정상 동작
- follow-up due 상태가 사람이 기억하지 않아도 보임
- approved quote에서 invoice/schedule로 이어짐

## Key Metrics

| Metric | 설명 | 목표 |
|--------|------|------|
| Price book setup success | 기존 Excel 가격표를 참고해 앱 안에서 필요한 price items를 저장까지 완료한 pilot 비율 | 첫 3명 중 2명 이상 |
| Quote recreation time | 기존 quote 1개를 Coatly로 재현하는 시간 | 세팅 후 10분 이하 |
| Quote send completion | quote 생성 후 PDF/email 발송 완료율 | 90%+ |
| Follow-up visibility | sent quote 중 follow-up due가 누락 없이 표시되는 비율 | 100% |
| Quote-to-invoice/schedule | approved quote가 invoice/job으로 전환되는 비율 | pilot에서 수동 검증 |

## Australian Compliance

| 항목 | 구현 |
|------|------|
| GST (10%) | 모든 금액에 자동 계산, 별도 표시 |
| ABN | 프로필에 필수, ABR API로 자동 검증 |
| Tax Invoice 요건 | 사업자명, ABN, 날짜, 항목, GST 별도 표시 |
| Privacy | 사용자별 RLS 격리, public token route 보안 점검 |
