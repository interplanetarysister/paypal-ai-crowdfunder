import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Compass,
  Globe2,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { api, post, type DemoUser, type Status } from "./api";
import {
  Landing,
  Discovery,
  Details,
  Organizer,
  Embed,
  Share,
  Checkout,
  Receipt,
} from "./pages";
import { Wizard } from "./wizard";
import { Dashboard, Showcase, Tracker } from "./workspace";
import { CampaignAnalytics } from "./analytics";
import { GuidedDemoOverlay } from "./judge-guide";
import "./style.css";
import { Session, Brand, ErrorBox, Notice, Protected, useSession } from "./ui";
function Login() {
  const { setUser } = useSession(),
    navigate = useNavigate(),
    loc = useLocation();
  const [register, setRegister] = useState(false),
    [handle, setHandle] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ user: DemoUser }>(
        "/auth/" + (register ? "register" : "login"),
        { handle, password },
      );
      setUser(r.user);
      setPassword("");
      const back =
        new URLSearchParams(loc.search).get("returnTo") || "/dashboard";
      navigate(
        back.startsWith("/") && !back.startsWith("//") ? back : "/dashboard",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">Your separate demo identity</p>
      <h1>{register ? "Create a demo account" : "Welcome back"}</h1>
      <p>
        Choose a fictional handle. Do not enter your production IFund password
        or personal information.
      </p>
      <form onSubmit={submit}>
        <label>
          Fictional handle
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            pattern="[a-z0-9_]{3,30}"
            required
            minLength={3}
            maxLength={30}
          />
        </label>
        <label>
          Separate demo password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={register ? "new-password" : "current-password"}
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <ErrorBox error={error} />
        <button disabled={busy}>
          {busy ? "Connecting…" : register ? "Create demo account" : "Sign in"}
        </button>
      </form>
      <button
        className="ghost"
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have a demo account? Sign in"
          : "New here? Create a demo account"}
      </button>
    </section>
  );
}
function App() {
  const [user, setUser] = useState<DemoUser | null>(null),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState<Status | null>(null),
    [statusError, setStatusError] = useState<string | null>(null),
    [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    api<Status>("/status")
      .then(setStatus)
      .catch(() => setStatusError("Live configuration check failed. Please reload to retry."));
    api<{ user: DemoUser | null }>("/session")
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const nav = [
    ["/discover", "Explore", Compass],
    ["/create", "Create", Sparkles],
    ["/map", "Atlas", Globe2],
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/hackathon", "Judge guide", Heart],
  ] as const;
  const embedded = loc.pathname.startsWith("/embed/");
  return (
    <Session.Provider value={{ user, loading, setUser, status, statusError }}>
      {!embedded && (
        <>
          <a className="skip" href="#main">
            Skip to content
          </a>
          <div className="sandbox-banner">
            Sandbox demo · Fictional campaigns · No real funds · Payouts
            disabled
          </div>
          <header className="topbar">
            <Brand />
            <nav aria-label="Main navigation" className={menu ? "open" : ""}>
              {nav.map(([to, label, Icon]) => (
                <NavLink key={to} to={to}>
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
              {user ? (
                <button
                  className="ghost logout"
                  onClick={async () => {
                    await post("/auth/logout", {});
                    setUser(null);
                  }}
                  aria-label="Sign out"
                >
                  <LogOut size={17} />
                  {user.handle}
                </button>
              ) : (
                <Link className="button small" to="/login">
                  Demo sign-in
                </Link>
              )}
            </nav>
            <button
              className="menu ghost"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </header>
          {status && !status.configured && (
            <Notice>
              Demo storage is not configured. Campaigns, account access, AI and
              payments cannot be verified yet.{" "}
              <Link to="/hackathon">
                View the judge guide and current status.
              </Link>
            </Notice>
          )}
        </>
      )}
      <main
        id="main"
        className={loc.pathname === "/" || embedded ? "" : "container"}
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/discover" element={<Discovery />} />
          <Route path="/map" element={<Discovery map />} />
          <Route path="/campaign/:id" element={<Details />} />
          <Route path="/organizer/:id" element={<Organizer />} />
          <Route path="/embed/:id" element={<Embed />} />
          <Route path="/share/:id" element={<Share />} />
          <Route path="/create" element={<Wizard />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/checkout"
            element={
              <Protected>
                <Checkout />
              </Protected>
            }
          />
          <Route
            path="/support"
            element={
              <Protected>
                <Checkout support />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/receipts/:id"
            element={
              <Protected>
                <Receipt />
              </Protected>
            }
          />
          <Route path="/hackathon" element={<Showcase />} />
          <Route path="/hackathon/analytics" element={<CampaignAnalytics />} />
          <Route
            path="/hackathon/tracker"
            element={
              <Protected admin>
                <Tracker />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <section className="panel">
                <h1>That page is beyond this orbit</h1>
                <Link to="/discover">Explore demo campaigns</Link>
              </section>
            }
          />
        </Routes>
      </main>
      {!embedded && (
        <>
          <footer>
            <Brand />
            <p>
              Fictional causes. Real sandbox verification.
              <br />
              No real funds are transferred. No withdrawals or payouts.
            </p>
            <Link to="/hackathon">Testing instructions</Link>
            <a href="https://github.com/interplanetarysister/paypal-ai-crowdfunder">
              Source · AGPL-3.0
            </a>
          </footer>
          <nav className="bottomnav" aria-label="Mobile navigation">
            <NavLink to="/">
              <Home size={19} />
              Home
            </NavLink>
            <NavLink to="/discover">
              <Compass size={19} />
              Explore
            </NavLink>
            <NavLink to="/create">
              <Plus size={19} />
              Create
            </NavLink>
            <NavLink to="/dashboard">
              <LayoutDashboard size={19} />
              Dashboard
            </NavLink>
          </nav>
        </>
      )}
      {!embedded && <GuidedDemoOverlay />}
    </Session.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
