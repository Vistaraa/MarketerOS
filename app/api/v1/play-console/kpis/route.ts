import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errors";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { getPlayConsoleApp } from "@/lib/google/play-console";
import { Platform } from "@prisma/client";
import { getDecryptedGoogleIntegration, getGoogleAdsCampaigns, formatCustomerId } from "@/lib/google";

const DEFAULT_PINNED = ["user_acquisitions", "store_visitors", "conversion_rate", "total_audience", "crashes_anrs"];

// Metrics that cannot be derived from the stored Play Console columns. They are always null rather than
// estimated: this route used to fill them with fixed constants and multipliers.
const UNAVAILABLE_METRICS = {
  totalInstalls: null,
  dailyActiveUsers: null,
  monthlyActiveUsers: null,
  returningUsers: null,
  userEngagementMins: null,
  newUserRetention: null,
  acquisitionSource: null,
  adSpend: null,
  cpi: null,
  paidInstalls: null,
  organicInstalls: null,
  roas: null
};

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const url = new URL(request.url);
    const packageNameParam = url.searchParams.get("packageName");
    const clientIdParam = url.searchParams.get("clientId");

    const preferences = await prisma.userKpiPreference.findUnique({ where: { workspaceId } });
    const userPreferences = preferences
      ? { pinnedKpis: preferences.pinnedKpis, kpiOrder: preferences.kpiOrder }
      : { pinnedKpis: DEFAULT_PINNED, kpiOrder: DEFAULT_PINNED };

    const playIntegration = await prisma.integration.findFirst({
      where: { workspaceId, platform: Platform.GOOGLE_PLAY, status: "CONNECTED" }
    });

    const app = packageNameParam
      ? await prisma.playConsoleApp.findFirst({ where: { workspaceId, packageName: packageNameParam } })
      : await getPlayConsoleApp(workspaceId, clientIdParam || undefined);

    const dailyKpis = app
      ? await prisma.playConsoleKpiDaily.findMany({ where: { workspaceId, appId: app.id }, orderBy: { date: "asc" }, take: 30 })
      : [];

    const googleAdsTelemetry = await loadGoogleAdsTelemetry(workspaceId);

    const base = {
      app: app ? { id: app.id, packageName: app.packageName, appTitle: app.appTitle, category: app.category } : null,
      googlePlayTelemetry: {
        connected: Boolean(playIntegration),
        accountName: playIntegration?.accountName || app?.appTitle || null,
        packageName: app?.packageName || null
      },
      googleAdsTelemetry,
      userPreferences
    };

    if (!app || dailyKpis.length === 0) {
      return NextResponse.json({ ...base, hasData: false, latestDateLabel: null, rolling28: {}, latest: {}, timeSeries: [] });
    }

    // Everything below comes straight from stored daily snapshots.
    const last28 = dailyKpis.slice(-28);
    const count = last28.length;
    const avg = (pick: (row: (typeof last28)[number]) => number) => last28.reduce((acc, row) => acc + pick(row), 0) / count;
    const latest = dailyKpis[dailyKpis.length - 1];
    const first = dailyKpis[0];
    const growthRate = first.totalAudienceSize > 0
      ? round(((latest.totalAudienceSize - first.totalAudienceSize) / first.totalAudienceSize) * 100)
      : null;

    const metricsFor = (row: (typeof dailyKpis)[number]) => ({
      userAcquisitions: row.storeListingAcquisitions,
      storeListingVisitors: row.storeListingVisitors,
      storeListingAcquisitions: row.storeListingAcquisitions,
      storeListingConversionRate: Number(row.storeListingConversionRate),
      totalAudienceSize: row.totalAudienceSize,
      activeDevices: row.activeDevices,
      userLoss: row.uninstallsCount,
      uninstallRate: row.activeDevices > 0 ? round((row.uninstallsCount / row.activeDevices) * 100, 2) : null,
      // revenue defaults to 0 when nothing imported it, so 0 means "unknown" here rather than "earned nothing".
      arpu: Number(row.revenue) > 0 && row.activeDevices > 0 ? round(Number(row.revenue) / row.activeDevices, 2) : null,
      crashesAndAnrs: row.crashesCount + row.anrsCount
    });

    const sumActiveDevices = last28.reduce((acc, row) => acc + row.activeDevices, 0);
    const sumRevenue = last28.reduce((acc, row) => acc + Number(row.revenue || 0), 0);
    const hasRevenue = last28.some((row) => Number(row.revenue) > 0);

    const rolling28 = {
      ...UNAVAILABLE_METRICS,
      userAcquisitions: Math.round(avg((r) => r.storeListingAcquisitions)),
      storeListingVisitors: Math.round(avg((r) => r.storeListingVisitors)),
      storeListingAcquisitions: Math.round(avg((r) => r.storeListingAcquisitions)),
      storeListingConversionRate: round(avg((r) => Number(r.storeListingConversionRate))),
      totalAudienceSize: Math.round(avg((r) => r.totalAudienceSize)),
      audienceGrowthRate: growthRate,
      activeDevices: Math.round(avg((r) => r.activeDevices)),
      userLoss: Math.round(avg((r) => r.uninstallsCount)),
      uninstallRate: sumActiveDevices > 0 ? round((last28.reduce((acc, r) => acc + r.uninstallsCount, 0) / sumActiveDevices) * 100, 2) : null,
      arpu: hasRevenue && sumActiveDevices > 0 ? round(sumRevenue / sumActiveDevices, 2) : null,
      crashesAndAnrs: round(avg((r) => r.crashesCount + r.anrsCount))
    };

    return NextResponse.json({
      ...base,
      hasData: true,
      latestDateLabel: latest.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      rolling28,
      latest: { ...UNAVAILABLE_METRICS, ...metricsFor(latest), audienceGrowthRate: growthRate },
      timeSeries: dailyKpis.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        label: row.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...metricsFor(row)
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: logServerError("v1/play-console/kpis", "Failed to fetch Google Play KPIs.", error) }, { status: 500 });
  }
}

/** Google Ads totals from the live API, or from recorded campaign metrics. Budgets are never treated as spend. */
async function loadGoogleAdsTelemetry(workspaceId: string) {
  const adsIntegration = await getDecryptedGoogleIntegration(workspaceId, Platform.GOOGLE_ADS);
  const rawAdsIntegration = adsIntegration || await prisma.integration.findFirst({ where: { workspaceId, platform: Platform.GOOGLE_ADS } });

  let liveCampaigns: Array<{ name: string; costDollars: number; clicks: number; conversions: number }> = [];
  if (adsIntegration?.oauth && adsIntegration?.developerToken) {
    try {
      liveCampaigns = await getGoogleAdsCampaigns({
        developerToken: adsIntegration.developerToken,
        clientId: adsIntegration.oauth.clientId,
        clientSecret: adsIntegration.oauth.clientSecret,
        refreshToken: adsIntegration.oauth.refreshToken,
        customerId: formatCustomerId(adsIntegration.accountId),
        loginCustomerId: adsIntegration.loginCustomerId ? formatCustomerId(adsIntegration.loginCustomerId) : undefined
      });
    } catch (err) {
      console.warn("[PLAY_CONSOLE_GOOGLE_ADS_FETCH_WARN]", err);
    }
  }

  const liveNames = new Set(liveCampaigns.map((c) => c.name.toLowerCase()));
  const recorded = (await prisma.campaign.findMany({ where: { workspaceId } }))
    .filter((c) => !liveNames.has(c.name.toLowerCase()))
    .map((c) => ({ name: c.name, costDollars: Number(c.spend || 0), clicks: c.clicks || 0, conversions: c.conversions || 0 }));
  const all = [...liveCampaigns, ...recorded];

  return {
    connected: Boolean(rawAdsIntegration),
    accountName: adsIntegration?.accountName || rawAdsIntegration?.accountName || rawAdsIntegration?.accountId || null,
    totalSpend: all.reduce((acc, c) => acc + (Number(c.costDollars) || 0), 0),
    totalConversions: all.reduce((acc, c) => acc + (Number(c.conversions) || 0), 0),
    totalClicks: all.reduce((acc, c) => acc + (Number(c.clicks) || 0), 0)
  };
}
