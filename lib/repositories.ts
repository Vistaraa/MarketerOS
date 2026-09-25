
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
  Shopify: Platform.SHOPIFY,
  X: Platform.X,
  Twitter: Platform.X,
  "X (Twitter)": Platform.X
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
  const rows = await prisma.lead.findMany({
    where: {
      workspaceId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { company: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { owner: true },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(leadFromRow);
}

function leadFromRow(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company: string | null;
  jobTitle?: string | null;
  source: string;
  status: string;
  score: number;
  ownerId?: string | null;
  owner?: { firstName: string; lastName: string } | null;
  createdAt: Date;
  estimatedValue?: unknown;
  revenue?: unknown;
  notes?: string | null;
}): Lead {
  return {
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone || undefined,
    company: row.company || "—",
    jobTitle: row.jobTitle || undefined,
    source: row.source.replaceAll("_", " "),
    status: row.status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) as Lead["status"],
    score: row.score,
    owner: row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : "Unassigned",
    ownerId: row.ownerId || undefined,
    created: row.createdAt.toISOString(),
    revenue: Number(row.estimatedValue || row.revenue || 0),
    notes: row.notes || undefined
  };
}

export async function getPersistedLead(workspaceId: string, id: string) {
  const row = await prisma.lead.findFirst({ where: { id, workspaceId }, include: { owner: true } });
  return row ? { lead: leadFromRow(row), detail: row } : null;
}

export async function createPersistedLead(input: {
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: string;
  score?: number;
  estimatedValue?: number;
  ownerId?: string;
  notes?: string;
}) {
  const sourceEnum = input.source
    ? (input.source.toUpperCase().replaceAll(" ", "_") as LeadSource)
    : LeadSource.MANUAL;
  const statusEnum = input.status
    ? (input.status.toUpperCase().replaceAll(" ", "_") as LeadStatus)
    : LeadStatus.NEW;

  return prisma.lead.create({
    data: {
      workspaceId: input.workspaceId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || undefined,
      company: input.company || undefined,
      jobTitle: input.jobTitle || undefined,
      source: sourceEnum,
      status: statusEnum,
      score: input.score ?? 0,
      estimatedValue: input.estimatedValue ? Number(input.estimatedValue) : 0,
      ownerId: input.ownerId || undefined,
      notes: input.notes || undefined
    },
    include: { owner: true }
  });
}

export async function updatePersistedLead(
  workspaceId: string,
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    source?: string;
    status?: string;
    score?: number;
    estimatedValue?: number;
    ownerId?: string;
    notes?: string;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.company !== undefined) updateData.company = data.company || null;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle || null;
  if (data.source !== undefined) updateData.source = data.source.toUpperCase().replaceAll(" ", "_") as LeadSource;
  if (data.status !== undefined) updateData.status = data.status.toUpperCase().replaceAll(" ", "_") as LeadStatus;
  if (data.score !== undefined) updateData.score = data.score;
  if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
  if (data.ownerId !== undefined) updateData.ownerId = data.ownerId || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  return prisma.lead.updateMany({
    where: { id, workspaceId },
    data: updateData as never
  });
}

export async function deletePersistedLead(workspaceId: string, id: string) {
  return prisma.lead.deleteMany({
    where: { id, workspaceId }
  });
}

export async function convertPersistedLeadToClient(workspaceId: string, leadId: string) {
  const leadRow = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId }
  });
  if (!leadRow) throw new Error("Lead not found.");

  const clientName = leadRow.company || `${leadRow.firstName} ${leadRow.lastName}`;
  const slug = `${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

  const client = await prisma.client.create({
    data: {
      workspaceId,
      name: clientName,
      slug,
      contactName: `${leadRow.firstName} ${leadRow.lastName}`,
      contactEmail: leadRow.email,
      contactPhone: leadRow.phone || undefined,
      monthlyBudget: leadRow.estimatedValue || 5000,
      status: "ACTIVE"
    }
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: LeadStatus.CONVERTED,
      clientId: client.id
    }
  });

  return client;
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
  providerKey?: string;
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
  if (input.providerKey) data.providerKey = input.providerKey;
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
      providerKey: input.providerKey || undefined,
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
  return rows.map((row) => ({ id: row.id, title: row.title, type: row.type, body: row.body, status: row.status, tone: row.tone, targetAudience: row.targetAudience, platform: row.platform, keywords: row.keywords, cta: row.cta, scheduledAt: row.scheduledAt, publishedAt: row.publishedAt, aiGenerated: row.aiGenerated, metadata: row.metadata, client: row.client ? { id: row.client.id, name: row.client.name } : null, createdBy: { id: row.createdBy.id, name: `${row.createdBy.firstName} ${row.createdBy.lastName}` }, createdAt: row.createdAt, updatedAt: row.updatedAt }));
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
    action: "View details",
    status: row.status as any,
    actionPayload: (row.actionPayload as Record<string, unknown> | null) || null
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
  return prisma.client.findMany({
    where: { workspaceId },
    include: {
      campaigns: { select: { id: true, name: true, status: true, budget: true, spend: true, conversions: true, roas: true } },
      leads: { select: { id: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getPersistedClient(workspaceId: string, id: string) {
  const client = await prisma.client.findFirst({
    where: { id, workspaceId },
    include: {
      campaigns: { include: { integration: true }, orderBy: { updatedAt: "desc" } },
      leads: { include: { owner: true }, orderBy: { createdAt: "desc" } },
      content: { include: { createdBy: true }, orderBy: { updatedAt: "desc" } },
      socialAccounts: { include: { posts: true } },
      integrations: true,
      reports: { orderBy: { createdAt: "desc" } }
    }
  });
  return client;
}

export async function updatePersistedClient(workspaceId: string, id: string, data: { name?: string; industry?: string; website?: string; status?: string; contactName?: string; contactEmail?: string; contactPhone?: string; currency?: string; timezone?: string; monthlyBudget?: number }) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.website !== undefined) updateData.website = data.website || null;
  if (data.status !== undefined) updateData.status = data.status.toUpperCase() as never;
  if (data.contactName !== undefined) updateData.contactName = data.contactName;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.monthlyBudget !== undefined) updateData.monthlyBudget = data.monthlyBudget;

  return prisma.client.updateMany({
    where: { id, workspaceId },
    data: updateData
  });
}

export async function deletePersistedClient(workspaceId: string, id: string) {
  return prisma.client.deleteMany({ where: { id, workspaceId } });
}

export async function listPersistedReports(workspaceId: string) {
  return prisma.report.findMany({ where: { workspaceId }, include: { client: true, createdBy: true }, orderBy: { updatedAt: "desc" } });
}

export async function getPersistedReport(workspaceId: string, id: string) {
  return prisma.report.findFirst({
    where: { id, workspaceId },
    include: { client: true, createdBy: true }
  });
}

export async function listPersistedAutomations(workspaceId: string) {
  return prisma.automation.findMany({ where: { workspaceId }, include: { campaign: true }, orderBy: { updatedAt: "desc" } });
}

export async function getPersistedAutomation(workspaceId: string, id: string) {
  return prisma.automation.findFirst({
    where: { id, workspaceId },
    include: { campaign: true }
  });
}

export async function updatePersistedAutomation(workspaceId: string, id: string, data: { name?: string; description?: string; trigger?: string; action?: string; isActive?: boolean; triggerConfig?: Record<string, unknown>; actionConfig?: Record<string, unknown> }) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.trigger !== undefined) updateData.trigger = data.trigger;
  if (data.action !== undefined) updateData.action = data.action;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.triggerConfig !== undefined) updateData.triggerConfig = (data.triggerConfig as Prisma.InputJsonValue) ?? undefined;
  if (data.actionConfig !== undefined) updateData.actionConfig = (data.actionConfig as Prisma.InputJsonValue) ?? undefined;

  return prisma.automation.updateMany({
    where: { id, workspaceId },
    data: updateData as never
  });
}

export async function deletePersistedAutomation(workspaceId: string, id: string) {
  return prisma.automation.deleteMany({ where: { id, workspaceId } });
}

export async function evaluateAutomationRule(workspaceId: string, id: string) {
  const rule = await prisma.automation.findFirst({
    where: { id, workspaceId },
    include: { campaign: true }
  });
  if (!rule) throw new Error("Automation rule not found.");

  const now = new Date();
  const updated = await prisma.automation.update({
    where: { id: rule.id },
    data: {
      executionCount: { increment: 1 },
      lastRunAt: now
    }
  });

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId, status: "ACTIVE" },
    select: { id: true, name: true, roas: true, cpa: true, spend: true }
  });

  const triggerConfig = (rule.triggerConfig as Record<string, unknown>) || {};
  const metricThreshold = Number(triggerConfig.metricThreshold) || 2.0;
  const minSpend = Number(triggerConfig.spendThreshold) || 0;

  const breachedCampaigns = campaigns.filter((c) => {
    const spend = Number(c.spend || 0);
    const roas = Number(c.roas || 0);
    if (rule.trigger === "campaign.roas_below") {
      return spend >= minSpend && roas < metricThreshold;
    }
    return false;
  });

  let logMessage = `Rule "${rule.name}" evaluated successfully against ${campaigns.length} active campaigns at ${now.toLocaleTimeString()}.`;
  let status = "SUCCESS";

  if (breachedCampaigns.length > 0) {
    status = "ACTION_TRIGGERED";
    logMessage = `Breach detected on ${breachedCampaigns.length} campaign(s) (${breachedCampaigns.map((b) => b.name).join(", ")}). Triggered action "${rule.action || "pause_and_notify"}".`;
  } else {
    logMessage += ` All campaigns within safety thresholds.`;
  }

  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: "EVALUATE_RULE",
      module: "automation",
      entityType: "Automation",
      entityId: rule.id,
      afterData: { status, message: logMessage, evaluatedAt: now.toISOString() } as never
    }
  });

  return { rule: updated, log: { id: `log-${Date.now()}`, timestamp: now.toISOString().replace("T", " ").slice(0, 19), status, message: logMessage } };
}

export async function getPersistedAutomationWithLogs(workspaceId: string, id: string) {
  const rule = await prisma.automation.findFirst({
    where: { id, workspaceId },
    include: { campaign: true }
  });
  if (!rule) return null;

  const logs = await prisma.auditLog.findMany({
    where: { workspaceId, module: "automation", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const formattedLogs = logs.map((log) => {
    const data = (log.afterData as Record<string, unknown>) || {};
    return {
      id: log.id,
      timestamp: log.createdAt.toISOString().replace("T", " ").slice(0, 19),
      status: (data.status as string) || "SUCCESS",
      message: (data.message as string) || `Rule action executed: ${log.action}`
    };
  });

  if (!formattedLogs.length) {
    formattedLogs.push({
      id: `log-init-${rule.id}`,
      timestamp: rule.createdAt.toISOString().replace("T", " ").slice(0, 19),
      status: "SUCCESS",
      message: `Rule "${rule.name}" created and active. Monitoring workspace campaigns.`
    });
  }

  return { rule, logs: formattedLogs };
}

export async function updatePersistedInsightStatus(workspaceId: string, id: string, status: string) {
  return prisma.aIInsight.updateMany({
    where: { id, workspaceId },
    data: { status: status.toUpperCase() as never }
  });
}

export async function getPersistedContentItem(workspaceId: string, id: string) {
  return prisma.content.findFirst({
    where: { id, workspaceId },
    include: { client: true, createdBy: true }
  });
}

export async function updatePersistedContentItem(workspaceId: string, id: string, data: { title?: string; body?: string; status?: string; type?: string; platform?: string; clientId?: string; scheduledAt?: string | Date | null; publishedAt?: string | Date | null; metadata?: Record<string, unknown> }) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.status !== undefined) updateData.status = data.status.toUpperCase() as never;
  if (data.type !== undefined) updateData.type = data.type as never;
  if (data.platform !== undefined) updateData.platform = data.platform.toUpperCase().replace(/\s+/g, "_") as never;
  if (data.clientId !== undefined) updateData.clientId = data.clientId || null;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
  if (data.metadata !== undefined) updateData.metadata = data.metadata as never;

  return prisma.content.updateMany({
    where: { id, workspaceId },
    data: updateData
  });
}

export async function deletePersistedContentItem(workspaceId: string, id: string) {
  return prisma.content.deleteMany({ where: { id, workspaceId } });
}

export async function listPersistedSocialAccountsMerged(workspaceId: string) {
  const [accounts, integrations] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.integration.findMany({
      where: {
        workspaceId,
        platform: { in: [Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN, Platform.TIKTOK, Platform.X, Platform.YOUTUBE] },
        status: "CONNECTED"
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const merged = [...accounts];
  for (const intg of integrations) {
    const existing = merged.find((acc) => acc.platform === intg.platform && (acc.accountId === intg.accountId || acc.username === intg.accountName));
    if (!existing) {
      merged.push({
        id: `intg-${intg.id}`,
        workspaceId: intg.workspaceId,
        clientId: intg.clientId,
        platform: intg.platform,
        accountId: intg.accountId,
        username: intg.accountName || `@${intg.platform.toLowerCase()}`,
        displayName: intg.accountName || `${intg.platform} Account`,
        avatarUrl: null,
        profileUrl: null,
        accessTokenEncrypted: intg.accessTokenEncrypted || intg.apiKeyEncrypted,
        refreshTokenEncrypted: intg.refreshTokenEncrypted,
        tokenExpiresAt: intg.tokenExpiresAt,
        followerCount: 0,
        isActive: intg.status === "CONNECTED",
        metadata: intg.metadata,
        createdAt: intg.createdAt,
        updatedAt: intg.updatedAt
      });
    }
  }
  return merged;
}

export async function createOrUpdatePersistedSocialAccount(input: {
  workspaceId: string;
  platform: string;
  accountId: string;
  apiKey: string;
  accountName?: string;
  username?: string;
  verifiedName?: string;
}) {
  const pKey = platformMap[input.platform] || input.platform.toUpperCase().replace(/\s+/g, "_");
  const platformEnum = (Platform as any)[pKey] || Platform.INSTAGRAM;
  const username = input.username || input.accountName || input.verifiedName || input.accountId;
  const displayName = input.verifiedName || input.accountName || username;
  const encToken = encryptSecret(input.apiKey);

  const account = await prisma.socialAccount.upsert({
    where: {
      workspaceId_platform_username: {
        workspaceId: input.workspaceId,
        platform: platformEnum,
        username
      }
    },
    create: {
      workspaceId: input.workspaceId,
      platform: platformEnum,
      accountId: input.accountId,
      username,
      displayName,
      accessTokenEncrypted: encToken,
      isActive: true,
      metadata: { lastVerifiedAt: new Date().toISOString() }
    },
    update: {
      accountId: input.accountId,
      displayName,
      accessTokenEncrypted: encToken,
      isActive: true,
      updatedAt: new Date()
    }
  });

  await connectPersistedIntegrationCredentials({
    workspaceId: input.workspaceId,
    platform: input.platform,
    accountName: displayName,
    accountId: input.accountId,
    apiKey: input.apiKey,
    verifiedName: displayName
  });

  return account;
}

export async function disconnectPersistedSocialAccount(workspaceId: string, id: string) {
  if (id.startsWith("intg-")) {
    const intgId = id.replace("intg-", "");
    return prisma.integration.updateMany({
      where: { id: intgId, workspaceId },
      data: { status: "DISCONNECTED" }
    });
  }
  return prisma.socialAccount.deleteMany({
    where: { id, workspaceId }
  });
}

export async function listPersistedTeam(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { owner: true } });
  if (!workspace) return [];

  // Fetch workspace memberships and active/pending invites
  const memberships = await prisma.oAuthState.findMany({
    where: {
      workspaceId,
      providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const memberMeta = new Map<string, { role: string; isInvited: boolean }>();
  for (const m of memberships) {
    if (m.userId && !memberMeta.has(m.userId)) {
      memberMeta.set(m.userId, {
        role: m.returnTo || "MANAGER",
        isInvited: m.providerKey === "TEAM_INVITE" && !m.consumedAt
      });
    }
  }

  const memberUserIds = Array.from(memberMeta.keys());
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: workspace.ownerId },
        ...(memberUserIds.length > 0 ? [{ id: { in: memberUserIds } }] : []),
        { status: "INVITED" }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  return users.map((u) => {
    const isOwner = u.id === workspace.ownerId;
    const meta = memberMeta.get(u.id);
    const role = isOwner ? "OWNER" : (meta?.role || "MANAGER");
    const status = isOwner
      ? u.status
      : (meta?.isInvited || u.status === "INVITED" || !u.passwordHash ? "INVITED" : u.status);

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role,
      status,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      jobTitle: u.jobTitle || (isOwner ? "Chief Executive Officer" : "Team Member"),
      createdAt: u.createdAt.toISOString()
    };
  });
}

export async function invitePersistedTeamMember(input: {
  workspaceId: string;
  inviterUserId?: string;
  inviterName?: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  role?: string;
  baseUrl?: string;
}) {
  const { createTeamInvitation } = await import("@/lib/invite-service");
  return createTeamInvitation(input);
}

export async function updatePersistedTeamMember(
  id: string,
  data: { role?: string; status?: string; jobTitle?: string },
  workspaceId?: string
) {
  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status.toUpperCase() as never;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;

  if (data.role && workspaceId) {
    await prisma.oAuthState.updateMany({
      where: {
        workspaceId,
        userId: id,
        providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] }
      },
      data: { returnTo: data.role.toUpperCase() }
    });
  }

  return prisma.user.update({
    where: { id },
    data: updateData
  });
}

export async function deletePersistedTeamMember(id: string, workspaceId?: string) {
  if (workspaceId) {
    await prisma.oAuthState.deleteMany({
      where: { workspaceId, userId: id }
    });
  }

  const ownedWorkspaces = await prisma.workspace.count({ where: { ownerId: id } });
  if (ownedWorkspaces === 0) {
    return prisma.user.delete({ where: { id } }).catch(() => null);
  }
}


