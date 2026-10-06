import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { platformCampaigns, platformPerformance, rangeDays } from "@/lib/platform-performance";

export const runtime = "nodejs";

/** Meta Ads dashboard data from synced daily metrics (never estimated). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const range = req.nextUrl.searchParams.get("range") || "last_30_days";
  const integration = await prisma.integration.findFirst({ where: { workspaceId: session.workspaceId, platform: "META_ADS" } });
  const [performance, campaigns] = await Promise.all([
    platformPerformance(session.workspaceId, "META_ADS", rangeDays(range)),
    platformCampaigns(session.workspaceId, "META_ADS")
  ]);
  const metadata = (integration?.metadata as { currency?: string; timezone?: string } | null) || {};
  const s = performance.summary;
  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId: integration?.accountId || "",
        accountName: integration?.accountName || "Meta Ads",
        status: integration?.status === "CONNECTED" ? "Connected" : integration?.status === "ERROR" ? "Error" : "Not Connected",
        currency: metadata.currency || "USD",
        timezone: metadata.timezone || "UTC",
        lastSyncTime: integration?.lastSyncedAt?.toISOString() || null,
        lastSyncError: integration?.status === "ERROR" ? integration.errorMessage : null,
        tokenExpiresAt: integration?.tokenExpiresAt?.toISOString() || null
      },
      hasData: performance.hasData,
      period: { from: performance.from, to: performance.to },
      summary: { totalSpend: s.totalSpend, impressions: s.impressions, clicks: s.clicks, conversions: s.conversions, revenue: s.revenue, ctr: s.ctr, cpc: s.cpc, cpa: s.cpa, roas: s.roas, change: s.change },
      dailyTrend: performance.dailyTrend,
      campaigns
    }
  });
}
