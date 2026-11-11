# Hackathon release evidence — November 11, 2026

**Status: live interactive prototype; partial provider acceptance; not yet certified end-to-end judge-ready.**

## Actual deployment and source

- **First page of guided demo:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon
- **Partner charts and AG Grid:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon/analytic (alias of `/hackathon/analytics`)
- **Atlas:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/map
- **Public code:** https://github.com/interplanetarysister/paypal-ai-crowdfunder — GitHub API reports `private=false`, recognized `AGPL-3.0` license.
- **Devpost submitted project:** https://devpost.com/software/interplanetary-fund-5pznwy
- **Prior live release commit:** `2a55c33ca83502a20b033aed2a86a31ca9fa2993`. New changes must pass the Cloudflare production build and release checks before this document can claim a newer deployed SHA.
- Cloudflare bindings inspected without exposing values: `DEMO_ENABLED=true`, `AI_ENABLED=true`, dedicated Sandbox PayPal Secrets Store, PayPal webhook ID, isolated DB signer, Workers AI and R2.
- Live Cloudflare browser on the prior release confirmed `/hackathon/analytic` renders three AG Charts canvases, ten AG Grid table rows and no chart errors on desktop (1280px) and mobile (390px). The nine-to-ten-step cyan highlighted judge tour was separately browser-verified at its entry step.
- Previous release completed **17/17 automated tests**, including real local PGlite isolation tests with mocked PayPal and AI. The later Postman-contract tests must pass a **new** deployment to be counted.

## Isolated Supabase audit (read only, November 11)

| Evidence | Observed |
| --- | ---: |
| Published fictional campaigns | 82 |
| PayPal Sandbox orders | 3 |
| Provider-method captured orders | 1 |
| Persisted captures | 1 |
| Receipts | 1 |
| Ledger rows | 2 |
| Ledger sum of signed cents | 0 |
| Orders using Card Fields checkout method | 0 |
| Workers AI run attempts | 14 |
| Workers AI successes | 8 |
| Workers AI failures | 6 |
| `PAYMENT.CAPTURE.COMPLETED` event records | 1 |
| Maximum recorded delivery_count for that event | 2 |

The AI audit shows successful title, description, story, single-section and image outputs across model versions. The currently deployed text adapter uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and artwork uses `@cf/black-forest-labs/flux-1-schnell`.

These database rows are meaningful existing integration evidence, **not** proof that every current visitor path was independently reproduced in a fresh PayPal Sandbox buyer browser. In particular, one recorded webhook event with delivery count two is not itself conclusive proof of fresh provider-authenticated replay acceptance. Pending/unapproved orders never count toward raised funds.

## Gate status by feature

| Item | Status | Specific evidence / gap |
| --- | --- | --- |
| Independent dedicated Worker public | PASS | Official workers.dev origin deployed with guided route and partner graphs. |
| Public Github + recognized OSS license | PASS | GitHub reports a public repo and `AGPL-3.0`. |
| Fictional, interactive Atlas and discovery | PASS public rendering | 82 published fictional campaigns; synthetic map markers and accessible fallback. |
| AG Charts Community and AG Grid Community | PASS public rendering | Three real chart canvases and AG Grid rows rendered on desktop/mobile; free Community editions. |
| Separate demo logins and persisted campaigns | IMPLEMENTED; new-session QA OPEN | Salted demo session implementation, owner/write checks and automated tests. |
| Real-model Workers AI | PARTIAL PROVIDER EVIDENCE | 8 stored successes from 14 runs; fresh all-stages user journey pending. |
| Sandbox PayPal Orders v2 and merchant verification | PARTIAL PROVIDER EVIDENCE | One captured PayPal-method order, receipt and balanced ledger; fresh buyer/approval QA pending. |
| Genuine signed webhook + redelivery | PARTIAL DB EVIDENCE | One completed-capture event, delivery count 2; fresh PayPal-authenticated replay not independently verified. |
| Card Fields & 3DS | IMPLEMENTED, PROVIDER ACCEPTANCE NOT VERIFIED | No card-method orders; only if eligible merchant. |
| Owner/admin authorization negative tests | AUTOMATED ONLY | Full browser account-isolation test still required. |
| Postman sponsor collection | IMPLEMENTED; actual Postman run NOT VERIFIED | `postman/IFund_PayPal_AI_Sandbox.postman_collection.json`, including protected tests and no hardcoded secrets. |
| Public video showing THIS release | NOT VERIFIED | Prior YouTube Shorts 2:01 documented; its current demo footage unverified. |
| Devpost complete, corrected fields and links | PARTIAL | Previously submitted; the separate legacy project website field may still point at Base44. Confirm custom working-demo answer independently. |
| Eligibility and personal attestations | OWNER ATTESTATION | Neither source code nor AI can certify personal eligibility. |

## Important boundaries

The demo writes only `ifund_demo_*` objects, uses fictional user identities and PayPal Sandbox, and does not turn on real payouts, subscriptions or production financial ledger writes. Real `interplanetaryfund.com` analytics and Atlas are a separate Cloudflare Pages release; Base44 direct source access is gated behind the user's current workspace plan and was not used.

**Plan and acceptance actions:** [REMAINING_HACKATHON_PLAN.md](REMAINING_HACKATHON_PLAN.md).  
**Judge testing:** [JUDGE_TESTING.md](JUDGE_TESTING.md).  
**Video acceptance:** [VIDEO.md](VIDEO.md).  
**Postman collection:** [../postman/IFund_PayPal_AI_Sandbox.postman_collection.json](../postman/IFund_PayPal_AI_Sandbox.postman_collection.json).

**Official deadline:** November 12, 2026 at 12:00 p.m. Pacific; judges start December 1. Do not infer certification from a successful Cloudflare deploy or static screenshots.
