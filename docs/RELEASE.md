# Release evidence

**Status: deployment and provider acceptance in progress. Not certified judge-ready.**

November 11, 2026. Actual deployment URL, commit and provider evidence are filled in after verification; no guessed URL is a completion claim.

## Implemented and locally checked

- IFund visual adaptation, discovery, synthetic Atlas, details, organizer profiles, QR/share/embed, guest draft composition, demo account auth, AI wizard and publish flow.
- Sandbox-only order/capture verification, idempotency, pending/failure/cancellation states, atomic immutable capture/ledger/receipt and reconciliation.
- Separate donor/organizer/admin finance views and protected tracker. Subscriptions and payouts unavailable.
- Lint, TypeScript/build and nine unit/integration suites pass. Tests use local PostgreSQL plus mocked PayPal/AI.
- Four browser scenarios have passed, including desktop 1440, tablet 768 and phone 390 layouts and WCAG A/AA automated scans on six core routes. Final post-change rerun is required before release.
- Test screenshots in `evidence/browser/TEST_ONLY-*` are from isolated local tests. They do not establish provider or deployed acceptance.

## Direct infrastructure evidence

- Base44 source access: blocked by paid Builder plan; exported-source fallback used without credits.
- Supabase free third project creation: refused due two-project free limit. Existing project fallback is limited to new `ifund_demo_*` objects.
- Migrations `ifund_demo_isolated_hackathon` and `ifund_demo_fictional_showcase` applied successfully.
- Authenticated catalog inspection confirms twelve demo tables have RLS enabled; anon SELECT and authenticated INSERT are false for all twelve.
- New `ifund-demo-data` Edge Function deployed ACTIVE version 1, with independent ECDSA request verification. It does not export database service credentials.
- New dedicated R2 bucket `ifund-hackathon-demo-media` created in WNAM.
- Sandbox credential references inspected: Secrets Store `Paypal_sandbox_app_id` / `paypal_sandbox_app_secret`. Values were not printed or committed.
- Initial Cloudflare automatic approval review failed due a usage limit. A later approval-reviewed inspection succeeded; access is restored.
- GitHub createRepository was refused by the integration. Existing separate public `paypal-ai-crowdfunder` is reused with its history retained.

## Financial/provider gates

| Gate                                           | Status                    | Evidence                          |
| ---------------------------------------------- | ------------------------- | --------------------------------- |
| Live model execution on independent deployment | NOT VERIFIED              | Pending actual request            |
| Real PayPal Sandbox order                      | NOT VERIFIED              | Pending actual request            |
| Eligible buyer approval                        | NOT VERIFIED              | Requires sandbox buyer            |
| Real provider capture                          | NOT VERIFIED              | No capture ID claimed             |
| Genuine signed capture webhook                 | NOT VERIFIED              | No signature acceptance claimed   |
| Replay without duplicate accounting            | NOT VERIFIED live         | Local mock/SQL tests only         |
| Canonical ledger and receipt                   | NOT VERIFIED live         | No successful financial seed data |
| Independent public deployment                  | NOT VERIFIED              | Deployment pending                |
| Public license recognized by GitHub            | NOT VERIFIED after update | Pending push/readback             |

## Devpost/video evidence

Authenticated Devpost `get_project` confirms project 1484362 / `interplanetary-fund-5pznwy` is published and was submitted to `paypalaihackathon` November 4. Its current submitted website reference is the original Base44 app. The existing YouTube link is public and approximately two minutes long. Neither fact establishes this standalone demo's end-to-end acceptance. No submission was changed in this pass.

Before demo tables were created, direct read-only counts were: production donations 0, production ledger 0, production Auth users 5, production campaigns 40. Recheck and qualify concurrent changes when recording the final isolation result; this task's mutations are limited to the demo objects.
