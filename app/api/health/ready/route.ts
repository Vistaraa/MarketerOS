import { NextResponse } from "next/server";
import { checkReadiness } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness probe: database reachable, migrations up to date, storage usable. 200 when ready, 503 otherwise.
 * /api/health stays the cheap liveness probe (process is up) and doesn't touch dependencies.
 */
export async function GET() {
  const result = await checkReadiness();
  return NextResponse.json(
    { status: result.ready ? "ready" : "not_ready", service: "marketeros", timestamp: new Date().toISOString(), checks: result.checks },
    { status: result.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
