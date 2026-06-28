# A Workflow Fixture

> 기준일: 2026-06-28. 실제 A 자료가 들어오면 이 파일에 증거를 append-only로 남깁니다. 개인정보는 익명화합니다.

## Source Inputs

| Item | Value |
| --- | --- |
| Price sheet received date | Not received |
| Recent quote/email received date | Not received |
| Customer details anonymized | Pending |
| Quote type | Pending |
| Existing Excel subtotal ex GST | Pending |
| Existing Excel GST | Pending |
| Existing Excel total inc GST | Pending |

## Coatly Price Setup

| Existing item | Coatly item | Unit | Price | Category | Notes |
| --- | --- | --- | ---: | --- | --- |
| Pending | Pending | Pending | 0 | Pending | Waiting for A fixture |

## Quote Recreation

| Check | Expected | Actual | Pass |
| --- | --- | --- | --- |
| Subtotal | Pending | Pending | No |
| GST | Pending | Pending | No |
| Total | Pending | Pending | No |
| Optional items | Pending | Pending | No |
| PDF customer-ready | Yes | Pending | No |
| Email delivered | Yes | Pending | No |
| Public approval works | Yes | Pending | No |
| Invoice created | Yes | Pending | No |
| Job scheduled | Yes | Pending | No |

## Workflow Evidence

| Step | Evidence | Date | Result |
| --- | --- | --- | --- |
| Price book setup | Pending | Pending | Not run |
| Quote created | Pending | Pending | Not run |
| Quote PDF checked | Pending | Pending | Not run |
| Quote email delivered | Pending | Pending | Not run |
| Public approval completed | Pending | Pending | Not run |
| Invoice created/sent | Pending | Pending | Not run |
| Job/schedule conversion | Pending | Pending | Not run |

## Gaps

| Gap | Severity | Fix owner | Decision |
| --- | --- | --- | --- |
| A price sheet not received | P1 | Product/user | Required before v1 workflow gate can pass |
| A recent sent quote/email not received | P1 | Product/user | Required before v1 workflow gate can pass |

## Rule

Do not mark the A workflow release gate as passed until the table above contains actual totals, actual PDF/email evidence, and actual public approval plus invoice/job conversion evidence.
