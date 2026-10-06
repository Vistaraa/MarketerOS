/** /api/v1/campaigns handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { publicErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { paged } from "@/lib/api-contracts";
import { cacheGetOrSet } from "@/lib/cache";
import { campaignStatusGuard, planLimitGuard } from "@/lib/plan-limits";
import { createPersistedCampaign, getPersistedCampaign, listPersistedCampaigns, updatePersistedCampaignStatus } from "@/lib/repositories";
import { campaignInput, ok, error, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth, listQuery, query }: V1Context): Promise<Response | null> {
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
  return null;
}

export async function POST({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path === "campaigns") {
    const parsed = campaignInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid campaign.");
    const overLimit = await planLimitGuard(auth.session.workspaceId, "campaigns");
    if (overLimit) return overLimit;

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
      LinkedIn: "LINKEDIN"
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
      return error(publicErrorMessage(err, "Failed to create campaign record.", "campaigns"), 400, "CAMPAIGN_CREATE_ERROR");
    }
  }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("campaigns/")) {
    const id = path.split("/")[1];
    if (!body?.status) return error("A campaign status is required.");
    const overLimit = await campaignStatusGuard(auth.session.workspaceId, id, String(body.status));
    if (overLimit) return overLimit;
    const updated = await updatePersistedCampaignStatus(auth.session.workspaceId, id, String(body.status));
    if (!updated) return error("Campaign not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "UPDATE_STATUS", module: "campaigns", entityType: "Campaign", entityId: id, afterData: { status: body.status } });
    return ok({ id, status: body.status });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "campaigns") {
    const { deletePersistedCampaign } = await import("@/lib/repositories");
    const result = await deletePersistedCampaign(auth.session.workspaceId, id);
    if (!result.count) return error("Campaign not found.", 404);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "campaigns", entityType: "Campaign", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
