import { useEffect, useMemo, useRef, useState } from "react";
import { api, money, type Campaign } from "./api";

// AG Charts Community's pinned UMD distribution contains the free donut series.
// It is loaded only when a campaign chart is displayed; Enterprise is never loaded.
const CDN = "https://cdn.jsdelivr.net/npm/ag-charts-community@14.2.0/dist/umd/ag-charts-community.min.js";
type ChartInstance = { destroy(): void };
type ChartAPI = { create(options: Record<string, unknown>): ChartInstance };
type ChartsWindow = Window & { agCharts?: { AgCharts: ChartAPI } };
let loading: Promise<void> | null = null;

function loadCharts(): Promise<void> {
  if ((window as ChartsWindow).agCharts?.AgCharts) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CDN;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => (window as ChartsWindow).agCharts?.AgCharts
        ? resolve()
        : reject(new Error("AG Charts Community did not initialize"));
      script.onerror = () => reject(new Error("AG Charts Community could not be loaded"));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

interface Segment {
  name: string;
  value: number;
}

function Donut({ values, label }: { values: Segment[]; label: string }) {
  const element = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const chartValues = useMemo(() => values.filter((value) => value.value > 0), [values]);
  useEffect(() => {
    let active = true;
    let instance: ChartInstance | null = null;
    loadCharts().then(() => {
      if (!active || !element.current) return;
      const api = (window as ChartsWindow).agCharts?.AgCharts;
      if (!api) throw new Error("Chart engine unavailable");
      instance = api.create({
        container: element.current,
        data: chartValues,
        height: 270,
        background: { fill: "#ffffff" },
        legend: { position: "bottom" },
        series: [{
          type: "donut",
          angleKey: "value",
          legendItemKey: "name",
          calloutLabelKey: "name",
          innerRadiusRatio: 0.72,
          calloutLabel: { enabled: false },
        }],
      });
      setError("");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Chart rendering unavailable");
    });
    return () => { active = false; instance?.destroy(); };
  }, [chartValues]);
  return (
    <div className="demo-chart">
      <div ref={element} role="img" aria-label={label} className="demo-chart-canvas" />
      {error && <p className="meta" role="status">Chart unavailable: {error}. Data remains accessible below.</p>}
      <ul className="chart-values">
        {values.map(({ name, value }) => <li key={name}><span>{name}</span><strong>{value.toLocaleString("en-US")}</strong></li>)}
      </ul>
    </div>
  );
}

export interface AgentFocus {
  simulated: true;
  campaign_units: number;
  platform_units: number;
  roles: { role: string; units: number }[];
}

export function CampaignCharts({ campaign }: { campaign: Campaign }) {
  const [focus, setFocus] = useState<AgentFocus | null>(null);
  const [focusError, setFocusError] = useState("");
  useEffect(() => {
    let active = true;
    setFocus(null);
    setFocusError("");
    api<{ focus: AgentFocus }>("/campaigns/" + campaign.id + "/focus")
      .then((result) => { if (active) setFocus(result.focus); })
      .catch((e: unknown) => {
        if (active) setFocusError(e instanceof Error ? e.message : "Demo allocation data unavailable");
      });
    return () => { active = false; };
  }, [campaign.id]);

  const received = Math.max(0, campaign.raised_cents || 0);
  const outstanding = Math.max(0, campaign.goal_cents - received);
  const funding = useMemo(() => [
    { name: "Verified sandbox captures", value: received },
    { name: "Remaining fictional goal", value: outstanding },
  ], [received, outstanding]);
  const roles = useMemo(() =>
    (focus?.roles || []).map(({ role, units }) => ({ name: role, value: units })), [focus]);

  return (
    <section className="campaign-chart-grid" aria-label="Campaign analytics">
      <article className="panel">
        <p className="eyebrow">AG Charts Community · PayPal Sandbox</p>
        <h2>Fundraising progress</h2>
        <Donut values={funding} label={money(received) + " verified sandbox contributions; " + money(outstanding) + " remaining fictional goal"} />
        <p><strong>{money(received)}</strong> verified from a {money(campaign.goal_cents)} fictional goal.</p>
        <p className="meta">Only PayPal provider-verified captures are counted. No real funds, seeded donations or withdrawals.</p>
      </article>
      <article className="panel">
        <p className="eyebrow">AG Charts Community · SIMULATED</p>
        <h2>Agent attention by role</h2>
        {focus ? (
          <>
            <Donut values={roles} label={"Simulated role focus for " + campaign.title} />
            <p><strong>{focus.campaign_units}</strong> fictional attention units for this campaign of <strong>{focus.platform_units}</strong> across the demo.</p>
            <p className="meta">These units are deterministic demonstration allocations, NOT time spent, autonomous agents, or measured work.</p>
          </>
        ) : <p role="status">{focusError || "Loading isolated simulated agent-focus records…"}</p>}
      </article>
    </section>
  );
}
