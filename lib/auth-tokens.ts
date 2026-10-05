import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/crypto";

// Single-use emailed tokens. They reuse the OAuthState table (hashed token in stateHash), like team invitations do.
// These provider keys are deliberately NOT membership keys (WORKSPACE_MEMBER / TEAM_INVITE), so they never grant access.
export type AuthTokenKind = "PASSWORD_RESET" | "EMAIL_VERIFY";

/** The workspace a user belongs to: the one they own, otherwise their newest membership. */
export async function primaryWorkspaceId(userId: string) {
  const owned = await prisma.workspace.findFirst({ where: { ownerId: userId }, select: { id: true }, orderBy: { createdAt: "asc" } });
  if (owned) return owned.id;
  const membership = await prisma.oAuthState.findFirst({
    where: { userId, providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] } },
    select: { workspaceId: true },
    orderBy: { createdAt: "desc" }
  });
  return membership?.workspaceId ?? null;
}

/** Issues a new token of `kind` for the user, invalidating any earlier unused ones. Returns the raw token. */
export async function issueAuthToken(kind: AuthTokenKind, userId: string, workspaceId: string, ttlMs: number) {
  await prisma.oAuthState.updateMany({
    where: { userId, providerKey: kind, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  const token = randomBytes(32).toString("base64url");
  await prisma.oAuthState.create({
    data: { stateHash: hashSecret(token), workspaceId, userId, providerKey: kind, expiresAt: new Date(Date.now() + ttlMs) }
  });
  return token;
}

/** Atomically consumes a valid, unexpired token. Returns its user and workspace, or null. */
export async function consumeAuthToken(kind: AuthTokenKind, token: string) {
  const record = await prisma.oAuthState.findFirst({
    where: { stateHash: hashSecret(token), providerKey: kind, consumedAt: null, expiresAt: { gt: new Date() } }
  });
  if (!record?.userId) return null;
  const claimed = await prisma.oAuthState.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  if (!claimed.count) return null;
  return { userId: record.userId, workspaceId: record.workspaceId };
}
