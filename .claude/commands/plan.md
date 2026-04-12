---
description: 새 기능 요청을 분석하고 subtask로 분해한 뒤 어떤 커맨드를 실행할지 알려줌
argument-hint: [기능 설명]
allowed-tools: Read
---

구현 요청: $ARGUMENTS

아래 순서로 진행:

1. CLAUDE.md를 읽고 Out of Scope 확인, docs/PLANS.md에서 Current Phase + 우선순위 확인
2. 요청이 Out of Scope면 거절하고 이유 설명
3. 요청을 독립적인 subtask로 분해
4. 각 subtask마다 어떤 커맨드를 실행해야 하는지 출력

## 현재 Phase 상태 (2026-04-12 기준)

**Phase 0 + 1: 완료**
- Auth, Stripe, Quote Builder/PDF, Invoice System/PDF, Customer CRM
- Interior Estimate Builder, Quick Quote, Rate Settings
- Jobs, Schedule, Materials & Services
- Quote Templates (Starter 5개/Pro 무제한), Client Portal (`/q/[token]`)
- Email (quote 발송, invoice 발송, 리마인더 cron), WorkspaceAssistant (Pro, Gemini)
- KPI 카드 (당월 매출, 견적 승인율, 미수금)

**Phase 2: 진행 중 — 우선순위**

| 순위 | 기능 | 상태 | 비고 |
|------|------|------|------|
| P1 | Dashboard analytics (월별 차트) | ❌ 미구현 | KPI 카드는 있음 |
| P1 | AI Quote Drafting UX | ❌ UX 미노출 | `lib/ai/drafts.ts` 인프라 완비 |
| P2 | Smart pricing suggestions | ❌ 미구현 | |
| P2 | Job costing | ❌ 미구현 | |
| P3 | Xero/MYOB sync | ❌ 미구현 | 복잡도 높음 |

새 요청이 위 P1/P2 항목 중 하나라면 즉시 진행 가능. P3는 신중히 검토.

---

출력 형식:
## 작업 분석
- Phase 적합 여부:
- Out of scope 여부:
- 우선순위 위치 (P1/P2/P3 또는 신규):

## Subtasks
1. [subtask 내용] → /build [...]
2. [subtask 내용] → /build [...]

## 시작 커맨드
/build [첫 번째 subtask]