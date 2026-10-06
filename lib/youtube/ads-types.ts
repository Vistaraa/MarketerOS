export interface YouTubeAdCampaign {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
  budget: number;
  budgetType: "DAILY" | "LIFETIME";
  startDate: string;
  endDate?: string;
  impressions: number;
  views: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  viewRate: number;
 CPV: number;
}

export interface YouTubeAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  bidAmount: number;
  bidType: "CPC" | "CPM" | "CPV";
  targeting: string;
  impressions: number;
  views: number;
  clicks: number;
  spend: number;
}

export interface YouTubeAd {
  id: string;
  adGroupId: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  headline: string;
  description: string;
  callToAction: string;
  impressions: number;
  views: number;
  clicks: number;
  spend: number;
  viewRate: number;
}

/** Organic channel performance from the YouTube Data API. Counts are null when YouTube hides them. */
export interface YouTubeChannelPerformance {
  channelTitle: string;
  totalViews: number | null;
  subscribers: number | null;
  videoCount: number | null;
  recentVideos: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    publishedAt: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
  }>;
  /** True when the workspace's Google Ads account returned its YouTube (VIDEO) campaign metrics. */
  adMetricsAvailable: boolean;
  ads?: {
    summary: { impressions: number; views: number | null; clicks: number; spend: number; conversions: number; ctr: number; cpv: number | null; viewRate: number | null };
    campaigns: YouTubeAdCampaign[];
    daily: YouTubeAdsMetrics[];
    period: { from: string; to: string };
  } | null;
  adMetricsUnavailableReason?: string | null;
}

export interface YouTubeAdsMetrics {
  date: string;
  impressions: number;
  views: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface YouTubeAdsConnectInput {
  apiKey: string;
  channelId: string;
  googleAdsCustomerId?: string;
  googleAdsDeveloperToken?: string;
}
