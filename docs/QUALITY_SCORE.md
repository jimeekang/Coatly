# Coatly — Quality Standards

## Quality Gate Checklist

배포 전 `/quality` 커맨드가 아래 항목을 모두 검증한다.

### TypeScript

| 항목 | 기준 | 검증 명령 |
|------|------|----------|
| Type Safety | `tsc --noEmit` 에러 0개 | `npx tsc --noEmit` |
| No `any` | 모든 파일에서 `any` 타입 금지 | grep 검사 |
| Strict Mode | tsconfig.json strict: true | 설정 확인 |

### Lint

| 항목 | 기준 | 검증 명령 |
|------|------|----------|
| ESLint | 에러 0개 | `npx eslint {files}` |
| Unused imports | 없음 | ESLint 규칙 |

### Testing

| 항목 | 기준 | 검증 명령 |
|------|------|----------|
| 테스트 통과 | 모든 테스트 PASS | `npx vitest run` |
| Server Action 커버리지 | 모든 액션에 테스트 | 파일 매핑 확인 |
| 핵심 컴포넌트 커버리지 | Form, Table에 테스트 | 파일 매핑 확인 |

### Testing Priority Matrix

| 우선도 | 대상 | 이유 |
|--------|------|------|
| 최우선 | Server Action / API route | 데이터 무결성, 인증 |
| 높음 | Supabase query 함수 | RLS, 쿼리 정확성 |
| 중간 | React 컴포넌트 | 사용자 인터랙션 |
| 항상 | 유틸 함수 | 순수 함수 검증 |

### Security (RLS)

| 항목 | 기준 |
|------|------|
| RLS 활성화 | 모든 테이블에 RLS enabled |
| user_id 필터 | 모든 쿼리에 auth.uid() 기반 필터 |
| Admin client 격리 | `lib/supabase/admin.ts`만 service_role 사용 |
| 환경변수 노출 | 하드코딩된 시크릿 없음 |
| Webhook 서명 검증 | Stripe webhook에 signature 확인 |

### Mobile UX

| 항목 | 기준 |
|------|------|
| 터치 타겟 | 모든 인터랙티브 요소 44px+ (h-12 이상) |
| CTA 위치 | 핵심 액션 화면 하단 배치 |
| 숫자 입력 | `inputMode="numeric"` 적용 |
| 금액 포맷 | `formatAUD()` 사용 |
| 로딩 상태 | Skeleton 또는 Spinner 표시 |
| 에러 상태 | 인라인 에러 메시지 표시 |
| 빈 상태 | Empty state + CTA 표시 |

### Performance (Phase 2 목표)

| Metric | 목표 | 측정 |
|--------|------|------|
| LCP | < 2.5s | Lighthouse |
| FID | < 100ms | Lighthouse |
| CLS | < 0.1 | Lighthouse |
| Bundle Size | < 200KB (initial) | `next build` 출력 |

## Quality Report Format

### PASS

```
Quality 리포트: PASS
tsc: PASS / eslint: PASS / 테스트: N개 통과
RLS: 확인 완료
다음 단계: /release "feat: [기능명]"
```

### FAIL

```
Quality 리포트: FAIL
원인: [구체적 문제]
다음 단계: /build [수정 필요한 내용]
```
