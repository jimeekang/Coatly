# Coatly — Launch Readiness Snapshot

> Owner: **Shared** — 런칭 판정은 Claude(QA/PM), blocker 해소는 Codex(high).
> 기준일: 2026-07-05. 이 문서는 현재 코드 기준 외부 런칭 가능 여부와 남은 release blockers를 정리합니다.

## Verdict

현재 상태는 **외부 고객 런칭 전 보완 필요**입니다.

코드 품질 게이트는 크게 개선되었습니다. `npm run lint`, `npm run test:run`, `npm run build`, high/critical 보안 감사가 통과했고, 공개 견적 링크 rate limit과 public token 회귀가 보강되었습니다.

다만 외부 런칭은 아직 막혀 있습니다. Vercel Preview 기본 배포 smoke, 로그인 후 quote/invoice/job preview smoke, smoke tooling 단위 검증은 해소됐습니다. 남은 P0는 Supabase live project 복구, production 이메일 발신자 설정, 그리고 실제 painter A의 price book/quote/email 기준 end-to-end smoke입니다.

## Completed In This Pass

| Area                    | Status                    | Evidence                                                                                                                    |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dependency security     | Done                      | unused Genkit removed; Next/Resend patched; `npm audit --omit=dev --audit-level=high` passes                                |
| Public quote rate limit | Remote verified           | `proxy.ts` uses Supabase RPC `check_public_route_rate_limit`; remote migration `20260626233104 / public_route_rate_limits` applied; RPC allow/deny and service-role-only grants verified |
| Public token regression | Improved                  | malformed token, expired/revoked public quote link, public booking expired-link tests added                                 |
| Env cleanup             | Done locally              | `.env.local` duplicate keys removed without exposing values                                                                 |
| Auth env fail-closed    | Done                      | Protected routes redirect to `/login` when Supabase auth env is missing, preventing Preview fail-open behavior              |
| Core verification       | Passed                    | lint, full Vitest, production build passed                                                                                  |
| Supabase drift repair   | Applied                   | remote migration `20260626233327 / quote_estimate_item_task2_categories` aligns live `quote_estimate_items.category` constraint with local Task 2 categories |
| Local smoke             | Passed                    | `/` returns 200; `/dashboard` redirects to `/login`; `/q/not-a-valid-token` returns normal quote error page instead of rate-limit 429 |
| Vercel Preview env      | Done for smoke            | Preview now has Supabase, Stripe test, Resend sandbox/test recipient, cron, ABR, and Google OAuth secret envs; `NEXT_PUBLIC_APP_URL` is intentionally not fixed in Preview |
| Vercel Preview deploy   | Basic smoke passed        | Preview `https://coatly-2ir6cs2rb-kjm12081-3858s-projects.vercel.app` is Ready; `/` 200, `/login` 200, `/dashboard` 307 to `/login`, `/q/not-a-valid-token` 200 Quote not found, invoice PDF invalid token 404, cron without secret 401 |
| Launch smoke tooling    | Preview smoke passed      | `smoke:env`, `smoke:seed`, and `smoke:preview` scripts added with unit coverage; tagged live fixture and authenticated Preview browser smoke passed on 2026-06-28 |
| Production env partial repair | Partially done | `CRON_SECRET` and `RESEND_API_KEY` were added to Vercel Production on 2026-07-05; `RESEND_FROM_ADDRESS` remains missing/customer-safe verification is still open |
| Public flow smoke coverage | Added in code | Smoke fixture now includes an approval/booking quote; `smoke:preview -- --mutate-public-flow` covers public approval and booking in Preview only |

## Release Blockers

| Priority | Blocker                                                   | Required Action                                                                                                                                                                              |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Supabase live project used by local/app env is inactive    | Current local env points at `qwjpqujdykojxsisjltd.supabase.co`; DNS lookup fails and Supabase CLI reports the linked `Costly` project as `INACTIVE`. Restore/reactivate this project or rotate all app envs to the active Supabase project before live smoke can pass |
| P0       | Production email env is not launch-ready                   | Production Vercel now has `RESEND_API_KEY`, but still needs a customer-safe verified `RESEND_FROM_ADDRESS`; production gate must pass before external customer use                         |
| P1       | Supabase CLI/local migration bookkeeping remains          | MCP connection works and remote schema is corrected, but local Supabase CLI still needs a valid token/link before using CLI migration repair/lint workflows                                  |
| P1       | Real v1 workflow fixture not validated                    | Use painter A's actual price book and recent quote/email to confirm Coatly total, PDF, email, public approval, follow-up, invoice, schedule/job conversion                                   |
| P1       | Resend customer email smoke still needs live verification | Send quote/invoice email using verified sender or sandbox route and confirm delivered payload/link; Preview script now supports quote and invoice email smoke with `--send-email`            |
| P1       | Quote follow-up reminder cron 미구현                       | v1 core flow 명시 요구("send → follow-up reminder")이자 핵심 차별점. `invoice-reminders` 패턴 복제로 구현 필요 (AUDIT A9)                                                                    |
| P1       | plans.ts 판매 카피–scope 모순                              | Pro 플랜이 보류된 AI 기능을 판매 feature로 노출 (`config/plans.ts:50-51`) — 신뢰/ACL 리스크, 카피 교체 + AI UI gating (AUDIT A11)                                                            |
| P1       | Stripe webhook 하드닝                                      | `event.id` 멱등 체크 부재, `payment_failed` no-op(매출 누수), webhook 중복 라우트 정리 (AUDIT A10)                                                                                           |
| P2       | Design D5 mobile spacing check remains                    | Capture detailed quote/job screens on mobile and fix spacing/overlap if found                                                                                                                |

## Open Decisions (사용자 결정 대기)

| 결정 | 내용 |
|------|------|
| Smoke 테스트 계정 | live smoke용 전용 계정 생성/승인 |
| Live Supabase 태그 fixture | `[LAUNCH_SMOKE]` 태그 레코드를 live DB에 허용할지 |
| Production Resend sender | 검증 도메인 발신 주소 확정 (`RESEND_FROM_ADDRESS`) |
| Painter A 자료 | 실제 Excel 가격표 + 최근 quote PDF/email 1건 제공 시점 |

## Launch Criteria

External launch should wait until all P0 blockers are closed and at least one real A workflow passes without manual database intervention.

Internal demo or controlled pilot is acceptable from the smoked Preview deployment only if the tester understands that production email/cron and the real A workflow fixture are still blocked.
