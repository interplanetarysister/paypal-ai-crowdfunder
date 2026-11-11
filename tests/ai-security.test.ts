import { test } from "node:test";
import assert from "node:assert/strict";
import { harness, origin } from "./harness.ts";
import { parseAI, validateAI } from "../worker/ai.ts";
import { handle } from "../worker/index.ts";
import { body, database, passwordHash, equalHash } from "../worker/core.ts";
test("AI shape validation requires exactly five distinct titles, two descriptions and valid story sections", () => {
  assert.equal(
    parseAI("titles", {
      options: [
        "First title",
        "Second title",
        "Third title",
        "Fourth title",
        "Fifth title",
      ],
    }).options?.length,
    5,
  );
  assert.throws(() =>
    parseAI("titles", {
      options: [
        "Same title",
        "Same title",
        "Same title",
        "Same title",
        "Same title",
      ],
    }),
  );
  assert.throws(() =>
    parseAI("descriptions", { options: ["Only one description"] }),
  );
  assert.throws(() => parseAI("story", "not json"));
  assert.throws(() =>
    validateAI({
      kind: "unknown",
      context: "a valid fictional context here",
      category: "community",
    }),
  );
  assert.throws(() =>
    validateAI({
      kind: "titles",
      context: "password=not-for-provider",
      category: "community",
    }),
  );
  assert.throws(() =>
    validateAI({
      kind: "section",
      context: "a valid fictional context here",
      category: "community",
    }),
  );
});
test("mock AI integration: titles, descriptions, full story, section regeneration, image, failure and evidence", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  assert.equal((await h.call("/ai/generate", "POST", {})).status, 401);
  await h.register();
  const input = {
    context: "A fictional community needs a library after a synthetic storm.",
    category: "community",
  };
  for (const [kind, count] of [
    ["titles", 5],
    ["descriptions", 2],
    ["story", 3],
    ["section", 1],
  ] as const) {
    const r = await h.call("/ai/generate", "POST", {
      ...input,
      kind,
      heading: "The fictional need",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const value = (await r.json()) as {
      options?: string[];
      sections?: unknown[];
      execution: { status: string; model: string; id: string };
    };
    assert.equal(value.options?.length || value.sections?.length, count);
    assert.equal(value.execution.status, "succeeded");
    assert.match(value.execution.model, /^@cf\//);
  }
  const image = (await (
    await h.call("/ai/generate", "POST", {
      ...input,
      kind: "image",
      style: "cyberpunk",
    })
  ).json()) as { image_path: string };
  assert.match(image.image_path, /^\/api\/media\//);
  assert.equal(h.media.size, 1);
  h.failAI = true;
  assert.equal(
    (await h.call("/ai/generate", "POST", { ...input, kind: "titles" })).status,
    503,
  );
  h.failAI = false;
  h.aiShape = { response: '{"options":["one invalid option"]}' };
  assert.equal(
    (await h.call("/ai/generate", "POST", { ...input, kind: "titles" })).status,
    502,
  );
  const evidence = await h.pg.query<{
    status: string;
    model: string;
    completed_at: string;
  }>("select status,model,completed_at from ifund_demo_ai_runs");
  assert.equal(evidence.rows.filter((r) => r.status === "succeeded").length, 5);
  assert.equal(evidence.rows.filter((r) => r.status === "failed").length, 2);
  assert(evidence.rows.every((r) => r.completed_at));
  h.env.AI_ENABLED = "false";
  assert.equal(
    (await h.call("/ai/generate", "POST", { ...input, kind: "titles" })).status,
    503,
  );
  assert.equal(h.aiCalls, 7);
  assert.equal(
    (
      await h.call("/ai/generate", "POST", {
        ...input,
        kind: "titles",
        context: "short",
      })
    ).status,
    400,
  );
});
test("real PostgreSQL: deny-by-default RLS/grants, atomic ledger, immutable records, cross-purpose classification", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  const user = await h.register();
  const c = await h.campaign();
  const checks = await h.pg.query<{
    relname: string;
    relrowsecurity: boolean;
    anon_select: boolean;
    member_insert: boolean;
  }>(
    "select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'select') as anon_select,has_table_privilege('authenticated',c.oid,'insert') as member_insert from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'ifund_demo_%'",
  );
  assert.equal(checks.rows.length, 12);
  assert(
    checks.rows.every(
      (r) => r.relrowsecurity && !r.anon_select && !r.member_insert,
    ),
  );
  const rpc = await h.pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon','public.ifund_demo_finalize(uuid,text,integer,text)','EXECUTE') as allowed",
  );
  assert.equal(rpc.rows[0].allowed, false);
  await h.pg.exec("set role anon");
  await assert.rejects(h.pg.query("select * from ifund_demo_users"));
  await h.pg.exec("reset role");
  const { rows } = await h.pg.query<{ id: string }>(
    "insert into ifund_demo_orders(user_id,campaign_id,purpose,amount_cents,create_key,paypal_order_id) values($1,$2,'campaign',500,$3,'MOCKSQLORDER123') returning id",
    [user.id, c.id, crypto.randomUUID()],
  );
  const id = rows[0].id;
  await assert.rejects(
    h.pg.query("select ifund_demo_finalize($1,'MOCKSQLCAPTURE123',600,'USD')", [
      id,
    ]),
  );
  assert.equal(
    (await h.pg.query("select * from ifund_demo_captures")).rows.length,
    0,
  );
  await h.pg.query(
    "select ifund_demo_finalize($1,'MOCKSQLCAPTURE123',500,'USD')",
    [id],
  );
  await h.pg.query(
    "select ifund_demo_finalize($1,'MOCKSQLCAPTURE123',500,'USD')",
    [id],
  );
  assert.equal(
    (await h.pg.query("select * from ifund_demo_ledger")).rows.length,
    2,
  );
  assert.equal(
    (await h.pg.query("select * from ifund_demo_receipts")).rows.length,
    1,
  );
  await assert.rejects(
    h.pg.query("update ifund_demo_ledger set amount_cents=999"),
  );
  await assert.rejects(h.pg.query("delete from ifund_demo_receipts"));
  await assert.rejects(
    h.pg.query(
      "insert into ifund_demo_orders(user_id,purpose,campaign_id,amount_cents,create_key) values($1,'platform_support',$2,500,$3)",
      [user.id, c.id, crypto.randomUUID()],
    ),
  );
  await h.pg.exec("set role service_role");
  assert.equal(
    (await h.pg.query("select * from ifund_demo_ledger")).rows.length,
    2,
  );
  await h.pg.exec("reset role");
});
test("HTTP boundaries: bounded body, CSRF, auth, foreign ownership, optimistic edits and no payout routes", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  const first = await h.register();
  const c = await h.campaign();
  const cookie = h.cookie;
  h.cookie = "";
  await h.register("second_judge");
  assert.equal(
    (await h.call("/campaigns/" + c.id, "PATCH", { version: 1 })).status,
    400,
  );
  const data = (await (await h.call("/campaigns/" + c.id)).json()) as {
    campaign: Record<string, unknown>;
  };
  const payload = { ...data.campaign, status: "draft" };
  assert.equal(
    (await h.call("/campaigns/" + c.id, "PATCH", payload)).status,
    409,
  );
  h.cookie = cookie;
  assert.equal(
    (await h.call("/campaigns/" + c.id, "PATCH", payload)).status,
    200,
  );
  assert.equal(
    (await h.call("/campaigns/" + c.id, "PATCH", payload)).status,
    409,
  );
  h.cookie = "";
  assert.equal((await h.call("/campaigns/" + c.id)).status, 404);
  assert.equal((await h.call("/admin/tracker")).status, 401);
  h.cookie = cookie;
  assert.equal(
    (
      await h.call("/campaigns", "POST", payload, {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (await h.call("/ai/generate", "POST", { context: "x".repeat(21000) }))
      .status,
    413,
  );
  assert.equal(
    (
      await handle(new Request(origin + "/api/session"), {
        ...h.env,
        DEMO_ORIGIN: "https://wrong.test",
      })
    ).status,
    503,
  );
  for (const route of [
    "/withdraw",
    "/payout",
    "/admin/payout",
    "/paypal/payouts",
    "/subscriptions",
  ])
    assert.equal((await h.call(route, "POST", {})).status, 404);
  assert.throws(() => database({}));
  await assert.rejects(
    body(
      new Request(origin, {
        method: "POST",
        body: "x",
        headers: { "content-type": "text/plain" },
      }),
    ),
  );
  const a = await passwordHash("separate-demo-password-123", "a-salt"),
    b = await passwordHash("different-demo-password-123", "a-salt");
  assert(equalHash(a, a));
  assert(!equalHash(a, b));
  assert(first.id);
});
