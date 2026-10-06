import type { Platform } from "@/lib/types";
import { ProviderError } from "@/lib/integrations/errors";
import { CHANNELS, type ChannelKey } from "@/lib/integrations/channels";

export type ProviderKey = "google_ads" | "google_analytics" | "google_search_console" | "google_firebase" | "google_admob" | "google_youtube" | "google_business_profile" | "meta_ads" | "meta_facebook" | "meta_instagram" | "meta_messenger" | "meta_whatsapp" | ChannelKey;
export type NormalizedMetric = { externalId: string; date: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number };
export type ProviderAccount = { id: string; name: string; platform: Platform; scopes: string[] };
export type ProviderToken = { accessToken: string; refreshToken?: string; expiresAt?: Date; scopes: string[] };
export type SyncOptions = { loginCustomerId?: string | null };

export interface MarketingProvider {
  readonly platform: Platform;
  readonly providerKey: ProviderKey;
  /** Whether daily ad metrics (spend, clicks, conversions...) can be synced from this provider. */
  readonly supportsMetrics: boolean;
  getAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<ProviderToken>;
  /** For providers with short-lived access tokens (Google): a fresh access token from the stored refresh token. */
  refreshAccessToken?(refreshToken: string): Promise<ProviderToken>;
  listAccounts(accessToken: string): Promise<ProviderAccount[]>;
  syncMetrics(accessToken: string, accountId: string, from: Date, to: Date, options?: SyncOptions): Promise<NormalizedMetric[]>;
}

/*
 * API versions and endpoints. The *_BASE_URL overrides exist for end-to-end tests, which point them at a local stub
 * server; production leaves them unset.
 */
// Matches the google-ads-api package (v24); Google supports each version for about a year.
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v24";
const GOOGLE_ADS_BASE_URL = process.env.GOOGLE_ADS_API_BASE_URL || "https://googleads.googleapis.com";
const GOOGLE_TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || "https://oauth2.googleapis.com/token";
// Meta keeps each Graph API version for at least two years.
const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v23.0";
const META_GRAPH_BASE_URL = process.env.META_GRAPH_BASE_URL || "https://graph.facebook.com";
const metaUrl = (path: string) => new URL(`${META_GRAPH_BASE_URL}/${META_GRAPH_VERSION}/${path.replace(/^\//, "")}`);

const googleScopes: Record<ProviderKey, string[]> = {
  google_ads: ["https://www.googleapis.com/auth/adwords"], google_analytics: ["https://www.googleapis.com/auth/analytics.readonly"], google_search_console: ["https://www.googleapis.com/auth/webmasters.readonly"], google_firebase: ["https://www.googleapis.com/auth/firebase.readonly"], google_admob: ["https://www.googleapis.com/auth/admob.readonly"], google_youtube: ["https://www.googleapis.com/auth/youtube.readonly"], google_business_profile: ["https://www.googleapis.com/auth/business.manage"], meta_ads: [], meta_facebook: [], meta_instagram: [], meta_messenger: [], meta_whatsapp: [], linkedin_ads: []
};
const metaScopes = ["ads_read", "ads_management", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "business_management"];

/** The same OAuth client serves sign-in and integrations; either variable name is accepted. */
export function googleOAuthClient() {
  return { clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "", clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "" };
}

/** What starting an OAuth connection needs (syncing with an existing token needs less; see each provider). */
export function providerConfiguration(providerKey: ProviderKey) {
  // LinkedIn connects with a pasted access token (see /api/linkedin/connect).
  if (providerKey in CHANNELS) return { configured: false, missing: ["token connection (no OAuth app)"] };
  const google = googleOAuthClient();
  const checks: Array<[string, boolean]> = providerKey.startsWith("google_")
    ? [["GOOGLE_OAUTH_CLIENT_ID", Boolean(google.clientId)], ["GOOGLE_OAUTH_CLIENT_SECRET", Boolean(google.clientSecret)]]
    : [["META_CLIENT_ID", Boolean(process.env.META_CLIENT_ID)], ["META_CLIENT_SECRET", Boolean(process.env.META_CLIENT_SECRET)]];
  if (providerKey === "google_ads") checks.push(["GOOGLE_ADS_DEVELOPER_TOKEN", Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN)]);
  return { configured: checks.every(([, ok]) => ok), missing: checks.filter(([, ok]) => !ok).map(([name]) => name) };
}

export { ProviderError };

async function jsonRequest<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = body?.error?.message || body?.error_description || (Array.isArray(body) ? body[0]?.error?.message : undefined);
    throw new ProviderError(typeof providerMessage === "string" ? providerMessage.slice(0, 300) : `Provider request failed with ${response.status}.`, response.status);
  }
  return body as T;
}

class GoogleProvider implements MarketingProvider {
  readonly platform: Platform;
  readonly supportsMetrics: boolean;
  constructor(public readonly providerKey: ProviderKey) {
    this.platform = providerKey === "google_ads" ? "Google Ads" : providerKey === "google_analytics" ? "Google Analytics" : providerKey === "google_youtube" ? "YouTube" : "Google Analytics";
    this.supportsMetrics = providerKey === "google_ads";
  }

  getAuthorizationUrl(state: string, redirectUri: string) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", googleOAuthClient().clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", googleScopes[this.providerKey].join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  private async token(params: Record<string, string>): Promise<ProviderToken> {
    const { clientId, clientSecret } = googleOAuthClient();
    const body = await jsonRequest<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params })
    });
    return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined, scopes: (body.scope || "").split(" ").filter(Boolean) };
  }

  exchangeCode(code: string, redirectUri: string) {
    return this.token({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  }

  refreshAccessToken(refreshToken: string) {
    return this.token({ refresh_token: refreshToken, grant_type: "refresh_token" });
  }

  private adsHeaders(accessToken: string, loginCustomerId?: string | null) {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) throw new ProviderError("Google Ads isn't configured on this server (GOOGLE_ADS_DEVELOPER_TOKEN).", 409);
    const manager = (loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replaceAll("-", "");
    return { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "developer-token": developerToken, ...(manager ? { "login-customer-id": manager } : {}) };
  }

  async listAccounts(accessToken: string) {
    if (this.providerKey === "google_ads") {
      const body = await jsonRequest<{ resourceNames?: string[] }>(`${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`, { headers: this.adsHeaders(accessToken) });
      return (body.resourceNames || []).map((resource) => ({ id: resource.split("/").pop() || resource, name: `Google Ads customer ${resource.split("/").pop()}`, platform: this.platform, scopes: googleScopes[this.providerKey] }));
    }
    const profile = await jsonRequest<{ sub: string; email?: string; name?: string }>("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${accessToken}` } });
    return [{ id: profile.sub, name: profile.name || profile.email || "Google account", platform: this.platform, scopes: googleScopes[this.providerKey] }];
  }

  async syncMetrics(accessToken: string, accountId: string, from: Date, to: Date, options: SyncOptions = {}) {
    if (!this.supportsMetrics) throw new ProviderError(`${this.platform} doesn't provide ad metrics.`, 400);
    const customerId = accountId.replaceAll("-", "");
    if (!/^\d{10}$/.test(customerId)) throw new ProviderError("Choose the Google Ads account (10-digit customer ID) to sync.", 400);
    const query = `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.conversions_value FROM customer WHERE segments.date BETWEEN '${from.toISOString().slice(0, 10)}' AND '${to.toISOString().slice(0, 10)}'`;
    const batches = await jsonRequest<Array<{ results?: Array<{ segments?: { date?: string }; metrics?: { impressions?: string; clicks?: string; conversions?: number; costMicros?: string; conversionsValue?: number } }> }>>(
      `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      { method: "POST", headers: this.adsHeaders(accessToken, options.loginCustomerId), body: JSON.stringify({ query }) }
    );
    return batches.flatMap((batch) => batch.results || []).filter((row) => row.segments?.date).map((row) => ({
      externalId: customerId,
      date: row.segments!.date!,
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      conversions: Number(row.metrics?.conversions || 0),
      spend: Number(row.metrics?.costMicros || 0) / 1_000_000,
      revenue: Number(row.metrics?.conversionsValue || 0)
    }));
  }
}

type MetaInsightRow = { date_start: string; impressions?: string; clicks?: string; spend?: string; actions?: Array<{ action_type: string; value: string }>; action_values?: Array<{ action_type: string; value: string }> };

class MetaProvider implements MarketingProvider {
  readonly platform: Platform;
  readonly supportsMetrics: boolean;
  constructor(public readonly providerKey: ProviderKey) {
    this.platform = providerKey === "meta_instagram" ? "Instagram" : providerKey === "meta_facebook" ? "Facebook" : "Meta Ads";
    this.supportsMetrics = providerKey === "meta_ads";
  }

  getAuthorizationUrl(state: string, redirectUri: string) {
    const url = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", process.env.META_CLIENT_ID || "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", metaScopes.join(","));
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCode(code: string, redirectUri: string) {
    const url = metaUrl("oauth/access_token");
    url.searchParams.set("client_id", process.env.META_CLIENT_ID || "");
    url.searchParams.set("client_secret", process.env.META_CLIENT_SECRET || "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const body = await jsonRequest<{ access_token: string; expires_in?: number }>(url.toString());
    return this.exchangeLongLivedToken(body.access_token).catch(() => ({ accessToken: body.access_token, expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined, scopes: metaScopes }));
  }

  /** Swaps a short-lived user token (about 1 hour) for a long-lived one (about 60 days). Needs the app credentials. */
  async exchangeLongLivedToken(token: string): Promise<ProviderToken> {
    if (!process.env.META_CLIENT_ID || !process.env.META_CLIENT_SECRET) throw new ProviderError("Meta app credentials aren't configured.", 409);
    const url = metaUrl("oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", process.env.META_CLIENT_ID);
    url.searchParams.set("client_secret", process.env.META_CLIENT_SECRET);
    url.searchParams.set("fb_exchange_token", token);
    const body = await jsonRequest<{ access_token: string; expires_in?: number }>(url.toString());
    return { accessToken: body.access_token, expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined, scopes: metaScopes };
  }

  /** Confirms the token can read the ad account; returns its details. */
  async verifyAdAccount(accessToken: string, accountId: string) {
    const url = metaUrl(accountId);
    url.searchParams.set("fields", "name,account_id,currency,timezone_name,account_status");
    return jsonRequest<{ id: string; name?: string; account_id?: string; currency?: string; timezone_name?: string; account_status?: number }>(url.toString(), { headers: { authorization: `Bearer ${accessToken}` } });
  }

  async listAccounts(accessToken: string) {
    const url = metaUrl(this.providerKey === "meta_ads" ? "me/adaccounts" : "me/accounts");
    url.searchParams.set("fields", this.providerKey === "meta_ads" ? "id,name,account_status" : "id,name");
    const body = await jsonRequest<{ data?: Array<{ id: string; name?: string }> }>(url.toString(), { headers: { authorization: `Bearer ${accessToken}` } });
    return (body.data || []).map((account) => ({ id: account.id, name: account.name || account.id, platform: this.platform, scopes: metaScopes }));
  }

  async syncMetrics(accessToken: string, accountId: string, from: Date, to: Date) {
    if (!this.supportsMetrics) throw new ProviderError(`${this.platform} doesn't provide ad metrics.`, 400);
    const url = metaUrl(`${accountId}/insights`);
    url.searchParams.set("level", "account");
    // One row per day (without it Meta returns a single total for the whole range).
    url.searchParams.set("time_increment", "1");
    url.searchParams.set("fields", "date_start,impressions,clicks,actions,spend,action_values");
    url.searchParams.set("time_range", JSON.stringify({ since: from.toISOString().slice(0, 10), until: to.toISOString().slice(0, 10) }));
    url.searchParams.set("limit", "100");
    const rows: MetaInsightRow[] = [];
    let next: string | undefined = url.toString();
    for (let page = 0; next && page < 20; page++) {
      // Paging URLs include the token as a query parameter; send it as a header instead.
      const pageUrl: URL = new URL(next);
      pageUrl.searchParams.delete("access_token");
      const body: { data?: MetaInsightRow[]; paging?: { next?: string } } = await jsonRequest(pageUrl.toString(), { headers: { authorization: `Bearer ${accessToken}` } });
      rows.push(...(body.data || []));
      next = body.paging?.next;
    }
    const value = (list: MetaInsightRow["actions"], type: string) => Number(list?.find((item) => item.action_type === type)?.value || 0);
    return rows.map((row) => ({
      externalId: accountId,
      date: row.date_start,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      // Purchases when the account tracks them, otherwise leads.
      conversions: value(row.actions, "purchase") || value(row.actions, "lead"),
      spend: Number(row.spend || 0),
      revenue: value(row.action_values, "purchase")
    }));
  }
}

export function providerKeyForPlatform(platform: Platform): ProviderKey { return platform === "Google Ads" ? "google_ads" : platform === "Meta Ads" ? "meta_ads" : platform === "Google Analytics" || platform === "GA4" ? "google_analytics" : platform === "Instagram" ? "meta_instagram" : platform === "Facebook" ? "meta_facebook" : platform === "YouTube" ? "google_youtube" : "google_analytics"; }

/** Providers by key or platform name. OAuth routes check providerConfiguration() first; syncing needs only a token. */
/** Database platform values (Integration.platform) that have a provider. */
const PLATFORM_ENUM_KEYS: Record<string, ProviderKey> = { GOOGLE_ADS: "google_ads", META_ADS: "meta_ads", GOOGLE_ANALYTICS: "google_analytics", INSTAGRAM: "meta_instagram", FACEBOOK: "meta_facebook", YOUTUBE: "google_youtube", FIREBASE_ADMOB: "google_admob", LINKEDIN: "linkedin_ads" };

/** LinkedIn: token-connected, metrics only (no OAuth flow here). */
class ChannelProvider implements MarketingProvider {
  readonly supportsMetrics = true;
  readonly platform: Platform;
  constructor(public readonly providerKey: ChannelKey) {
    this.platform = ({ linkedin_ads: "LinkedIn" } as Record<ChannelKey, Platform>)[providerKey];
  }
  getAuthorizationUrl(): string { throw new ProviderError(`${CHANNELS[this.providerKey].label} connects with an access token, not OAuth.`, 400); }
  exchangeCode(): Promise<ProviderToken> { throw new ProviderError(`${CHANNELS[this.providerKey].label} connects with an access token, not OAuth.`, 400); }
  async listAccounts(): Promise<ProviderAccount[]> { return []; }
  syncMetrics(accessToken: string, accountId: string, from: Date, to: Date) { return CHANNELS[this.providerKey].syncMetrics(accessToken, accountId, from, to); }
}

export function getProvider(providerKey: ProviderKey | Platform | string): MarketingProvider {
  const key: ProviderKey = PLATFORM_ENUM_KEYS[providerKey] || (/^(google|meta)_[a-z_]+$/.test(providerKey) || providerKey in CHANNELS ? (providerKey as ProviderKey) : providerKeyForPlatform(providerKey as Platform));
  if (key in CHANNELS) return new ChannelProvider(key as ChannelKey);
  return key.startsWith("google_") ? new GoogleProvider(key) : new MetaProvider(key);
}

export function metaProvider() {
  return new MetaProvider("meta_ads");
}

type GoogleAdsRow = Record<string, Record<string, unknown> | undefined>;

/** Runs a GAQL query against a customer (the same endpoint, version and headers as metric syncs). */
export async function googleAdsSearchStream(accessToken: string, customerId: string, query: string, loginCustomerId?: string | null) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new ProviderError("Google Ads isn't configured on this server (GOOGLE_ADS_DEVELOPER_TOKEN).", 409);
  const manager = (loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replaceAll("-", "");
  const batches = await jsonRequest<Array<{ results?: GoogleAdsRow[] }>>(`${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers/${customerId.replaceAll("-", "")}/googleAds:searchStream`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "developer-token": developerToken, ...(manager ? { "login-customer-id": manager } : {}) },
    body: JSON.stringify({ query })
  });
  return batches.flatMap((batch) => batch.results || []);
}
