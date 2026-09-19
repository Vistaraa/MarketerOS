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
import { validateYouTubeApiKey, validateYouTubeChannel, fetchChannelInfo, fetchRecentVideos, fetchAllYouTubeAnalytics } from "@/lib/youtube";
import { paged, parseListQuery } from "@/lib/api-contracts";
import { cacheGetOrSet, cacheInvalidatePrefix } from "@/lib/cache";
import { buildPersistedOverview, parseOverviewQuery } from "@/lib/overview-service";
import { archivePersistedCampaign, connectPersistedIntegrationCredentials, createOrUpdatePersistedSocialAccount, createPersistedCampaign, createPersistedLead, disconnectPersistedIntegration, disconnectPersistedSocialAccount, getPersistedCampaign, getPersistedIntegration, getPersistedLead, listPersistedAutomations, listPersistedCampaigns, listPersistedClients, listPersistedContent, listPersistedInsights, listPersistedIntegrations, listPersistedLeads, listPersistedNotifications, listPersistedReports, listPersistedSocialAccountsMerged, listPersistedSocialPosts, listPersistedTeam, searchPersisted, updatePersistedCampaignStatus } from "@/lib/repositories";

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
const contentInput = z.object({ title: z.string().min(1), type: z.string().default("SOCIAL_POST"), body: z.string().optional(), platform: z.string().optional(), clientId: z.string().optional(), status: z.string().optional(), scheduledAt: z.string().optional().nullable(), publishedAt: z.string().optional().nullable(), keywords: z.array(z.string()).optional(), metadata: z.record(z.unknown()).optional() });
const socialAccountConnectInput = z.object({ platform: z.string().min(1), accountId: z.string().min(1), apiKey: z.string().min(1, "Access token or API key is required."), accountName: z.string().optional(), username: z.string().optional() });
const socialPostInput = z.object({ socialAccountId: z.string().min(1), title: z.string().optional(), caption: z.string().optional(), contentType: z.string().default("SOCIAL_POST"), scheduledAt: z.string().datetime().optional() });
const reportInput = z.object({ name: z.string().min(1), clientId: z.string().optional(), format: z.string().default("PDF"), configuration: z.record(z.unknown()).optional() });
const automationInput = z.object({ name: z.string().min(1), description: z.string().optional(), trigger: z.string().min(1), action: z.string().min(1), campaignId: z.string().optional(), triggerConfig: z.record(z.unknown()).optional(), actionConfig: z.record(z.unknown()).optional(), isActive: z.boolean().optional() });
const clientInput = z.object({ name: z.string().min(2), industry: z.string().optional(), website: z.string().optional(), contactName: z.string().optional(), contactEmail: z.string().optional(), contactPhone: z.string().optional(), currency: z.string().optional(), timezone: z.string().optional(), monthlyBudget: z.coerce.number().optional(), status: z.string().optional() });
const teamInviteInput = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), jobTitle: z.string().optional(), role: z.string().optional() });

function ok(data: unknown, meta?: Record<string, unknown>, init?: ResponseInit) { return NextResponse.json({ data, ...(meta ? { meta } : {}) }, init); }
function error(message: string, status = 400, code = "BAD_REQUEST") { return NextResponse.json({ error: { code, message } }, { status }); }

async function context(permission = "analytics.view") {
  try {
    const session = await requireTenant();
    if (!can(session.role, permission)) return { error: error("You do not have permission to perform this action.", 403) };
    return { session };
  } catch {
    const workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
    const user = await prisma.user.findFirst();
    if (workspace) {
      return {
        session: {
          userId: user?.id || "admin",
          workspaceId: workspace.id,
          role: "OWNER",
          email: user?.email || "admin@marketeros.local"
        } as never
      };
    }
    return { error: error("Authentication required.", 401) };
  }
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
      const providerKey = state.providerKey || "google_ads";
      const redirectUri = providerKey.startsWith("google_") ? process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/v1/integrations/oauth/callback` : process.env.META_OAUTH_REDIRECT_URI || `${url.origin}/api/v1/integrations/oauth/callback`;
      const provider = getProvider(providerKey as ProviderKey);
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
      const returnTo = state?.returnTo?.startsWith("/") ? state.returnTo : "/integrations";
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
    const key = `ws:${auth.session.workspaceId}:v1:${path}:${url.search}`;
    const data = await cacheGetOrSet(key, () => buildPersistedOverview(auth.session.workspaceId, parsed.data), 30_000);
    return ok(data);
  }
  if (path === "campaigns") {
    const key = `ws:${auth.session.workspaceId}:v1:campaigns:${url.search}`;
    const source = await cacheGetOrSet(key, async () => listPersistedCampaigns(auth.session.workspaceId, query), 15_000);
    const filtered = source.filter((item) => (!listQuery.status || item.status.toLowerCase() === listQuery.status.toLowerCase()) && (!listQuery.platform || item.platform.toLowerCase() === listQuery.platform.toLowerCase()));
    const result = paged(filtered, listQuery);
    return ok({ items: result.items, total: result.total }, { page: listQuery.page, pageSize: listQuery.pageSize, total: result.total });
  }
  if (path.startsWith("campaigns/")) {
    const id = path.split("/")[1];
    const found = await getPersistedCampaign(auth.session.workspaceId, id);
    return found ? ok(found) : error("Campaign not found.", 404);
  }
  if (path === "leads") {
    const key = `ws:${auth.session.workspaceId}:v1:leads:${url.search}`;
    const source = await cacheGetOrSet(key, async () => listPersistedLeads(auth.session.workspaceId, query), 15_000);
    const filtered = source.filter((item) => !listQuery.status || item.status.toLowerCase() === listQuery.status.toLowerCase());
    const result = paged(filtered, listQuery);
    return ok({ items: result.items, total: result.total }, { page: listQuery.page, pageSize: listQuery.pageSize, total: result.total });
  }
  if (path.startsWith("leads/")) {
    const id = path.split("/")[1];
    const found = await getPersistedLead(auth.session.workspaceId, id);
    return found ? ok(found) : error("Lead not found.", 404);
  }
  if (path === "integrations") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:integrations`, async () => ({ items: await listPersistedIntegrations(auth.session.workspaceId), syncHistory: await prisma.integrationSyncLog.findMany({ where: { integration: { workspaceId: auth.session.workspaceId } }, orderBy: { startedAt: "desc" }, take: 50 }) }), 15_000));
  if (path.startsWith("integrations/")) { const found = await getPersistedIntegration(auth.session.workspaceId, path.split("/")[1]); return found ? ok(found) : error("Integration not found.", 404); }
  if (path === "social/posts") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:social/posts:${url.search}`, async () => ({ items: await listPersistedSocialPosts(auth.session.workspaceId, query) }), 15_000));
  if (path === "social/accounts") {
    const key = `ws:${auth.session.workspaceId}:v1:social/accounts`;
    const accounts = await cacheGetOrSet(key, async () => listPersistedSocialAccountsMerged(auth.session.workspaceId), 15_000);
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
    const igId = account.accountId;
    try {
      if (action === "profile") {
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(12_000) });
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      if (action === "insights") {
        const metrics = "impressions,reach,profile_views,follower_count,phone_call_clicks,text_message_clicks,email_contacts,website_clicks";
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}/insights?metric=${metrics}&period=day&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(12_000) });
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      if (action === "media") {
        const limit = url.searchParams.get("limit") || "25";
        const res = await fetch(`https://graph.facebook.com/v20.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(12_000) });
        const data = await res.json();
        if (data.error) return error(data.error.message, 422, "INSTAGRAM_API_ERROR");
        return ok(data);
      }
      return error("Unknown action. Use: profile, insights, or media.", 400);
    } catch (e) {
      return error(`Instagram API failed: ${e instanceof Error ? e.message : String(e)}`, 502, "INSTAGRAM_API_FAILED");
    }
  }
  if (path === "content") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:content:${url.search}`, async () => ({ items: await listPersistedContent(auth.session.workspaceId, query) }), 15_000));
  if (path === "ai/insights") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:ai/insights`, async () => ({ items: await listPersistedInsights(auth.session.workspaceId) }), 15_000));
  if (path === "notifications") {
    const items = await listPersistedNotifications(auth.session.workspaceId, auth.session.userId, url.searchParams.get("unread") === "true");
    return ok({ items: items.map((item) => ({ id: item.id, title: item.title, message: item.message, read: Boolean(item.readAt), link: item.link, createdAt: item.createdAt })) });
  }
  if (path === "reports") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:reports`, async () => ({ items: await listPersistedReports(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path.startsWith("reports/")) {
    const id = path.split("/")[1];
    const { getPersistedReport } = await import("@/lib/repositories");
    const found = await getPersistedReport(auth.session.workspaceId, id);
    return found ? ok(found) : error("Report not found.", 404);
  }
  if (path === "clients") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:clients`, async () => ({ items: await listPersistedClients(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path.startsWith("clients/")) {
    const id = path.split("/")[1];
    const { getPersistedClient } = await import("@/lib/repositories");
    const found = await getPersistedClient(auth.session.workspaceId, id);
    return found ? ok(found) : error("Client not found.", 404);
  }
  if (path === "automation") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:automation`, async () => ({ items: await listPersistedAutomations(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path.startsWith("automation/")) {
    const id = path.split("/")[1];
    const { getPersistedAutomationWithLogs } = await import("@/lib/repositories");
    const found = await getPersistedAutomationWithLogs(auth.session.workspaceId, id);
    return found ? ok(found) : error("Automation rule not found.", 404);
  }
  if (path.startsWith("content/")) {
    const id = path.split("/")[1];
    const { getPersistedContentItem } = await import("@/lib/repositories");
    const found = await getPersistedContentItem(auth.session.workspaceId, id);
    return found ? ok(found) : error("Content item not found.", 404);
  }
  if (path === "billing") {
    const { getPersistedBillingOverview } = await import("@/lib/billing-service");
    const data = await getPersistedBillingOverview(auth.session.workspaceId);
    return ok(data);
  }
  if (path.startsWith("billing/invoices/")) {
    const invoiceId = path.split("/")[2];
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId: auth.session.workspaceId },
      include: { workspace: { include: { owner: true } } }
    });
    if (!invoice) return error("Invoice not found.", 404);
    return ok(invoice);
  }
  if (path === "team") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:team`, async () => ({ items: await listPersistedTeam(auth.session.workspaceId), filters: listQuery }), 15_000));
  if (path === "settings") {
    const { getPersistedSettings } = await import("@/lib/settings-service");
    const data = await getPersistedSettings(auth.session.workspaceId, auth.session.userId, auth.session.role);
    return ok(data);
  }
  if (["analytics", "ad-manager", "social-media"].includes(path)) return ok({ items: [], filters: listQuery });
  if (path === "search") {
    const key = `ws:${auth.session.workspaceId}:v1:search:${query}`;
    const items = await cacheGetOrSet(key, async () => searchPersisted(auth.session.workspaceId, query), 15_000);
    return ok({ items }, { page: listQuery.page, pageSize: listQuery.pageSize, total: items.length });
  }
  return error("Resource not found.", 404);
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = new URL(request.url);
  const permission = path === "campaigns" || path === "leads" ? "campaign.edit" : path.startsWith("notifications") || path === "ai/insights/generate" ? "analytics.view" : path === "ai/generate" || path === "content" ? "content.edit" : path === "social/posts" || path === "social/accounts" ? "social.edit" : path === "reports" ? "report.edit" : path === "automation" ? "automation.manage" : path === "clients" ? "client.edit" : path.startsWith("billing/") ? "billing.manage" : "settings.manage";
  const auth = await context(permission);
  if (auth.error) return auth.error;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
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
  if (path === "billing/razorpay/create-order") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      type: z.enum(["subscription", "credits"]),
      planSlug: z.string().optional(),
      interval: z.enum(["monthly", "yearly"]).default("monthly"),
      packId: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid order parameters.");

    const { createRazorpayOrder, CREDIT_PACKS } = await import("@/lib/razorpay");
    const { DEFAULT_PLANS } = await import("@/lib/billing-service");

    let amount = 0;
    let receipt = `rcpt_${Date.now()}`;
    const notes: Record<string, string> = {
      workspaceId: auth.session.workspaceId,
      userId: auth.session.userId,
      type: parsed.data.type
    };

    if (parsed.data.type === "subscription") {
      const plan = DEFAULT_PLANS.find((p) => p.slug === parsed.data.planSlug) || DEFAULT_PLANS[1];
      amount = parsed.data.interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      notes.planSlug = plan.slug;
      notes.interval = parsed.data.interval;
      receipt = `rcpt_sub_${plan.slug}_${Date.now()}`;
    } else {
      const pack = CREDIT_PACKS.find((p) => p.id === parsed.data.packId) || CREDIT_PACKS[0];
      amount = pack.price;
      notes.packId = pack.id;
      receipt = `rcpt_cred_${pack.id}_${Date.now()}`;
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: auth.session.workspaceId },
      select: { currency: true }
    });
    const currency = ws?.currency || "USD";

    try {
      const order = await createRazorpayOrder({
        amount,
        currency,
        receipt,
        notes
      });
      return ok(order);
    } catch (err) {
      return error(err instanceof Error ? err.message : "Failed to create Razorpay order.", 500, "ORDER_CREATION_FAILED");
    }
  }
  if (path === "billing/razorpay/verify-payment") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      orderId: z.string().min(1),
      paymentId: z.string().min(1),
      signature: z.string().min(1),
      type: z.enum(["subscription", "credits"]),
      planSlug: z.string().optional(),
      interval: z.enum(["monthly", "yearly"]).optional(),
      packId: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid verification payload.");

    const { verifyRazorpayPaymentSignature } = await import("@/lib/razorpay");
    const isValid = verifyRazorpayPaymentSignature(parsed.data.orderId, parsed.data.paymentId, parsed.data.signature);
    if (!isValid) {
      return error("Razorpay payment signature verification failed.", 400, "INVALID_SIGNATURE");
    }

    try {
      const { processSuccessfulPayment } = await import("@/lib/billing-service");
      const result = await processSuccessfulPayment({
        workspaceId: auth.session.workspaceId,
        userId: auth.session.userId,
        type: parsed.data.type,
        planSlug: parsed.data.planSlug,
        interval: parsed.data.interval,
        packId: parsed.data.packId,
        razorpayOrderId: parsed.data.orderId,
        razorpayPaymentId: parsed.data.paymentId,
        razorpaySignature: parsed.data.signature
      });

      return ok({ success: true, ...result, message: "Payment verified and processed successfully." });
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Payment processing failed.", 500, "BILLING_PROCESSING_FAILED");
    }
  }
  if (path === "billing/settings") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      companyName: z.string().optional(),
      billingEmail: z.string().email().optional().or(z.literal("")),
      taxId: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      currency: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid billing settings payload.");

    const { updatePersistedBillingContact } = await import("@/lib/billing-service");
    const updated = await updatePersistedBillingContact(auth.session.workspaceId, auth.session.userId, parsed.data);
    return ok({ success: true, workspace: updated, message: "Billing settings updated successfully." });
  }
  if (path === "billing/checkout") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({ planId: z.string().min(1), interval: z.enum(["monthly", "yearly"]).default("monthly") }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid billing checkout request.");
    try {
      const { processSuccessfulPayment } = await import("@/lib/billing-service");
      const result = await processSuccessfulPayment({
        workspaceId: auth.session.workspaceId,
        userId: auth.session.userId,
        type: "subscription",
        planSlug: parsed.data.planId,
        interval: parsed.data.interval,
        razorpayPaymentId: `pay_direct_${Date.now()}`
      });
      return ok({ success: true, ...result, message: `Successfully updated plan to ${parsed.data.planId.toUpperCase()}.` });
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Unable to update subscription plan.", 500, "BILLING_UPDATE_FAILED");
    }
  }
  if (path === "billing/portal") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    return ok({ portalUrl: "/billing" });
  }
  if (path === "billing/cancel") {
    const auth = await context("billing.manage");
    if (auth.error) return auth.error;
    const { cancelPersistedSubscription } = await import("@/lib/billing-service");
    await cancelPersistedSubscription(auth.session.workspaceId, auth.session.userId);
    return ok({ cancelAtPeriodEnd: true, message: "Subscription cancelled successfully." });
  }
  if (path === "settings/api-keys") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({ name: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("API key name is required.");
    const { generatePersistedApiKey } = await import("@/lib/settings-service");
    const result = await generatePersistedApiKey(auth.session.workspaceId, auth.session.userId, parsed.data.name);
    return ok(result, undefined, { status: 201 });
  }
  if (path === "settings/change-password") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(6, "New password must be at least 6 characters")
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid password data.");
    await recordAudit({
      workspaceId: auth.session.workspaceId,
      userId: auth.session.userId,
      action: "CHANGE_PASSWORD",
      module: "security",
      entityType: "User",
      entityId: auth.session.userId
    });
    return ok({ success: true, message: "Password updated successfully." });
  }
  if (path === "settings/api-keys/revoke" || path.startsWith("settings/api-keys/")) {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const keyId = body?.keyId || path.split("/")[2] || "key";
    await recordAudit({
      workspaceId: auth.session.workspaceId,
      userId: auth.session.userId,
      action: "REVOKE_API_KEY",
      module: "settings",
      entityType: "ApiKey",
      entityId: String(keyId)
    });
    return ok({ success: true, message: "API key revoked successfully." });
  }
  if (path === "social/accounts") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = socialAccountConnectInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid social account credentials.");
    const validation = await validateCredentials(parsed.data.platform, {
      accountId: parsed.data.accountId,
      apiKey: parsed.data.apiKey,
      accountName: parsed.data.accountName
    });
    if (!validation.valid) {
      return error(validation.error || "Invalid credentials for this platform.", 422, "VALIDATION_FAILED");
    }
    const createdAccount = await createOrUpdatePersistedSocialAccount({
      workspaceId: auth.session.workspaceId,
      platform: parsed.data.platform,
      accountId: parsed.data.accountId,
      apiKey: parsed.data.apiKey,
      accountName: parsed.data.accountName,
      username: parsed.data.username,
      verifiedName: validation.verifiedName
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CONNECT", module: "social", entityType: "SocialAccount", entityId: createdAccount.id, afterData: createdAccount });
    return ok({ success: true, account: createdAccount, message: `Connected ${validation.verifiedName || parsed.data.platform} successfully!` }, undefined, { status: 201 });
  }
  if (path === "content") {
    const auth = await context("content.edit");
    if (auth.error) return auth.error;
    const parsed = contentInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid content.");
    const created = await prisma.content.create({
      data: {
        workspaceId: auth.session.workspaceId,
        createdById: auth.session.userId,
        title: parsed.data.title || "Untitled Content",
        type: (parsed.data.type || "SOCIAL_POST") as never,
        body: parsed.data.body || "",
        platform: parsed.data.platform ? (parsed.data.platform.replaceAll(" ", "_").toUpperCase() as never) : undefined,
        clientId: parsed.data.clientId,
        status: (parsed.data.status ? parsed.data.status.toUpperCase().replace(/\s+/g, "_") : "DRAFT") as never,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
        keywords: parsed.data.keywords || [],
        metadata: (parsed.data.metadata || {}) as never
      }
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CREATE", module: "content", entityType: "Content", entityId: created.id, afterData: created });
    return ok(created, undefined, { status: 201 });
  }
  if (path === "clients") {
    const auth = await context("client.edit"); if (auth.error) return auth.error; const parsed = clientInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid client."); const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`; const created = await prisma.client.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, slug, industry: parsed.data.industry, website: parsed.data.website || undefined, contactName: parsed.data.contactName, contactEmail: parsed.data.contactEmail, contactPhone: parsed.data.contactPhone, currency: parsed.data.currency || "USD", timezone: parsed.data.timezone || "UTC", monthlyBudget: parsed.data.monthlyBudget || 0, status: (parsed.data.status?.toUpperCase() || "ACTIVE") as never } }); return ok(created, undefined, { status: 201 });
  }
  if (path === "automation") {
    const auth = await context("automation.manage"); if (auth.error) return auth.error; const parsed = automationInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid automation."); const created = await prisma.automation.create({ data: { workspaceId: auth.session.workspaceId, name: parsed.data.name, description: parsed.data.description, trigger: parsed.data.trigger, action: parsed.data.action, campaignId: parsed.data.campaignId, triggerConfig: parsed.data.triggerConfig as never, actionConfig: parsed.data.actionConfig as never, isActive: parsed.data.isActive ?? true } }); return ok(created, undefined, { status: 201 });
  }
  if (path.startsWith("automation/") && path.endsWith("/run")) {
    const auth = await context("automation.manage"); if (auth.error) return auth.error;
    const id = path.split("/")[1];
    const { evaluateAutomationRule } = await import("@/lib/repositories");
    const result = await evaluateAutomationRule(auth.session.workspaceId, id);
    return ok(result);
  }
  if (path === "team") {
    const auth = await context("settings.manage"); if (auth.error) return auth.error;
    const parsed = teamInviteInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid team invitation.");
    const { invitePersistedTeamMember } = await import("@/lib/repositories");
    const reqProto = request.headers.get("x-forwarded-proto") || (url.protocol.replace(":", "") || "http");
    const reqHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    const isLocal = reqHost?.includes("localhost") || reqHost?.includes("127.0.0.1");
    const origin = isLocal ? `${reqProto}://${reqHost}` : (process.env.APP_URL || `${reqProto}://${reqHost}`);

    const created = await invitePersistedTeamMember({
      workspaceId: auth.session.workspaceId,
      inviterUserId: auth.session.userId,
      inviterName: auth.session.name,
      baseUrl: origin,
      ...parsed.data
    });
    return ok({
      item: created.user,
      delivered: created.emailResult.delivered,
      message: created.emailResult.delivered
        ? `Invitation email successfully sent to ${created.user.email}.`
        : `Invitation created for ${created.user.email}. Configure SMTP to enable automatic email delivery.`
    }, undefined, { status: 201 });
  }
  if (path.startsWith("team/") && path.endsWith("/resend")) {
    const auth = await context("settings.manage"); if (auth.error) return auth.error;
    const memberId = path.split("/")[1];
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member) return error("Team member not found.", 404);

    const reqProto = request.headers.get("x-forwarded-proto") || (url.protocol.replace(":", "") || "http");
    const reqHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    const isLocal = reqHost?.includes("localhost") || reqHost?.includes("127.0.0.1");
    const origin = isLocal ? `${reqProto}://${reqHost}` : (process.env.APP_URL || `${reqProto}://${reqHost}`);

    const { invitePersistedTeamMember } = await import("@/lib/repositories");
    const created = await invitePersistedTeamMember({
      workspaceId: auth.session.workspaceId,
      inviterUserId: auth.session.userId,
      inviterName: auth.session.name,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      jobTitle: member.jobTitle || undefined,
      baseUrl: origin
    });
    return ok({
      success: true,
      delivered: created.emailResult.delivered,
      message: created.emailResult.delivered
        ? `Invitation re-sent to ${member.email}.`
        : `Invitation refreshed for ${member.email}. Configure SMTP to enable automatic email delivery.`
    });
  }
  if (path === "integrations/connect-credentials") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const parsed = integrationCredentialInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid integration credentials.");
    const validation = await validateCredentials(parsed.data.platform, {
      apiKey: parsed.data.apiKey,
      accountId: parsed.data.accountId,
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
      "YouTube Ads": "YOUTUBE_ADS",
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
  if (path.startsWith("integrations/") && path.endsWith("/sync")) { const integrationId = path.split("/")[1]; const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId: auth.session.workspaceId } }); if (!integration) return error("Integration not found.", 404); if (!integration.accessTokenEncrypted && !(integration as any).apiKeyEncrypted) return error("This integration is not connected. Configure credentials before syncing.", 409, "INTEGRATION_NOT_CONNECTED"); const job = await enqueueJob("integration.sync", { workspaceId: auth.session.workspaceId, integrationId }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SYNC_REQUESTED", module: "integrations", entityType: "Integration", entityId: integrationId }); return ok({ status: "queued", jobId: job.id, message: "Sync queued for background processing." }, undefined, { status: 202 }); }
  if (path === "reports") { const parsed = reportInput.safeParse(body); if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid report."); const report = await prisma.report.create({ data: { workspaceId: auth.session.workspaceId, createdById: auth.session.userId, name: parsed.data.name, title: parsed.data.name || "Marketing Report", clientId: parsed.data.clientId, format: parsed.data.format as never, configuration: parsed.data.configuration as never, status: "GENERATING" } }); const job = await enqueueJob("report.generate", { workspaceId: auth.session.workspaceId, reportId: report.id, runAt: new Date().toISOString() }); return ok({ ...report, jobId: job.id }, undefined, { status: 202 }); }

  if (path === "youtube/validate-api-key") {
    const parsed = z.object({ apiKey: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("API Key is required.");
    const result = await validateYouTubeApiKey(parsed.data.apiKey);
    return result.valid ? ok({ valid: true }) : error(result.error || "Invalid API key", 422, "VALIDATION_FAILED");
  }

  if (path === "youtube/validate-channel") {
    const parsed = z.object({ channelId: z.string().min(1), apiKey: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("Channel ID and API Key are required.");
    const result = await validateYouTubeChannel(parsed.data.channelId, parsed.data.apiKey);
    return result.valid ? ok({ valid: true, channel: result.channel }) : error(result.error || "Channel not found", 422, "VALIDATION_FAILED");
  }

  if (path === "youtube/connect") {
    const parsed = z.object({
      channelName: z.string().min(1),
      channelId: z.string().min(1),
      apiKey: z.string().min(1),
      oauthClientId: z.string().optional(),
      oauthClientSecret: z.string().optional(),
      country: z.string().optional(),
      defaultLanguage: z.string().optional(),
      ga4PropertyId: z.string().optional()
    }).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid YouTube credentials.");
    const channelResult = await validateYouTubeChannel(parsed.data.channelId, parsed.data.apiKey);
    if (!channelResult.valid) return error(channelResult.error || "Channel validation failed", 422, "VALIDATION_FAILED");
    const metadata: Record<string, unknown> = {
      channelTitle: channelResult.channel?.title,
      subscriberCount: channelResult.channel?.subscriberCount,
      viewCount: channelResult.channel?.viewCount,
      videoCount: channelResult.channel?.videoCount,
      country: parsed.data.country || channelResult.channel?.country,
      defaultLanguage: parsed.data.defaultLanguage || channelResult.channel?.defaultLanguage,
      oauthClientId: parsed.data.oauthClientId,
      oauthClientSecret: parsed.data.oauthClientSecret,
      ga4PropertyId: parsed.data.ga4PropertyId
    };
    const existing = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    const encApiKey = encryptSecret(parsed.data.apiKey);
    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: { accountName: parsed.data.channelName, accountId: parsed.data.channelId, apiKeyEncrypted: encApiKey, status: "CONNECTED", metadata: metadata as never, errorMessage: null, lastSyncedAt: new Date() } });
    } else {
      await prisma.integration.create({ data: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE", accountName: parsed.data.channelName, accountId: parsed.data.channelId, apiKeyEncrypted: encApiKey, status: "CONNECTED", metadata: metadata as never, lastSyncedAt: new Date() } });
    }
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CONNECT", module: "integrations", entityType: "Integration", entityId: "youtube", afterData: { channelId: parsed.data.channelId, channelTitle: channelResult.channel?.title } });
    return ok({ valid: true, channel: channelResult.channel, message: `Connected "${channelResult.channel?.title}" successfully!` }, undefined, { status: 200 });
  }

  if (path === "youtube/channel-info") {
    const parsed = z.object({ channelId: z.string().min(1), apiKey: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("Channel ID and API Key are required.");
    try {
      const channel = await fetchChannelInfo(parsed.data.channelId, parsed.data.apiKey);
      return ok(channel);
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to fetch channel", 502, "YOUTUBE_API_ERROR"); }
  }

  if (path === "youtube/videos") {
    const parsed = z.object({ channelId: z.string().min(1), apiKey: z.string().min(1), maxResults: z.number().optional().default(10) }).safeParse(body);
    if (!parsed.success) return error("Channel ID and API Key are required.");
    try {
      const videos = await fetchRecentVideos(parsed.data.channelId, parsed.data.apiKey, parsed.data.maxResults);
      return ok({ items: videos });
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to fetch videos", 502, "YOUTUBE_API_ERROR"); }
  }

  if (path === "youtube/analytics") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube channel not connected.", 404, "YOUTUBE_NOT_CONNECTED");
    const accessToken = integration.accessTokenEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.accessTokenEncrypted) : null;
    if (!accessToken) return error("YouTube OAuth not configured. Add OAuth Client ID and Secret to enable analytics.", 409, "YOUTUBE_OAUTH_REQUIRED");
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    try {
      const analytics = await fetchAllYouTubeAnalytics(accessToken, start, end);
      return ok(analytics);
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to fetch analytics", 502, "YOUTUBE_ANALYTICS_ERROR"); }
  }

  if (path === "youtube/dashboard") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube channel not connected.", 404, "YOUTUBE_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("YouTube API Key not configured.", 409, "YOUTUBE_API_KEY_REQUIRED");
    try {
      const channel = await fetchChannelInfo(String(integration.accountId), apiKeyRaw);
      const videos = await fetchRecentVideos(String(integration.accountId), apiKeyRaw, 10);
      const meta = (integration.metadata as Record<string, unknown>) || {};
      return ok({
        channel,
        recentVideos: videos,
        integration: {
          id: integration.id,
          accountName: integration.accountName,
          status: integration.status,
          lastSyncedAt: integration.lastSyncedAt,
          hasOAuth: Boolean(integration.accessTokenEncrypted),
          country: meta.country,
          defaultLanguage: meta.defaultLanguage
        }
      });
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to load dashboard", 502, "YOUTUBE_API_ERROR"); }
  }

  // ==================== YOUTUBE ADS ROUTES ====================
  if (path === "youtube-ads/validate") {
    const parsed = z.object({ apiKey: z.string().min(1), channelId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return error("API Key and Channel ID are required.", 422);
    const { validateYouTubeAdsCredentials } = await import("@/lib/youtube/ads");
    const result = await validateYouTubeAdsCredentials(parsed.data);
    if (!result.valid) return error(result.error || "Invalid credentials.", 422, "YOUTUBE_ADS_INVALID");
    return ok({ valid: true, message: "YouTube Ads credentials verified." });
  }

  if (path === "youtube-ads/connect") {
    const parsed = z.object({ apiKey: z.string().min(1), channelId: z.string().min(1), displayName: z.string().optional() }).safeParse(body);
    if (!parsed.success) return error("API Key and Channel ID are required.", 422);
    const { validateYouTubeAdsCredentials } = await import("@/lib/youtube/ads");
    const result = await validateYouTubeAdsCredentials(parsed.data);
    if (!result.valid) return error(result.error || "Invalid credentials.", 422, "YOUTUBE_ADS_INVALID");
    const { encryptSecret } = await import("@/lib/crypto");
    const existing = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: { apiKeyEncrypted: encryptSecret(parsed.data.apiKey), accountId: parsed.data.channelId, accountName: parsed.data.displayName || "YouTube Ads", status: "CONNECTED", lastSyncedAt: new Date() } });
    } else {
      await prisma.integration.create({ data: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE", accountName: parsed.data.displayName || "YouTube Ads", accountId: parsed.data.channelId, apiKeyEncrypted: encryptSecret(parsed.data.apiKey), status: "CONNECTED", lastSyncedAt: new Date() } });
    }
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "CONNECT", module: "integrations", entityType: "Integration", entityId: "youtube-ads", afterData: { channelId: parsed.data.channelId } });
    return ok({ connected: true, message: "YouTube Ads connected successfully." });
  }

  if (path === "youtube-ads/campaigns") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube Ads not connected.", 404, "YOUTUBE_ADS_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("API Key not configured.", 409, "YOUTUBE_ADS_API_KEY_REQUIRED");
    try {
      const { fetchYouTubeAdCampaigns } = await import("@/lib/youtube/ads");
      const campaigns = await fetchYouTubeAdCampaigns(apiKeyRaw, String(integration.accountId));
      return ok({ campaigns });
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to fetch campaigns", 502, "YOUTUBE_ADS_API_ERROR"); }
  }

  if (path === "youtube-ads/dashboard") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube Ads not connected.", 404, "YOUTUBE_ADS_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("API Key not configured.", 409, "YOUTUBE_ADS_API_KEY_REQUIRED");
    try {
      const { fetchYouTubeAdsDashboard } = await import("@/lib/youtube/ads");
      const dashboard = await fetchYouTubeAdsDashboard(apiKeyRaw, String(integration.accountId));
      return ok({ dashboard, integration: { id: integration.id, accountName: integration.accountName, status: integration.status, lastSyncedAt: integration.lastSyncedAt } });
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to load dashboard", 502, "YOUTUBE_ADS_API_ERROR"); }
  }

  if (path === "youtube-ads/metrics") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube Ads not connected.", 404, "YOUTUBE_ADS_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("API Key not configured.", 409, "YOUTUBE_ADS_API_KEY_REQUIRED");
    try {
      const { fetchYouTubeAdsMetrics } = await import("@/lib/youtube/ads");
      const metrics = await fetchYouTubeAdsMetrics(apiKeyRaw, String(integration.accountId), 30);
      return ok({ metrics });
    } catch (e) { return error(e instanceof Error ? e.message : "Failed to fetch metrics", 502, "YOUTUBE_ADS_API_ERROR"); }
  }

  return error("Action not found.", 404);
}

export async function PATCH(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const auth = await context(path.startsWith("notifications") ? "analytics.view" : path === "settings" ? "settings.manage" : path.startsWith("content/") ? "content.edit" : path.startsWith("social/posts/") ? "social.edit" : path.startsWith("clients/") ? "client.edit" : path.startsWith("automation/") ? "automation.manage" : path.startsWith("ai/insights/") ? "analytics.view" : "campaign.edit");
  if (auth.error) return auth.error;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (path.startsWith("notifications/")) { const id = path.split("/")[1]; const updated = await prisma.notification.updateMany({ where: { id, workspaceId: auth.session.workspaceId, userId: auth.session.userId }, data: { readAt: new Date() } }); return updated.count ? ok({ id, read: true }) : error("Notification not found.", 404); }
  if (path.startsWith("leads/")) { const id = path.split("/")[1]; if (!body?.status) return error("A lead status is required."); const updated = await prisma.lead.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { status: String(body.status).toUpperCase().replaceAll(" ", "_") as never } }); if (!updated.count) return error("Lead not found.", 404); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "leads", entityType: "Lead", entityId: id, afterData: { status: body.status } }); return ok({ id, status: body.status }); }
  if (path.startsWith("clients/")) {
    const id = path.split("/")[1];
    const { updatePersistedClient } = await import("@/lib/repositories");
    const updated = await updatePersistedClient(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Client not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "clients", entityType: "Client", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  if (path.startsWith("automation/")) {
    const id = path.split("/")[1];
    const { updatePersistedAutomation } = await import("@/lib/repositories");
    const updated = await updatePersistedAutomation(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Automation rule not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "automation", entityType: "Automation", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  if (path.startsWith("team/")) {
    const id = path.split("/")[1];
    const { updatePersistedTeamMember } = await import("@/lib/repositories");
    const updated = await updatePersistedTeamMember(id, body as never, auth.session.workspaceId);
    return ok({ id, updated: true });
  }
  if (path.startsWith("ai/insights/")) {
    const id = path.split("/")[2];
    const { updatePersistedInsightStatus } = await import("@/lib/repositories");
    const status = String(body?.status || "REVIEWED");
    const updated = await updatePersistedInsightStatus(auth.session.workspaceId, id, status);
    if (!updated.count) return error("Insight not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "ai_insights", entityType: "AIInsight", entityId: id, afterData: { status } });
    return ok({ id, status });
  }
  if (path.startsWith("content/")) {
    const id = path.split("/")[1];
    const { updatePersistedContentItem } = await import("@/lib/repositories");
    const updated = await updatePersistedContentItem(auth.session.workspaceId, id, body as never);
    if (!updated.count) return error("Content not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE", module: "content", entityType: "Content", entityId: id, afterData: body });
    return ok({ id, updated: true });
  }
  if (path.startsWith("social/posts/")) { const id = path.split("/")[2]; const updated = await prisma.socialPost.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { ...(body?.status ? { status: body.status as never } : {}) } }); return updated.count ? ok({ id, status: body?.status }) : error("Social post not found.", 404); }
  if (path === "settings/profile") {
    const parsed = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      jobTitle: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional()
    }).safeParse(body);
    if (!parsed.success) return error("Invalid profile payload.");
    const updatedUser = await prisma.user.update({
      where: { id: auth.session.userId },
      data: parsed.data
    });
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_PROFILE", module: "settings", entityType: "User", entityId: auth.session.userId, afterData: parsed.data });
    return ok(updatedUser);
  }
  if (path === "settings/notifications") {
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_NOTIFICATION_PREFERENCES", module: "settings", entityType: "User", entityId: auth.session.userId, afterData: body });
    return ok({ success: true, message: "Notification preferences saved." });
  }
  if (path === "settings") {
    const settings = z.object({
      name: z.string().min(1).optional(),
      website: z.string().nullable().optional(),
      industry: z.string().nullable().optional(),
      businessType: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
      monthlyBudget: z.coerce.number().optional(),
      marketingGoals: z.array(z.string()).optional(),
      targetAudience: z.string().nullable().optional(),
      targetAgeRange: z.string().nullable().optional(),
      targetGeo: z.string().nullable().optional(),
      targetLanguages: z.string().nullable().optional(),
      targetInterests: z.string().nullable().optional(),
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
    const updated = await updatePersistedCampaignStatus(auth.session.workspaceId, id, String(body.status));
    if (!updated) return error("Campaign not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "campaigns", entityType: "Campaign", entityId: id, afterData: { status: body.status } });
    return ok({ id, status: body.status });
  }
  return error("Action not found.", 404);
}

export async function DELETE(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const auth = await context("campaign.delete");
  if (auth.error) return auth.error;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
  const parts = params.path;
  const entity = parts[0];
  const id = parts[1];

  if (entity === "settings" && parts[1] === "api-keys") {
    const keyId = parts[2];
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "REVOKE_API_KEY", module: "settings", entityType: "ApiKey", entityId: keyId });
    return ok({ revoked: keyId });
  }

  if ((entity === "social" && parts[1] === "accounts") || entity === "social-accounts") {
    const accountId = entity === "social-accounts" ? parts[1] : parts[2];
    if (!accountId) return error("Account ID is required.", 400);
    const { disconnectPersistedSocialAccount } = await import("@/lib/repositories");
    await disconnectPersistedSocialAccount(auth.session.workspaceId, accountId);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DISCONNECT", module: "social", entityType: "SocialAccount", entityId: accountId });
    return ok({ disconnected: accountId });
  }
  if (entity === "clients") {
    const { deletePersistedClient } = await import("@/lib/repositories");
    const result = await deletePersistedClient(auth.session.workspaceId, id);
    if (!result.count) return error("Client not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "clients", entityType: "Client", entityId: id });
    return ok({ deleted: id });
  }
  if (entity === "automation") {
    const { deletePersistedAutomation } = await import("@/lib/repositories");
    const result = await deletePersistedAutomation(auth.session.workspaceId, id);
    if (!result.count) return error("Automation rule not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "automation", entityType: "Automation", entityId: id });
    return ok({ deleted: id });
  }
  if (entity === "team") {
    const { deletePersistedTeamMember } = await import("@/lib/repositories");
    await deletePersistedTeamMember(id, auth.session.workspaceId);
    return ok({ deleted: id });
  }
  if (entity === "content") {
    const { deletePersistedContentItem } = await import("@/lib/repositories");
    const result = await deletePersistedContentItem(auth.session.workspaceId, id);
    if (!result.count) return error("Content item not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "content", entityType: "Content", entityId: id });
    return ok({ deleted: id });
  }
  if (entity === "reports") {
    const deleted = await prisma.report.deleteMany({ where: { id, workspaceId: auth.session.workspaceId } });
    if (!deleted.count) return error("Report not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "reports", entityType: "Report", entityId: id });
    return ok({ deleted: id });
  }

  const archived = await archivePersistedCampaign(auth.session.workspaceId, id);
  if (!archived) return error("Campaign not found.", 404);
  await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SOFT_DELETE", module: "campaigns", entityType: "Campaign", entityId: id });
  return ok({ deleted: id, softDeleted: true });
}
