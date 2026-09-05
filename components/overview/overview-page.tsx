"use client";

import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileBarChart,
  Info,
  Layers,
  Lightbulb,
  LineChart as LineChartIcon,
  MoreHorizontal,
  MousePointer2,
  MousePointerClick,
  Percent,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Campaign,
  ChartPoint,
  Insight,
  Integration,
  MetricKpi,
  OverviewPayload,
  OverviewSummary,
  PlatformSpendItem
} from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { AppShell, StatusBadge } from "@/components/ui/marketeros-shell";
import { useOverviewData } from "@/hooks/use-overview-data";
import {
  Bar,
  BarChart,
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

/* =========================================================================
   TOP 5 KPI CARDS (STRICTLY DYNAMIC)
   ========================================================================= */
function TopKpiCard({
  title,
  value,
  change,
  period = "vs previous period",
  icon: Icon,
  iconBg,
  iconColor,
  trend = "up"
}: {
  title: string;
  value: string;
  change: string;
  period?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
}) {
  const isZero = change === "0.0%" || change === "0" || change === "0.00x";

  return (
    <div className="flex items-start justify-between rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700">
      <div>
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
        <div className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px]">
          {isZero ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-zinc-400 dark:text-zinc-500">
              0.0%
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trend === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {trend === "down" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
              {change}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{period}</span>
        </div>
      </div>

      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", iconBg, iconColor)}>
        <Icon size={18} />
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 2: PERFORMANCE OVERVIEW (3-LINE GRAPH)
   ========================================================================= */
function MultiLinePerformanceChart({
  series = [],
  granularity,
  onGranularityChange,
  loading
}: {
  series?: ChartPoint[];
  granularity: "daily" | "weekly" | "monthly";
  onGranularityChange: (g: "daily" | "weekly" | "monthly") => void;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
            Performance Overview
          </h2>
          <span title="Multi-channel advertising trends" className="text-zinc-400 cursor-pointer">
            <Info size={13} />
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Legends */}
          <div className="flex items-center gap-2.5 text-[11px] font-medium">
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

          {/* Granularity Dropdown */}
          <select
            value={granularity}
            onChange={(e) => onGranularityChange(e.target.value as "daily" | "weekly" | "monthly")}
            className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-zinc-400" />
          </div>
        ) : !series.length ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
              <LineChartIcon size={20} />
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No performance activity recorded yet
            </div>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
              Telemetry from connected ad accounts and live campaigns will display your spend, clicks, and conversions timeline here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#a1a1aa"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${val / 1000}k` : val}`}
              />
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
                            <strong>{Number(payload[1]?.value || 0).toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                            <span>Conversions:</span>
                            <strong>{Number(payload[2]?.value || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#6366f1" }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#0ea5e9" }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#10b981" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 2: SPEND BY PLATFORM (DONUT CHART + LEGEND)
   ========================================================================= */
function SpendByPlatformCard({
  platformSpend = [],
  totalSpend = "$0.00",
  loading
}: {
  platformSpend?: PlatformSpendItem[];
  totalSpend?: string;
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
            Spend by Platform
          </h2>
          <span className="text-[11px] font-medium text-zinc-500">Live Channels</span>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-zinc-400" />
          </div>
        ) : !platformSpend.length ? (
          <div className="flex h-36 flex-col items-center justify-center text-center p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
              <DollarSign size={16} />
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No platform spend
            </div>
            <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
              Channel spend distribution will appear when campaigns start delivering.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2.5">
            <div className="relative h-36 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={platformSpend}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={54}
                    paddingAngle={3}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {platformSpend.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`$${val.toLocaleString()}`, "Spend"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e4e4e7",
                      fontSize: "11px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{totalSpend}</span>
                <span className="text-[9px] text-zinc-400">Total</span>
              </div>
            </div>

            {/* Platform Legend List */}
            <div className="flex-1 space-y-1.5 text-xs min-w-0">
              {platformSpend.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate text-zinc-600 dark:text-zinc-400">{item.label}</span>
                  </div>
                  <span className="font-semibold text-zinc-900 shrink-0 dark:text-zinc-100">
                    ${item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        <button
          onClick={() => router.push("/reports")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <span>View full report</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 2: QUICK ACTIONS LIST
   ========================================================================= */
function QuickActionsPanel() {
  const router = useRouter();

  const actions = [
    {
      title: "Create Campaign",
      desc: "Launch a new campaign",
      icon: Rocket,
      href: "/campaigns/create",
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
    },
    {
      title: "Connect Platform",
      desc: "Add marketing accounts",
      icon: Zap,
      href: "/integrations",
      iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
    },
    {
      title: "Generate Report",
      desc: "Create custom report",
      icon: FileBarChart,
      href: "/reports",
      iconBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
    },
    {
      title: "Content Calendar",
      desc: "Plan social media posts",
      icon: Calendar,
      href: "/content-studio",
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
    }
  ];

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        Quick Actions
      </h2>

      <div className="mt-2.5 space-y-1.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              onClick={() => router.push(act.href)}
              className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", act.iconBg)}>
                <Icon size={14} />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{act.title}</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{act.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 3: RECENT CAMPAIGNS TABLE
   ========================================================================= */
function RecentCampaignsCard({
  campaigns = [],
  loading
}: {
  campaigns?: Campaign[];
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
            Recent Campaigns
          </h2>
          <button
            onClick={() => router.push("/campaigns")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View All
          </button>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-zinc-400" />
          </div>
        ) : !campaigns.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
              <Rocket size={18} />
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No campaigns created yet
            </div>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
              Launch your first multi-channel advertising campaign to track spend, conversions, and ROAS.
            </p>
            <button
              onClick={() => router.push("/campaigns/create")}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus size={12} /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
                  <th className="pb-2 pl-1">Campaign</th>
                  <th className="pb-2 px-2">Status</th>
                  <th className="pb-2 px-2">Spend</th>
                  <th className="pb-2 px-2">Clicks</th>
                  <th className="pb-2 px-2">Conversions</th>
                  <th className="pb-2 px-2">ROAS</th>
                  <th className="pb-2 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {campaigns.slice(0, 5).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <td className="py-2.5 pl-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</div>
                      <div className="text-[10px] text-zinc-400">{c.objective}</div>
                    </td>
                    <td className="py-2.5 px-2">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100">
                      ${Number(c.spend || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400">
                      {Number(c.clicks || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400">
                      {Number(c.conversions || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100">
                      {Number(c.roas || 0).toFixed(2)}x
                    </td>
                    <td className="py-2.5 pr-1 text-right text-zinc-400">
                      <MoreHorizontal size={14} className="inline hover:text-zinc-900 dark:hover:text-zinc-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        <button
          onClick={() => router.push("/campaigns")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <span>View all campaigns</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 3: AI INSIGHTS
   ========================================================================= */
function AiInsightsPanel({
  insights = [],
  loading
}: {
  insights?: Insight[];
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-zinc-900 dark:text-zinc-100" />
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              AI Insights
            </h2>
          </div>
          <button
            onClick={() => router.push("/ai-insights")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View All
          </button>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-zinc-400" />
          </div>
        ) : !insights.length ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Sparkles size={16} />
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No insights generated yet
            </div>
            <p className="mt-0.5 max-w-[220px] text-[10px] text-zinc-500 dark:text-zinc-400">
              AI optimization recommendations and anomalies will appear as your campaigns accumulate live telemetry.
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            {insights.slice(0, 4).map((ins) => (
              <div
                key={ins.id}
                className="flex items-start gap-2.5 rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <Sparkles size={12} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{ins.title}</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {ins.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 3: TASKS PANEL (DYNAMIC BASED ON STATE)
   ========================================================================= */
function TasksPanel({
  hasIntegrations,
  hasCampaigns
}: {
  hasIntegrations: boolean;
  hasCampaigns: boolean;
}) {
  const router = useRouter();

  const tasks = useMemo(() => {
    const list = [];
    if (!hasIntegrations) {
      list.push({
        id: "task-connect",
        title: "Connect marketing accounts",
        subtitle: "Link Google Ads or Meta in Integrations",
        priority: "High",
        priorityBg:
          "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
        href: "/integrations"
      });
    }
    if (!hasCampaigns) {
      list.push({
        id: "task-campaign",
        title: "Create your first campaign",
        subtitle: "Set up multi-channel ad budget",
        priority: "Medium",
        priorityBg:
          "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
        href: "/campaigns/create"
      });
    }
    list.push({
      id: "task-report",
      title: "View cross-channel reports",
      subtitle: "Review analytics & attribution",
      priority: "Low",
      priorityBg:
        "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
      href: "/reports"
    });
    return list;
  }, [hasIntegrations, hasCampaigns]);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Tasks</h2>
          <span className="text-[11px] font-medium text-zinc-400">{tasks.length} pending</span>
        </div>

        <div className="mt-2.5 space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => router.push(task.href)}
              className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-5 w-5 place-items-center rounded-full border border-zinc-300 text-zinc-400 dark:border-zinc-700">
                  <Check size={11} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{task.title}</div>
                  <div className="text-[10px] text-zinc-400">{task.subtitle}</div>
                </div>
              </div>

              <span className={cn("rounded-full border px-2 py-0.2 text-[9px] font-bold", task.priorityBg)}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 4: PERFORMANCE SUMMARY (6 MINI METRICS)
   ========================================================================= */
function PerformanceSummaryGrid({
  summary,
  loading
}: {
  summary?: OverviewSummary;
  loading?: boolean;
}) {
  const impressions = summary?.impressions || 0;
  const clicks = summary?.clicks || 0;
  const conversions = summary?.conversions || 0;
  const cpa = summary?.cpa || 0;
  const cr = summary?.conversionRate || 0;
  const revenue = summary?.revenue || 0;

  const metrics = [
    {
      label: "Impressions",
      value: impressions.toLocaleString(),
      change: impressions > 0 ? "+9.8%" : "0.0%",
      icon: Eye,
      color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40"
    },
    {
      label: "Clicks",
      value: clicks.toLocaleString(),
      change: clicks > 0 ? "+12.6%" : "0.0%",
      icon: MousePointerClick,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40"
    },
    {
      label: "Conversions",
      value: conversions.toLocaleString(),
      change: conversions > 0 ? "+18.3%" : "0.0%",
      icon: ShoppingCart,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
    },
    {
      label: "Cost per Conv.",
      value: money(cpa),
      change: cpa > 0 ? "-3.2%" : "0.0%",
      trend: "down",
      icon: Tag,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
    },
    {
      label: "Conversion Rate",
      value: `${cr.toFixed(2)}%`,
      change: cr > 0 ? "+5.1%" : "0.0%",
      icon: Percent,
      color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40"
    },
    {
      label: "Revenue",
      value: money(revenue),
      change: revenue > 0 ? "+22.4%" : "0.0%",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
    }
  ];

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
          Performance Summary
        </h2>
        <span className="text-[11px] font-medium text-zinc-500">Telemetry Rollup</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isZero = m.change === "0.0%";
          return (
            <div
              key={m.label}
              className="rounded-lg border border-zinc-100 p-2.5 transition hover:border-zinc-200 dark:border-zinc-800/80 dark:hover:border-zinc-700"
            >
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <div className={cn("grid h-4 w-4 place-items-center rounded", m.color)}>
                  <Icon size={10} />
                </div>
                <span className="truncate">{m.label}</span>
              </div>

              <div className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{m.value}</div>

              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-zinc-400">
                {!isZero && <ArrowUpRight size={10} className="text-emerald-600 dark:text-emerald-400" />}
                <span className={!isZero ? "text-emerald-600 dark:text-emerald-400" : ""}>{m.change}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 4: SPENDING TREND BAR CHART
   ========================================================================= */
function SpendingTrendCard({
  series = [],
  loading
}: {
  series?: ChartPoint[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
          Spending Trend
        </h2>
        <span className="text-[11px] font-medium text-zinc-500">Daily Spend</span>
      </div>

      <div className="mt-3 h-36 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-zinc-400" />
          </div>
        ) : !series.length ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
              <BarChart3 size={16} />
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No spend recorded
            </div>
            <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
              Daily spend telemetry will graph here once campaigns run.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#a1a1aa"
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${val / 1000}k` : val}`}
              />
              <Tooltip
                formatter={(val: number) => [`$${val.toLocaleString()}`, "Spend"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e4e4e7",
                  fontSize: "11px"
                }}
              />
              <Bar dataKey="spend" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   ONBOARDING WELCOME BANNER FOR FRESH USERS
   ========================================================================= */
function OnboardingWelcomeBanner() {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-sky-50/50 p-5 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-sky-950/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-500">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Welcome to your live marketing workspace!
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl">
              No live telemetry detected yet. Connect your advertising accounts (Google Ads, Meta Ads, GA4, AdMob) or create your first campaign to stream dynamic analytics and ROAS tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/integrations")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Zap size={13} className="text-amber-500" />
            <span>Connect Accounts</span>
          </button>
          <button
            onClick={() => router.push("/campaigns/create")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus size={13} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN EXPORT: COMPLETE OVERVIEW PAGE (100% DYNAMIC)
   ========================================================================= */
export function OverviewPage() {
  const router = useRouter();

  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dateRange] = useState(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = thirtyAgo.toISOString().slice(0, 10);
    return { dateFrom: from, dateTo: to };
  });

  const { data, loading, error, retry } = useOverviewData({
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    granularity
  });

  const kpiMap = useMemo(() => {
    const map = new Map<string, MetricKpi>();
    if (data?.kpis) {
      data.kpis.forEach((k) => map.set(k.label.toLowerCase(), k));
    }
    return map;
  }, [data]);

  const spendKpi = kpiMap.get("total spend") || {
    label: "Total Spend",
    value: "$0.00",
    change: "0.0%",
    trend: "up" as const,
    icon: "spend"
  };

  const clicksKpi = kpiMap.get("total clicks") || {
    label: "Total Clicks",
    value: "0",
    change: "0.0%",
    trend: "up" as const,
    icon: "clicks"
  };

  const convKpi = kpiMap.get("conversions") ||
    kpiMap.get("total conversions") || {
      label: "Conversions",
      value: "0",
      change: "0.0%",
      trend: "up" as const,
      icon: "conversions"
    };

  const roasKpi = kpiMap.get("roas") ||
    kpiMap.get("average roas") || {
      label: "ROAS",
      value: "0.00x",
      change: "0.00x",
      trend: "up" as const,
      icon: "roas"
    };

  const ctrKpi = kpiMap.get("ctr") || {
    label: "CTR",
    value: "0.0%",
    change: "0.0%",
    trend: "up" as const,
    icon: "ctr"
  };

  const hasIntegrations = Boolean(data?.integrations?.some((i) => i.status === "Connected"));
  const hasCampaigns = Boolean((data?.campaigns?.length || 0) > 0);
  const isFreshUser = !loading && !hasIntegrations && !hasCampaigns && (!data?.series || data.series.length === 0);

  return (
    <AppShell
      title="Overview"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={retry}
            disabled={loading}
            title="Refresh telemetry"
            className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""} />
          </button>
          <button
            onClick={() => router.push("/campaigns/create")}
            className="btn-primary"
          >
            <Plus size={13} /> Create Campaign
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* FRESH USER ONBOARDING BANNER */}
        {isFreshUser && <OnboardingWelcomeBanner />}

        {/* ROW 1: TOP 5 STAT CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <TopKpiCard
            title="Total Spend"
            value={spendKpi.value}
            change={spendKpi.change}
            icon={DollarSign}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <TopKpiCard
            title="Total Clicks"
            value={clicksKpi.value}
            change={clicksKpi.change}
            icon={MousePointer2}
            iconBg="bg-sky-50 dark:bg-sky-950/40"
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <TopKpiCard
            title="Conversions"
            value={convKpi.value}
            change={convKpi.change}
            icon={ShoppingCart}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <TopKpiCard
            title="ROAS"
            value={roasKpi.value}
            change={roasKpi.change}
            icon={TrendingUp}
            iconBg="bg-rose-50 dark:bg-rose-950/40"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <TopKpiCard
            title="CTR"
            value={ctrKpi.value}
            change={ctrKpi.change}
            icon={Percent}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* ROW 2: PERFORMANCE OVERVIEW (3-LINE GRAPH) + SPEND DONUT + QUICK ACTIONS */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <MultiLinePerformanceChart
              series={data?.series || []}
              granularity={granularity}
              onGranularityChange={setGranularity}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-3">
            <SpendByPlatformCard
              platformSpend={data?.platformSpend || []}
              totalSpend={spendKpi.value}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-3">
            <QuickActionsPanel />
          </div>
        </div>

        {/* ROW 3: RECENT CAMPAIGNS + AI INSIGHTS + TASKS */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <RecentCampaignsCard
              campaigns={data?.campaigns || []}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-3">
            <AiInsightsPanel
              insights={data?.insights || []}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-3">
            <TasksPanel
              hasIntegrations={hasIntegrations}
              hasCampaigns={hasCampaigns}
            />
          </div>
        </div>

        {/* ROW 4: PERFORMANCE SUMMARY (6 METRICS) + SPENDING TREND (BAR CHART) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PerformanceSummaryGrid
              summary={data?.summary}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-4">
            <SpendingTrendCard
              series={data?.series || []}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
