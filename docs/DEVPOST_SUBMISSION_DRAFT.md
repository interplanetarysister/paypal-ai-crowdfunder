# Devpost submission draft — NOT SUBMITTED

**Project name:** Crowdfunder — What if?

**Tagline:** From a real need to an AI-guided fundraising story and a verifiable PayPal sandbox donation.

**Inspiration**
A fundraiser should not need specialized technical knowledge to explain a need, reach the right supporters, or understand whether a donation actually completed. We built a small proof of concept that places PayPal's payment confirmation at the center of an accessible crowdfunding flow.

**What it does**
The user enters who needs support, what they need, and what donations will help accomplish. A locally trained machine-learning classifier suggests the campaign category and likely audience. The app builds a reviewable story exclusively from the user's supplied facts. The user can edit and save it. With sandbox credentials configured, donors can use the PayPal button. The backend creates an order via PayPal Orders v2, validates the completed capture against the original campaign, currency, and amount, and records the receipt only once.

**How we built it**
JavaScript (ES modules), HTML, CSS, Node.js built-in HTTP and file APIs, PayPal OAuth2, PayPal Orders v2, PayPal JavaScript SDK, and PayPal Webhook Signature Verification API. We trained a compact multinomial Naive Bayes model on a labeled fundraising example set and run it locally: no paid inference calls or API credits. Local JSON storage is atomic in one server process; this is expressly not production custody infrastructure.

**Challenges**
Payment intent and payment completion are different states. We needed to prevent unverifiable browser claims or duplicate webhooks from becoming donation totals, without making the demo require paid hosting or LLM credits.

**Accomplishments**
A runnable no-install local app, editable AI-assisted campaign drafts, sandbox-only PayPal order/capture implementation, server-verified ledger updates, signature-checked webhook handler, and automated mock-provider tests. Live PayPal sandbox transactions and public video verification are still pending; this draft must be updated after evidence exists.

**What we learned**
A helpful AI suggestion should preserve user control and avoid inventing facts. Financial status should be derived from a verified provider event rather than a checkout redirect or client assertion.

**What's next**
Verify the PayPal sandbox integration end to end, publish the demonstration video, add real authentication and a production-grade ledger, then consider carrying the proven sandbox design into Interplanetary Fund after separate approvals and testing.

**GitHub:** https://github.com/interplanetarysister/paypal-ai-crowdfunder

**Demo video:** Not yet uploaded. Do not insert an invented URL.

**AI tools:** Local Multinomial Naive Bayes classifier (category/audience suggestions); fact-preserving template assembly (not a generative LLM).

**PayPal components:** PayPal Sandbox OAuth2, Orders v2 create/capture, PayPal JS SDK, and webhook signature verification.

**Tags:** fintech, ai, crowdfunding, paypal, javascript, accessible-design
