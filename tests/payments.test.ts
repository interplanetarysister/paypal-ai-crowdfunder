import { test } from "node:test";
import assert from "node:assert/strict";
import { harness, origin } from "./harness.ts";
import { verifyOrder, approvalUrl } from "../worker/paypal.ts";
import type { Order, ProviderOrder } from "../worker/types.ts";
const fixture: Order = {
  id: "7b69009e-b66a-445e-8c43-147df51f2b0c",
  user_id: "u",
  campaign_id: "c",
  purpose: "campaign",
  amount_cents: 500,
  currency: "USD",
  create_key: "key",
  paypal_order_id: "MOCKORDER12345678",
  paypal_capture_id: null,
  status: "created",
  reconciliation: "not_verified",
  approval_url: null,
};
const proof = (): ProviderOrder => ({
  id: fixture.paypal_order_id!,
  status: "COMPLETED",
  purchase_units: [
    {
      custom_id: "ifund-demo:" + fixture.id,
      payee: { merchant_id: "MOCKMERCHANT123" },
      amount: { value: "5.00", currency_code: "USD" },
      payments: {
        captures: [
          {
            id: "MOCKCAPTURE12345678",
            status: "COMPLETED",
            amount: { value: "5.00", currency_code: "USD" },
          },
        ],
      },
    },
  ],
});
test("provider proof rejects amount, currency, merchant, purpose, order and capture mismatches", () => {
  assert.equal(
    verifyOrder(proof(), fixture, "MOCKMERCHANT123").status,
    "captured",
  );
  const declined = proof();
  declined.purchase_units![0].payments!.captures![0].status = "DECLINED";
  assert.equal(
    verifyOrder(declined, fixture, "MOCKMERCHANT123").status,
    "failed",
  );
  const mutations = [
    (p: ProviderOrder) => (p.id = "WRONGORDER123"),
    (p) => (p.purchase_units![0].custom_id = "wrong"),
    (p) => (p.purchase_units![0].amount!.value = "6.00"),
    (p) => (p.purchase_units![0].amount!.currency_code = "EUR"),
    (p) => (p.purchase_units![0].payee!.merchant_id = "WRONGMERCHANT"),
    (p) => (p.purchase_units![0].payments!.captures![0].amount!.value = "6.00"),
  ] as ((p: ProviderOrder) => void)[];
  for (const change of mutations) {
    const p = proof();
    change(p);
    assert.throws(() => verifyOrder(p, fixture, "MOCKMERCHANT123"));
  }
});
test("approval redirect is restricted to HTTPS sandbox PayPal", () => {
  assert.match(
    approvalUrl({
      links: [
        {
          rel: "approve",
          href: "https://www.sandbox.paypal.com/checkoutnow?token=MOCK",
        },
      ],
    }),
    /^https:/,
  );
  for (const href of [
    "https://www.paypal.com/",
    "https://evil.test/",
    "javascript:alert(1)",
    "https://x@www.sandbox.paypal.com/",
  ])
    assert.throws(() => approvalUrl({ links: [{ rel: "approve", href }] }));
});
test("mocked provider integration: approval, capture, ledger, receipt, reconciliation and replay", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  const user = await h.register(),
    campaign = await h.campaign();
  const key = crypto.randomUUID();
  const input = {
    purpose: "campaign",
    campaign_id: campaign.id,
    amount_cents: 500,
    key,
  };
  let r = await h.call("/paypal/orders", "POST", input);
  assert.equal(r.status, 201);
  const order = (await r.json()) as { id: string; paypal_order_id: string };
  r = await h.call("/paypal/orders", "POST", input);
  assert.equal(r.status, 200);
  assert.equal(h.providerOrders.size, 1);
  assert.equal(
    (await h.call("/paypal/orders", "POST", { ...input, amount_cents: 600 }))
      .status,
    409,
  );
  assert.equal(
    (await h.call("/paypal/orders/" + order.id + "/capture", "POST", {}))
      .status,
    409,
  );
  assert.equal(h.captureCalls, 0);
  const remote = h.providerOrders.get(order.paypal_order_id)!;
  remote.status = "APPROVED";
  r = await h.call("/paypal/orders/" + order.id + "/capture", "POST", {});
  assert.equal(r.status, 200, await r.clone().text());
  const receipt = (await r.json()) as {
    receipt_id: string;
    capture_id: string;
    status: string;
  };
  assert.equal(receipt.status, "captured");
  assert.match(receipt.capture_id, /MOCK/);
  assert.equal(
    (await h.call("/paypal/orders/" + order.id + "/capture", "POST", {}))
      .status,
    200,
  );
  assert.equal(h.captureCalls, 1);
  assert.equal((await h.call("/receipts/" + receipt.receipt_id)).status, 200);
  const ledger = await h.pg.query<{ count: number; balance: number }>(
    "select count(*)::int as count,sum(amount_cents)::int as balance from ifund_demo_ledger",
  );
  assert.deepEqual(ledger.rows, [{ count: 2, balance: 0 }]);
  assert.equal(
    (await h.pg.query("select * from ifund_demo_receipts")).rows.length,
    1,
  );
  const finance = (await (await h.call("/finance")).json()) as {
    captured_cents: number;
    platform_support_cents: number;
  };
  assert.equal(finance.captured_cents, 500);
  assert.equal(finance.platform_support_cents, 0);
  const discovery = (await (await h.call("/campaigns")).json()) as {
    campaigns: { raised_cents: number }[];
  };
  assert.equal(discovery.campaigns[0].raised_cents, 500);
  const event = {
    id: "MOCKEVENT12345678",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: receipt.capture_id,
      supplementary_data: { related_ids: { order_id: order.paypal_order_id } },
    },
  };
  const headers = {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.paypal.com/mock-cert",
    "paypal-transmission-id": "MOCKTRANSMISSION",
    "paypal-transmission-sig": "MOCK_SIGNATURE",
    "paypal-transmission-time": new Date().toISOString(),
  };
  assert.equal((await h.call("/paypal/webhook", "POST", event)).status, 400);
  h.signed = false;
  assert.equal(
    (await h.call("/paypal/webhook", "POST", event, headers)).status,
    403,
  );
  h.signed = true;
  assert.equal(
    (await h.call("/paypal/webhook", "POST", event, headers)).status,
    200,
  );
  const replay = (await (
    await h.call("/paypal/webhook", "POST", event, headers)
  ).json()) as { duplicate: boolean };
  assert.equal(replay.duplicate, true);
  const delivered = await h.pg.query<{ delivery_count: number }>(
    "select delivery_count from ifund_demo_events",
  );
  assert.equal(delivered.rows[0].delivery_count, 2);
  assert.equal(
    (await h.pg.query("select * from ifund_demo_events")).rows.length,
    1,
  );
  assert.equal(
    (await h.pg.query("select * from ifund_demo_ledger")).rows.length,
    2,
  );
  assert.equal(
    (
      await h.call(
        "/paypal/webhook",
        "POST",
        { ...event, event_type: "ALTERED" },
        headers,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await h.call(
        "/paypal/webhook",
        "POST",
        { ...event, id: "MOCKSTALEEVENT123" },
        { ...headers, "paypal-transmission-time": "2000-01-01T00:00:00Z" },
      )
    ).status,
    400,
  );
  const originalCookie = h.cookie;
  h.cookie = "";
  assert.equal((await h.call("/finance")).status, 401);
  await h.register("another_judge");
  assert.equal(
    (await h.call("/paypal/orders/" + order.id + "/capture", "POST", {}))
      .status,
    404,
  );
  assert.equal((await h.call("/receipts/" + receipt.receipt_id)).status, 404);
  h.cookie = originalCookie;
  assert.equal((await h.call("/admin/tracker")).status, 403);
  await h.pg.query("update ifund_demo_users set role='admin' where id=$1", [
    user.id,
  ]);
  assert.equal((await h.call("/admin/tracker")).status, 200);
});
test("mocked provider: pending, failures, cancellation and platform support never credit campaign funds", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  await h.register();
  const c = await h.campaign();
  assert.equal(
    (
      await h.call("/paypal/orders", "POST", {
        key: crypto.randomUUID(),
        amount_cents: 999999,
        purpose: "campaign",
        campaign_id: c.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await h.call("/paypal/orders", "POST", {
        key: crypto.randomUUID(),
        amount_cents: 500,
        purpose: "platform_support",
        campaign_id: c.id,
      })
    ).status,
    400,
  );
  const o = (await (
    await h.call("/paypal/orders", "POST", {
      key: crypto.randomUUID(),
      amount_cents: 500,
      purpose: "platform_support",
      campaign_id: null,
    })
  ).json()) as { id: string; paypal_order_id: string };
  assert.equal(
    (await h.call("/paypal/orders/" + o.id + "/cancel", "POST", {})).status,
    200,
  );
  assert.equal(
    (await h.pg.query("select * from ifund_demo_captures")).rows.length,
    0,
  );
  const remote = h.providerOrders.get(o.paypal_order_id)!;
  remote.status = "COMPLETED";
  remote.purchase_units![0].payments = {
    captures: [
      {
        id: "MOCKPENDINGCAPTURE",
        status: "PENDING",
        amount: { value: "5.00", currency_code: "USD" },
      },
    ],
  };
  const pending = (await (
    await h.call("/paypal/orders/" + o.id + "/reconcile", "POST", {})
  ).json()) as { status: string };
  assert.equal(pending.status, "pending");
  assert.equal(
    (await h.pg.query("select * from ifund_demo_receipts")).rows.length,
    0,
  );
  h.failProvider = true;
  assert.equal(
    (await h.call("/paypal/orders/" + o.id + "/reconcile", "POST", {})).status,
    503,
  );
  h.failProvider = false;
  remote.purchase_units![0].payments!.captures![0].status = "COMPLETED";
  assert.equal(
    (await h.call("/paypal/orders/" + o.id + "/reconcile", "POST", {})).status,
    200,
  );
  const finance = (await (await h.call("/finance")).json()) as {
    captured_cents: number;
    platform_support_cents: number;
  };
  assert.equal(finance.captured_cents, 0);
  assert.equal(finance.platform_support_cents, 500);
  const ledger = await h.pg.query<{ account: string }>(
    "select account from ifund_demo_ledger",
  );
  assert(ledger.rows.some((r) => r.account === "platform_support"));
  assert(!ledger.rows.some((r) => r.account === "campaign_support"));
  assert.equal(
    (await h.call("/paypal/orders/" + o.id + "/cancel", "POST", {})).status,
    200,
  );
  const saved = await h.pg.query<{ status: string }>(
    "select status from ifund_demo_orders where id=$1",
    [o.id],
  );
  assert.equal(saved.rows[0].status, "captured");
  assert.equal((await h.call("/payouts", "POST", {})).status, 404);
  assert.equal((await h.call("/subscriptions", "POST", {})).status, 404);
  assert(h.apiCalls.every((p) => !p.includes("payout")));
  assert(origin.startsWith("https"));
});

test("fictional campaign focus exposes simulated allocations without changing payment totals", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  await h.register();
  const c = await h.campaign();
  const response = await h.call("/campaigns/" + c.id + "/focus");
  assert.equal(response.status, 200, await response.clone().text());
  const body = (await response.json()) as { focus: {
    simulated: boolean; campaign_units: number; platform_units: number;
    roles: { role: string; units: number }[];
  } };
  assert.equal(body.focus.simulated, true);
  assert.equal(body.focus.roles.length, 4);
  assert.equal(body.focus.campaign_units, body.focus.roles.reduce((n, r) => n + r.units, 0));
  assert(body.focus.platform_units >= body.focus.campaign_units);
  assert.equal(
    (await h.call("/campaigns/00000000-0000-4000-8000-000000000000/focus")).status,
    404,
  );
  const finance = (await (await h.call("/campaigns/" + c.id)).json()) as {
    campaign: { raised_cents: number; donor_count: number };
  };
  assert.equal(finance.campaign.raised_cents, 0);
  assert.equal(finance.campaign.donor_count, 0);
  const grants = await h.pg.query<{ anon_select: boolean; anon_execute: boolean }>(
    "select has_table_privilege('anon','public.ifund_demo_agent_focus','select') as anon_select, has_function_privilege('anon','public.ifund_demo_campaign_focus(uuid)','execute') as anon_execute",
  );
  assert.equal(grants.rows[0].anon_select, false);
  assert.equal(grants.rows[0].anon_execute, false);
});


test("sandbox Card Fields: token, method isolation, approval, capture and exactly-once ledger", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  // Tokens require an authenticated demo user; browser-safe token never reveals merchant credentials.
  assert.equal((await h.call("/paypal/browser-token")).status, 401);
  await h.register();
  const tokenResponse = await h.call("/paypal/browser-token");
  assert.equal(tokenResponse.status, 200);
  assert.equal(tokenResponse.headers.get("cache-control"), "no-store");
  const token = await tokenResponse.json() as { clientToken: string };
  assert.equal(token.clientToken, "MOCK_BROWSER_SAFE_CLIENT_TOKEN");
  const campaign = await h.campaign();
  const key = crypto.randomUUID();
  const input = {
    purpose: "campaign",
    campaign_id: campaign.id,
    amount_cents: 300,
    checkout_method: "card",
    key,
  };
  assert.equal((await h.call("/paypal/orders", "POST", { ...input, checkout_method: "other" })).status, 400);
  const created = await h.call("/paypal/orders", "POST", input);
  assert.equal(created.status, 201, await created.clone().text());
  const order = await created.json() as { id: string; paypal_order_id: string; approval_url: string | null };
  assert.equal(order.approval_url, null);
  const retry = await h.call("/paypal/orders", "POST", input);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json() as { paypal_order_id: string }).paypal_order_id, order.paypal_order_id);
  assert.equal(h.providerOrders.size, 1);
  // Existing key cannot be silently switched to PayPal redirect checkout.
  assert.equal((await h.call("/paypal/orders", "POST", { ...input, checkout_method: "paypal" })).status, 409);
  assert.equal((await h.call("/paypal/orders/" + order.id + "/capture", "POST", {})).status, 409);
  const mockProvider = h.providerOrders.get(order.paypal_order_id)!;
  mockProvider.status = "APPROVED";
  const capture = await h.call("/paypal/orders/" + order.id + "/capture", "POST", {});
  assert.equal(capture.status, 200, await capture.clone().text());
  const result = await capture.json() as { status: string; capture_id: string; receipt_id: string };
  assert.equal(result.status, "captured");
  assert.ok(result.capture_id);
  assert.ok(result.receipt_id);
  assert.equal((await h.call("/paypal/orders/" + order.id + "/reconcile", "POST", {})).status, 200);
  const balance = await h.pg.query<{ n: number; total: number }>(
    "select count(*)::int as n, sum(amount_cents)::int as total from public.ifund_demo_ledger",
  );
  assert.deepEqual(balance.rows, [{ n: 2, total: 0 }]);
  assert.equal((await h.pg.query("select * from public.ifund_demo_receipts")).rows.length, 1);
  assert.equal((await h.pg.query("select checkout_method from public.ifund_demo_orders")).rows[0].checkout_method, "card");
});
