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
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  HelpCircle,
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
  Share2,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  Campaign,
  Integration,
  MetricKpi,
  OverviewQuery,
  OverviewPayload,
  PlatformSpendItem
} from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { PlatformIcon } from "@/components/marketeros-icons";
import { AppShell, StatusBadge } from "@/components/marketeros-shell";
import { useOverviewData } from "@/components/use-overview-data";
import {
  Area,
  AreaChart,
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
   RICH DEFAULT / DUMMY DATA SETS MATCHING REFERENCE
   ========================================================================= */
const PERFORMANCE_SERIES = [
  { date: "May 1", spend: 4000, clicks: 2100, conversions: 500 },
  { date: "May 3", spend: 4400, clicks: 2300, conversions: 620 },
  { date: "May 6", spend: 6200, clicks: 3600, conversions: 1100 },
  { date: "May 8", spend: 5800, clicks: 3300, conversions: 980 },
  { date: "May 11", spend: 5400, clicks: 2900, conversions: 860 },
  { date: "May 13", spend: 6800, clicks: 3900, conversions: 1250 },
  { date: "May 16", spend: 7200, clicks: 4200, conversions: 1390 },
  { date: "May 18", spend: 6500, clicks: 3800, conversions: 1150 },
  { date: "May 21", spend: 7800, clicks: 4500, conversions: 1480 },
  { date: "May 23", spend: 7100, clicks: 4100, conversions: 1320 },
  { date: "May 26", spend: 8900, clicks: 5200, conversions: 1850 },
  { date: "May 28", spend: 7900, clicks: 4700, conversions: 1540 },
  { date: "May 31", spend: 8400, clicks: 4900, conversions: 1620 }
];

const SPEND_PLATFORMS = [
  { label: "Google Ads", value: 9650, color: "#6366f1", percent: 39.4 },
  { label: "Meta Ads", value: 7820, color: "#0ea5e9", percent: 31.9 },
  { label: "Instagram Ads", value: 3250, color: "#f43f5e", percent: 13.3 },
  { label: "LinkedIn Ads", value: 2450, color: "#eab308", percent: 10.0 },
  { label: "TikTok Ads", value: 1330, color: "#10b981", percent: 5.4 }
];

const RECENT_CAMPAIGNS_LIST = [
  {
    id: "camp-1",
    name: "Summer Sale Campaign",
    objective: "Search Campaign",
    platform: "Google Ads",
    status: "Active",
    spend: 5420,
    clicks: 32145,
    conversions: 832,
    roas: 3.82
  },
  {
    id: "camp-2",
    name: "Remarketing Campaign",
    objective: "Display Campaign",
    platform: "Meta Ads",
    status: "Active",
    spend: 4230,
    clicks: 28945,
    conversions: 721,
    roas: 4.15
  },
  {
    id: "camp-3",
    name: "Instagram Engagement",
    objective: "Engagement Campaign",
    platform: "Instagram",
    status: "Active",
    spend: 3250,
    clicks: 18562,
    conversions: 512,
    roas: 2.91
  },
  {
    id: "camp-4",
    name: "Lead Generation - Q2",
    objective: "Lead Gen Campaign",
    platform: "LinkedIn",
    status: "Active",
    spend: 2450,
    clicks: 15623,
    conversions: 312,
    roas: 2.08
  },
  {
    id: "camp-5",
    name: "New Product Launch",
    objective: "Search Campaign",
    platform: "Google Ads",
    status: "Paused",
    spend: 2980,
    clicks: 16245,
    conversions: 492,
    roas: 3.12
  }
];

const AI_INSIGHTS_DATA = [
  {
    id: "ins-1",
    title: "Your Google Ads ROAS improved by 16.7%",
    description: "Great job! Consider increasing budget on top performing campaigns.",
    type: "positive",
    icon: ArrowUpRight,
    badgeBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
  },
  {
    id: "ins-2",
    title: "Instagram engagement is high but conversions are low",
    description: "Try updating your call-to-action and destination landing page.",
    type: "warning",
    icon: Lightbulb,
    badgeBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
  },
  {
    id: "ins-3",
    title: "Best time to post on Instagram is 7PM - 9PM",
    description: "Based on your audience peak interaction activity this month.",
    type: "info",
    icon: Clock,
    badgeBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
  },
  {
    id: "ins-4",
    title: "You can save $2,430 by pausing low-performing keywords.",
    description: "We found 12 keywords with high spend and low conversions.",
    type: "saving",
    icon: TrendingUp,
    badgeBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
  }
];

const TASKS_DATA = [
  {
    id: "task-1",
    title: "Review Google Ads campaign",
    subtitle: "Summer Sale Campaign",
    priority: "High",
    priorityBg: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900"
  },
  {
    id: "task-2",
    title: "Approve Instagram content",
    subtitle: "3 posts pending review",
    priority: "Medium",
    priorityBg: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
  },
  {
    id: "task-3",
    title: "Check conversion tracking",
    subtitle: "Setup is incomplete",
    priority: "Medium",
    priorityBg: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
  },
  {
    id: "task-4",
    title: "Monthly performance report",
    subtitle: "Due in 3 days",
    priority: "Low",
    priorityBg: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
  }
];

const DAILY_SPENDING_BARS = [
  { day: "May 1", value: 1200 },
  { day: "May 2", value: 1800 },
  { day: "May 3", value: 2400 },
  { day: "May 4", value: 1600 },
  { day: "May 5", value: 2100 },
  { day: "May 6", value: 2900 },
  { day: "May 7", value: 1400 },
  { day: "May 8", value: 3100 },
  { day: "May 9", value: 2200 },
  { day: "May 10", value: 1900 },
  { day: "May 11", value: 2600 },
  { day: "May 12", value: 3400 },
  { day: "May 13", value: 2800 },
  { day: "May 14", value: 1700 },
  { day: "May 15", value: 2500 },
  { day: "May 16", value: 3600 },
  { day: "May 17", value: 2900 },
  { day: "May 18", value: 2100 },
  { day: "May 19", value: 3300 },
  { day: "May 20", value: 1800 },
  { day: "May 21", value: 2700 },
  { day: "May 22", value: 3500 },
  { day: "May 23", value: 2400 },
  { day: "May 24", value: 1900 },
  { day: "May 25", value: 3800 },
  { day: "May 26", value: 3100 },
  { day: "May 27", value: 2600 },
  { day: "May 28", value: 3200 },
  { day: "May 29", value: 2900 },
  { day: "May 30", value: 2700 },
  { day: "May 31", value: 3400 }
];

/* =========================================================================
   TOP 5 KPI CARDS
   ========================================================================= */
function TopKpiCard({
  title,
  value,
  change,
  period = "vs Apr 1 - Apr 30",
  icon: Icon,
  iconBg,
  iconColor
}: {
  title: string;
  value: string;
  change: string;
  period?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700">
      <div>
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
        <div className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px]">
          <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} />
            {change}
          </span>
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
function MultiLinePerformanceChart() {
  const [granularity, setGranularity] = useState("Daily");

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Performance Overview</h2>
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
            onChange={(e) => setGranularity(e.target.value)}
            className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={PERFORMANCE_SERIES} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 2: SPEND BY PLATFORM (DONUT CHART + LEGEND)
   ========================================================================= */
function SpendByPlatformCard() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Spend by Platform</h2>
          <select className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-600 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <option>Total Spend</option>
            <option>This Month</option>
          </select>
        </div>

        {/* Donut Chart & Legend */}
        <div className="mt-3 flex items-center justify-between gap-2.5">
          <div className="relative h-36 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={SPEND_PLATFORMS}
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
                  {SPEND_PLATFORMS.map((item) => (
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
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">$24,500</span>
              <span className="text-[9px] text-zinc-400">Total</span>
            </div>
          </div>

          {/* Platform Legend List */}
          <div className="flex-1 space-y-1.5 text-xs min-w-0">
            {SPEND_PLATFORMS.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate text-zinc-600 dark:text-zinc-400">{item.label}</span>
                </div>
                <span className="font-semibold text-zinc-900 shrink-0 dark:text-zinc-100">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
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
function RecentCampaignsCard() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Recent Campaigns</h2>
          <button
            onClick={() => router.push("/campaigns")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View All
          </button>
        </div>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
                <th className="pb-2 pl-1">Campaign</th>
                <th className="pb-2 px-2">Platform</th>
                <th className="pb-2 px-2">Status</th>
                <th className="pb-2 px-2">Spend</th>
                <th className="pb-2 px-2">Clicks</th>
                <th className="pb-2 px-2">Conversions</th>
                <th className="pb-2 px-2">ROAS</th>
                <th className="pb-2 pr-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
              {RECENT_CAMPAIGNS_LIST.map((c) => (
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
                    <PlatformIcon platform={c.platform} size={16} />
                  </td>
                  <td className="py-2.5 px-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100">${c.spend.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400">{c.clicks.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400">{c.conversions.toLocaleString()}</td>
                  <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100">{c.roas.toFixed(2)}</td>
                  <td className="py-2.5 pr-1 text-right text-zinc-400">
                    <MoreHorizontal size={14} className="inline hover:text-zinc-900 dark:hover:text-zinc-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
function AiInsightsPanel() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-zinc-900 dark:text-zinc-100" />
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">AI Insights</h2>
          </div>
          <button
            onClick={() => router.push("/ai-insights")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View All
          </button>
        </div>

        <div className="mt-2.5 space-y-2">
          {AI_INSIGHTS_DATA.map((ins) => {
            const Icon = ins.icon;
            return (
              <div
                key={ins.id}
                className="flex items-start gap-2.5 rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <div className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", ins.badgeBg)}>
                  <Icon size={12} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{ins.title}</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {ins.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROW 3: TASKS PANEL
   ========================================================================= */
function TasksPanel() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Tasks</h2>
          <button
            onClick={() => router.push("/tasks")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View All
          </button>
        </div>

        <div className="mt-2.5 space-y-2">
          {TASKS_DATA.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
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
function PerformanceSummaryGrid() {
  const metrics = [
    { label: "Impressions", value: "2.45M", change: "9.8%", icon: Eye, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
    { label: "Clicks", value: "145.39K", change: "12.6%", icon: MousePointerClick, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Conversions", value: "3,753", change: "18.3%", icon: ShoppingCart, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Cost per Conversion", value: "$6.53", change: "3.2%", trend: "down", icon: Tag, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Conversion Rate", value: "2.58%", change: "5.1%", icon: Percent, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" },
    { label: "Revenue", value: "$106,575", change: "22.4%", icon: DollarSign, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" }
  ];

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Performance Summary</h2>
        <select className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-600 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <option>This Month</option>
          <option>Last 30 Days</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => {
          const Icon = m.icon;
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

              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={10} />
                <span>{m.change}</span>
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
function SpendingTrendCard() {
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">Spending Trend</h2>
        <select className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-600 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <option>This Month</option>
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="mt-3 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DAILY_SPENDING_BARS} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#f4f4f5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} interval={5} />
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
            <Bar dataKey="value" fill="#6366f1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN EXPORT: COMPLETE OVERVIEW PAGE MATCHING REFERENCE
   ========================================================================= */
export function OverviewPage() {
  const router = useRouter();

  return (
    <AppShell
      title="Overview"
      action={
        <button
          onClick={() => router.push("/campaigns/create")}
          className="btn-primary"
        >
          <Plus size={13} /> Create Campaign
        </button>
      }
    >
      <div className="space-y-4">
        {/* ROW 1: TOP 5 STAT CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <TopKpiCard
            title="Total Spend"
            value="$24,500"
            change="8.4%"
            icon={DollarSign}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <TopKpiCard
            title="Total Clicks"
            value="145,389"
            change="12.6%"
            icon={MousePointer2}
            iconBg="bg-sky-50 dark:bg-sky-950/40"
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <TopKpiCard
            title="Conversions"
            value="3,753"
            change="18.3%"
            icon={ShoppingCart}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <TopKpiCard
            title="ROAS"
            value="4.35"
            change="16.7%"
            icon={TrendingUp}
            iconBg="bg-rose-50 dark:bg-rose-950/40"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <TopKpiCard
            title="CTR"
            value="2.45%"
            change="6.7%"
            icon={Percent}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* ROW 2: PERFORMANCE OVERVIEW (3-LINE GRAPH) + SPEND DONUT + QUICK ACTIONS */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <MultiLinePerformanceChart />
          </div>
          <div className="xl:col-span-3">
            <SpendByPlatformCard />
          </div>
          <div className="xl:col-span-3">
            <QuickActionsPanel />
          </div>
        </div>

        {/* ROW 3: RECENT CAMPAIGNS + AI INSIGHTS + TASKS */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <RecentCampaignsCard />
          </div>
          <div className="xl:col-span-3">
            <AiInsightsPanel />
          </div>
          <div className="xl:col-span-3">
            <TasksPanel />
          </div>
        </div>

        {/* ROW 4: PERFORMANCE SUMMARY (6 METRICS) + SPENDING TREND (BAR CHART) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PerformanceSummaryGrid />
          </div>
          <div className="xl:col-span-4">
            <SpendingTrendCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
