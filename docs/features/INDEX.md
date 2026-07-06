# Features Documentation Index

> Owner: **Shared** — features/ 문서 클러스터 라우팅 인덱스.
> 기능별 설계 문서. 각 기능은 단일 md 파일로 통합 — 데이터 모델, UX, 빌드 순서, AC가 한 자리에. 모든 파일은 300줄 이하 + 상단 Owner 헤더 필수.

## v1 Workflow Replacement + Deferred AI

| 파일 | Owner | 내용 |
|------|-------|------|
| [V1-PLAN.md](./ai/V1-PLAN.md) | Claude | **current v1 plan** — 기존 Excel 가격표 참고 → 앱 내 simple price book setup → quote → PDF/email → follow-up → invoice/schedule workflow replacement. AI-first plan은 superseded |
| [V1-APP-BUILD-PLAN.md](./ai/V1-APP-BUILD-PLAN.md) | Claude | **core workflow build order before AI** — build phase 순서, release gate, post-core AI 재개 조건 |
| [PHASE0-CHECKLIST.md](./ai/PHASE0-CHECKLIST.md) | Claude | Historical — 2026-05 AI-first Phase 0 검증 원자료(P1–P5 인터뷰, legacy quote 분석)만 보존. pricing 가정은 superseded |
| [AI-ASSISTANT.md](./ai/AI-ASSISTANT.md) | Claude | **deferred AI rules** — core workflow release 전 AI/photo/Qwen/usage 작업 금지, post-core admin layer 허용 범위, 영구 AI pricing boundary |

> ⚠️ AI/photo analysis is deferred until the core workflow release gate in [PLANS.md](../PLANS.md) passes.
> 완료된 구현 브리프 V1-TASK1~6은 삭제됨(2026-07-05, git 히스토리 보존) — 살아있는 계약은 [QUOTE.md](./quote/QUOTE.md)·[AI-QUOTE-FORM-STRUCTURE.md](./quote/AI-QUOTE-FORM-STRUCTURE.md)로 이관.

## Quote

| 파일 | Owner | 내용 |
|------|-------|------|
| [QUOTE.md](./quote/QUOTE.md) | Shared | 견적 빌더 — 데이터 모델, 5 modes, status workflow, pricing 계약(Canonical Money Contract, Quick/Advanced boundary, Room Price Library), PDF 콘텐츠 표준, public approval, AC, active risks |
| [PRICE-BOOK-TEMPLATE.md](./quote/PRICE-BOOK-TEMPLATE.md) | Claude | Coatly simple price book setup — 앱 내 직접 추가 우선, Excel/CSV 템플릿은 선택적 bulk input, arbitrary Excel import 금지 |
| [AI-QUOTE-FORM-STRUCTURE.md](./quote/AI-QUOTE-FORM-STRUCTURE.md) | Claude | quote form structure 설계 정본 — scope/pricing/clause 3층 데이터모델, taxonomy. AI 확장 부분은 post-core deferred |

## Invoice

| 파일 | Owner | 내용 |
|------|-------|------|
| [INVOICE.md](./invoice/INVOICE.md) | Shared | 청구서 시스템 — 데이터 모델, 4 invoice types, 상태 워크플로우, 부분 납부, public PDF token, reminder cron, UI 스펙(KPI band, 상태색 매핑) |

## Customer

| 파일 | Owner | 내용 |
|------|-------|------|
| [CUSTOMER.md](./customer/CUSTOMER.md) | Claude | 고객 관리 — CRUD, 아카이브, 견적/청구 이력 |

## Auth & Onboarding

| 파일 | Owner | 내용 |
|------|-------|------|
| [AUTH.md](./auth/AUTH.md) | Shared | 인증 플로우, 온보딩 단계, ABN autofill, 미들웨어 라우팅, 비밀번호 재설정 |

## Billing & Subscription

| 파일 | Owner | 내용 |
|------|-------|------|
| [BILLING.md](./billing/BILLING.md) | Shared | Starter A$39 / Pro A$59 현재 billing 기준, webhook/gating 구현 서술, AI-first Basic A$29 가정은 superseded |

## PDF Generation

| 파일 | Owner | 내용 |
|------|-------|------|
| [PDF.md](./pdf/PDF.md) | Codex | React-PDF 선택 이유(Vercel serverless), API 라우트, 템플릿 구조, 브랜딩 |

## Schedule & Google Calendar

| 파일 | Owner | 내용 |
|------|-------|------|
| [SCHEDULE.md](./schedule/SCHEDULE.md) | Shared | Schedule + Google Calendar 통합 현재 상태, Google write 실패 정책, multi-day jobs |

## Audit & Tech Debt

| 파일 | Owner | 내용 |
|------|-------|------|
| [AUDIT.md](./audit/AUDIT.md) | Claude(분석) → Codex(실행) | 활성 findings A1–A16(2026-07-05 전체 분석 반영), 해결 이력, tech debt 트래커, 운영 체크리스트, KPI |

## Design

디자인 단일 정본은 [docs/DESIGN.md](../DESIGN.md) (Claude 소유). `design-system/DESIGN-SYSTEM.md`·`DESIGN_CONSISTENCY_AUDIT.md`·`INVOICE-UI-REDESIGN-SPEC.md`는 2026-07-05 정리로 삭제·통합됨.
