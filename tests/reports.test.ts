import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { reportCsv, reportPdf, reportPeriod } from "@/lib/reports";

const campaign = (name: string, i: number) => ({ id: `c${i}`, name, platform: "Google Ads" as const, status: "Active" as const, objective: "SALES", budget: 100, spend: 50 + i, clicks: 10 * i, conversions: i, roas: 2.5, ctr: 1.2, cpa: 5, startDate: "2026-09-01" });
const data = (campaigns = [campaign("Brand search", 1)]) => ({
  period: { from: "2026-09-01", to: "2026-09-30" },
  workspaceName: "Acme",
  clientName: null,
  overview: {
    kpis: [{ label: "Spend", value: "$1,234", change: "+5%", trend: "up" as const, icon: "spend" }],
    series: [],
    platformSpend: [{ label: "Google Ads", value: 1234, percent: 100, color: "#4285f4" }],
    campaigns,
    insights: [],
    integrations: []
  }
});

describe("reports", () => {
  it("defaults to the last 30 complete days", () => {
    expect(reportPeriod({ dateRange: null, configuration: null }, new Date("2026-10-06T12:00:00Z"))).toEqual({ from: "2026-09-06", to: "2026-10-05" });
    expect(reportPeriod({ dateRange: "last_7_days", configuration: null }, new Date("2026-10-06T12:00:00Z"))).toEqual({ from: "2026-09-29", to: "2026-10-05" });
  });

  it("writes CSV cells that can't run as spreadsheet formulas", () => {
    const csv = reportCsv(data([campaign("=HYPERLINK(\"http://evil\")", 1), campaign("Plain \"quoted\" name", 2)]), "Monthly report");
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"Plain ""quoted"" name"`);
    expect(csv.split("\r\n")[0]).toBe(`"Monthly report"`);
  });

  it("renders a valid multi-page PDF, even with characters the standard fonts lack", async () => {
    const many = Array.from({ length: 80 }, (_, i) => campaign(i === 0 ? "दिवाली सेल 🎉 campaign" : `Campaign ${i}`, i));
    const bytes = await reportPdf(data(many), "Quarterly — résumé");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe("Quarterly ? résumé");
  });
});
