# 앱 결정적 오류 감사 (Part 2) — P1-3/4 & P2 & 문서 불일치

*← [critical-1.md](./critical-1.md) | → [critical-3.md](./critical-3.md)*

## P1-3. Stripe webhook route 중복

**심각도:** P1 / 운영 혼동 및 webhook 설정 리스크

동일 handler가 두 route에 존재한다:
- `app/api/webhooks/stripe/route.ts`
- `app/api/stripe/webhook/route.ts`

README와 design doc은 `/api/webhooks/stripe`를 주 경로로 안내한다.

**수정 제안:**
1. 공식 endpoint를 `/api/webhooks/stripe`로 고정한다.
2. `/api/stripe/webhook`는 삭제하거나 `308` redirect로 전환한다.
3. README, `docs/features/billing/billing.md`, `.env.example`을 공식 경로로 통일한다.

## P1-4. `get_user_active_quote_count` DB 함수가 구 status 값을 사용

**심각도:** P1 / 구독 한도 정합성 리스크  
**영향 영역:** Starter quote limit, subscription gating

마이그레이션 `003_functions.sql`의 `get_user_active_quote_count`는 `status in ('draft', 'sent', 'accepted')`를 센다.

하지만 migration `017_rename_status_accepted_to_approved.sql` 이후 앱의 현재 상태값은 `draft, sent, approved, rejected, expired`.

**수정 제안:**
- 새 migration에서 status 목록을 `('draft', 'sent', 'approved')`로 수정한다.
- function comment도 `accepted`에서 `approved`로 변경한다.

## 4. P2 보안, 안정성, 운영 리스크

### P2-1. Public quote rate limit이 in-memory라 serverless 환경에서 약함

**위치:** `proxy.ts`

`/q/[token]` public quote page에 rate limit이 있지만 `Map` 기반 in-memory store다. Vercel serverless 환경에서는 instance별로 store가 분리되므로 엄격한 rate limit이 아니다.

**수정 제안:**
- Upstash Redis 또는 Vercel KV 기반 sliding window rate limit으로 교체한다.
- token별 + IP별 제한을 함께 둔다.

### P2-2. Invoice reminder cron은 idempotency와 observability가 부족함

**위치:** `app/api/cron/invoice-reminders/route.ts`

발송 요청과 DB 업데이트 사이에서 실패하면 재시도 시 중복 메일이 갈 수 있다. 어떤 invoice가 왜 실패했는지 장기 추적할 별도 로그 테이블이 없다.

**수정 제안:**
- `invoice_reminder_events` 로그 테이블을 추가한다.
- invoice id + reminder type 기준 unique key를 둔다.
- 발송 전 pending event 생성, 성공/실패 상태 업데이트 방식으로 전환한다.

### P2-3. Google Calendar sync 실패 UX와 복구 플로우

**수정 제안:**
- Settings에 마지막 sync 성공/실패 시각과 실패 메시지를 표시한다.
- Job detail에 Google event sync status를 표시한다.
- refresh token 만료 또는 권한 철회 시 재연결 CTA를 명확히 보여준다.

## 5. 문서 및 소스 오브 트루스 불일치

### D1. Next.js 버전 문서 불일치

- `package.json`: Next.js `16.2.0`, React `19.2.4`
- `CLAUDE.md`: Next.js 15 (구버전)
- **수정:** 공식 스택 표기를 Next.js 16 / React 19로 갱신

### D2. Architecture migration 범위가 오래됨

- `ARCHITECTURE.md`: migrations `001-015`
- 실제 repo: `001-035+`
- **수정:** architecture folder tree의 migration 범위를 `001-035+`로 바꾸기

### D3. Quote status 용어가 문서마다 다름

- 현재 앱 타입: `draft | sent | approved | rejected | expired`
- 일부 문서: `accepted | declined` (구버전)
- **수정:** 사용자-facing 용어는 `approved/rejected`로 통일

### D4. Roadmap 상태가 실제 구현과 충돌

- `docs/PLANS.md`에서 Phase 2에 `Job costing`이 미완료로 남아 있음
- Phase 3 영역에는 완료로 표시되어 있음
- **수정:** 완료/미완료 기준을 "UI 존재"가 아니라 "사용자 workflow 완결 + 테스트 + 빌드 통과"로 정의
