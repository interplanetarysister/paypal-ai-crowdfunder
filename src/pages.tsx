import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Compass,
  Copy,
  Globe2,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, post, money, labels, DISCLOSURE, type Campaign } from "./api";
import { Brand, ErrorBox, Notice, useSession } from "./ui";
import { CampaignCharts } from "./charts";
import { CampaignGlobe } from "./globe";
import { SandboxCardFields } from "./card-fields";
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return { data, error, loading, setData };
}
export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  return (
    <Link className="campaign-card" to={"/campaign/" + c.id}>
      <div className={"cover " + c.category}>
        <img
          src={c.image_path || "/images/cosmic-hero.png"}
          alt={
            c.image_path
              ? `Fictional illustration for ${c.title}`
              : "Original IFund cosmic artwork; campaign-specific artwork not generated"
          }
        />
        <span className="cover-tag">Fictional campaign</span>
      </div>
      <div className="card-body">
        <p className="eyebrow">{labels[c.category]}</p>
        <h2>{c.title}</h2>
        <p className="summary">{c.summary}</p>
        <div
          className="progress"
          role="progressbar"
          aria-label="Verified sandbox funding"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(
            100,
            Math.round(((c.raised_cents || 0) / c.goal_cents) * 100),
          )}
        >
          <span
            style={{
              width:
                Math.min(100, ((c.raised_cents || 0) / c.goal_cents) * 100) +
                "%",
            }}
          />
        </div>
        <p className="funds">
          <strong>{money(c.raised_cents || 0)}</strong> sandbox collected{" "}
          <span>of {money(c.goal_cents)}</span>
        </p>
        <p className="meta">
          <MapPin size={13} />
          {c.location} · Synthetic
        </p>
        <small className="disclosure">{DISCLOSURE}</small>
      </div>
    </Link>
  );
}
export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">A universe of possibility</p>
          <Brand />
          <h1>
            Endless possibilities start
            <br />
            with one question:
            <br />
            <span>What if?</span>
          </h1>
          <p>One place to ask for help — or make something possible.</p>
          <div className="actions center">
            <Link className="button" to="/create">
              <Sparkles size={17} />
              Start a campaign
            </Link>
            <Link className="button outline" to="/discover">
              <Compass size={17} />
              Explore causes
            </Link>
          </div>
          <div className="hero-note">
            <h2>A new universe. A safe place to explore.</h2>
            <p>
              Create a fictional cause with AI. Follow a donation from PayPal
              Sandbox approval to a verified receipt.
            </p>
            <Link className="button cyan" to="/hackathon">
              Start the judge walkthrough <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="story-section">
        <p className="eyebrow">Who is Interplanetary Fund?</p>
        <h2>
          One universe of funding — for every person, every cause, every
          platform.
        </h2>
        <p>
          What if a person with an important idea could spend less time writing
          a fundraiser and more time making it happen? Interplanetary Fund
          brings campaign creation, discovery and contribution records into one
          place.
        </p>
        <p>
          This independent demonstration preserves the IFund experience with
          fictional campaigns, AI-assisted writing and PayPal Sandbox. Financial
          totals begin at zero and grow only after a provider-verified sandbox
          capture.
        </p>
        <div className="feature-grid">
          <article>
            <Sparkles />
            <h3>Your story, with a little help</h3>
            <p>
              Five titles, two descriptions and an editable story. You choose
              what to publish.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <h3>Every contribution accounted for</h3>
            <p>
              Server verification, an idempotent ledger and a receipt for
              completed sandbox captures.
            </p>
          </article>
          <article>
            <Globe2 />
            <h3>Discover a world of possibilities</h3>
            <p>
              Browse fictional causes and explore their synthetic locations on
              Atlas.
            </p>
          </article>
        </div>
        <div className="actions">
          <Link className="button" to="/discover">
            Explore the demo
          </Link>
          <Link className="button secondary" to="/support">
            <Heart size={16} />
            Support IFund · Sandbox
          </Link>
        </div>
      </section>
    </>
  );
}
export function Discovery({ map = false }: { map?: boolean }) {
  const { data, error, loading } = useData<{ campaigns: Campaign[] }>(
      "/campaigns",
    ),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("");
  const campaigns = (data?.campaigns || []).filter(
    (c) =>
      (!category || c.category === category) &&
      (c.title + " " + c.summary + " " + c.organizer)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">One campaign. Connected possibilities.</p>
        <h1>{map ? "Atlas of possibility" : "Explore causes"}</h1>
        <p>
          Find a fictional cause that speaks to you. Every location and
          organizer in this demo is synthetic.
        </p>
      </header>
      <div className="toolbar">
        <label className="search">
          Search campaigns
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, story or organizer"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All causes</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <Link className="button secondary" to={map ? "/discover" : "/map"}>
          {map ? <Compass size={18} /> : <Globe2 size={18} />}{" "}
          {map ? "Cards" : "Atlas"}
        </Link>
      </div>
      <ErrorBox error={error} />
      {loading && <p role="status">Discovering campaigns…</p>}
      {map && <CampaignGlobe campaigns={campaigns} />}
      {!loading && !error && (
        <p className="meta" role="status">
          {campaigns.length} fictional{" "}
          {campaigns.length === 1 ? "campaign" : "campaigns"}
        </p>
      )}
      <div className="campaign-grid">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
      {!loading && !error && !campaigns.length && (
        <div className="empty panel">
          <h2>No campaigns found</h2>
          <p>Try another search, or create a fictional campaign of your own.</p>
          <Link to="/create" className="button">
            Create a demo campaign
          </Link>
        </div>
      )}
    </>
  );
}
export function Details() {
  const { id } = useParams();
  const { data, error, loading } = useData<{ campaign: Campaign }>(
    "/campaigns/" + id,
  );
  const { user } = useSession();
  const c = data?.campaign;
  return (
    <>
      <Link className="back" to="/discover">
        ← Explore causes
      </Link>
      <ErrorBox error={error} />
      {loading && <p role="status">Loading campaign…</p>}
      {c && (
        <>
          <Notice>{DISCLOSURE}</Notice>
          <div className="details-grid">
            <article>
              <div className="detail-cover">
                <img
                  src={c.image_path || "/images/cosmic-hero.png"}
                  alt={
                    c.image_path
                      ? "Fictional campaign illustration"
                      : "IFund cosmic artwork; no campaign-specific image generated"
                  }
                />
              </div>
              <p className="eyebrow">{labels[c.category]}</p>
              <h1>{c.title}</h1>
              <p className="lead">{c.summary}</p>
              <p className="meta">
                <MapPin size={16} />
                {c.location} · Synthetic location
              </p>
              <p>
                Organized by{" "}
                {c.owner_id ? (
                  <Link to={"/organizer/" + c.owner_id}>{c.organizer}</Link>
                ) : (
                  c.organizer
                )}{" "}
                · Fictional identity
              </p>
              {c.story.map((s, i) => (
                <section className="story-part" key={i}>
                  <h2>{s.heading}</h2>
                  <p>{s.text}</p>
                </section>
              ))}
              <p className="meta">
                Campaign copy is editable fictional demonstration content. AI
                runtime execution is evidenced separately in the tracker.
              </p>
            </article>
            <aside className="panel donation-panel">
              <p className="eyebrow">Sandbox donations</p>
              <h2>{money(c.raised_cents || 0)}</h2>
              <p>verified sandbox captures of {money(c.goal_cents)} goal</p>
              <div className="progress">
                <span
                  style={{
                    width:
                      Math.min(
                        100,
                        ((c.raised_cents || 0) / c.goal_cents) * 100,
                      ) + "%",
                  }}
                />
              </div>
              <p>{c.donor_count || 0} demo donors</p>
              <Link className="button paypal" to={"/checkout?campaign=" + c.id}>
                Donate with PayPal Sandbox
              </Link>
              <Link className="button secondary" to={"/share/" + c.id}>
                <Share2 size={17} />
                Share this possibility
              </Link>
              <small className="disclosure">{DISCLOSURE}</small>
              <p className="meta">
                Only completed, provider-verified captures count. No real money
                or withdrawable balance.
              </p>
              {user?.id === c.owner_id && (
                <Link className="button secondary" to={"/create?draft=" + c.id}>
                  Edit campaign
                </Link>
              )}
            </aside>
          </div>
          <CampaignCharts campaign={c} />
        </>
      )}
    </>
  );
}
export function Organizer() {
  const { id } = useParams();
  const { data, error, loading } = useData<{ campaigns: Campaign[] }>(
    "/organizers/" + id,
  );
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Fictional organizer</p>
        <h1>{data?.campaigns[0]?.organizer || "Organizer profile"}</h1>
        <p>
          This profile and its locations are synthetic demonstration content.
        </p>
      </header>
      <ErrorBox error={error} />
      {loading && <p role="status">Loading organizer…</p>}
      <div className="campaign-grid">
        {data?.campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
    </>
  );
}
export function Embed() {
  const { id } = useParams();
  const { data, error } = useData<{ campaign: Campaign }>("/campaigns/" + id);
  return (
    <section className="embed">
      <ErrorBox error={error} />
      {data && <CampaignCard campaign={data.campaign} />}
      <p>
        <Link to="/hackathon">Interplanetary Fund · Sandbox demo</Link>
      </p>
    </section>
  );
}
export function Share() {
  const { id } = useParams();
  const { data, error } = useData<{ campaign: Campaign }>("/campaigns/" + id);
  const [message, setMessage] = useState("");
  const url = window.location.origin + "/campaign/" + id;
  const embed = `<iframe src="${window.location.origin}/embed/${id}" title="Fictional IFund sandbox campaign" width="380" height="600" loading="lazy"></iframe>`;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Clipboard is unavailable. Select and copy the text below.");
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">Share a possibility</p>
      <h1>{data?.campaign.title || "Share this campaign"}</h1>
      <Notice>{DISCLOSURE}</Notice>
      <ErrorBox error={error} />
      <div className="qr">
        <QRCodeSVG
          value={url}
          size={180}
          title="QR code for this fictional sandbox campaign"
          marginSize={4}
        />
      </div>
      <label>
        Shareable demo link
        <input readOnly value={url} />
      </label>
      <div className="actions">
        <button onClick={() => copy(url)}>
          <Copy size={16} />
          Copy link
        </button>
        {typeof navigator.share === "function" && (
          <button
            className="secondary"
            onClick={() =>
              navigator
                .share({ title: data?.campaign.title, text: DISCLOSURE, url })
                .catch(() => setMessage("Sharing was cancelled."))
            }
          >
            <Share2 size={16} />
            Share
          </button>
        )}
      </div>
      <h2>Embed preview</h2>
      <label>
        Campaign embed code
        <textarea readOnly value={embed} />
      </label>
      <button className="secondary" onClick={() => copy(embed)}>
        Copy embed code
      </button>
      <Link className="back" to={"/embed/" + id}>
        Open embed preview →
      </Link>
      <p role="status">{message}</p>
      <p className="meta">
        Social publishing integrations are unavailable. Sharing opens your
        device’s sharing menu when supported.
      </p>
    </section>
  );
}
interface ReceiptResult {
  receipt_id: string;
  capture_id: string;
  order_id: string;
  amount_cents: number;
  purpose: string;
  status: string;
  message?: string;
}
export function Checkout({ support = false }: { support?: boolean }) {
  const navigate = useNavigate();
  const [q] = useSearchParams(),
    campaignId = q.get("campaign"),
    orderId = q.get("id");
  const { status } = useSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null),
    [amount, setAmount] = useState("5.00"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  useEffect(() => {
    if (campaignId)
      api<{ campaign: Campaign }>("/campaigns/" + campaignId)
        .then((r) => setCampaign(r.campaign))
        .catch((e) => setError(e.message));
  }, [campaignId]);
  useEffect(() => {
    if (orderId && q.get("paypal") === "cancelled")
      post("/paypal/orders/" + orderId + "/cancel", {})
        .then(() => {
          sessionStorage.removeItem("ifund-checkout-intent");
          setMessage(
            "Checkout cancelled. No successful payment has been inferred.",
          );
        })
        .catch((e) => setError(e.message));
  }, [orderId, q]);
  async function begin() {
    setBusy(true);
    setError("");
    try {
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(amount))
        throw Error("Enter a USD amount between $1 and $100.");
      const cents = Math.round(Number(amount) * 100);
      if (cents < 100 || cents > 10000)
        throw Error("Enter a USD amount between $1 and $100.");
      const fingerprint = (support ? "support" : campaignId) + ":" + cents;
      let intent: { fingerprint: string; key: string } | null = null;
      try {
        intent = JSON.parse(
          sessionStorage.getItem("ifund-checkout-intent") || "null",
        );
      } catch {
        /* start a new intent */
      }
      if (intent?.fingerprint !== fingerprint) {
        intent = { fingerprint, key: crypto.randomUUID() };
        sessionStorage.setItem("ifund-checkout-intent", JSON.stringify(intent));
      }
      const r = await post<{
        id: string;
        approval_url: string;
        status: string;
      }>("/paypal/orders", {
        purpose: support ? "platform_support" : "campaign",
        campaign_id: support ? null : campaignId,
        amount_cents: cents,
        key: intent.key,
      });
      if (r.status === "captured")
        throw Error(
          "This checkout is already captured. View its receipt in your dashboard.",
        );
      const target = new URL(r.approval_url);
      if (
        target.protocol !== "https:" ||
        !["www.sandbox.paypal.com", "sandbox.paypal.com"].includes(
          target.hostname,
        )
      )
        throw Error("Unexpected approval destination");
      window.location.assign(target.href);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function capture(reconcile = false) {
    if (!orderId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await post<ReceiptResult>(
        "/paypal/orders/" + orderId + (reconcile ? "/reconcile" : "/capture"),
        {},
      );
      if (r.status === "captured") {
        setReceipt(r);
        sessionStorage.removeItem("ifund-checkout-intent");
        const clean = new URL(window.location.href);
        clean.searchParams.delete("token");
        clean.searchParams.delete("PayerID");
        clean.searchParams.delete("paypal");
        window.history.replaceState({}, "", clean.pathname + clean.search);
      } else
        setMessage(
          r.message || "Pending verification. No collected funds are counted.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel checkout narrow">
      <p className="eyebrow">PayPal Sandbox · No real funds</p>
      <h1>
        {support
          ? "Support Interplanetary Fund — Sandbox Demo"
          : orderId
            ? "Verify your sandbox payment"
            : campaign?.title || "Campaign donation"}
      </h1>
      <Notice>{DISCLOSURE}</Notice>
      <p>
        {support
          ? "Platform-support contributions help demonstrate IFund operational support. They are never assigned to a campaign beneficiary."
          : "This payment supports a fictional campaign in the isolated demo ledger."}
      </p>
      <p className="meta">
        Use an eligible Personal sandbox buyer distinct from the receiving
        merchant. Do not enter live PayPal credentials or real card details.
      </p>
      <ErrorBox error={error} />
      {message && <Notice>{message}</Notice>}
      {!orderId ? (
        <>
          <label>
            Donation amount (USD)
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-describedby="amount-help"
            />
          </label>
          <p id="amount-help" className="meta">
            $1 to $100 · One-time sandbox contribution
          </p>
          <div className="amounts">
            {["1.00", "5.00", "10.00", "25.00"].map((a) => (
              <button
                className={amount === a ? "selected secondary" : "secondary"}
                key={a}
                onClick={() => setAmount(a)}
              >
                {money(Number(a) * 100)}
              </button>
            ))}
          </div>
          <button
            className="paypal full"
            disabled={
              busy || !status?.payments_configured || (!support && !campaign)
            }
            onClick={begin}
          >
            {busy ? "Connecting to PayPal…" : "Continue with sandbox PayPal account"}
          </button>
          <SandboxCardFields
            amount={amount}
            support={support}
            campaignId={campaignId}
            enabled={!!status?.payments_configured && (support || !!campaign)}
            onCaptured={(result) => {
              setError("");
              setReceipt(result);
              setMessage("Sandbox card capture and receipt confirmed by PayPal and IFund.");
              // Card checkouts have no PayPal redirect query parameter; navigate
              // explicitly so the verified receipt is visible to the donor.
              navigate("/receipts/" + encodeURIComponent(result.receipt_id));
            }}
          />
          {!status?.payments_configured && (
            <Notice>
              Sandbox merchant credentials and webhook access are not
              configured. No payment can be completed yet.
            </Notice>
          )}
        </>
      ) : !receipt ? (
        <>
          <p>
            Returning from PayPal approval does not mean a donation completed.
            The server must capture, verify the provider response and persist
            the canonical receipt.
          </p>
          <button disabled={busy} onClick={() => capture()}>
            {busy ? "Verifying…" : "Verify and capture sandbox payment"}
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => capture(true)}
          >
            Reconcile an interrupted payment
          </button>
        </>
      ) : (
        <div className="receipt-success" role="status">
          <Check size={32} />
          <h2>Verified sandbox receipt</h2>
          <p>
            {money(receipt.amount_cents)} ·{" "}
            {receipt.purpose === "platform_support"
              ? "Platform support"
              : "Campaign donation"}
          </p>
          <p>
            Order: {receipt.order_id}
            <br />
            Capture: {receipt.capture_id}
          </p>
          <Link className="button" to={"/receipts/" + receipt.receipt_id}>
            View receipt
          </Link>
        </div>
      )}
      <p className="meta">
        PayPal determines which sandbox payment methods are eligible. Hosted
        card entry is attempted only when PayPal SDK v6 confirms merchant
        eligibility; card capture is never assumed. Venmo, recurring payments,
        subscriptions, withdrawals and payouts are unavailable.
      </p>
      <Link className="back" to="/dashboard">
        View donor records →
      </Link>
    </section>
  );
}
export function Receipt() {
  const { id } = useParams();
  const { data, error } = useData<{
    receipt: {
      id: string;
      capture_id: string;
      paypal_order_id: string;
      amount_cents: number;
      purpose: string;
      title: string;
      issued_at: string;
      disclosure: string;
    };
  }>("/receipts/" + id);
  const r = data?.receipt;
  return (
    <section className="panel narrow">
      <p className="eyebrow">Interplanetary Fund receipt</p>
      <h1>Sandbox contribution receipt</h1>
      <ErrorBox error={error} />
      {r && (
        <>
          <Notice>{r.disclosure}</Notice>
          <h2>{money(r.amount_cents)}</h2>
          <p>{r.title}</p>
          <dl>
            <dt>Purpose</dt>
            <dd>
              {r.purpose === "platform_support"
                ? "Platform-support contribution"
                : "Fictional campaign donation"}
            </dd>
            <dt>PayPal order</dt>
            <dd>{r.paypal_order_id}</dd>
            <dt>PayPal capture</dt>
            <dd>{r.capture_id}</dd>
            <dt>Receipt</dt>
            <dd>{id}</dd>
            <dt>Issued</dt>
            <dd>{new Date(r.issued_at).toLocaleString()}</dd>
          </dl>
          <p>
            Only a provider-verified completed capture can produce this receipt.
            No real funds were transferred. This is not a tax receipt.
          </p>
          <button className="secondary" onClick={() => window.print()}>
            Print / save receipt
          </button>
        </>
      )}
    </section>
  );
}
