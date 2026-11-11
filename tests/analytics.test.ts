import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeDemoCampaigns } from "../src/analytics-summary.ts";

test("public partner charts separate verified PayPal Sandbox captures from fictional goals", () => {
  const summary = summarizeDemoCampaigns([
    { category: "science", goal_cents: 50000, raised_cents: 2000, donor_count: 1 },
    { category: "science", goal_cents: 20000, raised_cents: 0, donor_count: 0 },
    { category: "community", goal_cents: 10000, raised_cents: 500, donor_count: 1 },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.categories, 2);
  assert.equal(summary.fictionalGoalsCents, 80000);
  assert.equal(summary.verifiedCampaignCents, 2500);
  assert.equal(summary.remainingGoalCents, 77500);
  assert.equal(summary.capturedDonationCount, 2);
  assert.deepEqual(summary.categoriesByCount, [
    { category: "science", count: 2 },
    { category: "community", count: 1 },
  ]);
});

test("invalid, negative and missing numeric values never become public funding", () => {
  const summary = summarizeDemoCampaigns([
    { category: "community", goal_cents: Number.NaN, raised_cents: -500, donor_count: -3 },
    { category: "education", goal_cents: 0, raised_cents: Infinity, donor_count: 0 },
    { category: "education", goal_cents: 100, raised_cents: 0, donor_count: 0 },
  ]);
  assert.equal(summary.verifiedCampaignCents, 0);
  assert.equal(summary.fictionalGoalsCents, 100);
  assert.equal(summary.capturedDonationCount, 0);
  assert.equal(summary.remainingGoalCents, 100);
});

test("surplus provider verified captures never create a negative fictional remainder", () => {
  const summary = summarizeDemoCampaigns([
    { category: "science", goal_cents: 100, raised_cents: 200, donor_count: 1 },
  ]);
  assert.equal(summary.verifiedCampaignCents, 200);
  assert.equal(summary.remainingGoalCents, 0);
});

test("an empty public campaign view reports zero, not a fabricated payment", () => {
  const summary = summarizeDemoCampaigns([]);
  assert.equal(summary.count, 0);
  assert.equal(summary.verifiedCampaignCents, 0);
  assert.equal(summary.capturedDonationCount, 0);
  assert.deepEqual(summary.categoriesByCount, []);
});
