# Feature: Quote Builder

> Owner: **Shared** — 기획 판단: Claude(Opus 4.8·extra) · 구현 사실: Codex(high).

## Goal

페인터가 기존 Excel 가격표를 참고해 Coatly 앱 안에서 단순 price book을 세팅하고, 현장에서 빠르게 견적을 만들고, 고객에게 PDF/공개 링크/email로 보내고, follow-up 후 승인된 작업을 invoice/job으로 이어지게 합니다.

2026-06-03 기준 v1 방향은 [V1-PLAN.md](../ai/V1-PLAN.md)를 따른다. 핵심은 AI Quote Writer가 아니라 **기존 Excel 가격표 참고 → simple saved price book → quote → PDF/email → follow-up → invoice/schedule** workflow replacement다. AI, 사진 분석, damage 판별은 이 workflow가 완료/릴리즈된 뒤 post-core admin layer로만 검토한다.

고객에게 보이는 quote form은 scope section + pricing row + clause library로 분리할 수 있지만, 현재 P0는 A의 실제 Excel 가격표와 quote PDF/email을 Coatly에서 재현하는 것이다. Pricing/data 계약 요지는 이 문서의 "Pricing & Data Contracts" 섹션에 정리한다.

## Current Status

| 영역                        | 상태                                              | 구현 근거                                                                                                          |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Quote CRUD                  | 구현됨                                            | `modules/quotes/application/actions.ts`, `app/(dashboard)/quotes/*`                                               |
| Room/surface 견적           | 구현됨                                            | `modules/quotes/ui/QuoteForm.tsx`, `quote_rooms`, `quote_room_surfaces`                                           |
| Quick/Detailed estimate     | 구현됨, Task 2-3 hardening 완료                   | `QuickEstimateBuilder`, `QuickQuoteBuilder`, `InteriorEstimateBuilder`, migration 041–042 + Room Price Library metadata |
| Exterior estimate           | 구현됨, 감사 항목 남음                            | `modules/quotes/ui/ExteriorEstimateBuilder.tsx`, audit 참고                                                       |
| Rate settings               | 구현됨, Room Price Library + setup diagnostics    | `PriceRatesForm`, `modules/price-rates/domain/{rate-settings,room-price-library,rate-setup-diagnostics}.ts`       |
| Material/service line items | 구현됨, Price Rates > Manual CSV template 연결    | `material_items`, `quote_line_items`, `modules/price-rates/domain/manual-price-book-csv.ts`                       |
| Quote templates             | 구현됨                                            | `quote_templates`, `TemplatePicker`                                                                               |
| AI quote drafting           | seed exists, v1 core에서 보류                     | `lib/ai/apply-deterministic-pricing.ts`, draft panel                                                              |
| PDF                         | 구현됨                                            | `app/api/pdf/quote/route.ts`, `lib/pdf/quote-template.tsx`                                                        |
| Email send                  | 구현됨                                            | Resend quote email, status `sent`                                                                                 |
| Public approval             | 구현됨                                            | `/q/[token]`, signature, approve/reject                                                                           |
| Public booking              | 구현됨                                            | approved quote → job booking                                                                                      |
| Quote → invoice             | 구현됨                                            | invoice quote option/line item 흐름                                                                               |
| Canonical quote totals      | 구현됨                                            | `calculateQuoteTotals()` (`modules/quotes/domain/quotes.ts`), add-on/public/invoice parity, duplicate scope guard |
| Quote workflow replacement  | 현재 P0                                           | A의 실제 Excel price book 참고 → 앱 내 simple price book 세팅 → quote PDF/email 재현, follow-up/invoice/schedule 검증 |
| AI Quote Form Builder       | schema foundation 존재, post-core로 보류          | `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, `quote_ai_intake_snapshots`                    |

## Quote Modes

| Mode                    | 용도                                             | 핵심 데이터                                                    |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Detailed room/surface   | 방별 벽/천장/트림 상세 견적                      | `quote_rooms`, `quote_room_surfaces`                           |
| Quick estimate          | 현장 빠른 방/크기/표면 matrix                    | `quote_estimate_items`, `pricing_snapshot`                     |
| Average property preset | 2 bed 2 bath apartment 같은 평균 interior anchor | `pricing_method_inputs`, `quote_estimate_items`, rate snapshot |
| Day rate                | 일수 × 일당 + 자재                               | `pricing_method_inputs`                                        |
| Manual                  | 직접 금액 입력                                   | manual line items                                              |
| Exterior                | 외부 작업 카테고리                               | `estimate_category = exterior`                                 |

## Data Model

| 테이블/필드            | 역할                                                      |
| ---------------------- | --------------------------------------------------------- |
| `quotes`               | 번호, 고객, 상태, 유효기간, margins, totals, public token |
| `quote_rooms`          | 방 이름/종류/치수                                         |
| `quote_room_surfaces`  | 표면별 면적, coating, rate, material/labour cost          |
| `quote_estimate_items` | quick/detailed estimate snapshot                          |
| `quote_line_items`     | 자재/서비스/custom line item                              |
| `quote_templates`      | 반복 견적 재사용                                          |
| `public_quote_events`  | 공개 링크 접근/승인/거절 감사                             |

## Pricing & Data Contracts (V1-TASK1~5에서 이관, 2026-07-05)

원본 브리프는 삭제 예정이므로 살아있는 계약만 여기에 압축한다.

### Canonical Money Contract (from V1-TASK1)

모든 total은 `calculateQuoteTotals()`(`modules/quotes/domain/quotes.ts`) 한 곳을 통과한다. AI/사진은 가격 필드에 직접 쓰지 않는다.

- `base_subtotal_cents`: 정확히 하나의 pricing method(manual rooms, interior/exterior estimate, detailed quick, room rate, day rate, manual direct)에서만 나오는 ex-GST priced scope.
- `line_items_subtotal_cents`: `is_optional = false` 또는 `is_selected = true`인 `quote_line_items`만 합산.
- `subtotal_cents = base_subtotal_cents + line_items_subtotal_cents`.
- `discount_cents`는 `0..subtotal_cents`로 clamp → `discounted_subtotal_cents = max(0, subtotal - discount)`.
- `gst_cents = round(discounted_subtotal_cents * 0.10)`.
- `manual_adjustment_cents`는 GST 밖(과세 변경은 별도 결정) → `total_cents = max(0, discounted_subtotal_cents + gst_cents + manual_adjustment_cents)`.
- `deposit_cents = round(total_cents * deposit_percent / 100)` (표시 전용, total 대체 저장 금지).

### Authoritative Price Source Map (from V1-TASK1)

각 pricing path는 하나의 base subtotal source + `quote_line_items` add-on만 갖고, 저장 후 흔들리면 안 되는 snapshot을 남긴다.

- Manual room/surface: `quote_room_surfaces.total_cents` → `quote_rooms.total_cents` → quote base. Snapshot: area_m2, rate_per_m2_cents, coating_type, room dimensions.
- Interior/Exterior estimate: `calculateInteriorEstimate()` / `calculateExteriorEstimate()`(`modules/quotes/domain/{interior,exterior}-estimates.ts`) → `quote_estimate_items` + `quotes.estimate_context`/`pricing_snapshot`.
- Detailed quick: `quote_estimate_items.category = 'quick_estimate'` + `pricing_method_inputs.inputs.rooms` (room size, surfaces, multipliers, source rate id/version/label).
- Room rate / Day rate / Manual direct: 각각 `pricing_method_inputs`의 room·rate / days·daily rate·material / labor·material cents가 snapshot.
- `quote_line_items.pricing_scope_key`/`pricing_role`은 v1에서 미저장 — save 전 duplicate scope 차단 검증에만 쓰고 insert에서 제외 (`modules/quotes/domain/quote-pricing-scopes.ts`).

### Quick / Advanced Snapshot Contract (from V1-TASK2)

- Quick estimate room은 save payload에 `room_id`, `source_rate_item_id/version/label`, `rate_snapshot_version`, `label`, `size`, `selected_surfaces`, `walls_cents`, `ceiling_cents`, `trim_cents`, `coating_multiplier_pct`, `condition_multiplier_pct`, `total_cents`, optional `notes`를 보존. 기존 quote는 저장된 cents/multiplier를 재사용하고 수정된 Price Rates room template을 재계산하지 않는다.
- Advanced estimate는 room anchor / door / window / skirting-trim이 서로 다른 priced source(각각 `estimate_context`와 `quote_estimate_items` category `room_anchor`/`door`/`window`/`trim`). trim item은 같은 방의 room `include_trim`와 중복 불가.
- `rate_snapshot_version` 불변 규칙: `rate_snapshot_version === 1`인 기존 quote는 저장된 source anchor 데이터로 계산되고, `detailed_estimate_anchors` 변경은 새 quote나 수동 재-snapshot만 영향.

### Room Price Library Contract (from V1-TASK3)

- Canonical 결정: Quick Estimate room template(`UserRateSettings.quick_estimate.rooms`, `modules/price-rates/domain/rate-settings.ts`)이 방 가격의 **단일 canonical Room Price Library**다. Detailed Estimate Anchors는 legacy fallback으로만 남긴다.
- Advanced Room Item Contract: `source_room_template_id`(+version), `default_size`가 preferred 필드로 Quick room template을 참조. legacy `anchor_room_type` 문자열은 읽기 호환만 유지하고, 두 필드가 모두 있으면 `source_room_template_id`를 우선한다. Advanced room 선택 시 Quick room template 가격에서 snapshot한다.

### PDF Required Content Standard (from V1-TASK5)

고객용 quote PDF/public quote는 아래 콘텐츠를 이 렌더 순서로 보여야 한다: 비즈니스/고객 정보 → job description(제목·client-visible notes) → customer-visible scope sections(area label, visible steps, optional/included/to-confirm status, `report_context` 유지관리 요약) → pricing summary(estimate rows, rooms/surfaces, materials/services, optional add-ons, discount, GST, manual adjustment, total, deposit) → clauses/terms → deposit/payment. Scope section은 pricing 앞, clause는 optional add-on 뒤. Scope/clause는 unit price·rate·GST·subtotal·total 필드를 절대 담지 않고, PDF total은 저장된 quote total과 선택된 optional line item에서만 온다.

## AI Quote Form Builder Data Model

실제 legacy quote form 분석 결과, quote는 단순 line item 계산서가 아니라 작업 설명서와 조건 문서가 합쳐진 고객용 artifact다. v1은 아래 구조를 추가한다.

| 구조               | 역할                                               | 저장 위치                   | 예시                                                                        |
| ------------------ | -------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| Scope section      | 고객에게 보이는 작업 범위의 큰 단위                | `quote_scope_sections`      | Ceiling, Walls, Bathroom, Rendered walls, Fence optional item               |
| Scope step         | section 안의 bullet 작업 설명                      | `quote_scope_steps`         | light sanding, 1 coat primer, 2 coats Weathershield, colour to be confirmed |
| Pricing row        | 실제 subtotal을 만드는 계산 row                    | `quote_estimate_items`      | eaves sqm, door each, room anchor, exterior surface                         |
| Custom/add-on row  | material/service/custom/optional add-on            | `quote_line_items`          | optional fence, extra work, custom service                                  |
| Clause item        | 조건, 예외, 보증, 리스크 문구                      | `quote_clause_items`        | Vivid White, paint peeling, water damage, efflorescence, furniture moving   |
| AI intake snapshot | post-core AI draft 생성 당시 입력과 model metadata | `quote_ai_intake_snapshots` | notes, rough measurements, photo refs, prompt version                       |

### Boundary Rules

- `quote_scope_sections`/`quote_scope_steps`는 고객용 문서 구조다. 직접 subtotal을 만들지 않는다.
- `quote_estimate_items`는 estimate engine이 만든 priced rows만, `quote_line_items`는 material/service/custom/optional add-on만 담는다. already-included scope 재청구 금지.
- `quote_clause_items`는 price를 만들지 않는다.
- AI draft는 post-core 기능이다. manual quote workflow 릴리즈 전 시작 금지. 도입돼도 AI는 `scope_sections`, `pricing_candidates`, `clauses`만 생성하고 deterministic pricing pass만 `quote_estimate_items`/`quote_line_items`/총액을 만든다.
- PDF/public quote/invoice conversion은 같은 section order, optional item state, calculated totals를 사용한다.

### Interior Required Coverage

| 그룹            | 항목                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Areas           | bedrooms, bathroom, living, dining, kitchen, hallway, stairway, laundry, wardrobe, study/office, other                                                         |
| Surfaces        | walls, ceiling, cornice, doors, door frames, windows/frames, skirting, trim, wardrobe inside, bathroom/wet area                                                |
| Prep/coating    | sanding, dusting, patching, gap filling, primer, oil undercoat, cover stain primer, ceiling flat, low sheen wall paint, kitchen & bath paint, oil/water enamel |
| Condition/notes | dark colour, Vivid White, colour match, peeling paint, water damage, wet area, tile edge gap, colour/sheen to be confirmed                                     |

### Exterior Required Coverage

| 그룹            | 항목                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces        | rendered walls, cladding boards, eaves/soffits, fascia/barge boards, gutters, downpipes, gable, timber, front door, exterior doors/frames, windows/frames, retaining walls, fence, handrail, poles, roof, concrete overhang, pool retaining wall, other |
| Units           | sqm, lm, each, fixed                                                                                                                                                                                                                                    |
| Prep/coating    | sanding, dusting, patching, gap filling, total prep, solvent-based primer, Acratex/Acraprime, metal primer, timber under primer, Weathershield, varnish                                                                                                 |
| Condition/notes | porous render, efflorescence, difficult access, unsafe access, new timber, peeling paint, moisture/water damage, colour/sheen to be confirmed                                                                                                           |

## Status Workflow

```text
draft -> sent -> approved -> booked/job/invoice
             -> rejected
             -> expired
```

## Pricing Rules

- 모든 금액은 cents 정수. GST는 quote-level discount 적용 후 taxable subtotal 기준 10%. 세부 계산은 위 Canonical Money Contract를 따른다.
- Quick estimate는 저장 시 authoritative snapshot을 `pricing_method_inputs`와 `quote_estimate_items.metadata`에 남겨 이후 단가 변경에 흔들리지 않게 한다.
- Starter/Pro 가격 정책은 core workflow 가치 기준으로 재검토. AI quote/photo/follow-up limit은 v1 core 기준이 아니다.
- arbitrary Excel 자동 import는 v1 pricing source가 아니다. 앱 안에서 직접 저장했거나 선택적 simple Excel/CSV preview를 통과한 데이터만 quoteable price source가 된다.
- 같은 priced scope는 room anchor, quick item, line item 중 하나로만 계산한다.
- quote preview, save, detail, PDF, invoice conversion은 같은 subtotal/GST/total 규칙을 사용한다.
- rate 변경 후 기존 quote는 저장 당시 snapshot 기준 유지, 새 quote만 새 rate 사용.

## UX Rules

- Quote 생성 첫 화면은 AI draft가 아니라 real workflow completion 우선: manual/simple price book 기반 quote creation.
- Price setup/onboarding은 Price Rates > Manual의 앱 내 `+ Price Item` 직접 추가를 우선한다. Excel CSV template/import/export는 선택 옵션이며 review/confirm 후 저장. 아무 Excel layout이나 자동 지원하지 않는다.
- AI draft, photo helper, AI wording helper는 core workflow release 후에만 다시 설계한다.
- Quote CTA는 `+ New Quote` 패턴. Public quote는 고객이 optional item, PDF, 승인/거절, 예약 날짜를 볼 수 있어야 한다.

## Planned Price Rates Expansion

v1 pricing foundation은 Rate Library + Modifiers 방향을 따른다.

| 그룹                    | 필요한 항목                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Average Property Prices | Apartment 1 bed 1 bath, Apartment 2 bed 1 bath, Apartment 2 bed 2 bath, Apartment 3 bed 2 bath, House 3 bed 2 bath, House 4 bed 2 bath |
| Room Prices             | Bedroom, bathroom, living, hallway, stairwell 등 full repaint price + walls-only/ceiling-only/trim-only %                              |
| Base Surface Rates      | interior walls/ceiling `/sqm`, trim/skirting `/lm`, doors/windows `/each`, exterior surfaces                                           |
| Prep & Repairs          | patching, cracks, sanding, caulking, mould, stain/tannin block, oil-to-water prep                                                      |
| Access & Complexity     | high ceiling, stairwell, furnished/occupied, poor access, second-storey/ladder, scaffold                                               |
| Paint Systems           | 1 coat refresh, 2 coat repaint, new plaster 3 coats, wet-area paint, premium washable, enamel, exterior full system                    |
| Business Rules          | minimum job/room, callout/travel, material markup, target daily earning warning                                                        |

## Completed Acceptance Criteria

- [x] 견적 번호 자동 채번, 방별 면적/표면 계산, GST 10%, AUD 포맷, PDF 브랜딩, 유효기간, subscription gating scaffold
- [x] quick/detailed estimate snapshot, material/service line items
- [x] Price Rates Manual direct price item add + simple Excel CSV template/review/import/export to Material / Service catalogue
- [x] quote email send, public approve/reject/signature, approved quote booking, quote templates, AI draft panel 노출
- [x] canonical quote total calculator + optional add-on recalculation with discount/manual adjustment
- [x] public quote total preview with selected optional add-ons; quote-to-invoice preset base scope + optional add-on handling
- [x] discounted quote invoice parity-safe line and manual adjustment block
- [x] deterministic duplicate priced scope guard (Quick/Advanced/manual/exterior) + fuzzy duplicate line item warning
- [x] Quick estimate row metadata completeness + stale-rate A/B coverage
- [x] Advanced numeric snapshot immutability (room anchors, openings, trim)
- [x] Price Rates setup diagnostics + Quote Builder selected-source A$0 blocking
- [x] Quote form structure schema, maintenance job type, price-free taxonomy, painting-adjacent maintenance job packs

## Active Risks / Next Work

| 우선순위  | 항목                                     | 내용                                                                                                                       |
| --------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| P0        | Quote follow-up reminder cron 미구현     | AUDIT A9: 현재 cron은 invoice-reminders만 존재. quote sent→viewed→follow-up due 자동 리마인더는 미구현. send/follow-up loop 종단 검증 시 이 gap을 명시적으로 채워야 함 |
| P0        | Simple price book setup                  | Price Rates > Manual 직접 추가와 Excel CSV validation/review UX는 구현. 다음: A fixture로 실제 quote setup friction 검증    |
| P0        | A price book setup                       | A의 실제 Excel 가격표를 참고해 quote 하나에 필요한 price items를 앱 안에서 저장하고 세팅 friction 기록                      |
| P0        | A quote recreation                       | 최근 quote PDF/email 1개를 Coatly에서 재현하고 total/scope/PDF/email parity 확인                                           |
| P0        | Quote send/follow-up loop                | email send, public quote, viewed/open signal, follow-up due state, quote status가 end-to-end 동작 (위 cron gap 포함)      |
| P0        | 저장 원자성                              | quote + rooms + surfaces + line items 저장을 transaction/RPC로 묶는 방향 검토                                             |
| P1        | Exterior edit safety / PDF               | 편집 시 exterior snapshot 손실 회귀 테스트 강화 + 모든 exterior cost/line item이 상세/PDF에 일관 렌더되는지 검증           |
| P1        | Rate library expansion                   | Average Property Prices, Room Prices surface split, Prep/Access modifiers 구현 필요                                       |
| P1        | Public audit                             | public token 접근/오류/승인 이벤트 운영 조회 강화                                                                         |
| P2        | Read receipt / Smart pricing             | 링크 열람/다운로드 이벤트 영업 활용, 히스토리 기반 가격 제안(미구현)                                                      |
| Post-core | Scope/Clause Builder UI and AI rendering | Task 4 schema는 완료됐지만 AI/photo 연동은 core workflow release 후 별도 plan                                            |

## Non-Goals

- GPS tracking, Supplier integrations, Native mobile app, Multi-language
- arbitrary Excel auto-import or complex template onboarding before simple price book workflow release
- AI photo/damage analysis before core workflow release
- AI-generated price/rate/GST/total

## Test Focus

- `modules/quotes/application/actions.test.ts`
- `modules/quotes/ui/QuoteForm.test.tsx` (그 외 `modules/quotes/ui/*.test.tsx`)
- `app/api/pdf/quote/route.test.ts`
- `modules/quotes/ui/public/*.test.tsx`
- `modules/quotes/domain/{quotes,quote-pricing-scopes,interior-estimates,exterior-estimates}.test.ts`
