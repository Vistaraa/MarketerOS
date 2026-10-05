import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { revokeAllUserSessions } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { consumeAuthToken, issueAuthToken, primaryWorkspaceId } from "@/lib/auth-tokens";

const TOKEN_TTL_MINUTES = 60;

/**
 * Issues a single-use reset token and emails the link. Silently does nothing when the
 * account does not exist, so callers can always return the same response.
 */
export async function requestPasswordReset(email: string, baseUrl: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || !user.passwordHash || user.status === "SUSPENDED") return;

  const workspaceId = await primaryWorkspaceId(user.id);
  if (!workspaceId) return;

  const token = await issueAuthToken("PASSWORD_RESET", user.id, workspaceId, TOKEN_TTL_MINUTES * 60 * 1000);
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
  const claimed = await consumeAuthToken("PASSWORD_RESET", token);
  if (!claimed) return false;

  await prisma.user.update({
    where: { id: claimed.userId },
    // Receiving the reset email also proves ownership of the address.
    data: { passwordHash: await bcrypt.hash(newPassword, 12), emailVerifiedAt: new Date() }
  });
  await revokeAllUserSessions(claimed.userId);
  await recordAudit({ workspaceId: claimed.workspaceId, userId: claimed.userId, action: "PASSWORD_RESET", module: "auth", entityType: "User", entityId: claimed.userId });
  return true;
}
