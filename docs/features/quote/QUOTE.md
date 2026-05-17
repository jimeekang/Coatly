# Feature: Quote Builder

## Goal

페인터가 현장에서 빠르게 견적을 만들고, 고객에게 PDF/공개 링크로 보내고, 승인 이후 invoice/job으로 이어지게 합니다.

v1 AI 방향은 [AI-QUOTE-FORM-STRUCTURE.md](./AI-QUOTE-FORM-STRUCTURE.md)를 따른다. 고객에게 보이는 quote form은 **scope section + pricing row + clause library**로 분리한다. 가격 계산 boundary와 quote total parity 세부 구현은 [V1-TASK1-RATE-SOURCE-AUDIT.md](../ai/V1-TASK1-RATE-SOURCE-AUDIT.md)를 따른다. Quick/Advanced rate boundary와 snapshot hardening은 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](../ai/V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)를 따른다.

## Current Status

| 영역 | 상태 | 구현 근거 |
|------|------|-----------|
| Quote CRUD | 구현됨 | `app/actions/quotes.ts`, `app/(dashboard)/quotes/*` |
| Room/surface 견적 | 구현됨 | `QuoteForm`, `quote_rooms`, `quote_room_surfaces` |
| Quick/Detailed estimate | 구현됨, Task 2 hardening 남음 | `QuickQuoteBuilder`, `QuickEstimateBuilder`, `InteriorEstimateBuilder`, migration 041–042 |
| Exterior estimate | 구현됨, 감사 항목 남음 | `ExteriorEstimateBuilder`, audit 참고 |
| Rate settings | 구현됨, setup diagnostics 남음 | `PriceRatesForm`, `QuickEstimateTab`, `lib/rate-settings.ts` |
| Material/service line items | 구현됨 | `material_items`, `quote_line_items` |
| Quote templates | 구현됨 | `quote_templates`, `TemplatePicker` |
| AI quote drafting | 구현됨 | `AIDraftPanel`, `generateAIDraft()` |
| PDF | 구현됨 | `app/api/pdf/quote/route.ts`, `lib/pdf/quote-template.tsx` |
| Email send | 구현됨 | Resend quote email, status `sent` |
| Public approval | 구현됨 | `/q/[token]`, signature, approve/reject |
| Public booking | 구현됨 | approved quote → job booking |
| Quote → invoice | 구현됨 | invoice quote option/line item 흐름 |
| Canonical quote totals | 부분 구현됨 | `calculateQuoteTotals()`, optional add-on/public quote/invoice preset parity. Duplicate priced scope guard는 미완료 |
| AI Quote Form Builder | 설계 필요 | `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, `quote_ai_intake_snapshots` |

## Quote Modes

| Mode | 용도 | 핵심 데이터 |
|------|------|-------------|
| Detailed room/surface | 방별 벽/천장/트림 상세 견적 | `quote_rooms`, `quote_room_surfaces` |
| Quick estimate | 현장 빠른 방/크기/표면 matrix | `quote_estimate_items`, `pricing_snapshot` |
| Day rate | 일수 × 일당 + 자재 | `pricing_method_inputs` |
| Manual | 직접 금액 입력 | manual line items |
| Exterior | 외부 작업 카테고리 | `estimate_category = exterior` |

## Data Model

| 테이블/필드 | 역할 |
|-------------|------|
| `quotes` | 번호, 고객, 상태, 유효기간, margins, totals, public token |
| `quote_rooms` | 방 이름/종류/치수 |
| `quote_room_surfaces` | 표면별 면적, coating, rate, material/labour cost |
| `quote_estimate_items` | quick/detailed estimate snapshot |
| `quote_line_items` | 자재/서비스/custom line item |
| `quote_templates` | 반복 견적 재사용 |
| `public_quote_events` | 공개 링크 접근/승인/거절 감사 |

## AI Quote Form Builder Data Model

실제 legacy quote form 분석 결과, quote는 단순 line item 계산서가 아니라 작업 설명서와 조건 문서가 합쳐진 고객용 artifact다. v1은 아래 구조를 추가한다.

| 구조 | 역할 | 저장 위치 | 예시 |
|------|------|-----------|------|
| Scope section | 고객에게 보이는 작업 범위의 큰 단위 | `quote_scope_sections` | Ceiling, Walls, Bathroom, Rendered walls, Fence optional item |
| Scope step | section 안의 bullet 작업 설명 | `quote_scope_steps` | light sanding, 1 coat primer, 2 coats Weathershield, colour to be confirmed |
| Pricing row | 실제 subtotal을 만드는 계산 row | `quote_estimate_items` | eaves sqm, door each, room anchor, exterior surface |
| Custom/add-on row | material/service/custom/optional add-on | `quote_line_items` | optional fence, extra work, custom service |
| Clause item | 조건, 예외, 보증, 리스크 문구 | `quote_clause_items` | Vivid White, paint peeling, water damage, efflorescence, furniture moving |
| AI intake snapshot | AI draft 생성 당시 입력과 model metadata | `quote_ai_intake_snapshots` | notes, rough measurements, photo refs, prompt version |

### Boundary Rules

- `quote_scope_sections`와 `quote_scope_steps`는 고객용 문서 구조다. 직접 subtotal을 만들지 않는다.
- `quote_estimate_items`는 estimate engine이 만든 priced rows만 담는다.
- `quote_line_items`는 already-included scope를 다시 청구하는 용도로 쓰지 않는다.
- `quote_clause_items`는 price를 만들지 않는다.
- AI draft는 `scope_sections`, `pricing_candidates`, `clauses`만 생성한다.
- deterministic pricing pass만 `quote_estimate_items`, `quote_line_items`, subtotal/GST/total을 만든다.
- PDF/public quote/invoice conversion은 같은 section order, optional item state, calculated totals를 사용한다.

### Interior Required Coverage

| 그룹 | 항목 |
|------|------|
| Areas | bedrooms, bathroom, living, dining, kitchen, hallway, stairway, laundry, wardrobe, study/office, other |
| Surfaces | walls, ceiling, cornice, doors, door frames, windows/frames, skirting, trim, wardrobe inside, bathroom/wet area |
| Prep/coating | sanding, dusting, patching, gap filling, primer, oil undercoat, cover stain primer, ceiling flat, low sheen wall paint, kitchen & bath paint, oil/water enamel |
| Condition/notes | dark colour, Vivid White, colour match, peeling paint, water damage, wet area, tile edge gap, colour/sheen to be confirmed |

### Exterior Required Coverage

| 그룹 | 항목 |
|------|------|
| Surfaces | rendered walls, cladding boards, eaves/soffits, fascia/barge boards, gutters, downpipes, gable, timber, front door, exterior doors/frames, windows/frames, retaining walls, fence, handrail, poles, roof, concrete overhang, pool retaining wall, other |
| Units | sqm, lm, each, fixed |
| Prep/coating | sanding, dusting, patching, gap filling, total prep, solvent-based primer, Acratex/Acraprime, metal primer, timber under primer, Weathershield, varnish |
| Condition/notes | porous render, efflorescence, difficult access, unsafe access, new timber, peeling paint, moisture/water damage, colour/sheen to be confirmed |

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
- Quick estimate는 저장 시 authoritative snapshot을 남겨 이후 단가 변경에 흔들리지 않게 합니다. 현재 unit-level snapshot helper는 구현됐고, `quote_estimate_items.metadata` completeness가 Task 2 남은 작업입니다.
- Basic은 제한된 AI quote/photo/follow-up 사용량을 제공하고, Pro는 full AI Quote Form Builder와 더 높은 AI limit을 제공합니다.
- v1 AI-assisted Quote Form Builder 이전에 quote calculation boundary를 먼저 정리합니다.
- `quote_estimate_items`는 estimate engine이 만든 priced rows만 저장합니다.
- `quote_line_items`는 material/service/custom/optional add-on만 저장합니다.
- 같은 priced scope는 room anchor, quick item, line item 중 하나로만 계산합니다.
- quote preview, save, detail, PDF, invoice conversion은 같은 subtotal/GST/total 규칙을 사용해야 합니다.
- rate 변경 후 기존 quote는 저장 당시 snapshot 기준으로 유지하고, 새 quote만 새 rate를 사용합니다.

## Quick / Advanced Pricing Boundary

세부 구현 계획과 현재 gap은 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](../ai/V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md)에 둔다. 2026-05-17 기준 Quick schema/UI/snapshot helper와 Advanced room item source copy는 구현됐지만 Advanced numeric snapshot immutability, setup warnings, duplicate scope guard는 아직 남아 있다.

| 영역 | Authoritative source | 저장 위치 | 주의점 |
|------|----------------------|-----------|--------|
| Quick estimate | room template + size + selected surfaces + coating/condition multipliers | `pricing_method_inputs`, `quote_estimate_items` | 같은 room/surface를 line item으로 다시 더하지 않음 |
| Advanced detailed estimate | room anchor + explicit door/window/skirting/trim items | `pricing_method_inputs`, `quote_estimate_items` | room anchor와 전체 property anchor를 같은 base subtotal에 섞지 않음 |
| Custom/material/service | user-entered add-on rows | `quote_line_items` | already-included scope를 add-on처럼 중복 청구하지 않음 |
| AI draft | scope sections + pricing candidates + clauses | draft metadata / `quote_ai_intake_snapshots` before review | AI가 price/rate/GST를 만들지 않음 |

## UX Rules

- Quote 생성 첫 화면에서 AI draft, template, manual form을 사용할 수 있습니다.
- Basic AI는 제한된 notes-based quote wording helper이고, Pro AI는 full Scope/Clause builder + photo AI를 제공합니다. 사용자는 저장 전 반드시 폼을 검토합니다.
- Quote CTA는 `+ New Quote` 패턴을 사용합니다.
- Public quote는 고객이 optional item, PDF, 승인/거절, 예약 날짜를 볼 수 있어야 합니다.

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

## Active Risks / Next Work

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| P0 | Duplicate priced scope guard | Canonical total path는 구현됐지만, Quick/Advanced 견적에서 room anchor, quick estimate item, custom line item이 같은 scope를 중복 계산하지 않도록 structured scope key validator가 아직 필요 |
| P0 | Quick/Advanced rate boundary hardening | Quick row metadata completeness, Advanced numeric anchor snapshot, A$0 setup warning, invalid surface validation, stale-rate quote A/B tests가 필요 |
| P0 | AI Quote Form Builder structure | 고객용 scope section, 가격 row, clause library를 분리하고 legacy interior/exterior quote form을 재현 가능한 데이터 구조로 정리 |
| P0 | Quote total parity hardening | Optional add-on/public quote/invoice preset parity는 focused tests 통과. 남은 작업은 exact create/update same-fixture test, PDF route regression, full suite/build |
| P0 | 저장 원자성 | quote + rooms + surfaces + line items 저장을 transaction/RPC로 묶는 방향 검토 |
| P1 | Exterior edit safety | 편집 시 exterior snapshot 손실 여부 회귀 테스트 강화 |
| P1 | Exterior PDF/detail | 모든 exterior cost/line item이 상세/PDF에 일관 렌더되는지 검증 |
| P1 | Public audit | public token 접근/오류/승인 이벤트 운영 조회 강화 |
| P2 | Read receipt | 고객 링크 열람/다운로드 이벤트를 영업 후속 조치에 활용 |
| P2 | Smart pricing | 히스토리 기반 가격 제안은 아직 미구현 |

## Non-Goals

- GPS tracking
- Supplier integrations
- Native mobile app
- Multi-language

## Test Focus

- `app/actions/quotes.test.ts`
- `components/quotes/*test.tsx`
- `app/api/pdf/quote/route.test.ts`
- `components/quotes/public/*test.tsx`
