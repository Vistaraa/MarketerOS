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
  if (!integration || !integration.oauth || !integration.developerToken) {
    return NextResponse.json(
      {
        connected: false,
        error: "Google Ads is not connected. Please connect your credentials in Integrations."
      },
      { status: 400 }
    );
  }

  try {
    const liveCampaigns = await getGoogleAdsCampaigns({
      developerToken: integration.developerToken,
      clientId: integration.oauth.clientId,
      clientSecret: integration.oauth.clientSecret,
      refreshToken: integration.oauth.refreshToken,
      customerId: formatCustomerId(integration.accountId),
      loginCustomerId: integration.loginCustomerId ? formatCustomerId(integration.loginCustomerId) : undefined
    });

    // Update integration lastSyncedAt
    await prisma.integration.update({
      where: { id: integration.integrationId },
      data: { lastSyncedAt: new Date() }
    });

    return NextResponse.json({
      connected: true,
      account: {
        accountId: integration.accountId,
        accountName: integration.accountName
      },
      campaigns: liveCampaigns
    });
  } catch (err: unknown) {
    console.error("[GOOGLE_ADS_API_ERROR]", err);
    return NextResponse.json(
      {
        connected: true,
        error: err instanceof Error ? err.message : "Failed to fetch live Google Ads campaigns"
      },
      { status: 500 }
    );
  }
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
