# Core Design Beliefs

Coatly의 모든 설계 결정을 지배하는 핵심 원칙.

## 1. Cents, Not Dollars

모든 금액은 **정수(cents)** 로 저장한다. 부동소수점 오류를 원천 차단.

```ts
// ✅ 올바른 방법
subtotal_cents: 150000  // = $1,500.00
gst_cents: 15000        // = $150.00
total_cents: 165000     // = $1,650.00

// ❌ 금지
total: 1500.00  // 부동소수점 오류 가능
```

GST 계산: `Math.round(subtotal_cents * 0.1)`

## 2. RLS Is Law

Row Level Security는 선택이 아닌 필수. 애플리케이션 코드가 아닌 DB 레벨에서 멀티테넌트 격리를 강제한다.

- 모든 최상위 테이블: `user_id = auth.uid()`
- 자식 테이블: 부모 체인으로 소유권 확인
- Admin client: webhook과 번호생성에서만 사용

## 3. Server-First

데이터 fetch는 항상 Server Component에서. Client Component는 인터랙션 전용.

- Server Component → Supabase 쿼리 (RLS 자동 적용)
- Client Component → form 상태, 이벤트 핸들러
- Server Action → 데이터 변경 (insert, update, delete)

## 4. Mobile Is Default

"반응형"이 아니라 "모바일 퍼스트". 데스크톱은 보너스.

- 터치 타겟 44px+
- 핵심 CTA 화면 하단
- 숫자 입력 키패드 자동 전환
- 네트워크 불안정 대응 (loading/error 상태)

## 5. Serverless Constraints

Vercel serverless 환경의 제약을 수용한다.

- PDF: React-PDF만 (Puppeteer 금지 — 메모리/시간 초과)
- 이미지: Supabase Storage signed URL
- 장기 실행 작업: edge function 또는 분할 처리

## 6. Type Safety Over Speed

`any` 타입은 절대 사용하지 않는다. 타입 에러는 즉시 수정한다.

- `types/database.ts`: Supabase CLI 자동 생성
- 도메인 타입: DB 타입과 분리, UI 로직 포함
- Zod validator: 입력 검증을 런타임에서도 보장
