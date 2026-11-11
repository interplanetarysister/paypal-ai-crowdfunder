import { test } from "node:test";
import assert from "node:assert/strict";
import { dataGateway } from "../edge/index.ts";
import { harness } from "./harness.ts";
test("dedicated database gateway rejects missing, invalid and stale signatures; signed requests remain demo-only", async (t) => {
  const h = await harness();
  t.after(() => h.close());
  const config = { url: "https://unit-db.test", key: "test-key" };
  const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    ),
    pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  async function request(
    resource: string,
    time = String(Math.floor(Date.now() / 1000)),
    wrong = false,
  ) {
    const raw = JSON.stringify({
      resource,
      method: "GET",
      query: "?select=id",
    });
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      pair.privateKey,
      new TextEncoder().encode(time + "\n" + raw),
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return new Request("https://db.test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-time": time,
        "x-demo-signature": wrong ? "x".repeat(86) : signature,
      },
      body: raw,
    });
  }
  assert.equal(
    (await dataGateway(new Request("https://db.test"), config, pub)).status,
    403,
  );
  assert.equal(
    (
      await dataGateway(
        await request("ifund_demo_users", undefined, true),
        config,
        pub,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await dataGateway(
        await request("ifund_demo_users", "1000000000"),
        config,
        pub,
      )
    ).status,
    403,
  );
  assert.equal(
    (await dataGateway(await request("ifund_donations"), config, pub)).status,
    403,
  );
  assert.equal(
    (await dataGateway(await request("ifund_demo_users"), config, pub)).status,
    200,
  );
});
