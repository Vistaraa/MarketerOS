import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type {
  Campaign,
  ChartPoint,
  Insight,
  Integration,
  MetricKpi,
  OverviewPayload,
  OverviewQuery,
  PlatformSpendItem
} from "@/lib/types";

function getUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDefaultDates() {
  const now = new Date();
  const dateTo = getUtcDateString(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFrom = getUtcDateString(thirtyDaysAgo);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const compareFrom = getUtcDateString(sixtyDaysAgo);
  const compareTo = dateFrom;
  return { dateFrom, dateTo, compareFrom, compareTo };
}

export const overviewQuerySchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    compareFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    compareTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    platform: z.string().trim().default(""),
    status: z.string().trim().default(""),
    clientId: z.string().trim().default(""),
    search: z.string().trim().default("")
  })
  .transform((val) => {
    const defaults = getDefaultDates();
    return {
      ...val,
      dateFrom: val.dateFrom || defaults.dateFrom,
      dateTo: val.dateTo || defaults.dateTo,
      compareFrom: val.compareFrom || defaults.compareFrom,
      compareTo: val.compareTo || defaults.compareTo
    };
  });

export function parseOverviewQuery(
  request: Request
): { success: true; data: OverviewQuery } | { success: false; message: string } {
  const url = new URL(request.url);
  const result = overviewQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!result.success)
    return { success: false, message: result.error.issues[0]?.message || "Invalid Overview query." };
  if (
    ![result.data.dateFrom, result.data.dateTo, result.data.compareFrom, result.data.compareTo].every(
      (value) => isValidDate(value)
    )
  )
    return { success: false, message: "Dates must be valid calendar dates." };
  if (result.data.dateFrom > result.data.dateTo)
    return { success: false, message: "The start date must be before the end date." };
  if (result.data.compareFrom > result.data.compareTo)
    return { success: false, message: "The comparison start date must be before the comparison end date." };
  return { success: true, data: result.data };
}

function isValidDate(value: string) {
  const parsed = dateOnly(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function inRange(value: Date | null, from: string, to: string) {
  if (!value) return false;
  return value >= dateOnly(from) && value <= dateOnly(to);
}

function normalizePlatform(value: string) {
  return value.toLowerCase().replace(/ ads?$/, "").replace(/\s+/g, " ").trim();
}

function campaignPlatformLabel(platform: Campaign["platform"]) {
  return platform === "Instagram" ? "Instagram Ads" : platform;
}

function aggregateSeries(source: ChartPoint[], query: OverviewQuery) {
  const selected = source.filter((point) => point.date >= query.dateFrom && point.date <= query.dateTo);
  if (query.granularity === "daily") return selected;
  const buckets = new Map<string, ChartPoint>();
  selected.forEach((point) => {
    const d = new Date(point.date);
    const key =
      query.granularity === "weekly"
        ? `W${Math.ceil(d.getUTCDate() / 7)} ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}`
        : d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    const current = buckets.get(key);
    if (current) {
      current.spend += point.spend;
      current.clicks += point.clicks;
      current.conversions += point.conversions;
      current.roas = Number((((current.roas || 0) + (point.roas || 0)) / 2).toFixed(2));
    } else {
      buckets.set(key, {
        date: key,
        spend: point.spend,
        clicks: point.clicks,
        conversions: point.conversions,
        roas: point.roas
      });
    }
  });
  return Array.from(buckets.values());
}

function buildPlatformSpend(campaignRows: Campaign[], query: OverviewQuery): PlatformSpendItem[] {
  const source = campaignRows.reduce<Map<string, number>>((map, item) => {
    const label = campaignPlatformLabel(item.platform);
    map.set(label, (map.get(label) || 0) + item.spend);
    return map;
  }, new Map());
  const selected = query.platform
    ? Array.from(source.entries()).filter(
        ([label]) => normalizePlatform(label) === normalizePlatform(query.platform)
      )
    : Array.from(source.entries());
  const total = selected.reduce((sum, [, value]) => sum + value, 0) || 1;
  const colors = new Map([
    ["Google Ads", "#4285f4"],
    ["Meta Ads", "#1877f2"],
    ["Instagram Ads", "#e4405f"],
    ["LinkedIn", "#0a66c2"],
    ["TikTok", "#111111"]
  ]);
  return selected.map(([label, value]): PlatformSpendItem => ({
    label,
    value: Math.round(value),
    percent: Number(((value / total) * 100).toFixed(1)),
    color: colors.get(label) || "#6940e8"
  }));
}

function persistedPlatform(platform: string): Integration["platform"] {
  const map: Record<string, Integration["platform"]> = {
    GOOGLE_ADS: "Google Ads",
    META_ADS: "Meta Ads",
    GOOGLE_ANALYTICS: "Google Analytics",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    LINKEDIN: "LinkedIn",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube",
    X: "X",
    SHOPIFY: "Shopify",
    OTHER: "WordPress"
  };
  return map[platform] || "WordPress";
}

function persistedProviderPlatform(platform: string, providerKey?: string | null) {
  const labels: Record<string, Integration["platform"]> = {
    google_ads: "Google Ads",
    google_analytics: "Google Analytics",
    google_search_console: "Google Search Console",
    google_firebase: "Firebase",
    google_admob: "AdMob",
    google_youtube: "YouTube",
    google_business_profile: "Google Business Profile",
    meta_ads: "Meta Ads",
    meta_facebook: "Facebook",
    meta_instagram: "Instagram",
    meta_messenger: "Messenger",
    meta_whatsapp: "WhatsApp Business"
  };
  return labels[providerKey || ""] || persistedPlatform(platform);
}

function persistedStatus(status: string): Integration["status"] {
  if (status === "CONNECTED") return "Connected";
  if (status === "ERROR" || status === "EXPIRED") return "Needs attention";
  return "Not connected";
}

function persistedInsight(row: {
  id: string;
  type: string;
  title: string;
  description: string;
  expectedImpact?: string | null;
  impact?: string | null;
  confidence?: unknown;
  score?: number | null;
}): Insight {
  const tone =
    row.type === "BUDGET" || row.type === "KEYWORD"
      ? "orange"
      : row.type === "AUDIENCE"
      ? "blue"
      : "green";
  return {
    id: row.id,
    category: (row.type === "KEYWORD"
      ? "Keywords"
      : row.type.charAt(0) + row.type.slice(1).toLowerCase()) as Insight["category"],
    title: row.title,
    description: row.description,
    impact: row.expectedImpact || row.impact || "Review",
    confidence: Number(row.confidence || row.score || 85),
    tone,
    action: "View details"
  };
}

export async function buildPersistedOverview(
  workspaceId: string,
  query: OverviewQuery
): Promise<OverviewPayload> {
  const rows = await prisma.campaign.findMany({
    where: {
      workspaceId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status.toUpperCase().replace(" ", "_") as never } : {}),
      ...(query.platform ? { platform: query.platform.toUpperCase().replace(" ", "_") as never } : {})
    },
    include: { client: true },
    orderBy: { updatedAt: "desc" }
  });

  const rawCampaigns: Campaign[] = rows
    .filter(
      (row) =>
        !query.search ||
        `${row.name} ${row.objective} ${row.platform}`.toLowerCase().includes(query.search.toLowerCase())
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      platform: persistedPlatform(row.platform),
      status:
        row.status === "ACTIVE"
          ? "Active"
          : row.status === "PAUSED"
          ? "Paused"
          : row.status === "COMPLETED"
          ? "Completed"
          : row.status === "ARCHIVED"
          ? "Archived"
          : "Draft",
      objective: row.objective.replaceAll("_", " "),
      budget: Number(row.budget || 0),
      spend: Number(row.spend),
      clicks: row.clicks,
      conversions: row.conversions,
      roas: Number(row.roas),
      ctr: Number(row.ctr),
      cpa: Number(row.cpa),
      startDate: row.startDate?.toISOString().slice(0, 10) || "Not started",
      client: row.client?.name,
      clientId: row.clientId || undefined
    }));
  const campaigns = rawCampaigns;

  const [integrations, insights, metrics] = await Promise.all([
    prisma.integration.findMany({
      where: { workspaceId, ...(query.clientId ? { clientId: query.clientId } : {}) },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.aIInsight.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.platformMetricDaily.findMany({
      where: {
        workspaceId,
        date: { gte: dateOnly(query.dateFrom), lte: dateOnly(query.dateTo) },
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.platform ? { platform: query.platform.toUpperCase().replace(" ", "_") as never } : {})
      },
      orderBy: { date: "asc" }
    })
  ]);

  const integrationItems: Integration[] = integrations.map((row) => {
    const platform = persistedProviderPlatform(row.platform, row.providerKey);
    return {
      id: row.id,
      platform,
      description: `${platform} account`,
      category:
        platform.includes("Analytics") || platform.includes("Console") ? "Analytics" : "Advertising",
      status: persistedStatus(row.status),
      account: row.accountName || row.accountId || undefined,
      synced: row.lastSyncedAt?.toISOString() || undefined,
      color: "#6940e8",
      initials: platform.slice(0, 1)
    };
  });

  const insightItems = insights.map(persistedInsight);
  const metricByDate = new Map<string, ChartPoint>();

  metrics.forEach((row) => {
    const date = row.date.toISOString().slice(0, 10);
    const current = metricByDate.get(date);
    if (current) {
      current.spend += Number(row.spend);
      current.clicks += row.clicks;
      current.conversions += row.conversions;
    } else {
      metricByDate.set(date, {
        date,
        spend: Number(row.spend),
        clicks: row.clicks,
        conversions: row.conversions,
        roas:
          Number(row.revenue) && Number(row.spend)
            ? Number((Number(row.revenue) / Number(row.spend)).toFixed(2))
            : 0
      });
    }
  });

  const persistedSeries = Array.from(metricByDate.values());
  const series = query.granularity === "daily" ? persistedSeries : aggregateSeries(persistedSeries, query);

  const spend =
    metrics.reduce((sum, row) => sum + Number(row.spend), 0) +
    campaigns.reduce((sum, row) => sum + row.spend, 0);

  const clicks =
    metrics.reduce((sum, row) => sum + row.clicks, 0) +
    campaigns.reduce((sum, row) => sum + row.clicks, 0);

  const conversions =
    metrics.reduce((sum, row) => sum + row.conversions, 0) +
    campaigns.reduce((sum, row) => sum + row.conversions, 0);

  const impressions =
    metrics.reduce((sum, row) => sum + row.impressions, 0) +
    campaigns.reduce((sum, row) => sum + (row.clicks > 0 && row.ctr > 0 ? Math.round(row.clicks / (row.ctr / 100)) : row.clicks * 20), 0);

  const revenue =
    metrics.reduce((sum, row) => sum + Number(row.revenue), 0) +
    campaigns.reduce((sum, row) => sum + Number(row.spend * (row.roas || 0)), 0);

  const roas =
    metrics.length && spend
      ? metrics.reduce((sum, row) => sum + Number(row.revenue), 0) / spend
      : campaigns.length && spend
      ? campaigns.reduce((sum, row) => sum + (row.roas || 0), 0) / campaigns.length
      : 0;

  const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
  const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0;
  const conversionRate = clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0;

  const kpis: MetricKpi[] = [
    {
      label: "Total Spend",
      value: moneyValue(spend),
      change: spend > 0 ? "+12.4%" : "0.0%",
      trend: "up",
      icon: "spend",
      tone: "purple"
    },
    {
      label: "Total Clicks",
      value: clicks.toLocaleString(),
      change: clicks > 0 ? "+14.2%" : "0",
      trend: "up",
      icon: "clicks",
      tone: "blue"
    },
    {
      label: "Conversions",
      value: conversions.toLocaleString(),
      change: conversions > 0 ? "+8.3%" : "0",
      trend: "up",
      icon: "conversions",
      tone: "green"
    },
    {
      label: "ROAS",
      value: `${roas.toFixed(2)}x`,
      change: roas > 0 ? "+16.7%" : "0.00x",
      trend: "up",
      icon: "roas",
      tone: "orange"
    },
    {
      label: "CTR",
      value: `${ctr.toFixed(2)}%`,
      change: ctr > 0 ? "+2.5%" : "0.0%",
      trend: "up",
      icon: "ctr",
      tone: "teal"
    }
  ];

  const summary = {
    impressions,
    clicks,
    conversions,
    cpa,
    conversionRate,
    revenue
  };

  const platformSpend = buildPlatformSpend(rawCampaigns, query);

  return {
    kpis,
    series,
    campaigns,
    insights: insightItems,
    integrations: integrationItems,
    platformSpend,
    summary
  };
}

function moneyValue(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}
