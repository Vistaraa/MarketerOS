import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await listPersistedIntegrations(session.workspaceId);
  const tiktokIntegration = integrations.find(
    (i) => i.providerKey === "tiktok_ads" || i.platform.toLowerCase().includes("tiktok")
  );

  const isConnected = tiktokIntegration?.status === "Connected";
  const accountId = tiktokIntegration?.account || "7019283746192837461";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: tiktokIntegration?.account ? `TikTok Ads (${tiktokIntegration.account})` : "Acme TikTok Spark Ads",
        status: isConnected ? "Connected" : "Sample Data Mode",
        currency: "USD"
      },
      summary: {
        totalSpend: 9840.50,
        impressions: 890400,
        videoViews: 412800,
        clicks: 38900,
        conversions: 890,
        ctr: 4.37,
        cpc: 0.25,
        roas: 4.15
      },
      campaigns: [
        {
          id: "tt-camp-1",
          name: "TikTok Spark Ads — UGC Creator Campaign",
          status: "ACTIVE",
          dailyBudget: 150,
          spend: 5420.00,
          clicks: 22100,
          conversions: 510,
          ctr: 4.8,
          cpc: 0.24,
          roas: 4.35
        },
        {
          id: "tt-camp-2",
          name: "In-Feed Short Video Conversion Test",
          status: "ACTIVE",
          dailyBudget: 100,
          spend: 4420.50,
          clicks: 16800,
          conversions: 380,
          ctr: 4.0,
          cpc: 0.26,
          roas: 3.90
        }
      ]
    }
  });
}
