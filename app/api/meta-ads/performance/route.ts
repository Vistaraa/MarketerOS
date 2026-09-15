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
  const accountId = metaIntegration?.account || "act_918237461029384";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: metaIntegration?.account ? `Meta Ads (${metaIntegration.account})` : "Acme Corp · Meta Business Ads",
        status: isConnected ? "Connected" : "Sample Data Mode",
        currency: "USD",
        timezone: "America/New_York"
      },
      summary: {
        totalSpend: 18450.80,
        impressions: 612400,
        clicks: 42800,
        conversions: 1390,
        ctr: 6.99,
        cpc: 0.43,
        cpa: 13.27,
        roas: 4.85
      },
      campaigns: [
        {
          id: "meta-camp-1",
          name: "FB & IG — Summer Conversions Retargeting",
          status: "ACTIVE",
          objective: "OUTCOME_SALES",
          dailyBudget: 250,
          spend: 7420.50,
          clicks: 18400,
          conversions: 610,
          ctr: 7.2,
          cpc: 0.40,
          roas: 5.12
        },
        {
          id: "meta-camp-2",
          name: "Instagram Advantage+ Shopping Catalog",
          status: "ACTIVE",
          objective: "PRODUCT_CATALOG_SALES",
          dailyBudget: 200,
          spend: 6180.30,
          clicks: 14200,
          conversions: 490,
          ctr: 6.8,
          cpc: 0.43,
          roas: 4.75
        },
        {
          id: "meta-camp-3",
          name: "FB Reels & Stories Video Reach",
          status: "PAUSED",
          objective: "BRAND_AWARENESS",
          dailyBudget: 150,
          spend: 4850.00,
          clicks: 10200,
          conversions: 290,
          ctr: 6.5,
          cpc: 0.47,
          roas: 4.20
        }
      ]
    }
  });
}
