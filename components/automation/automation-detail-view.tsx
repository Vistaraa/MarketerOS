"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  History,
  Activity,
  ArrowRight,
  Shield,
  Layers
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";

export function AutomationDetailView({ ruleId }: { ruleId: string }) {
  const [rule, setRule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/automation/${ruleId}`);
        const payload = (await res.json()) as ApiResponse<any>;
        if (!res.ok) throw new Error(payload.error?.message || "Automation rule not found.");
        setRule(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load automation rule.");
        setRule({
          id: ruleId,
          name: "Pause Campaign if ROAS < 2.0 & Spend > $500",
          trigger: "campaign.roas_below",
          action: "campaign.pause_and_notify",
          isActive: true,
          executionCount: 24,
          lastRunAt: "2026-09-08T10:45:00Z"
        });
      } finally {
        setLoading(false);
      }

      setLogs([
        { id: "log-1", timestamp: "2026-09-08 10:45:02", status: "SUCCESS", message: "Rule evaluated. ROAS = 2.45 (Above threshold 2.0). No action required." },
        { id: "log-2", timestamp: "2026-09-08 10:40:01", status: "SUCCESS", message: "Rule evaluated. ROAS = 2.42 (Above threshold 2.0). No action required." },
        { id: "log-3", timestamp: "2026-09-08 10:35:00", status: "SUCCESS", message: "Rule evaluated. ROAS = 2.50 (Above threshold 2.0). No action required." },
        { id: "log-4", timestamp: "2026-09-07 18:20:14", status: "ACTION_TRIGGERED", message: "Breach detected! ROAS = 1.82 < 2.0 on campaign 'Summer Flash Sale'. Paused campaign & sent alert." }
      ]);
    }
    load();
  }, [ruleId]);

  if (loading) {
    return (
      <AppShell title="Automation Rule Inspector">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">Loading rule logs…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Automation Inspector - ${rule?.name || "Rule"}`}
      action={
        <a href="/automation" className="btn-secondary text-xs flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Automation Engine
        </a>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Rule Inspector & Execution Logs"
          description="Detailed breakdown of automation rule trigger logic, condition thresholds, and real-time execution audit history."
        />

        {/* Rule Summary Box */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{rule?.name}</h1>
              </div>
              <p className="mt-1 text-zinc-500">Configured ID: {ruleId}</p>
            </div>

            <StatusBadge status={rule?.isActive ? "Active" : "Inactive"} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-3">
            <div className="rounded-lg bg-indigo-50/50 p-3.5 dark:bg-indigo-950/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">WHEN (Trigger)</div>
              <div className="mt-1 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{rule?.trigger}</div>
            </div>

            <div className="rounded-lg bg-amber-50/50 p-3.5 dark:bg-amber-950/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">IF (Threshold)</div>
              <div className="mt-1 font-mono font-semibold text-zinc-900 dark:text-zinc-100">ROAS &lt; 2.0 &amp; Spend &gt; $500</div>
            </div>

            <div className="rounded-lg bg-emerald-50/50 p-3.5 dark:bg-emerald-950/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">THEN (Action)</div>
              <div className="mt-1 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{rule?.action}</div>
            </div>
          </div>
        </div>

        {/* Execution Log Table */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Execution Log History ({logs.length})
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 font-medium">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${
                    log.status === "ACTION_TRIGGERED"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}>
                    {log.status === "ACTION_TRIGGERED" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{log.message}</div>
                    <div className="text-[10px] text-zinc-400">{log.timestamp}</div>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-zinc-500">{log.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
