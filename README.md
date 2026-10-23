# Crowdfunder — What if? (PayPal AI Hackathon 2026)

A **runnable, sandbox-only, AI-assisted crowdfunding demonstration**, developed independently from the live Interplanetary Fund service. The locally trained multinomial Naive Bayes model classifies campaign needs and suggests an audience; reviewed campaign copy then leads into a **real PayPal Sandbox Orders v2 checkout** when the tester provides their own free sandbox API credentials. No live money, automatic payouts, platform affiliations, metered AI API credits, or user-account migration are involved.

**Status (October 22, 2026):** application and automated mock-provider tests exist. Real PayPal sandbox capture, webhook delivery, full browser-recorded demo, and the public YouTube video are **not yet verified**. This repository is not evidence of a completed PayPal test or Devpost submission.

## Requirements

- Node.js **20+**. No `npm install` needed: all runtime and tests use built-in Node APIs.
- For real sandbox checkout: a free PayPal Developer account at https://developer.paypal.com/ and sandbox REST app credentials.
- A browser that supports the PayPal JavaScript SDK (load internet when testing checkout).

## Run locally

```bash
cp .env.example .env
# Edit .env with your own PayPal sandbox CLIENT_ID / CLIENT_SECRET (never commit).
# Optional: PAYPAL_WEBHOOK_ID for verified inbound webhook testing.
set -a; . ./.env; set +a
node server.mjs
# Open http://127.0.0.1:3000
```

Without credentials the app remains runnable: create AI-assisted drafts, edit and save demo campaigns, see campaign cards. Donation buttons clearly remain disabled. To test **real PayPal sandbox payment capture**, set both `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, restart, click Donate on a campaign, and authenticate using a **PayPal sandbox personal buyer**, not a live account. The server receives and checks completed PayPal capture records before changing visible totals.

## Sandbox webhook

Configure a sandbox webhook on your PayPal app with a publicly reachable **HTTPS** endpoint `/api/webhooks/paypal` and the event `PAYMENT.CAPTURE.COMPLETED`. This localhost-only prototype deliberately cannot accept public inbound webhooks by default. To test inbound delivery without exposing the unauthenticated demo to the internet, use a secured, temporary developer tunnel and tear it down afterwards; the prototype does not provision one automatically. Set `PAYPAL_WEBHOOK_ID` to the webhook's ID. The server verifies PayPal's signature via PayPal's verification API and independently retrieves the order details before recording a related capture. Unmatched events are only audit-marked, never credited.

## Tests

```bash
npm test
```

No GitHub Actions workflow is installed and this project does not spend CI minutes automatically. Tests run against a local **mock PayPal service**, not the live PayPal sandbox. They cover local AI classification, server-calculated amount boundaries, cross-origin rejection, capture verification, exactly-once credit, signature rejection, webhook replay, and mismatched-capture refusal.

## Architecture

- `server.mjs`: single-process HTTP service and routes, binds to `127.0.0.1` only (local demo, not a public production app).
- `src/ai.mjs`: trained multinomial Naive Bayes classifier plus fact-preserving copy assembly. This **is a small local statistical ML model, not an LLM**. Categories and audience are probabilistic suggestions; the user edits and approves all campaign copy.
- `src/paypal.mjs`: sandbox OAuth client credentials, Orders v2 create/lookup/capture, webhook verify-signature API. Secret stays on the server. Production endpoint is intentionally forbidden.
- `src/store.mjs`: JSON-backed atomic persistence; an in-process serial mutation queue helps avoid duplicate local credits. This is a one-process demo, **not** a production multi-instance ledger or custody solution.
- `public/*`: responsive interface, text-only local rendering; official PayPal JS SDK embeds checkout only when configured.

Payment integrity rule: customer-submitted campaign and amount are pinned when an order is created. Only a matching completed PayPal order and completed capture are inserted once, keyed by capture ID. Server verifies currency, campaign, amount, and capture state; a webhook event is not itself proof of paid funds. It never updates live IFund money.

## Limits and safety

This prototype has no user authentication, donor accounts, rate limiting, chargebacks/refunds, webhooks-on-real-public-host, KYC, fund custody, payment facilitation, or real payouts. **Do not deploy it for live fundraising.** Use sandbox accounts only. PayPal trademarks and third-party content remain the property of their owners. This project does not claim a partnership with PayPal. No sensitive credentials or payment information should be committed to GitHub. The local classifier relies on a small example dataset and must not be described as a large language model.

## Hackathon submission checklist

- [x] Public repo with Apache-2.0 license and full runnable source (once code committed)
- [x] Real PayPal Sandbox Orders v2 integration coded; mock-API tests passing
- [x] AI model used to suggest category and audience; user controls campaign story
- [x] Complete local setup instructions; no hosting needed by official rules
- [ ] Verify one **actual** PayPal sandbox order/capture end to end using developer credentials
- [ ] Validate signed live webhook delivery/replay through temporary approved HTTPS route
- [ ] Record functioning project on target device and publicly upload **under 3-minute video to YouTube**
- [ ] Complete and submit the Devpost form before **November 12, 2026, noon PST**

Official event and rules: https://paypalaihackathon.devpost.com/rules
