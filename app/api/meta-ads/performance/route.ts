import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await listPersistedIntegrations(session.workspaceId);
  const metaIntegration = integrations.find(
    (i) => i.providerKey === "meta_ads" || i.platform.toLowerCase().includes("meta")
  );

  const isConnected = metaIntegration?.status === "Connected";
  const accountId = metaIntegration?.account || "";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: metaIntegration?.account ? `Meta Ads (${metaIntegration.account})` : "Meta Ads",
        status: isConnected ? "Connected" : "Not Connected",
        currency: "USD",
        timezone: "UTC"
      },
      summary: {
        totalSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0
      },
      campaigns: []
    }
  });
}
