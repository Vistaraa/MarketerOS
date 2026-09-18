"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Calendar,
  Check,
  FileBarChart,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import { TrendChart } from "@/components/ui/marketeros-charts";
import type { ApiResponse } from "@/lib/api-contracts";
import type { OverviewPayload } from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

type Row = {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  description?: string;
  trigger?: string;
  action?: string;
  role?: string;
  email?: string;
  invoiceNumber?: string;
  total?: unknown;
  invoiceDate?: string;
};

async function getItems(path: string) {
  const response = await fetch(`/api/v1/${path}`);
  const payload = (await response.json()) as ApiResponse<{ items: Row[] }>;
  if (!response.ok) throw new Error(payload.error?.message || `Unable to load ${path}.`);
  return payload.data.items || [];
}

/* =========================================================================
   1. LIVE REPORTS PAGE
   ========================================================================= */
export function LiveReportsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
  }>({ isOpen: false, message: "" });

  async function load() {
    try {
      setItems(await getItems("reports"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load reports.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Marketing Performance Report" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Unable to generate report.");
      setName("");
      setOpenModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Reports"
      action={
        <button
          onClick={() => setOpenModal(true)}
          className="btn-primary"
        >
          <Plus size={14} /> Generate Report
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Performance Reports"
          description="Generate, export, and monitor cross-platform marketing reports."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Quick Report Creation Box */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Quick Generate</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Omnichannel Executive Summary"
              className="input-clean flex-1 min-w-[240px]"
            />
            <button
              onClick={create}
              disabled={busy}
              className="btn-primary shrink-0"
            >
              {busy ? "Generating…" : "Generate Report"}
            </button>
          </div>
        </div>

        {/* Reports Ledger */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Generated Reports ({items.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Historical analytics reports and exports</p>
            </div>
            <button
              onClick={load}
              className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Report Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-xs text-zinc-400">
                      No reports generated yet. Click &quot;Generate Report&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <FileBarChart size={16} className="text-zinc-500" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status || "Completed"} />
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">Automated Summary</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() =>
                            setDialogConfig({
                              isOpen: true,
                              title: "View Report",
                              message: `Opening performance report: ${item.name || "Report"}`,
                              type: "info"
                            })
                          }
                          className="btn-secondary py-1 text-[11px]"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generate Report Modal */}
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileBarChart size={16} className="text-zinc-700 dark:text-zinc-300" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Generate Report</h2>
                </div>
                <button
                  onClick={() => setOpenModal(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Report Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Q2 Omnichannel Performance Summary"
                    className="input-clean mt-1"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Report Type</label>
                    <select className="input-clean mt-1">
                      <option>Executive Summary</option>
                      <option>Cross-Channel Attribution</option>
                      <option>Ad Spend & ROAS Audit</option>
                      <option>Lead Conversion Breakdown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Date Range</label>
                    <select className="input-clean mt-1">
                      <option>Last 30 Days</option>
                      <option>Month to Date</option>
                      <option>Last Quarter (Q1)</option>
                      <option>Custom Date Range</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Included Channels</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-zinc-900 dark:accent-zinc-100" />
                      <span>Google Ads</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-zinc-900 dark:accent-zinc-100" />
                      <span>Meta Ads</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-zinc-900 dark:accent-zinc-100" />
                      <span>Google Analytics 4</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-zinc-900 dark:accent-zinc-100" />
                      <span>Instagram</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={create}
                  disabled={busy}
                  className="btn-primary"
                >
                  {busy ? "Generating…" : "Generate & Export"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomDialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </AppShell>
  );
}

/* =========================================================================
   2. LIVE ANALYTICS PAGE
   ========================================================================= */
export function LiveAnalyticsPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/analytics/overview")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<OverviewPayload>;
        if (!response.ok) throw new Error(payload.error?.message || "Unable to load analytics.");
        return payload.data;
      })
      .then(setData)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load analytics."));
  }, []);

  return (
    <AppShell title="Analytics">
      <div className="space-y-6">
        <PageHeading
          title="Cross-Channel Analytics"
          description="Track blended ROI, ROAS, and conversion metrics across all connected ad channels."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Bento Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data?.kpis.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{metric.label}</div>
              <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metric.value}</div>
              <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{metric.change} vs last period</div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Performance Over Time
              </h2>
            </div>
            <div className="mt-4">
              {data?.series.length ? (
                <TrendChart data={data.series} showRoas />
              ) : (
                <div className="flex h-48 items-center justify-center text-xs text-zinc-400">
                  No time-series metrics synced yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Spend by Channel
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {data?.platformSpend.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span>{item.label}</span>
                    <strong className="text-zinc-900 dark:text-zinc-100">{money(item.value)} ({item.percent}%)</strong>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                      style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================================
   3. LIVE AUTOMATION PAGE
   ========================================================================= */
export function LiveAutomationPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [form, setForm] = useState({ name: "", trigger: "campaign.metric", action: "notify" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await getItems("automation"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load automation.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    try {
      const response = await fetch("/api/v1/automation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Unable to create automation.");
      setForm({ ...form, name: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create automation.");
    }
  }

  return (
    <AppShell
      title="Automation"
      action={
        <button onClick={create} className="btn-primary">
          <Plus size={14} /> Create Automation
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Marketing Automations"
          description="Evaluate real-time rules against ad spend, CPA anomalies, and lead attribution."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">Add Automation Rule</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rule Name (e.g. Pause ad if CPA > $50)"
              className="input-clean"
            />
            <input
              value={form.trigger}
              onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              placeholder="Trigger (e.g. campaign.metric)"
              className="input-clean"
            />
            <input
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              placeholder="Action (e.g. notify or pause)"
              className="input-clean"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={create} className="btn-primary">
              Save Rule
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Configured Rules ({items.length})
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 font-medium">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No automation rules configured.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-zinc-500" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-[11px]">
                    {item.trigger} → {item.action}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================================
   4. LIVE CLIENTS PAGE
   ========================================================================= */
export function LiveClientsPage() {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    getItems("clients")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <AppShell title="Clients">
      <div className="space-y-6">
        <PageHeading
          title="Client Workspaces"
          description="Manage client brands, billing limits, and multi-tenant performance."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.name}</h3>
                <p className="mt-1 text-xs text-zinc-400">{item.description || "Client workspace"}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <a href={`/clients/${item.id}`} className="btn-secondary text-xs w-full text-center">
                  Open Client Workspace
                </a>
              </div>
            </div>
          ))}

          {!items.length && (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 md:col-span-3">
              No clients configured in this workspace.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================================
   5. LIVE TEAM PAGE
   ========================================================================= */
export function LiveTeamPage() {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    getItems("team")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <AppShell title="Team">
      <div className="space-y-6">
        <PageHeading
          title="Team Members & Access"
          description="Manage workspace team roles and security permissions."
        />

        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 font-medium">
            {items.map((item) => (
              <div className="flex items-center justify-between p-4" key={item.id}>
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.name ? item.name[0] : "U"}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                    <div className="text-[10px] text-zinc-400">{item.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.role}</div>
                  <div className="text-[10px] text-zinc-400">{item.status}</div>
                </div>
              </div>
            ))}

            {!items.length && (
              <div className="p-8 text-center text-xs text-zinc-400">No team members found.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================================
   6. LIVE CONTENT STUDIO PAGE
   ========================================================================= */
export function LiveContentPage({ ai = false }: { ai?: boolean }) {
  const [items, setItems] = useState<Row[]>([]);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItems("content")
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load content."));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, kind: "content" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "AI is not configured.");
      setOutput(payload.data.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={ai ? "AI Content Creator" : "Content Studio"}>
      {ai ? (
        <div className="space-y-6">
          <PageHeading
            title="AI Ad Copy & Content Generator"
            description="Draft high-converting ad copy, headlines, and social content."
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Generate Copy with AI</h2>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="input-clean h-28 resize-none font-normal"
                placeholder="Describe your product offer, target audience, and campaign tone of voice…"
              />
              <button
                onClick={generate}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? "Generating…" : "Generate Copy"}
              </button>

              {output && (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                  {output}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ContentStudioDashboard />
      )}
    </AppShell>
  );
}

/* =========================================================================
   7. LIVE AD MANAGER PAGE
   ========================================================================= */
export function LiveAdManagerPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItems("campaigns")
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load campaigns."));
  }, []);

  return (
    <AppShell title="Ad Manager">
      <div className="space-y-6">
        <PageHeading
          title="Ad Manager"
          description="Create, manage, and optimize multi-platform advertising campaigns."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Campaign</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Spend</th>
                  <th className="px-4 py-3">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-zinc-400">No campaigns available.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                      <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        <a href={`/campaigns/${item.id}`} className="hover:underline">{item.name}</a>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">{item.description || "—"}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status || "Draft"} />
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">Live API Sync</td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">Connected</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
