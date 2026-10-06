import { readdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";

const CHECK_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS))]);
}

async function checkDatabase() {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, "database");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    console.error("[health] database check failed:", error);
    return { ok: false, latencyMs: Date.now() - started };
  }
}

/**
 * Compares migrations shipped with this build (prisma/migrations) with those applied to the database.
 * A pending or failed migration means this release is running against a schema it wasn't built for.
 */
async function checkMigrations() {
  try {
    const rows = await withTimeout(
      prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`,
      "migrations"
    );
    const applied = new Set(rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name));
    const failed = rows.filter((r) => !r.finished_at && !r.rolled_back_at).length;
    let shipped: string[] | null = null;
    try {
      const entries = await readdir(path.join(process.cwd(), "prisma", "migrations"), { withFileTypes: true });
      shipped = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch {
      // The migrations folder isn't bundled with this deployment; only failed migrations can be detected.
    }
    const pending = shipped ? shipped.filter((name) => !applied.has(name)).length : null;
    return { ok: failed === 0 && (pending === null || pending === 0), applied: applied.size, pending, failed };
  } catch (error) {
    console.error("[health] migrations check failed:", error);
    return { ok: false, applied: null, pending: null, failed: null };
  }
}

async function checkStorage() {
  const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  try {
    return { ok: await withTimeout(objectStorage().healthCheck(), "storage"), driver };
  } catch (error) {
    console.error("[health] storage check failed:", error);
    return { ok: false, driver };
  }
}

/** Readiness for uptime monitors and deploy checks. Reports only booleans and counts, never error details. */
export async function checkReadiness() {
  const [database, migrations, storage] = await Promise.all([checkDatabase(), checkMigrations(), checkStorage()]);
  return { ready: database.ok && migrations.ok && storage.ok, checks: { database, migrations, storage } };
}
