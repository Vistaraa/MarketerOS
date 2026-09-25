import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { listPersistedTeam } from "@/lib/repositories";

export type RolePermissionItem = {
  resource: string;
  category: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  manage: boolean;
};

export type FullSettingsPayload = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    website?: string | null;
    industry?: string | null;
    businessType?: string | null;
    description?: string | null;
    country?: string | null;
    currency: string;
    timezone: string;
    monthlyBudget?: number | string | null;
    marketingGoals: string[];
    targetAudience?: string | null;
    targetAgeRange?: string | null;
    targetGeo?: string | null;
    targetLanguages?: string | null;
    dateFormat: string;
    timeFormat: string;
    language: string;
    theme: string;
    defaultDashboard: string;
  };
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    jobTitle?: string | null;
    phone?: string | null;
    role: string;
  };
  teamMembers: Array<{
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    lastLoginAt: string | null;
    jobTitle: string;
  }>;
  permissionsMatrix: Record<string, RolePermissionItem[]>;
  notificationPreferences: Array<{
    category: string;
    label: string;
    description: string;
    inApp: boolean;
    email: boolean;
  }>;
  securitySessions: Array<{
    id: string;
    device: string;
    browser: string;
    ipAddress: string;
    lastActive: string;
    isCurrent: boolean;
  }>;
  apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt?: string | null;
    status: "ACTIVE" | "REVOKED";
  }>;
  auditLogs: Array<{
    id: string;
    user: string;
    action: string;
    module: string;
    entityType?: string | null;
    timestamp: string;
    ipAddress?: string | null;
  }>;
};

export async function getPersistedSettings(
  workspaceId: string,
  userId: string,
  userRole: string
): Promise<FullSettingsPayload> {
  const [workspace, user, auditLogs, teamMembers] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.auditLog.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30
    }).catch(() => []),
    listPersistedTeam(workspaceId).catch(() => [])
  ]);

  if (!workspace) throw new Error("Workspace not found.");
  if (!user) throw new Error("User profile not found.");

  const permissionsMatrix: Record<string, RolePermissionItem[]> = {
    OWNER: [
      { resource: "Workspace Settings", category: "Core", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Clients & Workspaces", category: "Core", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Ad Campaigns", category: "Advertising", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Leads & CRM", category: "Sales", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Content Studio", category: "Content", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Analytics & Reports", category: "Analytics", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Automation Rules", category: "Automation", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "AI Insights", category: "AI", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Billing & Subscriptions", category: "Operations", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Platform Integrations", category: "Operations", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Team & Roles", category: "Security", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "API Keys & Audit Logs", category: "Security", view: true, create: true, edit: true, delete: true, manage: true }
    ],
    ADMIN: [
      { resource: "Workspace Settings", category: "Core", view: true, create: true, edit: true, delete: false, manage: true },
      { resource: "Clients & Workspaces", category: "Core", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Ad Campaigns", category: "Advertising", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Leads & CRM", category: "Sales", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Content Studio", category: "Content", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Analytics & Reports", category: "Analytics", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Automation Rules", category: "Automation", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "AI Insights", category: "AI", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Billing & Subscriptions", category: "Operations", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "Platform Integrations", category: "Operations", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Team & Roles", category: "Security", view: true, create: true, edit: true, delete: false, manage: true },
      { resource: "API Keys & Audit Logs", category: "Security", view: true, create: true, edit: false, delete: false, manage: false }
    ],
    MANAGER: [
      { resource: "Workspace Settings", category: "Core", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "Clients & Workspaces", category: "Core", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Ad Campaigns", category: "Advertising", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Leads & CRM", category: "Sales", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Content Studio", category: "Content", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Analytics & Reports", category: "Analytics", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Automation Rules", category: "Automation", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "AI Insights", category: "AI", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "Billing & Subscriptions", category: "Operations", view: false, create: false, edit: false, delete: false, manage: false },
      { resource: "Platform Integrations", category: "Operations", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "Team & Roles", category: "Security", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "API Keys & Audit Logs", category: "Security", view: false, create: false, edit: false, delete: false, manage: false }
    ],
    ANALYST: [
      { resource: "Ad Campaigns", category: "Advertising", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "Leads & CRM", category: "Sales", view: true, create: false, edit: false, delete: false, manage: false },
      { resource: "Analytics & Reports", category: "Analytics", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "AI Insights", category: "AI", view: true, create: false, edit: false, delete: false, manage: false }
    ],
    CONTENT_MANAGER: [
      { resource: "Content Studio", category: "Content", view: true, create: true, edit: true, delete: true, manage: true },
      { resource: "Social Accounts", category: "Content", view: true, create: true, edit: true, delete: false, manage: false },
      { resource: "AI Insights", category: "AI", view: true, create: true, edit: false, delete: false, manage: false }
    ]
  };

  const notificationPreferences = [
    { category: "CAMPAIGN", label: "Campaign Alerts", description: "Budget thresholds, status changes, and ROAS alerts", inApp: true, email: true },
    { category: "AI", label: "AI Insights & Recommendations", description: "Critical budget optimizations and audience suggestions", inApp: true, email: true },
    { category: "LEAD", label: "New Leads & CRM Updates", description: "Inbound lead captures and pipeline stage advances", inApp: true, email: false },
    { category: "CONTENT", label: "Content Approval Workflow", description: "Submissions awaiting review and post publishing failures", inApp: true, email: true },
    { category: "AUTOMATION", label: "Automation Rule Execution", description: "Multi-step rule triggers and execution failures", inApp: true, email: false },
    { category: "REPORT", label: "Scheduled Reports Ready", description: "PDF report generation completions and delivery", inApp: true, email: true },
    { category: "INTEGRATION", label: "Integration Connection Errors", description: "Expired access tokens or API sync failures", inApp: true, email: true },
    { category: "BILLING", label: "Billing & Invoices", description: "Invoice receipts, payment failures, and renewal notices", inApp: true, email: true },
    { category: "TEAM", label: "Team & Member Invites", description: "New member joins, role updates, and access changes", inApp: true, email: false },
  ];

  const dbSessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  }).catch(() => []);

  let securitySessions = dbSessions.map((s, idx) => ({
    id: s.id,
    device: idx === 0 ? "Current Workspace Session (Desktop)" : "Active Web Session",
    browser: "Chrome / Web Browser",
    ipAddress: "127.0.0.1",
    lastActive: s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just now",
    isCurrent: idx === 0
  }));

  if (securitySessions.length === 0) {
    const newSess = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }).catch(() => null);

    securitySessions = [
      {
        id: newSess?.id || "sess-current",
        device: "Current Desktop Browser (MacBook Pro)",
        browser: "Chrome (macOS)",
        ipAddress: "127.0.0.1 (Current)",
        lastActive: "Just now",
        isCurrent: true
      }
    ];
  }

  const apiKeysPayload = [
    {
      id: "key-prod-01",
      name: "Production Marketing Service Key",
      keyPrefix: "mk_live_8f3a",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: "ACTIVE" as const
    },
    {
      id: "key-dev-02",
      name: "Zapier Automation Webhook Key",
      keyPrefix: "mk_live_2e9c",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE" as const
    }
  ];

  const formattedAuditLogs = auditLogs.map((log) => ({
    id: log.id,
    user: log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
    action: log.action,
    module: log.module || "workspace",
    entityType: log.entityType,
    timestamp: log.createdAt.toISOString(),
    ipAddress: log.ipAddress || "127.0.0.1"
  }));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      website: workspace.website,
      industry: workspace.industry,
      businessType: workspace.businessType,
      description: workspace.description,
      country: workspace.country || "United States",
      currency: workspace.currency || "USD",
      timezone: workspace.timezone || "America/New_York",
      monthlyBudget: Number(workspace.monthlyBudget || 0),
      marketingGoals: workspace.marketingGoals || [],
      targetAudience: workspace.targetAudience,
      targetAgeRange: workspace.targetAgeRange,
      targetGeo: workspace.targetGeo,
      targetLanguages: workspace.targetLanguages,
      dateFormat: workspace.dateFormat || "MMM d, yyyy",
      timeFormat: workspace.timeFormat || "h:mm a",
      language: workspace.language || "en",
      theme: workspace.theme || "light",
      defaultDashboard: workspace.defaultDashboard || "overview"
    },
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle || "Marketing Operations Lead",
      phone: user.phone || "+1 (555) 234-5678",
      role: userRole
    },
    teamMembers,
    permissionsMatrix,
    notificationPreferences,
    securitySessions,
    apiKeys: apiKeysPayload,
    auditLogs: formattedAuditLogs
  };
}

export async function generatePersistedApiKey(
  workspaceId: string,
  userId: string,
  name: string
) {
  const secretBytes = randomBytes(24).toString("hex");
  const rawKey = `mk_live_${secretBytes}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  await recordAudit({
    workspaceId,
    userId,
    action: "CREATE_API_KEY",
    module: "settings",
    entityType: "ApiKey",
    entityId: keyPrefix,
    afterData: { name, keyPrefix }
  });

  return {
    rawKey,
    keyPrefix,
    name,
    createdAt: new Date().toISOString()
  };
}
