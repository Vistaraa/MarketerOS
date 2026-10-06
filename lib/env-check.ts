/**
 * Connection-pooling advice for serverless hosting. Each serverless instance opens its own connections, so
 * production should use a pooler (Supabase: transaction pooler on port 6543). Prisma needs pgbouncer=true there,
 * otherwise prepared statements fail intermittently.
 */
export function databaseUrlWarnings(databaseUrl: string | undefined, isProduction: boolean): string[] {
  if (!databaseUrl) return [];
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return ["DATABASE_URL is not a valid URL."];
  }
  const warnings: string[] = [];
  const pooled = url.port === "6543" || url.hostname.includes("pooler");
  if (pooled && url.searchParams.get("pgbouncer") !== "true") {
    warnings.push("DATABASE_URL points at a connection pooler but lacks ?pgbouncer=true; Prisma prepared statements will fail intermittently.");
  }
  if (isProduction && url.hostname.endsWith("supabase.co") && !pooled) {
    warnings.push("DATABASE_URL uses a direct Supabase connection. On serverless hosting use the transaction pooler (port 6543) with ?pgbouncer=true&connection_limit=1, and keep the direct URL in DIRECT_URL for migrations.");
  }
  return warnings;
}

/**
 * Validates required configuration when the server boots. In production a missing secret throws, so a
 * misconfigured deployment fails at startup instead of silently falling back to insecure defaults.
 */
export function assertRequiredEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is not set.");
  if (isProduction && !process.env.DIRECT_URL) problems.push("DIRECT_URL is not set (direct, non-pooled connection used by prisma migrate).");
  for (const warning of databaseUrlWarnings(process.env.DATABASE_URL, isProduction)) console.warn(`[env] ${warning}`);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) problems.push("SESSION_SECRET must be set to at least 32 characters.");

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    problems.push("ENCRYPTION_KEY is not set (it encrypts integration credentials at rest).");
  } else if (!/^[a-f0-9]{64}$/i.test(encryptionKey)) {
    // Only a warning: changing the key format would make already-encrypted credentials unreadable.
    console.warn("[env] ENCRYPTION_KEY is not 64 hex characters; it is being hashed into a key. Prefer a random 32-byte hex key for new deployments.");
  }

  if (isProduction && !process.env.APP_URL) problems.push("APP_URL must be set in production (used for password reset and email verification links).");

  if (isProduction) {
    const payuKey = (process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY)?.trim();
    const payuEnv = (process.env.PAYU_ENV || process.env.PAYU_MODE || "test").toLowerCase();
    if (!payuKey) console.warn("[env] PayU is not configured (PAYU_MERCHANT_KEY / PAYU_MERCHANT_SALT): customers can't pay, so trials can't convert.");
    else if (payuEnv !== "production" && payuEnv !== "live") console.warn("[env] PAYU_ENV is not \"production\": payments go to PayU's test environment and no real money is collected.");
  }

  if (isProduction && process.env.STORAGE_DRIVER !== "s3") {
    // A warning, not a failure: single-server hosts can keep files on disk, but serverless platforms discard them.
    console.warn("[env] STORAGE_DRIVER is not \"s3\": media uploads are stored on local disk and will be lost on serverless hosts such as Vercel.");
  }

  if (problems.length === 0) return;
  const message = `Missing or invalid configuration:\n  - ${problems.join("\n  - ")}`;
  if (isProduction) {
    // Next.js catches errors thrown from the instrumentation hook and keeps serving 500s; exit so the
    // platform sees a failed deploy instead of a server that looks alive.
    console.error(`[env] ${message}\nRefusing to start.`);
    process.exit(1);
  }
  console.warn(`[env] ${message}`);
}
