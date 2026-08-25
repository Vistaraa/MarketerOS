import { prisma } from "@/lib/prisma";
import { CampaignObjective, CampaignStatus, CampaignType, Platform, Prisma } from "@prisma/client";
import type { Campaign, Platform as AppPlatform } from "@/lib/types";
import { platformMapFromDb, platformMapToDb } from "./integration.model";

export const objectiveMap: Record<string, CampaignObjective> = {
  Sales: CampaignObjective.SALES,
  SALES: CampaignObjective.SALES,
  Conversions: CampaignObjective.CONVERSIONS,
  CONVERSIONS: CampaignObjective.CONVERSIONS,
  Leads: CampaignObjective.LEADS,
  LEADS: CampaignObjective.LEADS,
  Traffic: CampaignObjective.TRAFFIC,
  TRAFFIC: CampaignObjective.TRAFFIC,
  "Website Traffic": CampaignObjective.TRAFFIC,
  WEBSITE_TRAFFIC: CampaignObjective.TRAFFIC,
  Awareness: CampaignObjective.AWARENESS,
  AWARENESS: CampaignObjective.AWARENESS,
  "Brand Awareness": CampaignObjective.AWARENESS,
  BRAND_AWARENESS: CampaignObjective.AWARENESS,
  Engagement: CampaignObjective.ENGAGEMENT,
  ENGAGEMENT: CampaignObjective.ENGAGEMENT,
  "App Promotion": CampaignObjective.APP_INSTALLS,
  "App Installs": CampaignObjective.APP_INSTALLS,
  APP_PROMOTION: CampaignObjective.APP_INSTALLS,
  APP_INSTALLS: CampaignObjective.APP_INSTALLS
};

export function campaignFromRow(row: {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  objective: CampaignObjective;
  budget: Prisma.Decimal | number | null;
  spend?: Prisma.Decimal | number | null;
  clicks?: number | null;
  conversions?: number | null;
  roas?: Prisma.Decimal | number | null;
  ctr?: Prisma.Decimal | number | null;
  cpa?: Prisma.Decimal | number | null;
  startDate?: Date | null;
  client?: { name: string } | null;
  clientId?: string | null;
}): Campaign {
  return {
    id: row.id,
    name: row.name,
    platform: platformMapFromDb[row.platform] || "Google Ads",
    status: (row.status === CampaignStatus.ACTIVE
      ? "Active"
      : row.status === CampaignStatus.PAUSED
      ? "Paused"
      : row.status === CampaignStatus.COMPLETED
      ? "Completed"
      : row.status === CampaignStatus.ARCHIVED
      ? "Archived"
      : "Draft") as Campaign["status"],
    objective: row.objective.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    budget: Number(row.budget || 0),
    spend: Number(row.spend || 0),
    clicks: row.clicks || 0,
    conversions: row.conversions || 0,
    roas: Number(row.roas || 0),
    ctr: Number(row.ctr || 0),
    cpa: Number(row.cpa || 0),
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : "Not started",
    client: row.client?.name,
    clientId: row.clientId || undefined
  };
}

export async function listCampaignsByWorkspace(workspaceId: string, clientId?: string) {
  const rows = await prisma.campaign.findMany({
    where: { workspaceId, ...(clientId ? { clientId } : {}) },
    include: { client: true, integration: true },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(campaignFromRow);
}

export async function getCampaignById(workspaceId: string, id: string) {
  const row = await prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      client: true,
      integration: true,
      adGroups: { include: { ads: true, keywords: true } },
      ads: true,
      keywords: true,
      metrics: { orderBy: { date: "asc" }, take: 90 }
    }
  });
  return row ? { campaign: campaignFromRow(row), detail: row } : null;
}

export async function createCampaign(input: {
  workspaceId: string;
  createdById: string;
  integrationId?: string;
  name: string;
  platform: string;
  objective: string;
  budget: number;
  dailyBudget?: number;
  targetRoas?: number;
  targetCpa?: number;
  biddingStrategy?: string;
  metadata?: Record<string, unknown> | null;
}) {
  const platform = platformMapToDb[input.platform] || Platform.GOOGLE_ADS;
  const objective =
    objectiveMap[input.objective] || objectiveMap[input.objective.toUpperCase()] || CampaignObjective.SALES;
  const type = platform === Platform.GOOGLE_ADS ? CampaignType.SEARCH : CampaignType.SOCIAL;

  return prisma.campaign.create({
    data: {
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      integrationId: input.integrationId,
      name: input.name,
      platform,
      objective,
      type,
      budget: input.budget,
      dailyBudget: input.dailyBudget || input.budget / 30,
      targetRoas: input.targetRoas,
      targetCpa: input.targetCpa,
      biddingStrategy: input.biddingStrategy,
      externalData: (input.metadata as Prisma.InputJsonValue) ?? undefined
    }
  });
}

export async function updateCampaignStatus(workspaceId: string, id: string, status: string) {
  const nextStatus = status.toUpperCase().replace(" ", "_") as CampaignStatus;
  const updated = await prisma.campaign.updateMany({
    where: { id, workspaceId },
    data: { status: nextStatus }
  });
  return updated.count
    ? prisma.campaign.findFirst({ where: { id, workspaceId }, include: { client: true } })
    : null;
}

export async function updateCampaign(
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
  const updateData: Prisma.CampaignUpdateInput = {};
  if (data.name) updateData.name = data.name;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.dailyBudget !== undefined) updateData.dailyBudget = data.dailyBudget;
  if (data.targetRoas !== undefined) updateData.targetRoas = data.targetRoas;
  if (data.biddingStrategy) updateData.biddingStrategy = data.biddingStrategy;
  if (data.status) {
    updateData.status = data.status.toUpperCase().replace(" ", "_") as CampaignStatus;
  }

  return prisma.campaign.updateMany({
    where: { id, workspaceId },
    data: updateData
  });
}

export async function deleteCampaign(workspaceId: string, id: string) {
  return prisma.campaign.deleteMany({
    where: { id, workspaceId }
  });
}
