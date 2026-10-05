import { GoogleAdsApi, enums } from "google-ads-api";
import { prisma } from "@/lib/prisma";

export async function publishCampaignToGoogleAds(campaignId: string, workspaceId?: string) {
  console.log("\n=======================================================");
  console.log("[GOOGLE_ADS_API] 🚀 Initiating live Campaign Mutate on Google Ads...");
  console.log("[GOOGLE_ADS_API] 🆔 Campaign ID:", campaignId);

  // 1. Fetch Campaign (only from the caller's workspace when one is given)
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ...(workspaceId ? { workspaceId } : {}) }
  });

  if (!campaign) {
    console.error("[GOOGLE_ADS_API] ❌ Error: Campaign not found in database.");
    return { success: false, error: "Campaign not found" };
  }

  // 2. Locate Google Ads Integration & Decrypted Credentials
  const targetWorkspaceId = workspaceId || campaign.workspaceId;
  const { getDecryptedGoogleIntegration, formatCustomerId } = await import("@/lib/google");
  const { Platform } = await import("@prisma/client");

  const byokIntegration = await getDecryptedGoogleIntegration(targetWorkspaceId, Platform.GOOGLE_ADS);

  const devToken = byokIntegration?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = byokIntegration?.oauth?.clientId || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = byokIntegration?.oauth?.clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  // The refresh token and customer account must belong to this workspace. Never borrow another
  // workspace's token or fall back to a hardcoded account: that would spend someone else's ad budget.
  const refreshToken = byokIntegration?.oauth?.refreshToken || "";

  if (!devToken || !clientId || !clientSecret || !refreshToken || !byokIntegration?.accountId) {
    console.error("[GOOGLE_ADS_API] ❌ Error: This workspace has no complete Google Ads connection.");
    return { success: false, error: "Google Ads not connected. Please connect your credentials in Integrations." };
  }

  const targetCustomerId = formatCustomerId(byokIntegration.accountId);
  const loginCustomerId = byokIntegration?.loginCustomerId
    ? formatCustomerId(byokIntegration.loginCustomerId)
    : process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replaceAll("-", "").trim();

  // Never invent a budget: a default here would become real ad spend.
  const dailyBudgetDollars = Number(campaign.dailyBudget) || Number(campaign.budget) / 30;
  if (!(dailyBudgetDollars > 0)) {
    return { success: false, error: "Set a budget on this campaign before publishing it to Google Ads." };
  }
  const budgetMicros = dailyBudgetDollars * 1_000_000;

  console.log(`[GOOGLE_ADS_API] 🏢 Target Customer ID: ${targetCustomerId}`);
  if (loginCustomerId) console.log(`[GOOGLE_ADS_API] 🔑 Manager Login Customer ID: ${loginCustomerId}`);
  console.log(`[GOOGLE_ADS_API] 📝 Campaign Name: "${campaign.name}"`);
  console.log(`[GOOGLE_ADS_API] 💰 Daily Budget: $${dailyBudgetDollars.toFixed(2)} (${budgetMicros} micros)`);

  const client = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: devToken
  });

  const customer = client.Customer({
    customer_id: targetCustomerId,
    login_customer_id: loginCustomerId,
    refresh_token: refreshToken
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Create Campaign Budget on Google Ads
    // -------------------------------------------------------------
    console.log("[GOOGLE_ADS_API] 📡 Step 1: Creating Campaign Budget via Google Ads API...");
    const budgetRes = await customer.campaignBudgets.create([
      {
        name: `Budget - ${campaign.name.slice(0, 30)} - ${Date.now()}`,
        amount_micros: budgetMicros,
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        explicitly_shared: false
      }
    ]);

    const budgetResults = (budgetRes as unknown as { results: Array<{ resource_name: string }> })?.results;
    const budgetResourceName = budgetResults?.[0]?.resource_name;
    console.log(`[GOOGLE_ADS_API] ✅ Campaign Budget Created! Resource: ${budgetResourceName}`);

    // -------------------------------------------------------------
    // Step 2: Create Search Campaign on Google Ads
    // -------------------------------------------------------------
    console.log("[GOOGLE_ADS_API] 📡 Step 2: Creating Search Campaign via Google Ads API...");
    const campaignRes = await customer.campaigns.create([
      {
        name: `${campaign.name} - ${Date.now().toString().slice(-4)}`,
        status: enums.CampaignStatus.ENABLED,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        campaign_budget: budgetResourceName,
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
          target_partner_search_network: false
        }
      }
    ]);

    const campaignResults = (campaignRes as unknown as { results: Array<{ resource_name: string }> })?.results;
    const campaignResourceName = campaignResults?.[0]?.resource_name || `customers/${targetCustomerId}/campaigns/live-${Date.now()}`;

    console.log(`\n[GOOGLE_ADS_API] 🎉 SUCCESS! Campaign published to Google Ads!`);
    console.log(`[GOOGLE_ADS_API] 🔗 Live Resource Name: ${campaignResourceName}`);
    console.log("=======================================================\n");

    // Save live resource name to database
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "ACTIVE",
        externalData: {
          ...((campaign.externalData as Record<string, unknown>) || {}),
          googleAdsResourceName: campaignResourceName,
          lastPublishedToGoogleAt: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      resourceName: campaignResourceName,
      data: campaignRes
    };
  } catch (error: unknown) {
    const errObj = error as { message?: string; errors?: Array<{ message?: string; error_code?: unknown }> };
    console.error("\n[GOOGLE_ADS_API] ⚠️ Google Ads Mutate Failed!");
    console.error("[GOOGLE_ADS_API] Message:", errObj?.message || error);
    if (errObj?.errors) {
      console.error("[GOOGLE_ADS_API] Details:", JSON.stringify(errObj.errors, null, 2));
    }
    console.log("=======================================================\n");

    const userFriendlyError = errObj?.errors?.[0]?.message || errObj?.message || "Google Ads mutation failed";
    return {
      success: false,
      error: userFriendlyError,
      details: errObj?.errors || errObj
    };
  }
}
