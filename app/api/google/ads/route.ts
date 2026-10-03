import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { Platform, CampaignStatus, CampaignType, CampaignObjective } from "@prisma/client";
import {
  getDecryptedGoogleIntegration,
  getGoogleAdsCampaigns,
  createGoogleAdsCampaign,
  formatCustomerId
} from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.GOOGLE_ADS);
  
  // Also check direct integration record in Prisma
  const rawIntegration = integration || await prisma.integration.findFirst({
    where: { workspaceId: session.workspaceId, platform: Platform.GOOGLE_ADS }
  });

  if (!rawIntegration) {
    return NextResponse.json(
      {
        connected: false,
        error: "Google Ads is not connected. Please connect your credentials in Integrations."
      },
      { status: 400 }
    );
  }

  // Query local workspace campaigns stored in DB
  const dbCampaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: session.workspaceId,
      platform: Platform.GOOGLE_ADS
    },
    orderBy: { updatedAt: "desc" }
  });

  const formattedDbCampaigns = dbCampaigns.map((c) => {
    const budgetDollars = Number(c.dailyBudget || Number(c.budget || 0) / 30 || 50);
    const clicks = c.clicks || 0;
    const costDollars = Number(c.spend || 0);
    const impressions = c.impressions || (clicks > 0 ? clicks * 12 : 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? costDollars / clicks : 0;

    return {
      id: c.id,
      name: c.name,
      status: c.status === "ACTIVE" ? "ENABLED" : c.status,
      channelType: c.type === "DISPLAY" ? "DISPLAY" : "SEARCH",
      budgetDollars,
      impressions,
      clicks,
      costDollars,
      conversions: c.conversions || 0,
      ctr: Number(ctr.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      resourceName: (c.externalData as any)?.googleAdsResourceName || `customers/${rawIntegration.accountId}/campaigns/${c.id}`
    };
  });

  let liveCampaigns: any[] = [];
  if (integration?.oauth && integration?.developerToken) {
    try {
      liveCampaigns = await getGoogleAdsCampaigns({
        developerToken: integration.developerToken,
        clientId: integration.oauth.clientId,
        clientSecret: integration.oauth.clientSecret,
        refreshToken: integration.oauth.refreshToken,
        customerId: formatCustomerId(integration.accountId),
        loginCustomerId: integration.loginCustomerId ? formatCustomerId(integration.loginCustomerId) : undefined
      });
    } catch (err: unknown) {
      console.warn("[GOOGLE_ADS_LIVE_FETCH_WARN]", err);
    }
  }

  // Merge live and DB campaigns without duplication
  const liveNames = new Set(liveCampaigns.map((c) => c.name.toLowerCase()));
  const uniqueDbCampaigns = formattedDbCampaigns.filter((c) => !liveNames.has(c.name.toLowerCase()));
  const allCampaigns = [...liveCampaigns, ...uniqueDbCampaigns];

  // When no campaigns exist in live or DB, return empty array for production

  const rawId = integration?.integrationId || ("id" in rawIntegration ? rawIntegration.id : rawIntegration.integrationId);
  if (rawId) {
    await prisma.integration.update({
      where: { id: rawId },
      data: { lastSyncedAt: new Date() }
    }).catch(() => {});
  }

  return NextResponse.json({
    connected: true,
    account: {
      accountId: integration?.accountId || rawIntegration.accountId || "Connected",
      accountName: integration?.accountName || rawIntegration.accountName || "Google Ads Account"
    },
    campaigns: allCampaigns
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.GOOGLE_ADS);
  if (!integration || !integration.oauth || !integration.developerToken) {
    return NextResponse.json(
      { error: "Google Ads credentials not found. Please connect your Google Ads account first." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      dailyBudget,
      channelType = "SEARCH",
      targetGoogleSearch = true,
      targetSearchNetwork = true,
      targetContentNetwork = false
    } = body;

    if (!name || !dailyBudget || dailyBudget <= 0) {
      return NextResponse.json(
        { error: "Campaign name and positive daily budget are required." },
        { status: 400 }
      );
    }

    // Mutate live campaign into user's Google Ads account
    const mutateRes = await createGoogleAdsCampaign(
      {
        developerToken: integration.developerToken,
        clientId: integration.oauth.clientId,
        clientSecret: integration.oauth.clientSecret,
        refreshToken: integration.oauth.refreshToken,
        customerId: formatCustomerId(integration.accountId),
        loginCustomerId: integration.loginCustomerId ? formatCustomerId(integration.loginCustomerId) : undefined
      },
      {
        name,
        dailyBudgetDollars: Number(dailyBudget),
        channelType,
        targetGoogleSearch,
        targetSearchNetwork,
        targetContentNetwork
      }
    );

    // Save campaign in local database
    const localCampaign = await prisma.campaign.create({
      data: {
        workspaceId: session.workspaceId,
        createdById: session.userId,
        integrationId: integration.integrationId,
        name,
        platform: Platform.GOOGLE_ADS,
        status: CampaignStatus.PAUSED,
        type: channelType === "DISPLAY" ? CampaignType.DISPLAY : CampaignType.SEARCH,
        objective: CampaignObjective.TRAFFIC,
        budget: Number(dailyBudget) * 30,
        dailyBudget: Number(dailyBudget),
        externalData: {
          googleAdsResourceName: mutateRes.campaignResourceName,
          budgetResourceName: mutateRes.budgetResourceName,
          createdLiveAt: new Date().toISOString()
        } as never
      }
    });

    return NextResponse.json({
      success: true,
      message: `Campaign "${name}" successfully created in your Google Ads account!`,
      resourceName: mutateRes.campaignResourceName,
      campaign: localCampaign
    });
  } catch (err: unknown) {
    console.error("[GOOGLE_ADS_CREATE_ERROR]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create campaign in Google Ads account"
      },
      { status: 500 }
    );
  }
}
