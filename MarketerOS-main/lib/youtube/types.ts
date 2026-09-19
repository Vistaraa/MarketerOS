export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  thumbnailUrl: string;
  country: string;
  defaultLanguage: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
  hiddenSubscriberCount: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
}

export interface YouTubeAnalyticsData {
  dailyViews: { date: string; views: number; likes: number; comments: number }[];
  subscriberGains: { date: string; gained: number }[];
  topCountries: { country: string; views: number }[];
  trafficSources: { source: string; views: number; percentage: number }[];
  demographics: { ageGroup: string; percentage: number; gender: string }[];
  topVideos: { videoId: string; title: string; views: number; likes: number; comments: number; thumbnailUrl: string }[];
  engagement: {
    averageViewDuration: number;
    averageViewPercentage: number;
    estimatedMinutesWatched: number;
    subscriberGainsTotal: number;
  };
  revenue?: {
    estimatedRevenue: number;
    estimatedAdRevenue: number;
    estimatedRedPartnerRevenue: number;
    rpm: number;
    cpm: number;
  };
}

export interface YouTubeConnectInput {
  channelName: string;
  channelId: string;
  apiKey: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRedirectUri?: string;
  country?: string;
  defaultLanguage?: string;
  ga4PropertyId?: string;
}

export interface YouTubeChannelStats {
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  watchHours: number;
  averageViewDuration: number;
  likeToViewRatio: number;
  estimatedRevenue: number;
}
