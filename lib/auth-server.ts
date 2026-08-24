import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@/lib/prisma";

const COOKIE = "marketeros_session";

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
  if (raw) await prisma.session.deleteMany({ where: { tokenHash: hashSession(raw) } });
  store.delete(COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  const active = await prisma.session.findFirst({ where: { tokenHash: hashSession(raw), expiresAt: { gt: new Date() } }, include: { user: true } });
  if (!active) return null;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: active.userId, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  if (!membership) return null;
  return { userId: active.userId, workspaceId: membership.workspaceId, role: membership.role, email: active.user.email, name: `${active.user.firstName} ${active.user.lastName}` };
}

export async function requireTenant() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export function can(role: string, permission: string) {
  if (["OWNER", "ADMIN"].includes(role)) return true;
  if (permission.endsWith(".view") || permission === "analytics.view") return true;
  if (role === "VIEWER") return false;
  if (role === "ANALYST") return permission.startsWith("analytics") || permission.startsWith("report");
  if (role === "CONTENT_MANAGER") return permission.startsWith("content") || permission.startsWith("social");
  return ["MANAGER", "SALES"].some((allowed) => role === allowed);
}

export async function createPersistedUser(input: { email: string; firstName: string; lastName: string; passwordHash: string; workspaceName: string }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({ data: { email: input.email, firstName: input.firstName, lastName: input.lastName, passwordHash: input.passwordHash } });
    const workspace = await tx.workspace.create({ data: { name: input.workspaceName, slug: `${input.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(-6)}`, ownerId: user.id } });
    await tx.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "OWNER", status: "ACTIVE", joinedAt: new Date() } });
    return { user, workspace };
  });
}

export async function authenticatePersistedUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  if (!membership) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { userId: user.id, workspaceId: membership.workspaceId, role: membership.role, email: user.email, name: `${user.firstName} ${user.lastName}` } as SessionInput;
}
