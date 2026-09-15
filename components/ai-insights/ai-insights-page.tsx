"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Layers,
  ChevronRight,
  Sliders,
  DollarSign,
  ArrowUpRight,
  Brain
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Insight } from "@/lib/types";

interface ExtendedInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  confidence: number;
  tone?: "purple" | "green" | "orange" | "blue";
  action?: string;
  status?: "NEW" | "REVIEWED" | "APPLIED" | "DISMISSED" | "New" | "Reviewed" | "Applied" | "Dismissed";
  createdAt?: string;
  expectedImpact?: string;
  actionPayload?: Record<string, unknown>;
  type?: string;
}

export function AiInsightsPage() {
  const [insights, setInsights] = useState<ExtendedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<ExtendedInsight | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [promptInput, setPromptInput] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/insights");
      const payload = (await res.json()) as ApiResponse<{ items: ExtendedInsight[] }>;
      if (!res.ok) throw new Error(payload.error?.message || "Failed to load AI Insights.");
      
      const items = payload.data.items || [];
      if (items.length === 0) {
        // Fallback default insights for demo / initial setup
        setInsights(DEFAULT_DEMO_INSIGHTS);
      } else {
        setInsights(items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load insights.");
      setInsights(DEFAULT_DEMO_INSIGHTS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsights();
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/ai/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInsights((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus as never } : item))
        );
        if (selectedInsight?.id === id) {
          setSelectedInsight((prev) => (prev ? { ...prev, status: newStatus as never } : null));
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleGenerateInsights() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: promptInput.trim() || "Analyze cross-platform advertising ROAS and suggest campaign budget reallocations."
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to generate AI insights.");

      setShowGenerateModal(false);
      setPromptInput("");
      await fetchInsights();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  const filtered = insights.filter((item) => {
    if (categoryFilter !== "ALL" && item.category?.toUpperCase() !== categoryFilter.toUpperCase()) return false;
    if (statusFilter !== "ALL") {
      const s = (item.status || "NEW").toUpperCase();
      if (statusFilter === "NEW" && s !== "NEW") return false;
      if (statusFilter === "APPLIED" && s !== "APPLIED") return false;
      if (statusFilter === "DISMISSED" && s !== "DISMISSED") return false;
    }
    return true;
  });

  const totalInsights = insights.length;
  const criticalCount = insights.filter((i) => (i.confidence || 0) >= 85).length;
  const appliedCount = insights.filter((i) => (i.status || "").toUpperCase() === "APPLIED").length;

  return (
    <AppShell
      title="AI Insights"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
            <Sparkles size={14} /> Generate Insights
          </button>
          <button onClick={fetchInsights} className="btn-secondary grid h-9 w-9 place-items-center p-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Autonomous AI Insights"
          description="Real-time algorithmic optimizations, budget reallocations, and keyword opportunities across channels."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* KPI Metric Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Insights</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Brain size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalInsights}</div>
            <div className="mt-1 text-xs text-zinc-400">Across 5 marketing channels</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">High Confidence</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Zap size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{criticalCount}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Confidence score ≥ 85%</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Applied Actions</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{appliedCount}</div>
            <div className="mt-1 text-xs text-zinc-400">Executed on live campaigns</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Est. Monthly Growth</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">+$14,280</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">+18.4% predicted ROAS increase</div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-clean py-1 text-xs"
            >
              <option value="ALL">All Categories</option>
              <option value="CAMPAIGN">Campaigns</option>
              <option value="KEYWORDS">Keywords</option>
              <option value="AUDIENCE">Audience</option>
              <option value="CONTENT">Content</option>
              <option value="BUDGET">Budget</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-clean py-1 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New / Open</option>
              <option value="APPLIED">Applied</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Insight Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isApplied = (item.status || "").toUpperCase() === "APPLIED";
            const isDismissed = (item.status || "").toUpperCase() === "DISMISSED";

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-xl border p-5 transition shadow-2xs hover:shadow-md ${
                  isApplied
                    ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/50 dark:bg-emerald-950/10"
                    : isDismissed
                    ? "border-zinc-200 bg-zinc-50/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
                    : "border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>{item.confidence}% Confidence</span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ArrowUpRight size={14} />
                      <span>Impact: {item.impact}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInsight(item)}
                        className="btn-secondary text-[11px] py-1"
                      >
                        Inspect
                      </button>

                      {!isApplied && !isDismissed && (
                        <>
                          <button
                            onClick={() => handleStatusChange(item.id, "APPLIED")}
                            className="btn-primary text-[11px] py-1 bg-emerald-600 hover:bg-emerald-700 border-none"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, "DISMISSED")}
                            className="btn-secondary text-[11px] py-1 text-zinc-400"
                          >
                            Dismiss
                          </button>
                        </>
                      )}

                      {isApplied && (
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Applied
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="col-span-2 rounded-xl border border-zinc-200/90 bg-white p-12 text-center text-xs text-zinc-400 dark:border-zinc-800">
              No insights match the selected filters.
            </div>
          )}
        </div>

        {/* Insight Detail Modal */}
        {selectedInsight && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AI Insight Deep Dive</h2>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {selectedInsight.category} Optimization
                  </span>
                  <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedInsight.title}</h3>
                </div>

                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50 space-y-2 text-zinc-700 dark:text-zinc-300">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">AI Recommendation</div>
                  <p className="leading-relaxed">{selectedInsight.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400">Confidence Score</div>
                    <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{selectedInsight.confidence}%</div>
                  </div>
                  <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400">Expected Outcome</div>
                    <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedInsight.impact}</div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">Recommended Action Payload</div>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] text-zinc-200">
{JSON.stringify(
  selectedInsight.actionPayload || {
    action: "REALLOCATE_BUDGET",
    sourcePlatform: "Meta Ads",
    targetPlatform: "Google Ads Search",
    budgetShiftUsd: 1500,
    expectedRoasDelta: "+0.65"
  },
  null,
  2
)}
                  </pre>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedInsight.id, "DISMISSED");
                      setSelectedInsight(null);
                    }}
                    className="btn-secondary text-rose-600 hover:text-rose-700"
                  >
                    Dismiss Insight
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedInsight(null)} className="btn-secondary">
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedInsight.id, "APPLIED");
                      setSelectedInsight(null);
                    }}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-none"
                  >
                    Apply Optimization
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate AI Insights Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Run AI Diagnostic Analysis</h2>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Diagnostic Context / Prompt</label>
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g. Audit Google Ads Search campaigns for low converting keywords and suggest negative keywords…"
                    className="input-clean mt-1.5 h-28 resize-none font-normal"
                  />
                </div>

                <div className="rounded-lg bg-indigo-50/60 p-3 text-[11px] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  AI will analyze spend, ROAS, CPA, and CTR data from connected platforms to extract actionable recommendations.
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button onClick={() => setShowGenerateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleGenerateInsights} disabled={generating} className="btn-primary">
                  {generating ? "Analyzing Workspace…" : "Run AI Analysis"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const DEFAULT_DEMO_INSIGHTS: ExtendedInsight[] = [
  {
    id: "insight-1",
    category: "Budget",
    title: "Shift 15% budget from Facebook to Google Search",
    description: "Google Ads Search campaigns are converting at $18.40 CPA compared to $42.10 CPA on Facebook Ads for the same target demographic.",
    impact: "+24% Conversions",
    confidence: 94,
    status: "NEW",
    actionPayload: { action: "REALLOCATE_BUDGET", amountUsd: 1500, source: "Facebook Ads", target: "Google Ads Search" }
  },
  {
    id: "insight-2",
    category: "Keywords",
    title: "Add 12 negative keywords to Performance Max",
    description: "Detected $420 wasted spend on non-converting broad search queries like 'free marketing tools' in Google Ads.",
    impact: "Save $680/mo",
    confidence: 88,
    status: "NEW",
    actionPayload: { action: "ADD_NEGATIVE_KEYWORDS", keywords: ["free", "cheap", "diy", "jobs", "course"] }
  },
  {
    id: "insight-3",
    category: "Audience",
    title: "Expand Retargeting Window from 14 to 30 Days",
    description: "Analysis of buyer journey indicates 35% of high-value subscribers convert between day 15 and 28 after initial site visit.",
    impact: "+14% ROAS",
    confidence: 82,
    status: "NEW",
    actionPayload: { action: "UPDATE_AUDIENCE_LOOKBACK", currentDays: 14, targetDays: 30 }
  },
  {
    id: "insight-4",
    category: "Content",
    title: "Publish Video Reels at 6:00 PM EST on Thursdays",
    description: "Instagram engagement rate peaks at 6.4% on Thursday evenings, outperforming morning post times by 2.1x.",
    impact: "+3.2x Reach",
    confidence: 90,
    status: "NEW",
    actionPayload: { action: "OPTIMIZE_SCHEDULE", optimalTime: "18:00 EST", optimalDay: "Thursday" }
  }
];
