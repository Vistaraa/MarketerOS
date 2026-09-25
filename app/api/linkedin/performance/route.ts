import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await listPersistedIntegrations(session.workspaceId);
  const linkedinIntegration = integrations.find(
    (i) => i.providerKey === "linkedin_ads" || i.platform.toLowerCase().includes("linkedin")
  );

  const isConnected = linkedinIntegration?.status === "Connected";
  const accountId = linkedinIntegration?.account || "";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: linkedinIntegration?.account ? `LinkedIn Ads (${linkedinIntegration.account})` : "LinkedIn Ads",
        status: isConnected ? "Connected" : "Not Connected",
        currency: "USD"
      },
      summary: {
        totalSpend: isConnected ? 0 : 0,
        impressions: isConnected ? 0 : 0,
        clicks: isConnected ? 0 : 0,
        leadFormFills: isConnected ? 0 : 0,
        costPerLead: 0,
        ctr: 0,
        cpc: 0,
        roas: 0
      },
      campaigns: []
    }
  });
}
