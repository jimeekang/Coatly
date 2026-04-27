# Features Documentation Index

기능별 설계 문서 및 스펙 모음.

## Quote

| 파일 | 내용 |
|------|------|
| [quote.md](./quote/quote.md) | 견적 빌더 전체 — 데이터 모델, 두 가지 견적 모드, 계산 로직, AC |
| [rate-settings-design.md](./quote/rate-settings-design.md) | Rate Settings 설계 — UX, 용어, 정보 구조 |
| [rate-settings-impl.md](./quote/rate-settings-impl.md) | Rate Settings 구현 — 데이터 모델, 계산 규칙, 단계별 구현 계획 |
| [close-the-loop-1.md](./quote/close-the-loop-1.md) | Close the Loop (1/2) — 문제 정의, 접근 방식, Priority 1-2 (이메일 발송, 고객 승인) |
| [close-the-loop-2.md](./quote/close-the-loop-2.md) | Close the Loop (2/2) — Priority 3-4 (읽음 확인, Quote→Invoice), 성공 기준 |
| [workflow-notes.md](./quote/workflow-notes.md) | Customer→Quote→Invoice 워크플로우 버그 수정 기록 (2026-04-22) |

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
| [billing.md](./billing/billing.md) | 구독 플랜, Stripe 연동 플로우, 웹훅 이벤트, 취소/갱신 |

## Customer

| 파일 | 내용 |
|------|------|
| [customer.md](./customer/customer.md) | 고객 관리 — CRUD, 아카이브, 이력 조회, 검색 |

## PDF Generation

| 파일 | 내용 |
|------|------|
| [pdf.md](./pdf/pdf.md) | React-PDF 선택 이유, API 라우트, 템플릿 구조, 브랜딩 |

## AI Assistant

| 파일 | 내용 |
|------|------|
| [ai-assistant.md](./ai/ai-assistant.md) | AI 드래프트 패널, 워크스페이스 어시스턴트 (Phase 2 예정) |

## Schedule & Google Calendar

| 파일 | 내용 |
|------|------|
| [calendar-overview.md](./schedule/calendar-overview.md) | 목표, Option B 선택 이유, 데이터 모델, 성공 기준 |
| [calendar-phases.md](./schedule/calendar-phases.md) | API 설계, 구현 단계 Phase A~F |
| [calendar-impl.md](./schedule/calendar-impl.md) | 테스트 계획, 리스크 대응, MVP 범위, 최종 판단 |

## Design System

| 파일 | 내용 |
|------|------|
| [core-beliefs.md](./design-system/core-beliefs.md) | 핵심 설계 원칙 6가지 (cents, RLS, server-first, mobile-first, serverless, type safety) |
| [ui-audit.md](./design-system/ui-audit.md) | UI/UX 일관성 감사 — 토큰 이원화, 컴포넌트 중복, 타이포그래피, 모바일 UX |

## Audit & Tech Debt

| 파일 | 내용 |
|------|------|
| [critical-1.md](./audit/critical-1.md) | 결정적 오류 감사 (1/3) — 요약, P0 빌드 실패, P1-1/2 |
| [critical-2.md](./audit/critical-2.md) | 결정적 오류 감사 (2/3) — P1-3/4, P2, 문서 불일치 |
| [critical-3.md](./audit/critical-3.md) | 결정적 오류 감사 (3/3) — Recovery stages, 검증 체크리스트, 완료 상태 |
| [tech-debt.md](./audit/tech-debt.md) | 기술 부채 트래커 |
