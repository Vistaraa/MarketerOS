import { NextResponse } from "next/server";
import { consumeOAuthState } from "@/lib/oauth";
import { encryptSecret } from "@/lib/crypto";
import { getProvider,type ProviderKey } from "@/lib/integrations/provider";
import { prisma } from "@/lib/prisma";
import { parseListQuery } from "@/lib/api-contracts";
import { cacheInvalidatePrefix } from "@/lib/cache";
import { COMPLIANCE_PATHS,NEEDS_VERIFIED_EMAIL,context,error,getRequiredPermission,lapsedSubscriptionResponse,resolveV1Path,type V1Context,type V1Module } from "@/lib/api/v1/core";
import * as ai from "@/lib/api/v1/handlers/ai";
import * as automation from "@/lib/api/v1/handlers/automation";
import * as billing from "@/lib/api/v1/handlers/billing";
import * as campaigns from "@/lib/api/v1/handlers/campaigns";
import * as clients from "@/lib/api/v1/handlers/clients";
import * as content from "@/lib/api/v1/handlers/content";
import * as integrations from "@/lib/api/v1/handlers/integrations";
import * as leads from "@/lib/api/v1/handlers/leads";
import * as notifications from "@/lib/api/v1/handlers/notifications";
import * as overview from "@/lib/api/v1/handlers/overview";
import * as reports from "@/lib/api/v1/handlers/reports";
import * as search from "@/lib/api/v1/handlers/search";
import * as settings from "@/lib/api/v1/handlers/settings";
import * as social from "@/lib/api/v1/handlers/social";
import * as team from "@/lib/api/v1/handlers/team";
import * as youtube from "@/lib/api/v1/handlers/youtube";
import * as youtubeAds from "@/lib/api/v1/handlers/youtube-ads";

export const runtime = "nodejs";

/**
 * /api/v1/* entry point. Runs the checks every request shares (authentication and role, API-key limits, privacy
 * endpoints, lapsed subscriptions, email verification) and hands the request to the resource's handler module in
 * lib/api/v1/handlers, keyed by the first path segment.
 */
const HANDLERS: Record<string, V1Module> = {
  "ai": ai,
  "automation": automation,
  "billing": billing,
  "campaigns": campaigns,
  "clients": clients,
  "content": content,
  "integrations": integrations,
  "leads": leads,
  "notifications": notifications,
  "overview": overview,
  "reports": reports,
  "search": search,
  "settings": settings,
  "social": social,
  "team": team,
  "youtube": youtube,
  "youtube-ads": youtubeAds,
  // Aliases: these paths are served by another resource's module.
  analytics: overview,
  "ad-manager": overview,
  "social-media": overview,
  "social-accounts": social
};

/** Who may delete each kind of record (DELETE used to require campaign.delete for everything). */
const DELETE_PERMISSIONS: Record<string, string> = {
  campaigns: "campaign.delete",
  clients: "client.edit",
  leads: "lead.edit",
  content: "content.edit",
  automation: "automation.manage",
  reports: "report.edit",
  team: "team.manage",
  social: "social.edit",
  "social-accounts": "social.edit",
  settings: "settings.view"
};

async function dispatch(method: keyof V1Module, ctx: V1Context) {
  const handler = HANDLERS[ctx.path.split("/")[0]]?.[method];
  return handler ? handler(ctx) : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const path = await resolveV1Path(request, params);
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

  const auth = await context(getRequiredPermission(path, "GET"));
  if (auth.error) return auth.error;
  // API keys read marketing data; account security and billing stay with signed-in members.
  if (auth.session.role === "API_KEY" && /^(settings|billing|team\/|notifications)/.test(path)) return error("This endpoint isn't available to API keys.", 403, "API_KEY_NOT_ALLOWED");
  if (COMPLIANCE_PATHS.test(path)) {
    const { handleComplianceGet } = await import("@/lib/compliance-api");
    const handled = await handleComplianceGet(path, auth.session);
    if (handled) return handled;
  }
  const listQuery = parseListQuery(request);
  const query = (listQuery.search || listQuery.q).toLowerCase();
  const response = await dispatch("GET", { request, url, path, auth, body: null, listQuery, query, parts: path.split("/"), entity: path.split("/")[0], id: path.split("/")[1] || "" });
  return response ?? error("Resource not found.", 404);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const path = await resolveV1Path(request, params);
  const url = new URL(request.url);
  const auth = await context(getRequiredPermission(path, "POST"));
  if (auth.error) return auth.error;
  const lapsed = await lapsedSubscriptionResponse(auth.session.workspaceId, path);
  if (lapsed) return lapsed;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
  const body = await request.json().catch(() => null);
  if (COMPLIANCE_PATHS.test(path)) {
    const { handleCompliancePost } = await import("@/lib/compliance-api");
    const handled = await handleCompliancePost(path, auth.session, body);
    if (handled) return handled;
  }
  // Paying, inviting people and connecting accounts need a confirmed email address.
  if (NEEDS_VERIFIED_EMAIL.test(path)) {
    const { emailVerificationGuard } = await import("@/lib/email-verification");
    const unverified = await emailVerificationGuard(auth.session.userId);
    if (unverified) return unverified;
  }
  const response = await dispatch("POST", { request, url, path, auth, body, listQuery: parseListQuery(request), query: "", parts: path.split("/"), entity: path.split("/")[0], id: path.split("/")[1] || "" });
  return response ?? error("Action not found.", 404);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  const auth = await context(path.startsWith("notifications") ? "notifications.view" : (path === "settings/profile" || path === "settings/notifications") ? "settings.view" : path === "settings" ? "settings.manage" : path.startsWith("content/") ? "content.edit" : path.startsWith("social/posts/") ? "social.edit" : path.startsWith("clients/") ? "client.edit" : path.startsWith("automation/") ? "automation.manage" : path.startsWith("ai/insights/") ? "analytics.view" : path.startsWith("team/") ? "team.manage" : path.startsWith("reports/") ? "report.edit" : "campaign.edit");
  if (auth.error) return auth.error;
  const lapsed = await lapsedSubscriptionResponse(auth.session.workspaceId, path);
  if (lapsed) return lapsed;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const response = await dispatch("PATCH", { request, url: new URL(request.url), path, auth, body, listQuery: parseListQuery(request), query: "", parts: path.split("/"), entity: path.split("/")[0], id: path.split("/")[1] || "" });
  return response ?? error("Action not found.", 404);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const path = parts.join("/");
  const entity = parts[0];
  const auth = await context(DELETE_PERMISSIONS[entity] || "campaign.delete");
  if (auth.error) return auth.error;
  const lapsed = await lapsedSubscriptionResponse(auth.session.workspaceId, path);
  if (lapsed) return lapsed;
  cacheInvalidatePrefix(`ws:${auth.session.workspaceId}`);
  const response = await dispatch("DELETE", { request, url: new URL(request.url), path, auth, body: null, listQuery: parseListQuery(request), query: "", parts, entity, id: parts[1] || "" });
  return response ?? error("Resource not found.", 404);
}
