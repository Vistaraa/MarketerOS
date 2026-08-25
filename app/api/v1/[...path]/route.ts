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
import { validateCredentials } from "@/lib/integrations/validate";
import { paged, parseListQuery } from "@/lib/api-contracts";
import { buildPersistedOverview, parseOverviewQuery } from "@/lib/overview-service";
import { archivePersistedCampaign, connectPersistedIntegrationCredentials, createPersistedCampaign, createPersistedLead, disconnectPersistedIntegration, getPersistedCampaign, getPersistedIntegration, getPersistedLead, listPersistedAutomations, listPersistedCampaigns, listPersistedClients, listPersistedContent, listPersistedInsights, listPersistedIntegrations, listPersistedLeads, listPersistedNotifications, listPersistedReports, listPersistedSocialPosts, listPersistedTeam, searchPersisted, updatePersistedCampaignStatus } from "@/lib/repositories";

export const runtime = "nodejs";

const campaignInput = z.object({
  name: z.string().min(2),
  objective: z.string().min(2),
  platform: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  budget: z.coerce.number().positive(),
  dailyBudget: z.coerce.number().positive().optional(),
  targetRoas: z.coerce.number().positive().optional(),
  targetCpa: z.coerce.number().positive().optional(),
  biddingStrategy: z.string().optional(),
  integrationId: z.string().optional()
});

const integrationCredentialInput = z.object({
  platform: z.string().min(2),
  accountName: z.string().min(1),
  accountId: z.string().min(1),
  apiKey: z.string().min(1, "API Key / Access Token is required to authenticate with this platform."),
  metadata: z.record(z.unknown()).optional()
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
  if (path === "social/accounts") {
    const accounts = await prisma.socialAccount.findMany({ where: { workspaceId: auth.session.workspaceId }, orderBy: { createdAt: "desc" } });
    return ok({ items: accounts });
  }
  if (path.startsWith("social/accounts/")) {
    const parts = path.split("/");
    const accountId = parts[2];
    const action = parts[3];
    const account = await prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId: auth.session.workspaceId } });
    if (!account) return error("Social account not found.", 404);
    if (!account.accessTokenEncrypted) return error("No access token configured for this account.", 409);
    const { decryptSecret } = await import("@/lib/crypto");
    const accessToken = decryptSecret(account.accessTokenEncrypted);
    const igId = account.platformAccountId;
    try {
      if (action === "profile") {
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`);
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      if (action === "insights") {
        const metrics = "impressions,reach,profile_views,follower_count,phone_call_clicks,text_message_clicks,email_contacts,website_clicks";
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}/insights?metric=${metrics}&period=day&access_token=${encodeURIComponent(accessToken)}`);
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      if (action === "media") {
        const limit = url.searchParams.get("limit") || "25";
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`);
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      return error("Unknown action. Use: profile, insights, or media.", 400);
    } catch (e) {
      return error(`Instagram API failed: ${e instanceof Error ? e.message : String(e)}`, 502, "INSTAGRAM_API_FAILED");
    }
  }
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
  if (path === "settings") { const workspace = await prisma.workspace.findUnique({ where: { id: auth.session.workspaceId }, select: { id: true, name: true, slug: true, website: true, industry: true, businessType: true, description: true, country: true, currency: true, timezone: true, monthlyBudget: true, marketingGoals: true, targetAudience: true, targetAgeRange: true, targetGeo: true, targetLanguages: true, targetInterests: true, dateFormat: true, timeFormat: true, language: true, theme: true, defaultDashboard: true } }); return ok({ workspace }); }
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
    const auth = await context("social.edit"); if (auth.error) return auth.error; const parsed = socialPostInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid social post."); const account = await prisma.socialAccount.findFirst({ where: { id: parsed.data.socialAccountId, workspaceId: auth.session.workspaceId } }); if (!account) return error("Connect a social account before creating posts.", 409, "SOCIAL_ACCOUNT_REQUIRED");
    let publishedData: Record<string, unknown> | undefined;
    if (account.platform === "INSTAGRAM" && account.accessTokenEncrypted) {
      try {
        const { decryptSecret } = await import("@/lib/crypto");
        const accessToken = decryptSecret(account.accessTokenEncrypted);
        const igId = account.platformAccountId;
        const imageUrl = body?.imageUrl;
        const caption = parsed.data.caption || parsed.data.title || "";
        if (imageUrl) {
          const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }) });
          const container = await containerRes.json();
          if (container.id) {
            const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: container.id, access_token: accessToken }) });
            publishedData = await publishRes.json();
          }
        } else {
          const res = await fetch(`https://graph.facebook.com/v20.0/${igId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: caption, access_token: accessToken }) });
          publishedData = await res.json();
        }
      } catch (e) { publishedData = { error: e instanceof Error ? e.message : String(e) }; }
    }
    const created = await prisma.socialPost.create({ data: { workspaceId: auth.session.workspaceId, socialAccountId: account.id, title: parsed.data.title, caption: parsed.data.caption, contentType: parsed.data.contentType as never, scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined, status: publishedData?.id ? "PUBLISHED" : parsed.data.scheduledAt ? "SCHEDULED" : "DRAFT" } }); return ok({ ...created, published: publishedData }, undefined, { status: 201 });
  }
  if (path === "automation") {
    const auth = await context("automation.manage"); if (auth.error) return auth.error; const parsed = automationInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid automation."); const created = await prisma.automation.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, trigger: parsed.data.trigger, action: parsed.data.action, campaignId: parsed.data.campaignId, triggerConfig: parsed.data.triggerConfig as never, actionConfig: parsed.data.actionConfig as never } }); return ok(created, undefined, { status: 201 });
  }
  if (path === "integrations/connect-credentials") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = integrationCredentialInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid integration credentials.");
    const validation = await validateCredentials(parsed.data.platform, {
      apiKey: parsed.data.apiKey,
      accountId: parsed.data.accountId,
      accountName: parsed.data.accountName,
    });
    if (!validation.valid) {
      return error(validation.error || "Invalid credentials for this platform.", 422, "VALIDATION_FAILED");
    }
    const result = await connectPersistedIntegrationCredentials({
      workspaceId: auth.session.workspaceId,
      ...parsed.data,
      verifiedName: validation.verifiedName,
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CONNECT", module: "integrations", entityType: "Integration", entityId: result.id, afterData: result });
    return ok(result, undefined, { status: 200 });
  }
  if (path === "integrations/disconnect") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({ integrationId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("Integration ID is required.");
    await disconnectPersistedIntegration(auth.session.workspaceId, parsed.data.integrationId);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DISCONNECT", module: "integrations", entityType: "Integration", entityId: parsed.data.integrationId });
    return ok({ success: true, message: "Integration disconnected." });
  }
  if (path === "campaigns") {
    const parsed = campaignInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid campaign.");

    // Check if platform(s) are connected in Integrations
    const platformMap: Record<string, string> = {
      "Google Ads": "GOOGLE_ADS",
      "Google Analytics": "GOOGLE_ANALYTICS",
      "GA4": "GOOGLE_ANALYTICS",
      "Google Search Console": "GOOGLE_SEARCH_CONSOLE",
      "Search Console": "GOOGLE_SEARCH_CONSOLE",
      "YouTube": "YOUTUBE",
      "Google Business Profile": "GOOGLE_BUSINESS_PROFILE",
      "Firebase": "FIREBASE_ADMOB",
      "AdMob": "FIREBASE_ADMOB",
      "Meta Ads": "META_ADS",
      Meta: "META_ADS",
      Instagram: "INSTAGRAM",
      Facebook: "FACEBOOK",
      Messenger: "MESSENGER",
      "Facebook Messenger": "MESSENGER",
      WhatsApp: "WHATSAPP",
      "WhatsApp Business": "WHATSAPP",
      LinkedIn: "LINKEDIN",
      TikTok: "TIKTOK",
      Shopify: "SHOPIFY"
    };

    const platformList: string[] = parsed.data.platforms && parsed.data.platforms.length > 0
      ? parsed.data.platforms
      : parsed.data.platform
      ? [parsed.data.platform]
      : [];

    if (platformList.length === 0) {
      return error("Please select at least one connected marketing platform.", 400, "NO_PLATFORM_SELECTED");
    }

    const matchedIntegrations = await prisma.integration.findMany({
      where: {
        workspaceId: auth.session.workspaceId,
        status: "CONNECTED"
      }
    });

    for (const plat of platformList) {
      const pEnum = platformMap[plat] || plat.toUpperCase().replace(/\s+/g, "_");
      const found = matchedIntegrations.find((intg) => intg.platform === pEnum || intg.platform === plat);
      if (!found) {
        return error(`The platform "${plat}" is not connected. Please connect it in Integrations before creating a campaign.`, 400, "PLATFORM_NOT_CONNECTED");
      }
    }

    const primaryPlatform = platformList[0];
    const primaryIntegration = matchedIntegrations.find((intg) => {
      const pEnum = platformMap[primaryPlatform] || primaryPlatform.toUpperCase().replace(/\s+/g, "_");
      return intg.platform === pEnum || intg.platform === primaryPlatform;
    });

    try {
      const created = await createPersistedCampaign({
        workspaceId: auth.session.workspaceId,
        createdById: auth.session.userId,
        integrationId: primaryIntegration?.id,
        ...parsed.data,
        platform: primaryPlatform,
        metadata: {
          selectedPlatforms: platformList,
          integrationIds: matchedIntegrations.map((m) => m.id)
        }
      });
      await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "campaigns", entityType: "Campaign", entityId: created.id, afterData: created });
      return ok(created, undefined, { status: 201 });
    } catch (err) {
      return error(err instanceof Error ? err.message : "Failed to create campaign record.", 400, "CAMPAIGN_CREATE_ERROR");
    }
  }
  if (path === "leads") {
    const parsed = leadInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid lead.");
    const created = await createPersistedLead({ workspaceId: auth.session.workspaceId, ...parsed.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "leads", entityType: "Lead", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  if (path.startsWith("integrations/") && path.endsWith("/sync")) { const integrationId = path.split("/")[1]; const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId: auth.session.workspaceId } }); if (!integration) return error("Integration not found.", 404); if (!integration.accessTokenEncrypted && !integration.apiKeyEncrypted) return error("This integration is not connected. Configure credentials before syncing.", 409, "INTEGRATION_NOT_CONNECTED"); const job = await enqueueJob("integration.sync", { workspaceId: auth.session.workspaceId, integrationId }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SYNC_REQUESTED", module: "integrations", entityType: "Integration", entityId: integrationId }); return ok({ status: "queued", jobId: job.id, message: "Sync queued for background processing." }, undefined, { status: 202 }); }
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
  if (path === "settings") {
    const settings = z.object({
      name: z.string().min(2).optional(),
      website: z.string().url().optional().or(z.literal("")),
      industry: z.string().optional(),
      businessType: z.string().optional(),
      description: z.string().optional(),
      country: z.string().optional(),
      currency: z.string().min(2).max(10).optional(),
      timezone: z.string().optional(),
      monthlyBudget: z.coerce.number().nonnegative().optional(),
      marketingGoals: z.array(z.string()).optional(),
      targetAudience: z.string().optional(),
      targetAgeRange: z.string().optional(),
      targetGeo: z.string().optional(),
      targetLanguages: z.string().optional(),
      targetInterests: z.string().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      language: z.string().optional(),
      theme: z.string().optional(),
      defaultDashboard: z.string().optional()
    }).safeParse(body);
    if (!settings.success) return error(settings.error.issues[0]?.message || "Invalid settings.");
    const updated = await prisma.workspace.update({ where: { id: auth.session.workspaceId }, data: settings.data });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "settings", entityType: "Workspace", entityId: updated.id, afterData: settings.data });
    return ok(updated);
  }
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
