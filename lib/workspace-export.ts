import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { sendNoticeEmail } from "@/lib/email";
import { MEMBERSHIP_KEY, normalizeMemberRole } from "@/lib/team-access";

/** Exports can be downloaded for this long, then the file is deleted. */
export const EXPORT_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Never exported: credentials and anything that grants access (encrypted or not). */
const SECRET_KEY = /(encrypted|secret|password|apikey|api_?key|credential|private_?key|hash$|signature|salt|token$|^state$)/i;

/** JSON-safe copy with secrets removed (BigInt → number, Decimal → string via toJSON). */
export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    if (typeof (value as { toJSON?: unknown }).toJSON === "function" && !(value instanceof Date)) {
      const json = (value as { toJSON: () => unknown }).toJSON();
      if (typeof json !== "object") return json;
    }
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key)) continue;
      out[key] = redact(v);
    }
    return out;
  }
  return value;
}

/** Everything the workspace holds, as one JSON document (a portable copy for the DPDP Act / GDPR right of access). */
export async function buildWorkspaceExport(workspaceId: string) {
  const where = { workspaceId };
  const [workspace, memberships, clients, campaigns, campaignMetrics, platformMetrics, leads, content, socialAccounts, socialPosts, automations, insights, reports, aiRequests, integrations, subscription, invoices, auditLogs, notifications, templates, media, hashtagGroups, playApps, playKpis, playReleases, playMessages] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } } }),
    prisma.oAuthState.findMany({ where: { workspaceId, providerKey: MEMBERSHIP_KEY }, select: { returnTo: true, createdAt: true, user: { select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true } } } }),
    prisma.client.findMany({ where }),
    prisma.campaign.findMany({ where }),
    prisma.campaignMetricDaily.findMany({ where: { campaign: { workspaceId } } }),
    prisma.platformMetricDaily.findMany({ where }),
    prisma.lead.findMany({ where }),
    prisma.content.findMany({ where }),
    prisma.socialAccount.findMany({ where }),
    prisma.socialPost.findMany({ where }),
    prisma.automation.findMany({ where }),
    prisma.aIInsight.findMany({ where }),
    prisma.report.findMany({ where }),
    prisma.aIRequest.findMany({ where }),
    prisma.integration.findMany({ where }),
    prisma.subscription.findUnique({ where, include: { plan: { select: { slug: true, name: true } } } }),
    prisma.invoice.findMany({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 10_000 }),
    prisma.notification.findMany({ where }),
    prisma.contentTemplate.findMany({ where }),
    prisma.mediaAsset.findMany({ where }),
    prisma.hashtagGroup.findMany({ where }),
    prisma.playConsoleApp.findMany({ where }),
    prisma.playConsoleKpiDaily.findMany({ where }),
    prisma.playConsoleRelease.findMany({ where }),
    prisma.playConsoleInboxMessage.findMany({ where })
  ]);
  if (!workspace) throw new Error("Workspace not found.");
  return redact({
    format: "marketeros-workspace-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: "Credentials (integration tokens, API keys, password hashes) are never included. Media files are listed by name; download them from the Media Library.",
    workspace,
    members: memberships.map((m) => ({ ...m.user, role: normalizeMemberRole(m.returnTo), joinedAt: m.createdAt })),
    clients,
    campaigns,
    campaignMetricsDaily: campaignMetrics,
    platformMetricsDaily: platformMetrics,
    leads,
    content,
    socialAccounts,
    socialPosts,
    automations,
    aiInsights: insights,
    aiRequests,
    reports,
    integrations,
    subscription,
    invoices,
    auditLog: auditLogs,
    notifications,
    contentStudio: { templates, media, hashtagGroups },
    playConsole: { apps: playApps, kpisDaily: playKpis, releases: playReleases, inboxMessages: playMessages }
  });
}

/** Background job: builds the export, stores it, and emails the requester that it's ready. */
export async function processWorkspaceExport(workspaceId: string, exportId: string) {
  const record = await prisma.workspaceExport.findFirst({ where: { id: exportId, workspaceId } });
  if (!record) throw new Error("Export request not found.");
  try {
    const body = Buffer.from(JSON.stringify(await buildWorkspaceExport(workspaceId), null, 2));
    const storageKey = `exports/${workspaceId}/${exportId}.json`;
    await objectStorage().put(storageKey, body, "application/json");
    const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * DAY_MS);
    await prisma.workspaceExport.update({ where: { id: exportId }, data: { status: "READY", storageKey, sizeBytes: body.length, expiresAt, completedAt: new Date(), errorMessage: null } });
    const requester = record.requestedById ? await prisma.user.findUnique({ where: { id: record.requestedById }, select: { email: true, firstName: true } }) : null;
    if (requester) {
      await sendNoticeEmail({
        to: requester.email,
        recipientName: requester.firstName,
        subject: "Your MarketerOS data export is ready",
        heading: "Your data export is ready",
        body: `the export of your workspace is ready to download from Settings → Data & privacy. For your security the download requires signing in, and the file is deleted after ${EXPORT_TTL_DAYS} days.`,
        actionLabel: "Download export",
        actionUrl: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`,
        footer: "You're receiving this because you requested a data export."
      }).catch((err) => console.error("[export] ready email failed:", err));
    }
    return { exportId, sizeBytes: body.length };
  } catch (error) {
    await prisma.workspaceExport.update({ where: { id: exportId }, data: { status: "FAILED", errorMessage: "The export could not be created. Please try again." } });
    throw error;
  }
}
