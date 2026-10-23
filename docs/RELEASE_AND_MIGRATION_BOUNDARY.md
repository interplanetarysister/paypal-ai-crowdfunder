# IFund migration boundary and PayPal hackathon release gate

- **Do not confuse the two projects:** this repository is an independent local, PayPal-only sandbox entry, not a production replacement for IFund's Base44 fundraiser, escrow, account identity, subscriptions, or withdrawal processing.
- The production IFund migration destination uses Cloudflare and Supabase. A private campaign staging copy is **not** a live production account, financial record, or permission grant.
- As checked October 22, 2026: 24 Base44 campaigns had 24 staged Supabase campaign records, 8 mapped source owners, 0 verified destination owner logins, 0 financially authoritative staged records, and 0 activated cutover/workflow switches. Cloudflare DNS zone activation was pending. Never infer readiness from these numbers alone.
- **Brex is not part of hackathon compliance** and should not receive pooled campaign funds without an independently verified legally supported custody/payout model.
- Do not move existing donations, enroll members silently, enable AI agents' provider writes, disable Base44, change public DNS, or activate payout routes until identity equivalence, permission/consent, PayPal ledger reconciliation, rollback, and live end-to-end tests are independently verified.
- The hackathon project can be submitted while IFund's production migration remains pending; the event rules permit judges to run a local repository, so a risky production cutover is not a prerequisite.
