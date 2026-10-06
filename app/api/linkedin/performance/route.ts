import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { platformCampaigns, platformPerformance, rangeDays } from "@/lib/platform-performance";

export const runtime = "nodejs";

/** LinkedIn Ads dashboard data from synced daily metrics (never estimated). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const range = req.nextUrl.searchParams.get("range") || "last_30_days";
  const integration = await prisma.integration.findFirst({ where: { workspaceId: session.workspaceId, platform: "LINKEDIN" } });
  const [performance, campaigns] = await Promise.all([
    platformPerformance(session.workspaceId, "LINKEDIN", rangeDays(range)),
    platformCampaigns(session.workspaceId, "LINKEDIN")
  ]);
  const metadata = (integration?.metadata as { currency?: string; timezone?: string } | null) || {};
  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId: integration?.accountId || "",
        accountName: integration?.accountName || "LinkedIn Ads",
        status: integration?.status === "CONNECTED" ? "Connected" : integration?.status === "ERROR" ? "Error" : "Not Connected",
        currency: metadata.currency || null,
        timezone: metadata.timezone || null,
        lastSyncTime: integration?.lastSyncedAt?.toISOString() || null,
        lastSyncError: integration?.status === "ERROR" ? integration.errorMessage : null
      },
      hasData: performance.hasData,
      period: { from: performance.from, to: performance.to },
      summary: performance.summary,
      dailyTrend: performance.dailyTrend,
      campaigns
    }
  });
}
