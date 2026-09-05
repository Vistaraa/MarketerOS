
import { Prisma, CampaignObjective, CampaignStatus, CampaignType, LeadSource, LeadStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { Campaign, Integration, Insight, Lead, SocialPost } from "@/lib/types";

const platformMap: Record<string, Platform> = {
  "Google Ads": Platform.GOOGLE_ADS,
  "Google Analytics": Platform.GOOGLE_ANALYTICS,
  "GA4": Platform.GOOGLE_ANALYTICS,
  "Google Search Console": Platform.GOOGLE_SEARCH_CONSOLE,
  "Search Console": Platform.GOOGLE_SEARCH_CONSOLE,
  "YouTube": Platform.YOUTUBE,
  "Google Business Profile": Platform.GOOGLE_BUSINESS_PROFILE,
  "Firebase": Platform.FIREBASE_ADMOB,
  "AdMob": Platform.FIREBASE_ADMOB,
  "Meta Ads": Platform.META_ADS,
  Meta: Platform.META_ADS,
  Instagram: Platform.INSTAGRAM,
  Facebook: Platform.FACEBOOK,
  Messenger: Platform.MESSENGER,
  "Facebook Messenger": Platform.MESSENGER,
  WhatsApp: Platform.WHATSAPP,
  "WhatsApp Business": Platform.WHATSAPP,
  LinkedIn: Platform.LINKEDIN,
  TikTok: Platform.TIKTOK,
  Shopify: Platform.SHOPIFY
};

const platformName: Partial<Record<Platform, Campaign["platform"]>> = {
  GOOGLE_ADS: "Google Ads",
  GOOGLE_ANALYTICS: "GA4",
  GOOGLE_SEARCH_CONSOLE: "Google Search Console" as unknown as Campaign["platform"],
  YOUTUBE: "YouTube",
  GOOGLE_BUSINESS_PROFILE: "Google Business Profile" as unknown as Campaign["platform"],
  FIREBASE_ADMOB: "Firebase" as unknown as Campaign["platform"],
  META_ADS: "Meta Ads",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  MESSENGER: "Messenger" as unknown as Campaign["platform"],
  WHATSAPP: "WhatsApp" as unknown as Campaign["platform"],
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  X: "X",
  SHOPIFY: "Shopify",
  OTHER: "WordPress"
};
const titleStatus: Record<string, Campaign["status"]> = { DRAFT: "Draft", ACTIVE: "Active", PAUSED: "Paused", COMPLETED: "Completed", ARCHIVED: "Archived", DELETED: "Archived" };

function campaignFromRow(row: { id: string; name: string; platform: Platform; status: string; objective: string; budget: unknown; spend: unknown; clicks: number; conversions: number; roas: unknown; ctr: unknown; cpa: unknown; startDate: Date | null; client?: { name: string } | null; clientId?: string | null }): Campaign {
  return { id: row.id, name: row.name, platform: platformName[row.platform] || "Google Ads", status: titleStatus[row.status], objective: row.objective.replaceAll("_", " "), budget: Number(row.budget || 0), spend: Number(row.spend), clicks: row.clicks, conversions: row.conversions, roas: Number(row.roas), ctr: Number(row.ctr), cpa: Number(row.cpa), startDate: row.startDate?.toISOString().slice(0, 10) || "Not started", client: row.client?.name, clientId: row.clientId || undefined };
}

export async function listPersistedCampaigns(workspaceId: string, query = "") {
  const rows = await prisma.campaign.findMany({ where: { workspaceId, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, include: { client: true, integration: true }, orderBy: { updatedAt: "desc" } });
  return rows.map(campaignFromRow);
}

export async function getPersistedCampaign(workspaceId: string, id: string) {
  const row = await prisma.campaign.findFirst({ where: { id, workspaceId }, include: { client: true, integration: true, adGroups: { include: { ads: true, keywords: true } }, ads: true, keywords: true, metrics: { orderBy: { date: "asc" }, take: 90 } } });
  return row ? { campaign: campaignFromRow(row), detail: row } : null;
}

const objectiveMap: Record<string, CampaignObjective> = {
  Sales: CampaignObjective.SALES,
  SALES: CampaignObjective.SALES,
  Conversions: CampaignObjective.CONVERSIONS,
  CONVERSIONS: CampaignObjective.CONVERSIONS,
  Leads: CampaignObjective.LEADS,
  LEADS: CampaignObjective.LEADS,
  Traffic: CampaignObjective.TRAFFIC,
  TRAFFIC: CampaignObjective.TRAFFIC,
  "Website Traffic": CampaignObjective.TRAFFIC,
  WEBSITE_TRAFFIC: CampaignObjective.TRAFFIC,
  Awareness: CampaignObjective.AWARENESS,
  AWARENESS: CampaignObjective.AWARENESS,
  "Brand Awareness": CampaignObjective.AWARENESS,
  BRAND_AWARENESS: CampaignObjective.AWARENESS,
  Engagement: CampaignObjective.ENGAGEMENT,
  ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  "App Promotion": CampaignObjective.APP_INSTALLS,
  "App Installs": CampaignObjective.APP_INSTALLS,
  APP_PROMOTION: CampaignObjective.APP_INSTALLS,
  APP_INSTALLS: CampaignObjective.APP_INSTALLS
};

export async function createPersistedCampaign(input: { workspaceId: string; createdById: string; integrationId?: string; name: string; platform: string; objective: string; budget: number; dailyBudget?: number; targetRoas?: number; targetCpa?: number; biddingStrategy?: string; metadata?: Record<string, unknown> | null }) {
  const platform = platformMap[input.platform] || Platform.GOOGLE_ADS;
  const objective = objectiveMap[input.objective] || objectiveMap[input.objective.toUpperCase()] || CampaignObjective.SALES;
  const type = platform === Platform.GOOGLE_ADS ? CampaignType.SEARCH : CampaignType.SOCIAL;
  return prisma.campaign.create({
    data: {
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      integrationId: input.integrationId,
      name: input.name,
      platform,
      objective,
      type,
      budget: input.budget,
      dailyBudget: input.dailyBudget || input.budget / 30,
      targetRoas: input.targetRoas,
      targetCpa: input.targetCpa,
      biddingStrategy: input.biddingStrategy,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined
    }
  });
}

export async function updatePersistedCampaignStatus(workspaceId: string, id: string, status: string) {
  const updated = await prisma.campaign.updateMany({ where: { id, workspaceId }, data: { status: status.toUpperCase().replace(" ", "_") as CampaignStatus } });
  return updated.count ? prisma.campaign.findFirst({ where: { id, workspaceId }, include: { client: true } }) : null;
}

export async function archivePersistedCampaign(workspaceId: string, id: string) {
  return updatePersistedCampaignStatus(workspaceId, id, "ARCHIVED");
}

export async function listPersistedLeads(workspaceId: string, query = "") {
  const rows = await prisma.lead.findMany({ where: { workspaceId, ...(query ? { OR: [{ firstName: { contains: query, mode: "insensitive" } }, { lastName: { contains: query, mode: "insensitive" } }, { company: { contains: query, mode: "insensitive" } }] } : {}) }, include: { owner: true }, orderBy: { createdAt: "desc" } });
  return rows.map(leadFromRow);
}

function leadFromRow(row: { id: string; firstName: string; lastName: string; company: string | null; source: string; status: string; score: number; owner?: { firstName: string; lastName: string } | null; createdAt: Date; estimatedValue?: unknown; revenue?: unknown }): Lead {
  return { id: row.id, name: `${row.firstName} ${row.lastName}`, company: row.company || "—", source: row.source.replaceAll("_", " "), status: row.status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) as Lead["status"], score: row.score, owner: row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : "Unassigned", created: row.createdAt.toISOString(), revenue: Number(row.estimatedValue || row.revenue || 0) };
}

export async function getPersistedLead(workspaceId: string, id: string) {
  const row = await prisma.lead.findFirst({ where: { id, workspaceId }, include: { owner: true } });
  return row ? { lead: leadFromRow(row), detail: row } : null;
}

export async function createPersistedLead(input: { workspaceId: string; firstName: string; lastName: string; email: string; company?: string; source?: string }) {
  return prisma.lead.create({ data: { workspaceId: input.workspaceId, firstName: input.firstName, lastName: input.lastName, email: input.email, company: input.company, source: (input.source?.toUpperCase().replaceAll(" ", "_") as LeadSource) || LeadSource.MANUAL, status: LeadStatus.NEW } });
}

const integrationPlatform: Partial<Record<Platform, Integration["platform"]>> = { GOOGLE_ADS: "Google Ads", META_ADS: "Meta Ads", GOOGLE_ANALYTICS: "Google Analytics", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", TIKTOK: "TikTok", YOUTUBE: "YouTube", X: "X", SHOPIFY: "Shopify", OTHER: "WordPress" };
const integrationColor: Record<string, string> = { "Google Ads": "#4285f4", "Meta Ads": "#1877f2", Instagram: "#e4405f", Facebook: "#1877f2", LinkedIn: "#0a66c2", TikTok: "#111827", YouTube: "#ff0000", "Google Analytics": "#f9ab00", Shopify: "#96bf48" };

function integrationFromRow(row: { id: string; platform: Platform; accountName: string | null; accountId: string | null; status: string; lastSyncedAt: Date | null; providerKey: string | null; errorMessage: string | null }): Integration & { providerKey?: string; error?: string } {
  const providerLabels: Record<string, Integration["platform"]> = { google_ads: "Google Ads", google_analytics: "Google Analytics", google_search_console: "Google Search Console", google_firebase: "Firebase", google_admob: "AdMob", google_youtube: "YouTube", google_business_profile: "Google Business Profile", meta_ads: "Meta Ads", meta_facebook: "Facebook", meta_instagram: "Instagram", meta_messenger: "Messenger", meta_whatsapp: "WhatsApp Business" };
  const platform = providerLabels[row.providerKey || ""] || integrationPlatform[row.platform] || "WordPress";
  return { id: row.id, platform, description: `${platform} account`, category: platform.includes("Analytics") ? "Analytics" : "Advertising", status: row.status === "CONNECTED" ? "Connected" : row.status === "ERROR" || row.status === "EXPIRED" ? "Needs attention" : "Not connected", account: row.accountName || row.accountId || undefined, synced: row.lastSyncedAt?.toISOString(), color: integrationColor[platform] || "#6940e8", initials: platform.slice(0, 1), providerKey: row.providerKey || undefined, error: row.errorMessage || undefined };
}

export async function listPersistedIntegrations(workspaceId: string, clientId?: string) {
  const rows = await prisma.integration.findMany({ where: { workspaceId, ...(clientId ? { clientId } : {}) }, orderBy: { updatedAt: "desc" } });
  return rows.map(integrationFromRow);
}

export async function connectPersistedIntegrationCredentials(input: {
  workspaceId: string;
  platform: string;
  accountName: string;
  accountId: string;
  apiKey?: string;
  metadata?: Record<string, unknown>;
  verifiedName?: string;
}) {
  const platformEnum = platformMap[input.platform] || Platform.GOOGLE_ADS;
  const existing = await prisma.integration.findFirst({
    where: { workspaceId: input.workspaceId, platform: platformEnum }
  });

  const encryptedApiKey = input.apiKey ? encryptSecret(input.apiKey) : undefined;
  const data: Record<string, unknown> = {
    accountName: input.verifiedName || input.accountName,
    accountId: input.accountId,
    status: "CONNECTED",
    errorMessage: null,
    lastSyncedAt: new Date(),
    metadata: (input.metadata || {}) as never
  };
  if (encryptedApiKey) data.apiKeyEncrypted = encryptedApiKey;

  if (existing) {
    return prisma.integration.update({ where: { id: existing.id }, data: data as never });
  }

  return prisma.integration.create({
    data: {
      workspaceId: input.workspaceId,
      platform: platformEnum,
      accountName: input.verifiedName || input.accountName,
      accountId: input.accountId,
      apiKeyEncrypted: encryptedApiKey || "",
      status: "CONNECTED",
      lastSyncedAt: new Date(),
      metadata: (input.metadata || {}) as never
    } as never
  });
}

export async function disconnectPersistedIntegration(workspaceId: string, integrationId: string) {
  return prisma.integration.updateMany({
    where: { id: integrationId, workspaceId },
    data: {
      status: "DISCONNECTED",
      accountName: null,
      accountId: null,
      apiKey: null,
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      errorMessage: null
    }
  });
}

export async function getPersistedIntegration(workspaceId: string, id: string) {
  const row = await prisma.integration.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      workspaceId: true,
      clientId: true,
      platform: true,
      accountName: true,
      accountId: true,
      status: true,
      tokenExpiresAt: true,
      scopes: true,
      metadata: true,
      providerKey: true,
      errorMessage: true,
      lastSyncedAt: true,
      lastSyncStarted: true,
      lastSyncFinished: true,
      createdAt: true,
      updatedAt: true,
      syncLogs: { orderBy: { startedAt: "desc" }, take: 20 }
    }
  });
  return row ? { integration: integrationFromRow(row), detail: row } : null;
}

function socialStatus(status: string): SocialPost["status"] {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "DRAFT") return "Draft";
  return "In review";
}

export async function listPersistedSocialPosts(workspaceId: string, query = "") {
  const rows = await prisma.socialPost.findMany({
    where: {
      socialAccount: { workspaceId },
      ...(query ? { content: { contains: query, mode: "insensitive" } } : {})
    },
    include: { socialAccount: true },
    orderBy: { updatedAt: "desc" }
  });
  return rows.map((row): SocialPost => {
    const platform = (row.socialAccount?.platform && platformName[row.socialAccount.platform]) || "Google Ads";
    return {
      id: row.id,
      title: row.content.slice(0, 60) || "Untitled post",
      platform: platform as SocialPost["platform"],
      status: socialStatus(row.status),
      date: (row.publishedAt || row.scheduledFor || row.createdAt).toISOString(),
      engagement: `${Number(row.clicks ? (row.clicks / (row.impressions || 1)) * 100 : 0).toFixed(2)}%`,
      color: integrationColor[platform] || "#6940e8",
      image: row.mediaUrls[0]
    };
  });
}

export async function listPersistedContent(workspaceId: string, query = "") {
  const rows = await prisma.content.findMany({ where: { workspaceId, ...(query ? { title: { contains: query, mode: "insensitive" } } : {}) }, include: { client: true, createdBy: true }, orderBy: { updatedAt: "desc" } });
  return rows.map((row) => ({ id: row.id, title: row.title, type: row.type, body: row.body, status: row.status, tone: row.tone, targetAudience: row.targetAudience, platform: row.platform, keywords: row.keywords, cta: row.cta, scheduledAt: row.scheduledAt, publishedAt: row.publishedAt, aiGenerated: row.aiGenerated, client: row.client ? { id: row.client.id, name: row.client.name } : null, createdBy: { id: row.createdBy.id, name: `${row.createdBy.firstName} ${row.createdBy.lastName}` }, createdAt: row.createdAt, updatedAt: row.updatedAt }));
}

export async function listPersistedInsights(workspaceId: string) {
  const rows = await prisma.aIInsight.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map((row): Insight => ({
    id: row.id,
    category: row.type === "KEYWORD" ? "Keywords" : (row.type.charAt(0) + row.type.slice(1).toLowerCase() as Insight["category"]),
    title: row.title,
    description: row.description,
    impact: row.impact || "Review",
    confidence: row.score || 85,
    tone: row.type === "BUDGET" || row.type === "KEYWORD" ? "orange" : row.type === "AUDIENCE" ? "blue" : row.type === "CONTENT" ? "purple" : "green",
    action: "View details"
  }));
}

export async function listPersistedNotifications(workspaceId: string, userId: string, unreadOnly = false) {
  return prisma.notification.findMany({ where: { workspaceId, userId, ...(unreadOnly ? { isRead: false } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function searchPersisted(workspaceId: string, query: string) {
  if (!query) return [];
  const [campaignRows, leadRows, contentRows, clientRows] = await Promise.all([
    prisma.campaign.findMany({ where: { workspaceId, name: { contains: query, mode: "insensitive" } }, take: 20 }),
    prisma.lead.findMany({ where: { workspaceId, OR: [{ firstName: { contains: query, mode: "insensitive" } }, { lastName: { contains: query, mode: "insensitive" } }, { company: { contains: query, mode: "insensitive" } }] }, take: 20 }),
    prisma.content.findMany({ where: { workspaceId, title: { contains: query, mode: "insensitive" } }, take: 20 }),
    prisma.client.findMany({ where: { workspaceId, name: { contains: query, mode: "insensitive" } }, take: 20 })
  ]);
  return [...campaignRows.map((row) => ({ type: "Campaign", name: row.name, href: `/campaigns/${row.id}` })), ...leadRows.map((row) => ({ type: "Lead", name: `${row.firstName} ${row.lastName}`, href: `/leads/${row.id}` })), ...contentRows.map((row) => ({ type: "Content", name: row.title, href: `/content-studio/${row.id}` })), ...clientRows.map((row) => ({ type: "Client", name: row.name, href: `/clients/${row.id}` }))];
}

export async function listPersistedClients(workspaceId: string) {
  return prisma.client.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } });
}

export async function listPersistedReports(workspaceId: string) {
  return prisma.report.findMany({ where: { workspaceId }, include: { client: true }, orderBy: { updatedAt: "desc" } });
}

export async function listPersistedAutomations(workspaceId: string) {
  return prisma.automation.findMany({ where: { workspaceId }, include: { campaign: true }, orderBy: { updatedAt: "desc" } });
}

export async function listPersistedTeam(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { owner: true } });
  if (!workspace) return [];
  return [{ id: workspace.owner.id, name: `${workspace.owner.firstName} ${workspace.owner.lastName}`, email: workspace.owner.email, role: "OWNER", status: "ACTIVE", lastLoginAt: workspace.owner.lastLoginAt }];
}
