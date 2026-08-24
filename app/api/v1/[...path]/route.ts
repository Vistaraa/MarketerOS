import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, requireTenant } from "@/lib/auth-server";
import { generateInsight, generateText } from "@/lib/ai";
import { billingProvider } from "@/lib/billing";
import { encryptSecret } from "@/lib/crypto";
import { consumeOAuthState, createOAuthState } from "@/lib/oauth";
import { getProvider, providerKeyForPlatform, providerConfiguration, type ProviderKey } from "@/lib/integrations/provider";
import { recordAudit } from "@/lib/audit";
import { enqueueJob } from "@/lib/jobs";
import { paged, parseListQuery } from "@/lib/api-contracts";
import { buildPersistedOverview, parseOverviewQuery } from "@/lib/overview-service";
import { archivePersistedCampaign, createPersistedCampaign, createPersistedLead, getPersistedCampaign, getPersistedIntegration, getPersistedLead, listPersistedAutomations, listPersistedCampaigns, listPersistedClients, listPersistedContent, listPersistedInsights, listPersistedIntegrations, listPersistedLeads, listPersistedNotifications, listPersistedReports, listPersistedSocialPosts, listPersistedTeam, searchPersisted, updatePersistedCampaignStatus } from "@/lib/repositories";

export const runtime = "nodejs";

const campaignInput = z.object({
  name: z.string().min(2),
  objective: z.string().min(2),
  platform: z.string().min(2),
  budget: z.coerce.number().positive()
});

const leadInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  source: z.string().optional()
});
const aiInput = z.object({ prompt: z.string().min(3).max(20000), kind: z.string().min(2).max(80).default("content") });
const contentInput = z.object({ title: z.string().min(1), type: z.string().default("SOCIAL_POST"), body: z.string().optional(), platform: z.string().optional(), clientId: z.string().optional() });
const socialPostInput = z.object({ socialAccountId: z.string().min(1), title: z.string().optional(), caption: z.string().optional(), contentType: z.string().default("SOCIAL_POST"), scheduledAt: z.string().datetime().optional() });
const reportInput = z.object({ name: z.string().min(1), clientId: z.string().optional(), format: z.string().default("PDF"), configuration: z.record(z.unknown()).optional() });
const automationInput = z.object({ name: z.string().min(1), trigger: z.string().min(1), action: z.string().min(1), campaignId: z.string().optional(), triggerConfig: z.record(z.unknown()).optional(), actionConfig: z.record(z.unknown()).optional() });
const clientInput = z.object({ name: z.string().min(2), industry: z.string().optional(), website: z.string().url().optional().or(z.literal("")) });

function ok(data: unknown, meta?: Record<string, unknown>, init?: ResponseInit) { return NextResponse.json({ data, ...(meta ? { meta } : {}) }, init); }
function error(message: string, status = 400, code = "BAD_REQUEST") { return NextResponse.json({ error: { code, message } }, { status }); }

async function context(permission = "analytics.view") {
  try {
    const session = await requireTenant();
    if (!can(session.role, permission)) return { error: error("You do not have permission to perform this action.", 403) };
    return { session };
  } catch { return { error: error("Authentication required.", 401) }; }
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = new URL(request.url);
  if (path === "integrations/oauth/callback") {
    const stateValue = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!stateValue || !code) return error("OAuth callback is missing state or authorization code.", 400, "INVALID_OAUTH_CALLBACK");
    const state = await consumeOAuthState(stateValue);
    if (!state) return error("This OAuth state is expired or has already been used.", 400, "INVALID_OAUTH_STATE");
    try {
      const redirectUri = state.providerKey.startsWith("google_") ? process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/v1/integrations/oauth/callback` : process.env.META_OAUTH_REDIRECT_URI || `${url.origin}/api/v1/integrations/oauth/callback`;
      const provider = getProvider(state.providerKey as ProviderKey);
      const token = await provider.exchangeCode(code, redirectUri);
      const accounts = await provider.listAccounts(token.accessToken);
      const integrationId = state.returnTo?.match(/^\/integrations\/([^/?]+)/)?.[1];
      const account = accounts[0];
      if (!account) throw new Error("The provider returned no accessible account.");
      const data = { accessTokenEncrypted: encryptSecret(token.accessToken), refreshTokenEncrypted: token.refreshToken ? encryptSecret(token.refreshToken) : undefined, tokenExpiresAt: token.expiresAt, scopes: token.scopes, accountId: account.id, accountName: account.name, status: "CONNECTED" as const, errorMessage: null, lastSyncedAt: null };
      if (integrationId) await prisma.integration.updateMany({ where: { id: integrationId, workspaceId: state.workspaceId }, data });
      else await prisma.integration.create({ data: { workspaceId: state.workspaceId, platform: account.platform === "Google Ads" ? "GOOGLE_ADS" : account.platform === "Meta Ads" ? "META_ADS" : account.platform === "Instagram" ? "INSTAGRAM" : account.platform === "Facebook" ? "FACEBOOK" : account.platform === "YouTube" ? "YOUTUBE" : "OTHER", providerKey: state.providerKey, ...data } });
      const returnTo = state.returnTo?.startsWith("/") ? state.returnTo : "/integrations";
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=true`, url.origin));
    } catch (cause) {
      const returnTo = state.returnTo?.startsWith("/") ? state.returnTo : "/integrations";
      const message = cause instanceof Error ? cause.message : "Provider connection failed.";
      return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`, url.origin));
    }
  }
  const auth = await context();
  if (auth.error) return auth.error;
  const listQuery = parseListQuery(request);
  const query = (listQuery.search || listQuery.q).toLowerCase();
  if (path === "overview" || path === "analytics/overview") {
    const parsed = parseOverviewQuery(request);
    if (!parsed.success) return error(parsed.message, 400, "INVALID_OVERVIEW_QUERY");
    const data = await buildPersistedOverview(auth.session.workspaceId, parsed.data);
    return ok(data);
  }
  if (path === "campaigns") { const source = (await listPersistedCampaigns(auth.session.workspaceId, query)).filter((item) => (!listQuery.status || item.status.toLowerCase() === listQuery.status.toLowerCase()) && (!listQuery.platform || item.platform.toLowerCase() === listQuery.platform.toLowerCase())); const result = paged(source, listQuery); return ok({ items: result.items, total: result.total }, { page: listQuery.page, pageSize: listQuery.pageSize, total: result.total }); }
  if (path.startsWith("campaigns/")) {
    const id = path.split("/")[1];
    const found = await getPersistedCampaign(auth.session.workspaceId, id);
    return found ? ok(found) : error("Campaign not found.", 404);
  }
  if (path === "leads") { const source = (await listPersistedLeads(auth.session.workspaceId, query)).filter((item) => !listQuery.status || item.status.toLowerCase() === listQuery.status.toLowerCase()); const result = paged(source, listQuery); return ok({ items: result.items, total: result.total }, { page: listQuery.page, pageSize: listQuery.pageSize, total: result.total }); }
  if (path.startsWith("leads/")) {
    const id = path.split("/")[1];
    const found = await getPersistedLead(auth.session.workspaceId, id);
    return found ? ok(found) : error("Lead not found.", 404);
  }
  if (path === "integrations") return ok({ items: await listPersistedIntegrations(auth.session.workspaceId), syncHistory: await prisma.integrationSyncLog.findMany({ where: { integration: { workspaceId: auth.session.workspaceId } }, orderBy: { startedAt: "desc" }, take: 50 }) });
  if (path.startsWith("integrations/")) { const found = await getPersistedIntegration(auth.session.workspaceId, path.split("/")[1]); return found ? ok(found) : error("Integration not found.", 404); }
  if (path === "social/posts") return ok({ items: await listPersistedSocialPosts(auth.session.workspaceId, query) });
  if (path === "content") return ok({ items: await listPersistedContent(auth.session.workspaceId, query) });
  if (path === "ai/insights") return ok({ items: await listPersistedInsights(auth.session.workspaceId) });
  if (path === "notifications") {
    const items = await listPersistedNotifications(auth.session.workspaceId, auth.session.userId, url.searchParams.get("unread") === "true");
    return ok({ items: items.map((item) => ({ id: item.id, title: item.title, message: item.message, read: Boolean(item.readAt), link: item.link, createdAt: item.createdAt })) });
  }
  if (path === "reports") return ok({ items: await listPersistedReports(auth.session.workspaceId), filters: listQuery });
  if (path === "clients") return ok({ items: await listPersistedClients(auth.session.workspaceId), filters: listQuery });
  if (path === "automation") return ok({ items: await listPersistedAutomations(auth.session.workspaceId), filters: listQuery });
  if (path === "billing") { const subscription = await prisma.subscription.findUnique({ where: { workspaceId: auth.session.workspaceId }, include: { plan: true } }); const plans = await prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } }); const invoices = await prisma.invoice.findMany({ where: { workspaceId: auth.session.workspaceId }, orderBy: { invoiceDate: "desc" }, take: 50 }); return ok({ subscription: subscription ? { id: subscription.id, status: subscription.status, interval: subscription.billingInterval, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, currentPeriodEnd: subscription.currentPeriodEnd, plan: { id: subscription.plan.id, name: subscription.plan.name, monthlyPrice: Number(subscription.plan.monthlyPrice), yearlyPrice: Number(subscription.plan.yearlyPrice) } } : null, plans: plans.map((plan) => ({ id: plan.slug, name: plan.name, monthlyPrice: Number(plan.monthlyPrice), yearlyPrice: Number(plan.yearlyPrice), features: plan.features })), invoices }); }
  if (path === "team") return ok({ items: await listPersistedTeam(auth.session.workspaceId), filters: listQuery });
  if (path === "settings") { const workspace = await prisma.workspace.findUnique({ where: { id: auth.session.workspaceId }, select: { id: true, name: true, slug: true, website: true, industry: true, businessType: true, description: true, country: true, currency: true, timezone: true, monthlyBudget: true, dateFormat: true, timeFormat: true, language: true, theme: true, defaultDashboard: true } }); return ok({ workspace }); }
  if (["analytics", "ad-manager", "social-media"].includes(path)) return ok({ items: [], filters: listQuery });
  if (path === "search") {
    const items = await searchPersisted(auth.session.workspaceId, query);
    return ok({ items }, { page: listQuery.page, pageSize: listQuery.pageSize, total: items.length });
  }
  return error("Resource not found.", 404);
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const permission = path === "campaigns" || path === "leads" ? "campaign.edit" : path.startsWith("notifications") || path === "ai/insights/generate" ? "analytics.view" : path === "ai/generate" || path === "content" ? "content.edit" : path === "social/posts" ? "social.edit" : path === "reports" ? "report.edit" : path === "automation" ? "automation.manage" : path === "clients" ? "client.edit" : path.startsWith("billing/") ? "billing.manage" : "settings.manage";
  const auth = await context(permission);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (path === "notifications/read-all") { await prisma.notification.updateMany({ where: { workspaceId: auth.session.workspaceId, userId: auth.session.userId, readAt: null }, data: { readAt: new Date() } }); return ok({ updated: true }); }
  if (path.match(/^integrations\/[^/]+\/connect$/)) {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const integrationId = path.split("/")[1];
    const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId: auth.session.workspaceId } });
    if (!integration) return error("Integration not found.", 404);
    const providerKey = (integration.providerKey || providerKeyForPlatform(integration.platform as never)) as ProviderKey;
    const config = providerConfiguration(providerKey);
    if (!config.configured) return error(`Provider configuration required: ${config.missing.join(", ")}.`, 409, "PROVIDER_NOT_CONFIGURED");
    const redirectUri = providerKey.startsWith("google_") ? process.env.GOOGLE_OAUTH_REDIRECT_URI || `${new URL(request.url).origin}/api/v1/integrations/oauth/callback` : process.env.META_OAUTH_REDIRECT_URI || `${new URL(request.url).origin}/api/v1/integrations/oauth/callback`;
    const state = await createOAuthState({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, providerKey, returnTo: `/integrations/${integrationId}` });
    return ok({ authorizationUrl: getProvider(providerKey).getAuthorizationUrl(state, redirectUri), providerKey });
  }
  if (path === "ai/generate") {
    const auth = await context("content.edit");
    if (auth.error) return auth.error;
    const parsed = aiInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid AI request.");
    try { return ok(await generateText({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, kind: parsed.data.kind, prompt: parsed.data.prompt }), undefined, { status: 201 }); } catch (cause) { return error(cause instanceof Error ? cause.message : "AI generation failed.", 503, "PROVIDER_NOT_CONFIGURED"); }
  }
  if (path === "ai/insights/generate") {
    const auth = await context("analytics.view");
    if (auth.error) return auth.error;
    const parsed = z.object({ context: z.string().min(3).max(20000) }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid insight context.");
    try { return ok(await generateInsight({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, context: parsed.data.context }), undefined, { status: 201 }); } catch (cause) { return error(cause instanceof Error ? cause.message : "AI insight generation failed.", 503, "PROVIDER_NOT_CONFIGURED"); }
  }
  if (path === "billing/checkout") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({ planId: z.string().min(1), interval: z.enum(["monthly", "yearly"]) }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid billing checkout request.");
    try {
      const subscription = await prisma.subscription.findUnique({ where: { workspaceId: auth.session.workspaceId } });
      let customerId = subscription?.externalCustomerId;
      if (!customerId) { customerId = (await billingProvider.createCustomer({ workspaceId: auth.session.workspaceId, email: auth.session.email })).customerId; if (subscription) await prisma.subscription.update({ where: { workspaceId: auth.session.workspaceId }, data: { externalCustomerId: customerId } }); }
      return ok(await billingProvider.createCheckout({ customerId, workspaceId: auth.session.workspaceId, planId: parsed.data.planId, interval: parsed.data.interval, returnUrl: new URL(request.url).origin + "/billing" }), undefined, { status: 201 });
    } catch (cause) { return error(cause instanceof Error ? cause.message : "Billing is not configured.", 503, "BILLING_NOT_CONFIGURED"); }
  }
  if (path === "billing/portal") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const subscription = await prisma.subscription.findUnique({ where: { workspaceId: auth.session.workspaceId } });
    if (!subscription?.externalCustomerId) return error("No Stripe customer is associated with this workspace.", 409, "BILLING_CUSTOMER_REQUIRED");
    try { return ok(await billingProvider.createPortal({ customerId: subscription.externalCustomerId, returnUrl: new URL(request.url).origin + "/billing" })); } catch (cause) { return error(cause instanceof Error ? cause.message : "Billing portal is not configured.", 503, "BILLING_NOT_CONFIGURED"); }
  }
  if (path === "billing/cancel") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const subscription = await prisma.subscription.findUnique({ where: { workspaceId: auth.session.workspaceId } });
    if (!subscription?.externalSubscriptionId) return error("No active Stripe subscription is associated with this workspace.", 409, "BILLING_SUBSCRIPTION_REQUIRED");
    try { await billingProvider.cancelSubscription(subscription.externalSubscriptionId); await prisma.subscription.update({ where: { workspaceId: auth.session.workspaceId }, data: { cancelAtPeriodEnd: true } }); return ok({ cancelAtPeriodEnd: true }); } catch (cause) { return error(cause instanceof Error ? cause.message : "Unable to cancel the subscription.", 503, "BILLING_NOT_CONFIGURED"); }
  }
  if (path === "content") {
    const auth = await context("content.edit"); if (auth.error) return auth.error; const parsed = contentInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid content."); const created = await prisma.content.create({ data: { workspaceId: auth.session.workspaceId, createdById: auth.session.userId, title: parsed.data.title, type: parsed.data.type as never, body: parsed.data.body, platform: parsed.data.platform ? parsed.data.platform.replaceAll(" ", "_").toUpperCase() as never : undefined, clientId: parsed.data.clientId } }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "content", entityType: "Content", entityId: created.id, afterData: created }); return ok(created, undefined, { status: 201 });
  }
  if (path === "clients") {
    const auth = await context("client.edit"); if (auth.error) return auth.error; const parsed = clientInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid client."); const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`; const created = await prisma.client.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, slug, industry: parsed.data.industry, website: parsed.data.website || undefined } }); return ok(created, undefined, { status: 201 });
  }
  if (path === "social/posts") {
    const auth = await context("social.edit"); if (auth.error) return auth.error; const parsed = socialPostInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid social post."); const account = await prisma.socialAccount.findFirst({ where: { id: parsed.data.socialAccountId, workspaceId: auth.session.workspaceId } }); if (!account) return error("Connect a social account before creating posts.", 409, "SOCIAL_ACCOUNT_REQUIRED"); const created = await prisma.socialPost.create({ data: { workspaceId: auth.session.workspaceId, socialAccountId: account.id, title: parsed.data.title, caption: parsed.data.caption, contentType: parsed.data.contentType as never, scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined, status: parsed.data.scheduledAt ? "SCHEDULED" : "DRAFT" } }); return ok(created, undefined, { status: 201 });
  }
  if (path === "automation") {
    const auth = await context("automation.manage"); if (auth.error) return auth.error; const parsed = automationInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid automation."); const created = await prisma.automation.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, trigger: parsed.data.trigger, action: parsed.data.action, campaignId: parsed.data.campaignId, triggerConfig: parsed.data.triggerConfig as never, actionConfig: parsed.data.actionConfig as never } }); return ok(created, undefined, { status: 201 });
  }
  if (path === "campaigns") {
    const parsed = campaignInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid campaign.");
    const created = await createPersistedCampaign({ workspaceId: auth.session.workspaceId, createdById: auth.session.userId, ...parsed.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "campaigns", entityType: "Campaign", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  if (path === "leads") {
    const parsed = leadInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid lead.");
    const created = await createPersistedLead({ workspaceId: auth.session.workspaceId, ...parsed.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "leads", entityType: "Lead", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  if (path.startsWith("integrations/") && path.endsWith("/sync")) { const integrationId = path.split("/")[1]; const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId: auth.session.workspaceId } }); if (!integration) return error("Integration not found.", 404); if (!integration.accessTokenEncrypted) return error("This integration is not connected. Configure OAuth before syncing.", 409, "INTEGRATION_NOT_CONNECTED"); const job = await enqueueJob("integration.sync", { workspaceId: auth.session.workspaceId, integrationId }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SYNC_REQUESTED", module: "integrations", entityType: "Integration", entityId: integrationId }); return ok({ status: "queued", jobId: job.id, message: "Sync queued for background processing." }, undefined, { status: 202 }); }
  if (path === "reports") { const parsed = reportInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid report."); const report = await prisma.report.create({ data: { workspaceId: auth.session.workspaceId, createdById: auth.session.userId, name: parsed.data.name, clientId: parsed.data.clientId, format: parsed.data.format as never, configuration: parsed.data.configuration as never, status: "GENERATING" } }); const job = await enqueueJob("report.generate", { workspaceId: auth.session.workspaceId, reportId: report.id, runAt: new Date().toISOString() }); return ok({ ...report, jobId: job.id }, undefined, { status: 202 }); }
  return error("Action not found.", 404);
}

export async function PATCH(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const auth = await context(path.startsWith("notifications") ? "analytics.view" : path === "settings" ? "settings.manage" : path.startsWith("content/") ? "content.edit" : path.startsWith("social/posts/") ? "social.edit" : "campaign.edit");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null) as { status?: string; [key: string]: unknown } | null;
  if (path.startsWith("notifications/")) { const id = path.split("/")[1]; const updated = await prisma.notification.updateMany({ where: { id, workspaceId: auth.session.workspaceId, userId: auth.session.userId }, data: { readAt: new Date() } }); return updated.count ? ok({ id, read: true }) : error("Notification not found.", 404); }
  if (path.startsWith("leads/")) { const id = path.split("/")[1]; if (!body?.status) return error("A lead status is required."); const updated = await prisma.lead.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { status: body.status.toUpperCase().replaceAll(" ", "_") as never } }); if (!updated.count) return error("Lead not found.", 404); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "leads", entityType: "Lead", entityId: id, afterData: { status: body.status } }); return ok({ id, status: body.status }); }
  if (path.startsWith("content/")) { const id = path.split("/")[1]; const updated = await prisma.content.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { ...(body?.status ? { status: body.status as never } : {}) } }); return updated.count ? ok({ id, status: body?.status }) : error("Content not found.", 404); }
  if (path.startsWith("social/posts/")) { const id = path.split("/")[2]; const updated = await prisma.socialPost.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { ...(body?.status ? { status: body.status as never } : {}) } }); return updated.count ? ok({ id, status: body?.status }) : error("Social post not found.", 404); }
  if (path === "settings") { const settings = z.object({ name: z.string().min(2).optional(), website: z.string().url().optional().or(z.literal("")), industry: z.string().optional(), businessType: z.string().optional(), description: z.string().optional(), country: z.string().optional(), currency: z.string().length(3).optional(), timezone: z.string().optional(), monthlyBudget: z.coerce.number().nonnegative().optional(), dateFormat: z.string().optional(), timeFormat: z.string().optional(), language: z.string().optional(), theme: z.string().optional(), defaultDashboard: z.string().optional() }).safeParse(body); if (!settings.success) return error(settings.error.issues[0]?.message || "Invalid settings."); const updated = await prisma.workspace.update({ where: { id: auth.session.workspaceId }, data: settings.data }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "settings", entityType: "Workspace", entityId: updated.id, afterData: settings.data }); return ok(updated); }
  if (path.startsWith("campaigns/")) {
    const id = path.split("/")[1];
    if (!body?.status) return error("A campaign status is required.");
    const updated = await updatePersistedCampaignStatus(auth.session.workspaceId, id, body.status);
    if (!updated) return error("Campaign not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "campaigns", entityType: "Campaign", entityId: id, afterData: { status: body.status } });
    return ok({ id, status: body.status });
  }
  return error("Action not found.", 404);
}

export async function DELETE(request: Request, { params }: { params: { path: string[] } }) {
  const auth = await context("campaign.delete");
  if (auth.error) return auth.error;
  const id = params.path[1];
  const archived = await archivePersistedCampaign(auth.session.workspaceId, id);
  if (!archived) return error("Campaign not found.", 404);
  await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SOFT_DELETE", module: "campaigns", entityType: "Campaign", entityId: id });
  return ok({ deleted: id, softDeleted: true });
}
