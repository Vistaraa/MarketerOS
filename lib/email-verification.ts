import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { consumeAuthToken, issueAuthToken, primaryWorkspaceId } from "@/lib/auth-tokens";

const TOKEN_TTL_HOURS = 48;

/** Emails a verification link to the user. Does nothing if they are already verified. */
export async function sendEmailVerification(userId: string, baseUrl: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;

  const workspaceId = await primaryWorkspaceId(user.id);
  if (!workspaceId) return;

  const token = await issueAuthToken("EMAIL_VERIFY", user.id, workspaceId, TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await sendVerificationEmail({
    to: user.email,
    recipientName: user.firstName,
    verifyUrl: `${baseUrl.replace(/\/+$/, "")}/auth/verify-email?token=${encodeURIComponent(token)}`,
    expiresInHours: TOKEN_TTL_HOURS
  });
}

/** Marks the token's user as verified. Returns false for unknown, expired, or already-used tokens. */
export async function verifyEmailWithToken(token: string) {
  const claimed = await consumeAuthToken("EMAIL_VERIFY", token);
  if (!claimed) return false;
  await prisma.user.update({ where: { id: claimed.userId }, data: { emailVerifiedAt: new Date() } });
  await recordAudit({ workspaceId: claimed.workspaceId, userId: claimed.userId, action: "EMAIL_VERIFIED", module: "auth", entityType: "User", entityId: claimed.userId });
  return true;
}
