/** /api/v1/youtube-ads handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { publicErrorMessage } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { ok, error, type V1Context } from "@/lib/api/v1/core";

export async function POST({ path, auth, body }: V1Context): Promise<Response | null> {
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
    // Video campaigns live in Google Ads; empty (with the reason) when it isn't connected.
    const { youtubeAdsFromGoogleAds } = await import("@/lib/youtube/google-ads-video");
    const ads = await youtubeAdsFromGoogleAds(auth.session.workspaceId);
    return ok(ads.available ? { campaigns: ads.campaigns, period: { from: ads.from, to: ads.to } } : { campaigns: [], unavailableReason: ads.reason });
  }
  if (path === "youtube-ads/dashboard") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube Ads not connected.", 404, "YOUTUBE_ADS_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("API Key not configured.", 409, "YOUTUBE_ADS_API_KEY_REQUIRED");
    try {
      const { fetchYouTubeAdsDashboard } = await import("@/lib/youtube/ads");
      const { youtubeAdsFromGoogleAds } = await import("@/lib/youtube/google-ads-video");
      const [organic, ads] = await Promise.all([fetchYouTubeAdsDashboard(apiKeyRaw, String(integration.accountId)), youtubeAdsFromGoogleAds(auth.session.workspaceId)]);
      const dashboard = { ...organic, adMetricsAvailable: ads.available, ads: ads.available ? { summary: ads.summary, campaigns: ads.campaigns, daily: ads.daily, period: { from: ads.from, to: ads.to } } : null, adMetricsUnavailableReason: ads.available ? null : ads.reason };
      return ok({ dashboard, integration: { id: integration.id, accountName: integration.accountName, status: integration.status, lastSyncedAt: integration.lastSyncedAt } });
    } catch (e) { return error(publicErrorMessage(e, "Failed to load dashboard", "youtube"), 502, "YOUTUBE_ADS_API_ERROR"); }
  }
  if (path === "youtube-ads/metrics") {
    const integration = await prisma.integration.findFirst({ where: { workspaceId: auth.session.workspaceId, platform: "YOUTUBE" } });
    if (!integration) return error("YouTube Ads not connected.", 404, "YOUTUBE_ADS_NOT_CONNECTED");
    const apiKeyRaw = integration.apiKeyEncrypted ? (await import("@/lib/crypto")).decryptSecret(integration.apiKeyEncrypted) : null;
    if (!apiKeyRaw) return error("API Key not configured.", 409, "YOUTUBE_ADS_API_KEY_REQUIRED");
    const { youtubeAdsFromGoogleAds } = await import("@/lib/youtube/google-ads-video");
    const ads = await youtubeAdsFromGoogleAds(auth.session.workspaceId);
    return ok(ads.available ? { metrics: ads.daily, summary: ads.summary } : { metrics: [], unavailableReason: ads.reason });
  }
  return null;
}
