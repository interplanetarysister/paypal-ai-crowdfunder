# Reuse and isolation record

## Authoritative references inspected

- Original Base44 app: https://interplanetaryfund.base44.app — read-only live capture.
- Production app: https://interplanetaryfund.com — read-only live capture.
- Original export: `interplanetarysister/interplanetary-fund2@73c97a456e81bf924c53496a221fb088eba84991`.
- Migration source: `interplanetarysister/InterplanetaryFund@0ebeff4b42de79da51dcad38b69c44cb5b59bd7f`.
- Coordination: https://github.com/interplanetarysister/InterplanetaryFund/issues/203.
- Rules: https://paypalaihackathon.devpost.com/rules, plus authenticated Devpost rules, form and dates.

Base44's direct sandbox source tool returned `PREMIUM_REQUIRED` (Builder plan required). The initial inspection did not expose a duplicate operation. A later official API catalog includes remix and GitHub sync/deploy operations; no remix was executed and no paid file-access restriction was bypassed. No Base44 AI builder call, plan upgrade or builder credits were used. The authorized exported-source fallback was selected.

## Reuse decisions

| Capability                      | Reuse / adaptation                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IFund identity                  | Original logo `6d085cfd8_1000004152.webp`, existing cosmic hero archive, original wording and Fraunces/Inter typography                                                                           |
| Home, cards and navigation      | Original `Home.jsx`, `BrandHero.jsx`, `BrandLogo.jsx`, `CampaignCard.jsx` and migration styles inspected; adapted to demo-specific React routes and disclosures                                   |
| PayPal validation               | Migration `paypalSandboxSecurity.js` and sandbox handler inspected; validation adapted to pinned demo intent, merchant, purpose and atomic ledger RPC                                             |
| Existing sandbox infrastructure | Only matching sandbox Secrets Store references reused; no live credential values exported or changed                                                                                              |
| Financial persistence           | Original production ledger not reused for data. New `ifund_demo_*` tables, separate demo accounts and dedicated signer/gateway                                                                    |
| AI                              | Existing campaign writing flow inspected; new authenticated Workers AI adapter enforces five titles, two descriptions and one story                                                               |
| Sharing / QR                    | `qrcode.react` (ISC) for real offline QR encoding; native sharing only where supported                                                                                                            |
| Map                             | Original globe/navigation intent retained as an accessible synthetic schematic Atlas with rotation, keyboard-selectable markers and campaign links; exact original 3D globe parity is not claimed |
| Older PayPal demo repository    | Local classifier/single-process server preserved in Git history, replaced as active runtime because it could not meet the requested real-model + Worker + IFund architecture                      |

## Official examples and licenses

- https://github.com/paypal-examples/docs-examples — Apache-2.0, inspected standard/advanced checkout guidance and server-side patterns. Its API examples are guidance, not proof of this merchant's eligible methods.
- https://github.com/aws-samples/sample-praimana — MIT-0, maintained AWS workshop/hackathon platform inspected for evidence/handoff patterns. Its infrastructure is not required for PayPal Devpost; no AWS service was deployed or claimed.
- React / React DOM and React Router — MIT; Lucide — ISC; qrcode.react — ISC. Dependency versions are pinned in package-lock.json.
- Fraunces and Inter — SIL Open Font License, loaded through Google Fonts with system fallbacks.
- Original IFund source/identity reused under the owner's express task authorization. AGPL source attribution is retained. Third-party trademarks remain with their owners; no partnership endorsement is asserted.

The new demo is an additive, separately deployed application. No production DNS, PayPal Worker settings, production user records, original Base44 files, production campaign rows or production financial rows are part of its write path.
