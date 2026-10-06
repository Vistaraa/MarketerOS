import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<string, number> = { today: 1, yesterday: 1, last_7_days: 7, last_14_days: 14, last_30_days: 30, last_90_days: 90, this_month: 31, last_month: 31 };

export function rangeDays(range: string | null | undefined) {
  return RANGE_DAYS[(range || "").toLowerCase()] || 30;
}

type Totals = { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };

function totals(rows: Array<{ spend: unknown; impressions: number; clicks: number; conversions: number; revenue: unknown }>): Totals {
  return rows.reduce<Totals>((t, r) => ({ spend: t.spend + Number(r.spend), impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, conversions: t.conversions + r.conversions, revenue: t.revenue + Number(r.revenue) }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
}

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const change = (current: number, previous: number) => (previous > 0 ? round(((current - previous) / previous) * 100, 1) : 0);

/**
 * Account-level performance for one ad platform from synced daily metrics: totals, ratios, the change against the
 * previous period of the same length, and the daily trend. Nothing is estimated; days without data are absent.
 */
export type SyncedPlatform = "GOOGLE_ADS" | "META_ADS" | "LINKEDIN";

export async function platformPerformance(workspaceId: string, platform: SyncedPlatform, days: number) {
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const from = new Date(today.getTime() - (days - 1) * DAY_MS);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  const [rows, previous] = await Promise.all([
    prisma.platformMetricDaily.findMany({ where: { workspaceId, platform, date: { gte: from, lte: today } }, orderBy: { date: "asc" } }),
    prisma.platformMetricDaily.findMany({ where: { workspaceId, platform, date: { gte: prevFrom, lt: from } } })
  ]);
  const t = totals(rows);
  const p = totals(previous);
  const roas = t.spend > 0 ? round(t.revenue / t.spend) : 0;
  const prevRoas = p.spend > 0 ? p.revenue / p.spend : 0;
  const byDate = new Map<string, Totals>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const day = byDate.get(key) || { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    byDate.set(key, totals([day, row]));
  }
  return {
    hasData: rows.length > 0,
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    summary: {
      totalSpend: round(t.spend),
      impressions: t.impressions,
      clicks: t.clicks,
      conversions: round(t.conversions),
      revenue: round(t.revenue),
      ctr: t.impressions > 0 ? round((t.clicks / t.impressions) * 100) : 0,
      cpc: t.clicks > 0 ? round(t.spend / t.clicks) : 0,
      cpa: t.conversions > 0 ? round(t.spend / t.conversions) : 0,
      conversionRate: t.clicks > 0 ? round((t.conversions / t.clicks) * 100) : 0,
      roas,
      change: { spend: change(t.spend, p.spend), clicks: change(t.clicks, p.clicks), conversions: change(t.conversions, p.conversions), roas: prevRoas > 0 ? round(((roas - prevRoas) / prevRoas) * 100, 1) : 0 }
    },
    dailyTrend: Array.from(byDate.entries()).map(([date, d]) => ({ date, spend: round(d.spend), impressions: d.impressions, clicks: d.clicks, conversions: round(d.conversions), revenue: round(d.revenue) }))
  };
}

/** Campaigns stored in MarketerOS for a platform, with only the metrics actually recorded on them. */
export async function platformCampaigns(workspaceId: string, platform: SyncedPlatform) {
  const campaigns = await prisma.campaign.findMany({ where: { workspaceId, platform, status: { not: "DELETED" } }, orderBy: { updatedAt: "desc" }, take: 200 });
  return campaigns.map((c) => {
    const spend = Number(c.spend);
    const revenue = spend * Number(c.roas || 0);
    return {
      id: c.id,
      name: c.name,
      channelType: c.type,
      status: c.status === "ACTIVE" ? "ENABLED" : c.status,
      budget: Number(c.dailyBudget || c.budget || 0),
      spend,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      ctr: c.impressions > 0 ? round((c.clicks / c.impressions) * 100) : 0,
      cpc: c.clicks > 0 ? round(spend / c.clicks) : 0,
      cpa: c.conversions > 0 ? round(spend / c.conversions) : 0,
      roas: Number(c.roas || 0),
      revenue: round(revenue),
      conversionRate: c.clicks > 0 ? round((c.conversions / c.clicks) * 100) : 0
    };
  });
}
