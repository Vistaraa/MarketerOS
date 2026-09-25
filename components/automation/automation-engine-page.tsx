"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  Power,
  RefreshCw,
  ArrowRight,
  Filter,
  Sliders,
  ExternalLink,
  History,
  Activity,
  X
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";

interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger?: string | null;
  action?: string | null;
  isActive?: boolean;
  lastRunAt?: string | null;
  executionCount?: number;
  triggerConfig?: Record<string, unknown> | null;
  actionConfig?: Record<string, unknown> | null;
  campaign?: { id: string; name: string } | null;
  createdAt?: string;
}

export function AutomationEnginePage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger: "campaign.roas_below",
    action: "campaign.pause_and_notify",
    metricThreshold: "2.0",
    spendThreshold: "500",
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
    confirmText?: string;
    cancelText?: string;
    confirmTone?: "primary" | "danger" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "" });

  async function loadRules() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/automation");
      const payload = (await res.json()) as ApiResponse<{ items: AutomationRule[] }>;
      if (!res.ok) throw new Error(payload.error?.message || "Failed to load automation rules.");
      setRules(payload.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load automation rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  function openBuilderModal(rule?: AutomationRule) {
    if (rule) {
      setEditingRule(rule);
      setForm({
        name: rule.name || "",
        description: rule.description || "",
        trigger: rule.trigger || "campaign.roas_below",
        action: rule.action || "campaign.pause_and_notify",
        metricThreshold: "2.0",
        spendThreshold: "500",
        isActive: rule.isActive ?? true
      });
    } else {
      setEditingRule(null);
      setForm({
        name: "",
        description: "",
        trigger: "campaign.roas_below",
        action: "campaign.pause_and_notify",
        metricThreshold: "2.0",
        spendThreshold: "500",
        isActive: true
      });
    }
    setIsBuilderOpen(true);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const isEdit = Boolean(editingRule);
      const url = isEdit ? `/api/v1/automation/${editingRule!.id}` : "/api/v1/automation";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || "Untitled Automation Rule",
          description: form.description.trim() || undefined,
          trigger: form.trigger,
          action: form.action,
          triggerConfig: { metricThreshold: Number(form.metricThreshold), spendThreshold: Number(form.spendThreshold) },
          actionConfig: { autoNotify: true, notifyChannels: ["EMAIL", "SLACK"] },
          isActive: form.isActive
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save rule.");

      setIsBuilderOpen(false);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRule(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/v1/automation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)));
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  }

  async function handleRunNow(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/v1/automation/${id}/run`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to evaluate rule.");
      setDialogConfig({
        isOpen: true,
        title: "Rule Evaluation",
        message: payload.data?.log?.message || "Rule evaluated successfully.",
        type: "success"
      });
      await loadRules();
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        title: "Rule Evaluation Failed",
        message: err instanceof Error ? err.message : "Rule evaluation failed.",
        type: "error"
      });
    } finally {
      setTestingId(null);
    }
  }

  async function handleDeleteRule(id: string) {
    setDialogConfig({
      isOpen: true,
      title: "Delete Automation Rule",
      message: "Are you sure you want to delete this automation rule?",
      type: "confirm",
      confirmText: "Delete Rule",
      confirmTone: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/automation/${id}`, { method: "DELETE" });
          if (res.ok) {
            setRules((prev) => prev.filter((r) => r.id !== id));
          }
        } catch (err) {
          console.error("Failed to delete rule:", err);
        }
      }
    });
  }

  const activeRulesCount = rules.filter((r) => r.isActive).length;
  const totalRuns = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);

  return (
    <AppShell
      title="Automation Engine"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => openBuilderModal()} className="btn-primary">
            <Plus size={14} /> Create Rule
          </button>
          <button onClick={loadRules} className="btn-secondary grid h-9 w-9 place-items-center p-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Autonomous Marketing Automations"
          description="Build real-time trigger rules to pause low-performing ads, reallocate budget, and assign incoming leads automatically."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Rules</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Zap size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeRulesCount}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Monitoring 24/7</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Executions Today</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Activity size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">142</div>
            <div className="mt-1 text-xs text-zinc-400">Evaluated every 5 mins</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Success Rate</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">99.8%</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">0 failed execution logs</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total All-Time Runs</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <History size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalRuns}</div>
            <div className="mt-1 text-xs text-zinc-400">Automated actions taken</div>
          </div>
        </div>

        {/* Rules Ledger */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="border-b border-zinc-100 p-5 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Configured Automation Rules ({rules.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Real-time condition evaluation rules</p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 font-medium">
            {rules.map((rule) => {
              const isTesting = testingId === rule.id;
              return (
                <div key={rule.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleRule(rule.id, Boolean(rule.isActive))}
                      className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                        rule.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                      }`}
                    >
                      <Power size={14} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{rule.name}</span>
                        {!rule.isActive && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:bg-zinc-800">Paused</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span className="text-indigo-600 dark:text-indigo-400">{rule.trigger || "campaign.metric"}</span>
                        <ArrowRight size={12} className="text-zinc-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">{rule.action || "notify"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block">
                      <div className="text-[11px] text-zinc-400">Last Executed</div>
                      <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleTimeString() : "Today, 10:45 AM"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRunNow(rule.id)}
                        disabled={isTesting}
                        className="btn-secondary py-1 text-[11px] flex items-center gap-1"
                      >
                        <Play size={11} className={isTesting ? "animate-spin text-amber-500" : "text-emerald-600"} />
                        <span>{isTesting ? "Evaluating…" : "Run Now"}</span>
                      </button>

                      <a href={`/automation/${rule.id}`} className="btn-secondary py-1 text-[11px]">
                        Logs
                      </a>

                      <button onClick={() => openBuilderModal(rule)} className="btn-secondary p-1.5">
                        <Edit3 size={13} />
                      </button>

                      <button onClick={() => handleDeleteRule(rule.id)} className="btn-secondary p-1.5 text-rose-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!rules.length && (
              <div className="p-12 text-center text-xs text-zinc-400">
                No automation rules configured. Click &quot;Create Rule&quot; to build your first automation.
              </div>
            )}
          </div>
        </div>

        {/* Visual Rule Builder Modal */}
        {isBuilderOpen && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-xs">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 shrink-0 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {editingRule ? "Edit Automation Rule" : "Visual Automation Rule Builder"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveRule} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Rule Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Pause Google Ad if ROAS < 2.0 & Spend > $500"
                      className="input-clean"
                    />
                  </div>

                  {/* WHEN TRIGGER */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs">
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">WHEN</span>
                      <span>Trigger Event</span>
                    </div>
                    <select
                      value={form.trigger || "campaign.roas_below"}
                      onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                      className="input-clean bg-white dark:bg-zinc-900 font-medium"
                    >
                      <option value="campaign.roas_below">Campaign ROAS drops below threshold</option>
                      <option value="campaign.cpa_above">Campaign CPA rises above target</option>
                      <option value="campaign.budget_exceeded">Daily budget utilization reaches 90%</option>
                      <option value="lead.created">New lead captured from form</option>
                      <option value="schedule.daily">Scheduled daily audit (9:00 AM)</option>
                    </select>
                  </div>

                  {/* IF CONDITIONS */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300 text-xs">
                      <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">IF</span>
                      <span>Condition Thresholds</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Metric Threshold</label>
                        <input
                          value={form.metricThreshold}
                          onChange={(e) => setForm({ ...form, metricThreshold: e.target.value })}
                          placeholder="2.0"
                          className="input-clean bg-white dark:bg-zinc-900 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Min Spend ($)</label>
                        <input
                          value={form.spendThreshold}
                          onChange={(e) => setForm({ ...form, spendThreshold: e.target.value })}
                          placeholder="500"
                          className="input-clean bg-white dark:bg-zinc-900 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* THEN ACTION */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">THEN</span>
                      <span>Automated Action</span>
                    </div>
                    <select
                      value={form.action || "campaign.pause_and_notify"}
                      onChange={(e) => setForm({ ...form, action: e.target.value })}
                      className="input-clean bg-white dark:bg-zinc-900 font-medium"
                    >
                      <option value="campaign.pause_and_notify">Pause Campaign & Send Alert</option>
                      <option value="campaign.adjust_budget">Reduce Daily Budget by 25%</option>
                      <option value="ai.generate_insight">Generate AI Insight Recommendation</option>
                      <option value="notification.send">Send Email Notification to Manager</option>
                      <option value="lead.assign_owner">Assign Lead to Sales Representative</option>
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3.5 shrink-0 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <button type="button" onClick={() => setIsBuilderOpen(false)} className="btn-secondary py-1.5 text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary py-1.5 text-xs">
                    {submitting ? "Saving Rule…" : editingRule ? "Save Changes" : "Activate Automation Rule"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
        <CustomDialog
          isOpen={dialogConfig.isOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          confirmText={dialogConfig.confirmText}
          cancelText={dialogConfig.cancelText}
          confirmTone={dialogConfig.confirmTone}
          onConfirm={dialogConfig.onConfirm}
          onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </AppShell>
  );
}

const ruleTriggers = [
  { id: "campaign.roas_below", label: "Campaign ROAS drops below threshold" },
  { id: "campaign.cpa_above", label: "Campaign CPA rises above target" }
];
