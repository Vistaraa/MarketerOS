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
  const accountId = tiktokIntegration?.account || "";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: tiktokIntegration?.account ? `TikTok Ads (${tiktokIntegration.account})` : "TikTok Ads",
        status: isConnected ? "Connected" : "Not Connected",
        currency: "USD"
      },
      summary: {
        totalSpend: 0,
        impressions: 0,
        videoViews: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        roas: 0
      },
      campaigns: []
    }
  });
}
