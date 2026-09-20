import { Prisma, PrismaClient } from "@prisma/client";

export { Prisma };

/**
 * Optimizes the PostgreSQL database connection string for serverless environments (e.g. Vercel + Supabase).
 * 
 * 1. Supabase Session Mode (Port 5432 on pooler.supabase.com) has a strict limit of 15 connections
 *    which triggers "FATAL: (EMAXCONNSESSION) max clients reached in session mode".
 *    We automatically rewrite this to Transaction Mode (Port 6543) with ?pgbouncer=true.
 * 2. In serverless environments, connection_limit=1 ensures each Lambda container only consumes 
 *    1 connection from the pool instead of default 5-10, preventing pool exhaustion.
 */
function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);

    // If connecting to Supabase Pooler
    if (parsed.hostname.includes("pooler.supabase.com")) {
      // Switch from Session Mode (5432) to Transaction Mode (6543)
      if (parsed.port === "5432" || !parsed.port) {
        parsed.port = "6543";
      }

      // PgBouncer in transaction mode requires pgbouncer=true to disable prepared statements
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }

      // Limit connections per serverless container
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }

      return parsed.toString();
    }

    // For any serverless environment (e.g. Vercel), limit connections per lambda to 1
    if (process.env.VERCEL && !parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
      return parsed.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

const dbUrl = getOptimizedDatabaseUrl();

const globalForPrisma = globalThis as unknown as { marketerPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.marketerPrisma ??
  new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
    log: ["error"],
  });

globalForPrisma.marketerPrisma = prisma;
