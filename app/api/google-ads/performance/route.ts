import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { platformCampaigns, platformPerformance, rangeDays } from "@/lib/platform-performance";

/** Google Ads dashboard data: account totals and trend from synced daily metrics, plus the workspace's campaigns. */
export async function GET(request: Request) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    const range = new URL(request.url).searchParams.get("range") || "last_30_days";
    const integration = await prisma.integration.findFirst({ where: { workspaceId: session.workspaceId, platform: "GOOGLE_ADS" } });
    const [performance, campaigns] = await Promise.all([
      platformPerformance(session.workspaceId, "GOOGLE_ADS", rangeDays(range)),
      platformCampaigns(session.workspaceId, "GOOGLE_ADS")
    ]);
    const s = performance.summary;
    return NextResponse.json({
      success: true,
      data: {
        account: {
          integrationId: integration?.id || null,
          customerId: integration?.accountId || "",
          accountName: integration?.accountName || "Google Ads",
          currency: "USD",
          timeZone: "UTC",
          status: integration?.status || "NOT_CONNECTED",
          lastSyncTime: integration?.lastSyncedAt?.toISOString() || null,
          lastSyncError: integration?.status === "ERROR" ? integration.errorMessage : null
        },
        hasData: performance.hasData,
        period: { from: performance.from, to: performance.to },
        summary: {
          totalSpend: s.totalSpend,
          impressions: s.impressions,
          clicks: s.clicks,
          conversions: s.conversions,
          conversionRate: s.conversionRate,
          ctr: s.ctr,
          averageCpc: s.cpc,
          costPerConversion: s.cpa,
          revenue: s.revenue,
          roas: s.roas,
          change: s.change
        },
        campaigns,
        dailyTrend: performance.dailyTrend,
        // Not synced yet (needs campaign/segment-level reports).
        networkBreakdown: [],
        devices: [],
        topKeywords: []
      }
    });
  } catch (error) {
    console.error("[google-ads] performance failed:", error);
    return NextResponse.json({ success: false, error: "Failed to load performance metrics." }, { status: 500 });
  }
}
