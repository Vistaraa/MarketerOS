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

export interface YouTubeAdsDashboard {
  totalSpend: number;
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  averageCPV: number;
  averageCPM: number;
  averageCTR: number;
  averageViewRate: number;
  campaigns: YouTubeAdCampaign[];
  recentAds: YouTubeAd[];
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
