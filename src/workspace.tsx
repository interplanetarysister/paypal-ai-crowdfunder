import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { api, money, type Campaign } from "./api";
import { ErrorBox, Notice, useSession } from "./ui";
import { useData } from "./pages";
interface FinanceOrder {
  id: string;
  campaign_id: string | null;
  purpose: string;
  amount_cents: number;
  status: string;
  reconciliation: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  created_at: string;
}
interface Finance {
  orders: FinanceOrder[];
  receipts: { id: string; capture_id: string }[];
  captured_cents: number;
  platform_support_cents: number;
  pending_count: number;
  record_count: number;
  limited_to_latest?: number;
}
export function Dashboard() {
  const { user } = useSession(),
    [query, setQuery] = useSearchParams();
  const requested = query.get("view"),
    view = ["donor", "organizer", "admin"].includes(requested || "")
      ? requested!
      : "donor";
  const { data, error, loading } = useData<Finance>("/finance?view=" + view);
  const campaigns = useData<{ campaigns: Campaign[] }>("/campaigns?mine=1");
  const [preview, setPreview] = useState("100");
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Your mission control</p>
        <h1>Hello, {user?.handle}</h1>
        <p>
          Your fictional causes and verified sandbox contribution records, in
          one place.
        </p>
      </header>
      <nav className="tabs" aria-label="Financial dashboards">
        {[
          "donor",
          "organizer",
          ...(user?.role === "admin" ? ["admin"] : []),
        ].map((v) => (
          <button
            className={view === v ? "active" : "secondary"}
            onClick={() => setQuery({ view: v })}
            key={v}
          >
            {v === "admin"
              ? "Administrator"
              : v === "organizer"
                ? "Organizer"
                : "Donor"}
          </button>
        ))}
      </nav>
      <Notice>
        PAYPAL SANDBOX — NO REAL FUNDS TRANSFERRED · Withdrawals and payouts are
        disabled.
      </Notice>
      <ErrorBox error={error} />
      {loading && <p role="status">Loading canonical demo records…</p>}
      {data && (
        <>
          <div className="stats">
            <article className="panel">
              <p>Verified campaign contributions</p>
              <h2>{money(data.captured_cents)}</h2>
              <small>Completed captures only</small>
            </article>
            <article className="panel">
              <p>Verified platform support</p>
              <h2>{money(data.platform_support_cents)}</h2>
              <small>Separate from campaign beneficiaries</small>
            </article>
            <article className="panel">
              <p>Payments awaiting verification</p>
              <h2>{data.pending_count}</h2>
              <small>No collected funds are counted</small>
            </article>
          </div>
          {data.limited_to_latest && (
            <p className="meta">
              History shows the latest {data.limited_to_latest} matching orders.
              Totals include all verified captures in this view.
            </p>
          )}
          <section className="panel">
            <h2>Transaction and receipt history</h2>
            {!data.orders.length ? (
              <div className="empty">
                <p>No sandbox transactions recorded for this view.</p>
                <Link className="button" to="/discover">
                  Discover a fictional campaign
                </Link>
              </div>
            ) : (
              <div className="transaction-list">
                {data.orders.map((o) => {
                  const r = data.receipts.find(
                    (r) => r.capture_id === o.paypal_capture_id,
                  );
                  return (
                    <article className="transaction" key={o.id}>
                      <div>
                        <strong>
                          {o.purpose === "platform_support"
                            ? "Platform-support contribution"
                            : "Campaign donation"}
                        </strong>
                        <p>{new Date(o.created_at).toLocaleString()}</p>
                        <p className="meta">
                          Order: {o.paypal_order_id || "Creation not confirmed"}
                          <br />
                          Capture:{" "}
                          {o.paypal_capture_id || "No verified capture"}
                        </p>
                      </div>
                      <div>
                        <strong>{money(o.amount_cents)}</strong>
                        <p className={"status-tag " + o.status}>{o.status}</p>
                        <small>
                          Reconciliation:{" "}
                          {o.reconciliation.replaceAll("_", " ")}
                        </small>
                        <div className="actions">
                          {r && (
                            <Link to={"/receipts/" + r.id}>View receipt</Link>
                          )}
                          {view === "donor" &&
                            o.status !== "captured" &&
                            o.paypal_order_id && (
                              <Link to={"/checkout?id=" + o.id}>Reconcile</Link>
                            )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
      {view === "organizer" && (
        <section className="panel">
          <div className="section-title">
            <h2>Your campaigns & drafts</h2>
            <Link to="/create" className="button small">
              Create campaign
            </Link>
          </div>
          <ErrorBox error={campaigns.error} />
          {campaigns.loading && <p role="status">Loading drafts…</p>}
          {campaigns.data?.campaigns.map((c) => (
            <article className="draft-row" key={c.id}>
              <div>
                <h3>{c.title}</h3>
                <p>
                  {c.status === "draft"
                    ? "Private draft"
                    : "Published fictional campaign"}{" "}
                  · {money(c.raised_cents || 0)} captured
                </p>
              </div>
              <Link
                className="button secondary small"
                to={"/create?draft=" + c.id}
              >
                Edit / preview
              </Link>
            </article>
          ))}
          {!campaigns.loading &&
            !campaigns.error &&
            !campaigns.data?.campaigns.length && (
              <p>
                No saved campaigns yet. Guest drafts remain in the browser where
                you composed them.
              </p>
            )}
        </section>
      )}
      <section className="panel">
        <h2>Withdrawal fee preview</h2>
        <Notice>
          Preview only. Actual withdrawals and payouts are disabled.
        </Notice>
        <label>
          Illustrative gross amount (USD)
          <input
            type="number"
            min="0"
            max="1000000"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
        </label>
        <p>
          Platform fee at withdrawal:{" "}
          <strong>
            {money(Math.round(Math.max(0, Number(preview) || 0) * 7))}
          </strong>{" "}
          (7%)
        </p>
        <p>
          Illustrative amount after fee:{" "}
          <strong>
            {money(Math.round(Math.max(0, Number(preview) || 0) * 93))}
          </strong>
        </p>
        <p className="meta">
          This does not create a payment, withdrawal request, payout or fee
          charge.
        </p>
        <p>
          Recurring donations and subscriptions are unavailable in this demo.
        </p>
      </section>
    </>
  );
}
export function Showcase() {
  const { status, statusError } = useSession();
  return (
    <>
      <header className="showcase-heading">
        <p className="eyebrow">PayPal AI Hackathon · 2026</p>
        <h1>
          From “What if?”
          <br />
          to a verified possibility.
        </h1>
        <p>
          AI helps a campaign find its voice. PayPal Sandbox carries a
          contribution from buyer approval to a canonical receipt.
        </p>
        <div className="actions center">
          <Link className="button" to="/create">
            <Sparkles size={17} />
            Create a fictional campaign
          </Link>
          <Link className="button secondary" to="/discover">
            Explore the demo <ArrowRight size={17} />
          </Link>
        </div>
      </header>
      <Notice>
        Every campaign, identity and location is fictional. All payments use
        PayPal Sandbox. No real funds, live donations, subscriptions or payouts.
      </Notice>
      <section className="panel">
        <h2>Current verification status</h2>
        <p>
          This page reports configuration separately from tested functionality.
          A configured binding is not evidence of AI generation, a completed
          payment or a verified webhook.
        </p>
        <div className="status-grid">
          {[
            ["Demo storage", status?.configured],
            ["PayPal bindings", status?.payments_configured],
            ["AI model binding", status?.ai_configured],
            ["Media storage", status?.media_configured],
          ].map(([label, configured]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>
                {statusError
                  ? "Status check failed"
                  : !status
                    ? "Checking live configuration…"
                    : configured
                      ? "Connected · check provider evidence"
                      : "Unavailable / not configured"}
              </strong>
            </div>
          ))}
        </div>
        {statusError && <p role="alert">{statusError}</p>}
        <p>
          Deployment commit:{" "}
          <code>{status?.release_sha || (statusError ? "STATUS UNAVAILABLE" : "Checking…")}</code>
        </p>
        <p>
          Provider-backed acceptance: <strong>NOT VERIFIED</strong>. See the
          repository release report for dated evidence.
        </p>
      </section>
      <section className="story-section compact">
        <p className="eyebrow">The problem</p>
        <h2>Good causes shouldn’t get lost in the work of asking.</h2>
        <p>
          Writing a clear fundraiser, helping donors find it, and keeping
          trustworthy records takes time. IFund brings those tasks together so
          organizers can focus on the possibility they want to create.
        </p>
        <p>
          The original Interplanetary Fund frontend is the visual foundation.
          This independent demo adds isolated fictional campaigns, authenticated
          AI generation, sandbox accounting and explicit verification
          boundaries.
        </p>
      </section>
      <section className="feature-grid walkthrough">
        <article className="panel">
          <Sparkles />
          <h2>1. Tell the story</h2>
          <p>
            Open Create as a guest and describe a fictional need. Sign into a
            separate demo account to generate five titles, two descriptions, one
            full story and campaign artwork. Edit any section, regenerate just
            that section, and save a draft.
          </p>
          <Link to="/create">Open campaign wizard →</Link>
        </article>
        <article className="panel">
          <CheckCircle2 />
          <h2>2. Follow a donation</h2>
          <p>
            Publish the fictional campaign. Choose a sandbox amount and continue
            to PayPal. Approve with a Personal sandbox buyer distinct from the
            merchant. Return to IFund and verify capture.
          </p>
          <Link to="/discover">Choose a fictional campaign →</Link>
        </article>
        <article className="panel">
          <FileText />
          <h2>3. See the evidence</h2>
          <p>
            Only a provider-verified completed capture creates the isolated
            ledger and receipt. Find its PayPal order/capture references in the
            donor dashboard and campaign owner’s organizer view.
          </p>
          <Link to="/dashboard">Open your financial records →</Link>
        </article>
      </section>
      <section className="panel">
        <h2>
          <BookOpen size={22} /> Judge testing instructions
        </h2>
        <ol>
          <li>
            Create a separate demo account with a fictional handle and a new
            demo password. No super-admin role is required for campaign creation
            or donation testing.
          </li>
          <li>
            Use invented campaign facts. The exact disclosure remains on details
            and checkout.
          </li>
          <li>
            Generate the writing options; inspect the request model, ID, outcome
            and timestamp. Provider failures remain visible and preserve the
            draft.
          </li>
          <li>
            Publish, then search by title and category. Explore the synthetic
            Atlas marker, QR link and embed preview.
          </li>
          <li>
            On campaign checkout, choose a PayPal Personal sandbox buyer
            account, or test the PayPal-hosted Card Fields if this sandbox
            merchant is eligible. Enter only PayPal-generated test-card details
            into the hosted fields; never use a real card.
          </li>
          <li>
            Approve, return and capture. Record the real PayPal sandbox order
            and capture IDs. Approval alone is not a donation.
          </li>
          <li>
            Open your receipt and dashboards. Platform support has its own
            route, purpose and totals.
          </li>
          <li>
            An administrator separately verifies a genuine signed webhook and
            replay. The protected tracker never exposes operational details to
            anonymous judges.
          </li>
        </ol>
        <p>
          PayPal Card Fields SDK v6 is implemented, but real card approval,
          declines and 3-D Secure outcomes remain unverified until provider
          receipts are recorded. The form appears only when PayPal confirms
          sandbox merchant eligibility. Recurring billing, social publishing
          and AI image improvement remain unverified or unavailable.
        </p>
      </section>
      <section className="panel">
        <h2>
          <Code2 size={22} /> Architecture
        </h2>
        <div className="architecture">
          <span>IFund React frontend</span>
          <b>→</b>
          <span>Isolated Cloudflare Worker</span>
          <b>→</b>
          <span>PayPal Sandbox · Workers AI</span>
          <span>Authenticated demo accounts</span>
          <b>→</b>
          <span>Demo-only Postgres tables</span>
          <b>→</b>
          <span>Atomic ledger + receipt</span>
        </div>
        <p>
          Database tables deny direct browser access. The Worker validates
          ownership and payment purpose. Capture persistence works without
          waiting for a webhook; retries reconcile directly with PayPal.
          Uploaded and generated media use a dedicated R2 bucket.
        </p>
      </section>
      <section className="panel">
        <h2>
          <Video size={22} /> Source & demonstration video
        </h2>
        <p>
          <a href="https://github.com/interplanetarysister/paypal-ai-crowdfunder">
            Public source repository · AGPL-3.0
          </a>
        </p>
        <p>
          Existing public video:{" "}
          <a href="https://www.youtube.com/watch?v=HkxIFqoEKs0">
            InterplanetaryFund campaign creation
          </a>{" "}
          (approximately two minutes). It is linked to the existing submitted
          entry. Its coverage of this standalone sandbox release is unverified.
          The repository includes a replacement end-to-end recording script.
        </p>
        <p>
          <a href="https://paypalaihackathon.devpost.com/rules">
            Official hackathon rules
          </a>{" "}
          list a submission deadline of November 12, 2026, noon Pacific, and
          judging through December 15. Submission and eligibility have not been
          confirmed.
        </p>
        <Link to="/hackathon/tracker">Administrator tracker (protected)</Link>
      </section>
    </>
  );
}
interface Gate {
  gate: string;
  status: string;
  result: string;
  evidence_url: string | null;
  commit_sha: string | null;
  version: number;
}
interface TrackerData {
  gates: Gate[];
  ai_runs: {
    id: string;
    kind: string;
    model: string;
    status: string;
    started_at: string;
    completed_at: string;
  }[];
  events: {
    event_id: string;
    event_type: string;
    verified_at: string;
    delivery_count: number;
  }[];
  release_sha: string;
}
export function Tracker() {
  const { data, error, loading, setData } =
    useData<TrackerData>("/admin/tracker");
  const [edit, setEdit] = useState<Gate | null>(null),
    [fault, setFault] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (!edit) return;
    setBusy(true);
    setFault("");
    try {
      const r = await api<{ gates: Gate[] }>("/admin/tracker", {
        method: "PATCH",
        body: JSON.stringify(edit),
      });
      setData(
        data
          ? {
              ...data,
              gates: data.gates.map((g) =>
                g.gate === edit.gate ? r.gates[0] : g,
              ),
            }
          : null,
      );
      setEdit(null);
    } catch (e) {
      setFault((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Protected administrator workspace</p>
        <h1>Demo verification tracker</h1>
        <p>
          PASS requires actual evidence. Manual status entries are attestations;
          they do not substitute for provider verification.
        </p>
      </header>
      <ErrorBox error={error || fault} />
      {loading && <p role="status">Checking private tracker…</p>}
      {data && (
        <>
          <Notice>
            Judge readiness:{" "}
            {data.gates.every((g) => g.status === "PASS")
              ? "All gates attested; verify evidence before release."
              : "NOT READY — one or more gates lack acceptance evidence."}
          </Notice>
          <p>
            Commit: <code>{data.release_sha}</code>
          </p>
          <div className="gates">
            {data.gates.map((g) => (
              <article className="panel gate" key={g.gate}>
                <div className="section-title">
                  <h2>{g.gate.replaceAll("_", " ")}</h2>
                  <strong className="status-tag">{g.status}</strong>
                </div>
                <p>{g.result}</p>
                {g.evidence_url && (
                  <a href={g.evidence_url} target="_blank" rel="noreferrer">
                    Evidence
                  </a>
                )}
                <button className="secondary small" onClick={() => setEdit(g)}>
                  Record test outcome
                </button>
              </article>
            ))}
          </div>
          {edit && (
            <section className="panel">
              <h2>Edit {edit.gate.replaceAll("_", " ")}</h2>
              <label>
                Test status
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  {["PASS", "FAIL", "BLOCKED", "NOT VERIFIED"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Actual test outcome
                <textarea
                  value={edit.result}
                  onChange={(e) => setEdit({ ...edit, result: e.target.value })}
                />
              </label>
              <label>
                Safe HTTPS evidence link
                <input
                  type="url"
                  value={edit.evidence_url || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, evidence_url: e.target.value })
                  }
                />
              </label>
              <div className="actions">
                <button disabled={busy} onClick={save}>
                  Save evidence
                </button>
                <button className="ghost" onClick={() => setEdit(null)}>
                  Cancel
                </button>
              </div>
            </section>
          )}
          <section className="panel">
            <h2>
              <ShieldCheck size={22} /> AI execution evidence
            </h2>
            {!data.ai_runs.length && <p>No runtime AI executions recorded.</p>}
            {data.ai_runs.map((r) => (
              <article className="transaction" key={r.id}>
                <p>
                  {r.kind} · {r.status}
                  <br />
                  <code>{r.model}</code>
                </p>
                <p>
                  Request: {r.id}
                  <br />
                  {r.started_at} → {r.completed_at || "not completed"}
                </p>
              </article>
            ))}
          </section>
          <section className="panel">
            <h2>Provider-verified webhook events</h2>
            {!data.events.length && (
              <p>No verified signed webhook events recorded.</p>
            )}
            {data.events.map((e) => (
              <p key={e.event_id}>
                {e.event_type} · {e.event_id} · {e.verified_at} ·{" "}
                {e.delivery_count} verified deliveries
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
