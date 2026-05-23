# Coatly v1 — AI-assisted Quote Form Builder

> v1 wedge 요약. 원문은 `~/.gstack/projects/jimeekang-Coatly/` 의 design + impl-plan 파일. 2026-05-17 기준.

## Wedge (Office Hours, 2026-05-15 APPROVED)

**AI-assisted painting-first maintenance Quote Form Builder (notes + rough measurements + photos → scope sections + clauses + deterministic pricing rows) + lightweight AI operations helpers + 호주 native PDF + pricing validation.**

- 호주 1–3인 painter (sole trader / small team) 대상. Pain: site measurement(20–60분) 자체는 OK, **노트→quote 서류화**가 진짜 문제.
- 시장 갭: Jobber/ServiceM8/Tradify/Fergus/Buildxact 같은 general job-management SaaS는 quoting, scheduling, invoicing, 일부 AI writing/assistant 기능까지 계속 붙이고 있다. Coatly의 gap은 "AI가 있음/없음"이 아니라 **호주 painting 현장 기준의 scope, prep, access, substrate, risk clause, deterministic pricing intelligence**다.
- AI는 wedge 본질이다. 다만 v1 AI는 가격을 만드는 기능이 아니라 **고객용 quote form 초안**을 만드는 기능이다.
- v1 보조 AI 범위: **Today Assistant**(오늘 처리할 follow-up / overdue invoice / job 요약) + **Follow-up Writer**(고객에게 보낼 SMS/email 초안). 둘 다 만능 챗봇이 아니라 기존 quote/customer/invoice/job 데이터 위의 좁은 helper.
- v1 AI model default: **Alibaba Cloud / Qwen `qwen3-vl-flash`**. 사진 분석 + quote/follow-up 초안 생성의 기본 모델로 두되, provider adapter 뒤에 감싸서 향후 교체 가능하게 만든다.
- v1.1+ stack: stronger photo takeoff model eval → learning-based pricing → customer portal (one-click accept + Stripe deposit). 각 phase 별도 wedge 검증.
- 과거 견적서 분석 기준으로 quote form은 `scope section` + `pricing row` + `clause library`를 분리한다. 상세 구조는 [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md)에 둔다.

## Positioning Update (2026-05-23)

Paint-only SaaS로 고정하면 시장과 사용 빈도가 좁다. 그러나 v1에서 바로 generic maintenance SaaS로 뛰면 plumbing/electrical/carpentry 정확도, liability, permission model, property manager workflow 때문에 범위가 터진다. 따라서 Coatly의 포지션은 다음처럼 잡는다.

> **Painting-first quote intelligence for maintenance-style jobs.**

제품 언어는 "페인터 CRM"이나 "Jobber/ServiceM8 대체"가 아니다. Coatly는 기존 운영 앱을 완전히 갈아타게 하는 도구가 아니라, **현장 노트/사진/rough measurement를 고객에게 보낼 수 있는 quote, scope, explanation, report-style summary로 바꾸는 intelligence layer**다. 기존 Coatly의 quote → public approval → booking/job → invoice 흐름은 유지하되, v1 마케팅과 AI workflow는 quote/scope intelligence에 집중한다.

### v1 Maintenance Boundary

v1에서 허용하는 maintenance는 painting 인접 작업만이다.

| 포함 | 이유 |
|------|------|
| wall patch + repaint | painting quote 안에서 자주 발생하고 prep/risk clause로 설명 가능 |
| water damage repaint | source repair excluded, stain block, best-effort disclosure가 중요 |
| end-of-lease touch-up | 사진/노트 기반 scope 정리와 빠른 quote 가치가 큼 |
| pre-sale refresh | 고객용 explanation/report-style summary 가치가 큼 |
| exterior maintenance repaint | eaves/fascia/gutter/render/timber repaint와 겹침 |
| deck/stain maintenance | coating/prep/access clause 중심으로 제한 가능 |
| mould treatment + repaint | treatment scope와 recurrence/liability clause가 필요 |
| strata/common area touch-up | repeated small jobs, before/after report seed로 적합 |

v1에서 제외한다.

- Plumbing, electrical, HVAC, structural repair, roofing repair, pest, asbestos, waterproofing diagnosis
- Property manager portal, tenant/owner approval workflow, multi-property request queue
- Full maintenance CRM/scheduling/payroll/GPS/supplier replacement
- "AI가 모든 maintenance 견적을 자동 산출"하는 promise

Property manager / strata 방향은 v1.1+에서 **report artifact**부터 검증한다. v1에서는 별도 portal이나 request table을 만들지 않고, 기존 customer properties와 quote/public/PDF 흐름 위에서 "maintenance report-style quote"를 만들 수 있는 구조만 준비한다.

## Phase 0 — Validation (14 days, GREEN 완료)

운영 체크리스트와 결과 기록장은 [PHASE0-CHECKLIST.md](./PHASE0-CHECKLIST.md)에 둔다.

| 작업 | 상태 |
|------|------|
| 인터뷰어 5명 섭외 | ✓ 완료 (2026-05-15) |
| written survey / 인터뷰 답변 5명분 수집 | ✓ 완료 (2026-05-16) |
| 인터뷰 분석 — photos?, price_rates 정확도?, Today/Follow-up 반응 | ✓ 완료. 5/5 AI quote 관심, 5/5 Today/Follow-up 긍정, 4/5 price_rates 입력 동의 |
| 과거 quote form 3개 분석 — interior/exterior scope, optional item, clause library | ✓ 완료. Winchester, Edgar checklist, Paint Buddy를 scope/pricing/clause 구조로 분해 |
| Quote form structure 문서화 | ✓ 완료. [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md) 작성 |
| v1 build 순서 문서화 | ✓ 완료. [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md) 작성 |
| AI model decision | ✓ 완료. Alibaba Cloud / Qwen `qwen3-vl-flash`를 v1 기본 모델 후보로 확정 |
| 가격 정책 / plan packaging | ✓ 완료. Basic A$29/month, Pro A$59/month, 첫 사용자 Pro 1개월 무료 trial, anytime cancel |
| AI cost economics spreadsheet | 진행 중. Qwen 단가와 plan limit 기준 GREEN 방향, D11에서 final spreadsheet 필요 |
| Golden set numeric fixture | 진행 중. legacy form 3개 분석 완료, painter별 anonymized quote 추가 회수 필요 |

### Gate Result (2026-05-17)

**GREEN — build start approved.**

근거:

- AI Quote Form 사용 의향: 5/5 긍정 또는 조건부 긍정
- Trial 후보: P1/P2/P3
- Price policy: Basic A$29 + Pro A$59 확정
- First user offer: Pro 1개월 무료 trial, trial 후 A$59/month 전환 측정
- Cancellation: 언제든지 취소 가능
- Quote form coverage: legacy quote form 3개를 scope/pricing/clause 구조로 재현 가능
- Build prerequisite: `price_rates`, quote calculation boundary, quote form structure를 AI 연동보다 먼저 구현

남은 Phase 0 기록:

- D11 cost spreadsheet에서 Qwen token/photo estimate와 Basic/Pro limit별 예상 gross margin을 숫자로 확정한다.
- painter별 anonymized quote 5개 목표는 계속 회수한다.
- numeric golden set은 W4 legacy quote reconstruction에서 fixture로 만든다.

## Build (6–8주, GREEN 후 시작 가능)

Build 순서는 **pricing-first + form-structure-first**다. AI-assisted Quote Form Builder가 v1 wedge의 중심이지만, 첫 구현은 AI provider가 아니라 `price_rates`, quote calculation engine, 고객용 quote form data structure 정리다. Quick/Advanced 견적에서 anchor가 중복되거나 subtotal/GST/total이 화면마다 다르게 계산되면, AI를 붙여도 신뢰할 수 없는 견적이 된다. 또한 AI가 만든 문장이 가격 row와 섞이면 PDF/public quote/invoice 전환이 지저분해진다.

구현자가 따라갈 파일별 순서와 방법은 [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md)에 분리한다. Task 1 가격 계산 foundation은 [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md), Task 2 Quick/Advanced rate boundary는 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)를 기준으로 구현한다.

| ID | 영역 | 핵심 |
|----|------|------|
| T0 | Price rate + quote calculation foundation | `quick_estimate`, `detailed_estimate_anchors`, `detailed_estimate_items`, `room_rate_presets`, `quote_estimate_items`, `quote_line_items`의 역할을 분리. "one priced scope, one anchor" 규칙, canonical subtotal/GST/total calculator, snapshot/version 기준 확정 |
| T0A | Quick + Advanced hardening | 완료. Quick은 room size + selected surfaces + coating/condition multiplier snapshot. Advanced는 room anchor + explicit opening/trim numeric snapshot. duplicate room anchor, stale rate, preview/save/PDF/invoice mismatch 테스트 작성 |
| T0B | Quote form data model | `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, `quote_ai_intake_snapshots` 구조 확정. 기존 `quote_estimate_items`/`quote_line_items`와 연결. interior/exterior/painting-adjacent maintenance taxonomy와 clause library seed 작성 |
| T1 | AI input schema + provider adapter | `photos`, `price_rates_snapshot`, `job_type`, `maintenance_job_pack`, `scope_notes`, `rough_measurements` 추가 / `customers`, `quotes` context 제거 (P1 cost 보호). `lib/ai/providers/qwen.ts` 같은 얇은 adapter로 `qwen3-vl-flash` 호출을 숨김. **AI 역할 boundary: `scope_sections`, `pricing_candidates`, `clauses`만 생성하고 pricing은 T0 calculator가 deterministic 처리** |
| T2 | Photo upload + multimodal | Qwen3-VL-Flash vision input 사용. Supabase Storage RLS, Basic quote당 3장/월 15장, Pro quote당 5장/월 100장, 1920px JPEG 85%, photo-only auto takeoff 금지 |
| T3 | Streaming response | **Server Action + ReadableStream** (Day 0 spike mandatory). Qwen streaming response 호환성 확인. RSC streamUI / API SSE 아님. Phase 0 painter check 조건부 |
| T4 | Per-painter usage limit + cost log | `ai_usage_logs` 테이블 (generated `billing_month` column, attempt accounting). Basic/Pro plan limit과 Pro trial usage를 함께 기록 |
| T5 | Error handling + graceful degradation | Qwen/Alibaba provider down → 1 retry → manual builder fallback CTA |
| T6 | AIDraftPanel wire-up + Pro gating + manual correction UX | `QuoteCreateScreen`에 노출. AI draft를 Scope/Pricing/Terms review flow로 넣고, `scope_sections`와 `clauses`는 inline 편집, 가격은 deterministic preview로만 표시. edit ratio metadata 저장 |
| T7 | Generic Workspace Assistant off | 범용 채팅 UI는 feature flag + nav 제거. 코드는 v2 검토용 유지하고, v1은 T13/T14의 scoped assistants만 노출 |
| T8 | AU prompt tuning + eval harness + validator | AU domain depth (prep, access, substrate, climate, occupied) + painting-adjacent maintenance job packs. 10 golden quotes + legacy PDF 3개 form reconstruction + 3 maintenance scenario fixtures. `lib/ai/validator.ts` repair layer (price field 제거, unsupported trade rejection, clause/scope schema repair) |
| T9 | Settings/ai-usage page | 단순 SQL aggregate. 사용수 / Pro limit / 예상 비용 |
| T10 | Pro free trial + paid conversion setup | 첫 cohort는 Pro 1개월 무료 trial. trial 종료 후 A$59/month 결제 전환을 측정하고 cancel reason을 기록. productized billing dashboard는 v1.1 deferred |
| T11 | DRAFT marker + ToS disclaimer | "DRAFT — review before send" UI + PDF marker. AI 책임 conditional ToS |
| T12 | Regression test (IRON RULE) | T0/T0A price boundary + T1 schema 영향 — quote total parity, duplicate anchor guard, `lib/ai/drafts.test.ts`, `app/actions/ai-drafts.test.ts`, `components/ai/AIDraftPanel.test.tsx` |
| T13 | Today Assistant | Dashboard에 deterministic task list + AI summary. Follow-up 필요한 quote, overdue invoice, 오늘/이번 주 job만 표시. Basic은 deterministic list, Pro는 AI summary |
| T14 | Follow-up Writer | Quote/customer/invoice 화면에서 고객 메시지 초안 생성. 견적 확인 요청, 승인 후 일정 잡기, invoice reminder. **자동 발송 없음** — user review 후 기존 email flow 또는 manual copy |

### Maintenance Expansion Task Mapping

Maintenance 확장은 새 제품 라인이 아니라 v1 AI Quote Form Builder 안의 job type/taxonomy 확장이다. 구현 순서는 아래 task 번호를 따른다.

| 구현 task | 포함 작업 | 완료 기준 |
|-----------|-----------|-----------|
| **Task 4 — Quote Form Structure Schema** | `job_type = maintenance`를 first-class로 처리하고, `quote_scope_sections.section_kind`에 `maintenance`를 허용한다. `metadata`에는 `maintenance_job_pack`, visible defect tags, optional `priority`(`urgent`, `soon`, `cosmetic`, `to_confirm`)를 담는다. 별도 property manager request/portal table은 만들지 않는다. | schema/RLS/type이 interior/exterior/both/maintenance를 모두 저장하고, maintenance scope가 price row 없이도 customer-visible section으로 남을 수 있다 |
| **Task 5 — Scope Builder, Clause Library, PDF/Public Rendering** | Scope Builder에 maintenance job pack 선택을 추가한다. Clause Library에 water damage, mould recurrence, tenant/owner access, source repair excluded, colour match/touch-up limits, strata/common area access, before/after photo note를 추가한다. PDF/public quote는 "quote"와 "maintenance report-style summary" 섹션을 같은 데이터로 렌더한다. | end-of-lease touch-up, water damage repaint, strata common area touch-up fixture가 section order, optional item, clause, total parity를 통과한다 |
| **Task 6 — AI Input Schema + Qwen Adapter** | AI input에 `maintenance_job_pack`, `property_context`, `visible_defects`, `access_notes`를 추가한다. AI output은 `scope_sections`, `pricing_candidates`, `clauses`, `questions_for_user`만 허용한다. plumbing/electrical/structural/roofing 같은 unsupported trade는 validator가 `unsupported_scope`로 reject하거나 `refer_to_specialist` question으로 돌린다. | maintenance prompt가 price/rate/GST 없이 painting-adjacent scope만 생성하고 unsupported trade를 자동 quote하지 않는다 |
| **Task 8 — AI Quote Form Builder UI** | Quote create 시작점에서 job type을 `Interior`, `Exterior`, `Both`, `Maintenance / touch-up`으로 제공한다. Maintenance 선택 시 job pack chips를 보여주되, price는 기존 quick/advanced/exterior/manual pricing pass로만 만든다. | painter가 maintenance draft를 생성한 뒤 Scope/Pricing/Terms review를 거치기 전에는 저장/발송할 수 없다 |
| **Task 9 — Photo Helper** | 사진 분석은 visible condition/defect hint와 section 연결만 한다. 사진만으로 damage cause, exact area, hidden moisture, total price를 만들지 않는다. | photo-only maintenance draft는 `to_confirm` 질문을 남기고 priced row를 생성하지 않는다 |
| **Task 11 — Today Assistant** | deterministic task list에 approved maintenance quote needing booking, overdue maintenance invoice, upcoming maintenance job, missing before/after photo follow-up을 추가한다. | AI summary가 task를 발명하지 않고 existing quote/invoice/job data만 요약한다 |
| **Task 12 — Follow-up Writer** | 기존 quote check-in/booking/invoice reminder 외에 maintenance-specific explanation draft를 추가한다: water damage limitation, touch-up colour match limitation, strata/common area access request. | 자동 발송/상태 변경 없이 user-reviewed message draft만 생성한다 |
| **Task 14 — Pilot Readiness** | Paint Buddy 내부에서 maintenance-style smoke tests를 추가한다: wall patch + repaint, water damage repaint, end-of-lease touch-up, strata/common area touch-up. | 첫 pilot 전에 maintenance draft 3건 이상이 PDF/public quote까지 깨지지 않고, critical unsupported trade error 0건이다 |
| **v1.1+ only** | property manager/strata portal, owner/tenant approval workflow, recurring maintenance request queue, before/after report PDF productization | v1 paid conversion 이후 별도 validation gate |

### Build Progress Snapshot (2026-05-17)

| 영역 | 상태 | 다음 필요 작업 |
|------|------|----------------|
| T0 / Task 1 canonical totals + duplicate scope guard | 완료. `calculateQuoteTotals()`가 quote total authority가 되었고 optional add-on, public quote preview, quote-to-invoice preset parity, deterministic duplicate priced scope guard, PDF route regression, full suite/build/lint가 통과했다 | 완료 |
| T0A Quick/Advanced hardening | 완료. Quick metadata completeness, Advanced numeric snapshot, setup diagnostics, A$0 selected-source blocking, invalid surface blocking, stale-rate tests, quote/PDF/invoice regression이 통과했다 | 완료 |
| T0B Room Price Library source redesign | 완료. Quick room matrix가 canonical Room Price Library가 됐고 Advanced preset/quote/server metadata가 template id/version/label/size/per-surface snapshot을 저장한다 | Task 4 quote form structure schema로 이동 |
| Task 4 quote form structure schema | 완료. `quotes.job_type`, scope section/step/clause/AI intake snapshot schema, RLS/grants, price-free quote taxonomy, painting-adjacent maintenance job packs, quote create/update persistence가 구현됐다 | Task 5 Scope Builder, Clause Library, PDF/Public rendering |
| AI provider / Qwen work | 시작 전 | AI pricing candidates는 Task 4 quote form structure schema와 deterministic candidate review path가 준비된 뒤 연결 |

## AI 역할 boundary (D6 / Codex Hybrid)

- Precondition: T0/T0A/T0B price rate 구조, canonical quote calculator, Room Price Library source redesign은 완료됐다. Task 4 schema 이후 AI candidate 적용을 시작한다.
- AI **does**: free-text notes → `quote_scope_sections`, `quote_scope_steps`, assumptions, exclusions, risk disclosure, `quote_clause_items` 초안
- AI **does**: surface/area 후보를 `pricing_candidates`로 제안
- AI **does NOT**: rate 결정, `quote_estimate_items.total_cents` 생성, GST 계산 — 출력 schema에서 price/rate field 제거
- Server-side pass: painter `price_rates` snapshot에서 surface × coating type lookup → canonical quote calculator로 금액 생성 (`lib/ai/apply-deterministic-pricing.ts`)
- GST: app server-side, AI는 net (ex-GST) 출력만
- 보조 AI **does**: deterministic query 결과를 요약하고, follow-up 메시지 초안을 작성
- 보조 AI **does NOT**: 고객에게 자동 발송, job 일정 변경, invoice/quote status 변경, due date 발명

## Price Rate & Quote Item Boundary

v1 quote 계산은 "어떤 항목이 돈을 만드는가"를 먼저 고정한다.

| 영역 | authoritative source | 저장 위치 | 금지 사항 |
|------|----------------------|-----------|-----------|
| Scope section | user-reviewed AI/manual/template section | `quote_scope_sections`, `quote_scope_steps` | customer-visible text를 price row처럼 사용하지 않음 |
| Quick estimate | Quick room snapshot: room size, selected surfaces, coating/condition multiplier | `pricing_method_inputs`, `quote_estimate_items` | 같은 room/surface를 `quote_line_items`로 다시 더하지 않음 |
| Advanced detailed estimate | room anchor + explicit door/window/skirting/trim items | `pricing_method_inputs`, `quote_estimate_items` | room anchor와 전체 property anchor를 같은 base subtotal에 섞지 않음 |
| Manual/custom add-on | user-entered material/service/custom item | `quote_line_items` | already-included scope를 add-on처럼 중복 청구하지 않음 |
| Day rate | days × daily rate + material method | `pricing_method_inputs` | AI가 days/rate를 임의 변경하지 않음 |
| Clause library | reusable/customer-visible terms | `quote_clause_items` | clause 문구가 가격을 만들지 않음 |
| AI draft | scope/surface candidates + clauses only | `quote_ai_intake_snapshots`, draft metadata before user review | price/rate/GST field 출력 금지 |

필수 guardrail:

- `quote_estimate_items`는 estimate engine이 만든 priced rows만 담는다.
- `quote_line_items`는 material/service/custom/optional add-on만 담는다.
- quote preview, save, detail, PDF, invoice conversion은 같은 subtotal/GST/total 규칙을 사용한다.
- rate 변경 후 기존 quote는 snapshot 기준으로 유지하고, 새 quote만 새 rates를 사용한다.
- AI가 만든 scope는 저장 전 user review를 거치고, 금액은 deterministic pricing pass가 생성한다.

2026-05-17 implementation note:

- Task 2 is complete. Quick estimate saves complete source metadata in `pricing_method_inputs` and `quote_estimate_items.metadata`.
- Advanced estimate saves numeric room anchor, opening, and trim snapshots. Old quotes keep saved totals after `price_rates` / `detailed_estimate_anchors` changes.
- room-level `include_doors` / `include_windows` toggles were removed from the priced room surface row. Doors/windows are explicit opening items only.
- 세부 구현 결과는 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)에 기록한다.

## AI-assisted Quote Form Builder Structure

과거 견적서 3개 분석 결과, 실제 painter quote는 line item 계산서가 아니라 **작업 설명서 + 조건/예외 문서 + 가격 요약**에 가깝다. 따라서 v1 quote form은 다음 구조를 따른다.

| 구조 | 예시 | 데이터 |
|------|------|--------|
| Scope section | Ceiling, Walls, Bathroom, Rendered walls, Fence optional item | `quote_scope_sections` |
| Scope step | light sanding, 1 coat primer, 2 coats Weathershield, colour to be confirmed | `quote_scope_steps` |
| Pricing row | eaves 40 sqm × rate, door/frame each × rate, optional fence fixed price | `quote_estimate_items`, `quote_line_items` |
| Clause item | Vivid White, paint peeling, water damage, efflorescence, furniture moving, warranty | `quote_clause_items` |
| AI intake | notes, rough measurements, photos, colour/sheen status, prompt/model metadata | `quote_ai_intake_snapshots` |

Interior taxonomy must cover bedrooms, bathrooms, living, kitchen, hallway, stairway, laundry, wardrobe, walls, ceiling, cornice, doors, door frames, windows, skirting, trim, bathroom/wet area, colour match, Vivid White, water damage, peeling paint.

Exterior taxonomy must cover rendered walls, cladding boards, eaves/soffits, fascia/barge boards, gutters, downpipes, gable, timber, front door, exterior doors/frames, windows/frames, retaining walls, fence, handrail, poles, roof, concrete overhang, pool retaining wall, porous render, efflorescence, difficult access.

자세한 필드 정의와 AI output contract는 [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md)를 따른다.

## AI Model Policy (v1)

v1 기본 모델은 **Alibaba Cloud / Qwen `qwen3-vl-flash`**로 둔다. 선택 이유는 사진+텍스트 입력을 같이 처리할 수 있고, Flash tier가 v1의 비용 구조에 맞기 때문이다. 2026-05-16 공식 문서 기준으로 `qwen3-vl-flash`는 vision/text input과 text output을 지원하고, 32K 이하 tier 가격이 input $0.05 / 1M tokens, output $0.40 / 1M tokens다. 실제 비용 계산은 Phase 0 D6/D11에 공식 pricing page를 다시 확인해서 기록한다.

### 적용 범위

- Quote draft: notes + rough measurements + photos + price_rates context를 받아 `scope_sections`, `pricing_candidates`, `clauses` 기반 quote form 초안을 만든다.
- Photo analysis: surface 후보, visible condition, access/prep hint, assumptions/exclusions 작성 보조.
- Today Assistant: deterministic task list 위에 짧은 summary와 우선순위 문장 생성.
- Follow-up Writer: quote check-in, booking request, invoice reminder 문구 초안 작성.

### 구현 원칙

- 모델 호출은 `lib/ai/providers/*` adapter 뒤에 둔다. 앱 전체가 특정 provider SDK에 직접 묶이지 않게 한다.
- `ai_usage_logs.metadata.model`에는 실제 사용 모델 ID를 저장한다. 예: `qwen3-vl-flash`.
- `ai_usage_logs.metadata.provider`에는 `alibaba-qwen`을 저장한다.
- prompt version과 image hash를 같이 저장해 같은 사진 세트를 불필요하게 재분석하지 않는다.
- Qwen3-VL-Flash 품질이 golden set 기준을 못 넘으면 Qwen3-VL-Plus 또는 다른 vision model fallback을 별도 eval 후 결정한다.

## Photo Analysis & Cost Policy (T2)

사진이 포함된 AI draft는 사용자 action마다 multimodal API 비용이 발생한다. 따라서 v1은 "사진만 보고 자동 견적 산출"이 아니라 **notes + rough measurements 중심, 사진은 scope 검토 보조**로 제한한다.

### v1 photo AI가 하는 일

- 사진에서 interior/exterior, wall/ceiling/trim/door/window 같은 surface 후보를 식별
- peeling, cracks, stains, mould, patching, raw timber, access difficulty 같은 visible condition을 초안에 반영
- scope, assumptions, exclusions 문장을 더 정확하게 작성
- 불확실한 항목은 "confirm on site"로 표시

### v1 photo AI가 하지 않는 일

- 사진만으로 sqm/lm 자동 산출
- painter `price_rates` 없이 가격 또는 rate 결정
- GST 계산
- 보이지 않는 damage, prep work, access issue 발명
- "확실함"으로 단정하거나 user review 없이 quote 발송

### Cost guardrails

- Basic: AI quote draft 5/month, photo AI 15 photos/month, quote당 사진 3장
- Pro: AI quote draft 25/month, photo AI 100 photos/month, quote당 사진 5장
- Pro 1개월 무료 trial 사용자는 trial 기간 동안 Pro limit을 사용한다
- 업로드 전 1920px 이하 JPEG 85%로 리사이즈/압축
- 동일 파일은 content hash 또는 storage path + prompt version 기준으로 재분석 방지
- 재시도는 1회만 허용하고 모든 attempt를 `ai_usage_logs`에 기록
- `ai_usage_logs.metadata`에 `photo_count`, `image_bytes`, `model`, `prompt_version`, `cache_hit` 기록
- `ai_usage_logs.metadata`에 `provider = alibaba-qwen` 기록
- AI 비용 상한: 전체 AI cost ≤30% plan ARPU. 초과 예상 시 T2 defer 또는 사진 수/월 draft limit 축소

### Product wording

v1 marketing/product copy는 "사진만으로 자동 견적"을 말하지 않는다. 안전한 표현은:

> 사진과 현장 노트를 바탕으로 견적 초안을 빠르게 만들어줍니다. Painter가 검토하고 수정한 뒤 발송합니다.

## Schema 변경

```sql
CREATE TABLE ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  painter_user_id uuid NOT NULL REFERENCES auth.users(id),
  feature text NOT NULL CHECK (feature IN ('quote_draft','today_assistant','follow_up_writer','workspace_assistant')),
  attempt_status text NOT NULL CHECK (attempt_status IN ('success','failed','cancelled','partial','retried')),
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_cents int NOT NULL DEFAULT 0,
  quote_id uuid REFERENCES quotes(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  billing_month date GENERATED ALWAYS AS (date_trunc('month', created_at)::date) STORED
);
CREATE INDEX ai_usage_logs_painter_month ON ai_usage_logs (painter_user_id, billing_month);
-- RLS: painter sees own only; service_role bypass.
```

추가 migrations (조건부):
- T2: `quote_photos` table 또는 `quotes.photos jsonb` (painter check 통과 시)
- T10: 최소 billing 상태 필드 또는 Stripe customer/subscription mapping 필요 여부를 build 시작 시 결정. productized billing dashboard는 v1.1
- T13/T14: 신규 테이블 없음. 기존 `quotes`, `customers`, `invoices`, `jobs`, `job_schedule_days` read model + `ai_usage_logs.metadata`만 사용

Migration 흐름: `apply_migration` → `execute_sql` 검증 → `generate_typescript_types`.

## Streaming (D2 / A1)

Pattern: **Server Action returning ReadableStream** + React 19 `useTransition` consumer (NOT RSC `streamUI`, NOT API route SSE).

```ts
// app/actions/ai-drafts.ts
'use server'
export async function streamQuoteDraft(input: DraftInput): Promise<ReadableStream> {
  const { stream } = await ai.generateStream({ ... });
  return stream; // chunks = room-by-room reveal
}
```

Day 0 spike (1일): Qwen streaming response가 Next.js 16 Server Action + Vercel Edge에서 ReadableStream wrap 가능한지 검증. Spike fail 시 SSE API route 또는 RSC streamUI 재논의.

## Auxiliary AI Scope (v1)

### Today Assistant (T13)

Dashboard 상단/중단에 "Today" helper를 둔다. SQL로 먼저 할 일을 결정하고, Pro 사용자에게만 AI가 짧은 요약 문장과 우선순위를 붙인다.

- 데이터: sent/open quotes without response, overdue/soon-due invoices, today/this-week jobs, approved quotes needing booking follow-up
- UX: action card list + "Write follow-up" CTA. AI가 직접 상태를 바꾸거나 메시지를 보내지 않음
- Fallback: AI 실패 시 deterministic task list만 유지

### Follow-up Writer (T14)

Quote/customer/invoice detail에서 고객에게 보낼 짧은 SMS/email 초안을 만든다.

- 메시지 유형: quote check-in, quote approved → booking request, invoice reminder
- Context: customer name, quote/invoice status, amount, public link availability, job date if known
- Guardrail: user review mandatory. v1은 auto-send 금지, existing email send 또는 copy flow로만 연결

## Worktree parallelization

| Lane | Items | 의존 |
|------|-------|------|
| P | T0 → T0A → T0B | — (GREEN 후 최우선) |
| A | T1 → T12 → T8 → T3 (spike first) | P (pricing boundary fixed) |
| B | T4 → T9 → T13 | A (T1 schema), dashboard read model |
| C | T6 → T7 → T11 → T14 | A (T1 schema), existing quote/invoice email flow |
| D | T10 (Pro trial + paid conversion setup) | — (1일) |
| E | T2 → T5 | A (T1 schema) |

Conflict: C+E 둘 다 `AIDraftPanel.tsx` — C는 plan-aware gating wrapper, E는 photo upload integration. A+E 둘 다 `lib/ai/drafts.ts` — A finish prompt first, E adds error wrap outer.

T13은 `dashboard/page.tsx`와 AI usage shared code, T14는 quote/customer/invoice detail CTA와 충돌 가능. 범용 `WorkspaceAssistant`를 확장하지 말고 scoped components로 분리.

**Best 6주, realistic 7주, sequential fallback 8–9주.**

## Timeline

| Phase | 기간 | 상태 |
|-------|------|------|
| Phase 0 validation + interview analysis + legacy quote form analysis | 2주 | 완료/GREEN (2026-05-17) |
| Cost spreadsheet + numeric golden set fixture | D11 + W4 | 진행 중 |
| v1 build (6 lanes, GREEN 이후) | 6–8주 | 시작 가능. 첫 순서는 pricing-first |
| Integration + deploy | 1주 | post-build |
| Free Pro trial + paid conversion tracking | 4–6주 | post-deploy. 첫 cohort Pro 1개월 무료 후 A$59 conversion 측정 |
| **Total** | **13–17주** | sequential, Codex 권장 |

Build start는 승인됐지만 사용량 tracking은 build/deploy/onboarding 이후에만 시작한다.

## v1 Success Criteria

- AI cost ≤30% ARPU (premise 6 검증)
- Quote total mismatch 0: preview/save/detail/PDF/invoice conversion 금액 불일치 없음
- Duplicate anchor incident 0: room anchor, quick item, line item 이중 청구 없음
- AI draft scope/clause wording painter edit 비율 ≤30%
- Legacy quote reconstruction: Winchester interior, Edgar checklist, Paint Buddy exterior quote 구조를 scope/pricing/clause data로 재현 가능
- Scope/exclusion painter "send-ready" 비율 ≥70%
- Today Assistant task list "useful today" 응답 ≥70% (trial cohort)
- Follow-up Writer 초안 사용/수정 후 발송 또는 copy 비율 ≥50%
- 5 인터뷰 painter 중 ≥1 paid conversion (Pro trial → A$59 paid) 4주 내
- False-positive horror story 0: 가격 -50%/+50% outlier 없음, GST 누락 0, interior/exterior 오분류 0

## Critical Gaps & Deferrals

- **Quick/Advanced duplicate anchor risk** — 완료. T0/T0A에서 quote calculation boundary, snapshot, selected-source diagnostics, and regression tests를 정리했다.
- **Quote form structure gap** — v1에서 deferred 불가. T0B에서 customer-visible `scope_sections`와 pricing rows, clause library를 분리하지 않으면 AI output이 PDF/public quote/invoice 흐름을 오염시킨다.
- **Stale `price_rates` race** (painter mid-AI-call price_rates 수정) — v1.1 deferred. v1 mitigation: T6 UI에 "AI가 사용한 rates" snapshot 표시 ("이 quote는 2026-05-15 16:30 기준 rate로 생성됨"). 자세한 건 [/TODOS.md](../../../TODOS.md).
- **Billing trial/conversion productization** — Phase 0 gate는 선결제가 아니라 Pro 1개월 무료 trial 후 A$59 conversion으로 검증한다. public launch 전에는 Stripe trial/cancel 상태와 app plan state mismatch를 막는 webhook/idempotency 검증이 필요하다.
- **Generic Workspace Assistant** — v1 off. v2 검토용 코드만 유지. v1은 Today Assistant + Follow-up Writer만 허용.
- **Assistant overreach** — v1 보조 AI는 자동 발송/자동 일정 변경/자동 상태 변경 금지. 모든 action은 user-confirmed.

## Out of Scope (v1)

- Computer vision surface takeoff — v1.1. v1의 Qwen3-VL-Flash는 scope 보조만 하고 정확한 sqm/lm 산출은 하지 않음
- Learning-based pricing recommendation — v1.2
- Customer portal one-click accept + Stripe deposit — v2.0
- Interior/Exterior 빌더 분리 — v2.1
- AI 사용량 full dashboard (settings/ai-usage simple page만)
- Multi-language, GPS, team scheduling, supplier integrations, native app (CLAUDE.md Out of Scope)

## Source documents

- Design (APPROVED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-design-20260515-230649.md`
- Impl plan (ENG CLEARED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-impl-plan-20260515-232820.md`
- Related: [PHASE0-CHECKLIST.md](./PHASE0-CHECKLIST.md), [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md), [AI-ASSISTANT.md](./AI-ASSISTANT.md), [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md), [AUDIT.md A3](../audit/AUDIT.md), [PLANS.md](../../PLANS.md)
