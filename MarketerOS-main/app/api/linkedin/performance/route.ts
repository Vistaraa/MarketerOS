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
  const accountId = linkedinIntegration?.account || "508291049";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: linkedinIntegration?.account ? `LinkedIn Ads (${linkedinIntegration.account})` : "Acme Corp · Enterprise B2B Ads",
        status: isConnected ? "Connected" : "Sample Data Mode",
        currency: "USD"
      },
      summary: {
        totalSpend: 12640.00,
        impressions: 184500,
        clicks: 8920,
        leadFormFills: 284,
        costPerLead: 44.50,
        ctr: 4.83,
        cpc: 1.41,
        roas: 3.92
      },
      campaigns: [
        {
          id: "li-camp-1",
          name: "B2B Enterprise Lead Gen — Sponsored Content",
          status: "ACTIVE",
          dailyBudget: 300,
          spend: 6850.00,
          clicks: 4820,
          leads: 162,
          cpl: 42.28,
          ctr: 5.1
        },
        {
          id: "li-camp-2",
          name: "VP Marketing Thought Leadership Video Ads",
          status: "ACTIVE",
          dailyBudget: 200,
          spend: 5790.00,
          clicks: 4100,
          leads: 122,
          cpl: 47.45,
          ctr: 4.5
        }
      ]
    }
  });
}
