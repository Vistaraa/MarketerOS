import { google } from "googleapis";
import { AdMobCredentials, createDynamicAuthClient } from "./client";

const ADMOB_SCOPES = [
  "https://www.googleapis.com/auth/admob.readonly",
  "https://www.googleapis.com/auth/admob.report"
];

export interface AdMobAppItem {
  appId: string;
  name: string;
  platform: "ANDROID" | "IOS" | "UNKNOWN";
  approvalState: string;
}

export interface AdMobReportResult {
  publisherId: string;
  totalEarningsDollars: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averageRpm: number;
  dailyTimeline: Array<{
    date: string;
    earnings: number;
    impressions: number;
    clicks: number;
    rpm: number;
  }>;
  apps: AdMobAppItem[];
}

/**
 * Creates an authenticated AdMob client dynamically.
 */
function getAdMobClient(creds: AdMobCredentials) {
  const auth = createDynamicAuthClient(
    { oauth: creds.oauth, serviceAccount: creds.serviceAccount },
    ADMOB_SCOPES
  );

  return google.admob({
    version: "v1",
    auth: auth as any
  });
}

/**
 * Formats publisher ID to 'pub-XXXXXXXXXXXXXXXX' and resource name 'accounts/pub-XXXXXXXXXXXXXXXX'
 */
export function formatPublisherResource(pubId: string): { formattedId: string; resourceName: string } {
  let clean = pubId.trim();
  if (!clean.startsWith("pub-")) {
    clean = `pub-${clean.replace(/[^0-9]/g, "")}`;
  }
  return {
    formattedId: clean,
    resourceName: `accounts/${clean}`
  };
}

/**
 * Test live connection to Google AdMob
 */
export async function testAdMobConnection(creds: AdMobCredentials): Promise<{
  success: boolean;
  message: string;
  accessibleAccounts?: string[];
  error?: string;
}> {
  try {
    const client = getAdMobClient(creds);
    const listRes = await client.accounts.list();
    const accounts = listRes.data.account || [];

    const accessible = accounts.map((a) => a.publisherId || a.name || "").filter(Boolean);

    const { formattedId, resourceName } = formatPublisherResource(creds.publisherId);
    const isTargetAccessible = accessible.some((a) => a.includes(formattedId));

    if (accessible.length > 0) {
      return {
        success: true,
        message: isTargetAccessible
          ? `Successfully connected to publisher account ${formattedId}`
          : `Connected! Found ${accessible.length} publisher account(s)`,
        accessibleAccounts: accessible
      };
    }

    // Try direct get on the publisher account resource
    const getRes = await client.accounts.get({ name: resourceName });
    if (getRes.status === 200) {
      return {
        success: true,
        message: `Successfully connected to AdMob account (${formattedId})`,
        accessibleAccounts: [formattedId]
      };
    }

    return {
      success: false,
      message: "No accessible AdMob publisher accounts found"
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to Google AdMob";
    return {
      success: false,
      message: "Connection failed",
      error: msg
    };
  }
}

/**
 * List all apps in this AdMob publisher account
 */
export async function listAdMobApps(creds: AdMobCredentials): Promise<AdMobAppItem[]> {
  const client = getAdMobClient(creds);
  const { resourceName } = formatPublisherResource(creds.publisherId);

  try {
    const res = await client.accounts.apps.list({ parent: resourceName });
    const apps = res.data.apps || [];

    return apps.map((app) => ({
      appId: app.appId || "",
      name: app.manualAppInfo?.displayName || app.linkedAppInfo?.displayName || "Untitled App",
      platform: app.platform === "ANDROID" ? "ANDROID" : app.platform === "IOS" ? "IOS" : "UNKNOWN",
      approvalState: app.appApprovalState || "APPROVED"
    }));
  } catch (err: unknown) {
    console.error("[ADMOB_APPS_ERROR]", err);
    return [];
  }
}

/**
 * Generates an AdMob network report with earnings, impressions, CTR, and RPM
 */
export async function getAdMobNetworkReport(
  creds: AdMobCredentials,
  options?: { startDate?: string; endDate?: string }
): Promise<AdMobReportResult> {
  const client = getAdMobClient(creds);
  const { formattedId, resourceName } = formatPublisherResource(creds.publisherId);

  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const startDateStr = options?.startDate || defaultStart;
  const endDateStr = options?.endDate || defaultEnd;

  const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

  try {
    const [reportRes, appsList] = await Promise.all([
      client.accounts.networkReport.generate({
        parent: resourceName,
        requestBody: {
          reportSpec: {
            dateRange: {
              startDate: { year: startYear, month: startMonth, day: startDay },
              endDate: { year: endYear, month: endMonth, day: endDay }
            },
            dimensions: ["DATE"],
            metrics: [
              "ESTIMATED_EARNINGS",
              "IMPRESSIONS",
              "IMPRESSION_CTR",
              "IMPRESSION_RPM",
              "CLICKS"
            ],
            sortConditions: [{ dimension: "DATE", order: "ASCENDING" }]
          }
        }
      }),
      listAdMobApps(creds)
    ]);

    let totalEarningsMicros = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    const dailyTimeline: Array<{
      date: string;
      earnings: number;
      impressions: number;
      clicks: number;
      rpm: number;
    }> = [];

    const rows = (reportRes.data as unknown as Array<{
      row?: {
        dimensionValues?: Record<string, { value?: string }>;
        metricValues?: Record<string, { microsValue?: string; doubleValue?: number; integerValue?: string }>;
      };
    }>) || [];

    for (const item of rows) {
      if (!item.row) continue;
      const dVal = item.row.dimensionValues?.["DATE"]?.value || "";
      const formattedDate = dVal.length === 8 ? `${dVal.slice(0, 4)}-${dVal.slice(4, 6)}-${dVal.slice(6, 8)}` : dVal;

      const earningsMicros = Number(item.row.metricValues?.["ESTIMATED_EARNINGS"]?.microsValue || 0);
      const impressions = Number(item.row.metricValues?.["IMPRESSIONS"]?.integerValue || 0);
      const clicks = Number(item.row.metricValues?.["CLICKS"]?.integerValue || 0);
      const rpm = Number(item.row.metricValues?.["IMPRESSION_RPM"]?.doubleValue || 0);

      totalEarningsMicros += earningsMicros;
      totalImpressions += impressions;
      totalClicks += clicks;

      dailyTimeline.push({
        date: formattedDate,
        earnings: Number((earningsMicros / 1_000_000).toFixed(2)),
        impressions,
        clicks,
        rpm: Number(rpm.toFixed(2))
      });
    }

    const totalEarningsDollars = Number((totalEarningsMicros / 1_000_000).toFixed(2));
    const averageCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageRpm = totalImpressions > 0 ? Number(((totalEarningsDollars / totalImpressions) * 1000).toFixed(2)) : 0;

    return {
      publisherId: formattedId,
      totalEarningsDollars,
      totalImpressions,
      totalClicks,
      averageCtr,
      averageRpm,
      dailyTimeline,
      apps: appsList
    };
  } catch (err: unknown) {
    console.error("[ADMOB_REPORT_ERROR]", err);
    throw err;
  }
}
