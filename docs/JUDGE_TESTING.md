# IFund PayPal AI Hackathon — judge verification guide

**START HERE:** https://ifund-hackathon-demo.interplanetary-fund.workers.dev/hackathon

The demo is a separate Cloudflare Worker using PayPal **Sandbox only**, real Workers AI bindings, and isolated `ifund_demo_*` records. Every cause, name, organizer and campaign location in the demo is fictional. No real donations or payouts can happen here.

## Judge walkthrough — no special credentials needed for public pages

1. Open **/hackathon**. Select **Start the guided, highlighted tour**. Cyan outlines indicate the intended item; Back, Next and Close work without payments.
2. Follow the highlighted **AG Charts & AG Grid partner demo** link. Direct: **/hackathon/analytic** (redirects to **/hackathon/analytics**). The **three AG Charts Community donuts** display provider-verified Sandbox campaign funding versus fictional goals, fictional campaign categories and clearly **simulated** per-campaign agent-role attention. Change the fictional campaign in the agent-role selector. Below the charts, **AG Grid Community** sorts/filters 82 fictional campaigns and opens their detail pages. Both Community integrations are free; geographic AG Charts Enterprise maps are not used.
3. Open **/map**. Rotate the touch/keyboard-accessible schematic Atlas and select fictional campaign pins; open a campaign to inspect its dedicated funding and simulated agent donuts.
4. Open **/create**. A fictional demo account is required to call AI and save/publish. On **/login**, create a fictitious handle (3–30 lowercase characters) and a **new 12+ character demo-only password**. Do not use any production IFund password. Return to Create.
5. Describe an invented cause. Generate five candidate titles and select one, generate two short descriptions and select one, produce a three-section story and regenerate a chosen section, then optionally generate new artwork. Outputs and failures come from actual Workers AI. Model evidence and execution outcomes are shown; a failed call does **not** silently become invented success. Model requests are quota-limited to conserve free-tier capacity.
6. Save a private draft; review, edit and publish. Verify it appears in public discovery and on your organizer page. Try share URL, QR and embedding.
7. Open **PayPal Sandbox checkout** on a fictional campaign or choose **Support IFund**. Enter $1–$100. **Only the PayPal Sandbox account approval path is demonstrated as having a previously recorded successful provider capture**; the browser-hosted Card Fields option depends on PayPal merchant eligibility and has not been verified end-to-end. Never enter a real card, a production PayPal login or a card number from screenshots.
8. If you have your **own PayPal Personal Sandbox buyer**, sign in to PayPal Sandbox using an account distinct from the receiving merchant, approve the order, return to the same demo browser session and click **Verify and capture**. A redirect, pending order, Card Fields success event or screenshot is **not** proof of a donation. Only a provider-confirmed capture creates an immutable receipt and balanced ledger. You may explore the demo without executing a payment.
9. Open the authenticated **Dashboard** to view AG Grid Community donor/organizer financial history with amount, purpose, PayPal IDs, reconciliation status and authorized receipts. **Platform support** has no beneficiary campaign and cannot add to a campaign's raised total.
10. Review the source code, [Postman collection](../postman/IFund_PayPal_AI_Sandbox.postman_collection.json), [release evidence](RELEASE.md) and [remaining implementation plan](REMAINING_HACKATHON_PLAN.md). Administrator webhook replay and cross-account ownership tests are protected and require approved administrator testing; no administrator credentials are published.

## Postman sponsor integration

Import `postman/IFund_PayPal_AI_Sandbox.postman_collection.json` into Postman. Its base URL is the isolated Worker above. The collection includes public status, campaigns, optional demo registration/login, real PayPal Sandbox webhook/OAuth checks, real Workers AI titles, $1 Sandbox order creation, reconciliation, **manual-only** capture after buyer approval, donor finance/receipts and a negative $0 checkout. It has **no real or fictional password, card numbers, PayPal client secret or Supabase key** in the file. Keep the login variables in a private, local environment. Postman stores the demo HttpOnly session cookie.

The collection is an executable integration/testing artifact, **not** evidence that a separate Postman desktop session or all test cases have already succeeded. Use its assertions to record actual provider results before upgrading any readiness gate.

## Known limits and appropriate disclosures

- Eight Workers AI runs have `succeeded` status in the isolated demo audit (November 11); not every attempt succeeded. Generated content still requires human review.
- One recorded PayPal Sandbox campaign or platform capture has a matching receipt and balanced ledger; there are no recorded **card-method** orders or captures. One `PAYMENT.CAPTURE.COMPLETED` event shows delivery count two; provider-backed replay acceptance needs further independent confirmation.
- Genuine Sandbox card approval, declines, 3-D Secure challenge behavior, signed webhook replay end-to-end, and full privileged dashboard access have **not been independently verified**.
- No real withdrawals, subscriptions, Venmo, live financial transactions, or automatic social cross-posting run inside this isolated demo. The 7% withdrawal fee is an arithmetic illustration only.
- The separate production platform at interplanetaryfund.com is not the judges' Sandbox entry point.
- The existing YouTube video predates the final independent demo. Verify that the final submitted video shows the current working application, stays under three minutes and is public.

For official rules and the submission cutoff, see https://paypalaihackathon.devpost.com/rules. Submissions close **November 12, 2026, noon Pacific**.
