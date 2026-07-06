# TODOS — Coatly

> Owner: **Claude** (Opus 4.8 · extra) — deferred 우선순위 원장.
> 2026-06-03 product reframe 기준 deferred 항목. 현재 v1은 AI Quote Writer가 아니라 Excel quote workflow replacement다.

## Current Deferred Rule

AI, 사진 분석, damage 판별, AI 가격 산출, generic Workspace Assistant는 **core workflow가 완료되고 릴리즈된 뒤** 별도 plan/design/review를 거쳐 진행한다.

Core workflow release gate:

- A의 실제 Excel price book을 참고해 앱 안에서 필요한 price items를 직접 세팅
- optional simple Excel/CSV paste/upload는 `Service / Item`, `Unit`, `Price` 중심으로 preview/validation
- A의 최근 quote PDF/email 재현
- quote PDF/email/public quote/follow-up/invoice/schedule end-to-end 검증
- lint/test/build/preview/prod smoke

## Pending — Deferred Candidates

### 1. AI quote explanation helper

**What:**
저장된 quote scope, line items, optional items, assumptions를 고객에게 보기 좋은 설명으로 바꾸는 helper.

**Rule:**
AI는 price/rate/GST/total을 만들지 않는다. painter가 검토하기 전에는 저장/발송하지 않는다.

**Blocked by:**
Core quote workflow release.

### 1A. Arbitrary Excel auto-import

**What:**
사용자가 가진 아무 Excel 파일을 자동으로 분석해 Coatly price book으로 매핑하는 기능.

**Rule:**
v1에서는 하지 않는다. 앱 내 직접 price item 추가, 선택적 simple Excel/CSV paste/upload, preview, validation, confirm-save 흐름이 먼저 완성되어야 한다.

**Blocked by:**
Simple price book setup release and at least 2-3 real painter price sheet examples.

### 2. Follow-up Writer

**What:**
quote check-in, approved quote booking request, invoice reminder 문구 초안 작성.

**Rule:**
자동 발송/상태 변경 없음. follow-up due/status/template workflow가 먼저 완성되어야 한다.

**Blocked by:**
Sent quote follow-up loop release.

### 3. Photo hints, not photo takeoff

**What:**
사진에서 visible condition/access/prep hint를 사용자가 검토할 수 있게 제안.

**Not:**
damage diagnosis, hidden moisture/mould 판단, exact sqm/lm, price/rate/GST/total 산출.

**Blocked by:**
Manual quote workflow, photo storage/upload workflow, and user-reviewed scope workflow.

### 4. Stale `price_rates` race condition — snapshot immutability

**What:**
quote draft 또는 future AI helper 생성 시점의 `price_rates`를 snapshot으로 고정해, painter가 rate를 수정해도 기존 quote 가격이 흔들리지 않게 한다.

**Why:**
AI helper가 다시 열리면 “어느 rate 기준으로 설명/후보가 만들어졌는가”가 중요해진다. 현재 saved quote는 snapshot 기준을 유지해야 한다.

**Blocked by:**
Core workflow release and post-core AI reopening.

### 5. Learning-based pricing recommendation

**What:**
painter의 과거 accepted/lost quote를 바탕으로 다음 quote 작성 시 참고치를 제안.

**Rule:**
추천만 허용. price book을 override하거나 자동 적용하지 않는다.

**Blocked by:**
충분한 quote outcome data.

### 6. Workspace Assistant 재논의

**What:**
범용 dashboard chat은 v1 core에서 사용하지 않는다. 실제 사용자들이 quote/follow-up/invoice 외 운영 질문을 반복적으로 요구할 때 재검토한다.

**Blocked by:**
Core workflow release + scoped AI helpers validation.

### 7. Productize Stripe pre-order / paid conversion

**What:**
실제 workflow replacement가 검증되면 pilot/trial/pay conversion을 productized flow로 만든다.

**Blocked by:**
A workflow recreation and first release smoke.

## Operational / Continuous

### 8. Quarterly Australian tradie software monitoring

QuoteMate, Sammy, WonDeal, Let’s Quote, ServiceM8, Tradify, PaintScout, BrushQuote류가 빠르게 움직이고 있다. 분기 1회 경쟁사 포지셔닝, 가격, AI/follow-up 기능을 점검한다.

Trigger:

- 호주 painter-specific AI/follow-up app이 A$29–A$59 가격대에서 강하게 성장
- ServiceM8/Tradify가 painter-specific quote workflow를 강화
- QuoteMate/Sammy가 painting-specific price book import 또는 follow-up loop를 강화

### 9. AI cost economics monitoring

AI가 post-core로 재개될 때만 다시 필요하다. core workflow phase에서는 Qwen/Gemini token economics가 release blocker가 아니다.

## Source Docs

- [docs/PLANS.md](./docs/PLANS.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
- [docs/features/ai/V1-PLAN.md](./docs/features/ai/V1-PLAN.md)
- [docs/features/ai/V1-APP-BUILD-PLAN.md](./docs/features/ai/V1-APP-BUILD-PLAN.md)
- [docs/features/ai/AI-ASSISTANT.md](./docs/features/ai/AI-ASSISTANT.md)
- [docs/features/quote/PRICE-BOOK-TEMPLATE.md](./docs/features/quote/PRICE-BOOK-TEMPLATE.md)
