import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runJobBatch } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without a configured secret the endpoint is disabled. */
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid cron credentials." } }, { status: 401 });
  }
  // Stay well inside the function time limit; unfinished jobs are picked up on the next run.
  const result = await runJobBatch({ maxJobs: 25, maxMs: 45_000 });
  return NextResponse.json({ data: result });
}
