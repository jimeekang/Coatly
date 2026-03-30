# Spec: Invoice Workflow

## User Story

> 페인터로서, 견적서를 승인받은 후 청구서를 생성하고, 고객의 결제 상태를 추적하고 싶다.

## Flow

1. 견적 accepted → "Create Invoice" 버튼
2. 또는 `/invoices/new` → 독립 청구서 생성
3. Line item 입력/수정
4. 저장 (draft) → PDF 미리보기 → 발송 (sent)
5. 결제 추적: partial → paid | overdue

## Invoice Types

| Type | Flow |
|------|------|
| Full | 견적 전액 → 1장 |
| Deposit | 착수금 (보통 30-50%) |
| Progress | 중간 작업 완료 시 |
| Final | 잔금 |

## Acceptance Criteria

- [ ] 청구서 번호 자동 채번 (INV-0001, user별 unique)
- [ ] 견적서에서 변환 시 line item 자동 생성
- [ ] 부분 납부 추적 (amount_paid_cents)
- [ ] 기한 초과 시 overdue 상태 자동 변경
- [ ] PDF에 은행 정보 (BSB, Account) 포함
- [ ] GST 10% 자동 계산

## Payment Terms

기본: 14일 (`profiles.default_payment_terms`)
사용자 커스터마이즈 가능
