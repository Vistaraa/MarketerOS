/**
 * Validates required configuration when the server boots. In production a missing secret throws, so a
 * misconfigured deployment fails at startup instead of silently falling back to insecure defaults.
 */
export function assertRequiredEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is not set.");

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
