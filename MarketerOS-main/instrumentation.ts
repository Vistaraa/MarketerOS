/**
 * Next.js Server Instrumentation Hook.
 * Executes automatically when the Next.js server starts (dev or production).
 * Completely eliminates manual seeding by automatically ensuring that canonical
 * reference data (plans, default configuration) is synchronized in PostgreSQL.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSystemBootstrapped } = await import("@/lib/bootstrap");
    await ensureSystemBootstrapped();
  }
}
