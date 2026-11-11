import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChartNoAxesCombined, Globe2, ShieldCheck } from "lucide-react";
import { labels, money, type Campaign } from "./api";
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
  const container = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(() => ({
    count: campaigns.length,
    categories: new Set(campaigns.map((c) => c.category)).size,
    fictionalGoals: campaigns.reduce((sum, c) => sum + Math.max(0, c.goal_cents || 0), 0),
    verifiedSandbox: campaigns.reduce((sum, c) => sum + Math.max(0, c.raised_cents || 0), 0),
    donors: campaigns.reduce((sum, c) => sum + Math.max(0, c.donor_count || 0), 0),
  }), [campaigns]);

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
            <article className="panel"><p>Fictional fundraising goals</p><h2>{money(stats.fictionalGoals)}</h2><small>Target amounts, not donations</small></article>
            <article className="panel"><p>Verified PayPal Sandbox funding</p><h2>{money(stats.verifiedSandbox)}</h2><small>{stats.donors} recorded provider captures · no real funds</small></article>
          </div>
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
