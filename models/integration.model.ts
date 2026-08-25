import { prisma } from "@/lib/prisma";
import { IntegrationStatus, Platform, Prisma } from "@prisma/client";
import type { Integration, Platform as AppPlatform } from "@/lib/types";

export const platformMapToDb: Record<string, Platform> = {
  "Google Ads": Platform.GOOGLE_ADS,
  "GOOGLE_ADS": Platform.GOOGLE_ADS,
  "Google Analytics": Platform.GOOGLE_ANALYTICS,
  "Google Analytics 4": Platform.GOOGLE_ANALYTICS,
  "GA4": Platform.GOOGLE_ANALYTICS,
  "GOOGLE_ANALYTICS": Platform.GOOGLE_ANALYTICS,
  "Google Search Console": Platform.GOOGLE_SEARCH_CONSOLE,
  "GOOGLE_SEARCH_CONSOLE": Platform.GOOGLE_SEARCH_CONSOLE,
  "YouTube": Platform.YOUTUBE,
  "YOUTUBE": Platform.YOUTUBE,
  "Google Business Profile": Platform.GOOGLE_BUSINESS_PROFILE,
  "GOOGLE_BUSINESS_PROFILE": Platform.GOOGLE_BUSINESS_PROFILE,
  "Firebase & AdMob": Platform.FIREBASE_ADMOB,
  "FIREBASE_ADMOB": Platform.FIREBASE_ADMOB,
  "Meta Ads": Platform.META_ADS,
  "META_ADS": Platform.META_ADS,
  "Facebook": Platform.FACEBOOK,
  "FACEBOOK": Platform.FACEBOOK,
  "Instagram": Platform.INSTAGRAM,
  "INSTAGRAM": Platform.INSTAGRAM,
  "Messenger": Platform.MESSENGER,
  "MESSENGER": Platform.MESSENGER,
  "WhatsApp Business": Platform.WHATSAPP,
  "WHATSAPP": Platform.WHATSAPP,
  "LinkedIn": Platform.LINKEDIN,
  "LINKEDIN": Platform.LINKEDIN,
  "TikTok": Platform.TIKTOK,
  "TIKTOK": Platform.TIKTOK,
  "X": Platform.X
};

export const platformMapFromDb: Record<Platform, AppPlatform> = {
  GOOGLE_ADS: "Google Ads",
  GOOGLE_ANALYTICS: "Google Analytics",
  GOOGLE_SEARCH_CONSOLE: "Google Search Console",
  YOUTUBE: "YouTube",
  GOOGLE_BUSINESS_PROFILE: "Google Business Profile",
  FIREBASE_ADMOB: "Firebase",
  META_ADS: "Meta Ads",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
  WHATSAPP: "WhatsApp Business",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  X: "X",
  SHOPIFY: "Shopify",
  OTHER: "Google Ads"
};

export function integrationFromRow(row: {
  id: string;
  platform: Platform;
  status: IntegrationStatus;
  accountName: string | null;
  accountId: string | null;
  lastSyncedAt: Date | null;
  apiKey: string | null;
}): Integration {
  const platformName = platformMapFromDb[row.platform] || "Google Ads";
  return {
    id: row.id,
    platform: platformName,
    status: row.status === IntegrationStatus.CONNECTED ? "Connected" : "Not connected",
    account: row.accountName || row.accountId || undefined,
    synced: row.lastSyncedAt ? row.lastSyncedAt.toISOString().slice(0, 10) : undefined,
    category: row.platform.startsWith("GOOGLE") || row.platform === "YOUTUBE" || row.platform === "FIREBASE_ADMOB"
      ? "Google Ecosystem"
      : "Meta Ecosystem",
    description: `${platformName} integration`,
    color: "#6940e8",
    initials: platformName.slice(0, 2).toUpperCase()
  };
}

export async function listIntegrationsByWorkspace(workspaceId: string) {
  const rows = await prisma.integration.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" }
  });
  return rows.map(integrationFromRow);
}

export async function getIntegrationById(workspaceId: string, id: string) {
  return prisma.integration.findFirst({
    where: { id, workspaceId }
  });
}

export async function connectIntegrationCredentials(data: {
  workspaceId: string;
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
  const dbPlatform = platformMapToDb[data.platform] || Platform.OTHER;

  const metadata: Record<string, string | undefined> = {
    developerToken: data.developerToken,
    propertyId: data.propertyId,
    siteUrl: data.siteUrl,
    appId: data.appId,
    channelId: data.channelId,
    locationId: data.locationId,
    pixelId: data.pixelId,
    phoneNumberId: data.phoneNumberId,
    pageId: data.pageId,
    adAccountId: data.adAccountId,
    clientId: data.clientId,
    clientSecret: data.clientSecret,
    refreshToken: data.refreshToken
  };

  const existing = await prisma.integration.findFirst({
    where: { workspaceId: data.workspaceId, platform: dbPlatform }
  });

  if (existing) {
    return prisma.integration.update({
      where: { id: existing.id },
      data: {
        status: IntegrationStatus.CONNECTED,
        accountName: data.accountName || existing.accountName,
        accountId: data.accountId || data.adAccountId || data.propertyId || existing.accountId,
        apiKey: data.apiKey || existing.apiKey,
        accessTokenEncrypted: data.apiSecret || existing.accessTokenEncrypted,
        metadata: ({ ...((existing.metadata as Record<string, unknown>) || {}), ...metadata } as Prisma.InputJsonValue),
        lastSyncedAt: new Date()
      }
    });
  }

  return prisma.integration.create({
    data: {
      workspaceId: data.workspaceId,
      platform: dbPlatform,
      status: IntegrationStatus.CONNECTED,
      accountName: data.accountName || data.platform,
      accountId: data.accountId || data.adAccountId || data.propertyId,
      apiKey: data.apiKey,
      accessTokenEncrypted: data.apiSecret,
      metadata: (metadata as Prisma.InputJsonValue),
      lastSyncedAt: new Date()
    }
  });
}

export async function disconnectIntegration(workspaceId: string, integrationId: string) {
  return prisma.integration.updateMany({
    where: { id: integrationId, workspaceId },
    data: {
      status: IntegrationStatus.DISCONNECTED,
      apiKey: null,
      accessTokenEncrypted: null
    }
  });
}
