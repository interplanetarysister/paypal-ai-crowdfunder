import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleHelp, X } from "lucide-react";
import { api, type Campaign } from "./api";

type Step = { title: string; instruction: string; route: string; target: string; optional?: string };
const GUIDE_KEY = "ifund-judge-guide-v2";
const steps: Step[] = [
  {
    title: "Launch AI campaign studio",
    instruction: "Select the circled Create a fictional campaign button. The wizard opens without a paid account.",
    route: "/hackathon",
    target: '[data-judge="create-link"]',
  },
  {
    title: "Describe a fictional cause",
    instruction: "Write a short invented need in the circled field. A demo login is required to generate AI content; the draft stays in your browser.",
    route: "/create",
    target: '[data-judge="campaign-context"]',
  },
  {
    title: "Explore every fictional campaign",
    instruction: "Open the circled public AG Grid explorer. Sort, filter and click a campaign to inspect its data. No sign-in is required.",
    route: "/hackathon",
    target: '[data-judge="analytics-link"]',
  },
  {
    title: "Inspect partner AG Charts donuts",
    instruction: "Review the circled funding, category and agent-focus charts. Choose a campaign under Agent focus to change its simulated role allocations. Only PayPal-verified sandbox campaign captures count as funding.",
    route: "/hackathon/analytics",
    target: '[data-judge="analytics-charts"]',
  },
  {
    title: "Filter the AG Grid dashboard",
    instruction: "Sort or filter the highlighted AG Grid table. Fictional goals, provider-verified Sandbox captures and capture counts appear in separate columns. Select a campaign name for details.",
    route: "/hackathon/analytics",
    target: '[data-judge="analytics-grid"]',
  },
  {
    title: "Spin the campaign globe",
    instruction: "Drag the circled globe or use the rotate arrows; select a glowing marker to find that fictional campaign on the map.",
    route: "/map",
    target: '[data-judge="atlas-globe"]',
  },
  {
    title: "See campaign funding and agent charts",
    instruction: "The circled charts show verified sandbox fundraising separately from explicitly simulated agent-focus units. No mock money is credited.",
    route: "/campaign/{campaign}",
    target: '[data-judge="campaign-charts"]',
  },
  {
    title: "Try isolated PayPal Sandbox checkout",
    instruction: "Select the circled donation button. Sign in with a separate fictional demo account if prompted, then use a Personal Sandbox buyer distinct from the merchant. Never enter a live card.",
    route: "/campaign/{campaign}",
    target: '[data-judge="sandbox-donate"]',
  },
  {
    title: "Check receipts and reconciliation",
    instruction: "Only a provider-verified Sandbox capture creates a receipt and a balanced ledger. Use the circled Dashboard link after signing in; no real funds or withdrawals.",
    route: "/dashboard",
    target: '[data-judge="finance-grid"]',
  },
  {
    title: "Finish the walkthrough",
    instruction: "You have seen the AI wizard, AG Grid campaign explorer, Atlas, AG Charts donuts and PayPal Sandbox evidence. Any unavailable feature is stated openly; provider card and webhook replay tests are not certified.",
    route: "/hackathon",
    target: '[data-judge="judge-guide"]',
  },
];

function restore(): { active: boolean; index: number } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GUIDE_KEY) || "{}") as { active?: boolean; index?: number };
    return { active: saved.active === true, index: Number.isInteger(saved.index) ? Math.max(0, Math.min(steps.length - 1, saved.index!)) : 0 };
  } catch { return { active: false, index: 0 }; }
}
export function GuidedDemoOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(restore);
  const [firstCampaign, setFirstCampaign] = useState<string | null>(null);
  const [targetBounds, setTargetBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    const start = () => setState({ active: true, index: 0 });
    window.addEventListener("ifund-start-judge-tour", start);
    return () => window.removeEventListener("ifund-start-judge-tour", start);
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(GUIDE_KEY, JSON.stringify(state)); } catch { /* browsing still works */ }
  }, [state]);
  useEffect(() => {
    if (!state.active || firstCampaign) return;
    let cancelled = false;
    api<{ campaigns: Campaign[] }>("/campaigns")
      .then(({ campaigns }) => {
        if (!cancelled) setFirstCampaign(campaigns.find(c => c.status === "published")?.id || null);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [firstCampaign, state.active]);
  const routeFor = useCallback((step: Step) => {
    return step.route.replace("{campaign}", firstCampaign || "");
  }, [firstCampaign]);

  const jump = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(steps.length - 1, index));
    setState({ active: true, index: bounded });
    const next = routeFor(steps[bounded]);
    if (!next.includes("{") && next !== location.pathname) navigate(next);
  }, [location.pathname, navigate, routeFor]);

  useEffect(() => {
    if (!state.active) { setTargetBounds(null); return; }
    const current = steps[state.index];
    const expected = routeFor(current);
    if (expected.includes("{") || location.pathname !== expected) {
      setTargetBounds(null);
      return;
    }
    let previous: Element | null = null;
    const update = () => {
      const target = document.querySelector(current.target);
      if (previous !== target) {
        previous?.classList.remove("judge-circled-target");
        previous = target;
        previous?.classList.add("judge-circled-target");
      }
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) setTargetBounds(rect);
        else setTargetBounds(null);
      } else setTargetBounds(null);
    };
    const timer = window.setInterval(update, 500);
    update();
    return () => { clearInterval(timer); previous?.classList.remove("judge-circled-target"); };
  }, [state.active, state.index, location.pathname, routeFor]);

  if (!state.active) return null;
  const step = steps[state.index];
  const expected = routeFor(step);
  const onRoute = expected === location.pathname;
  const missingCampaign = expected.endsWith("/campaign/") && !firstCampaign;
  return (
    <>
      {onRoute && targetBounds && (
        <div className="judge-visual-ring" aria-hidden="true" style={{
          top: targetBounds.top - 8, left: targetBounds.left - 8,
          width: targetBounds.width + 16, height: targetBounds.height + 16,
        }} />
      )}
      <aside className="judge-coach" role="region" aria-label="Guided hackathon judge walkthrough" aria-live="polite">
        <div className="judge-coach-head">
          <span><CircleHelp size={17} /> Guided demo · Step {state.index + 1} of {steps.length}</span>
          <button type="button" className="ghost" aria-label="Close guided walkthrough" onClick={() => setState({ active: false, index: 0 })}><X size={17}/></button>
        </div>
        <div className="judge-progress" role="progressbar" aria-label="Tour progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={state.index + 1}>
          <span style={{ width: ((state.index + 1) / steps.length * 100) + "%" }} />
        </div>
        <h2>{step.title}</h2>
        <p>{step.instruction}</p>
        {!onRoute && <p className="judge-hint">Select “Open highlighted step” to go to this screen.</p>}
        {onRoute && targetBounds && <p className="judge-hint">Look for the pulsing cyan circle. Select the highlighted item or continue below.</p>}
        {onRoute && !targetBounds && !missingCampaign && <p className="judge-hint">This control may require signing in or loading campaign data. You can still continue without a payment.</p>}
        <div className="judge-coach-actions">
          <button type="button" className="secondary" disabled={state.index === 0} onClick={() => jump(state.index - 1)}><ArrowLeft size={15}/> Back</button>
          {!onRoute && !missingCampaign &&
            <button type="button" className="secondary" onClick={() => navigate(expected)}>Open highlighted step</button>}
          {state.index === steps.length - 1 ?
            <button type="button" onClick={() => setState({ active: false, index: 0 })}>Finish</button> :
            <button type="button" onClick={() => jump(state.index + 1)}>Next <ArrowRight size={15}/></button>}
        </div>
        <p className="judge-footnote">Educational sandbox · fictional data · no real funds. Guide may be closed at any time.</p>
      </aside>
    </>
  );
}
