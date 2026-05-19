# AI Quote Form Builder Structure

> 기준일: 2026-05-16. 인터뷰 답변과 과거 견적서 3개를 기준으로 정리한 v1 quote form 구조다.

## Direction

v1은 AI가 견적서를 통째로 자유문장으로 쓰는 기능이 아니다. 목표는 **AI-assisted Quote Form Builder**다.

AI는 현장 노트, rough measurements, 사진, 기존 quote template을 바탕으로 고객에게 보일 작업 섹션과 조건 문구를 초안 작성한다. 가격, rate, GST, total은 painter의 `price_rates`와 deterministic quote calculator가 만든다.

핵심 구조는 3층이다.

| 층 | 역할 | AI가 할 수 있는 일 | 가격 계산 여부 |
|----|------|-------------------|----------------|
| Scope section | 고객에게 보이는 작업 범위 문서 | 섹션 제목, surface, prep, coats, paint product, colour/sheen, special notes 초안 작성 | 직접 계산 안 함 |
| Pricing row | 실제 돈을 만드는 계산 row | section과 surface 후보를 제안할 수 있음 | 앱 calculator만 계산 |
| Clause library | 예외, 조건, 보증, 리스크 문구 | 상황에 맞는 clause 추천/초안 작성 | 계산 안 함 |

`quote_line_items`는 이 구조에서 네 번째 보조 역할이다. 이미 포함된 작업 범위를 다시 가격화하는 곳이 아니라, material/service/custom/optional add-on만 담는다.

## Evidence From Legacy Quotes

| 파일 | 견적서 성격 | 앱에 반영해야 하는 구조 |
|------|-------------|------------------------|
| `7_6-10_Winchester_St_Quotation_withLogo_EDITABLETEXT.pdf` | 상세 interior 발송용 quote. Ceiling, Walls, Doors & Door Frames, Bathroom 섹션과 terms가 있음 | interior scope section, paint system/coats, special note, inclusions, exceptions, warranty, payment info |
| `Edgar's Painting Quotation.pdf` | 빈 intake/checklist form. interior/exterior 항목을 빠르게 체크하는 구조 | AI intake checklist, room/surface taxonomy, interior/exterior common form seed |
| `58958490.pdf` | 상세 exterior 발송용 quote. Exterior surfaces, optional fence item, exclusions, risk disclosure, pricing reason, deposit, attachments가 있음 | exterior scope section, optional item, clause library, condition/risk flags, public approval/payment wording |

실제 painter quote는 line item 계산서라기보다 **작업 설명서 + 조건/예외 문서 + 가격 요약**에 가깝다. 따라서 quote form은 계산 입력과 고객용 문서 입력을 분리해야 한다.

## Product Shape

### Quote Create Flow

| 단계 | 화면/기능 | 목적 | 결과 데이터 |
|------|-----------|------|-------------|
| 1 | Start | AI draft, template, manual 중 선택 | quote draft shell |
| 2 | AI Intake | notes, rough measurements, photos, job type, colour/sheen status, access/condition note 입력 | `ai_intake_snapshot` |
| 3 | Scope Builder | interior/exterior 작업 섹션 확인 및 수정 | `quote_scope_sections`, `quote_scope_steps` |
| 4 | Pricing | app calculator가 section 후보를 priced row로 매핑 | `quote_estimate_items`, `quote_line_items` |
| 5 | Terms & Clauses | inclusions, exclusions, warranty, risk disclosure 선택 | `quote_clause_items` |
| 6 | Preview | 고객용 PDF/public quote 형태 확인 | generated quote artifact |
| 7 | Send/Approve | email/public link, optional item 선택, signature | quote status/events |

### UI Sections

| 탭 | 주요 기능 | v1 필수 여부 |
|----|-----------|-------------|
| Overview | customer, property, quote type, valid until, deposit, GST mode | 필수 |
| Scope | AI가 만든 work breakdown section 수정 | 필수 |
| Pricing | deterministic priced rows, optional add-ons, adjustment, GST/total | 필수 |
| Terms | inclusions/exclusions/conditions/warranty/payment 문구 선택 | 필수 |
| Photos | uploaded photos, section 연결, AI condition hints | 조건부 |
| Preview | PDF/public quote 미리보기 | 필수 |

## Data Model Target

### Existing Tables To Keep

| 테이블/필드 | 유지 역할 | 주의점 |
|-------------|----------|--------|
| `quotes` | header, customer, status, subtotal/GST/total, payment/deposit, public token | totals는 canonical calculator 결과만 저장 |
| `quote_rooms` | 상세 room/surface mode에서 방 구조 저장 | customer-visible scope section과 1:1이라고 가정하지 않음 |
| `quote_room_surfaces` | 방별 면적/표면 계산 | AI가 직접 rate를 채우지 않음 |
| `quote_estimate_items` | quick/advanced/exterior estimate engine이 만든 priced rows | `scope_section_id` 연결이 필요 |
| `quote_line_items` | material/service/custom/optional add-on | already-included scope 중복 청구 금지 |
| `pricing_method_inputs` | method별 raw calculation input snapshot | AI intake 전체를 여기에 섞지 않음 |

### New Tables / Structures

#### `quote_scope_sections`

고객에게 보이는 작업 범위의 최상위 섹션이다. 예: Ceiling, Walls, Bathroom, Rendered walls, Fence optional item.

| 필드 | 타입 | 목적 |
|------|------|------|
| `id` | uuid | section id |
| `quote_id` | uuid | quote 연결 |
| `section_kind` | text | `interior`, `exterior`, `general`, `optional` |
| `title` | text | 고객에게 보이는 제목 |
| `area_label` | text | Bedroom 1, Living room, Front elevation, All exterior 등 |
| `surface_category` | text | walls, ceiling, doors, rendered_walls, eaves 등 |
| `is_optional` | boolean | public quote에서 선택 가능한 항목 여부 |
| `is_selected` | boolean | optional item 선택 여부 |
| `pricing_status` | text | `unpriced`, `priced`, `included`, `excluded`, `allowance`, `to_confirm` |
| `measurement_status` | text | `confirmed`, `rough`, `photo_hint`, `to_confirm` |
| `source` | text | `manual`, `ai`, `template`, `legacy_quote` |
| `sort_order` | int | PDF/public quote 순서 |
| `metadata` | jsonb | AI confidence, photo refs, source quote refs |

#### `quote_scope_steps`

각 scope section 안의 bullet line이다. 예: light sanding, 1 coat primer, 2 coats Dulux Weathershield.

| 필드 | 타입 | 목적 |
|------|------|------|
| `id` | uuid | step id |
| `section_id` | uuid | scope section 연결 |
| `step_type` | text | `prep`, `primer`, `topcoat`, `repair`, `paint_system`, `colour_note`, `special_note`, `exclusion_note` |
| `description` | text | 고객에게 보이는 문장 |
| `paint_brand` | text nullable | Dulux, Norglass 등 |
| `paint_product` | text nullable | Weathershield, Kitchen & Bath, Super Enamel 등 |
| `coats_min` | int nullable | 최소 coat 수 |
| `coats_max` | int nullable | 최대 coat 수 |
| `colour` | text nullable | Lexicon Quarter, colour to be confirmed 등 |
| `sheen` | text nullable | flat, low sheen, semi-gloss 등 |
| `requires_confirmation` | boolean | colour/sheen/site condition 확인 필요 여부 |
| `is_customer_visible` | boolean | PDF/public quote 노출 여부 |
| `sort_order` | int | section 안의 순서 |

#### `quote_clause_items`

견적서 하단/중간의 조건, 예외, 리스크, 보증 문구다.

| 필드 | 타입 | 목적 |
|------|------|------|
| `id` | uuid | clause id |
| `quote_id` | uuid | quote 연결 |
| `clause_key` | text | reusable key. 예: `vivid_white`, `paint_peeling`, `efflorescence` |
| `category` | text | `inclusion`, `exclusion`, `risk_disclosure`, `warranty`, `payment`, `validity`, `insurance`, `brand_proof` |
| `title` | text | 고객에게 보이는 제목 |
| `body` | text | 고객에게 보이는 본문 |
| `severity` | text | `info`, `warning`, `critical` |
| `applies_to_section_id` | uuid nullable | 특정 scope section에 연결 |
| `source` | text | `manual`, `ai`, `template`, `default_library` |
| `is_customer_visible` | boolean | PDF/public quote 노출 여부 |
| `sort_order` | int | 표시 순서 |

#### `quote_ai_intake_snapshots`

AI draft를 만들 때 사용한 입력값을 audit용으로 저장한다. 고객에게 바로 보이지 않는다.

| 필드 | 타입 | 목적 |
|------|------|------|
| `id` | uuid | snapshot id |
| `quote_id` | uuid | quote 연결 |
| `job_type` | text | `interior`, `exterior`, `both`, `maintenance` |
| `site_notes` | text | painter notes |
| `rough_measurements` | jsonb | user-entered measurement |
| `photo_refs` | jsonb | storage path, hash, prompt version |
| `colour_status` | text | `confirmed`, `to_confirm`, `partial` |
| `price_rates_snapshot_id` | text nullable | pricing pass가 사용한 rate snapshot |
| `model_provider` | text | `alibaba-qwen` |
| `model` | text | `qwen3-vl-flash` |
| `prompt_version` | text | prompt/eval version |
| `created_at` | timestamptz | 생성 시각 |

### Relationship Rules

| 관계 | 규칙 |
|------|------|
| `quote_scope_sections` → `quote_scope_steps` | section 하나는 여러 step을 가진다 |
| `quote_scope_sections` → `quote_estimate_items` | priced scope는 최대 하나의 authoritative priced base row에 연결한다 |
| `quote_scope_sections` → `quote_line_items` | optional/custom add-on만 연결한다 |
| `quote_scope_sections` → `quote_clause_items` | section-specific risk disclosure를 연결할 수 있다 |
| `quote_ai_intake_snapshots` → generated draft | 같은 prompt/model/input으로 만든 결과를 audit하고 재생성 비용을 줄인다 |

<<<<<<< HEAD
## Price Rate Library Target

세션 `019e32de-aaa3-7940-aaa6-9c773d3ec251` 기준으로 quote form의 pricing layer는 **Rate Library + Modifiers**를 따른다. 고객에게 보이는 scope section과 실제 가격을 만드는 rate item은 분리하지만, AI가 제안한 `pricing_candidates`는 이 라이브러리의 key로 매핑될 수 있어야 한다. key 매핑은 price amount가 아니라 lookup 후보일 뿐이다.

| Rate group | 설정 데이터 | AI/Quote form에서 쓰는 방식 |
|------------|-------------|-----------------------------|
| Average Property Prices | `apartment_1b1b`, `apartment_2b1b`, `apartment_2b2b`, `apartment_3b2b`, `house_3b2b`, `house_4b2b`의 min/average/high price, default surfaces, condition, ceiling height, notes | "2 bed 2 bath apartment repaint"처럼 빠르게 시작하는 property anchor. 고객용 scope section은 여러 개일 수 있지만 가격 source는 하나 |
| Room Prices | bedroom, bathroom, living, hallway 등 room anchor의 average full repaint price, walls-only %, ceiling-only %, trim-only %, default surfaces | `Bedroom 1`을 선택해도 walls/ceiling/trim/doors/windows는 quote 안에서 개별 토글 가능 |
| Base Surface Rates | walls/ceiling `/sqm`, trim/skirting `/lm`, doors/windows `/each`, exterior surfaces `/sqm`/`lm`/`each` | Advanced estimate와 explicit surface pricing에 사용 |
| Prep & Repairs | patch holes, crack repair, sanding, caulking, mould treatment, stain/tannin block, oil-to-water conversion | scope step 또는 optional/add-on candidate. 이미 anchor에 포함된 prep은 중복 청구 금지 |
| Access & Complexity | high ceiling, stairwell, occupied/furnished, poor access, second-storey/ladder, scaffold | multiplier/fixed allowance 또는 clause-only risk disclosure |
| Paint System / Finish Upgrades | refresh 1 coat, standard repaint 2 coats, new plaster 3 coats, wet-area paint, premium washable, enamel, exterior full system | coating multiplier 또는 explicit upgrade row |
| Business Rules | minimum job/room charge, callout/travel, material markup, target daily earning warning | quote total guardrail, profitability warning, optional client upgrades |

Required quote behavior:

- Room anchor selection never locks all surfaces. `Bedroom 1 + walls only` and `Bathroom + ceiling only` are valid.
- Validation requires at least one priced work item, not a fixed wall/ceiling/trim bundle.
- Average property anchor and room anchor cannot both create base subtotal for the same included area.
- `quote_line_items` remain add-ons/material/service/custom items. They should not become a second place to reprice an already included wall/ceiling/trim scope.
- Existing quotes keep the saved rate snapshot after future Price Rates changes.

=======
>>>>>>> phrase0
## Item Taxonomy

### Interior Scope Items

| 그룹 | 항목 |
|------|------|
| Room/area | bedroom, master bedroom, bathroom, living room, lounge, dining, kitchen, hallway, stairway, laundry, wardrobe, walk-in robe, study, foyer, other |
| Surface | walls, ceiling, cornice, doors, door frames, windows, window frames, skirting, trim, wardrobe inside walls, bathroom/wet area |
| Prep | light sanding, dusting, minor patching, gap filling, stain blocking, cover stain primer, oil undercoat, bathroom primer |
| Paint system | ceiling flat, wall low sheen, kitchen & bath, oil enamel, water enamel, varnish, colour match |
| Condition/risk | dark existing colour, Vivid White, peeling paint, water damage, wet area, mould/stain, tile edge gap, unpainted area |
| Confirmation | colour to be confirmed, sheen to be confirmed, site inspection required, customer-selected feature wall |

### Exterior Scope Items

| 그룹 | 항목 |
|------|------|
| Surface | rendered walls, cladding boards, eaves/soffits, fascia/barge boards, gutters, downpipes, gable, timber, front door, exterior doors/frames, windows/frames, retaining walls, fence, handrail, poles, roof, concrete overhang, pool retaining wall, other |
| Unit | sqm, lm, each, fixed |
| Prep | light sanding, dusting, patching, gap filling, pressure cleaning note, rust treatment note, masking/protection |
| Primer/system | Dulux Total Prep, solvent-based primer, Acratex Acraprime, Norglass all surface primer, timber under primer, metal primer, varnish |
| Topcoat | Dulux Weathershield, Acratex, Super Enamel, varnish paint, brand to be confirmed |
| Condition/risk | porous render, efflorescence, difficult access, unsafe access, new timber, peeling, moisture/water damage, metal surface, swimming pool area |
| Exclusion candidate | gutters excluded, fascia excluded, soffit excluded, laminated/powder-coated excluded, restoration fix excluded |

### Clause Library Items

| Clause | 언제 사용 | 예시 방향 |
|--------|-----------|-----------|
| Inclusions | 거의 모든 quote | labour, paints, materials, drop sheets, quality work |
| Warranty | painter 설정에 따라 | 5 years workmanship warranty |
| Insurance/proof | company profile 설정 | public liability, workers insurance, Dulux accredited |
| Exceptions | 제외 surface가 있을 때 | no laminated/powder-coated surfaces, no unpainted areas |
| Furniture moving | interior quote | valuables moved before work, extra labour may be charged |
| Vivid White | white colour not finalised or Vivid White selected | low coverage, extra coats may cost more |
| Paint peeling | existing paint risk | if previous paint peels during prep, extra work may apply |
| Water damage | moisture/blistering visible | repair best effort, source must be fixed |
| Wet area/tile edge | bathroom/kitchen/wet area | gap filler may shrink, silicone may be recommended |
| Efflorescence | exterior render white staining | moisture-driven and may reappear |
| Difficult access | exterior height/access issue | price includes extra time/care, unsafe access may be excluded |
| Pricing reason | high quote explanation | primer, access, substrate, material increase |
| Payment/deposit | quote acceptance | 30% deposit or custom schedule |
| Validity | all sent quotes | valid for 30 days unless changed |
| Attachments | public quote/PDF | insurance, accreditation, product docs |

## AI Draft Contract

AI output must be structured and price-free.

```ts
type AIQuoteFormDraft = {
  job_type: 'interior' | 'exterior' | 'both' | 'maintenance';
  scope_sections: Array<{
    section_kind: 'interior' | 'exterior' | 'general' | 'optional';
    title: string;
    area_label: string;
    surface_category: string;
    is_optional: boolean;
    pricing_status: 'unpriced' | 'included' | 'to_confirm';
    measurement_status: 'confirmed' | 'rough' | 'photo_hint' | 'to_confirm';
    steps: Array<{
      step_type: 'prep' | 'primer' | 'topcoat' | 'repair' | 'paint_system' | 'colour_note' | 'special_note';
      description: string;
      paint_brand?: string;
      paint_product?: string;
      coats_min?: number;
      coats_max?: number;
      colour?: string;
      sheen?: string;
      requires_confirmation: boolean;
    }>;
  }>;
  pricing_candidates: Array<{
    scope_section_index: number;
    surface_category: string;
<<<<<<< HEAD
    unit: 'sqm' | 'lm' | 'each' | 'fixed' | 'room_anchor' | 'property_anchor';
    quantity?: number;
    quantity_status: 'confirmed' | 'rough' | 'missing';
    suggested_pricing_method: 'quick' | 'advanced' | 'average_property' | 'exterior' | 'manual';
    rate_library_group?: 'average_property' | 'room_price' | 'surface_rate' | 'prep_repair' | 'access_modifier' | 'paint_system_upgrade' | 'business_rule';
    rate_item_key?: string;
    included_surface_keys?: string[];
=======
    unit: 'sqm' | 'lm' | 'each' | 'fixed' | 'room_anchor';
    quantity?: number;
    quantity_status: 'confirmed' | 'rough' | 'missing';
    suggested_pricing_method: 'quick' | 'advanced' | 'exterior' | 'manual';
>>>>>>> phrase0
  }>;
  clauses: Array<{
    clause_key: string;
    category: 'inclusion' | 'exclusion' | 'risk_disclosure' | 'warranty' | 'payment' | 'validity' | 'insurance';
    title: string;
    body: string;
    applies_to_scope_section_index?: number;
    severity: 'info' | 'warning' | 'critical';
  }>;
  questions_for_user: string[];
};
```

Forbidden AI fields:

- `rate`
- `unit_price_cents`
- `subtotal_cents`
- `gst_cents`
- `total_cents`
- payment due date invented from nothing
- hidden repair/restoration claim not present in notes/photos

## Deterministic Pricing Pass

1. User reviews AI scope sections.
<<<<<<< HEAD
2. App maps each `pricing_candidate` to a pricing mode, including Average Property Price presets when the candidate is property-level.
=======
2. App maps each `pricing_candidate` to a pricing mode.
>>>>>>> phrase0
3. App loads painter `price_rates` snapshot.
4. App creates `quote_estimate_items` for priced base scope.
5. App creates `quote_line_items` only for selected custom/material/service/optional add-ons.
6. Canonical calculator computes subtotal, discount, GST, manual adjustment, deposit, total.
7. Quote detail, PDF, public quote, invoice conversion all read the same calculated values.

## Interior / Exterior AI Examples

### Interior Example

Input notes:

```text
2 bed 1 bath apartment. Repaint all interior. Ceiling white flat. Walls Lexicon Quarter low sheen. Bathroom kitchen & bath. Dark cornice needs extra coats. Wardrobe inside included.
```

AI should produce:

- Ceiling section with sanding/dusting/patching/gap filling and 1-2 coats ceiling white.
- Walls section with 3 coats wall paint and colour/sheen.
- Bathroom section with primer and kitchen/bath paint.
- Wardrobe inside section or step.
- Vivid White or dark colour coverage clause only if relevant.
- No price.

### Exterior Example

Input notes:

```text
Exterior repaint. Eaves, rendered walls, cladding, retaining wall, front door. Coloured render is porous. Some difficult access. Fence optional.
```

AI should produce:

- Eaves section with prep and Weathershield.
- Rendered walls section with solvent-based primer explanation.
- Cladding section.
- Front door/timber section.
- Difficult access pricing reason clause.
- Efflorescence or porous render disclosure if notes/photos support it.
- Fence optional section.
- No price.

## Guardrails

- One priced scope can have only one authoritative pricing source.
- A scope section may be customer-visible without being separately priced if it is included in a larger anchor.
- Optional items must be visible as optional and included in total only when selected.
- AI can mark `to_confirm`; it must not present rough/photo-only assumptions as confirmed measurements.
- Every customer-visible AI sentence must remain editable before send.
- Existing quote snapshots must not change when painter updates future rates.
- PDF/public quote must preserve section order and optional item state.
- Invoice conversion must not reprice the quote.

## Build Checklist

| ID | 작업 | 완료 기준 |
|----|------|-----------|
| QF-1 | Legacy quote pattern map | 3개 legacy PDF가 scope/pricing/clause 구조로 분해됨 |
| QF-2 | Scope section schema | `quote_scope_sections`, `quote_scope_steps` migration 초안과 RLS 기준 확정 |
| QF-3 | Clause library schema | reusable clause keys, default library, per-quote selected clauses 구조 확정 |
| QF-4 | Exterior taxonomy 확장 | rendered walls, cladding, retaining walls, timber, downpipes, fence, handrail 등 추가 방식 확정 |
| QF-5 | Quote form UX | Scope/Pricing/Terms/Preview 흐름에서 section과 priced row를 분리 |
| QF-6 | AI draft schema | AI output이 `AIQuoteFormDraft`를 따르고 price field를 포함하지 않음 |
| QF-7 | Pricing pass | AI scope sections가 deterministic calculator를 통해 priced rows로만 변환됨 |
| QF-8 | PDF/public rendering | legacy interior/exterior quote 구조를 고객용 PDF/public quote로 재현 가능 |
| QF-9 | Regression tests | duplicate priced scope, optional item total, quote/PDF/invoice total parity 테스트 통과 |

## Acceptance Criteria

- Winchester interior quote의 Ceiling/Walls/Doors/Bathroom/Inclusions/Terms 구조를 앱 데이터로 재현할 수 있다.
- Edgar checklist의 interior/exterior 항목을 AI intake checklist와 quote form taxonomy로 매핑할 수 있다.
- Paint Buddy exterior quote의 exterior surfaces, exceptions, optional fence, risk disclosures, deposit/validity 문구를 앱 데이터로 재현할 수 있다.
- AI draft가 quote section과 clause를 만들지만 price/rate/GST/total을 만들지 않는다.
- 같은 작업 범위가 scope section, estimate item, custom line item에서 중복 청구되지 않는다.
- Public quote에서 optional item 선택 상태가 subtotal/GST/total에 정확히 반영된다.
