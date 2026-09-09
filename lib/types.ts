export type Platform = "Google Ads" | "Meta Ads" | "Instagram" | "Facebook" | "LinkedIn" | "TikTok" | "GA4" | "Google Analytics" | "Google Search Console" | "Firebase" | "AdMob" | "Google Business Profile" | "YouTube" | "X" | "Messenger" | "WhatsApp Business" | "Shopify" | "WordPress";
export type CampaignStatus = "Active" | "Paused" | "Draft" | "Completed" | "Archived";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal sent" | "Converted" | "Lost";

export type Campaign = {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  objective: string;
  budget: number;
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpa: number;
  startDate: string;
  client?: string;
  clientId?: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  score: number;
  owner: string;
  created: string;
  revenue: number;
};

export type Integration = {
  id: string;
  platform: Platform;
  description: string;
  category: string;
  status: "Connected" | "Not connected" | "Needs attention";
  account?: string;
  synced?: string;
  color: string;
  initials: string;
  providerKey?: string;
};

export type Insight = {
  id: string;
  category: "Campaign" | "Budget" | "Content" | "Audience" | "Keywords" | "Leads";
  title: string;
  description: string;
  impact: string;
  confidence: number;
  tone: "purple" | "green" | "orange" | "blue";
  action: string;
};

export type SocialPost = {
  id: string;
  title: string;
  platform: "Instagram" | "LinkedIn" | "Facebook" | "X" | "TikTok";
  status: "Published" | "Scheduled" | "Draft" | "In review";
  date: string;
  engagement: string;
  color: string;
  image?: string;
};

export type ChartPoint = {
  date: string;
  spend: number;
  clicks?: number;
  conversions?: number;
  roas?: number;
  revenue?: number;
};

export type MetricKpi = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: string;
  tone?: "purple" | "blue" | "green" | "orange" | "teal" | "pink";
};

export type PlatformSpendItem = {
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type OverviewQuery = {
  dateFrom: string;
  dateTo: string;
  compareFrom: string;
  compareTo: string;
  granularity: "daily" | "weekly" | "monthly";
  platform: string;
  status: string;
  clientId: string;
  search: string;
};

export type OverviewSummary = {
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  conversionRate: number;
  revenue: number;
};

export type OverviewPayload = {
  kpis: MetricKpi[];
  series: ChartPoint[];
  platformSpend: PlatformSpendItem[];
  campaigns: Campaign[];
  insights: Insight[];
  integrations: Integration[];
  summary?: OverviewSummary;
};
