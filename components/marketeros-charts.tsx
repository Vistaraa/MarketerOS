"use client";

import { useMemo, useState } from "react";
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
import type { ChartPoint } from "@/lib/types";
import { cn, money } from "@/lib/utils";

const DEFAULT_POINTS: ChartPoint[] = [
  { date: "May 01", spend: 420, clicks: 680, conversions: 28, roas: 3.8 },
  { date: "May 05", spend: 480, clicks: 760, conversions: 31, roas: 3.9 },
  { date: "May 09", spend: 720, clicks: 1140, conversions: 50, roas: 4.5 },
  { date: "May 13", spend: 810, clicks: 1290, conversions: 58, roas: 4.6 },
  { date: "May 17", spend: 840, clicks: 1350, conversions: 61, roas: 4.4 },
  { date: "May 21", spend: 1050, clicks: 1680, conversions: 79, roas: 4.8 },
  { date: "May 25", spend: 1120, clicks: 1810, conversions: 86, roas: 5.1 },
  { date: "May 29", spend: 1180, clicks: 1890, conversions: 89, roas: 5.0 },
  { date: "May 31", spend: 1310, clicks: 2100, conversions: 102, roas: 5.4 }
];

export function TrendChart({
  data,
  compact = false,
  showRoas = false
}: {
  data?: ChartPoint[];
  compact?: boolean;
  showRoas?: boolean;
  social?: boolean;
}) {
  const chartData = data && data.length > 0 ? data : DEFAULT_POINTS;
  const [metric, setMetric] = useState<"spend" | "conversions" | "clicks">("spend");

  return (
    <div className={cn("w-full space-y-3", compact ? "h-[160px]" : "h-[270px]")}>
      {!compact && (
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5 text-xs w-fit dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setMetric("spend")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              metric === "spend"
                ? "bg-white text-zinc-900 shadow-sm font-semibold dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            Spend
          </button>
          <button
            onClick={() => setMetric("conversions")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              metric === "conversions"
                ? "bg-white text-zinc-900 shadow-sm font-semibold dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            Conversions
          </button>
          <button
            onClick={() => setMetric("clicks")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              metric === "clicks"
                ? "bg-white text-zinc-900 shadow-sm font-semibold dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            Clicks
          </button>
        </div>
      )}

      <div className={cn("w-full", compact ? "h-full" : "h-[220px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f4f4f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val.includes("-") ? val.slice(5) : val)}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (metric === "spend" ? `$${val}` : `${val}`)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg text-xs dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-zinc-500">
                        <span>Spend:</span>
                        <strong className="text-zinc-900 dark:text-zinc-100">{money(item.spend)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-zinc-500">
                        <span>Conversions:</span>
                        <strong className="text-zinc-900 dark:text-zinc-100">{item.conversions}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-zinc-500">
                        <span>Clicks:</span>
                        <strong className="text-zinc-900 dark:text-zinc-100">{item.clicks}</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#18181b"
              strokeWidth={1.75}
              fill="url(#trendGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Sparkline({
  data = [20, 27, 22, 38, 34, 46, 41, 55]
}: {
  color?: string;
  data?: number[];
}) {
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line dataKey="value" stroke="#18181b" strokeWidth={1.5} dot={false} />
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <XAxis dataKey="index" hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data = [
    { label: "Google Ads", value: 10450, color: "#4285f4" },
    { label: "Meta Ads", value: 8320, color: "#1877f2" },
    { label: "Instagram", value: 3680, color: "#e4405f" },
    { label: "LinkedIn", value: 2120, color: "#0a66c2" }
  ],
  total,
  label = "Total Spend",
  center = true
}: {
  data?: { label: string; value: number; color: string }[];
  total?: string;
  label?: string;
  center?: boolean;
}) {
  const totalValue = total || `$${data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}`;
  return (
    <div className="relative h-[210px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell key={item.label} fill={item.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{totalValue}</div>
            <div className="mt-0.5 text-[10px] text-zinc-400">{label}</div>
          </div>
        </div>
      )}
    </div>
  );
}
