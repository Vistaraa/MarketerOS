import { GoogleAdsApi, enums } from "google-ads-api";
import { GoogleAdsCredentials } from "./client";

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
  if (!creds.developerToken || !creds.clientId || !creds.clientSecret) {
    throw new Error("Missing Google Ads credentials: developerToken, clientId, and clientSecret are required.");
  }

  return new GoogleAdsApi({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    developer_token: creds.developerToken
  });
}

/**
 * Format customer ID to 10 digits without dashes
 */
export function formatCustomerId(id: string): string {
  return id.replace(/[^0-9]/g, "");
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
  try {
    const client = createAdsClient(creds);
    const accessible = await client.listAccessibleCustomers(creds.refreshToken);

    const formattedTarget = formatCustomerId(creds.customerId);
    const customer = client.Customer({
      customer_id: formattedTarget,
      login_customer_id: creds.loginCustomerId ? formatCustomerId(creds.loginCustomerId) : undefined,
      refresh_token: creds.refreshToken
    });

    // Run a minimal query to verify customer permissions
    const query = `
      SELECT 
        customer.id, 
        customer.descriptive_name, 
        customer.currency_code, 
        customer.time_zone 
      FROM customer 
      LIMIT 1
    `;
    const res = await customer.query(query);
    const descriptiveName = (res[0] as { customer?: { descriptive_name?: string } })?.customer?.descriptive_name || "Google Ads Account";

    return {
      success: true,
      message: `Successfully connected to ${descriptiveName} (${formattedTarget})`,
      accessibleCustomers: accessible.resource_names.map((rn: string) => rn.replace("customers/", ""))
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to Google Ads API";
    return {
      success: false,
      message: "Connection test failed",
      error: message
    };
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
  const client = createAdsClient(creds);
  const response = await client.listAccessibleCustomers(creds.refreshToken);
  return response.resource_names.map((rn: string) => rn.replace("customers/", ""));
}

/**
 * Fetch live campaigns and their metrics from user's Google Ads account
 */
export async function getGoogleAdsCampaigns(creds: GoogleAdsCredentials): Promise<GoogleAdsCampaignItem[]> {
  const client = createAdsClient(creds);
  const formattedCustomerId = formatCustomerId(creds.customerId);

  const customer = client.Customer({
    customer_id: formattedCustomerId,
    login_customer_id: creds.loginCustomerId ? formatCustomerId(creds.loginCustomerId) : undefined,
    refresh_token: creds.refreshToken
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

  try {
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
  } catch (err: unknown) {
    console.error("[GOOGLE_ADS_FETCH_ERROR]", err);
    throw err;
  }
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
