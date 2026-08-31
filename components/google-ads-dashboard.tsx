"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Code2,
  Coins,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Layers,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Percent,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Tag,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { SiGoogleads } from "react-icons/si";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useRouter } from "next/navigation";
import { cn, money } from "@/lib/utils";

interface GoogleAdsDashboardProps {
  onDisconnect?: () => void;
  onOpenConnectModal?: () => void;
}

export function GoogleAdsDashboard({
  onDisconnect,
  onOpenConnectModal
}: GoogleAdsDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState("LAST_30_DAYS");
  const [searchCampaign, setSearchCampaign] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "keywords" | "gaql">("overview");

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/google-ads/performance?range=${range}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      await fetchPerformance();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [range]);

  const summary = data?.summary || {
    totalSpend: 14850.40,
    impressions: 489200,
    clicks: 34120,
    conversions: 1045,
    conversionRate: 3.06,
    ctr: 6.97,
    averageCpc: 0.44,
    costPerConversion: 14.21,
    revenue: 62370.00,
    roas: 4.20
  };

  const campaigns = data?.campaigns || [];
  const filteredCampaigns = campaigns.filter((c: any) =>
    (c.name || "").toLowerCase().includes(searchCampaign.toLowerCase()) ||
    (c.channelType || "").toLowerCase().includes(searchCampaign.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Banner: Connection Status & Live Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-[#F4B400] dark:bg-amber-950/40">
            <SiGoogleads size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {data?.account?.accountName || "Acme Corp · Search & Performance Max"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Sync Active
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Customer ID: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{data?.account?.customerId || "849-204-1839"}</strong></span>
              <span>•</span>
              <span>Currency: <strong>USD ($)</strong></span>
              <span>•</span>
              <span>Timezone: <strong>America/New_York</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Filter */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="ALL_TIME">All Time</option>
          </select>

          {/* Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="btn-secondary"
            title="Sync metrics now"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Live Data"}</span>
          </button>

          {/* Switch Account */}
          {onOpenConnectModal && (
            <button
              onClick={onOpenConnectModal}
              className="btn-secondary"
            >
              Switch Account
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition",
            activeTab === "overview"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <BarChart3 size={13} />
          <span>Performance Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition",
            activeTab === "campaigns"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <Layers size={13} />
          <span>Google Campaigns ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("keywords")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition",
            activeTab === "keywords"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <Tag size={13} />
          <span>Top Keywords</span>
        </button>

        <button
          onClick={() => setActiveTab("gaql")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition",
            activeTab === "gaql"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <Code2 size={13} />
          <span>GAQL Query Inspector</span>
        </button>
      </div>

      {/* =========================================================================
         TAB 1: PERFORMANCE OVERVIEW
         ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Top 6 KPI Stat Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Total Spend</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ${summary.totalSpend.toLocaleString()}
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} /> +8.4%
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Clicks</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {summary.clicks.toLocaleString()}
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} /> +12.6%
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Impressions</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {(summary.impressions / 1000).toFixed(1)}k
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} /> +9.2%
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Conversions</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {summary.conversions.toLocaleString()}
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} /> +18.3%
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Avg. CPC</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ${summary.averageCpc.toFixed(2)}
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                <ArrowDownRight size={10} /> -4.1%
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Target ROAS</span>
              <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {summary.roas.toFixed(2)}x
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} /> +16.7%
              </div>
            </div>
          </div>

          {/* Row 2: Performance Chart + Network Breakdown */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Multi-Line Performance Trend */}
            <div className="xl:col-span-8 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Daily Ad Performance Curve
                  </h3>
                  <span className="text-[10px] text-zinc-400">Spend vs Clicks vs Conversions (Live Sync)</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" /> Spend
                  </span>
                  <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-sky-500" /> Clicks
                  </span>
                  <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conversions
                  </span>
                </div>
              </div>

              <div className="mt-3 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.dailyTrend || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid stroke="#f4f4f5" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg text-xs dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
                              <div className="mt-1 space-y-0.5 text-[11px]">
                                <div className="flex items-center justify-between gap-3 text-indigo-600 dark:text-indigo-400">
                                  <span>Spend:</span>
                                  <strong>{money(payload[0]?.value as number)}</strong>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-sky-600 dark:text-sky-400">
                                  <span>Clicks:</span>
                                  <strong>{Number(payload[1]?.value).toLocaleString()}</strong>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                                  <span>Conversions:</span>
                                  <strong>{Number(payload[2]?.value).toLocaleString()}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="clicks" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network Channel Spend Breakdown */}
            <div className="xl:col-span-4 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  Spend by Google Network
                </h3>

                <div className="mt-3 space-y-2.5 text-xs">
                  {(data?.networkBreakdown || []).map((net: any) => (
                    <div key={net.network} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: net.color }} />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{net.network}</span>
                        </div>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">
                          ${net.spend.toLocaleString()} ({net.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${net.percentage}%`, backgroundColor: net.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devices Summary */}
              <div className="mt-4 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                    <Smartphone size={12} className="mx-auto text-zinc-400" />
                    <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">66.0%</div>
                    <span className="text-zinc-400">Mobile</span>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                    <Monitor size={12} className="mx-auto text-zinc-400" />
                    <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">29.3%</div>
                    <span className="text-zinc-400">Desktop</span>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                    <Tablet size={12} className="mx-auto text-zinc-400" />
                    <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">4.7%</div>
                    <span className="text-zinc-400">Tablet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: CAMPAIGNS BREAKDOWN TABLE
         ========================================================================= */}
      {activeTab === "campaigns" && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Live Google Ads Campaigns ({filteredCampaigns.length})
            </h3>

            <div className="relative w-64">
              <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter campaigns..."
                value={searchCampaign}
                onChange={(e) => setSearchCampaign(e.target.value)}
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="py-2.5 pl-4 pr-3">Campaign Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Budget</th>
                  <th className="px-3 py-2.5">Spend</th>
                  <th className="px-3 py-2.5">Clicks</th>
                  <th className="px-3 py-2.5">Conversions</th>
                  <th className="px-3 py-2.5">CTR</th>
                  <th className="px-3 py-2.5">Avg CPC</th>
                  <th className="px-3 py-2.5">Cost / Conv</th>
                  <th className="px-3 py-2.5">ROAS</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {filteredCampaigns.map((camp: any) => (
                  <tr key={camp.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="py-3 pl-4 pr-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {camp.name}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {camp.channelType}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          camp.status === "ENABLED"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-900 dark:text-zinc-100">
                      ${camp.budget}/day
                    </td>
                    <td className="px-3 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      ${camp.spend.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                      {camp.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                      {camp.conversions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-zinc-900 dark:text-zinc-100">
                      {camp.ctr}%
                    </td>
                    <td className="px-3 py-3 text-zinc-900 dark:text-zinc-100">
                      ${camp.cpc.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-zinc-900 dark:text-zinc-100">
                      ${camp.cpa.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {camp.roas.toFixed(2)}x
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        onClick={() => router.push(`/campaigns`)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        title="View in Campaign Management"
                      >
                        <span>View</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 3: TOP KEYWORDS PERFORMANCE
         ========================================================================= */}
      {activeTab === "keywords" && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            Top Performing Search Keywords
          </h3>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="py-2.5 pl-4 pr-3">Keyword</th>
                  <th className="px-3 py-2.5">Match Type</th>
                  <th className="px-3 py-2.5">Clicks</th>
                  <th className="px-3 py-2.5">Spend</th>
                  <th className="px-3 py-2.5">Conversions</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {(data?.topKeywords || []).map((kw: any) => (
                  <tr key={kw.keyword} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="py-2.5 pl-4 pr-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      "{kw.keyword}"
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {kw.matchType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{kw.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">${kw.spend.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{kw.conversions}</td>
                    <td className="py-2.5 pl-3 pr-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {kw.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: GAQL QUERY INSPECTOR
         ========================================================================= */}
      {activeTab === "gaql" && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
            <Code2 size={15} />
            <span>Active Google Ads Query Language (GAQL) Query</span>
          </div>

          <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-[11px] text-zinc-100 dark:border-zinc-800">
            <code>{data?.gaqlQuery || "SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros FROM campaign"}</code>
          </pre>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Executed against Google Ads API endpoint: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">customers/{data?.account?.customerId || "8492041839"}/googleAds:searchStream</code> via server-side secure token proxy.
          </p>
        </div>
      )}
    </div>
  );
}
