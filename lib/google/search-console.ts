import { google } from "googleapis";
import { GSCCredentials, createDynamicAuthClient } from "./client";

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters"
];

export interface SearchQueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPageItem {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPerformanceResult {
  siteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  dailyTimeline: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topQueries: SearchQueryItem[];
  topPages: SearchPageItem[];
}

/**
 * Creates authenticated Search Console client dynamically.
 */
function getSearchConsoleClient(creds: GSCCredentials) {
  const auth = createDynamicAuthClient(
    { oauth: creds.oauth, serviceAccount: creds.serviceAccount },
    GSC_SCOPES
  );

  return google.searchconsole({
    version: "v1",
    auth: auth as any
  });
}

/**
 * Test live connection to Google Search Console
 */
export async function testSearchConsoleConnection(creds: GSCCredentials): Promise<{
  success: boolean;
  message: string;
  verifiedSites?: string[];
  error?: string;
}> {
  try {
    const client = getSearchConsoleClient(creds);

    // List sites to verify authentication
    const sitesRes = await client.sites.list();
    const siteEntries = sitesRes.data.siteEntry || [];
    const siteUrls = siteEntries.map((s) => s.siteUrl || "").filter(Boolean);

    // Check if target siteUrl matches or is in accessible sites
    const normalizedTarget = creds.siteUrl.trim();
    const isTargetAccessible = siteUrls.some((u) => u.toLowerCase() === normalizedTarget.toLowerCase());

    if (siteUrls.length > 0) {
      return {
        success: true,
        message: isTargetAccessible
          ? `Successfully verified site: ${normalizedTarget}`
          : `Connected! Found ${siteUrls.length} accessible verified site(s)`,
        verifiedSites: siteUrls
      };
    }

    // Attempt direct site get if list is restricted
    const siteGet = await client.sites.get({ siteUrl: normalizedTarget });
    if (siteGet.status === 200) {
      return {
        success: true,
        message: `Successfully connected to Search Console site (${normalizedTarget})`,
        verifiedSites: [normalizedTarget]
      };
    }

    return {
      success: false,
      message: "No verified sites found for the provided credentials"
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to Search Console";
    return {
      success: false,
      message: "Connection failed",
      error: msg
    };
  }
}

/**
 * List verified sites accessible to this account
 */
export async function listVerifiedSites(creds: GSCCredentials): Promise<string[]> {
  const client = getSearchConsoleClient(creds);
  const response = await client.sites.list();
  return (response.data.siteEntry || []).map((s) => s.siteUrl || "").filter(Boolean);
}

/**
 * Fetches search performance metrics: clicks, impressions, CTR, position,
 * daily trend, top keyword queries, and top landing pages.
 */
export async function getSearchPerformance(
  creds: GSCCredentials,
  options?: { startDate?: string; endDate?: string; rowLimit?: number }
): Promise<SearchPerformanceResult> {
  const client = getSearchConsoleClient(creds);
  const siteUrl = creds.siteUrl.trim();

  // GSC typically has a 2-3 day reporting delay. Default to 30 days window up to 3 days ago.
  const today = new Date();
  const defaultEnd = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const startDate = options?.startDate || defaultStart;
  const endDate = options?.endDate || defaultEnd;
  const limit = options?.rowLimit || 25;

  try {
    // 1. Daily timeline query
    const timelineRes = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 100
      }
    });

    // 2. Top queries query
    const queriesRes = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: limit
      }
    });

    // 3. Top landing pages query
    const pagesRes = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: limit
      }
    });

    let totalClicks = 0;
    let totalImpressions = 0;
    let positionSum = 0;

    const dailyTimeline = (timelineRes.data.rows || []).map((row) => {
      const date = row.keys?.[0] || "";
      const clicks = Number(row.clicks || 0);
      const impressions = Number(row.impressions || 0);
      const ctr = Number(((row.ctr || 0) * 100).toFixed(2));
      const position = Number((row.position || 0).toFixed(1));

      totalClicks += clicks;
      totalImpressions += impressions;
      positionSum += position * impressions;

      return {
        date,
        clicks,
        impressions,
        ctr,
        position
      };
    });

    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgPosition = totalImpressions > 0 ? Number((positionSum / totalImpressions).toFixed(1)) : 0;

    const topQueries: SearchQueryItem[] = (queriesRes.data.rows || []).map((row) => ({
      query: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number((row.position || 0).toFixed(1))
    }));

    const topPages: SearchPageItem[] = (pagesRes.data.rows || []).map((row) => ({
      page: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number((row.position || 0).toFixed(1))
    }));

    return {
      siteUrl,
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      dailyTimeline,
      topQueries,
      topPages
    };
  } catch (err: unknown) {
    console.error("[GSC_PERFORMANCE_ERROR]", err);
    throw err;
  }
}
