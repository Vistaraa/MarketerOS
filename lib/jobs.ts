import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/integrations/provider";

export type JobName = "integration.sync" | "metrics.aggregate" | "report.generate" | "automation.evaluate";

export type JobPayload = { workspaceId: string; integrationId?: string; reportId?: string; runAt?: string; [key: string]: unknown };

// Statuses are uppercase to match the column default ("QUEUED") and existing rows.
export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type QueuedJob = { id: string; name: JobName; payload: JobPayload; status: JobStatus; createdAt: string };

const STUCK_AFTER_MS = 15 * 60 * 1000;
const RETRY_BASE_MS = 30 * 1000;

export async function enqueueJob(name: JobName, payload: JobPayload) {
  const job = await prisma.backgroundJob.create({
    data: { workspaceId: payload.workspaceId, integrationId: payload.integrationId, name, type: name, status: "QUEUED", payload: payload as never, runAt: payload.runAt ? new Date(payload.runAt) : new Date() }
  });
  return { id: job.id, name: job.name as JobName, payload: job.payload as JobPayload, status: job.status as JobStatus, createdAt: job.createdAt.toISOString() };
}

export async function listJobs(workspaceId: string) {
  const jobs = await prisma.backgroundJob.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 });
  return jobs.map((job) => ({ id: job.id, name: job.name as JobName, payload: job.payload as JobPayload, status: job.status as JobStatus, createdAt: job.createdAt.toISOString() }));
}

/**
 * Jobs left RUNNING by a worker that crashed or was killed mid-job. They are retried if attempts remain,
 * otherwise marked FAILED, so nothing stays stuck forever.
 */
export async function recoverStuckJobs() {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);
  const stuck = await prisma.backgroundJob.findMany({ where: { status: "RUNNING", startedAt: { lt: cutoff } } });
  for (const job of stuck) {
    await failOrRetry(job, "The job did not finish (worker stopped or timed out).");
  }
  return stuck.length;
}

/** Claims and runs the next due job. Returns null when there is nothing to do. */
export async function processNextJob() {
  const candidate = await prisma.backgroundJob.findFirst({ where: { status: "QUEUED", runAt: { lte: new Date() } }, orderBy: { runAt: "asc" } });
  if (!candidate) return null;
  // Atomic claim: if another worker took it first, this update matches nothing.
  const claimed = await prisma.backgroundJob.updateMany({ where: { id: candidate.id, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } } });
  if (!claimed.count) return null;
  const job = { ...candidate, attempts: candidate.attempts + 1 };
  const payload = (candidate.payload || {}) as JobPayload;

  try {
    let result: Record<string, unknown> = {};
    if (candidate.name === "integration.sync") result = await processIntegrationSync(candidate.id, candidate.workspaceId, candidate.integrationId, payload);
    else if (candidate.name === "report.generate") result = await processReportGenerate(candidate.workspaceId, payload);
    else throw new Error(`No handler for job type "${candidate.name}".`);
    await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: "COMPLETED", result: result as never, errorMessage: null, finishedAt: new Date(), completedAt: new Date() } });
    return { id: candidate.id, name: candidate.name, status: "COMPLETED" as JobStatus, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background job failed.";
    const status = await failOrRetry(job, message);
    return { id: candidate.id, name: candidate.name, status, errorMessage: message };
  }
}

/**
 * Runs due jobs until the queue is empty or a limit is hit. Shared by the long-running worker
 * (scripts/worker.ts) and the serverless cron endpoint (/api/cron/jobs).
 */
export async function runJobBatch({ maxJobs = 25, maxMs = 50_000 }: { maxJobs?: number; maxMs?: number } = {}) {
  const startedAt = Date.now();
  const recovered = await recoverStuckJobs();
  const processed: Array<{ id: string; name: string | null; status: JobStatus }> = [];
  while (processed.length < maxJobs && Date.now() - startedAt < maxMs) {
    const job = await processNextJob();
    if (!job) break;
    processed.push({ id: job.id, name: job.name, status: job.status });
  }
  return { recovered, processed };
}

async function failOrRetry(job: { id: string; name: string | null; workspaceId: string; integrationId: string | null; payload: unknown; attempts: number; maxAttempts: number }, message: string): Promise<JobStatus> {
  if (job.attempts < job.maxAttempts) {
    // Exponential backoff: 30s, 60s, 120s, ...
    const delay = RETRY_BASE_MS * 2 ** Math.max(0, job.attempts - 1);
    await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: "QUEUED", errorMessage: message, runAt: new Date(Date.now() + delay) } });
    return "QUEUED";
  }
  await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: message, finishedAt: new Date() } });
  console.error(`[jobs] ${job.name} job ${job.id} failed permanently after ${job.attempts} attempt(s): ${message}`);
  // Surface the final failure on the record the user is waiting on.
  if (job.integrationId) {
    await prisma.integration.updateMany({ where: { id: job.integrationId, workspaceId: job.workspaceId }, data: { status: "ERROR", errorMessage: message, lastSyncFinished: new Date() } });
  }
  const reportId = (job.payload as JobPayload | null)?.reportId;
  if (job.name === "report.generate" && reportId) {
    await prisma.report.updateMany({ where: { id: reportId, workspaceId: job.workspaceId }, data: { status: "FAILED" } });
  }
  return "FAILED";
}

async function processReportGenerate(workspaceId: string, payload: JobPayload) {
  const reportId = payload.reportId;
  if (!reportId) throw new Error("Report jobs require a reportId.");
  const report = await prisma.report.findFirst({ where: { id: reportId, workspaceId } });
  if (!report) throw new Error("Report not found.");
  const campaigns = await prisma.campaign.findMany({ where: { workspaceId }, select: { name: true, platform: true, status: true, spend: true, clicks: true, conversions: true, roas: true } });
  const csv = ["Campaign,Platform,Status,Spend,Clicks,Conversions,ROAS", ...campaigns.map((row) => [row.name, row.platform, row.status, row.spend.toString(), row.clicks, row.conversions, row.roas.toString()].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
  const generatedUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  await prisma.report.update({ where: { id: report.id }, data: { status: "READY", generatedUrl } });
  return { reportId, status: "ready", rows: campaigns.length };
}

async function processIntegrationSync(jobId: string, workspaceId: string, integrationId: string | null, payload: JobPayload) {
  if (!integrationId) throw new Error("Integration sync jobs require an integrationId.");
  const integration = await prisma.integration.findFirst({ where: { id: integrationId, workspaceId } });
  if (!integration) throw new Error("Integration not found.");
  const accessTokenRaw = integration.accessTokenEncrypted || (integration as any).apiKeyEncrypted || (integration as any).apiKey;
  if (!accessTokenRaw) throw new Error("This integration is not connected. Configure credentials before syncing.");
  const provider = getProvider((integration.providerKey || integration.platform) as never);
  const accessToken = decryptSecret(accessTokenRaw);
  const from = new Date(typeof payload.from === "string" ? payload.from : Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date(typeof payload.to === "string" ? payload.to : Date.now());
  await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncStarted: new Date(), errorMessage: null } });
  const metrics = await provider.syncMetrics(accessToken, integration.accountId || "", from, to);
  let recordsSynced = 0;
  for (const metric of metrics) {
    const date = new Date(`${metric.date}T00:00:00.000Z`);
    const existing = await prisma.platformMetricDaily.findFirst({ where: { workspaceId, clientId: integration.clientId, platform: integration.platform, date } });
    if (existing) await prisma.platformMetricDaily.update({ where: { id: existing.id }, data: { impressions: metric.impressions, clicks: metric.clicks, conversions: metric.conversions, spend: metric.spend, revenue: metric.revenue } });
    else await prisma.platformMetricDaily.create({ data: { workspaceId, clientId: integration.clientId, platform: integration.platform, date, impressions: metric.impressions, clicks: metric.clicks, conversions: metric.conversions, spend: metric.spend, revenue: metric.revenue } });
    recordsSynced += 1;
  }
  await prisma.integrationSyncLog.create({ data: { integrationId: integration.id, status: "COMPLETED", recordsSynced, finishedAt: new Date(), metadata: { jobId, provider: provider.providerKey } } });
  await prisma.integration.update({ where: { id: integration.id }, data: { status: "CONNECTED", lastSyncedAt: new Date(), lastSyncFinished: new Date(), errorMessage: null } });
  return { recordsSynced, provider: provider.providerKey };
}
