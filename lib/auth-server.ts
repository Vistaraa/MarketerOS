import { cookies, headers } from "next/headers";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@/lib/prisma";
import { cacheGet, cacheInvalidateKey, cacheSet } from "@/lib/cache";
import { MEMBERSHIP_KEY, normalizeMemberRole } from "@/lib/team-access";

/** Thrown by authenticatePersistedUser for a correct password on a suspended account. */
export class AccountSuspendedError extends Error {
  constructor() {
    super("Your account has been suspended by your workspace administrator. Please contact your administrator.");
    this.name = "AccountSuspendedError";
  }
}

const COOKIE = "marketeros_session";

const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_PREFIX = "session:";

function sessionCacheKey(tokenHash: string) {
  return `${SESSION_CACHE_PREFIX}${tokenHash}`;
}

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function hashSession(value: string) { return createHash("sha256").update(value).digest("hex"); }

export type SessionInput = { userId: string; workspaceId: string; role: string; email: string; name: string };

export async function setSession(input: SessionInput) {
  const payload = Buffer.from(JSON.stringify({ ...input, nonce: randomBytes(8).toString("hex") })).toString("base64url");
  const raw = `${payload}.${sign(payload)}`;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const store = await cookies();
  store.set(COOKIE, raw, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
  await prisma.session.create({ data: { userId: input.userId, tokenHash: hashSession(raw), expiresAt } });
}

export async function clearSession() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (raw) {
    cacheInvalidateKey(sessionCacheKey(hashSession(raw)));
    await prisma.session.deleteMany({ where: { tokenHash: hashSession(raw) } });
  }
  store.delete(COOKIE);
}

/** Revokes one of the given user's sessions. Returns false if the session does not belong to that user. */
export async function revokeUserSession(userId: string, sessionId: string) {
  const target = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { tokenHash: true } });
  if (!target) return false;
  cacheInvalidateKey(sessionCacheKey(target.tokenHash));
  await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  return true;
}

/** Signs the user out everywhere, including sessions still held in the in-memory session cache. */
export async function revokeAllUserSessions(userId: string) {
  const sessions = await prisma.session.findMany({ where: { userId }, select: { tokenHash: true } });
  for (const s of sessions) cacheInvalidateKey(sessionCacheKey(s.tokenHash));
  await prisma.session.deleteMany({ where: { userId } });
}

/** Returns the session token's payload only if its signature is valid; never trust an unverified payload. */
export function verifySessionToken(raw: string | undefined | null): Partial<SessionInput> | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function getSession(explicitToken?: string) {
  let raw = explicitToken;
  if (!raw) {
    const store = await cookies();
    raw = store.get(COOKIE)?.value;
  }
  if (!raw) {
    try {
      const reqHeaders = await headers();
      const auth = reqHeaders.get("authorization");
      if (auth && auth.startsWith("Bearer ")) {
        raw = auth.slice(7).trim();
      }
    } catch {
      // headers() might not be available in all execution contexts
    }
  }
  if (!raw) return null;
  // Developer API keys (Authorization: Bearer mk_live_...) act as a read-only member of their workspace.
  if (raw.startsWith("mk_live_")) {
    const { authenticateApiKey } = await import("@/lib/api-keys");
    return authenticateApiKey(raw);
  }
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !verifySessionToken(raw)) return null;
  const tokenHash = hashSession(raw);
  const cached = cacheGet<{ userId: string; workspaceId: string; role: string; email: string; name: string }>(sessionCacheKey(tokenHash));
  if (cached) {
    // Only the workspace/role resolution is cached. The session row itself is checked on every request, so a
    // sign-out, revocation or removal takes effect at once on every server instance, not after the cache expires.
    const live = await prisma.session.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } }, select: { user: { select: { status: true } } } });
    if (!live || live.user.status === "SUSPENDED") {
      cacheInvalidateKey(sessionCacheKey(tokenHash));
      return null;
    }
    return cached;
  }
  const active = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true }
  });
  if (!active || active.user.status === "SUSPENDED") {
    if (active) {
      await prisma.session.deleteMany({ where: { userId: active.userId } });
    }
    return null;
  }
  let sessionPayload: SessionInput | null = null;
  try {
    sessionPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    // ignore
  }

  let workspace: any = null;
  let role = "OWNER";

  // 1. Check accepted workspace membership. Pending invites never grant access.
  const membership = await prisma.oAuthState.findFirst({
    where: {
      userId: active.userId,
      providerKey: MEMBERSHIP_KEY,
      workspace: { status: "ACTIVE" },
      ...(sessionPayload?.workspaceId ? { workspaceId: sessionPayload.workspaceId } : {})
    },
    include: { workspace: true },
    orderBy: { createdAt: "desc" }
  });

  if (membership?.workspace) {
    workspace = membership.workspace;
    role = normalizeMemberRole(membership.returnTo);
    if (workspace.ownerId === active.userId) {
      role = "OWNER";
    }
  }

  // 2. If no membership record, check if user is workspace owner
  if (!workspace) {
    const ownedWorkspace = await prisma.workspace.findFirst({
      where: {
        ownerId: active.userId,
        status: "ACTIVE",
        ...(sessionPayload?.workspaceId ? { id: sessionPayload.workspaceId } : {})
      },
      orderBy: { createdAt: "asc" }
    });

    if (ownedWorkspace) {
      workspace = ownedWorkspace;
      role = "OWNER";
    }
  }

  // 3. Fallback: Any active workspace user owns
  if (!workspace) {
    const fallbackOwned = await prisma.workspace.findFirst({
      where: { ownerId: active.userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" }
    });
    if (fallbackOwned) {
      workspace = fallbackOwned;
      role = "OWNER";
    }
  }

  if (!workspace) return null;
  const session = {
    userId: active.userId,
    workspaceId: workspace.id,
    role,
    email: active.user.email,
    name: `${active.user.firstName} ${active.user.lastName}`.trim()
  };
  cacheSet(sessionCacheKey(tokenHash), session, SESSION_CACHE_TTL_MS);
  return session;
}

export async function requireTenant() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export function getDefaultRouteForRole(role: string): string {
  const normalized = (role || "").toUpperCase();
  switch (normalized) {
    case "CONTENT_MANAGER":
      return "/content-studio";
    case "ANALYST":
      return "/analytics";
    case "SALES":
      return "/leads";
    case "MANAGER":
    case "ADMIN":
    case "OWNER":
    case "VIEWER":
    default:
      return "/overview";
  }
}

export function can(role: string, permission: string) {
  const normalizedRole = (role || "").toUpperCase();
  const perm = (permission || "").toLowerCase();

  if (normalizedRole === "OWNER" || normalizedRole === "ADMIN") return true;

  // API keys are read-only: they can view whatever a member can view, and change nothing.
  if (normalizedRole === "API_KEY") return perm.endsWith(".view");

  if (normalizedRole === "MANAGER") {
    if (perm.startsWith("team.") || perm.startsWith("billing.")) return false;
    return true;
  }

  if (normalizedRole === "CONTENT_MANAGER") {
    if (perm.startsWith("content.") || perm.startsWith("social.") || perm.startsWith("automation.") || perm.startsWith("ai.")) return true;
    if (perm === "campaign.view" || perm === "campaign.edit" || perm === "notifications.view" || perm === "settings.view") return true;
    return false;
  }

  if (normalizedRole === "ANALYST") {
    if (perm.startsWith("analytics.") || perm.startsWith("report.") || perm.startsWith("ai.")) return true;
    if (perm === "campaign.view" || perm === "automation.view" || perm === "notifications.view" || perm === "settings.view" || perm === "overview.view") return true;
    return false;
  }

  if (normalizedRole === "SALES") {
    if (perm.startsWith("lead.") || perm.startsWith("client.")) return true;
    if (perm === "campaign.view" || perm === "notifications.view" || perm === "settings.view") return true;
    return false;
  }

  if (normalizedRole === "VIEWER") {
    if (perm.startsWith("team.") || perm.startsWith("billing.")) return false;
    return perm.endsWith(".view");
  }

  return false;
}

export async function createPersistedUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  workspaceName: string;
  website?: string;
  industry?: string;
  businessType?: string;
  description?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  monthlyBudget?: number;
  termsAcceptedAt?: Date;
  termsVersion?: string;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: input.passwordHash,
        termsAcceptedAt: input.termsAcceptedAt,
        termsVersion: input.termsVersion
      }
    });
    const workspace = await tx.workspace.create({
      data: {
        name: input.workspaceName,
        slug: `${input.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(-6)}`,
        ownerId: user.id,
        website: input.website,
        industry: input.industry,
        businessType: input.businessType,
        description: input.description,
        country: input.country,
        currency: input.currency || "USD",
        timezone: input.timezone || "UTC",
        monthlyBudget: input.monthlyBudget
      }
    });

    return { user, workspace };
  }).then(async (result) => {
    // Automatically ensure workspace subscription without any manual seeding
    const { ensureWorkspaceSubscription } = await import("@/lib/bootstrap");
    await ensureWorkspaceSubscription(result.workspace.id, "pro");
    return result;
  });
}

export async function authenticatePersistedUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" }
    },
    // Hashes are omitted from queries by default (lib/prisma.ts); sign-in is one of the few places that needs it.
    omit: { passwordHash: false }
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
  if (user.status === "SUSPENDED") {
    throw new AccountSuspendedError();
  }
  // 1. Check accepted workspace membership. Pending invites never decide which workspace a login lands in.
  const membership = await prisma.oAuthState.findFirst({
    where: {
      userId: user.id,
      providerKey: MEMBERSHIP_KEY,
      workspace: { status: "ACTIVE" }
    },
    include: { workspace: true },
    orderBy: { createdAt: "desc" }
  });

  let workspace: any = null;
  let role = "OWNER";

  if (membership?.workspace) {
    workspace = membership.workspace;
    role = normalizeMemberRole(membership.returnTo);
    if (workspace.ownerId === user.id) {
      role = "OWNER";
    }
  }

  // 2. Fallback to workspace owned by user if no membership
  if (!workspace) {
    const ownedWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" }
    });
    if (ownedWorkspace) {
      workspace = ownedWorkspace;
      role = "OWNER";
    }
  }

  if (!workspace) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    userId: user.id,
    workspaceId: workspace.id,
    role,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim()
  } as SessionInput;
}
