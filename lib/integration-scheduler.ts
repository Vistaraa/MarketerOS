import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/jobs";
import { evaluateAccess } from "@/lib/subscription";
import { sendNoticeEmail } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Platforms imported automatically each day, and the job that imports each. */
const SYNCED_PLATFORMS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "TIKTOK", "SHOPIFY", "GOOGLE_PLAY"] as const;
const jobFor = (platform: string) => (platform === "GOOGLE_PLAY" ? "play.import" : "integration.sync");
/** First sync backfills this much history; later syncs re-read a few days so late conversions are counted. */
const BACKFILL_DAYS = 30;
const RESYNC_DAYS = 3;
const TOKEN_WARNING_DAYS = 7;

/**
 * Queues an import for every connected ad account (integration.sync) and Google Play app (play.import) that hasn't
 * synced in a day. Skips accounts that
 * already have a sync queued or running, workspaces whose subscription has lapsed, and workspaces being deleted.
 */
export async function scheduleIntegrationSyncs(now = new Date()) {
  const due = await prisma.integration.findMany({
    where: {
      platform: { in: [...SYNCED_PLATFORMS] },
      status: { in: ["CONNECTED", "ERROR"] },
      // Ad platforms need a stored token; Google Play keeps its credentials (service account or OAuth) in metadata.
      OR: [{ platform: "GOOGLE_PLAY" }, { accessTokenEncrypted: { not: null } }, { apiKeyEncrypted: { not: null } }, { refreshTokenEncrypted: { not: null } }],
      AND: [{ OR: [{ lastSyncFinished: null }, { lastSyncFinished: { lt: new Date(now.getTime() - DAY_MS) } }] }],
      workspace: { deletionScheduledAt: null, status: "ACTIVE" }
    },
    select: { id: true, workspaceId: true, platform: true, lastSyncedAt: true, workspace: { select: { subscription: { select: { status: true, currentPeriodEnd: true, complimentary: true, payuPaymentId: true, payuTxnId: true, razorpayPaymentId: true, stripeSubscriptionId: true } } } } },
    take: 500
  });
  if (!due.length) return { queued: 0, skipped: 0 };
  const busy = new Set(
    (await prisma.backgroundJob.findMany({ where: { name: { in: ["integration.sync", "play.import"] }, status: { in: ["QUEUED", "RUNNING"] }, integrationId: { in: due.map((d) => d.id) } }, select: { integrationId: true } }))
      .map((j) => j.integrationId)
  );
  let queued = 0;
  let skipped = 0;
  for (const integration of due) {
    if (busy.has(integration.id) || evaluateAccess(integration.workspace.subscription as never, now).locked) {
      skipped += 1;
      continue;
    }
    const from = new Date(now.getTime() - (integration.lastSyncedAt ? RESYNC_DAYS : BACKFILL_DAYS) * DAY_MS);
    await enqueueJob(jobFor(integration.platform), { workspaceId: integration.workspaceId, integrationId: integration.id, from: from.toISOString(), to: now.toISOString(), scheduled: true });
    queued += 1;
  }
  return { queued, skipped };
}

/** Emails the workspace owner once when a connection's token is about to expire (Meta tokens last about 60 days). */
export async function warnExpiringTokens(now = new Date()) {
  const expiring = await prisma.integration.findMany({
    where: { status: { in: ["CONNECTED", "ERROR"] }, tokenExpiresAt: { gt: now, lte: new Date(now.getTime() + TOKEN_WARNING_DAYS * DAY_MS) }, refreshTokenEncrypted: null },
    select: { id: true, accountName: true, platform: true, tokenExpiresAt: true, metadata: true, workspace: { select: { id: true, name: true, ownerId: true, owner: { select: { email: true, firstName: true } } } } },
    take: 200
  });
  let warned = 0;
  for (const integration of expiring) {
    const expiresAt = integration.tokenExpiresAt!.toISOString();
    const metadata = (integration.metadata as Record<string, unknown> | null) || {};
    if (metadata.expiryWarningFor === expiresAt) continue;
    await prisma.integration.update({ where: { id: integration.id }, data: { metadata: { ...metadata, expiryWarningFor: expiresAt } as never } });
    const date = integration.tokenExpiresAt!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    const label = integration.accountName || integration.platform;
    await prisma.notification.create({ data: { workspaceId: integration.workspace.id, userId: integration.workspace.ownerId, type: "INTEGRATION", title: `Reconnect ${label}`, message: `Access to ${label} expires on ${date}. Reconnect it in Integrations to keep metrics syncing.`, link: "/integrations" } }).catch(() => undefined);
    await sendNoticeEmail({
      to: integration.workspace.owner.email,
      recipientName: integration.workspace.owner.firstName,
      subject: `Reconnect ${label} before ${date}`,
      heading: `${label} access expires soon`,
      body: `MarketerOS's access to ${label} in "${integration.workspace.name}" expires on ${date}. Reconnect it in Integrations to keep your metrics syncing.`,
      actionLabel: "Reconnect",
      actionUrl: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/integrations`
    }).catch((err) => console.error("[integrations] expiry email failed:", err));
    warned += 1;
  }
  return { warned };
}

/**
 * Regenerates scheduled reports that are due (the job emails their creator) and moves them to their next run.
 * Skipped for lapsed or deleted workspaces.
 */
export async function runScheduledReports(now = new Date()) {
  const due = await prisma.report.findMany({
    where: { scheduleFrequency: { in: ["weekly", "monthly"] }, nextRunAt: { lte: now }, workspace: { deletionScheduledAt: null, status: "ACTIVE" } },
    select: { id: true, workspaceId: true, scheduleFrequency: true, nextRunAt: true, workspace: { select: { subscription: { select: { status: true, currentPeriodEnd: true, complimentary: true, payuPaymentId: true, payuTxnId: true, razorpayPaymentId: true, stripeSubscriptionId: true } } } } },
    take: 200
  });
  let queued = 0;
  for (const report of due) {
    const next = new Date(report.nextRunAt!);
    // Catch up to the first future run (a long outage shouldn't queue a backlog).
    do {
      if (report.scheduleFrequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
      else next.setUTCMonth(next.getUTCMonth() + 1);
    } while (next <= now);
    // Claim it by moving nextRunAt; another instance doing the same matches nothing.
    const claimed = await prisma.report.updateMany({ where: { id: report.id, nextRunAt: report.nextRunAt }, data: { nextRunAt: next } });
    if (!claimed.count || evaluateAccess(report.workspace.subscription as never, now).locked) continue;
    await prisma.report.update({ where: { id: report.id }, data: { status: "GENERATING" } });
    await enqueueJob("report.generate", { workspaceId: report.workspaceId, reportId: report.id, scheduled: true });
    queued += 1;
  }
  return { queued };
}
