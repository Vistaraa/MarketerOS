const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CANONICAL_PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'For solo marketers, boutique creators, and single-client operators',
    monthlyPrice: 49,
    yearlyPrice: 470,
    maxMembers: 3,
    maxClients: 3,
    maxCampaigns: 10,
    monthlyAICredits: 2500,
    features: [
      'Up to 3 Team Members',
      '3 Connected Client Workspaces',
      '10 Active Campaigns',
      '2,500 Monthly AI Generation Credits',
      'Standard Analytics & Reporting',
      'Razorpay Checkout (Card, UPI & Netbanking)'
    ]
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For growing marketing agencies and performance teams scaling revenue',
    monthlyPrice: 199,
    yearlyPrice: 1910,
    maxMembers: 10,
    maxClients: 15,
    maxCampaigns: 50,
    monthlyAICredits: 10000,
    features: [
      'Up to 10 Team Members',
      '15 Connected Client Workspaces',
      '50 Active Campaigns',
      '10,000 Monthly AI Generation Credits',
      'AI Insights & Visual Automations',
      'Exportable Custom PDF Reports',
      'Razorpay Checkout (Card, UPI, Netbanking & Wallets)'
    ]
  },
  {
    slug: 'business',
    name: 'Business',
    description: 'For established performance agencies requiring full scale & custom integrations',
    monthlyPrice: 499,
    yearlyPrice: 4790,
    maxMembers: 25,
    maxClients: 50,
    maxCampaigns: 200,
    monthlyAICredits: 50000,
    features: [
      'Up to 25 Team Members',
      '50 Connected Client Workspaces',
      '200 Active Campaigns',
      '50,000 Monthly AI Generation Credits',
      'Multi-Channel Automation Engine',
      'Dedicated API Token Access',
      'Priority 24/7 Account Support'
    ]
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Custom resource quotas, high-throughput infrastructure, and SLA guarantees',
    monthlyPrice: 999,
    yearlyPrice: 9590,
    maxMembers: 100,
    maxClients: 250,
    maxCampaigns: 1000,
    monthlyAICredits: 250000,
    features: [
      'Unlimited Team Seats',
      '250 Connected Client Workspaces',
      '1,000 Active Campaigns',
      '250,000 Monthly AI Generation Credits',
      'Custom Integrations & Webhook Ingestion',
      '99.9% Uptime Guarantee SLA',
      'Dedicated Enterprise Account Manager'
    ]
  }
];

async function cleanAndSeed() {
  console.log('--- Cleaning dummy data & syncing canonical plans ---');

  // 1. Clean all test invoices so workspaces start with real invoices only
  const deletedInvoices = await prisma.invoice.deleteMany();
  console.log(`Deleted ${deletedInvoices.count} legacy dummy invoices.`);

  // 2. Clear dummy address / tax ID from all workspaces
  const updatedWorkspaces = await prisma.workspace.updateMany({
    data: {
      taxId: null,
      billingAddress: null,
      billingEmail: null
    }
  });
  console.log(`Reset contact details across ${updatedWorkspaces.count} workspaces to clean defaults.`);

  // 3. Upsert canonical plans
  const planMap = {};
  for (const p of CANONICAL_PLANS) {
    const upserted = await prisma.plan.upsert({
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
    planMap[p.slug] = upserted;
    console.log(`Synced plan: ${upserted.name} (${upserted.slug})`);
  }

  // 4. Update all subscriptions to point to Pro plan
  const proPlan = planMap['pro'];
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const allWs = await prisma.workspace.findMany();
  for (const ws of allWs) {
    await prisma.subscription.upsert({
      where: { workspaceId: ws.id },
      update: {
        planId: proPlan.id,
        planSlug: proPlan.slug,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false
      },
      create: {
        workspaceId: ws.id,
        planId: proPlan.id,
        planSlug: proPlan.slug,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false
      }
    });
    console.log(`Updated subscription for workspace ${ws.name} to Pro.`);
  }

  // Remove orphaned scale plan if it has no subscriptions
  try {
    await prisma.plan.deleteMany({
      where: {
        slug: { notIn: ['starter', 'pro', 'business', 'enterprise'] }
      }
    });
    console.log('Removed orphaned non-canonical plans.');
  } catch (e) {
    console.log('Could not remove non-canonical plans (might be referenced):', e.message);
  }

  console.log('--- Database cleanup and plan sync complete ---');
}

cleanAndSeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
