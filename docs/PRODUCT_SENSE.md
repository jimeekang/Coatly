# Coatly — Product Sense

## Problem Statement

호주 소규모 페인터(1~3인)는 견적서를 수기 또는 엑셀로 작성한다.
이로 인해:
- 견적 작성에 30분+ 소요
- 비전문적인 견적서로 고객 신뢰 저하
- 청구서 관리 혼란, 미수금 추적 어려움
- 사업 성장에 필요한 데이터(매출, 전환율) 부재

## Value Proposition

**Coatly = 페인터를 위한 견적·청구 올인원**

| 가치 | 설명 |
|------|------|
| 5분 견적 작성 | 방별 면적 입력 → 자동 가격 계산 → PDF 즉시 생성 |
| 전문적 이미지 | 로고, ABN, 연락처가 포함된 브랜딩 PDF |
| 결제 추적 | 청구서 상태 관리, 미수금 알림 |
| 모바일 현장 사용 | 현장에서 장갑 끼고도 사용 가능한 모바일 UX |

## Target User

| 속성 | 값 |
|------|-----|
| 직업 | Residential & Commercial Painter |
| 위치 | 호주 (AUD, GST 10%, ABN) |
| 업체 규모 | 1~3인 |
| 기술 수준 | 스마트폰은 능숙, 소프트웨어는 미숙 |
| 핵심 니즈 | 빠른 견적, 전문적 PDF, 결제 관리 |
| 기존 도구 | 종이, 엑셀, 가끔 Word |

## Pricing Strategy

| Plan | 가격 | 대상 | 핵심 기능 |
|------|------|------|-----------|
| Starter | A$39/mo (A$450/yr) | 파트타임, 소규모 | 월 10건 견적, 기본 기능 |
| Pro | A$59/mo (A$680/yr) | 전업, 성장 중 | 무제한 견적, AI, 브랜딩, Xero |

**업셀 전략:** Starter에서 월 견적 한도 도달 시 Pro 업그레이드 프롬프트 표시

## Competitive Landscape

| 경쟁사 | 가격 | 강점 | 약점 (Coatly 기회) |
|--------|------|------|-------------------|
| Tradify | A$49+ | 종합 트레이드 관리 | 페인터 특화 X, 복잡 |
| ServiceM8 | A$29+ | Job 관리 | 견적 빌더 약함 |
| Buildxact | A$149+ | 건설 견적 | 가격 높음, 페인터 특화 X |
| Excel/종이 | 무료 | 친숙 | 비전문적, 비효율 |

**Coatly 포지셔닝:** 페인터 전용 + 가격 경쟁력 + 모바일 우선

## Key Metrics (Phase 2+)

| Metric | 설명 | 목표 |
|--------|------|------|
| Activation Rate | 가입 → 첫 견적 생성 | > 60% |
| Quote-to-Invoice | 견적 → 청구 전환율 | > 40% |
| Monthly Active | 월간 활성 사용자 | Growth |
| Churn Rate | 월간 이탈률 | < 5% |
| ARPU | 사용자당 평균 매출 | A$45+ |

## Australian Compliance

| 항목 | 구현 |
|------|------|
| GST (10%) | 모든 금액에 자동 계산, 별도 표시 |
| ABN | 프로필에 필수, ABR API로 자동 검증 |
| Tax Invoice 요건 | 사업자명, ABN, 날짜, 항목, GST 별도 표시 |
| Privacy | 데이터 호주 리전 저장 (Supabase AU) |
