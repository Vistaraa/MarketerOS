import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { revokeAllUserSessions } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

// Reset tokens reuse the OAuthState table (hashed token in stateHash), like team invitations do.
const PROVIDER_KEY = "PASSWORD_RESET";
const TOKEN_TTL_MINUTES = 60;

/**
 * Issues a single-use reset token and emails the link. Silently does nothing when the
 * account does not exist, so callers can always return the same response.
 */
export async function requestPasswordReset(email: string, baseUrl: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || !user.passwordHash || user.status === "SUSPENDED") return;

  const owned = await prisma.workspace.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  const membership = owned
    ? null
    : await prisma.oAuthState.findFirst({ where: { userId: user.id, providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] } }, select: { workspaceId: true } });
  const workspaceId = owned?.id || membership?.workspaceId;
  if (!workspaceId) return;

  // Only the newest link should work.
  await prisma.oAuthState.updateMany({
    where: { userId: user.id, providerKey: PROVIDER_KEY, consumedAt: null },
    data: { consumedAt: new Date() }
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.oAuthState.create({
    data: {
      stateHash: hashSecret(token),
      workspaceId,
      userId: user.id,
      providerKey: PROVIDER_KEY,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)
    }
  });

  const resetUrl = `${baseUrl.replace(/\/+$/, "")}/auth/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({
    to: user.email,
    recipientName: user.firstName,
    resetUrl,
    expiresInMinutes: TOKEN_TTL_MINUTES
  });
}

/**
 * Consumes a reset token and sets the new password. Returns false when the token is
 * unknown, expired, or already used. All of the user's sessions are revoked on success.
 */
export async function resetPasswordWithToken(token: string, newPassword: string) {
  const record = await prisma.oAuthState.findFirst({
    where: { stateHash: hashSecret(token), providerKey: PROVIDER_KEY, consumedAt: null, expiresAt: { gt: new Date() } }
  });
  if (!record?.userId) return false;

  const claimed = await prisma.oAuthState.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  if (!claimed.count) return false;

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }
  });
  await revokeAllUserSessions(record.userId);
  await recordAudit({ workspaceId: record.workspaceId, userId: record.userId, action: "PASSWORD_RESET", module: "auth", entityType: "User", entityId: record.userId });
  return true;
}
