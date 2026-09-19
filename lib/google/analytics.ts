import { google } from "googleapis";
import { GA4Credentials, createDynamicAuthClient } from "./client";

const GA_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/analytics"
];

export interface RealtimeReportResult {
  activeUsersNow: number;
  devices: Array<{ category: string; users: number }>;
  countries: Array<{ country: string; users: number }>;
  topPages: Array<{ pageTitle: string; users: number }>;
}

export interface TrafficOverviewResult {
  totalSessions: number;
  totalActiveUsers: number;
  totalPageViews: number;
  bounceRate: number;
  avgSessionDurationSeconds: number;
  dailyTimeline: Array<{
    date: string;
    sessions: number;
    activeUsers: number;
    pageViews: number;
  }>;
  channels: Array<{
    channel: string;
    sessions: number;
    users: number;
  }>;
}

/**
 * Creates an authenticated GA4 AnalyticsData client using dynamic user credentials.
 */
function getAnalyticsDataClient(creds: GA4Credentials) {
  const auth = createDynamicAuthClient(
    { oauth: creds.oauth, serviceAccount: creds.serviceAccount },
    GA_SCOPES
  );

  return google.analyticsdata({
    version: "v1beta",
    auth: auth as any
  });
}

/**
 * Format property ID cleanly (e.g. "123456789" -> "properties/123456789")
 */
function formatPropertyResource(propertyId: string): string {
  const clean = propertyId.replace(/[^0-9]/g, "");
  return `properties/${clean}`;
}

/**
 * Tests live connection to user's GA4 Property
 */
export async function testAnalyticsConnection(creds: GA4Credentials): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const client = getAnalyticsDataClient(creds);
    const property = formatPropertyResource(creds.propertyId);

    // Run a minimal query to verify read permission
    const response = await client.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        limit: "1"
      }
    });

    if (response.status === 200) {
      return {
        success: true,
        message: `Successfully connected to GA4 Property (${creds.propertyId})`
      };
    }

    return {
      success: false,
      message: "Connection failed with non-200 response"
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to GA4 Property";
    return {
      success: false,
      message: "Connection failed",
      error: msg
    };
  }
}

/**
 * Fetches real-time visitors currently on the website/app (last 30 minutes)
 */
export async function getRealtimeActiveUsers(creds: GA4Credentials): Promise<RealtimeReportResult> {
  const client = getAnalyticsDataClient(creds);
  const property = formatPropertyResource(creds.propertyId);

  try {
    const [userCountRes, deviceRes, countryRes, pageRes] = await Promise.all([
      client.properties.runRealtimeReport({
        property,
        requestBody: {
          metrics: [{ name: "activeUsers" }]
        }
      }),
      client.properties.runRealtimeReport({
        property,
        requestBody: {
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
          limit: "5"
        }
      }),
      client.properties.runRealtimeReport({
        property,
        requestBody: {
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          limit: "5"
        }
      }),
      client.properties.runRealtimeReport({
        property,
        requestBody: {
          dimensions: [{ name: "unifiedScreenName" }],
          metrics: [{ name: "activeUsers" }],
          limit: "5"
        }
      })
    ]);

    const activeUsersNow = Number(userCountRes.data.rows?.[0]?.metricValues?.[0]?.value || 0);

    const devices = (deviceRes.data.rows || []).map((row) => ({
      category: row.dimensionValues?.[0]?.value || "Unknown",
      users: Number(row.metricValues?.[0]?.value || 0)
    }));

    const countries = (countryRes.data.rows || []).map((row) => ({
      country: row.dimensionValues?.[0]?.value || "Unknown",
      users: Number(row.metricValues?.[0]?.value || 0)
    }));

    const topPages = (pageRes.data.rows || []).map((row) => ({
      pageTitle: row.dimensionValues?.[0]?.value || "Home",
      users: Number(row.metricValues?.[0]?.value || 0)
    }));

    return {
      activeUsersNow,
      devices,
      countries,
      topPages
    };
  } catch (err: unknown) {
    console.error("[GA4_REALTIME_ERROR]", err);
    throw err;
  }
}

/**
 * Fetches historical traffic analytics (sessions, active users, views, bounce rate, channels)
 */
export async function getTrafficReport(
  creds: GA4Credentials,
  options?: { startDate?: string; endDate?: string }
): Promise<TrafficOverviewResult> {
  const client = getAnalyticsDataClient(creds);
  const property = formatPropertyResource(creds.propertyId);

  const startDate = options?.startDate || "28daysAgo";
  const endDate = options?.endDate || "today";

  try {
    // 1. Daily timeline
    const timelineRes = await client.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" }
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }]
      }
    });

    // 2. Channel grouping
    const channelRes = await client.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" }
        ],
        limit: "10"
      }
    });

    let totalSessions = 0;
    let totalActiveUsers = 0;
    let totalPageViews = 0;
    let totalBounceSum = 0;
    let totalDurationSum = 0;

    const dailyTimeline = (timelineRes.data.rows || []).map((row) => {
      const d = row.dimensionValues?.[0]?.value || "";
      const formattedDate = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const activeUsers = Number(row.metricValues?.[1]?.value || 0);
      const pageViews = Number(row.metricValues?.[2]?.value || 0);

      totalSessions += sessions;
      totalActiveUsers += activeUsers;
      totalPageViews += pageViews;

      return {
        date: formattedDate,
        sessions,
        activeUsers,
        pageViews
      };
    });

    const channels = (channelRes.data.rows || []).map((row) => {
      const channel = row.dimensionValues?.[0]?.value || "Direct";
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const users = Number(row.metricValues?.[1]?.value || 0);
      const bounceRate = Number(row.metricValues?.[2]?.value || 0);
      const avgDuration = Number(row.metricValues?.[3]?.value || 0);

      totalBounceSum += bounceRate * sessions;
      totalDurationSum += avgDuration * sessions;

      return {
        channel,
        sessions,
        users
      };
    });

    const calculatedBounceRate = totalSessions > 0 ? (totalBounceSum / totalSessions) * 100 : 0;
    const avgDuration = totalSessions > 0 ? totalDurationSum / totalSessions : 0;

    return {
      totalSessions,
      totalActiveUsers,
      totalPageViews,
      bounceRate: Number(calculatedBounceRate.toFixed(1)),
      avgSessionDurationSeconds: Math.round(avgDuration),
      dailyTimeline,
      channels
    };
  } catch (err: unknown) {
    console.error("[GA4_TRAFFIC_ERROR]", err);
    throw err;
  }
}

/**
 * Send an event via GA4 Measurement Protocol directly
 */
export async function sendMeasurementEvent(
  measurementId: string,
  apiSecret: string,
  event: {
    clientId: string;
    userId?: string;
    name: string;
    params?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

    const payload = {
      client_id: event.clientId,
      user_id: event.userId,
      events: [
        {
          name: event.name,
          params: event.params || {}
        }
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(9_000)
    });

    if (res.status >= 200 && res.status < 300) {
      return { success: true };
    }

    const text = await res.text();
    return { success: false, error: text || `HTTP status ${res.status}` };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post Measurement Protocol event"
    };
  }
}
