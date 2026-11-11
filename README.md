# Interplanetary Fund — PayPal Sandbox + AI demo

An independent IFund demonstration with fictional campaigns, a real-model campaign wizard, PayPal Sandbox Orders v2, isolated accounting and receipts. **Provider acceptance is recorded separately from implementation and mocked tests.** No real funds, production users, withdrawals or payouts.

This repository evolves the earlier local Crowdfunder demo into the IFund visual experience. The old implementation remains available in Git history; it is not the active deployed runtime. GitHub's connected integration could not create another repository, so this already separate public demo repository is reused. Production repositories are unchanged.

- Judge walkthrough: `/hackathon` on the verified deployment listed in [RELEASE.md](docs/RELEASE.md).
- Existing submitted entry: https://devpost.com/software/interplanetary-fund-5pznwy
- Existing public video: https://www.youtube.com/watch?v=HkxIFqoEKs0 — approximately two minutes; coverage of this standalone sandbox release requires separate verification.
- Official rules: https://paypalaihackathon.devpost.com/rules
- License: [GNU AGPL-3.0](LICENSE). [Attribution and provenance](docs/PROVENANCE.md).

## What runs

- React frontend adapted from the original IFund hero, branding, campaign-card patterns and workflows.
- Dedicated Cloudflare Worker: secure demo sessions, ownership checks, PayPal Sandbox API calls, authenticated Workers AI requests, reconciliation and private tracker.
- Supabase: **only `ifund_demo_*` tables**, all with RLS and revoked direct browser grants. No production Auth identities are created. Demo identities are fictional handles with salted PBKDF2 passwords and opaque HttpOnly session cookies.
- Dedicated R2 bucket for uploads and generated artwork.
- Dedicated Supabase Edge gateway authenticated with a separate demo ECDSA key. Database service credentials stay inside Supabase. A direct server-only Supabase key is also supported for local setup.
- AI text model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; artwork: `@cf/black-forest-labs/flux-1-schnell`. No canned successful fallback.

## Run and verify locally

Node 24+, npm, PostgreSQL/Supabase and a free Cloudflare account are required for the full integration.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
```

Tests use a real local PostgreSQL engine (PGlite) and explicitly mocked provider responses. They never establish real PayPal or AI acceptance. The application bundle imports none of the test provider code.

For a configured local environment, copy `.env.example` to **`.dev.vars`** (ignored), configure your own Supabase server key and sandbox credentials, set `DEMO_ORIGIN=http://localhost:8787`, and apply `db/001_demo.sql` and `db/003_verified_webhook_replay.sql`, and optionally `db/002_fictional_campaigns.sql` to an isolated database. Use the same browser hostname throughout. Local PayPal return/webhook testing requires a securely configured public HTTPS demo origin; localhost cannot receive public PayPal webhooks.

```sh
npm run build
npm run dev:api
# Open http://localhost:8787
```

For frontend hot reload, run `npm run dev` separately; its `/api` proxy points to port 8787. Set `DEMO_ORIGIN` to the frontend origin while using that proxy. Workers AI has no local fake-success mode. Remote inference needs an explicitly configured authenticated Workers AI binding; use a deployed free-tier demo for real-model tests.

Do not apply these migrations blindly to a database where the same demo tables already exist. The deployed shared-project fallback was reconciled before applying only these additive migrations. Never run any migration from a production repository as part of this demo.

## Configure and deploy

See [SETUP.md](docs/SETUP.md) for the exact server bindings, separate gateway signing key, sandbox webhook, admin bootstrap and reproducible deployment. The checked-in Wrangler configuration keeps AI and payments **off by default**. Account-specific resource IDs must be changed for another owner. No DNS or production Worker modification is required.

```sh
npm run build
npx wrangler deploy --dry-run
# After securely configuring the isolated bindings:
npx wrangler deploy --keep-vars --var RELEASE_SHA:$(git rev-parse HEAD)
```

The manual deployment workflow only targets `ifund-hackathon-demo`. It requires repository secrets and does not change production DNS or enable paid plans. The connector-based deployment uses `scripts/build-worker.mjs` to include static files as modules when the API connector cannot provide asset-session authorization headers.

## Payment truth

The browser selects an amount from a validated $1–$100 range. The server pins that amount, purpose, campaign and idempotency key before creating the PayPal order. The sandbox provider's merchant is pinned from an authenticated order GET. Capture validates order, merchant, currency, amount, reference and completed capture. One Postgres transaction writes the immutable capture, balanced ledger and receipt. Webhooks are signature-verified through PayPal and deduplicated by event ID. Capture persistence does not wait for a webhook.

Pending, cancelled, failed and unverified requests are not collected funds. Platform support has a null campaign relationship and separate ledger account. Subscriptions, advanced card fields, Venmo and social publishing are unavailable. PayPal determines eligible sandbox checkout methods. The 7% withdrawal fee is a labeled arithmetic preview; no payout endpoint exists.

## Judge instructions and compliance

Read [JUDGE_TESTING.md](docs/JUDGE_TESTING.md), [COMPLIANCE.md](docs/COMPLIANCE.md), [VIDEO.md](docs/VIDEO.md) and the dated [release evidence](docs/RELEASE.md). This source is not a certification of eligibility or completed provider testing. The existing Devpost submission is preserved until a reviewed update is authorized and verified.
