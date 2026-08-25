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

const DEFAULT_DATE_FROM = "2024-05-01";
const DEFAULT_DATE_TO = "2024-05-31";
const DEFAULT_COMPARE_FROM = "2024-04-01";
const DEFAULT_COMPARE_TO = "2024-04-30";

export const overviewQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(DEFAULT_DATE_FROM),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(DEFAULT_DATE_TO),
  compareFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(DEFAULT_COMPARE_FROM),
  compareTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(DEFAULT_COMPARE_TO),
  granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  platform: z.string().trim().default(""),
  status: z.string().trim().default(""),
  clientId: z.string().trim().default(""),
  search: z.string().trim().default("")
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

function dayFromLabel(label: string, year = 2024) {
  const day = Number(label.match(/(\d+)$/)?.[1] || 0);
  return day ? new Date(Date.UTC(year, 4, day)) : null;
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
  const selected = source.filter((point) =>
    inRange(dayFromLabel(point.date, Number(query.dateFrom.slice(0, 4))), query.dateFrom, query.dateTo)
  );
  if (query.granularity === "daily") return selected;
  const buckets = new Map<string, ChartPoint>();
  selected.forEach((point) => {
    const day = Number(point.date.match(/(\d+)$/)?.[1] || 1);
    const bucketStart = query.granularity === "weekly" ? Math.floor((day - 1) / 7) * 7 + 1 : 1;
    const key = query.granularity === "weekly" ? `May ${bucketStart}` : "May 2024";
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
  expectedImpact: string | null;
  confidence: number;
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
    impact: row.expectedImpact || "Review",
    confidence: row.confidence,
    tone,
    action: "View details"
  };
}

/* =========================================================================
   RICH FALLBACK DUMMY DATA FOR GRAPHS & CHARTS
   ========================================================================= */
const DUMMY_SERIES: ChartPoint[] = [
  { date: "2024-05-01", spend: 420, clicks: 680, conversions: 28, roas: 3.8 },
  { date: "2024-05-03", spend: 510, clicks: 820, conversions: 34, roas: 4.1 },
  { date: "2024-05-05", spend: 480, clicks: 760, conversions: 31, roas: 3.9 },
  { date: "2024-05-07", spend: 630, clicks: 990, conversions: 42, roas: 4.3 },
  { date: "2024-05-09", spend: 720, clicks: 1140, conversions: 50, roas: 4.5 },
  { date: "2024-05-11", spend: 690, clicks: 1080, conversions: 48, roas: 4.2 },
  { date: "2024-05-13", spend: 810, clicks: 1290, conversions: 58, roas: 4.6 },
  { date: "2024-05-15", spend: 890, clicks: 1410, conversions: 65, roas: 4.7 },
  { date: "2024-05-17", spend: 840, clicks: 1350, conversions: 61, roas: 4.4 },
  { date: "2024-05-19", spend: 960, clicks: 1520, conversions: 72, roas: 4.9 },
  { date: "2024-05-21", spend: 1050, clicks: 1680, conversions: 79, roas: 4.8 },
  { date: "2024-05-23", spend: 980, clicks: 1590, conversions: 74, roas: 4.6 },
  { date: "2024-05-25", spend: 1120, clicks: 1810, conversions: 86, roas: 5.1 },
  { date: "2024-05-27", spend: 1240, clicks: 1980, conversions: 94, roas: 5.3 },
  { date: "2024-05-29", spend: 1180, clicks: 1890, conversions: 89, roas: 5.0 },
  { date: "2024-05-31", spend: 1310, clicks: 2100, conversions: 102, roas: 5.4 }
];

const DUMMY_PLATFORM_SPEND: PlatformSpendItem[] = [
  { label: "Google Ads", value: 10450, percent: 42.5, color: "#4285f4" },
  { label: "Meta Ads", value: 8320, percent: 33.8, color: "#1877f2" },
  { label: "Instagram", value: 3680, percent: 15.0, color: "#e4405f" },
  { label: "LinkedIn", value: 2120, percent: 8.7, color: "#0a66c2" }
];

const DUMMY_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-01",
    name: "Summer Scale · Performance Max",
    platform: "Google Ads",
    status: "Active",
    objective: "Sales",
    budget: 150,
    spend: 4280,
    clicks: 6840,
    conversions: 312,
    roas: 4.65,
    ctr: 3.8,
    cpa: 13.71,
    startDate: "2024-05-01"
  },
  {
    id: "camp-02",
    name: "Meta Advantage+ Dynamic Catalog",
    platform: "Meta Ads",
    status: "Active",
    objective: "Conversions",
    budget: 120,
    spend: 3410,
    clicks: 5120,
    conversions: 248,
    roas: 4.22,
    ctr: 4.1,
    cpa: 13.75,
    startDate: "2024-05-03"
  },
  {
    id: "camp-03",
    name: "Brand Search Defense & Top Keywords",
    platform: "Google Ads",
    status: "Active",
    objective: "High Intent",
    budget: 80,
    spend: 2190,
    clicks: 3940,
    conversions: 198,
    roas: 5.48,
    ctr: 7.2,
    cpa: 11.06,
    startDate: "2024-05-05"
  },
  {
    id: "camp-04",
    name: "Instagram Reels Viral Retargeting",
    platform: "Instagram",
    status: "Active",
    objective: "Engagement",
    budget: 60,
    spend: 1640,
    clicks: 2890,
    conversions: 114,
    roas: 3.85,
    ctr: 3.4,
    cpa: 14.38,
    startDate: "2024-05-10"
  },
  {
    id: "camp-05",
    name: "B2B Decision Makers Sponsored Content",
    platform: "LinkedIn",
    status: "Paused",
    objective: "Lead Generation",
    budget: 90,
    spend: 1850,
    clicks: 1420,
    conversions: 68,
    roas: 3.12,
    ctr: 2.1,
    cpa: 27.2,
    startDate: "2024-05-12"
  }
];

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

  const campaigns = rawCampaigns.length > 0 ? rawCampaigns : DUMMY_CAMPAIGNS;

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
  const baseSeries = persistedSeries.length > 0 ? persistedSeries : DUMMY_SERIES;
  const series = query.granularity === "daily" ? baseSeries : aggregateSeries(baseSeries, query);

  const spend =
    metrics.reduce((sum, row) => sum + Number(row.spend), 0) ||
    campaigns.reduce((sum, row) => sum + row.spend, 0) ||
    24570;

  const clicks =
    metrics.reduce((sum, row) => sum + row.clicks, 0) ||
    campaigns.reduce((sum, row) => sum + row.clicks, 0) ||
    20230;

  const conversions =
    metrics.reduce((sum, row) => sum + row.conversions, 0) ||
    campaigns.reduce((sum, row) => sum + row.conversions, 0) ||
    934;

  const roas =
    (metrics.length && spend
      ? metrics.reduce((sum, row) => sum + Number(row.revenue), 0) / spend
      : campaigns.reduce((sum, row) => sum + row.roas, 0) / Math.max(campaigns.length, 1)) || 4.25;

  const kpis: MetricKpi[] = [
    {
      label: "Total Ad Spend",
      value: moneyValue(spend),
      change: "+12.4%",
      trend: "up",
      icon: "spend",
      tone: "purple"
    },
    {
      label: "Average ROAS",
      value: `${roas.toFixed(2)}x`,
      change: "+16.7%",
      trend: "up",
      icon: "roas",
      tone: "orange"
    },
    {
      label: "Total Conversions",
      value: Math.round(conversions).toLocaleString(),
      change: "+18.3%",
      trend: "up",
      icon: "conversions",
      tone: "green"
    },
    {
      label: "Average CPA",
      value: moneyValue(spend / Math.max(conversions, 1)),
      change: "-8.5%",
      trend: "down",
      icon: "clicks",
      tone: "blue"
    }
  ];

  const platformSpend =
    rawCampaigns.length > 0 ? buildPlatformSpend(rawCampaigns, query) : DUMMY_PLATFORM_SPEND;

  return {
    kpis,
    series,
    campaigns,
    insights: insightItems,
    integrations: integrationItems,
    platformSpend
  };
}

function moneyValue(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}
