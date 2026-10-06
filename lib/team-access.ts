import { prisma } from "@/lib/prisma";

/** Roles a workspace member can hold. OWNER is not assignable: it belongs to the workspace's ownerId only. */
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "CONTENT_MANAGER", "ANALYST", "SALES", "VIEWER"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(role: unknown): role is AssignableRole {
  return typeof role === "string" && (ASSIGNABLE_ROLES as readonly string[]).includes(role.toUpperCase());
}

/**
 * Role stored on a membership row. Anything unrecognised (including "OWNER", which older code let members
 * set on themselves) falls back to the least-privileged role rather than being trusted.
 */
export function normalizeMemberRole(stored: string | null | undefined): AssignableRole {
  const role = (stored || "MANAGER").toUpperCase();
  return isAssignableRole(role) ? (role as AssignableRole) : "VIEWER";
}

/** Only accepted memberships count. Pending invites (TEAM_INVITE) never grant access. */
export const MEMBERSHIP_KEY = "WORKSPACE_MEMBER";

/**
 * How the target user relates to a workspace, for team-management checks.
 * `exclusive` means they exist only as part of this workspace: they own no workspace and have no membership or
 * pending invite elsewhere. Account-wide changes (suspension, profile fields, deletion) are limited to such users,
 * so one workspace can never affect someone's access to another.
 */
export async function resolveTeamTarget(workspaceId: string, userId: string) {
  const [workspace, user, rows, ownsElsewhere, otherRows] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, passwordHash: true, status: true } }),
    prisma.oAuthState.findMany({ where: { workspaceId, userId, providerKey: { in: [MEMBERSHIP_KEY, "TEAM_INVITE"] } }, orderBy: { createdAt: "desc" } }),
    prisma.workspace.count({ where: { ownerId: userId, NOT: { id: workspaceId } } }),
    prisma.oAuthState.count({
      where: {
        userId,
        NOT: { workspaceId },
        OR: [{ providerKey: MEMBERSHIP_KEY }, { providerKey: "TEAM_INVITE", consumedAt: null }]
      }
    })
  ]);
  if (!workspace || !user) return null;

  const isOwner = workspace.ownerId === userId;
  const membership = rows.find((r) => r.providerKey === MEMBERSHIP_KEY) || null;
  const pendingInvite = rows.find((r) => r.providerKey === "TEAM_INVITE" && !r.consumedAt) || null;
  if (!isOwner && !membership && !pendingInvite) return null;

  return {
    user,
    isOwner,
    membership,
    pendingInvite,
    role: isOwner ? "OWNER" : normalizeMemberRole((membership || pendingInvite)?.returnTo),
    exclusive: !isOwner && ownsElsewhere === 0 && otherRows === 0
  };
}

/** True if the user is the workspace owner or an accepted member (pending invites don't count). */
export async function isWorkspaceMember(workspaceId: string, userId: string) {
  const [owned, membership] = await Promise.all([
    prisma.workspace.count({ where: { id: workspaceId, ownerId: userId } }),
    prisma.oAuthState.count({ where: { workspaceId, userId, providerKey: MEMBERSHIP_KEY } })
  ]);
  return owned > 0 || membership > 0;
}
