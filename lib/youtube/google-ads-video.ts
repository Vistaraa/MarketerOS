import { prisma } from "@/lib/prisma";
import { ProviderError, googleAdsSearchStream } from "@/lib/integrations/provider";
import { usableAccessToken } from "@/lib/integrations/tokens";
import type { YouTubeAdCampaign, YouTubeAdsMetrics } from "./ads-types";

export type YouTubeAdsSummary = { impressions: number; views: number | null; clicks: number; spend: number; conversions: number; ctr: number; cpv: number | null; viewRate: number | null };
export type YouTubeAdsResult =
  | { available: true; customerId: string; from: string; to: string; summary: YouTubeAdsSummary; campaigns: YouTubeAdCampaign[]; daily: YouTubeAdsMetrics[] }
  | { available: false; reason: string };

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const VIEWS_FIELD = "metrics.video_trueview_views";
const VIDEO_FILTER = "campaign.advertising_channel_type = 'VIDEO'";

/**
 * YouTube ad performance: VIDEO campaigns in the workspace's connected Google Ads account (the YouTube Data API
 * has no ad data). Returns a reason instead of numbers when Google Ads isn't connected or the query fails.
 */
export async function youtubeAdsFromGoogleAds(workspaceId: string, days = 30): Promise<YouTubeAdsResult> {
  const integration = await prisma.integration.findFirst({ where: { workspaceId, platform: "GOOGLE_ADS", status: { in: ["CONNECTED", "ERROR"] } } });
  const customerId = (integration?.accountId || "").replaceAll("-", "");
  if (!integration || !/^\d{10}$/.test(customerId)) {
    return { available: false, reason: "Connect Google Ads (and choose the account) to see impressions, views, clicks and spend for YouTube video campaigns." };
  }
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const loginCustomerId = (integration.metadata as { loginCustomerId?: string } | null)?.loginCustomerId;

  try {
    const token = await usableAccessToken(integration);
    const run = (select: string[], extra = "") =>
      googleAdsSearchStream(token, customerId, `SELECT ${select.join(", ")} FROM campaign WHERE ${VIDEO_FILTER} AND segments.date BETWEEN '${from}' AND '${to}'${extra}`, loginCustomerId);
    const base = ["metrics.impressions", "metrics.clicks", "metrics.cost_micros", "metrics.conversions"];
    // View metrics were renamed across API versions; if this version rejects the field, report views as unknown.
    let withViews = true;
    let campaignRows;
    try {
      campaignRows = await run(["campaign.id", "campaign.name", "campaign.status", ...base, VIEWS_FIELD]);
    } catch (error) {
      if (!(error instanceof ProviderError) || !/video_trueview_views|unrecognized field|invalid field/i.test(error.message)) throw error;
      withViews = false;
      campaignRows = await run(["campaign.id", "campaign.name", "campaign.status", ...base]);
    }
    const dailyRows = await run(["segments.date", ...base, ...(withViews ? [VIEWS_FIELD] : [])]);

    const metricsOf = (row: Record<string, Record<string, unknown> | undefined>) => {
      const m = row.metrics || {};
      return { impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0), spend: Number(m.costMicros || 0) / 1_000_000, conversions: Number(m.conversions || 0), views: withViews ? Number(m.videoTrueviewViews || 0) : 0 };
    };
    const campaigns: YouTubeAdCampaign[] = campaignRows.map((row) => {
      const c = row.campaign || {};
      const m = metricsOf(row);
      return {
        id: String(c.id || ""),
        name: String(c.name || "Video campaign"),
        status: (["ENABLED", "PAUSED", "REMOVED"].includes(String(c.status)) ? c.status : "UNKNOWN") as YouTubeAdCampaign["status"],
        budget: 0,
        budgetType: "DAILY",
        startDate: "",
        ...m,
        cpc: m.clicks ? round(m.spend / m.clicks) : 0,
        cpm: m.impressions ? round((m.spend / m.impressions) * 1000) : 0,
        ctr: m.impressions ? round((m.clicks / m.impressions) * 100) : 0,
        viewRate: withViews && m.impressions ? round((m.views / m.impressions) * 100) : 0,
        CPV: withViews && m.views ? round(m.spend / m.views, 4) : 0
      };
    });
    const byDate = new Map<string, YouTubeAdsMetrics>();
    for (const row of dailyRows) {
      const date = String(row.segments?.date || "");
      if (!date) continue;
      const m = metricsOf(row);
      const d = byDate.get(date) || { date, impressions: 0, views: 0, clicks: 0, spend: 0, conversions: 0 };
      byDate.set(date, { date, impressions: d.impressions + m.impressions, views: d.views + m.views, clicks: d.clicks + m.clicks, spend: round(d.spend + m.spend), conversions: d.conversions + m.conversions });
    }
    const t = campaigns.reduce((acc, c) => ({ impressions: acc.impressions + c.impressions, views: acc.views + c.views, clicks: acc.clicks + c.clicks, spend: acc.spend + c.spend, conversions: acc.conversions + c.conversions }), { impressions: 0, views: 0, clicks: 0, spend: 0, conversions: 0 });
    return {
      available: true,
      customerId,
      from,
      to,
      summary: {
        impressions: t.impressions,
        views: withViews ? t.views : null,
        clicks: t.clicks,
        spend: round(t.spend),
        conversions: round(t.conversions),
        ctr: t.impressions ? round((t.clicks / t.impressions) * 100) : 0,
        cpv: withViews && t.views ? round(t.spend / t.views, 4) : null,
        viewRate: withViews && t.impressions ? round((t.views / t.impressions) * 100) : null
      },
      campaigns,
      daily: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (error) {
    return { available: false, reason: `Google Ads couldn't return YouTube campaign data: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}
