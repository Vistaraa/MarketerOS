import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "last_30_days";

    // 1. Find active workspace and Google Ads integration
    const session = await getSession().catch(() => null);
    let workspaceId = session?.workspaceId;

    if (!workspaceId) {
      const firstWs = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
      workspaceId = firstWs?.id;
    }

    const integration = workspaceId
      ? await prisma.integration.findFirst({
          where: {
            workspaceId,
            platform: "GOOGLE_ADS"
          }
        })
      : await prisma.integration.findFirst({
          where: { platform: "GOOGLE_ADS" },
          orderBy: { updatedAt: "desc" }
        });

    const customerId = integration?.accountId || "";
    const accountName = integration?.accountName || "Google Ads Account";

    // 2. Fetch user's real persisted campaigns associated with Google Ads
    const dbCampaigns = workspaceId
      ? await prisma.campaign.findMany({
          where: {
            workspaceId,
            OR: [
              { platform: "GOOGLE_ADS" },
              { integrationId: integration?.id }
            ]
          },
          orderBy: { updatedAt: "desc" }
        })
      : [];

    // Format any user-created campaigns from DB
    const userCampaignsFormatted = dbCampaigns.map((c) => {
      const budgetNum = Number(c.dailyBudget || c.budget || 0);
      const targetRoasNum = Number(c.targetRoas || 0);
      const spendNum = Number(c.spend) > 0 ? Number(c.spend) : 0;
      const cpc = c.clicks > 0 ? Number((spendNum / c.clicks).toFixed(2)) : 0;
      const clicks = c.clicks || 0;
      const impressions = c.impressions || (clicks > 0 ? Math.round(clicks * 10) : 0);
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
      const conversions = c.conversions || 0;
      const roas = Number(c.roas) > 0 ? Number(c.roas) : targetRoasNum;
      const cpa = conversions > 0 ? Number((spendNum / conversions).toFixed(2)) : 0;

      return {
        id: c.id,
        name: c.name,
        channelType: c.type === "SEARCH" ? "SEARCH" : "PERFORMANCE_MAX",
        status: c.status === "ACTIVE" ? "ENABLED" : c.status === "PAUSED" ? "PAUSED" : "ENABLED",
        budget: budgetNum,
        spend: spendNum,
        impressions,
        clicks,
        conversions,
        ctr,
        cpc,
        cpa,
        roas,
        conversionRate: clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0
      };
    });

    const combinedCampaigns = userCampaignsFormatted;

    // Calculate aggregated totals
    const totalSpend = combinedCampaigns.reduce((acc, c) => acc + c.spend, 0);
    const totalImpressions = combinedCampaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = combinedCampaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalConversions = combinedCampaigns.reduce((acc, c) => acc + c.conversions, 0);
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
    const avgCpa = totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0;
    const totalRevenue = combinedCampaigns.reduce((acc, c) => acc + (c.spend * c.roas), 0);
    const avgRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;

    const performance = {
      account: {
        customerId,
        accountName,
        currency: "USD",
        timeZone: "UTC",
        status: integration?.status || "Active",
        lastSyncTime: integration?.lastSyncedAt?.toISOString() || new Date().toISOString()
      },
      gaqlQuery: `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.cost_per_conversion FROM campaign WHERE segments.date DURING ${range.toUpperCase()} ORDER BY metrics.cost_micros DESC`,
      summary: {
        totalSpend: Number(totalSpend.toFixed(2)),
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        conversionRate: totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0,
        ctr: avgCtr,
        averageCpc: avgCpc,
        costPerConversion: avgCpa,
        revenue: Number(totalRevenue.toFixed(2)),
        roas: avgRoas,
        change: {
          spend: 0,
          clicks: 0,
          conversions: 0,
          roas: 0
        }
      },
      campaigns: combinedCampaigns,
      dailyTrend: [],
      networkBreakdown: [],
      devices: [],
      topKeywords: []
    };

    return NextResponse.json({
      success: true,
      data: performance
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load performance metrics" },
      { status: 500 }
    );
  }
}
