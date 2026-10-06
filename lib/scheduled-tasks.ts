import { prisma } from "@/lib/prisma";
import { runBillingLifecycle } from "@/lib/billing-lifecycle";

const HOUR_MS = 60 * 60 * 1000;

/** System-wide periodic tasks, run from the job batch (cron endpoint or worker) at most once per interval. */
const TASKS: Array<{ name: string; everyMs: number; run: () => Promise<unknown> }> = [
  { name: "billing.lifecycle", everyMs: HOUR_MS, run: () => runBillingLifecycle() }
];

/**
 * Claims a task for this interval. The conditional upsert succeeds for exactly one caller per interval, so
 * concurrent cron invocations or several workers never run the same task twice.
 */
async function claimTask(name: string, everyMs: number) {
  const now = new Date();
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    INSERT INTO "SystemTask" ("name", "lastRunAt") VALUES (${name}, ${now})
    ON CONFLICT ("name") DO UPDATE SET "lastRunAt" = EXCLUDED."lastRunAt"
    WHERE "SystemTask"."lastRunAt" <= ${new Date(now.getTime() - everyMs)}
    RETURNING "name"`;
  return rows.length > 0;
}

export async function runScheduledTasks() {
  const ran: Array<{ name: string; ok: boolean; result?: unknown }> = [];
  for (const task of TASKS) {
    if (!(await claimTask(task.name, task.everyMs))) continue;
    try {
      ran.push({ name: task.name, ok: true, result: await task.run() });
    } catch (error) {
      // Logged (and reported to Sentry); the task runs again next interval.
      console.error(`[scheduled] ${task.name} failed:`, error);
      ran.push({ name: task.name, ok: false });
    }
  }
  return ran;
}
