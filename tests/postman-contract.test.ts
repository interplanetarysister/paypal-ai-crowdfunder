import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collection = JSON.parse(readFileSync(new URL("../postman/IFund_PayPal_AI_Sandbox.postman_collection.json", import.meta.url), "utf8"));
const items = collection.item as Array<{name:string;request:{method:string;url:{raw:string;path:string[]};body?:{raw:string}};event?:Array<{script:{exec:string[]}}>}>;
const names = items.map(x=>x.name);

test("public Postman collection is runnable against dedicated sandbox origin and covers core integration", () => {
  assert.equal(collection.info.schema, "https://schema.getpostman.com/json/collection/v2.1.0/collection.json");
  const values = new Map(collection.variable.map((v:{key:string;value:string})=>[v.key,v.value]));
  assert.equal(values.get("baseUrl"), "https://ifund-hackathon-demo.interplanetary-fund.workers.dev");
  assert.equal(items.length, 13);
  assert(names.some(x=>x.includes("Workers AI")));
  assert(names.some(x=>x.includes("OAuth")||x.includes("webhook")));
  assert(names.some(x=>x.includes("receipt")));
  assert(names.some(x=>x.includes("Capture AFTER")));
  assert(names.some(x=>x.includes("invalid $0")));
  assert(items.every(x=>x.request.url.raw.startsWith("{{baseUrl}}/api/")));
});

test("Postman manual capture is never run automatically by a collection-level script", () => {
  assert(!collection.event.some((x:{listen:string})=>x.listen==="prerequest"));
  const capture = items.find(x=>x.name.includes("Capture AFTER"));
  assert(capture);
  assert.match(capture!.request.description||"",/MANUAL/i);
  assert.match(capture!.request.description||"",/approval/i);
  assert(!items.some(x=>x.request.url.raw.includes("paypal.com/v2/checkout/orders")));
});

test("collection preserves private credentials and labels nonfinancial states", () => {
  const values = new Map(collection.variable.map((v:{key:string;value:string})=>[v.key,v.value]));
  for (const key of ["demoHandle","demoPassword","campaignId","orderId","receiptId"]) {
    assert.equal(values.get(key),"",`Unexpected private value in ${key}`);
  }
  const whole=JSON.stringify(collection);
  assert(!/sk-(?:proj-)?[a-zA-Z0-9_-]{20}/.test(whole));
  assert(!/client_secret|PAYPAL_CLIENT_SECRET|SUPABASE_SECRET_KEY/.test(whole));
  assert.match(whole,/not captured/i);
  assert.match(whole,/Sandbox/);
});
