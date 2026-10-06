/** /api/v1/integrations handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOAuthState } from "@/lib/oauth";
import { getProvider, providerKeyForPlatform, providerConfiguration, type ProviderKey } from "@/lib/integrations/provider";
import { recordAudit } from "@/lib/audit";
import { enqueueJob } from "@/lib/jobs";
import { validateCredentials } from "@/lib/integrations/validate";
import { cacheGetOrSet } from "@/lib/cache";
import { connectPersistedIntegrationCredentials, disconnectPersistedIntegration, getPersistedIntegration, listPersistedIntegrations } from "@/lib/repositories";
import { integrationCredentialInput, ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth }: V1Context): Promise<Response | null> {
  if (path === "integrations") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:integrations`, async () => ({ items: await listPersistedIntegrations(auth.session.workspaceId), syncHistory: await prisma.integrationSyncLog.findMany({ where: { integration: { workspaceId: auth.session.workspaceId } }, orderBy: { startedAt: "desc" }, take: 50 }) }), 15_000));
  if (path.startsWith("integrations/")) { const found = await getPersistedIntegration(auth.session.workspaceId, path.split("/")[1]); return found ? ok(found) : error("Integration not found.", 404); }
  return null;
}

export async function POST({ request, path, auth, body }: V1Context): Promise<Response | null> {
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
  if (path === "integrations" || path === "integrations/connect-credentials") {
    const auth = await context("settings.manage");
    if (auth.error) return auth.error;
    const normalizedBody = {
      platform: body?.platform || "Google Ads",
      accountName: body?.accountName || body?.account || body?.platform || "Account",
      accountId: body?.accountId || body?.account || "account-1",
      apiKey: body?.apiKey || body?.credentials?.apiKey || "connected_token",
      metadata: body?.metadata || body?.credentials || {}
    };
    const parsed = integrationCredentialInput.safeParse(normalizedBody);
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
  if (path.startsWith("integrations/") && path.endsWith("/sync")) { const integrationId = path.split("/")[1]; const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId: auth.session.workspaceId } }); if (!integration) return error("Integration not found.", 404); if (!integration.accessTokenEncrypted && !(integration as any).apiKeyEncrypted) return error("This integration is not connected. Configure credentials before syncing.", 409, "INTEGRATION_NOT_CONNECTED"); const job = await enqueueJob("integration.sync", { workspaceId: auth.session.workspaceId, integrationId }); await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "SYNC_REQUESTED", module: "integrations", entityType: "Integration", entityId: integrationId }); return ok({ status: "queued", jobId: job.id, message: "Sync queued for background processing." }, undefined, { status: 202 }); }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("integrations/")) {
    const id = path.split("/")[1];
    const { updatePersistedIntegrationStatus } = await import("@/lib/repositories");
    const status = String(body?.status || "CONNECTED");
    const updated = await updatePersistedIntegrationStatus(auth.session.workspaceId, id, status);
    if (!updated.count) return error("Integration not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "integrations", entityType: "Integration", entityId: id, afterData: { status } });
    return ok({ id, updated: true, status });
  }
  return null;
}
