# Isolated setup

Use only free allocations. Do not enable a paid subscription or change production DNS, Workers, PayPal settings or financial records.

## Data

Apply `db/001_demo.sql`, `db/002_fictional_campaigns.sql` and `db/003_verified_webhook_replay.sql` to your own Supabase database. All twelve demo tables have RLS enabled; anon/authenticated grants are revoked. RPCs are executable only by service_role and use SECURITY INVOKER. Seed accounts cannot log in; no financial successes are seeded.

For the existing owner deployment, a new free Supabase project was refused because the organization already has two free projects. Only the new `ifund_demo_*` tables in `ssibsfmtodgximseeqsv` are used. Demo account creation never touches `auth.users`. The application has no route to production financial tables.

The deployed `ifund-demo-data` Edge Function accepts only a demo ECDSA signature over `timestamp + "\n" + exact body`, with a 60-second window and a strict table/RPC allowlist. Its `verify_jwt=false` setting is intentional: the function authenticates the Worker itself. Unsigned requests must return 403. It uses Supabase-provided service credentials internally; they are never exported.

For a new deployment, generate an ECDSA P-256 pair. Put only the public JWK into `edge/index.ts`, deploy that function, and bind the private JWK as encrypted `DB_SIGNER` on the demo Worker. Never commit the private key. For local development, `SUPABASE_SECRET_KEY` can be supplied server-side instead of the gateway signer.

## Worker bindings

| Name                 | Type               | Purpose                                                                            |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| ASSETS               | Static assets      | Built frontend; API upload wrapper provides the same interface                     |
| MEDIA                | R2                 | Dedicated `ifund-hackathon-demo-media` bucket                                      |
| AI                   | Workers AI         | Real inference, explicitly enabled separately                                      |
| DB_SIGNER            | Encrypted secret   | Independent demo private JWK                                                       |
| SUPABASE_URL         | Variable           | Demo database origin                                                               |
| PAYPAL_CLIENT_ID     | Secrets Store      | Existing sandbox app ID binding                                                    |
| PAYPAL_CLIENT_SECRET | Secrets Store      | Matching sandbox app secret binding                                                |
| PAYPAL_WEBHOOK_ID    | Variable           | Assigned sandbox webhook ID for this demo origin                                   |
| PAYPAL_MERCHANT_ID   | Optional variable  | Extra expected merchant check; each provider order always pins its actual merchant |
| DEMO_ORIGIN          | Variable           | Exact independent HTTPS origin                                                     |
| DEMO_ENABLED         | Variable           | `true` only for this sandbox Worker                                                |
| AI_ENABLED           | Variable           | `true` only after configuring free-allocation model access                         |
| SETUP_ENABLED        | Temporary variable | Admin-only webhook setup; remove/disable after setup                               |
| RELEASE_SHA          | Variable           | Actual built Git commit                                                            |

The owner deployment reuses only Secrets Store references `Paypal_sandbox_app_id` / `paypal_sandbox_app_secret`, not production credentials. Secret values must never appear in source, screenshots, evidence or browser responses. The demo Worker cannot call the live PayPal host.

## Sandbox webhook setup

Create a separate demo account, promote that account through a service-role SQL update on **only** `ifund_demo_users.role`, and sign in. Never infer admin from a handle, email, browser storage or client claims.

While `SETUP_ENABLED=true`, authenticated admins may POST `/api/admin/setup/paypal` with `{"action":"inspect"}`. Inspect the existing sandbox webhooks first. `{"action":"register"}` reuses an exact matching demo URL or creates only that new sandbox webhook, without editing older callbacks. Bind its assigned ID, then set `SETUP_ENABLED=false`.

The callback is `/api/paypal/webhook` on the exact dedicated HTTPS origin. Subscribe to capture completed, pending and denied. `/api/paypal/status` checks sandbox OAuth and the actual registered URL. This is configuration verification, not completed-payment evidence.

Use a Personal sandbox buyer distinct from the merchant. Start checkout from the demo browser session, approve at `www.sandbox.paypal.com`, return and capture. Copy only the order/capture/receipt IDs into safe evidence. Never copy buyer passwords or session cookies.

## Deployment

`npm run check` and `npm run test:browser` must pass. Build from this repository root, then deploy the dedicated Worker with the complete listed bindings. Wrangler keeps secret values but configuration can replace other bindings; do not deploy with an incomplete resource configuration. The 30-minute scheduled reconciler only reads known sandbox orders and finalizes provider-completed captures. It never approves or proactively captures an unapproved payment.

The API-upload alternative is reproducible:

```sh
npm run build
npx wrangler deploy --dry-run --outdir work/worker-bundle
node scripts/build-worker.mjs
```

Upload `work/upload/index.js`, `app.js`, and `assets.js` as ES modules with `index.js` as main, the bindings above, and compatibility date `2026-11-11`. The assets module contains only the public build output, never credentials. Keep logs/traces enabled and query strings redacted. The deployed origin must return real app assets and functioning APIs before a release is certified.
