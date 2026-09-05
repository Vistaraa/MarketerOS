import { PrismaClient, CampaignObjective, CampaignStatus, CampaignType, Platform } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "rohan@acme.com" },
    update: { firstName: "Rohan", lastName: "Mehta", passwordHash, emailVerifiedAt: new Date() },
    create: { email: "rohan@acme.com", firstName: "Rohan", lastName: "Mehta", jobTitle: "Agency Admin", passwordHash, emailVerifiedAt: new Date() }
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "acme-corp" },
    update: { name: "Acme Corp", ownerId: user.id },
    create: { name: "Acme Corp", slug: "acme-corp", ownerId: user.id, industry: "E-commerce", businessType: "B2C", country: "India", currency: "USD", timezone: "Asia/Kolkata", monthlyBudget: 10000 }
  });

  const client = await prisma.client.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "acme-corp" } },
    update: {},
    create: { workspaceId: workspace.id, name: "Acme Corp", slug: "acme-corp", industry: "E-commerce", website: "https://acmecorp.com", monthlyBudget: 10000 }
  });

  await prisma.integration.upsert({
    where: { id: "seed-google-ads" },
    update: { status: "PENDING", accountName: null, accountId: null, lastSyncedAt: null, errorMessage: "Provider credentials are not configured." },
    create: { id: "seed-google-ads", workspaceId: workspace.id, clientId: client.id, platform: Platform.GOOGLE_ADS, status: "PENDING", scopes: [] }
  });

  const providerProducts: Array<{ key: string; platform: Platform }> = [
    { key: "google_analytics", platform: Platform.GOOGLE_ANALYTICS },
    { key: "google_search_console", platform: Platform.GOOGLE_SEARCH_CONSOLE },
    { key: "google_firebase", platform: Platform.FIREBASE_ADMOB },
    { key: "google_admob", platform: Platform.FIREBASE_ADMOB },
    { key: "google_youtube", platform: Platform.YOUTUBE },
    { key: "google_business_profile", platform: Platform.GOOGLE_BUSINESS_PROFILE },
    { key: "meta_ads", platform: Platform.META_ADS },
    { key: "meta_facebook", platform: Platform.FACEBOOK },
    { key: "meta_instagram", platform: Platform.INSTAGRAM },
    { key: "meta_messenger", platform: Platform.MESSENGER },
    { key: "meta_whatsapp", platform: Platform.WHATSAPP }
  ];
  for (const product of providerProducts) {
    await prisma.integration.upsert({
      where: { id: `seed-${product.key}` },
      update: { status: "DISCONNECTED", accountName: null, accountId: null, errorMessage: "Provider credentials are not configured." },
      create: { id: `seed-${product.key}`, workspaceId: workspace.id, clientId: client.id, platform: product.platform, status: "DISCONNECTED", scopes: [] }
    });
  }

  await prisma.campaign.upsert({
    where: { id: "seed-campaign-summer" },
    update: { spend: 5420, conversions: 832, clicks: 32145, status: CampaignStatus.ACTIVE },
    create: { id: "seed-campaign-summer", workspaceId: workspace.id, clientId: client.id, createdById: user.id, integrationId: "seed-google-ads", name: "Summer Sale Campaign", platform: Platform.GOOGLE_ADS, status: CampaignStatus.ACTIVE, objective: CampaignObjective.SALES, type: CampaignType.SEARCH, budget: 5000, dailyBudget: 5000, spend: 5420, clicks: 32145, conversions: 832, revenue: 20704, ctr: 2.45, cpa: 6.51, roas: 3.82, startDate: new Date("2024-05-01") }
  });

  const plan = await prisma.plan.upsert({
    where: { slug: "scale" },
    update: {},
    create: {
      name: "Scale",
      slug: "scale",
      description: "For teams ready to turn insight into action.",
      priceMonthly: 299,
      priceYearly: 2990
    }
  });
  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: { planId: plan.id },
    create: {
      workspaceId: workspace.id,
      planId: plan.id,
      status: "ACTIVE",
      interval: "MONTHLY",
      currentPeriodStart: new Date("2024-06-01"),
      currentPeriodEnd: new Date("2024-07-01")
    }
  });

  console.log(`Seeded MarketerOS workspace ${workspace.slug}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
