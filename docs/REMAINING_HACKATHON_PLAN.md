# IFund — remaining PayPal AI Hackathon implementation and acceptance plan

**Snapshot:** November 11, 2026 (Pacific). **Hard deadline: November 12, 2026, noon Pacific.**
**Primary judge start:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon
**Analytics:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon/analytic
**Code:** https://github.com/interplanetarysister/paypal-ai-crowdfunder
**Submitted entry:** https://devpost.com/software/interplanetary-fund-5pznwy

This document records acceptance criteria, not merely intended features. A code commit/PR is not an implemented deliverable until the Cloudflare build passes, the route renders in an unauthenticated or authorized judge browser, and the specified provider/database evidence exists. If a provider feature cannot pass, preserve the honest limitation rather than simulate it.

## Current confirmed baseline

- Dedicated Worker deployed and public. The `/hackathon` 10-step circled walkthrough, `/hackathon/analytic` redirect, three free AG Charts Community donuts, AG Grid Community public explorer, the fictional Atlas, AI wizard, separate demo auth, sharing, and PayPal Sandbox checkout are implemented.
- Live Cloudflare browser rendered 3 chart canvases and 10 AG Grid rows on desktop/mobile; partner-graph page no longer 404s. 20 automated tests passed, including three Postman API-contract tests, and Cloudflare successfully deployed release `a436290db43ebb43d1ec827496e1ac0f4c1a0046`.
- Supabase audit: 82 published fictional campaigns; 3 sandbox orders, one recorded captured PayPal-method order and one receipt, 2 balanced ledger rows, one capture event with delivery_count=2. Zero card-method orders. Eight succeeded AI runs (five text generation successes on the current large model across kinds and one image success plus earlier model attempts; see DB for exact grouping). All payments remain isolated in `ifund_demo_*`.
- GitHub detects AGPL-3.0 license and repo is public. The previous YouTube link is documented as ~2:01 but its current standalone demo coverage is not independently verified.
- Base44 direct source editing is blocked by the existing Base44 tier; avoid builder credits. It is not a dependency of the independent Worker judge demo.

## P0 — mandatory acceptance before the cutoff

### 1. Real PayPal Sandbox provider walk-through — BLOCKED on fresh buyer evidence
**Implement/test:** With an approved Personal Sandbox buyer distinct from merchant, use the demo checkout for $1 to a fictional campaign. Capture through the Worker (Orders v2), confirm provider order/payee/currency/amount/custom_id, save durable capture, receipt, 2-sided ledger and campaign totals, then reconcile twice. Repeat with separate platform support and confirm it contributes zero to campaign fundraising. Run a cancellation/pending failure path. Never call a real-money endpoint or use a live card.
**Proof:** Provider order and capture IDs; original provider `COMPLETED` proof; linked order/receipt/ledger IDs and balanced sum; verified campaign amount; logged result in super-admin tracker. Record access-proof without storing passwords/PAN.
**Status:** One prior provider-linked captured PayPal-method order, not a fresh documented full buyer run here. More attempts and exact identity/ownership negative test remain. Treat Card Fields separately.

### 2. Webhook delivery and idempotent replay — PARTIAL
**Implement/test:** Verify webhook registration at `/api/paypal/status` from an authenticated demo account. On completed buyer capture, observe signed `PAYMENT.CAPTURE.COMPLETED` delivery. Re-send only that verified event as administrator and prove the event delivery count increases while capture, receipt and ledger counts do **not** increase. Send invalid unsigned payload and confirm HTTP rejection. Track errors; never invent provider headers or sign fabricated financial events.
**Proof:** Event ID, verified webhook status, before/after counts, original and replay delivery timestamps. DB currently has one event with delivery count two, but fresh provider-authenticated replay remains unverified independently.
**Status:** OPEN.

### 3. Prove live Workers AI end-to-end — PARTIAL
**Implement/test:** In one fictional organizer session run five titles, two descriptions, story, single-section regeneration, and artwork; save/publish that campaign, then view it in discovery and Atlas. Keep free-tier quota (only a handful of real calls) and do not retry blindly on 429/5xx.
**Proof:** Actual `ifund_demo_ai_runs` success rows with provider/model/request IDs, frontend selections/draft publication, screenshots showing each stage, no mock outputs. Existing DB has eight succeeded run records, but all stages in one completed new visitor journey are not verified.
**Status:** OPEN.

### 4. Public YouTube functional demonstration — CRITICAL
**Implement:** Verify existing 2:01 Shorts clip's content, public visibility, audio/copyright and that it demonstrates the **current independent** demo, not only the older Base44 app. If mismatched, record a new real browser session showing the integrated guided start, AI generation, AG Charts/AG Grid, interactive Atlas, PayPal Sandbox checkout/verified receipt and separate finances, in **2:30–2:45**. Show only features actually verified and label limitations.
**Proof:** Public YouTube URL; actual duration under 3:00; anonymous playback; recorded app version or capture IDs; updated Devpost submission video link.
**Status:** VIDEO EXISTS; footage parity not verified. Do not mark compliant without seeing it.

### 5. Devpost answer correctness — PARTIAL
**Implement:** Keep the project originally registered as an existing pre-October 1 project; accurately differentiate **new post-October 1** independent Sandbox/AI/financial features from historical Base44 development. Ensure submitted fields reference the **guided /hackathon entry**, separate **public AGPL code repo**, documented AI models, AG Grid and *actual* Postman collection usage, exact testing instructions and $0/no-live-money boundaries. Avoid unsupported 'social auto-posting' or 'verified card acceptance' claims. Confirm the separate website link is not old Base44 where the form permits editing. Preserve user-only eligibility, country, age, team and personal experience answers; do not invent or modify.
**Proof:** Re-read project plus submitted form; submission status `Submitted`, current timestamps, verified open URLs, eligibility attestations unchanged.
**Status:** IMPLEMENTED AND VERIFIED for public website/tech/testing answers. Personal attestation validity and current-release demo video remain separate pending acceptance.

### 6. Anonymous + authenticated judge acceptance and security — PARTIAL
**Implement/test:** Fresh desktop/phone browser: /hackathon, guide ring targets, /hackathon/analytic, /map, /discover, campaign details; create fictional user; verify demo login, Create and dashboard; ensure password hidden and no production auth leakage. Test second account cannot view first account's donor receipt or organizer data. Ensure invalid amount and duplicate order cannot add a capture. Test browser 390 px, keyboard navigation, accessible text fallbacks if CDNs fail.
**Proof:** Route screenshots/video, HTTP results, explicit second-account 403/404, no unverified funds, clean build and passing browser tests.
**Status:** Public charts verified on 1280/390 browsers. Protected judge journey still open.

## P1 — improve trust and sponsor integration (only after P0)

### 7. Real Postman execution — artifact implemented; run evidence pending
**Implement:** Import `postman/IFund_PayPal_AI_Sandbox.postman_collection.json`; use local-only fictional handle/password and Personal Sandbox buyer; run OAuth/webhook status, a real AI titles call, a provider-backed $1 order and no-approval reconciliation, then manually capture only after buyer approval. Run $0 negative test. Export a **redacted** test result summary, never collection credentials.
**Proof:** Postman run report with passing assertions, timestamps/statuses and redacted order IDs. Source-file coverage tests pass in CI. No claims of having tested in Postman GUI without actual run evidence.
**Status:** COLLECTION COMMITTED + 3 CONTRACT TESTS PASSED IN DEPLOYMENT; actual Postman GUI execution/provider response evidence NOT VERIFIED.

### 8. Browser Card Fields/3DS — optional capability, not required by core hackathon
**Implement/test:** Check PayPal Sandbox merchant advanced-card eligibility; only if eligible, test PayPal-hosted card flow with generated Sandbox test data, issuer success/decline, and 3DS outcomes. Confirm method-pinned idempotency, safe capture, receipt and ledger. Keep the Card Fields option absent or transparently unavailable if ineligible.
**Proof:** Provider transaction results and 3DS statuses; zero storage/logging of cardholder data; API/DB counts and rejected transaction evidence.
**Status:** NOT VERIFIED. Zero recorded card-method orders. Do not postpone P0 for this.

### 9. Partner feature polish / live-platform parity — demo essential done, broader parity optional
**Implement/test:** Keep charts, Atlas, AG Grid, public/share links and demo guide integrated. Add concise sponsor labels and screenshots; verify all visually. Live `interplanetaryfund.com` already contains preview-tested Atlas and funding/owner metrics. Do **not** mix demo/production identity, payment, or data.
**Proof:** Cloudflare version, screens, no data crossing, user-accessible captions. Base44 direct editing blocked by plan; no credits spent.
**Status:** MAIN CLOUDFARE APP DEPLOYED; BASE44 SOURCE ACCESS BLOCKED.

## Delivery process and conservation

One free-tier Cloudflare Worker; one isolated Supabase namespace in existing project; one R2 bucket; version-pinned free AG Grid/AG Charts; strict AI budgets; no new paid accounts, Enterprise map licensing, live-card automation, or Base44 builder turns. Batch local unit/contract tests, then push a single release through the existing Cloudflare build and inspect logs. Capture exact SHA and evidence before claiming complete. Do not run repeated payment attempts or consume provider/API quotas merely to populate a decorative high-traffic dashboard.

## Final go/no-go

**COMPLIANT ONLY WHEN:** hosted public demo and source/AGPL are accessible, AI and Sandbox PayPal both demonstrably work, every required Devpost answer is accurate, the YouTube video shows a functioning device build under 3 minutes, and the submission remains `Submitted` before the cutoff.

**Current outcome:** PARTIAL ACCEPTANCE, NOT CERTIFIED COMPLIANT. Public repo/license, hosted demo, Devpost primary website and submitted technical answers have passed. The main remaining risks are fresh judge-account provider approval/replay evidence, footage parity in the existing YouTube video, and authenticated cross-account acceptance.
