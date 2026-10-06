import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, hitRateLimit } from "@/lib/rate-limit";

/** All keys start with this, so they are recognizable (and secret scanners can spot leaked ones). */
export const API_KEY_PREFIX = "mk_live_";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_LENGTH = 40; // ~238 bits of randomness
const MAX_KEYS_PER_WORKSPACE = 20;
/** Requests per minute per key. */
export const API_KEY_RATE_LIMIT = 300;
const RATE_WINDOW_SECONDS = 60;

const hashKey = (raw: string) => createHash("sha256").update(raw).digest("hex");
export const isApiKey = (raw: string | null | undefined): raw is string => Boolean(raw?.startsWith(API_KEY_PREFIX));

function generateKey() {
  const bytes = randomBytes(KEY_LENGTH);
  let out = "";
  for (let i = 0; i < KEY_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${API_KEY_PREFIX}${out}`;
}

function dto(row: { id: string; name: string; prefix: string; scopes: string[]; lastUsedAt: Date | null; revokedAt: Date | null; createdAt: Date }) {
  return { id: row.id, name: row.name, prefix: row.prefix, scopes: row.scopes, lastUsedAt: row.lastUsedAt?.toISOString() || null, revokedAt: row.revokedAt?.toISOString() || null, createdAt: row.createdAt.toISOString() };
}

export async function listApiKeys(workspaceId: string) {
  const rows = await prisma.apiKey.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  return rows.map(dto);
}

/** Creates a read-only key. The full secret is returned only here; afterwards only its prefix is known. */
export async function createApiKey(workspaceId: string, userId: string, name: string) {
  const active = await prisma.apiKey.count({ where: { workspaceId, revokedAt: null } });
  if (active >= MAX_KEYS_PER_WORKSPACE) return { ok: false as const, message: `A workspace can have up to ${MAX_KEYS_PER_WORKSPACE} active keys. Revoke one first.` };
  const secret = generateKey();
  const row = await prisma.apiKey.create({ data: { workspaceId, createdById: userId, name, prefix: secret.slice(0, API_KEY_PREFIX.length + 6), keyHash: hashKey(secret), scopes: ["read"] } });
  return { ok: true as const, key: dto(row), secret };
}

export async function revokeApiKey(workspaceId: string, id: string) {
  const updated = await prisma.apiKey.updateMany({ where: { id, workspaceId, revokedAt: null }, data: { revokedAt: new Date() } });
  return updated.count > 0;
}

/**
 * Resolves an API key to a read-only session for its workspace, or null (unknown, revoked, over its rate limit,
 * or the creator no longer has access). Each call counts toward the key's per-minute limit.
 */
export async function authenticateApiKey(raw: string) {
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(raw) },
    include: { workspace: { select: { status: true, ownerId: true } } }
  });
  if (!key || key.revokedAt || key.workspace.status !== "ACTIVE") return null;
  const limit = await hitRateLimit(`apikey:${key.id}`, API_KEY_RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) return null;
  const creator = await prisma.user.findUnique({ where: { id: key.createdById }, select: { email: true, firstName: true, lastName: true, status: true } });
  if (!creator || creator.status !== "ACTIVE") return null;
  // lastUsedAt is updated at most once a minute per key.
  await prisma.apiKey.updateMany({ where: { id: key.id, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(Date.now() - 60_000) } }] }, data: { lastUsedAt: new Date() } });
  return { userId: key.createdById, workspaceId: key.workspaceId, role: "API_KEY", email: creator.email, name: `API key: ${key.name}`, apiKeyId: key.id };
}

/** For a 429 instead of a 401: whether this key is currently over its rate limit. */
export async function apiKeyRateLimited(raw: string) {
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(raw) }, select: { id: true, revokedAt: true } });
  if (!key || key.revokedAt) return null;
  const state = await checkRateLimit(`apikey:${key.id}`, API_KEY_RATE_LIMIT, RATE_WINDOW_SECONDS);
  return state.allowed ? null : state.retryAfterSeconds;
}
