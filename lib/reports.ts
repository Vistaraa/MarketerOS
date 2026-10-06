import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { objectStorage } from "@/lib/storage";
import { buildPersistedOverview, parseOverviewQuery } from "@/lib/overview-service";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<string, number> = { last_7_days: 7, last_30_days: 30, last_90_days: 90 };
export const REPORT_SCHEDULES = ["weekly", "monthly"] as const;

type ReportRow = { id: string; workspaceId: string; title: string; clientId: string | null; dateRange: string | null; configuration: unknown };

/** The reporting period: explicit dates from the configuration, else a named range (default: last 30 days). */
export function reportPeriod(report: Pick<ReportRow, "dateRange" | "configuration">, now = new Date()) {
  const config = (report.configuration as { dateFrom?: string; dateTo?: string } | null) || {};
  if (config.dateFrom && config.dateTo) return { from: config.dateFrom, to: config.dateTo };
  const days = RANGE_DAYS[report.dateRange || ""] || 30;
  const to = new Date(now.getTime() - DAY_MS);
  return { from: new Date(to.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Where a report's files live in object storage. */
export const reportFileKey = (workspaceId: string, reportId: string, format: "pdf" | "csv") => `reports/${workspaceId}/${reportId}.${format}`;

async function reportData(report: ReportRow) {
  const period = reportPeriod(report);
  const days = Math.round((Date.parse(period.to) - Date.parse(period.from)) / DAY_MS) + 1;
  const compareTo = new Date(Date.parse(period.from) - DAY_MS).toISOString().slice(0, 10);
  const compareFrom = new Date(Date.parse(period.from) - days * DAY_MS).toISOString().slice(0, 10);
  const params = new URLSearchParams({ dateFrom: period.from, dateTo: period.to, compareFrom, compareTo, ...(report.clientId ? { clientId: report.clientId } : {}) });
  const parsed = parseOverviewQuery(new Request(`http://report.local/?${params}`));
  if (!parsed.success) throw new Error(parsed.message);
  const [overview, workspace, client] = await Promise.all([
    buildPersistedOverview(report.workspaceId, parsed.data),
    prisma.workspace.findUnique({ where: { id: report.workspaceId }, select: { name: true, currency: true } }),
    report.clientId ? prisma.client.findFirst({ where: { id: report.clientId, workspaceId: report.workspaceId }, select: { name: true } }) : null
  ]);
  return { period, overview, workspaceName: workspace?.name || "Workspace", clientName: client?.name || null };
}

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  // Leading =, +, -, @ would run as formulas in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export function reportCsv(data: Awaited<ReturnType<typeof reportData>>, title: string) {
  const lines: unknown[][] = [
    [title],
    ["Workspace", data.workspaceName],
    ...(data.clientName ? [["Client", data.clientName]] : []),
    ["Period", `${data.period.from} to ${data.period.to}`],
    [],
    ["Metric", "Value", "Change vs previous period"],
    ...data.overview.kpis.map((k) => [k.label, k.value, k.change]),
    [],
    ["Channel", "Spend", "Share %"],
    ...data.overview.platformSpend.map((p) => [p.label, p.value, p.percent]),
    [],
    ["Campaign", "Platform", "Status", "Spend", "Clicks", "Conversions", "ROAS", "CTR %", "CPA"],
    ...data.overview.campaigns.map((c) => [c.name, c.platform, c.status, c.spend, c.clicks, c.conversions, c.roas, c.ctr, c.cpa])
  ];
  return lines.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Standard PDF fonts only cover Latin-1; other characters are replaced so generation never fails. */
const pdfText = (value: unknown) => String(value ?? "").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

export async function reportPdf(data: Awaited<ReturnType<typeof reportData>>, title: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfText(title));
  pdf.setProducer("MarketerOS");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const H = 841.89;
  const M = 48;
  const ink = rgb(0.09, 0.09, 0.11);
  const muted = rgb(0.45, 0.45, 0.5);
  const line = rgb(0.88, 0.88, 0.9);
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: unknown, x: number, size = 10, font: PDFFont = regular, color = ink, maxWidth?: number) => {
    let out = pdfText(s);
    if (maxWidth && font.widthOfTextAtSize(out, size) > maxWidth) {
      while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) out = out.slice(0, -1);
      out = `${out}...`;
    }
    page.drawText(out, { x, y, size, font, color });
  };
  const ensure = (needed: number) => {
    if (y - needed < M + 20) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };

  // Header
  text("MarketerOS", M, 9, bold, muted);
  y -= 26;
  text(title, M, 20, bold, ink, W - 2 * M);
  y -= 18;
  text(`${data.workspaceName}${data.clientName ? ` / ${data.clientName}` : ""} - ${data.period.from} to ${data.period.to}`, M, 10, regular, muted);
  y -= 30;

  // KPI grid (3 per row)
  const colW = (W - 2 * M) / 3;
  data.overview.kpis.forEach((k, i) => {
    if (i % 3 === 0) { ensure(54); if (i) y -= 54; }
    const x = M + (i % 3) * colW;
    page.drawRectangle({ x, y: y - 40, width: colW - 8, height: 48, borderColor: line, borderWidth: 1 });
    const saveY = y;
    y = saveY - 8; text(k.label, x + 8, 8, regular, muted, colW - 24);
    y = saveY - 24; text(k.value, x + 8, 14, bold, ink, colW - 24);
    y = saveY - 36; text(`${k.change} vs previous period`, x + 8, 7, regular, muted, colW - 24);
    y = saveY;
  });
  y -= 70;

  // Spend by channel
  ensure(40 + data.overview.platformSpend.length * 18);
  text("Spend by channel", M, 12, bold);
  y -= 18;
  if (!data.overview.platformSpend.length) { text("No spend recorded in this period.", M, 9, regular, muted); y -= 16; }
  for (const p of data.overview.platformSpend) {
    text(p.label, M, 9, regular, ink, 120);
    page.drawRectangle({ x: M + 130, y: y - 1, width: Math.max(1, (W - 2 * M - 230) * (p.percent / 100)), height: 9, color: rgb(0.39, 0.4, 0.95) });
    text(`${p.value.toLocaleString("en-US")} (${p.percent}%)`, W - M - 90, 9, regular, muted, 90);
    y -= 16;
  }
  y -= 16;

  // Campaign table
  const cols: Array<[string, number, (c: (typeof data.overview.campaigns)[number]) => unknown]> = [
    ["Campaign", 170, (c) => c.name],
    ["Platform", 80, (c) => c.platform],
    ["Status", 55, (c) => c.status],
    ["Spend", 60, (c) => c.spend.toLocaleString("en-US")],
    ["Clicks", 50, (c) => c.clicks.toLocaleString("en-US")],
    ["Conv.", 40, (c) => c.conversions],
    ["ROAS", 44, (c) => c.roas]
  ];
  const header = () => {
    ensure(40);
    let x = M;
    for (const [label, width] of cols) { text(label, x, 8, bold, muted, width - 4); x += width; }
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: line });
    y -= 12;
  };
  ensure(60);
  text(`Campaigns (${data.overview.campaigns.length})`, M, 12, bold);
  y -= 20;
  header();
  if (!data.overview.campaigns.length) text("No campaigns.", M, 9, regular, muted);
  for (const c of data.overview.campaigns) {
    if (y < M + 40) { page = pdf.addPage([W, H]); y = H - M; header(); }
    let x = M;
    for (const [, width, value] of cols) { text(value(c), x, 8.5, regular, ink, width - 6); x += width; }
    y -= 14;
  }

  // Footer on every page
  const pages = pdf.getPages();
  const generated = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  pages.forEach((p, i) => {
    p.drawText(pdfText(`Generated ${generated} - page ${i + 1} of ${pages.length}`), { x: M, y: M - 20, size: 7, font: regular, color: muted });
  });
  return Buffer.from(await pdf.save());
}

/**
 * Background job: builds the report's PDF and CSV from the same numbers the dashboard shows, stores both in object
 * storage and marks the report ready. Files are downloaded through /api/v1/reports/:id/download (authenticated).
 */
export async function generateReportFiles(workspaceId: string, reportId: string) {
  const report = await prisma.report.findFirst({ where: { id: reportId, workspaceId } });
  if (!report) throw new Error("Report not found.");
  const data = await reportData(report);
  const [pdf, csv] = [await reportPdf(data, report.title), Buffer.from(reportCsv(data, report.title), "utf8")];
  const storage = objectStorage();
  await storage.put(reportFileKey(workspaceId, reportId, "pdf"), pdf, "application/pdf");
  await storage.put(reportFileKey(workspaceId, reportId, "csv"), csv, "text/csv; charset=utf-8");
  const downloadUrl = `/api/v1/reports/${reportId}/download?format=${report.format === "CSV" ? "csv" : "pdf"}`;
  await prisma.report.update({
    where: { id: reportId },
    data: { status: "READY", generatedUrl: downloadUrl, downloadUrl, fileSize: report.format === "CSV" ? csv.length : pdf.length, config: { period: data.period, files: { pdf: pdf.length, csv: csv.length }, generatedAt: new Date().toISOString() } as never }
  });
  return { reportId, status: "ready", rows: data.overview.campaigns.length, pdfBytes: pdf.length, csvBytes: csv.length };
}

export async function deleteReportFiles(workspaceId: string, reportId: string) {
  const storage = objectStorage();
  await Promise.all((["pdf", "csv"] as const).map((f) => storage.delete(reportFileKey(workspaceId, reportId, f)).catch(() => undefined)));
}
