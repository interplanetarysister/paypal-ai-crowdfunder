import { createContext, useContext, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { DemoUser, Status } from "./api";
interface SessionValue {
  user: DemoUser | null;
  loading: boolean;
  setUser: (u: DemoUser | null) => void;
  status: Status | null;
}
export const Session = createContext<SessionValue>({
  user: null,
  loading: true,
  setUser: () => {},
  status: null,
});
export const useSession = () => useContext(Session);
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="status">
      {children}
    </div>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Brand() {
  return (
    <Link to="/" className="brand">
      <img
        src="/ifund-mark.webp"
        width="36"
        height="36"
        alt="Interplanetary Fund logo"
      />
      <span>
        Interplanetary Fund<small>Sandbox universe</small>
      </span>
    </Link>
  );
}
export function Protected({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <p role="status">Checking demo session…</p>;
  if (!user)
    return (
      <section className="panel narrow">
        <h1>Sign in to your demo account</h1>
        <p>
          Use a fictional handle and a separate demo password. Production IFund
          accounts are separate.
        </p>
        <Link
          className="button"
          to={
            "/login?returnTo=" +
            encodeURIComponent(location.pathname + location.search)
          }
        >
          Continue to demo sign-in
        </Link>
      </section>
    );
  if (admin && user.role !== "admin")
    return (
      <section className="panel">
        <h1>Administrator access required</h1>
        <p>
          This operational tracker is private. Judges can explore the{" "}
          <Link to="/hackathon">public walkthrough</Link>.
        </p>
      </section>
    );
  return children;
}
