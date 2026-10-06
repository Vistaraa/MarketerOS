import { prisma } from "@/lib/prisma";

/** 100 model tokens = 1 AI credit (the same conversion the Billing page shows). */
export const TOKENS_PER_CREDIT = 100;
const DEFAULT_MONTHLY_CREDITS = 10000;

/**
 * AI credit usage for the current billing period: the subscription's current period, or the calendar month
 * (UTC) without one. Used both to display usage and to enforce the allowance, so the two always agree.
 */
export async function getAICreditStatus(workspaceId: string) {
  const [subscription, workspace] = await Promise.all([
    prisma.subscription.findUnique({ where: { workspaceId }, include: { plan: true } }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { bonusAICredits: true } })
  ]);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = subscription?.currentPeriodStart && subscription.currentPeriodStart <= now ? subscription.currentPeriodStart : monthStart;

  const usage = await prisma.aIRequest.aggregate({
    where: { workspaceId, createdAt: { gte: periodStart } },
    _sum: { tokensTotal: true }
  });

  const used = Math.round((usage._sum.tokensTotal || 0) / TOKENS_PER_CREDIT);
  const limit = (subscription?.plan?.monthlyAICredits || DEFAULT_MONTHLY_CREDITS) + (workspace?.bonusAICredits || 0);
  return { used, limit, remaining: Math.max(0, limit - used), periodStart };
}
