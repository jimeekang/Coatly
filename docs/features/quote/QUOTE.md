# Feature: Quote Builder

## Goal

페인터가 기존 Excel 가격표를 참고해 Coatly 앱 안에서 단순 price book을 세팅하고, 현장에서 빠르게 견적을 만들고, 고객에게 PDF/공개 링크/email로 보내고, follow-up 후 승인된 작업을 invoice/job으로 이어지게 합니다.

2026-06-03 기준 v1 방향은 [V1-PLAN.md](../ai/V1-PLAN.md)를 따른다. 핵심은 AI Quote Writer가 아니라 **기존 Excel 가격표 참고 → simple saved price book → quote → PDF/email → follow-up → invoice/schedule** workflow replacement다. AI, 사진 분석, damage 판별은 이 workflow가 완료/릴리즈된 뒤 post-core admin layer로만 검토한다.

고객에게 보이는 quote form은 **scope section + pricing row + clause library**로 분리할 수 있지만, 현재 P0는 A의 실제 Excel 가격표와 quote PDF/email을 Coatly에서 재현하는 것이다. 가격 계산 boundary와 quote total parity 세부 구현은 [V1-TASK1-RATE-SOURCE-AUDIT.md](../ai/V1-TASK1-RATE-SOURCE-AUDIT.md)를 따른다. Quick/Advanced rate boundary와 snapshot hardening은 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](../ai/V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)를 따른다. Room Price Library source redesign은 [V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md](../ai/V1-TASK3-QUICK-ROOM-PRICE-LIBRARY.md)를 따른다.

## Current Status

| 영역                        | 상태                                                               | 구현 근거                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote CRUD                  | 구현됨                                                             | `app/actions/quotes.ts`, `app/(dashboard)/quotes/*`                                                                                                           |
| Room/surface 견적           | 구현됨                                                             | `QuoteForm`, `quote_rooms`, `quote_room_surfaces`                                                                                                             |
| Quick/Detailed estimate     | 구현됨, Task 2-3 hardening 완료                                    | `QuickQuoteBuilder`, `QuickEstimateBuilder`, `InteriorEstimateBuilder`, migration 041–042 + Task 2 category constraint + Room Price Library snapshot metadata |
| Exterior estimate           | 구현됨, 감사 항목 남음                                             | `ExteriorEstimateBuilder`, audit 참고                                                                                                                         |
| Rate settings               | 구현됨, Room Price Library + setup diagnostics 완료                | `PriceRatesForm`, `QuickEstimateTab`, `lib/rate-settings.ts`, `lib/room-price-library.ts`, `lib/rate-setup-diagnostics.ts`                                    |
| Material/service line items | 구현됨, Price Rates > Manual Excel CSV template/import/export 연결 | `material_items`, `quote_line_items`, `manual-price-book-csv.ts`                                                                                              |
| Quote templates             | 구현됨                                                             | `quote_templates`, `TemplatePicker`                                                                                                                           |
| AI quote drafting           | seed exists, v1 core에서 보류                                      | `AIDraftPanel`, `generateAIDraft()`                                                                                                                           |
| PDF                         | 구현됨                                                             | `app/api/pdf/quote/route.ts`, `lib/pdf/quote-template.tsx`                                                                                                    |
| Email send                  | 구현됨                                                             | Resend quote email, status `sent`                                                                                                                             |
| Public approval             | 구현됨                                                             | `/q/[token]`, signature, approve/reject                                                                                                                       |
| Public booking              | 구현됨                                                             | approved quote → job booking                                                                                                                                  |
| Quote → invoice             | 구현됨                                                             | invoice quote option/line item 흐름                                                                                                                           |
| Canonical quote totals      | 구현됨                                                             | `calculateQuoteTotals()`, optional add-on/public quote/invoice preset parity, deterministic duplicate priced scope guard, full suite/build/lint 통과          |
| Quote workflow replacement  | 현재 P0                                                            | A의 실제 Excel price book을 참고해 앱 안 simple price book을 세팅한 뒤 quote PDF/email 재현, PDF/email/follow-up/invoice/schedule 검증                        |
| AI Quote Form Builder       | schema foundation 존재, post-core로 보류                           | `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, `quote_ai_intake_snapshots`                                                                |

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

## Simple Price Book Setup Boundary

v1 quote workflow는 arbitrary Excel import가 아니다. 기준 문서는 [PRICE-BOOK-TEMPLATE.md](./PRICE-BOOK-TEMPLATE.md)다.

| 입력                           | v1 처리                                                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 유저의 기존 Excel 가격표       | source document. 자동 해석을 약속하지 않고, 필요한 가격을 앱에 직접 옮기는 reference                                                                                                                                       |
| 앱 내 `+ Price Item`           | v1 primary setup path. Price Rates > Manual에서 `Service / Item`, `Unit`, `Price`, optional customer description을 바로 저장                                                                                               |
| Price Rates > Manual Excel CSV | 선택적 bulk input helper. template download/import/export를 제공하고 `Service / Item`, `Unit`, `Price`, optional Coatly catalogue `Category`, optional `Customer Description`만 허용해 Material / Service catalogue로 저장 |
| Preview/validation             | 누락, unsupported unit, malformed/negative price, duplicate row, existing catalogue duplicate를 저장 전 표시                                                                                                               |
| Saved Coatly price book        | quote builder와 PDF/email/invoice conversion의 실제 계산 기준                                                                                                                                                              |

Excel 파일은 참고 자료이며, 저장 후 quote 계산은 Coatly의 deterministic price book data를 사용한다.

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

- `quote_scope_sections`와 `quote_scope_steps`는 고객용 문서 구조다. 직접 subtotal을 만들지 않는다.
- `quote_estimate_items`는 estimate engine이 만든 priced rows만 담는다.
- `quote_line_items`는 already-included scope를 다시 청구하는 용도로 쓰지 않는다.
- `quote_clause_items`는 price를 만들지 않는다.
- AI draft는 post-core 기능이다. 시작 전 manual quote workflow가 먼저 릴리즈되어야 한다.
- AI가 도입되더라도 `scope_sections`, `pricing_candidates`, `clauses`만 생성한다.
- deterministic pricing pass만 `quote_estimate_items`, `quote_line_items`, subtotal/GST/total을 만든다.
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

- 모든 금액은 cents 정수입니다.
- GST는 quote-level discount 적용 후 taxable subtotal 기준으로 10% 계산합니다.
- Canonical total contract: `base_subtotal_cents + selected quote_line_items - discount_cents → discounted_subtotal_cents → gst_cents → total_cents`.
- 기존 manual adjustment는 현재 quote 동작처럼 GST 밖에서 더합니다. 과세 처리 변경은 별도 decision이 필요합니다.
- Labour/material margin은 별도 percent로 저장합니다.
- Quick estimate는 저장 시 authoritative snapshot을 `pricing_method_inputs`와 `quote_estimate_items.metadata`에 남겨 이후 단가 변경에 흔들리지 않게 합니다.
- Starter/Pro 가격 정책은 core workflow 가치 기준으로 재검토합니다. AI quote/photo/follow-up limit은 v1 core 기준이 아닙니다.
- AI-assisted Quote Form Builder 이전에 quote calculation boundary와 real price book setup을 먼저 정리합니다.
- arbitrary Excel 자동 import는 v1 pricing source가 아닙니다. 앱 안에서 직접 저장했거나 선택적 simple Excel/CSV preview를 통과한 데이터만 quoteable price source가 됩니다.
- `quote_estimate_items`는 estimate engine이 만든 priced rows만 저장합니다.
- `quote_line_items`는 material/service/custom/optional add-on만 저장합니다.
- 같은 priced scope는 room anchor, quick item, line item 중 하나로만 계산합니다.
- quote preview, save, detail, PDF, invoice conversion은 같은 subtotal/GST/total 규칙을 사용해야 합니다.
- rate 변경 후 기존 quote는 저장 당시 snapshot 기준으로 유지하고, 새 quote만 새 rate를 사용합니다.

## Quick / Advanced Pricing Boundary

세부 구현 결과는 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](../ai/V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)에 둔다. 2026-05-17 기준 Quick complete source metadata, Advanced numeric anchor/opening/trim snapshot, duplicate scope guard, setup diagnostics, A$0 selected-source blocking, invalid surface validation, and stale-rate tests가 구현됐다.

| 영역                       | Authoritative source                                                     | 저장 위치                                                  | 주의점                                                                |
| -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Quick estimate             | room template + size + selected surfaces + coating/condition multipliers | `pricing_method_inputs`, `quote_estimate_items`            | 같은 room/surface를 line item으로 다시 더하지 않음                    |
| Advanced detailed estimate | room anchor + explicit door/window/skirting/trim items                   | `pricing_method_inputs`, `quote_estimate_items`            | room anchor와 전체 property anchor를 같은 base subtotal에 섞지 않음   |
| Custom/material/service    | user-entered add-on rows                                                 | `quote_line_items`                                         | already-included scope를 add-on처럼 중복 청구하지 않음                |
| AI draft (post-core)       | scope sections + pricing candidates + clauses                            | draft metadata / `quote_ai_intake_snapshots` before review | core workflow release 전 구현 금지. AI가 price/rate/GST를 만들지 않음 |

## UX Rules

- Quote 생성 첫 화면은 AI draft가 아니라 real workflow completion을 우선합니다: manual/simple price book 기반 quote creation.
- Price setup/onboarding은 Price Rates > Manual의 앱 내 `+ Price Item` 직접 추가를 우선합니다.
- Price Rates > Manual의 Excel CSV template/import/export는 선택 옵션이며, upload 후 review/confirm을 거쳐야 저장됩니다. v1에서 아무 Excel layout이나 자동 지원하지 않습니다.
- AI draft, photo helper, AI wording helper는 core workflow release 후에만 다시 설계합니다.
- Quote CTA는 `+ New Quote` 패턴을 사용합니다.
- Public quote는 고객이 optional item, PDF, 승인/거절, 예약 날짜를 볼 수 있어야 합니다.

## Planned Price Rates Expansion

v1 pricing foundation은 세션 `019e32de-aaa3-7940-aaa6-9c773d3ec251`의 Rate Library + Modifiers 방향을 따른다.

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

- [x] 견적 번호 자동 채번
- [x] 방별 면적/표면 기반 계산
- [x] GST 10% 계산
- [x] AUD 포맷 표시
- [x] PDF 비즈니스 브랜딩
- [x] subscription gating scaffold
- [x] 유효기간 필드
- [x] quick/detailed estimate snapshot
- [x] material/service line items
- [x] Price Rates Manual direct price item add + simple Excel CSV template/review/import/export to Material / Service catalogue
- [x] quote email send
- [x] public approve/reject/signature
- [x] approved quote booking
- [x] quote templates
- [x] AI draft panel 노출
- [x] canonical quote total calculator
- [x] optional add-on total recalculation with discount/manual adjustment
- [x] public quote total preview with selected optional add-ons
- [x] quote-to-invoice preset base scope + selected optional add-on handling
- [x] discounted quote invoice parity-safe line and manual adjustment block
- [x] deterministic duplicate priced scope guard for structured Quick/Advanced/manual/exterior scope keys
- [x] fuzzy duplicate line item warning in QuoteForm
- [x] Quick estimate row metadata completeness and stale-rate A/B coverage
- [x] Advanced numeric snapshot immutability for room anchors, openings, and trim
- [x] Price Rates setup diagnostics and Quote Builder selected-source A$0 blocking
- [x] Quote form structure schema, maintenance job type, price-free taxonomy, and painting-adjacent maintenance job packs

## Active Risks / Next Work

| 우선순위  | 항목                                     | 내용                                                                                                                                                                      |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0        | Simple price book setup                  | Price Rates > Manual 직접 추가와 Excel CSV validation/review UX는 구현. 다음 단계는 A fixture로 실제 quote setup friction 검증                                            |
| P0        | A price book setup                       | A의 실제 Excel 가격표를 참고해 quote 하나에 필요한 price items를 앱 안에서 저장하고 세팅 friction 기록                                                                    |
| P0        | A quote recreation                       | 최근 quote PDF/email 1개를 Coatly에서 재현하고 total/scope/PDF/email parity 확인                                                                                          |
| P0        | Quote send/follow-up loop                | email send, public quote, viewed/open signal, follow-up due state, quote status가 end-to-end 동작                                                                         |
| P0        | Quote total parity hardening             | Task 1 parity scope, Task 2 Quick/Advanced snapshot/setup diagnostics, Task 3 Room Price Library redesign은 통과. 다음 quote-related hardening은 A fixture reconstruction |
| P0        | 저장 원자성                              | quote + rooms + surfaces + line items 저장을 transaction/RPC로 묶는 방향 검토                                                                                             |
| P1        | Exterior edit safety                     | 편집 시 exterior snapshot 손실 여부 회귀 테스트 강화                                                                                                                      |
| P1        | Exterior PDF/detail                      | 모든 exterior cost/line item이 상세/PDF에 일관 렌더되는지 검증                                                                                                            |
| P1        | Rate library expansion                   | Average Property Prices, Room Prices surface split, Prep/Access modifiers 구현 필요                                                                                       |
| P1        | Public audit                             | public token 접근/오류/승인 이벤트 운영 조회 강화                                                                                                                         |
| P2        | Read receipt                             | 고객 링크 열람/다운로드 이벤트를 영업 후속 조치에 활용                                                                                                                    |
| P2        | Smart pricing                            | 히스토리 기반 가격 제안은 아직 미구현                                                                                                                                     |
| Post-core | Scope/Clause Builder UI and AI rendering | Task 4 schema는 완료됐지만 AI/photo 연동은 core workflow release 후 별도 plan                                                                                             |

## Non-Goals

- GPS tracking
- Supplier integrations
- arbitrary Excel auto-import or complex template onboarding before simple price book workflow release
- AI photo/damage analysis before core workflow release
- AI-generated price/rate/GST/total
- Native mobile app
- Multi-language

## Test Focus

- `app/actions/quotes.test.ts`
- `components/quotes/*test.tsx`
- `app/api/pdf/quote/route.test.ts`
- `components/quotes/public/*test.tsx`
