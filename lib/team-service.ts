import { prisma } from "@/lib/prisma";
import { revokeAllUserSessions } from "@/lib/auth-server";
import { createTeamInvitation } from "@/lib/invite-service";
import { recordAudit } from "@/lib/audit";
import { MEMBERSHIP_KEY, isAssignableRole, resolveTeamTarget } from "@/lib/team-access";
import { checkPlanLimit } from "@/lib/plan-limits";

/**
 * Team management with every rule enforced server-side. Callers must already hold "team.manage".
 *  - The target must belong to the caller's workspace (member or pending invite).
 *  - Nobody can change their own role/status, remove themselves, or touch the workspace owner.
 *  - OWNER is never assignable; granting, revoking or modifying ADMIN requires the owner.
 *  - Account-wide changes (suspension, job title, deleting the account) only apply to people who exist
 *    solely in this workspace, so one workspace can never affect someone's access elsewhere.
 */
export type TeamActor = { userId: string; workspaceId: string; role: string; name?: string };
export type TeamResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; message: string; code?: string };

const fail = (status: number, message: string, code?: string) => ({ ok: false as const, status, message, code });
const isOwnerActor = (actor: TeamActor) => actor.role.toUpperCase() === "OWNER";

export async function changeTeamMember(actor: TeamActor, targetUserId: string, input: { role?: unknown; status?: unknown; jobTitle?: unknown }): Promise<TeamResult<{ roleChanged: string | null; email: string; firstName: string }>> {
  if (targetUserId === actor.userId) return fail(403, "You can't change your own role or status.");
  const target = await resolveTeamTarget(actor.workspaceId, targetUserId);
  if (!target) return fail(404, "Team member not found.");
  if (target.isOwner) return fail(403, "The workspace owner's role and status can't be changed.");
  if (target.role === "ADMIN" && !isOwnerActor(actor)) return fail(403, "Only the workspace owner can change an Admin.");

  let newRole: string | null = null;
  if (input.role !== undefined) {
    if (!isAssignableRole(input.role)) return fail(400, "Choose a valid role.");
    newRole = input.role.toUpperCase();
    if (newRole === "ADMIN" && !isOwnerActor(actor)) return fail(403, "Only the workspace owner can grant the Admin role.");
  }

  const userData: { status?: "ACTIVE" | "SUSPENDED"; jobTitle?: string } = {};
  if (input.status !== undefined) {
    const status = String(input.status).toUpperCase();
    if (status !== "ACTIVE" && status !== "SUSPENDED") return fail(400, "Status must be ACTIVE or SUSPENDED.");
    userData.status = status;
  }
  if (input.jobTitle !== undefined) {
    if (typeof input.jobTitle !== "string" || input.jobTitle.length > 120) return fail(400, "Invalid job title.");
    userData.jobTitle = input.jobTitle;
  }
  if (Object.keys(userData).length && !target.exclusive) {
    return fail(409, "This person also belongs to another workspace, so their account can't be changed from here. Remove them from your workspace instead.");
  }

  if (newRole) {
    const ids = [target.membership?.id, target.pendingInvite?.id].filter((id): id is string => Boolean(id));
    await prisma.oAuthState.updateMany({ where: { id: { in: ids } }, data: { returnTo: newRole } });
  }
  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: targetUserId }, data: userData });
    if (userData.status === "SUSPENDED") await revokeAllUserSessions(targetUserId);
  }
  await recordAudit({ workspaceId: actor.workspaceId, userId: actor.userId, action: "UPDATE_TEAM_MEMBER", module: "team", entityType: "User", entityId: targetUserId, afterData: { role: newRole, ...userData } });
  return { ok: true, data: { roleChanged: newRole, email: target.user.email, firstName: target.user.firstName } };
}

export async function removeTeamMember(actor: TeamActor, targetUserId: string): Promise<TeamResult<{ removed: string; accountDeleted: boolean }>> {
  if (targetUserId === actor.userId) return fail(403, "You can't remove yourself from the workspace.");
  const target = await resolveTeamTarget(actor.workspaceId, targetUserId);
  if (!target) return fail(404, "Team member not found.");
  if (target.isOwner) return fail(403, "The workspace owner can't be removed.");
  if (target.role === "ADMIN" && !isOwnerActor(actor)) return fail(403, "Only the workspace owner can remove an Admin.");

  await prisma.oAuthState.deleteMany({ where: { workspaceId: actor.workspaceId, userId: targetUserId, providerKey: { in: [MEMBERSHIP_KEY, "TEAM_INVITE"] } } });

  let accountDeleted = false;
  if (target.exclusive) {
    // They had access only through this workspace, so end their sessions. An invitee who never set a password
    // has no account of their own to keep, so that placeholder account is removed too.
    await revokeAllUserSessions(targetUserId);
    if (!target.user.passwordHash) {
      accountDeleted = await prisma.user.delete({ where: { id: targetUserId } }).then(() => true).catch(() => false);
    }
  }
  await recordAudit({ workspaceId: actor.workspaceId, userId: actor.userId, action: "REMOVE_TEAM_MEMBER", module: "team", entityType: "User", entityId: targetUserId, afterData: { accountDeleted } });
  return { ok: true, data: { removed: targetUserId, accountDeleted } };
}

type InviteInput = { firstName: string; lastName: string; email: string; jobTitle?: string; role?: string };

export async function inviteTeamMember(actor: TeamActor, input: InviteInput, baseUrl: string): Promise<TeamResult<{ user: { id: string; email: string; firstName: string; lastName: string; role: string; status: "INVITED" }; delivered: boolean }>> {
  const role = (input.role || "MANAGER").toUpperCase();
  if (!isAssignableRole(role)) return fail(400, "Choose a valid role.");
  if (role === "ADMIN" && !isOwnerActor(actor)) return fail(403, "Only the workspace owner can invite an Admin.");

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const target = existing ? await resolveTeamTarget(actor.workspaceId, existing.id) : null;
  if (target?.isOwner || target?.membership) return fail(409, "This person is already a member of your workspace.");
  // Re-inviting someone with a pending invitation doesn't take another seat.
  if (!target?.pendingInvite) {
    const seats = await checkPlanLimit(actor.workspaceId, "members");
    if (!seats.ok) return fail(402, seats.message, "PLAN_LIMIT_REACHED");
  }

  const created = await createTeamInvitation({ ...input, email, role, workspaceId: actor.workspaceId, inviterUserId: actor.userId, inviterName: actor.name, baseUrl });
  // Never return the account record itself (it holds the password hash and other private fields).
  const u = created.user;
  return { ok: true, data: { user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role, status: "INVITED" }, delivered: created.emailResult.delivered } };
}

export async function resendTeamInvite(actor: TeamActor, targetUserId: string, baseUrl: string): Promise<TeamResult<{ email: string; delivered: boolean }>> {
  const target = await resolveTeamTarget(actor.workspaceId, targetUserId);
  if (!target || !target.pendingInvite || target.membership || target.isOwner) return fail(404, "No pending invitation for this person.");
  if (target.role === "ADMIN" && !isOwnerActor(actor)) return fail(403, "Only the workspace owner can re-send an Admin invitation.");
  const created = await createTeamInvitation({
    workspaceId: actor.workspaceId,
    inviterUserId: actor.userId,
    inviterName: actor.name,
    firstName: target.user.firstName,
    lastName: target.user.lastName,
    email: target.user.email,
    role: target.role,
    baseUrl
  });
  return { ok: true, data: { email: target.user.email, delivered: created.emailResult.delivered } };
}
