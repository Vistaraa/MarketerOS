import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_KEY } from "@/lib/team-access";

export type LimitedResource = "members" | "clients" | "campaigns";

/** Used when a plan row has no value (matches the Pro plan new workspaces trial). */
const FALLBACK_LIMITS: Record<LimitedResource, number> = { members: 10, clients: 15, campaigns: 50 };

/** Campaigns that are finished or archived don't count toward the plan's campaign allowance. */
const INACTIVE_CAMPAIGN_STATUSES = ["COMPLETED", "ARCHIVED", "DELETED"] as const;

const LABELS: Record<LimitedResource, string> = { members: "team seats", clients: "clients", campaigns: "active campaigns" };

/** Seats in use: the owner, accepted members, and pending (unexpired) invitations, each person once. */
async function countSeats(workspaceId: string) {
  const [workspace, rows] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } }),
    prisma.oAuthState.findMany({
      where: {
        workspaceId,
        userId: { not: null },
        OR: [{ providerKey: MEMBERSHIP_KEY }, { providerKey: "TEAM_INVITE", consumedAt: null, expiresAt: { gt: new Date() } }]
      },
      select: { userId: true }
    })
  ]);
  const people = new Set(rows.map((r) => r.userId as string));
  if (workspace?.ownerId) people.add(workspace.ownerId);
  return people.size;
}

async function countUsage(workspaceId: string, resource: LimitedResource) {
  if (resource === "members") return countSeats(workspaceId);
  if (resource === "clients") return prisma.client.count({ where: { workspaceId } });
  return prisma.campaign.count({ where: { workspaceId, status: { notIn: [...INACTIVE_CAMPAIGN_STATUSES] } } });
}

export async function getPlanLimits(workspaceId: string): Promise<Record<LimitedResource, number>> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId }, include: { plan: { select: { maxMembers: true, maxClients: true, maxCampaigns: true } } } });
  return {
    members: sub?.plan?.maxMembers || FALLBACK_LIMITS.members,
    clients: sub?.plan?.maxClients || FALLBACK_LIMITS.clients,
    campaigns: sub?.plan?.maxCampaigns || FALLBACK_LIMITS.campaigns
  };
}

/** Current usage against the plan's limits, for the Billing page (the same counts limits are enforced with). */
export async function getPlanUsage(workspaceId: string) {
  const [limits, members, clients, campaigns] = await Promise.all([
    getPlanLimits(workspaceId),
    countUsage(workspaceId, "members"),
    countUsage(workspaceId, "clients"),
    countUsage(workspaceId, "campaigns")
  ]);
  return {
    members: { used: members, limit: limits.members },
    clients: { used: clients, limit: limits.clients },
    campaigns: { used: campaigns, limit: limits.campaigns }
  };
}

export async function checkPlanLimit(workspaceId: string, resource: LimitedResource) {
  const [limits, used] = await Promise.all([getPlanLimits(workspaceId), countUsage(workspaceId, resource)]);
  const limit = limits[resource];
  if (used < limit) return { ok: true as const, used, limit };
  return {
    ok: false as const,
    used,
    limit,
    message: `Your plan includes ${limit} ${LABELS[resource]} and all are in use. Upgrade your plan in Billing to add more.`
  };
}

/** A 402 response when adding one more of `resource` would exceed the plan, otherwise null. */
export async function planLimitGuard(workspaceId: string, resource: LimitedResource) {
  const result = await checkPlanLimit(workspaceId, resource);
  if (result.ok) return null;
  return NextResponse.json(
    { error: { code: "PLAN_LIMIT_REACHED", message: result.message, resource, limit: result.limit, used: result.used } },
    { status: 402 }
  );
}

/** Reopening a finished or archived campaign makes it count again, so it needs a free campaign slot. */
export async function campaignStatusGuard(workspaceId: string, campaignId: string, newStatus: string) {
  const next = newStatus.toUpperCase().replace(" ", "_");
  if ((INACTIVE_CAMPAIGN_STATUSES as readonly string[]).includes(next)) return null;
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId }, select: { status: true } });
  if (!campaign || !(INACTIVE_CAMPAIGN_STATUSES as readonly string[]).includes(campaign.status)) return null;
  return planLimitGuard(workspaceId, "campaigns");
}
