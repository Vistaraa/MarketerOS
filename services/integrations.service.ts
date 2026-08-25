import {
  connectIntegrationCredentials,
  disconnectIntegration,
  getIntegrationById,
  listIntegrationsByWorkspace,
  platformMapToDb
} from "@/models/integration.model";

export async function getWorkspaceIntegrations(workspaceId: string) {
  return listIntegrationsByWorkspace(workspaceId);
}

export async function connectPlatformCredentials(workspaceId: string, data: {
  platform: string;
  accountName?: string;
  accountId?: string;
  apiKey?: string;
  apiSecret?: string;
  developerToken?: string;
  propertyId?: string;
  siteUrl?: string;
  appId?: string;
  channelId?: string;
  locationId?: string;
  pixelId?: string;
  phoneNumberId?: string;
  pageId?: string;
  adAccountId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}) {
  // Validate platform
  const dbPlatform = platformMapToDb[data.platform];
  if (!dbPlatform) {
    throw new Error(`Unsupported platform: ${data.platform}`);
  }

  return connectIntegrationCredentials({
    workspaceId,
    ...data
  });
}

export async function removeIntegration(workspaceId: string, integrationId: string) {
  return disconnectIntegration(workspaceId, integrationId);
}
