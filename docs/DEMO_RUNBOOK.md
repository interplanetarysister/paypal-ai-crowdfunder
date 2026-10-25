# Crowdfunder browser demo runbook (October 25, 2026)

## What is genuinely runnable

The local app has a complete AI-assisted draft → human edit → saved campaign journey with no external credentials. The PayPal donor button is **disabled without a sandbox client ID and client secret**. A verified PayPal Sandbox capture cannot be demonstrated merely by running local mock-provider tests.

### Fast interactive walkthrough (no credentials)

1. Run `npm test`, then `node server.mjs` with Node 20+; visit http://127.0.0.1:3000.
2. Choose **Try a guided example**. This populates a coastal cleanup campaign; it neither creates a campaign nor charges anything.
3. Click **Generate an AI-assisted draft**. The local model proposes a category, audience, three titles, summary, and editable story.
4. Select another suggested title, edit the title to **Help Clean Our Coast**, and select **Save reviewed campaign**.
5. Find the saved campaign card, $0 raised, and the disabled **PayPal setup required** button. There is no fake sandbox receipt.

### Optional automatic real-browser clip

Use the free, optional developer-side Playwright recorder (not needed for app runtime):

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
python3 scripts/record_demo.py
# Output: demo-artifacts/crowdfunder-ai-walkthrough.webm
# If ffmpeg is installed: demo-artifacts/crowdfunder-ai-walkthrough.mp4
```

The script starts the **real application** on loopback with temporary isolated data. It explicitly removes PayPal credentials from its child process to prevent accidental transactions or credential exposure. The footage is a **partial AI-and-campaign clip only**. It must never be described as a verified PayPal purchase or a complete end-to-end hackathon demonstration. Recorded artifacts are local and excluded from Git.

### Real sandbox payment checklist (requires operator credentials)

1. Create a PayPal sandbox REST app and personal **sandbox buyer** in https://developer.paypal.com/.
2. Export `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` into your local process, or load an ignored `.env`; **never** commit them, a payment receipt, buyer details, or the webhook secret.
3. Run `node server.mjs`. Confirm **PayPal sandbox connected**; click Donate on a sample campaign.
4. Use the sandbox buyer to approve payment; verify the UI shows a **verified sandbox capture ID** and the correct campaign/amount. Independently cross-check the order/capture in the PayPal Developer Sandbox activity.
5. Replay the capture endpoint with the *same order*; confirm the campaign total and donation count do not increase again.
6. Optionally configure a real signed webhook using a temporary secured HTTPS endpoint. Supply `PAYPAL_WEBHOOK_ID`; verify `PAYMENT.CAPTURE.COMPLETED`, repeat the event, and confirm only one credit. Tear down any temporary tunnel when finished.
7. Never publish a public auth-free deployment or live financial checkout as part of this local demo.

### Final YouTube shot order, target 2:35 (less than 3:00)

| Clock | Footage | Narration |
| --- | --- | --- |
| 0:00–0:18 | Real app home, environment label and guided demo | "What if getting help started with three answers? Crowdfunder uses local AI to draft your fundraiser and PayPal Sandbox to verify donations." |
| 0:18–0:54 | Fill guided example; generate three titles and category | "The trained model proposes an audience and wording based on the details provided, without paid AI calls." |
| 0:54–1:15 | Choose title, edit story and save | "The organizer controls every claim and approves the campaign before it is saved." |
| 1:15–2:04 | **Real Sandbox buyer login, order approval, actual verified capture and new campaign total** | "A real sandbox checkout creates a PayPal order on the server. Only the completed matching capture is credited once." |
| 2:04–2:26 | Run `npm test`; show actual passing test count | "Tests check payment matching, origin protection, webhook validation, and duplicate protection using a mock PayPal provider." |
| 2:26–2:35 | Public repo and license | "The source and free local setup instructions are public." |

**Do not insert a mocked payment clip into the 1:15–2:04 segment.** If a real sandbox payment is unavailable, publish only a truthfully labeled *partial* demonstration and leave the submission's real-payment verification item unchecked.

### Submission

Use [Devpost draft](DEVPOST_SUBMISSION_DRAFT.md), the public source repository, and a **public YouTube upload of genuine app footage**. As of October 25, 2026, PayPal sandbox capture, signed live webhook, video upload, and the final Devpost submission remain unverified. Deadline: November 12, 2026, noon Pacific.
