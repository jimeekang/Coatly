# Spec: Customer Management

## User Story

> 페인터로서, 고객 정보를 한 곳에서 관리하고 견적/청구 이력을 확인하고 싶다.

## Flow

1. `/customers/new` → 고객 정보 입력
2. `/customers` → 고객 목록 (검색, 정렬)
3. `/customers/[id]` → 고객 상세 + 견적/청구 이력

## Acceptance Criteria

- [ ] 고객 CRUD (이름 필수, 나머지 선택)
- [ ] 고객 보관(archive) — soft delete
- [ ] 고객별 견적/청구서 이력 조회
- [ ] 고객 검색 (이름, 이메일, 회사명)
- [ ] 내부 메모 (notes) — 고객에게 비공개

## Data Fields

| 필드 | 필수 | 용도 |
|------|------|------|
| name | ✅ | 고객 이름 |
| email | 선택 | 견적/청구서 발송 |
| phone | 선택 | 연락처 |
| company_name | 선택 | 법인 고객 |
| address | 선택 | 작업 현장 주소 |
| notes | 선택 | 내부 메모 |
