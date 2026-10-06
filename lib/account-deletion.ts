import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { revokeAllUserSessions } from "@/lib/auth-server";
import { sendNoticeEmail } from "@/lib/email";
import { objectStorage } from "@/lib/storage";
import { MEMBERSHIP_KEY } from "@/lib/team-access";

/** Deletion requests can be cancelled for this long; then the data is purged for good. */
export const DELETION_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DeletionResult = { ok: true; purgeAt: string } | { ok: false; status: number; code: string; message: string };

const fail = (status: number, code: string, message: string) => ({ ok: false as const, status, code, message });
const purgeDate = (scheduledAt: Date) => new Date(scheduledAt.getTime() + DELETION_GRACE_DAYS * DAY_MS);
const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Destructive actions are confirmed with the account password. */
export async function verifyPassword(userId: string, password: unknown) {
  if (typeof password !== "string" || !password) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(user?.passwordHash && (await bcrypt.compare(password, user.passwordHash)));
}

/** People other than the owner with access to (or a pending invitation to) the workspace. */
async function otherPeople(workspaceId: string, ownerId: string) {
  const rows = await prisma.oAuthState.findMany({
    where: { workspaceId, userId: { not: null }, OR: [{ providerKey: MEMBERSHIP_KEY }, { providerKey: "TEAM_INVITE", consumedAt: null }] },
    select: { userId: true }
  });
  return Array.from(new Set(rows.map((r) => r.userId as string))).filter((id) => id !== ownerId);
}

/** Owner only: the workspace and everything in it is purged after the grace period, unless cancelled. */
export async function scheduleWorkspaceDeletion(workspaceId: string, userId: string): Promise<DeletionResult> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { owner: { select: { email: true, firstName: true } } } });
  if (!workspace) return fail(404, "NOT_FOUND", "Workspace not found.");
  if (workspace.ownerId !== userId) return fail(403, "FORBIDDEN", "Only the workspace owner can delete the workspace.");
  const scheduledAt = workspace.deletionScheduledAt || new Date();
  if (!workspace.deletionScheduledAt) {
    await prisma.workspace.update({ where: { id: workspaceId }, data: { deletionScheduledAt: scheduledAt } });
    await recordAudit({ workspaceId, userId, action: "SCHEDULE_DELETION", module: "settings", entityType: "Workspace", entityId: workspaceId, afterData: { purgeAt: purgeDate(scheduledAt).toISOString() } });
    await sendNoticeEmail({
      to: workspace.owner.email,
      recipientName: workspace.owner.firstName,
      subject: `"${workspace.name}" will be deleted on ${formatDate(purgeDate(scheduledAt))}`,
      heading: "Workspace deletion scheduled",
      body: `"${workspace.name}" and all of its data will be permanently deleted on ${formatDate(purgeDate(scheduledAt))}. Until then you can cancel this in Settings. If you didn't request this, cancel it and change your password.`,
      actionLabel: "Review in Settings",
      actionUrl: `${appUrl()}/settings`
    }).catch((err) => console.error("[deletion] notice email failed:", err));
  }
  return { ok: true, purgeAt: purgeDate(scheduledAt).toISOString() };
}

export async function cancelWorkspaceDeletion(workspaceId: string, userId: string): Promise<DeletionResult | { ok: true; purgeAt: null }> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true, deletionScheduledAt: true } });
  if (!workspace) return fail(404, "NOT_FOUND", "Workspace not found.");
  if (workspace.ownerId !== userId) return fail(403, "FORBIDDEN", "Only the workspace owner can cancel the deletion.");
  if (workspace.deletionScheduledAt) {
    await prisma.workspace.update({ where: { id: workspaceId }, data: { deletionScheduledAt: null } });
    await recordAudit({ workspaceId, userId, action: "CANCEL_DELETION", module: "settings", entityType: "Workspace", entityId: workspaceId });
  }
  return { ok: true, purgeAt: null };
}

/**
 * Deletes the caller's account after the grace period. Workspaces they own go with it, so that is only allowed
 * when nobody else uses them (otherwise the owner deletes those workspaces explicitly first). All sessions end
 * now; signing in again before the purge date cancels the deletion.
 */
export async function scheduleAccountDeletion(userId: string): Promise<DeletionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { ownedWorkspaces: { select: { id: true, name: true, deletionScheduledAt: true } } } });
  if (!user) return fail(404, "NOT_FOUND", "Account not found.");
  const shared: string[] = [];
  for (const ws of user.ownedWorkspaces) {
    if (!ws.deletionScheduledAt && (await otherPeople(ws.id, userId)).length > 0) shared.push(ws.name);
  }
  if (shared.length) {
    return fail(409, "OWNS_SHARED_WORKSPACE", `You own ${shared.map((n) => `"${n}"`).join(", ")}, which other people use. Remove them or delete the workspace first, then delete your account.`);
  }
  const scheduledAt = user.deletionScheduledAt || new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { deletionScheduledAt: scheduledAt } }),
    // Same timestamp as the account, so signing in again restores exactly these workspaces.
    prisma.workspace.updateMany({ where: { ownerId: userId, deletionScheduledAt: null }, data: { deletionScheduledAt: scheduledAt } })
  ]);
  await revokeAllUserSessions(userId);
  await sendNoticeEmail({
    to: user.email,
    recipientName: user.firstName,
    subject: `Your MarketerOS account will be deleted on ${formatDate(purgeDate(scheduledAt))}`,
    heading: "Account deletion scheduled",
    body: `your account and the workspaces you own will be permanently deleted on ${formatDate(purgeDate(scheduledAt))}. Changed your mind? Just sign in before then and the deletion is cancelled.`,
    actionLabel: "Sign in to cancel",
    actionUrl: `${appUrl()}/auth/login`,
    footer: "You're receiving this because you requested deletion of your MarketerOS account."
  }).catch((err) => console.error("[deletion] notice email failed:", err));
  return { ok: true, purgeAt: purgeDate(scheduledAt).toISOString() };
}

/** Called after a successful sign-in: cancels a pending account deletion (and the workspaces scheduled with it). */
export async function cancelAccountDeletion(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deletionScheduledAt: true } });
  if (!user?.deletionScheduledAt) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { deletionScheduledAt: null } }),
    prisma.workspace.updateMany({ where: { ownerId: userId, deletionScheduledAt: user.deletionScheduledAt }, data: { deletionScheduledAt: null } })
  ]);
  return true;
}

/** A member leaves a workspace they don't own. Not allowed if it is their only workspace (delete the account instead). */
export async function leaveWorkspace(workspaceId: string, userId: string): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!workspace) return fail(404, "NOT_FOUND", "Workspace not found.");
  if (workspace.ownerId === userId) return fail(400, "OWNER_CANNOT_LEAVE", "The owner can't leave their own workspace. Delete it instead.");
  const [owned, elsewhere] = await Promise.all([
    prisma.workspace.count({ where: { ownerId: userId } }),
    prisma.oAuthState.count({ where: { userId, providerKey: MEMBERSHIP_KEY, NOT: { workspaceId } } })
  ]);
  if (owned + elsewhere === 0) {
    return fail(409, "ONLY_WORKSPACE", "This is your only workspace, so leaving it would lock you out. Delete your account instead.");
  }
  await prisma.oAuthState.deleteMany({ where: { workspaceId, userId, providerKey: { in: [MEMBERSHIP_KEY, "TEAM_INVITE"] } } });
  await prisma.lead.updateMany({ where: { workspaceId, ownerId: userId }, data: { ownerId: null } });
  await recordAudit({ workspaceId, userId, action: "LEAVE_WORKSPACE", module: "team", entityType: "User", entityId: userId });
  // Sessions are tied to one workspace; end them so the next sign-in picks a workspace they still belong to.
  await revokeAllUserSessions(userId);
  return { ok: true };
}

/** Deletes the account, or anonymizes it if records elsewhere (campaigns, content, reports they created) still point to it. */
async function purgeUser(userId: string) {
  await prisma.oAuthState.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  try {
    await prisma.user.delete({ where: { id: userId } });
    return "deleted";
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.invalid`,
        firstName: "Deleted",
        lastName: "user",
        passwordHash: null,
        avatarUrl: null,
        phone: null,
        jobTitle: null,
        status: "DISABLED",
        emailVerifiedAt: null,
        deletionScheduledAt: null
      }
    });
    return "anonymized";
  }
}

/** Members whose only connection was this workspace: after it is gone, nothing of theirs should remain. */
async function exclusiveMembers(workspaceId: string, ownerId: string) {
  const ids = await otherPeople(workspaceId, ownerId);
  const exclusive: string[] = [];
  for (const id of ids) {
    const [owned, elsewhere] = await Promise.all([
      prisma.workspace.count({ where: { ownerId: id } }),
      prisma.oAuthState.count({ where: { userId: id, NOT: { workspaceId }, OR: [{ providerKey: MEMBERSHIP_KEY }, { providerKey: "TEAM_INVITE", consumedAt: null }] } })
    ]);
    if (owned + elsewhere === 0) exclusive.push(id);
  }
  return exclusive;
}

async function purgeWorkspace(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!workspace) return { members: 0 };
  const members = await exclusiveMembers(workspaceId, workspace.ownerId);
  const [media, exports, reports] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { workspaceId }, select: { storageKey: true } }),
    prisma.workspaceExport.findMany({ where: { workspaceId, storageKey: { not: null } }, select: { storageKey: true } }),
    prisma.report.findMany({ where: { workspaceId }, select: { id: true } })
  ]);
  const storage = objectStorage();
  const reportKeys = reports.flatMap((r) => [`reports/${workspaceId}/${r.id}.pdf`, `reports/${workspaceId}/${r.id}.csv`]);
  for (const key of [...media.map((m) => m.storageKey), ...exports.map((e) => e.storageKey as string), ...reportKeys]) {
    await storage.delete(key).catch((err) => console.error(`[deletion] could not delete stored object ${key}:`, err));
  }
  await prisma.workspace.delete({ where: { id: workspaceId } });
  for (const id of members) await purgeUser(id);
  return { members: members.length };
}

/**
 * Runs from the scheduled tasks: purges workspaces and accounts whose grace period is over, and removes expired
 * data exports. Each purge is independent, so one failure doesn't block the rest.
 */
export async function purgeDueDeletions(now = new Date()) {
  const cutoff = new Date(now.getTime() - DELETION_GRACE_DAYS * DAY_MS);
  const counts = { workspaces: 0, accounts: 0, exports: 0 };

  for (const ws of await prisma.workspace.findMany({ where: { deletionScheduledAt: { lte: cutoff } }, select: { id: true }, take: 50 })) {
    try { await purgeWorkspace(ws.id); counts.workspaces += 1; } catch (err) { console.error(`[deletion] purging workspace ${ws.id} failed:`, err); }
  }
  for (const user of await prisma.user.findMany({ where: { deletionScheduledAt: { lte: cutoff } }, select: { id: true }, take: 50 })) {
    try {
      // Anything still owned (e.g. a workspace whose deletion was cancelled separately) goes with the account.
      for (const ws of await prisma.workspace.findMany({ where: { ownerId: user.id }, select: { id: true } })) await purgeWorkspace(ws.id);
      await purgeUser(user.id);
      counts.accounts += 1;
    } catch (err) {
      console.error(`[deletion] purging account ${user.id} failed:`, err);
    }
  }
  const storage = objectStorage();
  for (const exp of await prisma.workspaceExport.findMany({ where: { expiresAt: { lte: now } }, select: { id: true, storageKey: true }, take: 200 })) {
    if (exp.storageKey) await storage.delete(exp.storageKey).catch((err) => console.error(`[export] could not delete ${exp.storageKey}:`, err));
    await prisma.workspaceExport.delete({ where: { id: exp.id } });
    counts.exports += 1;
  }
  return counts;
}
