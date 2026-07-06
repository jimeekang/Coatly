# AI-assisted Quote Form Builder — Phase 0 Validation Record

> Owner: **Claude** (Opus 4.8 · extra) — 기획/디자인/QA/분석 문서. 구현·DB·git 결정은 Codex(high) 영역.
> **Historical** — 2026-05 AI-first Phase 0 검증 기록. 이 문서의 pricing 가정(Basic A$29 / Pro 무료 trial)은 **superseded**다. 현행 앱 pricing은 Starter A$39 / Pro A$59이고, v1 방향은 workflow-first(Excel quote workflow replacement)로 재프레임됐다. 아래 인터뷰 finding과 legacy quote 분석은 여전히 유효한 근거로 남긴다. 새 AI/photo/Qwen 작업은 [../../PLANS.md](../../PLANS.md)의 core workflow release gate가 통과한 뒤에만 시작한다.

## 배경

- 기준일: 2026-05-16. Phase 0 목적은 기능을 만들기 전에 painter가 실제로 돈을 낼 문제인지 확인하는 것이었다.
- 인터뷰는 30분 calendar 대신 written survey 5명분(P1–P5)으로 수집했다. 원문: [docs/inverview-answer.txt](../../inverview-answer.txt).
- 과거 quote는 고객 이름/주소/전화/이메일을 제거한 뒤 eval seed 및 quote form data model seed로만 사용한다.
- 검증된 항구 원칙: AI는 가격/rate/GST/total을 만들지 않는다. AI는 scope 문장, surface 후보, assumptions/exclusions만 초안 작성하고, 금액은 deterministic quote calculator가 계산한다.
- 과거 견적서 form은 `scope section` + `pricing row` + `clause library` 3층 구조로 분해해 quote form data model seed로 쓴다.

## Interview Log (P1–P5)

| Painter | Quotes/월 | 현재 도구 | Quote 작성 시간 | 핵심 pain | AI Quote Form 반응 | Photo 기대 | price_rates 동의 | Today Assistant | Follow-up Writer | 가격 반응 | 결정 근거 |
|---------|-----------|-----------|-----------------|-----------|--------------------|------------|------------------|-----------------|------------------|-----------|-----------|
| P1 | 4-8 | Word | 10-20분 | 문장 정리, follow-up. Residential에서는 site measure/line item pain 낮음 | 조건부 긍정. site 문제점까지 자동 작성되면 사용 | Quote 사진은 드묾. notes/measurement 보조 충분 | 동의 | 매우 유용 | 유용 | 거절. 하루 10건 이상이면 고려 | volume 대비 비쌈 |
| P2 | 1-2 | 현장 눈대중 M2/LM + 수기 | 1-2시간 | site measurement, line item, 문장, follow-up 모두 | 강한 긍정 | 사진 많이 사용. photo-only measurement/cost 기대 강함 | 동의 | 긍정 | 긍정 | 거절. under A$20이면 고려 | pain 크지만 가격 민감 |
| P3 | 약 10 | Word + ChatGPT | 약 20분 | ChatGPT 사용 후 큰 pain 낮음 | 긍정 | 사진 드묾. 고객 중요 부분에 사진+설명 | 부분 동의 | 긍정 | 긍정 | 강한 긍정 | AI price 반영 원함 → deterministic boundary 설명 필요 |
| P4 | 0 | GPT | 약 20분 | site measurement | 정확도에 따라 조건부 | condition check 용도 | 동의 | 긍정 | 긍정 | 조건부. 월 50건 이상이면 고려 | quote volume 0, pilot fit 낮음 |
| P5 | 현재 0, 과거 약 2/월 | ChatGPT | 약 20분 | line item 계산. 비전문가라 정확성 확신 어려움 | 긍정 | 사진 주로 사용. 초안 보조면 충분 | 동의 | 긍정 | 긍정 | 조건부 | handyman/maintenance 확장 신호 |

### Interview Findings Summary

| 항목 | 확인 |
|------|------|
| AI Quote Form 사용 의향 | 5/5 긍정 또는 조건부 긍정. P3/P5는 이미 ChatGPT 사용 → Coatly 차별점은 quote form structure, pricing safety, PDF/public flow여야 함 |
| Photo 기능 | 5/5 관심. P2는 photo-only measurement/cost 기대. P1/P4/P5는 notes/measurement 중심 + condition/scope 보조가 더 현실적 |
| `price_rates` 입력 | 4/5 동의, P3는 AI price 반영 원함. AI는 rate를 만들지 않고 painter review + deterministic calculator로 제한 |
| Today Assistant | 5/5 긍정. 보조 AI 범위 유지 근거 |
| Follow-up Writer | 5/5 긍정. 자동 발송 없이 초안 작성 범위로 유지 |
| 가격 반응 | 강한 긍정 1/5(P3), 명확한 가격 반대 2/5(P1/P2), volume 조건부 2/5(P4/P5) |
| Pilot fit | P1/P2/P3가 pilot 후보. P4/P5는 사용량 낮아 insight용 |

## Pricing Interview Notes

각 painter가 실제로 가격을 잡는 방식. 목적은 Quick/Advanced 구조를 단순하지만 안전하게 만드는 것이다.

| Painter | 주 pricing 방식 | Quick 최소 입력 | Advanced 상세 항목 | 중복 계산 위험 | rate setup 난이도 | 메모 |
|---------|----------------|------------------|---------------------|----------------|-------------------|------|
| P1 | Residential은 line item보다 scope wording 중심 | 방/표면 선택 + 문장 초안 | commercial/detail 필요성 낮음. site issue 자동 문장화가 더 중요 | 낮음-중간 | 낮음 | included/add-on 구분, 실제 rate 방식 확인 필요 |
| P2 | Ceiling/walls M2, woodwork LM, 현장 눈대중 | surface + M2/LM rough input | ceiling/walls/woodwork, photo condition, site visit fallback | 높음. photo estimate와 manual M2/LM 중복 위험 | 중간 | photo-only expectation을 scope 보조로 재정렬 필요 |
| P3 | Word + ChatGPT 기반, 구체 방식 미기록 | room/surface quick input (follow-up 필요) | AI price suggestion 요구 → painter rate + app calculator 원칙 설명 필요 | 높음. AI price와 app price 이중 anchor 위험 | 중간 | strong paid signal. pricing boundary 교육 후 pilot 후보 |
| P4 | 현재 quote 없음. measurement pain 중심 | measurements + photo condition check | condition, site measurement, accuracy confidence | 중간. 낮은 사용량으로 검증 약함 | 낮음 | pilot보다 insight용 |
| P5 | line item 계산 pain. 비전문가/maintenance 성격 | photo + notes + guided line item choices | scope, line items, condition, trade-specific template | 높음. 자동 가격처럼 보이면 위험 | 높음 | guided presets + deterministic calculator가 핵심. maintenance 확장 신호 |

## Legacy Quote Analysis (QG-1 ~ QG-3)

과거 quote 3개를 scope/pricing/clause 구조 재현 및 eval seed로 분석했다. 고객 정보는 반드시 제거한다.

| Quote | 성격 | Scope sections | Pricing | Clause items | Optional | 분석 결과 |
|-------|------|----------------|---------|--------------|----------|-----------|
| QG-1 Winchester interior | 상세 interior 발송용 quote | Ceiling, Walls, Doors & Door Frames, Bathroom | Total-only quote로 priced row 역산 필요 | Inclusions, terms, paint risks | 없음 | `scope_sections` + `clauses` seed. customer/address redaction 후 numeric fixture 작성 가능 |
| QG-2 Edgar checklist | 빈 interior/exterior intake/checklist form | checklist form | 가격 scenario 아님 | payment/signature shell | 없음 | AI intake taxonomy + surface taxonomy seed. form coverage용 |
| QG-3 Paint Buddy exterior | 상세 exterior 발송용 quote | Eaves, Rendered walls, Cladding, Retaining walls, Front door, Timber, Fence | base total + optional fence | Exceptions, efflorescence, peeling, furniture, warranty, deposit, validity | Fence | exterior scope + optional item + clause library seed. optional fence가 base total에 섞이지 않게 확인 |

핵심 관찰: 실제 painter quote는 line item 계산서라기보다 **작업 설명서 + 조건/예외 문서 + 가격 요약**에 가깝다. 따라서 quote form은 계산 입력과 고객용 문서 입력을 분리해야 한다. 추가 회수 목표(painter별 anonymized quote golden set, numeric fixture)는 아직 미달로 남는다.

## Positioning Interpretation (2026-05-23)

인터뷰와 시장 검토를 합치면 paint-only CRM보다 painting-first maintenance quote intelligence가 더 현실적이었다. 다만 generic maintenance로 넓히면 정확도/책임 문제가 커진다. P5의 handyman/maintenance 신호는 v1 scope 확장이 아니라 **painting-adjacent maintenance job packs**로 해석한다. (이 방향은 이후 workflow-first 재프레임에서 core workflow release 뒤로 defer됐다.)

| 방향 | 당시 판단 |
|------|-----------|
| 페인터 전용 CRM | 하지 않음. general job-management SaaS와 정면충돌 |
| 페인트 견적 계산기만 | 하지 않음. 사용 빈도/paid conversion 약함 |
| Painting + maintenance quote AI | 진행(painting-adjacent job packs로 제한) |
| Property manager maintenance report AI | v1.1+ 후보 |
| 전체 tradie SaaS | 하지 않음. unsupported trades는 validator가 차단. Plumbing/electrical/structural/roofing/pest/asbestos/waterproofing은 밖 |

## Pricing Boundary (permanent)

- Basic/Pro 모두 AI가 price, rate, GST, total을 만들지 않는다.
- painter가 `price_rates`를 입력하고, AI는 rate를 고르지 않는다.
- rough/photo-only 가정을 confirmed measurement로 제시하지 않는다.
- **주의(superseded)**: 이 기록의 Basic A$29 / Pro 무료 trial 가격 가정은 현행 Starter A$39 / Pro A$59로 대체됐다. 가격은 A workflow recreation과 competitor 비교 후 재검증한다.

## 다음 문서

- [V1-PLAN.md](./V1-PLAN.md) — 현행 workflow-first v1 plan
- [V1-APP-BUILD-PLAN.md](./V1-APP-BUILD-PLAN.md) — AI 전 build order
- [AI-ASSISTANT.md](./AI-ASSISTANT.md) — deferred AI rules
- [../quote/AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md) — quote form 3층 구조 상세
- [../../PLANS.md](../../PLANS.md) — progress source
