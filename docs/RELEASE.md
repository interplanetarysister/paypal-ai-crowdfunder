# Verified release evidence — November 12, 2026

Judge entry: <https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon>
Public source: <https://github.com/interplanetarysister/paypal-ai-crowdfunder>

This report supersedes the November 11 partial snapshots preserved in Git history. It distinguishes real provider acceptance from mocked automated tests. It does not certify personal eligibility or footage in the existing submitted video.

## Real PayPal Sandbox acceptance

The saved Personal Sandbox buyer was used in the actual PayPal approval UI, distinct from the merchant. No buyer credentials are published. The Worker captured and verified provider responses, then persisted the canonical records before webhook arrival.

| Purpose                            | Order             | Capture           |   USD |
| ---------------------------------- | ----------------- | ----------------- | ----: |
| Fictional campaign                 | 01L39374A0446100G | 58F169371D0129007 |  1.00 |
| Fictional campaign                 | 3KP56177UN3553132 | 5HV42410W7273681D | 25.00 |
| Organizer-owned fictional campaign | 82V95075KB818703W | 7M649558TX4441734 |  1.00 |
| Platform support                   | 1AG37716849538918 | 3HK02038XB0342029 |  1.00 |

Fresh SQL reconciliation on November 12 confirmed **4 COMPLETED captures, 4 receipts, 8 ledger rows, zero signed-cent balance**. Every capture has exactly two balanced ledger entries and one receipt; all four orders are `captured/provider_verified`. Campaign totals are **$27.00**, platform support **$1.00**. Support has a null campaign relationship. No inconsistent receipt or support relationship was found. Pending/unapproved orders are excluded.

The root demo donor sees campaign $2.00 and support $1.00; its organizer view sees its campaign $1.00 and support $0.00; the administrator sees campaign $27.00 and support $1.00. Totals come from the canonical financial RPC, never synthetic successful-payment seeds.

PayPal event **WH-01C303736S267744J-5JS42606R8901483R** was verified on receipt, then redelivered by the real PayPal API. `delivery_count` increased to **2**, with verified timestamps **2026-11-12T12:23:09Z** and **12:26:09Z**. Counts stayed at 4 captures / 4 receipts / 8 ledger entries. Repeated capture and reconciliation returned the original capture **3HK02038XB0342029** and receipt **2c55464e-50df-4760-b623-4117fec5e2d7**. Unsigned webhook requests were rejected HTTP400.

Sanitized evidence: [verified-2026-11-12](../evidence/verified-2026-11-12/). Provider IDs are genuine sandbox references. No real funds transferred.

## Real AI and campaign acceptance

One new ordinary demo account completed the deployed browser wizard on November 12: five distinct selectable titles, two descriptions, a complete story, independent section regeneration, generated artwork, private draft save and publish. The published fictional campaign is [Solace Harbor demonstration](https://ifund-hackathon-demo.interplanetary-fund.workers.dev/campaign/08fc536b-0d6f-4346-b231-49e8b57bca6c).

All five requests returned HTTP200 and `execution.status=succeeded`. Text uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; images use `@cf/black-forest-labs/flux-1-schnell`. Request IDs, timestamps and real outputs are included in the allowlisted evidence. Provider failures remain failures in the private execution ledger. Seed copy is separately labeled and is not provider evidence.

## Automated and security checks

- `npm run check`: lint, TypeScript, Vite build and **20/20** automated tests passed. Provider unit tests use mocks and real local PostgreSQL semantics; they are not the sandbox acceptance evidence above.
- `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`: **4/4** scenarios passed. Guest navigation/discovery/map/sharing, protected routes, account/wizard/draft/publication, AI failure handling, desktop1440/tablet768/phone390 and full axe scans passed. The chart and globe wrappers were repaired to expose nested interactive controls accessibly.
- Dependency audit: **0 vulnerabilities** in the independent demo at this audit.
- A second real demo account received HTTP404 for another donor's receipt, HTTP403 for admin finance/tracker and an empty own donor ledger. No private tracker payload is included in public evidence.
- All 15 demo tables enforce RLS; browser roles have no direct table grants. The gateway verifies independently signed backend requests. Missing/invalid/stale signatures are tested. The internal focus trigger is service-role-only.
- Reconciled production tables still contain **0 donations, 0 ledger rows**; production Auth remains **5 users**. Demo registration never writes production identities. Production payment settings, DNS and merchant credentials were not changed by this demo release.

## Deployment and compliance limits

The verified Worker runtime SHA is `4c2700439b2dff0d3e3fc3b89b182b8abda9dca3`. The canonical production frontend was independently deployed from `9c02b1e485eb020ec5058946c5f0e8218f13e223` (Cloudflare deployment `015e985d-2756-44c7-b5c9-83734102c7db`) and passed desktop/phone home, guide, discovery and login checks. See `evidence/verified-2026-11-12/deployment-verification.json`. Query-string redaction is explicitly enabled; bindings were verified unchanged. It has dedicated Workers AI, R2 media, demo database signer and Sandbox Secrets Store references. Secret values are never logged or committed. Setup remains disabled; withdrawals, payouts and subscriptions are unavailable.

GitHub Actions is **blocked externally**: GitHub's annotation says jobs were not started because the account is locked due to a billing issue. Local checks and actual Cloudflare builds are independent evidence; Actions is not described as passing. No paid plan or billing change was made.

The official rules/dates were re-read November 12. Submission closes **November 12 at 20:00UTC / noon Pacific**. The existing submitted entry links to the dedicated guide. The existing public YouTube video is **2:01**, under three minutes; its current-release footage coverage remains **NOT VERIFIED** because direct playback could not be inspected in this environment. No personal eligibility attestations were invented. Maintain free judge access through **December 15, 16:00UTC**.

Optional Card Fields/3DS and a Postman desktop run remain **NOT VERIFIED** against the provider. Their unit/contract tests do not prove merchant eligibility or actual card acceptance. Image improvement, automatic social publishing, recurring billing and payouts are accurately unavailable. These are not represented as successful live functionality.

[Judge walkthrough](JUDGE_TESTING.md) · [Compliance matrix](COMPLIANCE.md) · [Video script](VIDEO.md)
