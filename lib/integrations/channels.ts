import type { NormalizedMetric } from "@/lib/integrations/provider";
import { ProviderError } from "@/lib/integrations/errors";

// Status codes: 400 = the user's input is malformed (ID format); anything the platform itself rejects
// (bad or revoked token, missing access) is reported as 422 by the connect route.

/*
 * LinkedIn Ads: connected by pasting a Marketing API access token and synced daily into PlatformMetricDaily like
 * Google and Meta. The API version is configurable because LinkedIn retires old versions on its own schedule. The
 * *_BASE_URL override exists for end-to-end tests (a local stub server); production leaves it unset.
 */
const LINKEDIN_BASE = process.env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com";
// LinkedIn versions are monthly (YYYYMM) and supported for about a year.
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202601";

export type ChannelKey = "linkedin_ads";
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

export const CHANNELS: Record<ChannelKey, { label: string; platform: "LINKEDIN"; verify: (token: string, accountId: string) => Promise<ChannelAccount>; syncMetrics: (token: string, accountId: string, from: Date, to: Date) => Promise<NormalizedMetric[]> }> = {
  linkedin_ads: { label: "LinkedIn Ads", platform: "LINKEDIN", verify: linkedinAccount, syncMetrics: linkedinMetrics }
};
