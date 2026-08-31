import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/integrations/provider";

export type JobName = "integration.sync" | "metrics.aggregate" | "report.generate" | "automation.evaluate";

export type JobPayload = { workspaceId: string; integrationId?: string; reportId?: string; runAt?: string; [key: string]: unknown };

export type QueuedJob = { id: string; name: JobName; payload: JobPayload; status: "queued" | "running" | "complete" | "failed"; createdAt: string };

export async function enqueueJob(name: JobName, payload: JobPayload) {
  const job = await prisma.backgroundJob.create({ data: { workspaceId: payload.workspaceId, integrationId: payload.integrationId, name, payload: payload as never, runAt: payload.runAt ? new Date(payload.runAt) : new Date() } });
  return { id: job.id, name: job.name as JobName, payload: job.payload as JobPayload, status: job.status as QueuedJob["status"], createdAt: job.createdAt.toISOString() };
}

export async function listJobs(workspaceId: string) {
  const jobs = await prisma.backgroundJob.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 });
  return jobs.map((job) => ({ id: job.id, name: job.name as JobName, payload: job.payload as JobPayload, status: job.status as QueuedJob["status"], createdAt: job.createdAt.toISOString() }));
}

export async function processNextJob() {
  const candidate = await prisma.backgroundJob.findFirst({ where: { status: "queued", runAt: { lte: new Date() } }, orderBy: { runAt: "asc" } });
  if (!candidate) return null;
  const claimed = await prisma.backgroundJob.updateMany({ where: { id: candidate.id, status: "queued" }, data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } } });
  if (!claimed.count) return null;
  try {
    let result: Record<string, unknown> = {};
    if (candidate.name === "integration.sync") result = await processIntegrationSync(candidate.id, candidate.workspaceId, candidate.integrationId, candidate.payload as JobPayload);
    if (candidate.name === "report.generate" && candidate.payload && typeof candidate.payload === "object") {
      const reportId = (candidate.payload as JobPayload).reportId;
      if (reportId) {
        const report = await prisma.report.findFirst({ where: { id: reportId, workspaceId: candidate.workspaceId } });
        if (!report) throw new Error("Report not found.");
        const campaigns = await prisma.campaign.findMany({ where: { workspaceId: candidate.workspaceId }, select: { name: true, platform: true, status: true, spend: true, clicks: true, conversions: true, roas: true } });
        const csv = ["Campaign,Platform,Status,Spend,Clicks,Conversions,ROAS", ...campaigns.map((row) => [row.name, row.platform, row.status, row.spend.toString(), row.clicks, row.conversions, row.roas.toString()].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
        const generatedUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
        await prisma.report.update({ where: { id: report.id }, data: { status: "READY", generatedUrl } });
        result = { reportId, status: "ready", rows: campaigns.length };
      }
    }
    if (candidate.name === "automation.evaluate") result = { evaluatedAt: new Date().toISOString() };
    await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: "complete", result: result as never, finishedAt: new Date() } });
    return { ...candidate, status: "complete", result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background job failed.";
    await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: "failed", errorMessage: message, finishedAt: new Date() } });
    if (candidate.integrationId) await prisma.integration.updateMany({ where: { id: candidate.integrationId, workspaceId: candidate.workspaceId }, data: { status: "ERROR", errorMessage: message, lastSyncFinished: new Date() } });
    return { ...candidate, status: "failed", errorMessage: message };
  }
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
