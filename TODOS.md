# TODOS — Coatly

> v1 plan-eng-review (2026-05-15)에서 의도적으로 v1 scope 밖으로 보낸 항목들. 각 항목은 cold restart 가능한 컨텍스트 포함.

## Pending — v1.1 candidates

### 1. Stale `price_rates` race condition — snapshot immutability

**What:**
AI quote draft 생성 시점의 `price_rates`를 snapshot(immutable freeze)해서 painter가 동일 painter의 price_rates table을 수정해도 기존 AI draft의 가격 보전. v1은 가벼운 mitigation만 — AIDraftPanel에 "이 quote는 YYYY-MM-DD HH:MM 기준 rate로 생성됨" 표시.

**Why:**
Race condition — painter가 price_rates 편집 중 AI quote draft 호출 또는 quote 저장 → AI 출력은 old rate 기반인데 painter가 본 rate는 new rate. PDF 생성·send·customer 분쟁 시 "어느 rate가 정확한가" 모호. failure modes 분석에서 critical gap. legal liability 측면에서도 painter가 "AI가 잘못된 rate 썼다"고 주장할 risk.

**Pros:** AI quote ↔ painter rate ↔ PDF 일관성. Race condition 100% 해결. legal "AI가 잘못된 rate 썼다" 주장 방지.
**Cons:** 1–2일 (schema 1 column 추가 + writer/reader). Test에 race scenario 추가.

**Depends on / blocked by:**
- v1 T1 (AI input schema) 완료 — schema 패턴 결정 후 적용
- v1 T4 (ai_usage_logs migration) 완료 — `price_rates_snapshot jsonb` column pattern 결정
- v1 paid trial에서 painter가 실제 race 경험했는지 확인 (real-world frequency)

**Target:** v1.1 (post-validation, 1–2개월)

---

### 2. Productize Stripe pre-order

**What:**
v1 T10이 manual Stripe payment link로 단축됨. 인터뷰 결과 ≥1 painter 선결제 시 productize 가치 검증 → v1.1로 `app/pre-order/page.tsx` + webhook + idempotency layer + waitlist UI build.

**Target:** v1.1 (GREEN gate 통과 시)

---

### 3. Workspace Assistant 재논의

**What:**
v1 T7로 비활성(feature flag + nav 제거). 코드는 `lib/ai/drafts.ts` (`generateWorkspaceAssistantResult`)와 `components/dashboard/WorkspaceAssistant.tsx`에 유지. paid trial 후 painter가 "quote 외 다른 도구"를 명시적으로 요구하면 활성 검토.

**Target:** v2.0 검토 (post v1 validation)

---

### 4. Gemini Vision photo → surface hint (v1.1)

**What:**
v1은 photo를 evidence/context only (Gemini Flash multimodal에 URL 전달, AI가 보고 참고). v1.1은 Gemini Vision으로 surface area 자동 측정 → AIDraftPanel에 hint로 노출 (painter override 가능).

**Why:** painter가 photo+rough measurements 둘 다 입력하는 cognitive load 줄이는 다음 step. v1 paid trial에서 painter가 사진을 평균 N개 이상 첨부 + rough measurements 텍스트 작성을 부담스러워하면 ROI 있음.

**Target:** v1.1

---

### 5. Learning-based pricing recommendation (v1.2)

**What:**
painter의 과거 quote를 학습 데이터로 → 다음 quote 작성 시 "비슷한 작업은 평균 $X" 제안. AI가 rate 결정하는 게 아니라 painter price_rates에 "참고치" 추가.

**Why:** v1 wedge가 검증되면 painter retention의 다음 wedge. Bolster의 ML pricing approach 호주 native 버전.

**Target:** v1.2

---

## Operational / continuous

### 6. AI cost economics monitoring (v1 in-flight)

Phase 0 dependency 첫 항목 — Gemini Flash 토큰/quote × 평균 painter quotes/월 × $59 ARPU → gross margin ≥70% 시뮬레이션. paid trial 시작 후 매주 review.

Premise 6 fallback 경로: prompt 압축 → Flash → Flash-Lite cascade → per-painter limit 강화 → 가격 재검토.

### 7. 분기별 호주 SaaS landscape monitoring

Premise 3 "1–2년 window"는 가설. 매 분기 1회 Tradify/ServiceM8/Quotient changelog + GitHub 활동 + 미국 AI takeoff SaaS 호주 진출 신호 모니터링. 진출 신호 발견 시 reframe trigger.

---

## Source

- v1 plan eng review (2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-impl-plan-20260515-232820.md`
- v1 design (2026-05-15 APPROVED): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-design-20260515-230649.md`
- 메인 build plan: [docs/features/ai/V1-PLAN.md](./docs/features/ai/V1-PLAN.md)
- Audit table: [docs/features/audit/AUDIT.md](./docs/features/audit/AUDIT.md) (A7, A8)
