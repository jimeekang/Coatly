# Features Documentation Index

기능별 설계 문서. 각 기능은 단일 md 파일로 통합 — 데이터 모델, UX, 빌드 순서, AC가 한 자리에.

## Quote

| 파일 | 내용 |
|------|------|
| [quote.md](./quote/quote.md) | 견적 빌더 통합 — 데이터 모델, Interior/Quick 두 모드, Detailed Estimate Quick/Advanced 통합 계획, Rate Settings 설계+구현, Close the Loop (send/accept/invoice), 워크플로우 버그 로그 |

## Invoice

| 파일 | 내용 |
|------|------|
| [invoice.md](./invoice/invoice.md) | 청구서 시스템 — 데이터 모델, 유형, 상태 워크플로우, 부분 납부, AC |

## Auth & Onboarding

| 파일 | 내용 |
|------|------|
| [auth.md](./auth/auth.md) | 인증 플로우, 온보딩 단계, ABN autofill, 미들웨어 라우팅 |

## Billing & Subscription

| 파일 | 내용 |
|------|------|
| [billing.md](./billing/billing.md) | 구독 플랜, Stripe 연동 + webhook 패턴, 취소/갱신 |

## Customer

| 파일 | 내용 |
|------|------|
| [customer.md](./customer/customer.md) | 고객 관리 — CRUD, 아카이브, 이력 조회, 검색 |

## PDF Generation

| 파일 | 내용 |
|------|------|
| [pdf.md](./pdf/pdf.md) | React-PDF 선택 이유, API 라우트, 템플릿 구조, 브랜딩, 구현 패턴 |

## AI Assistant

| 파일 | 내용 |
|------|------|
| [ai-assistant.md](./ai/ai-assistant.md) | AI 드래프트 패널, 워크스페이스 어시스턴트 (Phase 2 예정) |

> ⚠️ AI 데이터 거버넌스 활성 audit: [`audit/audit.md` § 1.1-C](./audit/audit.md)

## Schedule & Google Calendar

| 파일 | 내용 |
|------|------|
| [schedule.md](./schedule/schedule.md) | 목표·Option B 결정, 데이터 모델, OAuth API, Phase A–F 구현 단계, 테스트·리스크·MVP |

## Design System

| 파일 | 내용 |
|------|------|
| [design-system.md](./design-system/design-system.md) | Core beliefs (cents, RLS, server-first, mobile-first, serverless, type safety) + UI 일관성 감사 + 통합 계획 |

## Audit & Tech Debt

| 파일 | 내용 |
|------|------|
| [audit.md](./audit/audit.md) | 활성 audit findings (신뢰성 4대 취약점, exterior/interior 견적 audit), 해결 이력, tech debt 트래커, 운영 검증 체크리스트, KPI |
