import { useEffect, useRef, useState } from "react";
import { api, post, money } from "./api";

// Card numbers, expiry and CVV are entered ONLY in PayPal-hosted iframes.
// Do not add inputs, logging, telemetry, test fixtures or backend fields for PAN/CVV.
interface CardSession {
  createCardFieldsComponent(options: {
    type: "number" | "expiry" | "cvv";
    placeholder: string;
  }): HTMLElement;
  submit(orderId: string, options: { billingAddress: { postalCode: string } }): Promise<{
    state: "succeeded" | "failed" | "canceled" | string;
    data?: { orderId?: string; message?: string };
  }>;
}
interface SdkInstance {
  findEligibleMethods(options?: { currencyCode: string }): Promise<{
    isEligible(method: string): boolean;
  }>;
  createCardFieldsOneTimePaymentSession(): CardSession;
}
interface PaypalBrowserWindow extends Window {
  paypal?: {
    createInstance(options: { clientToken: string; components: string[]; pageType: string }): Promise<SdkInstance>;
  };
}
interface CheckoutIntent {
  fingerprint: string;
  key: string;
}
export interface CardReceipt {
  receipt_id: string;
  capture_id: string;
  order_id: string;
  amount_cents: number;
  purpose: string;
  status: string;
  message?: string;
}
let sdkLoading: Promise<void> | null = null;
function loadSandboxSdk(): Promise<void> {
  if ((window as PaypalBrowserWindow).paypal?.createInstance) return Promise.resolve();
  if (!sdkLoading) {
    sdkLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.dataset.ifundSandboxCards = "true";
      script.src = "https://www.sandbox.paypal.com/web-sdk/v6/core";
      script.async = true;
      script.onload = () => (window as PaypalBrowserWindow).paypal?.createInstance
        ? resolve()
        : reject(new Error("PayPal did not initialize Card Fields"));
      script.onerror = () => reject(new Error("PayPal Card Fields could not load"));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      sdkLoading = null;
      throw error;
    });
  }
  return sdkLoading;
}
function parseAmount(value: string): number {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) throw Error("Enter a sandbox amount between $1 and $100");
  const cents = Math.round(Number(value) * 100);
  if (cents < 100 || cents > 10000) throw Error("Enter a sandbox amount between $1 and $100");
  return cents;
}
export function SandboxCardFields({
  amount,
  support,
  campaignId,
  enabled,
  onCaptured,
}: {
  amount: string;
  support: boolean;
  campaignId: string | null;
  enabled: boolean;
  onCaptured(receipt: CardReceipt): void;
}) {
  const number = useRef<HTMLDivElement>(null);
  const expiry = useRef<HTMLDivElement>(null);
  const cvv = useRef<HTMLDivElement>(null);
  const session = useRef<CardSession | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [postalCode, setPostalCode] = useState("95131");
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        // A browser-safe, short-lived SDK token; NOT the PayPal merchant access token.
        const { clientToken } = await api<{ clientToken: string }>("/paypal/browser-token");
        if (!alive) return;
        await loadSandboxSdk();
        if (!alive) return;
        const paypal = (window as PaypalBrowserWindow).paypal;
        if (!paypal) throw Error("Sandbox SDK unavailable");
        const sdk = await paypal.createInstance({
          clientToken,
          components: ["card-fields"],
          pageType: "checkout",
        });
        if (!alive) return;
        const methods = await sdk.findEligibleMethods({ currencyCode: "USD" });
        if (!alive) return;
        if (!methods.isEligible("advanced_cards")) throw Error("This sandbox merchant is not eligible for PayPal advanced card payments");
        const instance = sdk.createCardFieldsOneTimePaymentSession();
        if (!number.current || !expiry.current || !cvv.current) return;
        number.current.replaceChildren(instance.createCardFieldsComponent({ type: "number", placeholder: "Test card number" }));
        expiry.current.replaceChildren(instance.createCardFieldsComponent({ type: "expiry", placeholder: "MM/YY" }));
        cvv.current.replaceChildren(instance.createCardFieldsComponent({ type: "cvv", placeholder: "CVV" }));
        session.current = instance;
        setPhase("ready");
        setInfo("");
      } catch {
        if (alive) {
          setPhase("unavailable");
          setInfo("Card checkout is not available for this PayPal Sandbox merchant. PayPal account checkout remains available.");
        }
      }
    })();
    return () => {
      alive = false;
      session.current = null;
    };
  }, [enabled]);

  async function capture(orderId: string, reconcile = false) {
    const result = await post<CardReceipt>(
      "/paypal/orders/" + orderId + (reconcile ? "/reconcile" : "/capture"),
      {},
    );
    if (result.status === "captured" && result.receipt_id && result.capture_id) {
      sessionStorage.removeItem("ifund-card-checkout-intent");
      setPendingOrder(null);
      onCaptured(result);
      setInfo("PayPal confirmed the sandbox capture and durable receipt.");
    } else {
      setInfo(result.message || "Provider outcome pending; nothing has been credited to fundraising totals.");
      setPendingOrder(orderId);
    }
  }

  async function pay() {
    if (!session.current || busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const cents = parseAmount(amount);
      if (!support && !campaignId) throw Error("Select a fictional campaign first");
      if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) throw Error("Enter a 5-digit sandbox US postal code");
      const fingerprint = (support ? "platform_support" : campaignId) + ":card:" + cents;
      let intent: CheckoutIntent | null = null;
      try {
        intent = JSON.parse(sessionStorage.getItem("ifund-card-checkout-intent") || "null") as CheckoutIntent | null;
      } catch { /* generate a new checkout key */ }
      if (!intent || intent.fingerprint !== fingerprint) {
        intent = { fingerprint, key: crypto.randomUUID() };
        sessionStorage.setItem("ifund-card-checkout-intent", JSON.stringify(intent));
      }
      const order = await post<{
        id: string;
        paypal_order_id: string | null;
        status: string;
      }>("/paypal/orders", {
        key: intent.key,
        purpose: support ? "platform_support" : "campaign",
        campaign_id: support ? null : campaignId,
        amount_cents: cents,
        checkout_method: "card",
      });
      if (order.status === "captured") throw Error("Already captured; inspect the donor dashboard and receipt");
      if (!order.paypal_order_id) throw Error("PayPal did not confirm the card order");
      setPendingOrder(order.id);
      const outcome = await session.current.submit(order.paypal_order_id, {
        billingAddress: { postalCode },
      });
      if (outcome.state === "canceled") {
        setInfo("Card authentication was canceled. No donation was credited.");
      } else if (outcome.state === "failed") {
        setError("The sandbox card payment was not approved. No donation was credited.");
      } else if (outcome.state === "succeeded") {
        if (outcome.data?.orderId && outcome.data.orderId !== order.paypal_order_id)
          throw Error("PayPal returned an unexpected order association");
        await capture(order.id);
      } else {
        setInfo("PayPal did not confirm payment. Nothing was credited.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The card payment could not be verified");
    } finally {
      setBusy(false);
    }
  }
  async function retryReconcile() {
    if (!pendingOrder || busy) return;
    setBusy(true);
    setError("");
    try { await capture(pendingOrder, true); }
    catch { setError("The provider outcome is still unverified. No donation has been credited."); }
    finally { setBusy(false); }
  }
  if (!enabled) return null;
  return (
    <section className="sandbox-card-section" aria-label="PayPal hosted sandbox card fields">
      <h2>Pay with a sandbox test card</h2>
      <p className="meta">PayPal SDK v6 hosted fields · Test cards only · No card number, expiry or CVV enters IFund servers. Card checkout depends on the merchant's PayPal eligibility.</p>
      {phase === "loading" && <p role="status">Checking PayPal Sandbox card eligibility…</p>}
      <div className="sandbox-card-inputs" hidden={phase !== "ready"}>
        <label>Sandbox card number<div ref={number} className="paypal-card-frame" /></label>
        <label>Expiration date<div ref={expiry} className="paypal-card-frame" /></label>
        <label>Security code<div ref={cvv} className="paypal-card-frame" /></label>
        <label>Sandbox billing ZIP code
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
            inputMode="numeric" autoComplete="off" maxLength={10} />
        </label>
        <button type="button" className="paypal full" onClick={pay} disabled={busy || !session.current}>
          {busy ? "Verifying sandbox card…" : "Pay " + (Number.isFinite(Number(amount)) ? money(Math.round(Number(amount) * 100)) : "") + " with test card"}
        </button>
      </div>
      {info && <p role="status" className="meta">{info}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {pendingOrder && (
        <button type="button" className="secondary" disabled={busy} onClick={retryReconcile}>
          Recheck the existing sandbox order (no duplicate charge)
        </button>
      )}
    </section>
  );
}
