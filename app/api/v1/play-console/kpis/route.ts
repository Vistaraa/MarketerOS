import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { ensurePlayConsoleData } from "@/lib/google/play-console";

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

    const app = await ensurePlayConsoleData(workspaceId, clientIdParam || undefined);

    // Fetch user preferences
    const preferences = await prisma.userKpiPreference.findUnique({
      where: { workspaceId }
    });

    const activeApp = clientIdParam
      ? await prisma.playConsoleApp.findFirst({ where: { workspaceId, clientId: clientIdParam } }) || app
      : packageNameParam
      ? await prisma.playConsoleApp.findFirst({ where: { workspaceId, packageName: packageNameParam } }) || app
      : app;

    // Fetch 30 daily KPI snapshots
    const dailyKpis = await prisma.playConsoleKpiDaily.findMany({
      where: { workspaceId, appId: activeApp.id },
      orderBy: { date: "asc" },
      take: 30
    });

    // Compute 28-day rolling averages and latest target date metrics
    const count28 = Math.min(28, dailyKpis.length);
    const last28 = dailyKpis.slice(-28);

    const sumAudience = last28.reduce((acc, curr) => acc + curr.totalAudienceSize, 0);
    const sumVisitors = last28.reduce((acc, curr) => acc + curr.storeListingVisitors, 0);
    const sumConversion = last28.reduce((acc, curr) => acc + Number(curr.storeListingConversionRate), 0);
    const sumActiveDevices = last28.reduce((acc, curr) => acc + curr.activeDevices, 0);
    const sumCrashes = last28.reduce((acc, curr) => acc + curr.crashesCount + curr.anrsCount, 0);

    const rolling28 = {
      totalAudienceSize: count28 > 0 ? Math.round(sumAudience / count28) : 0,
      storeListingVisitors: count28 > 0 ? Math.round(sumVisitors / count28) : 0,
      storeListingConversionRate: count28 > 0 ? Number((sumConversion / count28).toFixed(1)) : 0,
      activeDevices: count28 > 0 ? Math.round(sumActiveDevices / count28) : 0,
      crashesAndAnrs: count28 > 0 ? Number((sumCrashes / count28).toFixed(1)) : 0
    };

    const latest = dailyKpis[dailyKpis.length - 1] || {
      date: new Date(),
      totalAudienceSize: 13345,
      storeListingVisitors: 1713,
      storeListingConversionRate: 5.0,
      activeDevices: 11500,
      crashesCount: 2,
      anrsCount: 0
    };

    const latestDateFormatted = new Date(latest.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    const timeSeries = dailyKpis.map((item) => ({
      date: item.date.toISOString().slice(0, 10),
      label: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      totalAudienceSize: item.totalAudienceSize,
      storeListingVisitors: item.storeListingVisitors,
      storeListingConversionRate: Number(item.storeListingConversionRate),
      activeDevices: item.activeDevices,
      crashesAndAnrs: item.crashesCount + item.anrsCount
    }));

    return NextResponse.json({
      app: {
        id: activeApp.id,
        packageName: activeApp.packageName,
        appTitle: activeApp.appTitle,
        category: activeApp.category
      },
      latestDateLabel: latestDateFormatted,
      rolling28,
      latest: {
        totalAudienceSize: latest.totalAudienceSize,
        storeListingVisitors: latest.storeListingVisitors,
        storeListingConversionRate: Number(latest.storeListingConversionRate),
        activeDevices: latest.activeDevices,
        crashesAndAnrs: (latest.crashesCount || 0) + (latest.anrsCount || 0)
      },
      timeSeries,
      userPreferences: preferences ? {
        pinnedKpis: preferences.pinnedKpis,
        kpiOrder: preferences.kpiOrder
      } : {
        pinnedKpis: ["total_audience", "store_visitors", "conversion_rate", "crashes_anrs", "daily_active"],
        kpiOrder: ["total_audience", "store_visitors", "conversion_rate", "crashes_anrs", "daily_active"]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch Google Play KPIs." }, { status: 500 });
  }
}
