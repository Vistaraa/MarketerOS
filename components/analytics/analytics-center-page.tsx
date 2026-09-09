"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Filter,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Download,
  Share2
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { TrendChart } from "@/components/ui/marketeros-charts";
import type { ApiResponse } from "@/lib/api-contracts";
import type { OverviewPayload } from "@/lib/types";
import { money } from "@/lib/utils";

export function AnalyticsCenterPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "drilldown" | "content" | "leads">("overview");
  const [dateRange, setDateRange] = useState("30d");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");

  // Expanded row state for drill-down
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({ "c-1": true });

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/analytics/overview");
      const payload = (await res.json()) as ApiResponse<OverviewPayload>;
      if (!res.ok) throw new Error(payload.error?.message || "Unable to load analytics.");
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedPlatform]);

  function toggleCampaign(id: string) {
    setExpandedCampaigns((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppShell
      title="Analytics Center"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => alert("Exporting CSV report…")} className="btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={loadAnalytics} className="btn-secondary grid h-9 w-9 place-items-center p-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Cross-Channel Performance & Analytics"
          description="Blended ROAS, multi-touch attribution, platform spend distribution, and keyword drill-down."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Time Window:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-clean py-1 text-xs"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter (90d)</option>
              <option value="mtd">Month to Date</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="input-clean py-1 text-xs"
            >
              <option value="ALL">All Platforms (Blended)</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="TIKTOK">TikTok</option>
              <option value="LINKEDIN">LinkedIn</option>
            </select>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data?.kpis.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{metric.label}</div>
              <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metric.value}</div>
              <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{metric.change} vs prior period</div>
            </div>
          ))}
        </div>

        {/* Tabs Navigation */}
        <div className="flex rounded-xl border border-zinc-200/90 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === "overview" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100"}`}
          >
            Overview & Trends
          </button>
          <button
            onClick={() => setActiveTab("drilldown")}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === "drilldown" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100"}`}
          >
            Campaign Drill-Down
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === "content" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100"}`}
          >
            Content Performance
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === "leads" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100"}`}
          >
            Lead Attribution
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
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
                  Spend by Marketing Channel
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {data?.platformSpend.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300">
                      <span>{item.label}</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{money(item.value)} ({item.percent}%)</strong>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
        )}

        {/* Drill-Down Tab */}
        {activeTab === "drilldown" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                Hierarchical Drill-Down (Platform → Campaign → Ad Group → Keywords)
              </h2>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {DRILLDOWN_DATA.map((campaign) => {
                const isExpanded = expandedCampaigns[campaign.id];
                return (
                  <div key={campaign.id} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <div
                      onClick={() => toggleCampaign(campaign.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{campaign.name}</span>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                          {campaign.platform}
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div><span className="text-zinc-400">Spend:</span> {money(campaign.spend)}</div>
                        <div><span className="text-zinc-400">Conversions:</span> {campaign.conversions}</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{campaign.roas}x ROAS</div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-zinc-50/50 p-4 dark:bg-zinc-900/30 space-y-3 pl-8">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ad Groups &amp; Keywords</div>
                        {campaign.adGroups.map((ag) => (
                          <div key={ag.name} className="rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
                            <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                              <span>Ad Group: {ag.name}</span>
                              <span className="text-zinc-500">CPA: ${ag.cpa}</span>
                            </div>

                            <div className="space-y-1 pt-1">
                              {ag.keywords.map((kw) => (
                                <div key={kw.term} className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                                  <span>Keyword: &quot;{kw.term}&quot;</span>
                                  <span>Clicks: {kw.clicks} · CTR: {kw.ctr}% · ROAS: {kw.roas}x</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {["content", "leads"].includes(activeTab) && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800">
            Filtered performance view for <strong className="text-zinc-700 dark:text-zinc-300">{activeTab}</strong>.
          </div>
        )}
      </div>
    </AppShell>
  );
}

const DRILLDOWN_DATA = [
  {
    id: "c-1",
    name: "Google Search - High Intent Core",
    platform: "Google Ads",
    spend: 4200,
    conversions: 184,
    roas: 5.2,
    adGroups: [
      {
        name: "Brand & Core Terms",
        cpa: 22.8,
        keywords: [
          { term: "marketing os software", clicks: 420, ctr: 8.4, roas: 6.1 },
          { term: "all in one ad manager", clicks: 310, ctr: 6.2, roas: 4.5 }
        ]
      }
    ]
  },
  {
    id: "c-2",
    name: "Meta Ads - Retargeting Audience",
    platform: "Meta Ads",
    spend: 2800,
    conversions: 94,
    roas: 3.8,
    adGroups: [
      {
        name: "Website Visitors 30 Days",
        cpa: 29.7,
        keywords: [
          { term: "Carousel Ad Variant A", clicks: 210, ctr: 3.8, roas: 3.9 }
        ]
      }
    ]
  }
];
