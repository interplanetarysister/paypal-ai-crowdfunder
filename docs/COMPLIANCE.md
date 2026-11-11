# PayPal AI Hackathon compliance matrix

Authority: the official rules and authenticated Devpost requirements fetched November 11, 2026. The live Devpost website prevails if this report differs from it. This is an evidence ledger, not an eligibility certification.

**Submission closes November 12, 2026, 12:00 PM Pacific (20:00 UTC). Judging runs December 1–15, ending December 15 at 8:00 AM Pacific.** The dates tool reports `submissions_open`.

The authenticated project lookup confirms an existing entry, [Interplanetary fund](https://devpost.com/software/interplanetary-fund-5pznwy), submitted November 4. Its current website field points to the original Base44 app. The standalone demo has not been substituted into that entry. The editable project lookup does not expose every frozen custom-answer field; those answers remain unverified.

| Mandatory requirement                                            | Current evidence                                                                                                            | Status                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Meaningful PayPal developer-platform integration in free sandbox | Orders v2, server capture, authenticated webhook verification and reconciliation implemented; local provider mocks pass     | NOT VERIFIED against real completed capture            |
| Meaningful AI functionality                                      | Real Workers AI adapter for five titles, two descriptions, story/section regeneration and images; no canned success path    | Runtime evidence pending                               |
| Functional judge-accessible build                                | Source, setup and local browser checks exist; hosted acceptance recorded in RELEASE.md                                      | See release evidence                                   |
| Public repository with complete source and assets                | Existing separate public `paypal-ai-crowdfunder` repository reused; publishing this implementation is tracked in RELEASE.md | Verification pending commit                            |
| Detectable open-source license                                   | Standard AGPL-3.0 LICENSE included; actual GitHub recognition must be read back after push                                  | Verification pending                                   |
| Public YouTube video under three minutes                         | Existing https://www.youtube.com/watch?v=HkxIFqoEKs0 is public; page metadata reports PT2M1S (display text rounds to 02:00) | PASS for public availability/duration only             |
| Video shows project functioning on target device                 | Existing transcript describes campaign creation; this does not prove sandbox capture footage or this release                | NOT VERIFIED                                           |
| English text explaining functionality and technology             | Existing submitted English description found; current implementation draft included separately                              | Existing text verified; update pending                 |
| Significant update after October 1 for existing project          | Original IFund predates the demo; this change adds isolated sandbox architecture, accounting and real-model wizard          | Source change evidence; organizer has final discretion |
| Judge access free and unrestricted through judging               | Public walkthrough and ordinary demo account flow; hosting persistence must be maintained through December 15               | NOT VERIFIED through future judging period             |
| Eligibility, representation, IP and permitted third-party use    | Owner authorized reuse of IFund; dependency notices included                                                                | Personal eligibility remains owner attestation         |
| Required submission answers                                      | Form IDs inventoried below; no invented personal or experience responses                                                    | NOT VERIFIED                                           |

## Exact form inventory

Required fields observed through Devpost:

- `28778` Submitter Type; `28779` Country of Residence; `28780` Canadian province / N/A; `28781` Organization Name / N/A.
- `28782` New or existing before October 1; `28783` explanation of changes during the submission period.
- `28784` specific PayPal and AI technology explanation; `28786` optional sponsor tools selection (the question is required, using sponsors is not).
- `28788` public code repository with recognized OSI license and complete README.
- `28790` personal PayPal integration experience rating; `28791` feedback explanation; `28792` contact preference.
- `28794` age, `28795` eligible jurisdiction and `28796` employee/conflict attestations.
- `29053` AI tools leveraged; `29054` learning derived; `29055` career value.
- Optional `28787` working demo URL and `28798` judge testing instructions are particularly useful for this entry.

The official rules allow either a hosted functional demo or complete setup/run instructions. A static mockup is insufficient. The owner’s implementation prompt additionally requires an independent public deployment and real provider evidence; those stronger gates remain in force.

No AWS integration is claimed. Official PayPal examples and an AWS hackathon/workshop repository were inspected as engineering references; they are not competition rules. No registration, eligibility attestation, submission replacement or re-submission is performed by this code.
