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

    const customerId = integration?.accountId || "849-204-1839";
    const accountName = integration?.accountName || "Acme Corp · Search & Performance Max";

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

    // Base mock campaigns (for initial demo depth)
    const baseMockCampaigns = [
      {
        id: "cmp-g-001",
        name: "Brand Search - High Intent Core",
        channelType: "SEARCH",
        status: "ENABLED",
        budget: 250.00,
        spend: 5420.00,
        impressions: 145000,
        clicks: 16250,
        conversions: 520,
        ctr: 11.2,
        cpc: 0.33,
        cpa: 10.42,
        roas: 5.12,
        conversionRate: 3.20
      },
      {
        id: "cmp-g-002",
        name: "Performance Max - Summer Apparel Launch",
        channelType: "PERFORMANCE_MAX",
        status: "ENABLED",
        budget: 200.00,
        spend: 4230.50,
        impressions: 198000,
        clicks: 10840,
        conversions: 310,
        ctr: 5.47,
        cpc: 0.39,
        cpa: 13.65,
        roas: 4.35,
        conversionRate: 2.86
      },
      {
        id: "cmp-g-003",
        name: "Competitor Keywords - Search Conquesting",
        channelType: "SEARCH",
        status: "ENABLED",
        budget: 150.00,
        spend: 2980.20,
        impressions: 89000,
        clicks: 4620,
        conversions: 135,
        ctr: 5.19,
        cpc: 0.65,
        cpa: 22.08,
        roas: 2.95,
        conversionRate: 2.92
      },
      {
        id: "cmp-g-004",
        name: "YouTube Discovery - Visual Retargeting",
        channelType: "VIDEO",
        status: "PAUSED",
        budget: 80.00,
        spend: 1220.00,
        impressions: 42000,
        clicks: 1410,
        conversions: 45,
        ctr: 3.36,
        cpc: 0.87,
        cpa: 27.11,
        roas: 2.10,
        conversionRate: 3.19
      },
      {
        id: "cmp-g-005",
        name: "Google Display Network - Dynamic Remarketing",
        channelType: "DISPLAY",
        status: "ENABLED",
        budget: 75.00,
        spend: 999.70,
        impressions: 15200,
        clicks: 1000,
        conversions: 35,
        ctr: 6.58,
        cpc: 1.00,
        cpa: 28.56,
        roas: 2.45,
        conversionRate: 3.50
      }
    ];

    // Format any user-created campaigns from DB
    const userCampaignsFormatted = dbCampaigns.map((c, index) => {
      const budgetNum = Number(c.dailyBudget || c.budget || 100);
      const targetRoasNum = Number(c.targetRoas || 4.2);
      const spendNum = Number(c.spend) > 0 ? Number(c.spend) : budgetNum * 14.5;
      const cpc = 0.42;
      const clicks = c.clicks > 0 ? c.clicks : Math.round(spendNum / cpc);
      const impressions = Math.round(clicks * 15.2);
      const ctr = clicks > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 6.5;
      const conversions = c.conversions > 0 ? c.conversions : Math.round(clicks * 0.032);
      const roas = Number(c.roas) > 0 ? Number(c.roas) : targetRoasNum;
      const cpa = conversions > 0 ? Number((spendNum / conversions).toFixed(2)) : 14.50;

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
        conversionRate: Number(((conversions / clicks) * 100).toFixed(2)) || 3.2
      };
    });

    // Combine user campaigns with base list
    const combinedCampaigns = [...userCampaignsFormatted, ...baseMockCampaigns];

    // Calculate aggregated totals
    const totalSpend = combinedCampaigns.reduce((acc, c) => acc + c.spend, 0);
    const totalImpressions = combinedCampaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = combinedCampaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalConversions = combinedCampaigns.reduce((acc, c) => acc + c.conversions, 0);
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 6.97;
    const avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0.44;
    const avgCpa = totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 14.21;
    const totalRevenue = combinedCampaigns.reduce((acc, c) => acc + (c.spend * c.roas), 0);
    const avgRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 4.20;

    const performance = {
      account: {
        customerId,
        accountName,
        currency: "USD",
        timeZone: "America/New_York",
        status: "Active",
        lastSyncTime: integration?.lastSyncedAt?.toISOString() || new Date().toISOString()
      },
      gaqlQuery: `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.cost_per_conversion FROM campaign WHERE segments.date DURING ${range.toUpperCase()} ORDER BY metrics.cost_micros DESC`,
      summary: {
        totalSpend: Number(totalSpend.toFixed(2)),
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        conversionRate: totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 3.06,
        ctr: avgCtr,
        averageCpc: avgCpc,
        costPerConversion: avgCpa,
        revenue: Number(totalRevenue.toFixed(2)),
        roas: avgRoas,
        change: {
          spend: 8.4,
          clicks: 12.6,
          conversions: 18.3,
          roas: 16.7
        }
      },
      campaigns: combinedCampaigns,
      dailyTrend: [
        { date: "Day 1", spend: Math.round(totalSpend * 0.08), clicks: Math.round(totalClicks * 0.08), conversions: Math.round(totalConversions * 0.08) },
        { date: "Day 4", spend: Math.round(totalSpend * 0.12), clicks: Math.round(totalClicks * 0.12), conversions: Math.round(totalConversions * 0.12) },
        { date: "Day 8", spend: Math.round(totalSpend * 0.16), clicks: Math.round(totalClicks * 0.15), conversions: Math.round(totalConversions * 0.17) },
        { date: "Day 12", spend: Math.round(totalSpend * 0.14), clicks: Math.round(totalClicks * 0.14), conversions: Math.round(totalConversions * 0.13) },
        { date: "Day 16", spend: Math.round(totalSpend * 0.18), clicks: Math.round(totalClicks * 0.19), conversions: Math.round(totalConversions * 0.20) },
        { date: "Day 20", spend: Math.round(totalSpend * 0.15), clicks: Math.round(totalClicks * 0.15), conversions: Math.round(totalConversions * 0.14) },
        { date: "Day 24", spend: Math.round(totalSpend * 0.17), clicks: Math.round(totalClicks * 0.17), conversions: Math.round(totalConversions * 0.16) }
      ],
      networkBreakdown: [
        { network: "Search", percentage: 56.6, spend: Number((totalSpend * 0.566).toFixed(2)), clicks: Math.round(totalClicks * 0.60) },
        { network: "Performance Max", percentage: 28.5, spend: Number((totalSpend * 0.285).toFixed(2)), clicks: Math.round(totalClicks * 0.26) },
        { network: "Display Network", percentage: 9.6, spend: Number((totalSpend * 0.096).toFixed(2)), clicks: Math.round(totalClicks * 0.09) },
        { network: "YouTube Video", percentage: 5.3, spend: Number((totalSpend * 0.053).toFixed(2)), clicks: Math.round(totalClicks * 0.05) }
      ],
      devices: [
        { device: "Mobile", percentage: 66.0, spend: Number((totalSpend * 0.66).toFixed(2)), conversions: Math.round(totalConversions * 0.68) },
        { device: "Desktop", percentage: 29.3, spend: Number((totalSpend * 0.293).toFixed(2)), conversions: Math.round(totalConversions * 0.28) },
        { device: "Tablet", percentage: 4.7, spend: Number((totalSpend * 0.047).toFixed(2)), conversions: Math.round(totalConversions * 0.04) }
      ],
      topKeywords: [
        { keyword: "marketing automation platform", matchType: "EXACT", clicks: 4890, impressions: 32400, spend: 1820.00, conversions: 184, ctr: 15.09, roas: 5.80 },
        { keyword: "multi channel ad management", matchType: "PHRASE", clicks: 3620, impressions: 28900, spend: 1450.50, conversions: 128, ctr: 12.53, roas: 4.90 },
        { keyword: "google ads automation tool", matchType: "EXACT", clicks: 2910, impressions: 19800, spend: 1120.00, conversions: 98, ctr: 14.70, roas: 4.60 },
        { keyword: "omnichannel marketing software", matchType: "PHRASE", clicks: 2450, impressions: 22100, spend: 980.20, conversions: 74, ctr: 11.09, roas: 3.95 },
        { keyword: "social media campaign scheduler", matchType: "BROAD", clicks: 1840, impressions: 26400, spend: 740.00, conversions: 42, ctr: 6.97, roas: 3.10 }
      ]
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
