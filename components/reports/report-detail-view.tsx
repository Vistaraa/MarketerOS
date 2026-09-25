"use client";

import { useEffect, useState } from "react";
import {
  FileBarChart,
  ArrowLeft,
  Download,
  Share2,
  Calendar,
  Building2,
  CheckCircle2,
  Printer,
  Sparkles,
  RefreshCw,
  Clock
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { TrendChart } from "@/components/ui/marketeros-charts";
import type { ApiResponse } from "@/lib/api-contracts";
import { money } from "@/lib/utils";

export function ReportDetailView({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/reports/${reportId}`);
        const payload = (await res.json()) as ApiResponse<any>;
        if (!res.ok) throw new Error(payload.error?.message || "Report not found.");
        setReport(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load report.");
        setReport(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reportId]);

  if (loading) {
    return (
      <AppShell title="Report Viewer">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">Rendering report document…</div>
      </AppShell>
    );
  }

  if (error || !report) {
    return (
      <AppShell title="Report Viewer">
        <div className="p-8 text-center text-xs text-rose-500">{error || "Report document not found."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Report Document - ${report?.name || "Report"}`}
      action={
        <div className="flex items-center gap-2">
          <a href="/reports" className="btn-secondary text-xs flex items-center gap-1">
            <ArrowLeft size={13} /> Back to Reports
          </a>
          <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-1">
            <Printer size={13} /> Print / Export PDF
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Generated Executive Report"
          description="Printable omnichannel executive report with blended metrics, campaign highlights, and AI observations."
        />

        {/* Printable Report Document Sheet */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-6 max-w-4xl mx-auto">
          {/* Report Cover Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm dark:text-indigo-400">
                <FileBarChart size={18} />
                <span>MarketerOS Performance Report</span>
              </div>
              <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">{report?.name}</h1>
              <p className="mt-1 text-zinc-500">Prepared for: {report?.client?.name || "Workspace Client"}</p>
            </div>

            <div className="text-right">
              <StatusBadge status={report?.status || "Ready"} />
              <div className="mt-2 text-[11px] text-zinc-400">Format: {report?.format || "PDF"}</div>
              <div className="text-[11px] text-zinc-400">Generated: {report?.createdAt || "Sep 8, 2026"}</div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-2 dark:border-zinc-800">
              Executive Key Performance Indicators
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="text-[11px] text-zinc-400">Total Spend</div>
                <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">$24,500</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="text-[11px] text-zinc-400">Conversions</div>
                <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">842</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="text-[11px] text-zinc-400">Gross Revenue</div>
                <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">$106,575</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="text-[11px] text-zinc-400">Blended ROAS</div>
                <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">4.35x</div>
              </div>
            </div>
          </div>

          {/* Trend Chart Preview */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-2 dark:border-zinc-800">
              Monthly Revenue vs Spend Growth
            </h2>
            <div className="mt-4">
              <TrendChart
                data={[
                  { date: "Week 1", spend: 4000, revenue: 16500 },
                  { date: "Week 2", spend: 5500, revenue: 24100 },
                  { date: "Week 3", spend: 7000, revenue: 31200 },
                  { date: "Week 4", spend: 8000, revenue: 34775 }
                ]}
              />
            </div>
          </div>

          {/* AI Executive Observations */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles size={14} />
              <span>AI Executive Summary &amp; Recommendations</span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Google Ads Search campaigns achieved the highest marginal ROAS (5.2x), outperforming Meta Ads by +36.8%. Reallocating $2,500 from low-performing Instagram prospecting ad sets to Google Search is projected to yield an additional 42 conversions next month.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
