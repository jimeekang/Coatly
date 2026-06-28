# Coatly — Launch Readiness Snapshot

> 기준일: 2026-06-28. 이 문서는 현재 코드 기준 외부 런칭 가능 여부와 남은 release blockers를 정리합니다.

## Verdict

현재 상태는 **외부 고객 런칭 전 보완 필요**입니다.

코드 품질 게이트는 크게 개선되었습니다. `npm run lint`, `npm run test:run`, `npm run build`, high/critical 보안 감사가 통과했고, 공개 견적 링크 rate limit과 public token 회귀가 보강되었습니다.

다만 외부 런칭은 아직 막혀 있습니다. Supabase P0, Vercel Preview 기본 배포 smoke, 로그인 후 quote/invoice/job preview smoke는 해소됐습니다. 남은 P0는 production 이메일/cron 설정과 실제 painter A의 price book/quote/email 기준 end-to-end smoke입니다.

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

## Release Blockers

| Priority | Blocker                                                   | Required Action                                                                                                                                                                              |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Production email/cron env is not launch-ready             | Production Vercel env still needs customer-safe Resend sender/API config and `CRON_SECRET` verification before external customer use                                                        |
| P1       | Supabase CLI/local migration bookkeeping remains          | MCP connection works and remote schema is corrected, but local Supabase CLI still needs a valid token/link before using CLI migration repair/lint workflows                                  |
| P1       | Real v1 workflow fixture not validated                    | Use painter A's actual price book and recent quote/email to confirm Coatly total, PDF, email, public approval, follow-up, invoice, schedule/job conversion                                   |
| P1       | Resend customer email smoke still needs live verification | Send quote/invoice email using verified sender or sandbox route and confirm delivered payload/link                                                                                           |
| P2       | Design D5 mobile spacing check remains                    | Capture detailed quote/job screens on mobile and fix spacing/overlap if found                                                                                                                |

## Launch Criteria

External launch should wait until all P0 blockers are closed and at least one real A workflow passes without manual database intervention.

Internal demo or controlled pilot is acceptable from the smoked Preview deployment only if the tester understands that production email/cron and the real A workflow fixture are still blocked.
