/** /api/v1/social handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { publicErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { validateCredentials } from "@/lib/integrations/validate";
import { cacheGetOrSet } from "@/lib/cache";
import { createOrUpdatePersistedSocialAccount, listPersistedSocialAccountsMerged, listPersistedSocialPosts } from "@/lib/repositories";
import { socialAccountConnectInput, ok, error, context, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth, query }: V1Context): Promise<Response | null> {
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
      return error(`Instagram API failed: ${publicErrorMessage(e, "the request could not be completed", "instagram")}`, 502, "INSTAGRAM_API_FAILED");
    }
  }
  return null;
}

export async function POST({ path, body }: V1Context): Promise<Response | null> {
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
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("social/posts/")) { const id = path.split("/")[2]; const updated = await prisma.socialPost.updateMany({ where: { id, workspaceId: auth.session.workspaceId }, data: { ...(body?.status ? { status: body.status as never } : {}) } }); return updated.count ? ok({ id, status: body?.status }) : error("Social post not found.", 404); }
  return null;
}

export async function DELETE({ auth, parts, entity }: V1Context): Promise<Response | null> {
  if ((entity === "social" && parts[1] === "accounts") || entity === "social-accounts") {
    const accountId = entity === "social-accounts" ? parts[1] : parts[2];
    if (!accountId) return error("Account ID is required.", 400);
    const { disconnectPersistedSocialAccount } = await import("@/lib/repositories");
    await disconnectPersistedSocialAccount(auth.session.workspaceId, accountId);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DISCONNECT", module: "social", entityType: "SocialAccount", entityId: accountId });
    return ok({ disconnected: accountId });
  }
  return null;
}
