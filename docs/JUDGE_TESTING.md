# Judge walkthrough

Begin at `/hackathon` on the actual verified demo origin in RELEASE.md. All campaign stories, names and locations are fictional. No super-admin account is needed for the primary flow.

1. Create a demo account with a fictional handle and a separate password. Do not use production IFund credentials or personal information.
2. Open Create. Describe a fictional need. Generate five distinct titles and select one. Generate two descriptions and select one. Generate a story, edit a section, and regenerate only that section. The latest model, request ID, outcome and timestamp are shown after a genuine model result.
3. Generate campaign artwork or upload an image you have rights to use. If the provider is unavailable, observe the accurate error; no generated success is substituted. Seed campaigns reuse IFund cover artwork until campaign-specific artwork is generated.
4. Preview and save a private draft. Reopen it from Organizer dashboard, publish it and find it in discovery by title/category. Explore the synthetic Atlas marker, organizer profile, QR link and embed preview.
5. Open the fictional campaign’s donation checkout. Choose $1–$100. Read the sandbox disclosure, then continue to PayPal.
6. Approve with an eligible **Personal PayPal sandbox buyer distinct from the receiving merchant**. Use your own developer test account or owner-supplied credentials transmitted securely. Never put buyer passwords in a public repository, issue, video or screenshot.
7. Return in the same demo browser session and select Verify and capture. A PayPal return/approval is not success. A completed payment requires a provider-confirmed capture plus a durable receipt.
8. Open the receipt and Donor dashboard. Check amount, purpose, order ID, capture ID and reconciliation. The campaign organizer sees the same canonical capture in Organizer dashboard. A second account must not see your donor record or receipt.
9. Test Support IFund separately. Its receipt says platform support, its campaign relationship is null, and it never contributes to a fictional beneficiary’s total.
10. An administrator verifies genuine signed webhook delivery and replay separately. Admin tracker and transaction views are server-protected. Unsigned webhooks must be rejected. Capture persistence must work even before webhook arrival.

**Unavailable:** subscriptions, real payouts/withdrawals, Venmo, advanced card fields, automated social publishing and image improvement. PayPal controls the eligible methods offered inside its sandbox checkout. The 7% withdrawal-fee example is a labeled arithmetic preview only.

If a provider is unavailable, do not mark the flow successful. Preserve the draft/order and use reconciliation rather than start another donation blindly. See RELEASE.md for actual PASS/BLOCKED/NOT VERIFIED results.
