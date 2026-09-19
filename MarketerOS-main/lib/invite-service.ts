import { randomBytes, createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/crypto";
import { sendTeamInviteEmail, type EmailSendResult } from "@/lib/email";
import { recordAudit } from "@/lib/audit";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY || "marketeros-default-invite-secret-key-at-least-32-chars";
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecretKey()).update(payload).digest("base64url");
}

export interface InviteTokenPayload {
  userId: string;
  workspaceId: string;
  email: string;
  role: string;
  exp: number;
}

export interface CreateInviteInput {
  workspaceId: string;
  inviterName?: string;
  inviterUserId?: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  jobTitle?: string;
  baseUrl?: string;
}

export interface VerifyInviteResult {
  valid: boolean;
  reason?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  workspaceName?: string;
  role?: string;
  userId?: string;
  workspaceId?: string;
}

/**
 * Creates a team member, generates an HMAC-signed invite token, saves state, and sends an invitation email.
 */
export async function createTeamInvitation(input: CreateInviteInput) {
  const email = input.email.toLowerCase().trim();
  const role = (input.role || "MANAGER").toUpperCase();
  const jobTitle = input.jobTitle || "Team Member";

  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    include: { owner: true }
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  // 1. Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        jobTitle,
        status: "INVITED"
      }
    });
  } else {
    // If user already exists, update name/jobTitle if pending
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: input.firstName.trim() || user.firstName,
        lastName: input.lastName.trim() || user.lastName,
        jobTitle: input.jobTitle || user.jobTitle,
        status: user.passwordHash ? user.status : "INVITED"
      }
    });
  }

  // 2. Generate signed token
  const exp = Date.now() + SEVEN_DAYS_MS;
  const tokenData: InviteTokenPayload = {
    userId: user.id,
    workspaceId: workspace.id,
    email,
    role,
    exp
  };

  const payloadString = Buffer.from(JSON.stringify(tokenData)).toString("base64url");
  const signature = signPayload(payloadString);
  const nonce = randomBytes(16).toString("hex");
  const signedToken = `${payloadString}.${signature}.${nonce}`;
  const tokenHash = hashSecret(signedToken);

  // Invalidate any previous unconsumed invitations for this user in this workspace
  await prisma.oAuthState.updateMany({
    where: {
      userId: user.id,
      workspaceId: workspace.id,
      providerKey: "TEAM_INVITE",
      consumedAt: null
    },
    data: {
      consumedAt: new Date()
    }
  });

  // Store new invite record in OAuthState
  await prisma.oAuthState.create({
    data: {
      state: signedToken,
      stateHash: tokenHash,
      workspaceId: workspace.id,
      userId: user.id,
      providerKey: "TEAM_INVITE",
      returnTo: role,
      expiresAt: new Date(exp)
    }
  });

  // 3. Resolve base URL and invite link
  const rawBaseUrl = input.baseUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const baseUrl = rawBaseUrl.replace(/\/$/, "");
  const inviteUrl = `${baseUrl}/auth/set-password?token=${encodeURIComponent(signedToken)}`;

  // 4. Send email
  const inviterName = input.inviterName || `${workspace.owner.firstName} ${workspace.owner.lastName}`.trim() || "Team Administrator";
  const emailResult: EmailSendResult = await sendTeamInviteEmail({
    to: email,
    recipientName: input.firstName,
    inviterName,
    workspaceName: workspace.name,
    role,
    inviteUrl
  });

  // 5. Record audit log
  await recordAudit({
    workspaceId: workspace.id,
    userId: input.inviterUserId || workspace.ownerId,
    action: "INVITE_TEAM_MEMBER",
    module: "team",
    entityType: "User",
    entityId: user.id,
    afterData: {
      email,
      role,
      status: "INVITED",
      delivered: emailResult.delivered
    }
  });

  return {
    user,
    role,
    inviteUrl,
    emailResult
  };
}

/**
 * Validates an invite token and returns details about the workspace and invited user.
 */
export async function verifyInvitationToken(token: string): Promise<VerifyInviteResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing invitation token." };
  }

  const parts = token.split(".");
  if (parts.length < 3) {
    return { valid: false, reason: "Malformed invitation token." };
  }

  const [payloadString, signature] = parts;
  const expectedSignature = signPayload(payloadString);

  if (signature !== expectedSignature) {
    return { valid: false, reason: "Invalid token signature." };
  }

  let payload: InviteTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadString, "base64url").toString("utf-8"));
  } catch {
    return { valid: false, reason: "Corrupted invitation token data." };
  }

  if (!payload.exp || Date.now() > payload.exp) {
    return { valid: false, reason: "This invitation link has expired. Please request a new invite from your workspace admin." };
  }

  // Verify against database OAuthState
  const tokenHash = hashSecret(token);
  const state = await prisma.oAuthState.findFirst({
    where: {
      stateHash: tokenHash,
      providerKey: "TEAM_INVITE"
    }
  });

  if (state && state.consumedAt) {
    return { valid: false, reason: "This invitation link has already been used. Please log in with your credentials." };
  }

  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.userId } }),
    prisma.workspace.findUnique({ where: { id: payload.workspaceId } })
  ]);

  if (!user || !workspace) {
    return { valid: false, reason: "The invited user or workspace could not be found." };
  }

  return {
    valid: true,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    workspaceName: workspace.name,
    role: payload.role,
    userId: user.id,
    workspaceId: workspace.id
  };
}

/**
 * Consumes the invite token, updates user password, activates the user, and links them to the workspace.
 */
export async function consumeInvitationToken(token: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const verification = await verifyInvitationToken(token);
  if (!verification.valid || !verification.userId || !verification.workspaceId) {
    throw new Error(verification.reason || "Invalid invitation token.");
  }

  const { userId, workspaceId, role } = verification;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const tokenHash = hashSecret(token);

  // 1. Mark OAuthState invitation consumed
  await prisma.oAuthState.updateMany({
    where: { stateHash: tokenHash },
    data: { consumedAt: new Date() }
  });

  // 2. Activate user & set password
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date()
    }
  });

  // 3. Ensure persistent membership record in OAuthState so authenticatePersistedUser links them to this workspace
  const existingMembership = await prisma.oAuthState.findFirst({
    where: {
      userId,
      workspaceId,
      providerKey: "WORKSPACE_MEMBER"
    }
  });

  if (!existingMembership) {
    await prisma.oAuthState.create({
      data: {
        userId,
        workspaceId,
        providerKey: "WORKSPACE_MEMBER",
        returnTo: role || "MANAGER",
        expiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000) // 10 years
      }
    });
  } else {
    await prisma.oAuthState.update({
      where: { id: existingMembership.id },
      data: {
        returnTo: role || "MANAGER",
        expiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // 4. Audit log
  await recordAudit({
    workspaceId,
    userId,
    action: "ACCEPT_INVITATION_AND_SET_PASSWORD",
    module: "auth",
    entityType: "User",
    entityId: userId,
    afterData: {
      email: updatedUser.email,
      status: "ACTIVE"
    }
  });

  return {
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName
    },
    workspaceId,
    role: role || "MANAGER"
  };
}
