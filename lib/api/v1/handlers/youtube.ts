/** /api/v1/youtube handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { publicErrorMessage } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { validateYouTubeApiKey, validateYouTubeChannel, fetchChannelInfo, fetchRecentVideos, fetchAllYouTubeAnalytics } from "@/lib/youtube";
import { ok, error, type V1Context } from "@/lib/api/v1/core";

export async function POST({ path, auth, body }: V1Context): Promise<Response | null> {
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
    } catch (e) { return error(publicErrorMessage(e, "Failed to fetch channel", "youtube"), 502, "YOUTUBE_API_ERROR"); }
  }
  if (path === "youtube/videos") {
    const parsed = z.object({ channelId: z.string().min(1), apiKey: z.string().min(1), maxResults: z.number().optional().default(10) }).safeParse(body);
    if (!parsed.success) return error("Channel ID and API Key are required.");
    try {
      const videos = await fetchRecentVideos(parsed.data.channelId, parsed.data.apiKey, parsed.data.maxResults);
      return ok({ items: videos });
    } catch (e) { return error(publicErrorMessage(e, "Failed to fetch videos", "youtube"), 502, "YOUTUBE_API_ERROR"); }
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
    } catch (e) { return error(publicErrorMessage(e, "Failed to fetch analytics", "youtube"), 502, "YOUTUBE_ANALYTICS_ERROR"); }
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
    } catch (e) { return error(publicErrorMessage(e, "Failed to load dashboard", "youtube"), 502, "YOUTUBE_API_ERROR"); }
  }
  return null;
}
