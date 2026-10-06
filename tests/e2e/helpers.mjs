/**
 * Shared helpers for the end-to-end suites in tests/e2e. They run against a live server (BASE_URL) and use
 * the same database (DATABASE_URL, read from the environment or .env) for fixtures and assertions.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PrismaClient } from "@prisma/client";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const BASE = process.env.BASE_URL || "http://localhost:3000";
export const STORAGE_DIR = process.env.STORAGE_LOCAL_DIR ? path.resolve(process.env.STORAGE_LOCAL_DIR) : path.resolve("storage/uploads");
export const prisma = new PrismaClient();

/** Runs SQL and returns rows formatted like `psql -tA` (columns joined by "|", rows by newline). */
export async function sql(query) {
  if (!/^\s*select/i.test(query)) {
    await prisma.$executeRawUnsafe(query);
    return "";
  }
  const rows = await prisma.$queryRawUnsafe(query);
  const format = (v) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "boolean" ? (v ? "t" : "f") : String(v));
  return rows.map((row) => Object.values(row).map(format).join("|")).join("\n").trim();
}

/** Per-IP auth rate limits are shared state; each suite starts from a clean slate. */
export const clearIpLimits = () => sql(`delete from "RateLimit" where key like '%:ip:%'`);

/** Deletes everything a suite created: its users (emails e2e-<runId>-...), their workspaces (cascading) and links. */
export async function cleanupRun(runId) {
  const users = await prisma.user.findMany({ where: { email: { startsWith: `e2e-${runId}-` } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await prisma.oAuthState.deleteMany({ where: { userId: { in: ids } } });
    await prisma.workspace.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await clearIpLimits();
}

/** A real, decodable PNG (w×h, solid colour) so browsers and checks can treat it as an image. */
export function makePng(w, h) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x7c)]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Chrome/Chromium for browser tests, or null when none is installed (those tests are then skipped). */
export function findChrome() {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

/** Marks a test account's email as confirmed (payments, invitations and integrations require it). */
export const verifyEmail = (email) => sql(`update "User" set "emailVerifiedAt" = timezone('utc', now()) where email = '${email.replaceAll("'", "''")}'`);
