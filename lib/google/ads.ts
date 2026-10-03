import { GoogleAdsApi, enums } from "google-ads-api";
import { GoogleAdsCredentials, cleanCredential } from "./client";

export interface GoogleAdsCampaignItem {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budgetDollars: number;
  impressions: number;
  clicks: number;
  costDollars: number;
  conversions: number;
  ctr: number;
  cpc: number;
  resourceName: string;
}

export interface CreateCampaignInput {
  name: string;
  dailyBudgetDollars: number;
  channelType?: "SEARCH" | "DISPLAY" | "PERFORMANCE_MAX";
  targetGoogleSearch?: boolean;
  targetSearchNetwork?: boolean;
  targetContentNetwork?: boolean;
}

/**
 * Creates an instance of GoogleAdsApi dynamically from user-supplied credentials.
 * ZERO application-level keys used.
 */
function createAdsClient(creds: { developerToken: string; clientId: string; clientSecret: string }) {
  const developerToken = cleanCredential(creds.developerToken);
  const clientId = cleanCredential(creds.clientId);
  const clientSecret = cleanCredential(creds.clientSecret);

  if (!developerToken || !clientId || !clientSecret) {
    throw new Error("Missing Google Ads credentials: developerToken, clientId, and clientSecret are required.");
  }

  return new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken
  });
}

/**
 * Format customer ID to 10 digits without dashes
 */
export function formatCustomerId(id?: string | null): string {
  if (!id) return "";
  return id.replace(/[^0-9]/g, "");
}

/**
 * Obtains a fresh access_token using direct Google OAuth2 REST API endpoint.
 * Provides explicit, pinpoint error messages if Client ID, Client Secret, or Refresh Token is rejected.
 */
export async function fetchGoogleAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cleanCredential(creds.clientId),
        client_secret: cleanCredential(creds.clientSecret),
        refresh_token: cleanCredential(creds.refreshToken),
        grant_type: "refresh_token"
      }),
      signal: AbortSignal.timeout(10_000)
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      return { success: true, accessToken: data.access_token };
    }

    let errMessage = data.error_description || data.error || "Failed to obtain access token from Google.";
    if (data.error === "invalid_grant") {
      errMessage = "OAuth Refresh Token Rejected (invalid_grant): The Refresh Token was rejected by Google's OAuth servers.\n\n" +
        "• Reason: The Refresh Token does not match your Client ID / Secret or has expired.\n" +
        "• Fix 1 (OAuth Playground): In Google OAuth Playground, you MUST click the ⚙️ (gear icon) in the top-right and check 'Use your own OAuth credentials' with your exact Client ID and Secret BEFORE authorizing.\n" +
        "• Fix 2 (Scope): Ensure scope 'https://www.googleapis.com/auth/adwords' was selected.\n" +
        "• Fix 3 (Expiration): If your GCP OAuth Consent Screen is in 'Testing' mode, refresh tokens expire after 7 days.";
    } else if (data.error === "invalid_client") {
      errMessage = "OAuth Credentials Rejected (invalid_client): The OAuth Client ID or OAuth Client Secret entered does not match your Google Cloud Console credentials.";
    }

    return { success: false, error: errMessage };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error contacting Google OAuth." };
  }
}

/**
 * Test credentials by calling Google Ads API
 */
export async function testGoogleAdsConnection(creds: GoogleAdsCredentials): Promise<{
  success: boolean;
  message: string;
  accessibleCustomers?: string[];
  error?: string;
}> {
  const developerToken = cleanCredential(creds.developerToken);
  const clientId = cleanCredential(creds.clientId);
  const clientSecret = cleanCredential(creds.clientSecret);
  const refreshToken = cleanCredential(creds.refreshToken);

  if (!developerToken || !clientId || !clientSecret || !refreshToken) {
    return {
      success: false,
      message: "Connection test failed",
      error: "Google Ads requires Developer Token, Client ID, Client Secret, and Refresh Token."
    };
  }

  // 1. Direct OAuth Token Verification
  const tokenResult = await fetchGoogleAccessToken({ clientId, clientSecret, refreshToken });
  if (!tokenResult.success || !tokenResult.accessToken) {
    return {
      success: false,
      message: "Connection test failed",
      error: tokenResult.error || "OAuth token authorization failed."
    };
  }

  const accessToken = tokenResult.accessToken;
  const cleanCreds: GoogleAdsCredentials = {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId: creds.customerId ? cleanCredential(creds.customerId) : undefined,
    loginCustomerId: creds.loginCustomerId ? cleanCredential(creds.loginCustomerId) : undefined
  };

  // 2. Direct REST call to listAccessibleCustomers
  try {
    const adsRes = await fetch("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken
      },
      signal: AbortSignal.timeout(10_000)
    });

    const adsData = await adsRes.json();
    if (!adsRes.ok) {
      const gError = adsData.error;
      let errorMsg = gError?.message || "Google Ads API request failed.";
      
      const details = gError?.details?.[0]?.errors?.[0];
      const errorCode = details?.errorCode;

      if (errorCode?.authorizationError === "DEVELOPER_TOKEN_NOT_APPROVED" || errorMsg.includes("DEVELOPER_TOKEN_NOT_APPROVED")) {
        return {
          success: true,
          message: "Authenticated with Google Ads OAuth! (Note: Developer Token is in Test Account / Pending status in Google Ads API Center. Access is restricted to test accounts until MCC approval).",
          accessibleCustomers: []
        };
      } else if (errorCode?.authorizationError === "DEVELOPER_TOKEN_INVALID" || errorMsg.includes("DEVELOPER_TOKEN_INVALID")) {
        errorMsg = "Developer Token Error: The Developer Token entered is invalid. Check Google Ads MCC > Tools & Settings > API Center.";
      } else if (gError?.status === "PERMISSION_DENIED") {
        errorMsg = `Permission Denied on Google Ads API: ${gError.message || "Account does not have access."}`;
      }

      return {
        success: false,
        message: "Connection test failed",
        error: errorMsg
      };
    }

    const accessibleList = (adsData.resourceNames || []).map((rn: string) => rn.replace("customers/", ""));
    const formattedTarget = formatCustomerId(cleanCreds.customerId);

    if (!formattedTarget) {
      return {
        success: true,
        message: `Successfully authenticated with Google Ads! (${accessibleList.length} account(s) accessible: ${accessibleList.slice(0, 3).join(", ")})`,
        accessibleCustomers: accessibleList
      };
    }

    // 3. Query Target Customer Details via REST
    const queryRes = await fetch(`https://googleads.googleapis.com/v17/customers/${formattedTarget}/googleAds:search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
        ...(cleanCreds.loginCustomerId ? { "login-customer-id": formatCustomerId(cleanCreds.loginCustomerId) } : {})
      },
      body: JSON.stringify({
        query: "SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1"
      }),
      signal: AbortSignal.timeout(10_000)
    });

    const queryData = await queryRes.json();
    if (!queryRes.ok) {
      const qError = queryData.error;
      const qDetail = qError?.details?.[0]?.errors?.[0];
      let qMsg = qError?.message || "Failed to query target Customer ID.";

      if (qMsg.includes("DEVELOPER_TOKEN_NOT_APPROVED") || qDetail?.errorCode?.authorizationError === "DEVELOPER_TOKEN_NOT_APPROVED") {
        return {
          success: true,
          message: `Authenticated with Google Ads OAuth for Customer ID ${formattedTarget}! (Note: Developer Token is in Test Account status).`,
          accessibleCustomers: accessibleList
        };
      }

      if (qMsg.includes("NOT_ADS_USER") || qDetail?.errorCode?.authorizationError === "USER_PERMISSION_DENIED") {
        qMsg = `Access Denied: The authenticated Google account does not have access to Customer ID ${formattedTarget}. ${cleanCreds.loginCustomerId ? "" : "If this is a client account managed via MCC, please enter your Manager Login Customer ID."}`;
      }

      return {
        success: false,
        message: "Connection test failed",
        error: qMsg
      };
    }

    const descriptiveName = queryData.results?.[0]?.customer?.descriptiveName || "Google Ads Account";
    return {
      success: true,
      message: `Successfully connected to ${descriptiveName} (${formattedTarget})`,
      accessibleCustomers: accessibleList
    };
  } catch (err) {
    // Fallback to gRPC client as backup with 5s timeout
    try {
      const client = createAdsClient(cleanCreds);
      const grpcPromise = client.listAccessibleCustomers(cleanCreds.refreshToken);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("gRPC request timed out after 5s")), 5_000)
      );
      const accessible = await Promise.race([grpcPromise, timeoutPromise]);
      const accessibleList = (accessible.resource_names || []).map((rn: string) => rn.replace("customers/", ""));
      return {
        success: true,
        message: `Successfully authenticated with Google Ads! (${accessibleList.length} account(s) accessible)`,
        accessibleCustomers: accessibleList
      };
    } catch (fallbackErr) {
      return {
        success: false,
        message: "Connection test failed",
        error: err instanceof Error ? err.message : "Failed to connect to Google Ads API"
      };
    }
  }
}

/**
 * List all customer IDs accessible with the user's refresh token
 */
export async function listAccessibleCustomers(creds: {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string[]> {
  const tokenResult = await fetchGoogleAccessToken({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken: creds.refreshToken
  });

  if (tokenResult.success && tokenResult.accessToken) {
    const res = await fetch("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", {
      headers: {
        "Authorization": `Bearer ${tokenResult.accessToken}`,
        "developer-token": cleanCredential(creds.developerToken)
      }
    });
    if (res.ok) {
      const data = await res.json();
      return (data.resourceNames || []).map((rn: string) => rn.replace("customers/", ""));
    }
  }

  const client = createAdsClient(creds);
  const response = await client.listAccessibleCustomers(creds.refreshToken);
  return response.resource_names.map((rn: string) => rn.replace("customers/", ""));
}

/**
 * Fetch live campaigns and their metrics from user's Google Ads account
 */
export async function getGoogleAdsCampaigns(creds: GoogleAdsCredentials): Promise<GoogleAdsCampaignItem[]> {
  const developerToken = cleanCredential(creds.developerToken);
  const clientId = cleanCredential(creds.clientId);
  const clientSecret = cleanCredential(creds.clientSecret);
  const refreshToken = cleanCredential(creds.refreshToken);
  const formattedCustomerId = formatCustomerId(creds.customerId);

  if (!formattedCustomerId) {
    return [];
  }

  try {
    const tokenResult = await fetchGoogleAccessToken({ clientId, clientSecret, refreshToken });
    if (tokenResult.success && tokenResult.accessToken) {
      const queryRes = await fetch(`https://googleads.googleapis.com/v17/customers/${formattedCustomerId}/googleAds:search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenResult.accessToken}`,
          "developer-token": developerToken,
          "Content-Type": "application/json",
          ...(creds.loginCustomerId ? { "login-customer-id": formatCustomerId(creds.loginCustomerId) } : {})
        },
        body: JSON.stringify({
          query: `
            SELECT 
              campaign.id, 
              campaign.name, 
              campaign.status, 
              campaign.advertising_channel_type, 
              campaign_budget.amount_micros, 
              metrics.impressions, 
              metrics.clicks, 
              metrics.cost_micros, 
              metrics.conversions 
            FROM campaign 
            WHERE campaign.status != 'REMOVED'
            ORDER BY metrics.impressions DESC
            LIMIT 100
          `
        })
      });

      if (queryRes.ok) {
        const data = await queryRes.json();
        const results = data.results || [];
        return results.map((r: any) => {
          const impressions = Number(r.metrics?.impressions || 0);
          const clicks = Number(r.metrics?.clicks || 0);
          const costDollars = Number(r.metrics?.costMicros || 0) / 1_000_000;
          const conversions = Number(r.metrics?.conversions || 0);
          const budgetDollars = Number(r.campaignBudget?.amountMicros || 0) / 1_000_000;
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const cpc = clicks > 0 ? costDollars / clicks : 0;

          return {
            id: String(r.campaign.id),
            name: r.campaign.name,
            status: String(r.campaign.status),
            channelType: String(r.campaign.advertisingChannelType || "SEARCH"),
            budgetDollars,
            impressions,
            clicks,
            costDollars,
            conversions,
            ctr: Number(ctr.toFixed(2)),
            cpc: Number(cpc.toFixed(2)),
            resourceName: r.campaign.resourceName || `customers/${formattedCustomerId}/campaigns/${r.campaign.id}`
          };
        });
      }
    }
  } catch (err) {
    console.warn("[GOOGLE_ADS_REST_FETCH_FALLBACK]", err);
  }

  const client = createAdsClient(creds);
  const customer = client.Customer({
    customer_id: formattedCustomerId,
    login_customer_id: creds.loginCustomerId ? formatCustomerId(creds.loginCustomerId) : undefined,
    refresh_token: refreshToken
  });

  const query = `
    SELECT 
      campaign.id, 
      campaign.name, 
      campaign.status, 
      campaign.advertising_channel_type, 
      campaign_budget.amount_micros, 
      metrics.impressions, 
      metrics.clicks, 
      metrics.cost_micros, 
      metrics.conversions 
    FROM campaign 
    WHERE campaign.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
    LIMIT 100
  `;

  const rows = await customer.query(query);

  return rows.map((row: unknown) => {
    const r = row as {
      campaign: { id: string | number; name: string; status: number | string; advertising_channel_type: string; resource_name: string };
      campaign_budget?: { amount_micros?: number | string };
      metrics?: { impressions?: number | string; clicks?: number | string; cost_micros?: number | string; conversions?: number | string };
    };

    const impressions = Number(r.metrics?.impressions || 0);
    const clicks = Number(r.metrics?.clicks || 0);
    const costDollars = Number(r.metrics?.cost_micros || 0) / 1_000_000;
    const conversions = Number(r.metrics?.conversions || 0);
    const budgetDollars = Number(r.campaign_budget?.amount_micros || 0) / 1_000_000;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? costDollars / clicks : 0;

    return {
      id: String(r.campaign.id),
      name: r.campaign.name,
      status: String(r.campaign.status),
      channelType: String(r.campaign.advertising_channel_type || "SEARCH"),
      budgetDollars,
      impressions,
      clicks,
      costDollars,
      conversions,
      ctr: Number(ctr.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      resourceName: r.campaign.resource_name || `customers/${formattedCustomerId}/campaigns/${r.campaign.id}`
    };
  });
}

/**
 * Creates a live campaign directly in the user's Google Ads account.
 */
export async function createGoogleAdsCampaign(
  creds: GoogleAdsCredentials,
  input: CreateCampaignInput
): Promise<{ success: boolean; campaignResourceName: string; budgetResourceName: string }> {
  const client = createAdsClient(creds);
  const formattedCustomerId = formatCustomerId(creds.customerId);

  const customer = client.Customer({
    customer_id: formattedCustomerId,
    login_customer_id: creds.loginCustomerId ? formatCustomerId(creds.loginCustomerId) : undefined,
    refresh_token: creds.refreshToken
  });

  const budgetMicros = Math.round(input.dailyBudgetDollars * 1_000_000);

  // 1. Create Campaign Budget
  const budgetResponse = await customer.campaignBudgets.create([
    {
      name: `Budget - ${input.name.slice(0, 25)} - ${Date.now()}`,
      amount_micros: budgetMicros,
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false
    }
  ]);

  const budgetResults = (budgetResponse as unknown as { results: Array<{ resource_name: string }> })?.results;
  const budgetResourceName = budgetResults?.[0]?.resource_name;
  if (!budgetResourceName) {
    throw new Error("Failed to create Campaign Budget on Google Ads.");
  }

  // 2. Select Channel Type
  let channelType = enums.AdvertisingChannelType.SEARCH;
  if (input.channelType === "DISPLAY") {
    channelType = enums.AdvertisingChannelType.DISPLAY;
  } else if (input.channelType === "PERFORMANCE_MAX") {
    channelType = enums.AdvertisingChannelType.PERFORMANCE_MAX;
  }

  // 3. Create Campaign
  const campaignResponse = await customer.campaigns.create([
    {
      name: `${input.name} - ${Date.now().toString().slice(-4)}`,
      status: enums.CampaignStatus.PAUSED, // Safe default: create as PAUSED so user can review
      advertising_channel_type: channelType,
      campaign_budget: budgetResourceName,
      network_settings: {
        target_google_search: input.targetGoogleSearch !== false,
        target_search_network: input.targetSearchNetwork !== false,
        target_content_network: input.targetContentNetwork || false,
        target_partner_search_network: false
      }
    }
  ]);

  const campaignResults = (campaignResponse as unknown as { results: Array<{ resource_name: string }> })?.results;
  const campaignResourceName = campaignResults?.[0]?.resource_name;

  if (!campaignResourceName) {
    throw new Error("Campaign created on Google Ads but resource name was not returned.");
  }

  return {
    success: true,
    campaignResourceName,
    budgetResourceName
  };
}

/**
 * Updates a live campaign status (e.g. ENABLED, PAUSED, REMOVED)
 */
export async function updateGoogleAdsCampaignStatus(
  creds: GoogleAdsCredentials,
  campaignResourceName: string,
  newStatus: "ENABLED" | "PAUSED" | "REMOVED"
): Promise<boolean> {
  const client = createAdsClient(creds);
  const formattedCustomerId = formatCustomerId(creds.customerId);

  const customer = client.Customer({
    customer_id: formattedCustomerId,
    login_customer_id: creds.loginCustomerId ? formatCustomerId(creds.loginCustomerId) : undefined,
    refresh_token: creds.refreshToken
  });

  let statusEnum = enums.CampaignStatus.PAUSED;
  if (newStatus === "ENABLED") statusEnum = enums.CampaignStatus.ENABLED;
  if (newStatus === "REMOVED") statusEnum = enums.CampaignStatus.REMOVED;

  await customer.campaigns.update([
    {
      resource_name: campaignResourceName,
      status: statusEnum
    }
  ]);

  return true;
}
