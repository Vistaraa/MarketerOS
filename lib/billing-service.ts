import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isRazorpayConfigured, getRazorpayKeyId, CREDIT_PACKS } from "@/lib/razorpay";

export type ResourceLimitStatus = "NORMAL" | "WARNING" | "LIMIT_REACHED" | "OVER_LIMIT";

export type ResourceUsageItem = {
  key: string;
  name: string;
  used: number;
  limit: number;
  percentage: number;
  remaining: number;
  unit: string;
  status: ResourceLimitStatus;
};

export type InvoiceItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
};

export type BillingOverviewPayload = {
  subscription: {
    id: string;
    status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED" | "PAUSED" | "INCOMPLETE";
    interval: "MONTHLY" | "YEARLY";
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEnd?: string | null;
    razorpaySubscriptionId?: string | null;
    razorpayPaymentId?: string | null;
    plan: {
      id: string;
      slug: string;
      name: string;
      monthlyPrice: number;
      yearlyPrice: number;
      description?: string | null;
    };
  } | null;
  plans: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    maxMembers: number;
    maxClients: number;
    maxCampaigns: number;
    monthlyAICredits: number;
    features: string[];
    isCurrent: boolean;
  }>;
  usage: ResourceUsageItem[];
  kpis: {
    currentPlanName: string;
    monthlyCost: number;
    billingCycle: string;
    nextBillingDate: string;
    usedSeats: number;
    totalSeats: number;
    aiCreditsUsed: number;
    aiCreditsLimit: number;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: "PAID" | "OPEN" | "VOID" | "UNCOLLECTIBLE" | "DRAFT";
    invoiceDate: string;
    dueDate?: string | null;
    paidAt?: string | null;
    pdfUrl?: string | null;
    razorpayPaymentId?: string | null;
    razorpayOrderId?: string | null;
    items?: InvoiceItem[];
  }>;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
    holderName?: string;
    type: "card" | "upi" | "gateway";
  }>;
  billingHistory: Array<{
    id: string;
    action: string;
    amount?: number;
    timestamp: string;
    status: string;
    actor: string;
  }>;
  credits: {
    included: number;
    purchased: number;
    consumed: number;
    remaining: number;
    resetDate: string;
  };
  billingContact: {
    companyName: string;
    billingEmail: string;
    taxId: string;
    address: string;
    country: string;
    currency: string;
  };
  gateway: {
    provider: "razorpay";
    isConfigured: boolean;
    keyId: string;
    supportedMethods: string[];
  };
};

export const DEFAULT_PLANS = [
  {
    id: "plan-starter",
    slug: "starter",
    name: "Starter",
    description: "For solo marketers, boutique creators, and single-client operators",
    monthlyPrice: 49,
    yearlyPrice: 470,
    maxMembers: 3,
    maxClients: 3,
    maxCampaigns: 10,
    monthlyAICredits: 2500,
    features: [
      "Up to 3 Team Members",
      "3 Connected Client Workspaces",
      "10 Active Campaigns",
      "2,500 Monthly AI Generation Credits",
      "Standard Analytics & Reporting",
      "Razorpay Checkout (Card & UPI)"
    ]
  },
  {
    id: "plan-pro",
    slug: "pro",
    name: "Pro",
    description: "For growing marketing agencies and performance teams scaling revenue",
    monthlyPrice: 199,
    yearlyPrice: 1910,
    maxMembers: 10,
    maxClients: 15,
    maxCampaigns: 50,
    monthlyAICredits: 10000,
    features: [
      "Up to 10 Team Members",
      "15 Connected Client Workspaces",
      "50 Active Campaigns",
      "10,000 Monthly AI Generation Credits",
      "AI Insights & Visual Automations",
      "Exportable Custom PDF Reports",
      "Razorpay Checkout (Card, UPI, Netbanking)"
    ]
  },
  {
    id: "plan-business",
    slug: "business",
    name: "Business",
    description: "For established performance agencies requiring full scale & custom integrations",
    monthlyPrice: 499,
    yearlyPrice: 4790,
    maxMembers: 25,
    maxClients: 50,
    maxCampaigns: 200,
    monthlyAICredits: 50000,
    features: [
      "Up to 25 Team Members",
      "50 Connected Client Workspaces",
      "200 Active Campaigns",
      "50,000 Monthly AI Generation Credits",
      "Multi-Channel Automation Engine",
      "Dedicated API Token Access",
      "Priority 24/7 Account Support"
    ]
  },
  {
    id: "plan-enterprise",
    slug: "enterprise",
    name: "Enterprise",
    description: "Custom resource quotas, high-throughput infrastructure, and SLA guarantees",
    monthlyPrice: 999,
    yearlyPrice: 9590,
    maxMembers: 100,
    maxClients: 250,
    maxCampaigns: 1000,
    monthlyAICredits: 250000,
    features: [
      "Unlimited Team Seats",
      "250+ Client Workspaces",
      "1,000+ Active Campaigns",
      "250,000 Monthly AI Generation Credits",
      "Custom Workflow & Tool Integrations",
      "99.9% Uptime Guarantee SLA",
      "Dedicated Enterprise Account Manager"
    ]
  }
];

/**
 * Generates an invoice number guaranteed to be unique across all workspaces.
 */
export async function generateUniqueInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    const candidate = `INV-${year}-${stamp}-${random}`;
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!existing) {
      return candidate;
    }
  }
  return `INV-${year}-${Date.now()}-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * Creates an Invoice record with automatic retry to prevent unique constraint collisions.
 */
async function createInvoiceWithRetry(data: {
  workspaceId: string;
  amount: number;
  currency: string;
  status: "PAID";
  invoiceDate: Date;
  paidAt: Date;
  providerInvoiceId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = await generateUniqueInvoiceNumber();
    try {
      return await prisma.invoice.create({
        data: {
          ...data,
          invoiceNumber
        }
      });
    } catch (err: any) {
      if (err?.code === "P2002" && attempt < 4) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to create unique invoice record.");
}

export async function getPersistedBillingOverview(workspaceId: string): Promise<BillingOverviewPayload> {
  let [workspace, subscription, dbPlans, invoices, auditLogs] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: true,
        _count: {
          select: {
            clients: true,
            campaigns: true,
            leads: true,
            content: true,
            socialAccounts: true,
            automations: true,
            reports: true
          }
        }
      }
    }),
    prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true }
    }),
    prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } }),
    prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { invoiceDate: "desc" },
      take: 50
    }),
    prisma.auditLog.findMany({
      where: { workspaceId, module: "billing" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  if (!workspace) throw new Error("Workspace not found.");

  // Seed plans into DB if missing
  if (!dbPlans.length) {
    for (const p of DEFAULT_PLANS) {
      await prisma.plan.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          maxMembers: p.maxMembers,
          maxClients: p.maxClients,
          maxCampaigns: p.maxCampaigns,
          monthlyAICredits: p.monthlyAICredits,
          features: p.features
        }
      });
    }
    dbPlans = await prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } });
  }

  // Ensure an active subscription exists in DB
  if (!subscription) {
    const proPlan = dbPlans.find((p) => p.slug === "pro") || dbPlans[0];
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription = await prisma.subscription.create({
      data: {
        workspaceId,
        planId: proPlan.id,
        planSlug: proPlan.slug,
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

  // Count active team members
  const userCount = await prisma.user.count({
    where: { ownedWorkspaces: { some: { id: workspaceId } } }
  });

  // Calculate live AI Token Consumption
  const aiTokensResult = await prisma.aIRequest.aggregate({
    where: { workspaceId },
    _sum: { tokensTotal: true }
  });
  const aiCreditsUsed = Math.round((aiTokensResult._sum.tokensTotal || 0) / 100);

  const activePlanSlug = subscription.plan.slug || "pro";
  const currentPlan = subscription.plan;

  const maxMembers = currentPlan.maxMembers || 10;
  const maxClients = currentPlan.maxClients || 15;
  const maxCampaigns = currentPlan.maxCampaigns || 50;
  const planIncludedCredits = currentPlan.monthlyAICredits || 10000;
  const bonusCredits = workspace.bonusAICredits || 0;
  const totalAICredits = planIncludedCredits + bonusCredits;

  function calcUsageItem(
    key: string,
    name: string,
    used: number,
    limit: number,
    unit: string
  ): ResourceUsageItem {
    const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const remaining = Math.max(0, limit - used);
    let status: ResourceLimitStatus = "NORMAL";
    if (percentage >= 100) status = "LIMIT_REACHED";
    else if (percentage >= 80) status = "WARNING";

    return { key, name, used, limit, percentage, remaining, unit, status };
  }

  const planMultiplier = activePlanSlug === "starter" ? 1 : activePlanSlug === "pro" ? 5 : activePlanSlug === "business" ? 25 : 100;
  const leadsQuota = 1000 * planMultiplier;
  const contentQuota = 100 * planMultiplier;
  const socialQuota = 5 * planMultiplier;
  const automationsQuota = 5 * planMultiplier;
  const reportsQuota = 10 * planMultiplier;

  const usage: ResourceUsageItem[] = [
    calcUsageItem("seats", "Team Seats", userCount, maxMembers, "seats"),
    calcUsageItem("clients", "Client Workspaces", workspace._count.clients, maxClients, "clients"),
    calcUsageItem("campaigns", "Active Campaigns", workspace._count.campaigns, maxCampaigns, "campaigns"),
    calcUsageItem("ai_credits", "Monthly AI Credits", aiCreditsUsed, totalAICredits, "credits"),
    calcUsageItem("leads", "Leads CRM Database", workspace._count.leads, leadsQuota, "leads"),
    calcUsageItem("content", "Content Studio Library", workspace._count.content, contentQuota, "items"),
    calcUsageItem("social_accounts", "Connected Social Channels", workspace._count.socialAccounts, socialQuota, "channels"),
    calcUsageItem("automations", "Automation Engine Rules", workspace._count.automations, automationsQuota, "rules"),
    calcUsageItem("reports", "Generated Reports", workspace._count.reports, reportsQuota, "reports")
  ];

  const plansPayload = dbPlans.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description || "",
    monthlyPrice: Number(p.monthlyPrice || p.priceMonthly || 0),
    yearlyPrice: Number(p.yearlyPrice || p.priceYearly || 0),
    maxMembers: p.maxMembers || 10,
    maxClients: p.maxClients || 15,
    maxCampaigns: p.maxCampaigns || 50,
    monthlyAICredits: p.monthlyAICredits || 10000,
    features: p.features || [],
    isCurrent: p.slug === activePlanSlug
  }));

  const formattedInvoices = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status as "PAID" | "OPEN" | "VOID" | "UNCOLLECTIBLE" | "DRAFT",
    invoiceDate: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate?.toISOString(),
    paidAt: inv.paidAt?.toISOString(),
    pdfUrl: inv.pdfUrl,
    razorpayPaymentId: inv.razorpayPaymentId || inv.providerInvoiceId,
    razorpayOrderId: inv.razorpayOrderId,
    items: Array.isArray(inv.items) ? (inv.items as InvoiceItem[]) : undefined
  }));

  // Dynamic Payment Methods: only show verified methods from real paid invoices
  const paymentMethods: BillingOverviewPayload["paymentMethods"] = [];
  const paidInvoicesWithGateway = invoices.filter(
    (i) => i.status === "PAID" && (i.razorpayPaymentId || i.providerInvoiceId)
  );

  const seenRefs = new Set<string>();
  for (const inv of paidInvoicesWithGateway) {
    const ref = inv.razorpayPaymentId || inv.providerInvoiceId;
    if (ref && !seenRefs.has(ref)) {
      seenRefs.add(ref);
      paymentMethods.push({
        id: `pm-${inv.id}`,
        brand: "Razorpay Gateway Token",
        last4: ref.slice(-4),
        expMonth: 0,
        expYear: 0,
        isDefault: paymentMethods.length === 0,
        holderName: workspace.name,
        type: "gateway"
      });
    }
  }

  const formattedHistory = auditLogs.map((log) => ({
    id: log.id,
    action: log.description || log.action.replaceAll("_", " "),
    timestamp: log.createdAt.toISOString(),
    status: "Completed",
    actor: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Razorpay Engine"
  }));

  const resetDate = subscription.currentPeriodEnd.toISOString();
  const isYearly = subscription.interval === "YEARLY";
  const monthlyCost = isYearly
    ? Math.round(Number(currentPlan.yearlyPrice || 1990) / 12)
    : Number(currentPlan.monthlyPrice || 199);

  return {
    subscription: {
      id: subscription.id,
      status: subscription.status as "ACTIVE",
      interval: subscription.interval as "MONTHLY" | "YEARLY",
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      razorpayPaymentId: subscription.razorpayPaymentId,
      plan: {
        id: currentPlan.id,
        slug: currentPlan.slug,
        name: currentPlan.name,
        monthlyPrice: Number(currentPlan.monthlyPrice || 199),
        yearlyPrice: Number(currentPlan.yearlyPrice || 1990),
        description: currentPlan.description
      }
    },
    plans: plansPayload,
    usage,
    kpis: {
      currentPlanName: currentPlan.name,
      monthlyCost,
      billingCycle: isYearly ? "Annual" : "Monthly",
      nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      usedSeats: userCount,
      totalSeats: maxMembers,
      aiCreditsUsed,
      aiCreditsLimit: totalAICredits
    },
    invoices: formattedInvoices,
    paymentMethods,
    billingHistory: formattedHistory,
    credits: {
      included: planIncludedCredits,
      purchased: bonusCredits,
      consumed: aiCreditsUsed,
      remaining: Math.max(0, totalAICredits - aiCreditsUsed),
      resetDate
    },
    billingContact: {
      companyName: workspace.name || "",
      billingEmail: workspace.billingEmail || workspace.owner?.email || "",
      taxId: workspace.taxId || "",
      address: workspace.billingAddress || "",
      country: workspace.country || "",
      currency: workspace.currency || "USD"
    },
    gateway: {
      provider: "razorpay",
      isConfigured: isRazorpayConfigured(),
      keyId: getRazorpayKeyId(),
      supportedMethods: ["Cards (Credit/Debit)", "UPI (GooglePay, PhonePe, Paytm)", "Netbanking", "Wallets"]
    }
  };
}

/**
 * Updates Billing Contact & Tax information persisted in the Workspace database record.
 */
export async function updatePersistedBillingContact(
  workspaceId: string,
  userId: string,
  data: {
    companyName?: string;
    billingEmail?: string;
    taxId?: string;
    address?: string;
    country?: string;
    currency?: string;
  }
) {
  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(data.companyName !== undefined ? { name: data.companyName.trim() } : {}),
      ...(data.billingEmail !== undefined ? { billingEmail: data.billingEmail.trim().toLowerCase() } : {}),
      ...(data.taxId !== undefined ? { taxId: data.taxId.trim() } : {}),
      ...(data.address !== undefined ? { billingAddress: data.address.trim() } : {}),
      ...(data.country !== undefined ? { country: data.country.trim() } : {}),
      ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {})
    }
  });

  await recordAudit({
    workspaceId,
    userId,
    action: "UPDATE_BILLING_SETTINGS",
    module: "billing",
    entityType: "Workspace",
    entityId: workspaceId,
    afterData: data
  });

  return updated;
}

/**
 * Processes a verified payment transaction (for plan upgrade or AI credit pack),
 * generates an official Invoice with a conflict-free unique invoice number,
 * updates subscription or credit balances, and logs notifications.
 */
export async function processSuccessfulPayment(input: {
  workspaceId: string;
  userId: string;
  type: "subscription" | "credits";
  planSlug?: string;
  interval?: "monthly" | "yearly";
  packId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}) {
  const { workspaceId, userId, type, planSlug, interval = "monthly", packId } = input;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: true }
  });
  if (!workspace) throw new Error("Workspace not found.");

  if (type === "subscription" && planSlug) {
    let plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      const defaultPlan = DEFAULT_PLANS.find((p) => p.slug === planSlug) || DEFAULT_PLANS[1];
      plan = await prisma.plan.create({
        data: {
          name: defaultPlan.name,
          slug: defaultPlan.slug,
          description: defaultPlan.description,
          monthlyPrice: defaultPlan.monthlyPrice,
          yearlyPrice: defaultPlan.yearlyPrice,
          maxMembers: defaultPlan.maxMembers,
          maxClients: defaultPlan.maxClients,
          maxCampaigns: defaultPlan.maxCampaigns,
          monthlyAICredits: defaultPlan.monthlyAICredits,
          features: defaultPlan.features
        }
      });
    }

    const price = interval === "yearly"
      ? Number(plan.yearlyPrice || 1990)
      : Number(plan.monthlyPrice || 199);

    const periodEnd = new Date();
    if (interval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const updatedSubscription = await prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: plan.id,
        planSlug: plan.slug,
        status: "ACTIVE",
        interval: interval === "yearly" ? "YEARLY" : "MONTHLY",
        billingInterval: interval === "yearly" ? "YEARLY" : "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpayPaymentId: input.razorpayPaymentId || `pay_${Date.now()}`
      },
      create: {
        workspaceId,
        planId: plan.id,
        planSlug: plan.slug,
        status: "ACTIVE",
        interval: interval === "yearly" ? "YEARLY" : "MONTHLY",
        billingInterval: interval === "yearly" ? "YEARLY" : "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        razorpayPaymentId: input.razorpayPaymentId || `pay_${Date.now()}`
      }
    });

    // Create Invoice record with collision retry
    const invoice = await createInvoiceWithRetry({
      workspaceId,
      amount: price,
      currency: workspace.currency || "USD",
      status: "PAID",
      invoiceDate: new Date(),
      paidAt: new Date(),
      providerInvoiceId: input.razorpayPaymentId || `pay_${Date.now()}`,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      items: [
        {
          description: `${plan.name} Plan - ${interval === "yearly" ? "Annual" : "Monthly"} Subscription`,
          quantity: 1,
          unitPrice: price,
          amount: price
        }
      ]
    });

    // Record Audit Log
    await recordAudit({
      workspaceId,
      userId,
      action: "SUBSCRIPTION_PAYMENT_SUCCESS",
      module: "billing",
      entityType: "Subscription",
      entityId: updatedSubscription.id,
      afterData: {
        planSlug: plan.slug,
        interval,
        amount: price,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: input.razorpayPaymentId
      }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        workspaceId,
        userId: workspace.ownerId,
        type: "BILLING",
        title: "Subscription Upgraded",
        message: `Your workspace subscription was successfully upgraded to ${plan.name} (${interval}). Invoice ${invoice.invoiceNumber} is available.`,
        link: "/billing"
      }
    });

    return { subscription: updatedSubscription, invoice };
  }

  if (type === "credits" && packId) {
    const pack = CREDIT_PACKS.find((p) => p.id === packId) || CREDIT_PACKS[0];

    // Increment bonus credits on workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        bonusAICredits: { increment: pack.credits }
      }
    });

    // Create Invoice record for credits purchase with collision retry
    const invoice = await createInvoiceWithRetry({
      workspaceId,
      amount: pack.price,
      currency: workspace.currency || "USD",
      status: "PAID",
      invoiceDate: new Date(),
      paidAt: new Date(),
      providerInvoiceId: input.razorpayPaymentId || `pay_${Date.now()}`,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      items: [
        {
          description: `${pack.name} - ${pack.credits.toLocaleString()} AI Generation Credits`,
          quantity: 1,
          unitPrice: pack.price,
          amount: pack.price
        }
      ]
    });

    // Record Audit Log
    await recordAudit({
      workspaceId,
      userId,
      action: "CREDITS_PURCHASE_SUCCESS",
      module: "billing",
      entityType: "AIRequest",
      entityId: invoice.id,
      afterData: {
        packId: pack.id,
        creditsPurchased: pack.credits,
        totalBonusCredits: updatedWorkspace.bonusAICredits,
        amount: pack.price,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: input.razorpayPaymentId
      }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        workspaceId,
        userId: workspace.ownerId,
        type: "BILLING",
        title: "AI Credits Added",
        message: `Successfully purchased ${pack.credits.toLocaleString()} AI Generation Credits. Transaction ${invoice.invoiceNumber} confirmed.`,
        link: "/billing"
      }
    });

    return { workspace: updatedWorkspace, invoice };
  }

  throw new Error("Invalid payment request type or parameters.");
}

/**
 * Cancels a subscription at period end.
 */
export async function cancelPersistedSubscription(workspaceId: string, userId: string) {
  const updated = await prisma.subscription.updateMany({
    where: { workspaceId },
    data: {
      cancelAtPeriodEnd: true,
      status: "CANCELLED"
    }
  });

  await recordAudit({
    workspaceId,
    userId,
    action: "CANCEL_SUBSCRIPTION",
    module: "billing",
    entityType: "Subscription",
    entityId: workspaceId
  });

  return updated;
}
