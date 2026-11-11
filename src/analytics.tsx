import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChartNoAxesCombined, Globe2, ShieldCheck } from "lucide-react";
import { api, labels, money, type Campaign } from "./api";
import { Donut, type AgentFocus } from "./charts";
import { summarizeDemoCampaigns } from "./analytics-summary";
import {
  loadCommunityGrid,
  type GridApi,
  type GridWindow,
} from "./finance-grid";
import { useData } from "./pages";
import { ErrorBox, Notice } from "./ui";

/**
 * Public judge exploration view. Everything comes from the already-public
 * fictional campaign API. No donor email, private receipts, owner data or
 * sandbox credentials are transmitted to this page.
 */
export function CampaignAnalytics() {
  const { data, error, loading } = useData<{ campaigns: Campaign[] }>("/campaigns");
  const campaigns = useMemo(() => data?.campaigns || [], [data]);
  const [gridState, setGridState] = useState<"loading" | "ready" | "fallback">("loading");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [agentFocus, setAgentFocus] = useState<AgentFocus | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState("");
  const container = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(() => summarizeDemoCampaigns(campaigns), [campaigns]);
  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId)
      || campaigns.find((c) => c.raised_cents > 0)
      || campaigns[0],
    [campaigns, selectedCampaignId],
  );
  const fundingSlices = useMemo(() => [
    { name: "Verified PayPal Sandbox campaign captures", value: stats.verifiedCampaignCents },
    { name: "Remaining fictional campaign goals", value: stats.remainingGoalCents },
  ], [stats]);
  const categorySlices = useMemo(
    () => stats.categoriesByCount.map(({ category, count }) =>
      ({ name: labels[category] || category, value: count })),
    [stats],
  );
  const agentSlices = useMemo(
    () => (agentFocus?.roles || []).map(({ role, units }) =>
      ({ name: role, value: units })),
    [agentFocus],
  );

  useEffect(() => {
    if (!selectedCampaign?.id) return;
    let active = true;
    setFocusLoading(true);
    setAgentFocus(null);
    setFocusError("");
    api<{ focus: AgentFocus }>("/campaigns/" + selectedCampaign.id + "/focus")
      .then(({ focus }) => {
        if (active) {
          if (focus?.simulated !== true || !Array.isArray(focus.roles))
            throw new Error("Unverified agent focus data");
          setAgentFocus(focus);
        }
      })
      .catch(() => { if (active) setFocusError("Simulated focus data is temporarily unavailable."); })
      .finally(() => { if (active) setFocusLoading(false); });
    return () => { active = false; };
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (!data || !campaigns.length) return;
    let active = true;
    let grid: GridApi | null = null;
    loadCommunityGrid().then(() => {
      if (!active || !container.current) return;
      const ag = (window as GridWindow).agGrid;
      if (!ag) throw Error("AG Grid Community unavailable");
      grid = ag.createGrid(container.current, {
        rowData: campaigns,
        columnDefs: [
          {
            headerName: "Fictional campaign",
            field: "title",
            minWidth: 265,
            cellRenderer: (p: { value?: string; data?: Campaign }) => {
              if (!p.data) return "";
              const a = document.createElement("a");
              a.href = "/campaign/" + encodeURIComponent(p.data.id);
              a.textContent = p.value || "View campaign";
              a.setAttribute("aria-label", "View campaign funding and agent charts");
              return a;
            },
          },
          {
            headerName: "Category", field: "category", minWidth: 160,
            valueFormatter: (p: { value?: string }) => labels[p.value || ""] || p.value || "Other",
          },
          { headerName: "Fictional organizer", field: "organizer", minWidth: 190 },
          { headerName: "Synthetic location", field: "location", minWidth: 210 },
          {
            headerName: "Fictional goal", field: "goal_cents", minWidth: 145,
            valueFormatter: (p: { value?: number }) => money(p.value || 0),
          },
          {
            headerName: "Verified sandbox captured", field: "raised_cents", minWidth: 205,
            valueFormatter: (p: { value?: number }) => money(p.value || 0),
          },
          {
            headerName: "Progress", minWidth: 120,
            valueGetter: (p: { data?: Campaign }) =>
              Math.min(100, Math.round(100 * (p.data?.raised_cents || 0) / Math.max(1, p.data?.goal_cents || 1))),
            valueFormatter: (p: { value?: number }) => (p.value || 0) + "%",
          },
          { headerName: "Verified captures", field: "donor_count", minWidth: 155 },
        ],
        defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
        getRowId: (p: { data: Campaign }) => p.data.id,
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 25, 50, 100],
        domLayout: "autoHeight",
        animateRows: false,
      });
      setGridState("ready");
    }).catch(() => {
      if (active) setGridState("fallback");
    });
    return () => { active = false; grid?.destroy(); };
  }, [campaigns, data]);

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">PayPal AI Hackathon · public judge workspace</p>
        <h1>Campaign mission analytics</h1>
        <p>
          Explore the existing fictional campaigns in AG Grid Community. This public view
          requires no login, no PayPal transaction, and no paid AG Grid license.
        </p>
        <div className="actions">
          <Link className="button secondary" to="/hackathon">Return to guided demo</Link>
          <Link className="button secondary" to="/map"><Globe2 size={16}/> Rotate the campaign globe</Link>
          <Link className="button secondary" to="/discover"><ChartNoAxesCombined size={16}/> Explore campaign cards</Link>
        </div>
      </header>
      <Notice>
        All campaigns, goals, organizers and places shown here are fictional.
        Only PayPal Sandbox provider-verified captures can change collected amounts.
        Simulated agent attention appears separately on each campaign page.
      </Notice>
      <ErrorBox error={error} />
      {loading && <p role="status">Loading public demo campaigns…</p>}
      {data && (
        <>
          <div className="stats">
            <article className="panel"><p>Fictional campaigns</p><h2>{stats.count}</h2><small>Published demo records</small></article>
            <article className="panel"><p>Fictional fundraising goals</p><h2>{money(stats.fictionalGoalsCents)}</h2><small>Target amounts, not donations</small></article>
            <article className="panel"><p>Verified PayPal Sandbox funding</p><h2>{money(stats.verifiedCampaignCents)}</h2><small>{stats.capturedDonationCount} recorded provider captures · no real funds</small></article>
          </div>
          <section className="partner-chart-section" data-judge="analytics-charts" aria-label="Partner integrations with real AG Charts Community visualizations">
            <div className="partner-charts-heading">
              <div>
                <p className="eyebrow">Partner technology · AG Charts Community</p>
                <h2>Interactive campaign and agent-focus charts</h2>
                <p>These donuts are rendered by AG Charts Community, alongside the AG Grid explorer below.
                  Funding reflects only captured PayPal Sandbox campaign donations.
                  All campaign goals and agent-focus units are fictional.</p>
              </div>
              <Link className="button secondary" to="/map"><Globe2 size={16}/> Explore the interactive Atlas</Link>
            </div>
            <div className="partner-charts-grid">
              <article className="panel partner-chart-card">
                <p className="eyebrow">AG Charts · Verified sandbox data</p>
                <h3>Campaign funding versus goals</h3>
                <Donut
                  values={fundingSlices}
                  formatValue={money}
                  label={money(stats.verifiedCampaignCents) + " provider-verified sandbox campaign funds from " +
                    money(stats.fictionalGoalsCents) + " in fictional goals"}
                />
                <p className="meta">Only provider-verified campaign captures appear as funding.
                  Platform-support payments and unverified orders are excluded. No real money.</p>
              </article>
              <article className="panel partner-chart-card">
                <p className="eyebrow">AG Charts · Fictional published content</p>
                <h3>Campaign distribution by cause</h3>
                <Donut values={categorySlices} label={campaigns.length + " fictional campaigns grouped by category"}/>
                <p className="meta">Counts represent published fictional campaigns, not contributions or verified donors.</p>
              </article>
              <article className="panel partner-chart-card">
                <p className="eyebrow">AG Charts · Simulated agent attention</p>
                <h3>Agent focus by role</h3>
                <label className="partner-focus-select">Choose a fictional campaign
                  <select value={selectedCampaign?.id || ""} onChange={(event) => setSelectedCampaignId(event.target.value)}>
                    {campaigns.map((campaign) =>
                      <option value={campaign.id} key={campaign.id}>{campaign.title}</option>)}
                  </select>
                </label>
                {focusLoading && <p role="status">Loading isolated fictional agent-role allocations…</p>}
                {focusError && <p role="alert">{focusError}</p>}
                {agentFocus && (
                  <>
                    <Donut values={agentSlices} label={"Simulated agent-role distribution for " + selectedCampaign.title} />
                    <p><strong>{agentFocus.campaign_units}</strong> simulated attention units on this campaign,
                      out of <strong>{agentFocus.platform_units}</strong> across the fictional demo.</p>
                    <Link className="button small secondary" to={"/campaign/" + selectedCampaign.id}>Inspect campaign charts</Link>
                  </>
                )}
                <p className="meta">These are seeded demonstration units only—not time, autonomous work,
                  deployed agents, or financial expenditures.</p>
              </article>
            </div>
          </section>
          <section className="panel">
            <h2><ChartNoAxesCombined size={22}/> AG Grid Community explorer</h2>
            <p>
              Filter by category, search campaign titles, sort funding progress, or
              open a campaign to view its funding and simulated agent-focus donuts.
            </p>
            <p className="meta"><ShieldCheck size={15}/> {stats.categories} fictional categories · Only public campaign fields · No payment credentials or donor records</p>
            {gridState === "loading" && <p role="status">Loading interactive AG Grid Community…</p>}
            {gridState === "fallback" && <p role="status">The interactive grid is unavailable; the accessible campaign list below still works.</p>}
            <div className="public-analytics-grid" data-judge="analytics-grid" role="region" aria-label="Sortable and filterable fictional campaign analytics" tabIndex={0}>
              <div ref={container} className="public-ag-grid"/>
            </div>
            <details className="finance-accessible-history">
              <summary>Accessible text list of all {campaigns.length} fictional campaigns</summary>
              <ul className="public-analytics-fallback">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <Link to={"/campaign/" + c.id}>{c.title}</Link>
                    <span>{labels[c.category] || c.category} · {money(c.raised_cents || 0)} verified sandbox · {money(c.goal_cents)} fictional goal</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </>
      )}
    </>
  );
}
