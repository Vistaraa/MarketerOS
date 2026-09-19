import { cookies, headers } from "next/headers";
import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@/lib/prisma";
import { cacheGet, cacheInvalidateKey, cacheSet } from "@/lib/cache";

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
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  const tokenHash = hashSession(raw);
  const cached = cacheGet<{ userId: string; workspaceId: string; role: string; email: string; name: string }>(sessionCacheKey(tokenHash));
  if (cached) return cached;
  const active = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true }
  });
  if (!active) return null;
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: active.userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });
  let role = "OWNER";

  if (!workspace) {
    const membership = await prisma.oAuthState.findFirst({
      where: {
        userId: active.userId,
        providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] },
        workspace: { status: "ACTIVE" }
      },
      include: { workspace: true },
      orderBy: { createdAt: "desc" }
    });

    if (membership?.workspace) {
      workspace = membership.workspace;
      role = membership.returnTo || "MANAGER";
    }
  }

  if (!workspace) return null;
  const session = {
    userId: active.userId,
    workspaceId: workspace.id,
    role,
    email: active.user.email,
    name: `${active.user.firstName} ${active.user.lastName}`
  };
  cacheSet(sessionCacheKey(tokenHash), session, SESSION_CACHE_TTL_MS);
  return session;
}

export async function requireTenant() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export function can(role: string, permission: string) {
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === "OWNER" || normalizedRole === "ADMIN") return true;
  if (normalizedRole === "MANAGER") return !permission.includes("manage") && !permission.includes("delete");
  if (normalizedRole === "ANALYST") return permission.endsWith(".view") || permission.startsWith("analytics.");
  if (normalizedRole === "VIEWER") return permission.endsWith(".view");
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
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: input.passwordHash
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
    }
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });
  let role = "OWNER";

  if (!workspace) {
    const membership = await prisma.oAuthState.findFirst({
      where: {
        userId: user.id,
        providerKey: { in: ["WORKSPACE_MEMBER", "TEAM_INVITE"] },
        workspace: { status: "ACTIVE" }
      },
      include: { workspace: true },
      orderBy: { createdAt: "desc" }
    });

    if (membership?.workspace) {
      workspace = membership.workspace;
      role = membership.returnTo || "MANAGER";
    }
  }

  if (!workspace) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    userId: user.id,
    workspaceId: workspace.id,
    role,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`
  } as SessionInput;
}
