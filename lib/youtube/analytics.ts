import type { YouTubeAnalyticsData } from "./types";

const YOUTUBE_ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2";

function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function queryAnalytics(accessToken: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ ids: "channel==MINE", ...params }).toString();
  const url = `${YOUTUBE_ANALYTICS_API}/reports?${qs}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetchWithTimeout(url, 15000);
  const data = await res.json() as Record<string, unknown>;
  if (data.error) throw new Error(String((data.error as Record<string, unknown>).message || "Analytics query failed"));
  return data;
}

export async function fetchDailyAnalytics(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["dailyViews"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "views,likes,comments",
    dimensions: "day"
  });
  const rows = (data.rows || []) as Array<[string, number, number, number]>;
  return rows.map((row) => ({
    date: row[0],
    views: Number(row[1]),
    likes: Number(row[2]),
    comments: Number(row[3])
  }));
}

export async function fetchSubscriberGains(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["subscriberGains"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "subscribersGained,subscribersLost",
    dimensions: "day"
  });
  const rows = (data.rows || []) as Array<[string, number, number]>;
  return rows.map((row) => ({
    date: row[0],
    gained: Number(row[1]) - Number(row[2])
  }));
}

export async function fetchTopCountries(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["topCountries"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "views",
    dimensions: "country",
    sort: "-views",
    maxResults: "10"
  });
  const rows = (data.rows || []) as Array<[string, number]>;
  return rows.map((row) => ({
    country: row[0],
    views: Number(row[1])
  }));
}

export async function fetchTrafficSources(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["trafficSources"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "views",
    dimensions: "insightTrafficSourceType",
    sort: "-views"
  });
  const rows = (data.rows || []) as Array<[string, number]>;
  const totalViews = rows.reduce((sum, row) => sum + Number(row[1]), 0);
  return rows.map((row) => ({
    source: row[0],
    views: Number(row[1]),
    percentage: totalViews > 0 ? Math.round((Number(row[1]) / totalViews) * 10000) / 100 : 0
  }));
}

export async function fetchDemographics(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["demographics"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "viewerPercentage",
    dimensions: "ageGroup,gender",
    sort: "-viewerPercentage"
  });
  const rows = (data.rows || []) as Array<[string, string, number]>;
  return rows.map((row) => ({
    ageGroup: row[0],
    gender: row[1],
    percentage: Number(row[2])
  }));
}

export async function fetchEngagementMetrics(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["engagement"]> {
  const data = await queryAnalytics(accessToken, {
    startDate,
    endDate,
    metrics: "averageViewDuration,averageViewPercentage,estimatedMinutesWatched,subscribersGained"
  });
  const rows = (data.rows || []) as Array<[number, number, number, number]>;
  if (rows.length === 0) return { averageViewDuration: 0, averageViewPercentage: 0, estimatedMinutesWatched: 0, subscriberGainsTotal: 0 };
  const row = rows[0];
  return {
    averageViewDuration: Number(row[0]),
    averageViewPercentage: Number(row[1]),
    estimatedMinutesWatched: Number(row[2]),
    subscriberGainsTotal: Number(row[3])
  };
}

export async function fetchRevenueMetrics(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData["revenue"] | undefined> {
  try {
    const data = await queryAnalytics(accessToken, {
      startDate,
      endDate,
      metrics: "estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue,grossRevenue,playbackBasedCpm"
    });
    const rows = (data.rows || []) as Array<[number, number, number, number, number]>;
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      estimatedRevenue: Number(row[0]),
      estimatedAdRevenue: Number(row[1]),
      estimatedRedPartnerRevenue: Number(row[2]),
      rpm: 0,
      cpm: Number(row[4])
    };
  } catch {
    return undefined;
  }
}

export async function fetchAllYouTubeAnalytics(accessToken: string, startDate: string, endDate: string): Promise<YouTubeAnalyticsData> {
  const [dailyViews, subscriberGains, topCountries, trafficSources, demographics, engagement, revenue] = await Promise.all([
    fetchDailyAnalytics(accessToken, startDate, endDate),
    fetchSubscriberGains(accessToken, startDate, endDate),
    fetchTopCountries(accessToken, startDate, endDate),
    fetchTrafficSources(accessToken, startDate, endDate),
    fetchDemographics(accessToken, startDate, endDate),
    fetchEngagementMetrics(accessToken, startDate, endDate),
    fetchRevenueMetrics(accessToken, startDate, endDate)
  ]);

  return { dailyViews, subscriberGains, topCountries, trafficSources, demographics, engagement, revenue, topVideos: [] };
}
