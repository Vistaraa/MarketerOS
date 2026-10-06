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

    // Everything below comes straight from stored daily snapshots. A null column means the figure wasn't imported
    // (store-listing data needs Play's Cloud Storage reports), so it stays null rather than becoming 0.
    const last28 = dailyKpis.slice(-28);
    type Row = (typeof dailyKpis)[number];
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    const avg = (pick: (row: Row) => number | null, digits = 1) => {
      const values = last28.map(pick).filter((v): v is number => v !== null);
      return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, digits) : null;
    };
    const sum = (pick: (row: Row) => number | null) => {
      const values = last28.map(pick).filter((v): v is number => v !== null);
      return values.length ? values.reduce((a, b) => a + b, 0) : null;
    };
    const latest = dailyKpis[dailyKpis.length - 1];
    const firstAudience = dailyKpis.find((row) => row.totalAudienceSize !== null)?.totalAudienceSize ?? null;
    const latestAudience = latest.totalAudienceSize;
    const growthRate = firstAudience && latestAudience !== null ? round(((latestAudience - firstAudience) / firstAudience) * 100) : null;
    const pct = (fraction: unknown) => (fraction === null || fraction === undefined ? null : round(Number(fraction) * 100, 2));

    const metricsFor = (row: Row) => ({
      userAcquisitions: row.storeListingAcquisitions,
      storeListingVisitors: row.storeListingVisitors,
      storeListingAcquisitions: row.storeListingAcquisitions,
      storeListingConversionRate: num(row.storeListingConversionRate),
      totalAudienceSize: row.totalAudienceSize,
      activeDevices: row.activeDevices,
      userLoss: row.uninstallsCount,
      uninstallRate: row.uninstallsCount !== null && row.activeDevices ? round((row.uninstallsCount / row.activeDevices) * 100, 2) : null,
      arpu: num(row.revenue) && row.activeDevices ? round(Number(row.revenue) / row.activeDevices, 2) : null,
      crashesAndAnrs: row.crashesCount !== null && row.anrsCount !== null ? row.crashesCount + row.anrsCount : null,
      crashRate: pct(row.crashRate),
      anrRate: pct(row.anrRate),
      ratingAverage: num(row.ratingAverage),
      ratingsCount: row.ratingsCount
    });

    const sumActiveDevices = sum((r) => r.activeDevices);
    const sumUninstalls = sum((r) => r.uninstallsCount);
    const sumRevenue = sum((r) => num(r.revenue));
    const rated = last28.filter((r) => r.ratingsCount && r.ratingAverage !== null);
    const ratingsTotal = rated.reduce((acc, r) => acc + (r.ratingsCount || 0), 0);

    const rolling28 = {
      ...UNAVAILABLE_METRICS,
      userAcquisitions: avg((r) => r.storeListingAcquisitions, 0),
      storeListingVisitors: avg((r) => r.storeListingVisitors, 0),
      storeListingAcquisitions: avg((r) => r.storeListingAcquisitions, 0),
      storeListingConversionRate: avg((r) => num(r.storeListingConversionRate)),
      totalAudienceSize: avg((r) => r.totalAudienceSize, 0),
      audienceGrowthRate: growthRate,
      activeDevices: avg((r) => r.activeDevices, 0),
      userLoss: avg((r) => r.uninstallsCount, 0),
      uninstallRate: sumActiveDevices && sumUninstalls !== null ? round((sumUninstalls / sumActiveDevices) * 100, 2) : null,
      arpu: sumRevenue && sumActiveDevices ? round(sumRevenue / sumActiveDevices, 2) : null,
      crashesAndAnrs: avg((r) => (r.crashesCount !== null && r.anrsCount !== null ? r.crashesCount + r.anrsCount : null)),
      crashRate: avg((r) => pct(r.crashRate), 2),
      anrRate: avg((r) => pct(r.anrRate), 2),
      // Weighted by the number of reviews each day.
      ratingAverage: ratingsTotal ? round(rated.reduce((acc, r) => acc + Number(r.ratingAverage) * (r.ratingsCount || 0), 0) / ratingsTotal, 2) : null,
      ratingsCount: ratingsTotal || null
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
