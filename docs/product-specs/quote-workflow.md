# Spec: Quote Workflow

> 기술 구현 상세(데이터 모델, 계산 로직) → [`design-docs/quote-builder.md`](../design-docs/quote-builder.md)

## User Story

> 페인터로서, 현장에서 방별로 면적을 입력하면 자동으로 가격이 계산되고, 전문적인 PDF 견적서를 고객에게 보내고 싶다.

## Flow

1. `/quotes/new` → 고객 선택 + 작업 제목 입력
2. 방 추가 → 면적/면 종류/코팅 방식 입력
3. 자동 가격 계산 (단가 × 면적 + 마진)
4. Good/Better/Best 티어 비교
5. 저장 (draft) → PDF 미리보기 → 발송 (sent)
6. 고객 응답: accepted | declined | expired

## Acceptance Criteria

- [ ] 견적 번호 자동 채번 (QUO-0001, user별 unique)
- [ ] 방별 면적 자동 계산 (2 × (L+W) × H for 벽)
- [ ] GST 10% 자동 계산
- [ ] 금액은 AUD 포맷 ($1,234.56)
- [ ] PDF에 비즈니스 브랜딩 (로고, ABN, 연락처) 포함
- [ ] Starter 플랜 월 10건 제한
- [ ] 유효기간(valid_until) 기본 30일

## Constraints

- 숫자 입력: `inputMode="numeric"` 필수
- 터치 타겟: 44px+ 필수
- 견적 수정은 draft 상태에서만 가능
