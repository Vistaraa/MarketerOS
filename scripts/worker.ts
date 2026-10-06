/**
 * Long-running background worker for servers and containers: npm run worker
 * (On Vercel, /api/cron/jobs runs the same batches on a schedule instead.)
 *
 * Polls for due jobs, retries failures with backoff, recovers jobs left RUNNING by a crashed worker,
 * and on SIGTERM/SIGINT finishes the current batch before exiting.
 */
import "../sentry.server.config";
import { runJobBatch } from "../lib/jobs";
import { prisma } from "../lib/prisma";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const runOnce = process.argv.includes("--once");

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (stopping) process.exit(1);
    stopping = true;
    log({ event: "shutdown_requested", signal });
  });
}

function log(entry: Record<string, unknown>, level: "info" | "error" = "info") {
  const line = JSON.stringify({ ts: new Date().toISOString(), service: "worker", level, ...entry });
  // console.error lines are reported to Sentry when SENTRY_DSN is set.
  if (level === "error") console.error(line);
  else console.log(line);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  log({ event: "started", pollIntervalMs: POLL_INTERVAL_MS, once: runOnce });
  while (!stopping) {
    try {
      const { scheduled, recovered, processed } = await runJobBatch();
      for (const task of scheduled) log({ event: "scheduled_task", ...task }, task.ok ? "info" : "error");
      if (recovered) log({ event: "recovered_stuck_jobs", count: recovered });
      for (const job of processed) log({ event: "job_finished", ...job });
      if (runOnce) break;
      if (processed.length === 0) await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      log({ event: "batch_error", error: error instanceof Error ? error.message : String(error) }, "error");
      if (runOnce) throw error;
      await sleep(POLL_INTERVAL_MS);
    }
  }
  log({ event: "stopped" });
}

main()
  .catch(() => { process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
