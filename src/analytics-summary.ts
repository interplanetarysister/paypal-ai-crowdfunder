import type { Campaign } from "./api";

type ChartCampaign = Pick<Campaign, "category" | "goal_cents" | "raised_cents" | "donor_count">;

function nonnegativeInteger(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

/**
 * The public API only exposes published fictional campaign goals and PayPal
 * provider-verified campaign captures. Never infer donations from fictional
 * campaign count, simulated agent activity, or platform-support payments.
 */
export function summarizeDemoCampaigns(campaigns: ChartCampaign[]) {
  const counts = new Map<string, number>();
  let fictionalGoalsCents = 0;
  let verifiedCampaignCents = 0;
  let capturedDonationCount = 0;

  for (const campaign of campaigns) {
    counts.set(campaign.category || "other", (counts.get(campaign.category || "other") || 0) + 1);
    fictionalGoalsCents += nonnegativeInteger(campaign.goal_cents);
    verifiedCampaignCents += nonnegativeInteger(campaign.raised_cents);
    capturedDonationCount += nonnegativeInteger(campaign.donor_count);
  }

  return {
    count: campaigns.length,
    categories: counts.size,
    fictionalGoalsCents,
    verifiedCampaignCents,
    capturedDonationCount,
    remainingGoalCents: Math.max(0, fictionalGoalsCents - verifiedCampaignCents),
    categoriesByCount: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  };
}
