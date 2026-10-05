import * as Sentry from "@sentry/nextjs";

/**
 * Next.js Server Instrumentation Hook.
 * Executes automatically when the Next.js server starts (dev or production).
 * Initialises error monitoring, validates required configuration, and ensures that canonical
 * reference data (plans, default configuration) is synchronized in PostgreSQL.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { assertRequiredEnv } = await import("@/lib/env-check");
    assertRequiredEnv();
    const { ensureSystemBootstrapped } = await import("@/lib/bootstrap");
    await ensureSystemBootstrapped();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Used by Next.js 15+ to report errors from server components and route handlers; ignored by Next.js 14.
export const onRequestError = Sentry.captureRequestError;
