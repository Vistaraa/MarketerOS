import { prisma } from "@/lib/prisma";

export type RateLimitResult = { allowed: boolean; count: number; retryAfterSeconds: number };

/**
 * Best-effort client IP. Behind Vercel or another proxy that overwrites x-forwarded-for this is reliable;
 * when the app is exposed directly, clients can spoof it, so per-account limits are the real backstop.
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Counts one hit against `key` and reports whether it is still within `limit` per `windowSeconds`. */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  // One atomic upsert, so concurrent requests on different server instances can't race past the limit.
  const rows = await prisma.$queryRaw<Array<{ count: number; retry: number }>>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" <= now() - ${windowSeconds} * interval '1 second' THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" <= now() - ${windowSeconds} * interval '1 second' THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("windowStart" + ${windowSeconds} * interval '1 second' - now())))::int AS "retry"`;
  const row = rows[0];
  if (Math.random() < 0.01) void pruneExpired();
  return { allowed: row.count <= limit, count: row.count, retryAfterSeconds: Math.max(1, row.retry) };
}

/** Reports whether `key` is already over `limit` in the current window, without counting a hit. */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<Array<{ count: number; retry: number }>>`
    SELECT "count", CEIL(EXTRACT(EPOCH FROM ("windowStart" + ${windowSeconds} * interval '1 second' - now())))::int AS "retry"
    FROM "RateLimit"
    WHERE "key" = ${key} AND "windowStart" > now() - ${windowSeconds} * interval '1 second'`;
  const row = rows[0];
  if (!row) return { allowed: true, count: 0, retryAfterSeconds: 0 };
  return { allowed: row.count < limit, count: row.count, retryAfterSeconds: Math.max(1, row.retry) };
}

export async function clearRateLimit(key: string) {
  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key}`;
}

async function pruneExpired() {
  try {
    await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day'`;
  } catch {
    // Pruning is opportunistic; a failure here must never affect the request.
  }
}

export function formatRetryAfter(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}
