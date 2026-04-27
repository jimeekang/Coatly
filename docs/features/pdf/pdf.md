# Feature: PDF Generation

## Overview

견적서/청구서를 React-PDF로 서버사이드 렌더링하여 PDF 바이너리를 반환.

## 기술 선택: React-PDF

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| React-PDF (@react-pdf/renderer) | Vercel 호환, 가벼움, JSX | 복잡한 레이아웃 한계 | ✅ |
| Puppeteer | HTML→PDF, 디자인 자유도 | Vercel 메모리 초과, cold start | ❌ |
| wkhtmltopdf | 검증됨 | 바이너리 의존, serverless 비호환 | ❌ |

**선택 이유:** Vercel serverless 환경(메모리 1024MB, 시간 10s)에서 안정적으로 동작해야 함.

## API Routes

```
GET /api/pdf/quote?id={uuid}    → 견적서 PDF
GET /api/pdf/invoice?id={uuid}  → 청구서 PDF
```

### 처리 흐름

```
1. Auth 확인 (createServerClient → getUser)
2. 견적/청구 데이터 조회 (RLS로 소유권 자동 확인)
3. 비즈니스 프로필 조회 (로고, ABN, 연락처)
4. React-PDF 템플릿 렌더링
5. Content-Type: application/pdf 반환
```

## PDF 템플릿 구조

```
lib/pdf/
  quote-template.tsx     → 견적서 PDF 레이아웃
  invoice-template.tsx   → 청구서 PDF 레이아웃
```

### 공통 요소

- 헤더: 비즈니스 로고 + 상호명 + ABN + 연락처
- 고객 정보: 이름, 주소
- 항목 테이블: 설명, 수량, 단가, 금액
- 합계: Subtotal, GST (10%), Total
- 푸터: 결제 조건, 은행 정보 (청구서만)

### 견적서 추가 요소

- 유효 기간 (valid_until)
- 방별 면적 breakdown
- Good/Better/Best 티어 가격 비교 (선택)

## 브랜딩

비즈니스 프로필에서 자동 로드:
- `logo_url` → Supabase Storage signed URL → PDF에 이미지 삽입
- `business_name`, `abn`, `phone`, `email`
- `address_line1/2`, `city`, `state`, `postcode`

## 설계 결정

### 왜 서버사이드 렌더링?

- 클라이언트 렌더링 시 PDF 라이브러리 번들 크기 증가
- 서버에서 생성하면 클라이언트 성능 영향 없음
- RLS로 데이터 접근 제어 가능

### 로고 이미지 처리

Supabase Storage의 signed URL을 fetch하여 buffer로 변환 후 React-PDF Image에 전달.
Public URL이 아닌 signed URL 사용으로 비공개 버킷에서도 동작.
