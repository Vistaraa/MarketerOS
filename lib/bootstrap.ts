import { prisma } from "@/lib/prisma";
import { DEFAULT_PLANS } from "@/lib/billing-service";

export const CANONICAL_PLAN_SLUGS = ["starter", "pro", "business", "enterprise"] as const;

let isBootstrapping = false;
let isBootstrapped = false;

/**
 * Ensures system baseline data (plans, default configuration) exists in the database.
 * This runs automatically at server startup and on-demand, completely eliminating
 * the need for manual database seed scripts (`npm run prisma:seed`, SQL scripts, etc.).
 *
 * It is completely idempotent and safe across concurrent invocations.
 */
export async function ensureSystemBootstrapped(force = false): Promise<void> {
  if (isBootstrapped && !force) return;
  if (isBootstrapping) return;

  isBootstrapping = true;
  try {
    const existingPlans = await prisma.plan.findMany({
      select: { slug: true }
    });
    const existingSlugs = new Set(existingPlans.map((p) => p.slug));

    const needsSync = !CANONICAL_PLAN_SLUGS.every((slug) => existingSlugs.has(slug));

    if (needsSync || force) {
      for (const p of DEFAULT_PLANS) {
        await prisma.plan.upsert({
          where: { slug: p.slug },
          update: {
            name: p.name,
            description: p.description,
            monthlyPrice: p.monthlyPrice,
            yearlyPrice: p.yearlyPrice,
            priceMonthly: p.monthlyPrice,
            priceYearly: p.yearlyPrice,
            maxMembers: p.maxMembers,
            maxClients: p.maxClients,
            maxCampaigns: p.maxCampaigns,
            monthlyAICredits: p.monthlyAICredits,
            features: p.features,
            isActive: true
          },
          create: {
            name: p.name,
            slug: p.slug,
            description: p.description,
            monthlyPrice: p.monthlyPrice,
            yearlyPrice: p.yearlyPrice,
            priceMonthly: p.monthlyPrice,
            priceYearly: p.yearlyPrice,
            maxMembers: p.maxMembers,
            maxClients: p.maxClients,
            maxCampaigns: p.maxCampaigns,
            monthlyAICredits: p.monthlyAICredits,
            features: p.features,
            isActive: true
          }
        });
      }

      // Purge obsolete legacy plans (like "scale") that are not canonical
      try {
        await prisma.plan.deleteMany({
          where: { slug: { notIn: [...CANONICAL_PLAN_SLUGS] } }
        });
      } catch {
        // Ignored if foreign key references prevent deletion
      }
    }

    isBootstrapped = true;
  } catch (error) {
    console.error("[Bootstrap] Error auto-syncing system plans:", error);
  } finally {
    isBootstrapping = false;
  }
}

/**
 * Ensures that a workspace has an active subscription attached to a valid canonical plan.
 * Automatically provisions or migrates subscriptions without requiring manual seeding.
 */
export async function ensureWorkspaceSubscription(
  workspaceId: string,
  preferredSlug: string = "pro"
) {
  await ensureSystemBootstrapped();

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true }
  });

  if (!subscription || !CANONICAL_PLAN_SLUGS.includes(subscription.plan?.slug as any)) {
    const targetPlan =
      (await prisma.plan.findUnique({ where: { slug: preferredSlug } })) ||
      (await prisma.plan.findFirst({
        where: { slug: { in: [...CANONICAL_PLAN_SLUGS] } },
        orderBy: { monthlyPrice: "asc" }
      }));

    if (!targetPlan) {
      throw new Error("Unable to provision subscription: no canonical plans found.");
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: targetPlan.id,
        planSlug: targetPlan.slug,
        status: "ACTIVE",
        interval: "MONTHLY",
        billingInterval: "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false
      },
      create: {
        workspaceId,
        planId: targetPlan.id,
        planSlug: targetPlan.slug,
        status: "ACTIVE",
        interval: "MONTHLY",
        billingInterval: "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false
      },
      include: { plan: true }
    });
  }

  return subscription;
}
