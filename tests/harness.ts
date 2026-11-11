// TEST ONLY: real local PostgreSQL engine, emulated PostgREST and mocked providers.
// Never imported by application/runtime code. No provider-backed acceptance claims.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { handle } from "../worker/index.ts";
import type { DemoEnv, ProviderOrder } from "../worker/types.ts";
export const origin = "https://demo.test";
export async function harness() {
  const pg = new PGlite();
  await pg.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await pg.exec(
    await readFile(new URL("../db/001_demo.sql", import.meta.url), "utf8"),
  );
  let signed = true,
    failProvider = false,
    failAI = false,
    aiShape: unknown = null,
    aiCalls = 0,
    captureCalls = 0;
  const providerOrders = new Map<string, ProviderOrder>(),
    createKeys = new Map<string, string>(),
    apiCalls: string[] = [];
  const original = globalThis.fetch;
  const media = new Map<string, Uint8Array>();
  const env: DemoEnv = {
    DEMO_ORIGIN: origin,
    DEMO_ENABLED: "true",
    AI_ENABLED: "true",
    SUPABASE_URL: "https://unit-db.test",
    SUPABASE_SECRET_KEY: "unit-test-service-key",
    PAYPAL_CLIENT_ID: "unit-test-id",
    PAYPAL_CLIENT_SECRET: "unit-test-secret",
    PAYPAL_WEBHOOK_ID: "WEBHOOKMOCK123",
    PAYPAL_MERCHANT_ID: "MERCHANTMOCK123",
    RELEASE_SHA: "TEST_ONLY",
    AI: {
      async run(_model, input) {
        aiCalls++;
        if (failAI) throw Error("mock provider failure");
        if (aiShape) return aiShape;
        if ("prompt" in input)
          return {
            image: btoa(String.fromCharCode(255, 216) + "A".repeat(150)),
          };
        const system = String(
          (input.messages as { content: string }[])[0].content,
        );
        if (system.includes("5 distinct"))
          return {
            response: JSON.stringify({
              options: [
                "A new dawn for Aurora Harbor",
                "A learning center among the stars",
                "Open doors for tomorrow’s learners",
                "Restore the Aurora community library",
                "Help a fictional neighborhood learn",
              ],
            }),
          };
        if (system.includes("2 distinct"))
          return {
            response: JSON.stringify({
              options: [
                "Restore a fictional community learning center after a synthetic storm.",
                "Help Aurora Harbor’s fictional learners return to a welcoming shared space.",
              ],
            }),
          };
        return {
          response: JSON.stringify({
            sections: Array.from(
              { length: system.includes("exactly one") ? 1 : 3 },
              (_, i) => ({
                heading: ["The need", "Our plan", "The possibility"][i],
                text: "This fictional community needs a welcoming place to learn. Sandbox contributions demonstrate a plan without collecting any real money.",
              }),
            ),
          }),
        };
      },
    },
  };
  // Minimal test R2 binding, intentionally typed only at the test boundary.
  env.MEDIA = {
    async put(key: string, value: Uint8Array) {
      media.set(key, value);
      return null;
    },
    async get(key: string) {
      const bytes = media.get(key);
      return bytes
        ? { body: new Response(new Uint8Array(bytes).buffer).body }
        : null;
    },
  } as unknown as R2Bucket;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.hostname === "unit-db.test") {
      try {
        const resource = url.pathname.replace("/rest/v1/", ""),
          payload = init?.body ? JSON.parse(String(init.body)) : null;
        const method = init?.method || "GET";
        if (resource.startsWith("rpc/")) {
          const fn = resource.slice(4);
          const args = Object.values(payload);
          const { rows } = await pg.query(
            `select public.${identifier(fn)}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as data`,
            args,
          );
          return Response.json((rows[0] as { data: unknown }).data);
        }
        const table = identifier(resource),
          params: unknown[] = [];
        const where: string[] = [];
        for (const [key, expr] of url.searchParams) {
          if (["select", "limit", "order"].includes(key)) continue;
          const field = identifier(key),
            dot = expr.indexOf("."),
            op = expr.slice(0, dot),
            value = expr.slice(dot + 1);
          if (op === "eq" || op === "gt") {
            params.push(value);
            where.push(`${field} ${op === "eq" ? "=" : ">"} $${params.length}`);
          } else if (op === "is" && value === "null")
            where.push(field + " is null");
          else if (op === "not" && value === "is.null")
            where.push(field + " is not null");
          else if (op === "in") {
            const values = value.slice(1, -1).split(",");
            where.push(
              field +
                " in (" +
                values
                  .map((v) => {
                    params.push(v);
                    return "$" + params.length;
                  })
                  .join(",") +
                ")",
            );
          } else throw Error("Unsupported test query " + expr);
        }
        const condition = where.length ? " where " + where.join(" and ") : "";
        let sql = "";
        if (method === "GET") {
          const fields =
            url.searchParams
              .get("select")
              ?.split(",")
              .map(identifier)
              .join(",") || "*";
          sql = `select ${fields} from public.${table}${condition}`;
          const order = url.searchParams.get("order");
          if (order) {
            const [k, dir] = order.split(".");
            sql +=
              " order by " +
              identifier(k) +
              (dir === "desc" ? " desc" : " asc");
          }
          sql +=
            " limit " +
            Math.min(10000, Number(url.searchParams.get("limit") || 1000));
        } else if (method === "POST") {
          const keys = Object.keys(payload);
          params.splice(0);
          sql = `insert into public.${table}(${keys.map(identifier).join(",")}) values(${keys
            .map((k, i) => {
              params.push(
                typeof payload[k] === "object" && payload[k] !== null
                  ? JSON.stringify(payload[k])
                  : payload[k],
              );
              return "$" + (i + 1);
            })
            .join(",")}) returning *`;
        } else if (method === "PATCH") {
          const assignments = Object.keys(payload).map((k) => {
            params.push(
              typeof payload[k] === "object" && payload[k] !== null
                ? JSON.stringify(payload[k])
                : payload[k],
            );
            return identifier(k) + "=$" + params.length;
          });
          sql = `update public.${table} set ${assignments.join(",")}${condition} returning *`;
        } else if (method === "DELETE")
          sql = `delete from public.${table}${condition} returning *`;
        const { rows } = await pg.query(sql, params);
        return Response.json(rows);
      } catch (e) {
        return Response.json(
          { error: String(e) },
          { status: String(e).includes("duplicate key") ? 409 : 400 },
        );
      }
    }
    if (url.hostname === "api-m.sandbox.paypal.com") {
      apiCalls.push(url.pathname);
      if (failProvider) throw Error("mock timeout");
      if (url.pathname === "/v1/oauth2/token")
        return Response.json({
          access_token: "MOCK_TOKEN_NOT_REAL",
          token_type: "Bearer",
        });
      if (url.pathname.startsWith("/v1/notifications/webhooks/"))
        return Response.json({
          id: env.PAYPAL_WEBHOOK_ID,
          url: env.DEMO_ORIGIN + "/api/paypal/webhook",
          event_types: [{ name: "PAYMENT.CAPTURE.COMPLETED" }],
        });
      if (url.pathname === "/v1/notifications/verify-webhook-signature")
        return Response.json({
          verification_status: signed ? "SUCCESS" : "FAILURE",
        });
      if (url.pathname === "/v2/checkout/orders" && init?.method === "POST") {
        const key = new Headers(init.headers).get("PayPal-Request-Id")!;
        const old = createKeys.get(key);
        if (old) return Response.json(providerOrders.get(old));
        const input = JSON.parse(String(init.body));
        const id =
          "MOCKORDER" + String(providerOrders.size + 1).padStart(8, "0");
        const order: ProviderOrder = {
          id,
          status: "CREATED",
          purchase_units: input.purchase_units,
          links: [
            {
              rel: "payer-action",
              href: "https://www.sandbox.paypal.com/checkoutnow?token=" + id,
            },
          ],
        };
        providerOrders.set(id, order);
        createKeys.set(key, id);
        return Response.json(order, { status: 201 });
      }
      const id = url.pathname.split("/")[4],
        order = providerOrders.get(id);
      if (!order)
        return Response.json({ error: "unknown mock order" }, { status: 404 });
      if (url.pathname.endsWith("/capture")) {
        captureCalls++;
        if (order.status !== "APPROVED")
          return Response.json({ error: "not approved" }, { status: 422 });
        order.status = "COMPLETED";
        order.purchase_units![0].payments = {
          captures: [
            {
              id: "MOCKCAPTURE" + id.slice(-8),
              status: "COMPLETED",
              amount: order.purchase_units![0].amount,
            },
          ],
        };
      }
      return Response.json(order);
    }
    return original(input, init);
  };
  function identifier(s: string) {
    if (!/^[a-z_][a-z0-9_]*$/.test(s))
      throw Error("Unsafe test SQL identifier " + s);
    return '"' + s + '"';
  }
  let cookie = "";
  async function call(
    path: string,
    method = "GET",
    payload?: unknown,
    customHeaders: Record<string, string> = {},
  ) {
    const request = new Request(origin + "/api" + path, {
      method,
      headers: {
        origin,
        cookie,
        ...(payload === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...customHeaders,
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const response = await handle(request, env);
    const next = response.headers.get("set-cookie");
    if (next) cookie = next.split(";")[0];
    return response;
  }
  async function register(handle = "fictional_judge") {
    const r = await call("/auth/register", "POST", {
      handle,
      password: "separate-demo-password-123",
    });
    if (!r.ok) throw Error(await r.text());
    return ((await r.json()) as { user: { id: string } }).user;
  }
  async function campaign() {
    const r = await call("/campaigns", "POST", {
      title: "Restore Aurora Harbor’s learning center",
      summary:
        "A fictional community rebuilds its shared library after a synthetic storm.",
      story: [
        {
          heading: "Our fictional need",
          text: "Aurora Harbor is a fictional location. The learning center and every person in this campaign are synthetic demonstration content.",
        },
      ],
      category: "education",
      goal_cents: 100000,
      status: "published",
      organizer: "Nova Reed (fictional)",
      location: "Aurora Harbor (synthetic)",
      latitude: 37,
      longitude: -121,
      image_path: null,
      ai_request_ids: [],
    });
    if (!r.ok) throw Error(await r.text());
    return ((await r.json()) as { campaign: { id: string; version: number } })
      .campaign;
  }
  return {
    pg,
    env,
    call,
    register,
    campaign,
    providerOrders,
    media,
    apiCalls,
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      cookie = v;
    },
    get captureCalls() {
      return captureCalls;
    },
    get aiCalls() {
      return aiCalls;
    },
    set signed(v: boolean) {
      signed = v;
    },
    set failProvider(v: boolean) {
      failProvider = v;
    },
    set failAI(v: boolean) {
      failAI = v;
    },
    set aiShape(v: unknown) {
      aiShape = v;
    },
    async close() {
      globalThis.fetch = original;
      await pg.close();
    },
  };
}
