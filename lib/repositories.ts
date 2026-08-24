import { CampaignObjective, CampaignStatus, CampaignType, LeadSource, LeadStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Campaign, Integration, Insight, Lead, SocialPost } from "@/lib/types";

const platformMap: Record<string, Platform> = { "Google Ads": Platform.GOOGLE_ADS, "Meta Ads": Platform.META_ADS, Instagram: Platform.INSTAGRAM, LinkedIn: Platform.LINKEDIN, TikTok: Platform.TIKTOK, GA4: Platform.GOOGLE_ANALYTICS, Shopify: Platform.SHOPIFY };
const platformName: Partial<Record<Platform, Campaign["platform"]>> = { GOOGLE_ADS: "Google Ads", META_ADS: "Meta Ads", GOOGLE_ANALYTICS: "GA4", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", TIKTOK: "TikTok", YOUTUBE: "YouTube", X: "X", SHOPIFY: "Shopify", OTHER: "WordPress" };
const titleStatus: Record<string, Campaign["status"]> = { DRAFT: "Draft", ACTIVE: "Active", PAUSED: "Paused", COMPLETED: "Completed", ARCHIVED: "Archived", DELETED: "Archived" };

function campaignFromRow(row: { id: string; name: string; platform: Platform; status: string; objective: string; budget: unknown; spend: unknown; clicks: number; conversions: number; roas: unknown; ctr: unknown; cpa: unknown; startDate: Date | null; client?: { name: string } | null; clientId?: string | null }): Campaign {
  return { id: row.id, name: row.name, platform: platformName[row.platform] || "Google Ads", status: titleStatus[row.status], objective: row.objective.replaceAll("_", " "), budget: Number(row.budget || 0), spend: Number(row.spend), clicks: row.clicks, conversions: row.conversions, roas: Number(row.roas), ctr: Number(row.ctr), cpa: Number(row.cpa), startDate: row.startDate?.toISOString().slice(0, 10) || "Not started", client: row.client?.name, clientId: row.clientId || undefined };
}

export async function listPersistedCampaigns(workspaceId: string, query = "") {
  const rows = await prisma.campaign.findMany({ where: { workspaceId, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, include: { client: true }, orderBy: { updatedAt: "desc" } });
  return rows.map(campaignFromRow);
}

export async function getPersistedCampaign(workspaceId: string, id: string) {
  const row = await prisma.campaign.findFirst({ where: { id, workspaceId }, include: { client: true, adGroups: { include: { ads: true, keywords: true } }, ads: true, keywords: true, audiences: { include: { audience: true } }, metrics: { orderBy: { date: "asc" }, take: 90 } } });
  return row ? { campaign: campaignFromRow(row), detail: row } : null;
}

export async function createPersistedCampaign(input: { workspaceId: string; createdById: string; name: string; platform: string; objective: string; budget: number }) {
  const platform = platformMap[input.platform] || Platform.GOOGLE_ADS;
  const objective = (input.objective.toUpperCase().replace(" ", "_") as CampaignObjective) || CampaignObjective.SALES;
  const type = platform === Platform.GOOGLE_ADS ? CampaignType.SEARCH : CampaignType.SOCIAL;
  return prisma.campaign.create({ data: { workspaceId: input.workspaceId, createdById: input.createdById, name: input.name, platform, objective, type, budget: input.budget, dailyBudget: input.budget / 30 } });
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

function leadFromRow(row: { id: string; firstName: string; lastName: string; company: string | null; source: string; status: string; score: number; owner?: { firstName: string; lastName: string } | null; createdAt: Date; revenue: unknown }) : Lead {
  return { id: row.id, name: `${row.firstName} ${row.lastName}`, company: row.company || "—", source: row.source.replaceAll("_", " "), status: row.status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) as Lead["status"], score: row.score, owner: row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : "Unassigned", created: row.createdAt.toISOString(), revenue: Number(row.revenue || 0) };
}

export async function getPersistedLead(workspaceId: string, id: string) {
  const row = await prisma.lead.findFirst({ where: { id, workspaceId }, include: { owner: true, activities: { orderBy: { createdAt: "desc" }, take: 25 }, notes: { orderBy: { createdAt: "desc" }, take: 25 }, opportunities: true } });
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

export async function getPersistedIntegration(workspaceId: string, id: string) {
  const row = await prisma.integration.findFirst({ where: { id, workspaceId }, select: { id: true, workspaceId: true, clientId: true, platform: true, accountName: true, accountId: true, status: true, tokenExpiresAt: true, scopes: true, metadata: true, providerKey: true, errorMessage: true, lastSyncedAt: true, lastSyncStarted: true, lastSyncFinished: true, createdAt: true, updatedAt: true, syncLogs: { orderBy: { startedAt: "desc" }, take: 20 } } });
  return row ? { integration: integrationFromRow(row), detail: row } : null;
}

function socialStatus(status: string): SocialPost["status"] {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "DRAFT") return "Draft";
  return "In review";
}

export async function listPersistedSocialPosts(workspaceId: string, query = "") {
  const rows = await prisma.socialPost.findMany({ where: { workspaceId, ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { caption: { contains: query, mode: "insensitive" } }] } : {}) }, include: { socialAccount: true }, orderBy: { updatedAt: "desc" } });
  return rows.map((row): SocialPost => { const platform = platformName[row.socialAccount.platform] || "Google Ads"; return { id: row.id, title: row.title || row.caption?.slice(0, 60) || "Untitled post", platform: platform as SocialPost["platform"], status: socialStatus(row.status), date: (row.publishedAt || row.scheduledAt || row.createdAt).toISOString(), engagement: `${Number(row.engagementRate).toFixed(2)}%`, color: integrationColor[platform] || "#6940e8", image: row.mediaUrls[0] }; });
}

export async function listPersistedContent(workspaceId: string, query = "") {
  const rows = await prisma.content.findMany({ where: { workspaceId, ...(query ? { title: { contains: query, mode: "insensitive" } } : {}) }, include: { client: true, createdBy: true }, orderBy: { updatedAt: "desc" } });
  return rows.map((row) => ({ id: row.id, title: row.title, type: row.type, body: row.body, status: row.status, tone: row.tone, targetAudience: row.targetAudience, platform: row.platform, keywords: row.keywords, cta: row.cta, scheduledAt: row.scheduledAt, publishedAt: row.publishedAt, aiGenerated: row.aiGenerated, client: row.client ? { id: row.client.id, name: row.client.name } : null, createdBy: { id: row.createdBy.id, name: `${row.createdBy.firstName} ${row.createdBy.lastName}` }, createdAt: row.createdAt, updatedAt: row.updatedAt }));
}

export async function listPersistedInsights(workspaceId: string) {
  const rows = await prisma.aIInsight.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map((row): Insight => ({ id: row.id, category: row.type === "KEYWORD" ? "Keywords" : row.type.charAt(0) + row.type.slice(1).toLowerCase() as Insight["category"], title: row.title, description: row.description, impact: row.expectedImpact || "Review", confidence: row.confidence, tone: row.type === "BUDGET" || row.type === "KEYWORD" ? "orange" : row.type === "AUDIENCE" ? "blue" : row.type === "CONTENT" ? "purple" : "green", action: "View details" }));
}

export async function listPersistedNotifications(workspaceId: string, userId: string, unreadOnly = false) {
  return prisma.notification.findMany({ where: { workspaceId, userId, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
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
  const rows = await prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: true }, orderBy: { createdAt: "asc" } });
  return rows.map((row) => ({ id: row.id, name: `${row.user.firstName} ${row.user.lastName}`, email: row.user.email, role: row.role, status: row.status, lastLoginAt: row.user.lastLoginAt }));
}
