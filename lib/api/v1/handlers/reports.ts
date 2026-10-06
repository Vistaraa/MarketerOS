/** /api/v1/reports handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { enqueueJob } from "@/lib/jobs";
import { cacheGetOrSet } from "@/lib/cache";
import { listPersistedReports } from "@/lib/repositories";
import { reportInput, nextReportRun, ok, error, type V1Context } from "@/lib/api/v1/core";

export async function GET({ url, path, auth, listQuery }: V1Context): Promise<Response | null> {
  if (path === "reports") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:reports`, async () => ({ items: await listPersistedReports(auth.session.workspaceId), filters: listQuery }), 15_000));
  const download = /^reports\/([^/]+)\/download$/.exec(path);
  if (download) {
    const report = await prisma.report.findFirst({ where: { id: download[1], workspaceId: auth.session.workspaceId }, select: { id: true, title: true, status: true } });
    if (!report || report.status !== "READY") return error("Report not found.", 404);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "pdf";
    const { reportFileKey } = await import("@/lib/reports");
    const { objectStorage } = await import("@/lib/storage");
    const file = await objectStorage().get(reportFileKey(auth.session.workspaceId, report.id, format));
    if (!file) return error("This report's file is missing. Regenerate the report.", 404, "REPORT_FILE_MISSING");
    const filename = `${report.title.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "report"}.${format}`;
    return new NextResponse(new Uint8Array(file.body), { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  if (path.startsWith("reports/")) {
    const id = path.split("/")[1];
    const { getPersistedReport } = await import("@/lib/repositories");
    const found = await getPersistedReport(auth.session.workspaceId, id);
    return found ? ok(found) : error("Report not found.", 404);
  }
  return null;
}

export async function POST({ path, auth, body }: V1Context): Promise<Response | null> {
  if (path === "reports") {
    const parsed = reportInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid report.");
    if (parsed.data.clientId && !(await prisma.client.count({ where: { id: parsed.data.clientId, workspaceId: auth.session.workspaceId } }))) return error("Client not found.", 404);
    const schedule = parsed.data.schedule === "none" ? null : parsed.data.schedule;
    const report = await prisma.report.create({ data: { workspaceId: auth.session.workspaceId, createdById: auth.session.userId, name: parsed.data.name, title: parsed.data.name, clientId: parsed.data.clientId, format: parsed.data.format, dateRange: parsed.data.dateRange, configuration: parsed.data.configuration as never, scheduleFrequency: schedule, nextRunAt: schedule ? nextReportRun(schedule) : null, status: "GENERATING" } }); const job = await enqueueJob("report.generate", { workspaceId: auth.session.workspaceId, reportId: report.id, runAt: new Date().toISOString() }); return ok({ ...report, jobId: job.id }, undefined, { status: 202 }); }
  return null;
}

export async function PATCH({ path, auth, body }: V1Context): Promise<Response | null> {
  if (/^reports\/[^/]+$/.test(path)) {
    const parsed = z.object({ schedule: z.enum(["none", "weekly", "monthly"]) }).safeParse(body);
    if (!parsed.success) return error("Choose a schedule: none, weekly or monthly.");
    const schedule = parsed.data.schedule === "none" ? null : parsed.data.schedule;
    const updated = await prisma.report.updateMany({ where: { id: path.split("/")[1], workspaceId: auth.session.workspaceId }, data: { scheduleFrequency: schedule, nextRunAt: schedule ? nextReportRun(schedule) : null } });
    if (!updated.count) return error("Report not found.", 404);
    return ok({ schedule, nextRunAt: schedule ? nextReportRun(schedule).toISOString() : null });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "reports") {
    const deleted = await prisma.report.deleteMany({ where: { id, workspaceId: auth.session.workspaceId } });
    if (!deleted.count) return error("Report not found.", 404);
    const { deleteReportFiles } = await import("@/lib/reports");
    await deleteReportFiles(auth.session.workspaceId, id);
    await recordAudit({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, action: "DELETE", module: "reports", entityType: "Report", entityId: id });
    return ok({ deleted: id });
  }
  return null;
}
