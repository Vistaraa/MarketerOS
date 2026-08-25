import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  listCampaignsByWorkspace,
  updateCampaign,
  updateCampaignStatus
} from "@/models/campaign.model";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import { platformMapToDb } from "@/models/integration.model";

export async function getWorkspaceCampaigns(workspaceId: string, clientId?: string) {
  return listCampaignsByWorkspace(workspaceId, clientId);
}

export async function getCampaignDetails(workspaceId: string, id: string) {
  const result = await getCampaignById(workspaceId, id);
  if (!result) {
    throw new Error("Campaign not found.");
  }
  return result;
}

export async function createNewCampaign(
  workspaceId: string,
  userId: string,
  input: {
    name: string;
    platform?: string;
    platforms?: string[];
    objective: string;
    budget: number;
    dailyBudget?: number;
    targetRoas?: number;
    targetCpa?: number;
    biddingStrategy?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // Determine all platforms targeted
  const selectedPlatforms = input.platforms && input.platforms.length > 0
    ? input.platforms
    : [input.platform || "Google Ads"];

  // Verify that all selected platforms are connected
  const connectedIntegrations = await prisma.integration.findMany({
    where: {
      workspaceId,
      status: "CONNECTED"
    }
  });

  const connectedDbPlatforms = new Set(connectedIntegrations.map((i) => i.platform));
  const missingPlatforms: string[] = [];

  for (const plat of selectedPlatforms) {
    const dbPlat = platformMapToDb[plat] || Platform.GOOGLE_ADS;
    if (!connectedDbPlatforms.has(dbPlat)) {
      missingPlatforms.push(plat);
    }
  }

  if (missingPlatforms.length > 0) {
    throw new Error(
      `Cannot launch campaign: The following platform(s) are not connected: ${missingPlatforms.join(", ")}. Please connect them in Integrations first.`
    );
  }

  // Get first matching integration ID for primary reference
  const primaryDbPlatform = platformMapToDb[selectedPlatforms[0]] || Platform.GOOGLE_ADS;
  const primaryIntegration = connectedIntegrations.find((i) => i.platform === primaryDbPlatform);

  const finalMetadata = {
    ...(input.metadata || {}),
    selectedPlatforms,
    integrationIds: connectedIntegrations
      .filter((i) => selectedPlatforms.some((sp) => platformMapToDb[sp] === i.platform))
      .map((i) => i.id)
  };

  return createCampaign({
    workspaceId,
    createdById: userId,
    integrationId: primaryIntegration?.id,
    name: input.name,
    platform: selectedPlatforms[0],
    objective: input.objective,
    budget: input.budget,
    dailyBudget: input.dailyBudget || input.budget / 30,
    targetRoas: input.targetRoas,
    targetCpa: input.targetCpa,
    biddingStrategy: input.biddingStrategy,
    metadata: finalMetadata
  });
}

export async function changeCampaignStatus(workspaceId: string, id: string, status: string) {
  const result = await updateCampaignStatus(workspaceId, id, status);
  if (!result) {
    throw new Error("Campaign not found or status could not be updated.");
  }
  return result;
}

export async function modifyCampaign(
  workspaceId: string,
  id: string,
  data: {
    name?: string;
    budget?: number;
    dailyBudget?: number;
    targetRoas?: number;
    biddingStrategy?: string;
    status?: string;
  }
) {
  return updateCampaign(workspaceId, id, data);
}

export async function removeCampaign(workspaceId: string, id: string) {
  return deleteCampaign(workspaceId, id);
}
