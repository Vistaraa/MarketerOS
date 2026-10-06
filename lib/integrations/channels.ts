import type { NormalizedMetric } from "@/lib/integrations/provider";
import { ProviderError } from "@/lib/integrations/errors";

// Status codes: 400 = the user's input is malformed (ID/domain format); anything the platform itself rejects
// (bad or revoked token, missing access) is reported as 422 by the connect route.

/*
 * LinkedIn Ads, TikTok Ads and Shopify: connected by pasting an access token (LinkedIn/TikTok marketing tokens,
 * a Shopify custom-app Admin API token) and synced daily into PlatformMetricDaily like Google and Meta.
 * API versions are configurable because each platform retires old versions on its own schedule. The *_BASE_URL
 * overrides exist for end-to-end tests (a local stub server); production leaves them unset.
 */
const LINKEDIN_BASE = process.env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com";
// LinkedIn versions are monthly (YYYYMM) and supported for about a year.
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202601";
const TIKTOK_BASE = process.env.TIKTOK_API_BASE_URL || "https://business-api.tiktok.com";
// Shopify versions are quarterly (YYYY-MM) and supported for a year.
const SHOPIFY_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

export type ChannelKey = "linkedin_ads" | "tiktok_ads" | "shopify_store";
export type ChannelAccount = { id: string; name: string; currency: string | null; timezone?: string | null };

async function request<T>(url: string, init: RequestInit, platform: string): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.errors?.[0]?.message || (typeof body?.errors === "string" ? body.errors : undefined) || body?.error?.message;
    throw new ProviderError(`${platform}: ${typeof message === "string" ? message.slice(0, 300) : `request failed (${res.status})`}`, res.status);
  }
  return body as T;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parts = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });

/* ---------------- LinkedIn ---------------- */

const linkedinHeaders = (token: string) => ({ authorization: `Bearer ${token}`, "LinkedIn-Version": LINKEDIN_VERSION, "X-Restli-Protocol-Version": "2.0.0" });

async function linkedinAccount(token: string, accountId: string): Promise<ChannelAccount> {
  if (!/^\d{5,20}$/.test(accountId)) throw new ProviderError("Enter the numeric LinkedIn ad account ID.", 400);
  const body = await request<{ id: number; name?: string; currency?: string }>(`${LINKEDIN_BASE}/rest/adAccounts/${accountId}`, { headers: linkedinHeaders(token) }, "LinkedIn");
  return { id: String(body.id ?? accountId), name: body.name || `LinkedIn Ads (${accountId})`, currency: body.currency || null };
}

async function linkedinMetrics(token: string, accountId: string, from: Date, to: Date): Promise<NormalizedMetric[]> {
  const s = parts(from);
  const e = parts(to);
  // Rest.li syntax: parentheses stay literal, the account URN is percent-encoded.
  const query = [
    "q=analytics",
    "pivot=ACCOUNT",
    "timeGranularity=DAILY",
    `dateRange=(start:(year:${s.year},month:${s.month},day:${s.day}),end:(year:${e.year},month:${e.month},day:${e.day}))`,
    `accounts=List(${encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`)})`,
    "fields=dateRange,impressions,clicks,costInLocalCurrency,externalWebsiteConversions,oneClickLeads"
  ].join("&");
  const body = await request<{ elements?: Array<{ dateRange?: { start?: { year: number; month: number; day: number } }; impressions?: number; clicks?: number; costInLocalCurrency?: string; externalWebsiteConversions?: number; oneClickLeads?: number }> }>(
    `${LINKEDIN_BASE}/rest/adAnalytics?${query}`,
    { headers: linkedinHeaders(token) },
    "LinkedIn"
  );
  return (body.elements || []).filter((row) => row.dateRange?.start).map((row) => {
    const d = row.dateRange!.start!;
    return {
      externalId: accountId,
      date: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      // Website conversions plus Lead Gen Form submissions.
      conversions: Number(row.externalWebsiteConversions || 0) + Number(row.oneClickLeads || 0),
      spend: Number(row.costInLocalCurrency || 0),
      revenue: 0
    };
  });
}

/* ---------------- TikTok ---------------- */

type TikTokEnvelope<T> = { code: number; message?: string; data?: T };

async function tiktok<T>(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${TIKTOK_BASE}/open_api/v1.3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const body = await request<TikTokEnvelope<T>>(url.toString(), { headers: { "Access-Token": token } }, "TikTok");
  // TikTok reports errors with HTTP 200 and a non-zero code.
  if (body.code !== 0) throw new ProviderError(`TikTok: ${body.message || `error ${body.code}`}`, 422);
  return body.data as T;
}

async function tiktokAccount(token: string, advertiserId: string): Promise<ChannelAccount> {
  if (!/^\d{10,25}$/.test(advertiserId)) throw new ProviderError("Enter the numeric TikTok advertiser ID.", 400);
  const data = await tiktok<{ list?: Array<{ advertiser_id: string; name?: string; currency?: string; timezone?: string }> }>("advertiser/info/", { advertiser_ids: JSON.stringify([advertiserId]) }, token);
  const account = data.list?.[0];
  if (!account) throw new ProviderError("TikTok: this token can't access that advertiser account.", 403);
  return { id: account.advertiser_id, name: account.name || `TikTok Ads (${advertiserId})`, currency: account.currency || null, timezone: account.timezone || null };
}

async function tiktokMetrics(token: string, advertiserId: string, from: Date, to: Date): Promise<NormalizedMetric[]> {
  const rows: NormalizedMetric[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = await tiktok<{ list?: Array<{ dimensions: { stat_time_day: string }; metrics: Record<string, string> }>; page_info?: { total_page?: number } }>("report/integrated/get/", {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_ADVERTISER",
      dimensions: JSON.stringify(["stat_time_day"]),
      metrics: JSON.stringify(["spend", "impressions", "clicks", "conversion"]),
      start_date: ymd(from),
      end_date: ymd(to),
      page: String(page),
      page_size: "1000"
    }, token);
    for (const row of data.list || []) {
      rows.push({ externalId: advertiserId, date: row.dimensions.stat_time_day.slice(0, 10), impressions: Number(row.metrics.impressions || 0), clicks: Number(row.metrics.clicks || 0), conversions: Number(row.metrics.conversion || 0), spend: Number(row.metrics.spend || 0), revenue: 0 });
    }
    if (!data.page_info?.total_page || page >= data.page_info.total_page) break;
  }
  return rows;
}

/* ---------------- Shopify ---------------- */

/** Only real Shopify store domains: the domain is user input, so anything else (internal hosts...) is refused. */
export function normalizeShopDomain(input: string) {
  const domain = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9][a-z0-9-]{0,60}\.myshopify\.com$/.test(domain)) throw new ProviderError("Enter your store's .myshopify.com domain (e.g. acme.myshopify.com).", 400);
  return domain;
}

const shopifyUrl = (shop: string, path: string) => `${process.env.SHOPIFY_API_BASE_URL ? `${process.env.SHOPIFY_API_BASE_URL}/${shop}` : `https://${shop}`}/admin/api/${SHOPIFY_VERSION}/${path}`;

async function shopifyAccount(token: string, shopInput: string): Promise<ChannelAccount> {
  const shop = normalizeShopDomain(shopInput);
  const body = await request<{ shop?: { name?: string; currency?: string; iana_timezone?: string } }>(shopifyUrl(shop, "shop.json"), { headers: { "X-Shopify-Access-Token": token } }, "Shopify");
  return { id: shop, name: body.shop?.name || shop, currency: body.shop?.currency || null, timezone: body.shop?.iana_timezone || null };
}

/** Daily orders (conversions) and sales (revenue) from the Admin GraphQL API; cancelled and test orders are excluded. */
async function shopifyMetrics(token: string, shopInput: string, from: Date, to: Date): Promise<NormalizedMetric[]> {
  const shop = normalizeShopDomain(shopInput);
  const byDay = new Map<string, { orders: number; revenue: number }>();
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const query = `query($after: String, $q: String!) { orders(first: 250, after: $after, query: $q, sortKey: CREATED_AT) { edges { node { createdAt cancelledAt test totalPriceSet { shopMoney { amount } } } } pageInfo { hasNextPage endCursor } } }`;
    const body: { data?: { orders?: { edges: Array<{ node: { createdAt: string; cancelledAt: string | null; test: boolean; totalPriceSet: { shopMoney: { amount: string } } } }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }; errors?: Array<{ message: string }> } = await request(
      shopifyUrl(shop, "graphql.json"),
      { method: "POST", headers: { "X-Shopify-Access-Token": token, "content-type": "application/json" }, body: JSON.stringify({ query, variables: { after, q: `created_at:>='${ymd(from)}' created_at:<='${ymd(to)}T23:59:59Z'` } }) },
      "Shopify"
    );
    if (body.errors?.length) throw new ProviderError(`Shopify: ${body.errors[0].message}`, 422);
    const orders = body.data?.orders;
    for (const { node } of orders?.edges || []) {
      if (node.cancelledAt || node.test) continue;
      const day = node.createdAt.slice(0, 10);
      const entry = byDay.get(day) || { orders: 0, revenue: 0 };
      byDay.set(day, { orders: entry.orders + 1, revenue: entry.revenue + Number(node.totalPriceSet.shopMoney.amount || 0) });
    }
    if (!orders?.pageInfo.hasNextPage) break;
    after = orders.pageInfo.endCursor;
  }
  return Array.from(byDay.entries()).map(([date, d]) => ({ externalId: shop, date, impressions: 0, clicks: 0, conversions: d.orders, spend: 0, revenue: Math.round(d.revenue * 100) / 100 }));
}

export const CHANNELS: Record<ChannelKey, { label: string; platform: "LINKEDIN" | "TIKTOK" | "SHOPIFY"; verify: (token: string, accountId: string) => Promise<ChannelAccount>; syncMetrics: (token: string, accountId: string, from: Date, to: Date) => Promise<NormalizedMetric[]> }> = {
  linkedin_ads: { label: "LinkedIn Ads", platform: "LINKEDIN", verify: linkedinAccount, syncMetrics: linkedinMetrics },
  tiktok_ads: { label: "TikTok Ads", platform: "TIKTOK", verify: tiktokAccount, syncMetrics: tiktokMetrics },
  shopify_store: { label: "Shopify", platform: "SHOPIFY", verify: shopifyAccount, syncMetrics: shopifyMetrics }
};
