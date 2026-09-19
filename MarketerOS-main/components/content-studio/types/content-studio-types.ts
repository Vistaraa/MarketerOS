export type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "twitter" | "youtube";

export type ContentType = "Post" | "Carousel" | "Story" | "Reel" | "Video" | "Ad";

export type ContentStatus = "Published" | "Scheduled" | "Draft" | "In Review" | "Archived";

export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  email: string;
}

export interface PerformanceMetrics {
  reach: string;
  impressions: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  clicks: string;
  engagementRate: string;
  predictedScore?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  platform: Platform;
  contentType: ContentType;
  status: ContentStatus;
  caption: string;
  mediaUrls: string[];
  hashtags: string[];
  campaign?: string;
  author: User;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  performance?: PerformanceMetrics;
  day?: number;
  month?: number;
  year?: number;
  time?: string;
}

export interface Template {
  id: string;
  name: string;
  category: "Social Posts" | "Carousels" | "Stories" | "Reels" | "Ads" | "Campaigns" | "Brand Templates" | "My Templates";
  platforms: Platform[];
  thumbnail: string;
  width: number;
  height: number;
  author: User;
  usageCount: number;
  isFavorite: boolean;
  isFeatured?: boolean;
  isBrand?: boolean;
  updatedAt: string;
  headline?: string;
  subheadline?: string;
  captionTemplate?: string;
  variables?: string[];
  version?: string;
  versionHistory?: { version: string; author: string; date: string; changes: string }[];
}

export type MediaType = "Image" | "Video" | "GIF" | "Document" | "Audio";

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  size: number; // in bytes
  width?: number;
  height?: number;
  duration?: number; // seconds for video/audio
  folderId?: string;
  folderName?: string;
  tags: string[];
  uploadedBy: User;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  usedInPostsCount?: number;
}

export interface MediaFolder {
  id: string;
  name: string;
  fileCount: number;
  icon?: string;
}

export interface Hashtag {
  id: string;
  name: string;
  usageCount: number;
  reach: number;
  engagementRate: number;
  competition: "low" | "medium" | "high";
  growthRate: number;
  isSaved?: boolean;
  category?: string;
}

export interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
  usageCount: number;
  averagePerformance: number;
  lastUsed?: string;
  category?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  role: "Creator" | "Reviewer" | "Approver" | "Publisher";
  assignee?: string;
  required: boolean;
}

export interface ConnectedSocialAccount {
  id: string;
  platform: Platform;
  accountName: string;
  handle: string;
  avatarUrl?: string;
  status: "Connected" | "Disconnected" | "Needs Reconnect";
  lastSynced: string;
  followersCount?: string;
}

export interface ContentStudioSettingsState {
  general: {
    workspaceName: string;
    defaultTimezone: string;
    defaultLanguage: string;
    dateFormat: string;
    timeFormat: string;
    defaultLandingPage: string;
  };
  publishing: {
    defaultPublishingTime: string;
    timezone: string;
    defaultPlatform: Platform;
    defaultPostStatus: ContentStatus;
    autoPublish: boolean;
    scheduleConfirmation: boolean;
    retryFailedPosts: boolean;
    crossPlatformPublishing: boolean;
  };
  notifications: {
    postPublishedInApp: boolean;
    postPublishedEmail: boolean;
    postPublishedPush: boolean;
    postScheduledInApp: boolean;
    postScheduledEmail: boolean;
    postScheduledPush: boolean;
    postFailedInApp: boolean;
    postFailedEmail: boolean;
    postFailedPush: boolean;
    approvalRequestedInApp: boolean;
    approvalRequestedEmail: boolean;
    approvalRequestedPush: boolean;
    approvalCompletedInApp: boolean;
    approvalCompletedEmail: boolean;
    approvalCompletedPush: boolean;
    performanceReportsInApp: boolean;
    performanceReportsEmail: boolean;
    performanceReportsPush: boolean;
  };
  branding: {
    workspaceLogo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    defaultFont: string;
  };
  ai: {
    aiCaptionGeneration: boolean;
    aiHashtagSuggestions: boolean;
    aiContentIdeas: boolean;
    aiEngagementPrediction: boolean;
    aiBestTimeRecommendation: boolean;
    aiContentRepurposing: boolean;
    aiTone: "Professional" | "Friendly" | "Creative" | "Educational" | "Luxury" | "Minimal";
    language: string;
    creativity: "Low" | "Medium" | "High";
  };
}
