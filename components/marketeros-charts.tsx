"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/types";
import { cn, money } from "@/lib/utils";

const colors = { spend: "#6c42e8", clicks: "#2585e6", conversions: "#20ad78", roas: "#f4a425", pink: "#eb5971", teal: "#35b6ad" };

const tooltipStyle = { border: "1px solid #e7eaf0", borderRadius: 10, boxShadow: "0 8px 24px rgba(20,33,61,.08)", background: "#fff", fontSize: 12 };

export function TrendChart({ data, compact = false, showRoas = false, social = false }: { data: ChartPoint[]; compact?: boolean; showRoas?: boolean; social?: boolean }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({ spend: true, clicks: true, conversions: true, roas: showRoas });
  const series = showRoas ? ["spend", "clicks", "conversions", "roas"] : ["spend", "clicks", "conversions"];
  const labels: Record<string, string> = { spend: "Spend", clicks: "Clicks", conversions: "Conversions", roas: "ROAS" };
  return <div className={cn("w-full", compact ? "h-[155px]" : "h-[285px]")}>
    {!compact && <div className="mb-3 flex flex-wrap items-center gap-4">{series.map((key) => <button key={key} onClick={() => setVisible((state) => ({ ...state, [key]: !state[key] }))} className="flex items-center gap-2 text-[11px] font-medium text-[#55617a]"><span className={cn("grid h-4 w-4 place-items-center rounded", visible[key] ? "text-white" : "border border-[#cbd2df] text-transparent")} style={visible[key] ? { background: colors[key as keyof typeof colors] } : undefined}>✓</span>{labels[key]}</button>)}</div>}
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="#edf0f5" strokeDasharray="2 3" vertical={false} />
      <XAxis dataKey="date" tick={{ fill: "#8290a7", fontSize: 10 }} axisLine={false} tickLine={false} interval={compact ? 5 : 4} />
      <YAxis tick={{ fill: "#8290a7", fontSize: 10 }} axisLine={false} tickLine={false} width={compact ? 30 : 42} tickFormatter={(value) => compact ? `${Math.round(value / 1000)}k` : value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`} />
      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#14213d", fontWeight: 700 }} formatter={(value: number, name: string) => [name === "spend" ? money(value) : value.toLocaleString(), labels[name] || name]} />
      {visible.spend && <Line type="monotone" dataKey="spend" stroke={colors.spend} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
      {visible.clicks && <Line type="monotone" dataKey="clicks" stroke={colors.clicks} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
      {visible.conversions && <Line type="monotone" dataKey="conversions" stroke={colors.conversions} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
      {visible.roas && <Line type="monotone" dataKey="roas" stroke={colors.roas} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
    </LineChart></ResponsiveContainer>
  </div>;
}

export function Sparkline({ color = colors.spend, data = [20, 27, 22, 38, 34, 46, 41, 55] }: { color?: string; data?: number[] }) {
  const points = data.map((value, index) => ({ index, value }));
  return <div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><Line dataKey="value" stroke={color} strokeWidth={2} dot={false} /><YAxis domain={["dataMin", "dataMax"]} hide /><XAxis dataKey="index" hide /></LineChart></ResponsiveContainer></div>;
}

export function DonutChart({ data, total, label = "Total Spend", center = true }: { data: { label: string; value: number; color: string }[]; total?: string; label?: string; center?: boolean }) {
  const totalValue = total || data.reduce((sum, item) => sum + item.value, 0).toLocaleString();
  return <div className="relative h-[210px] w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="#fff" strokeWidth={2}>{data.map((item) => <Cell key={item.label} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString()} /></PieChart></ResponsiveContainer>{center && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[22px] font-extrabold tracking-[-.04em] text-[#14213d]">{totalValue}</div><div className="mt-0.5 text-[10px] text-[#7b879c]">{label}</div></div></div>}</div>;
}

export function AudienceBars() {
  const data = Array.from({ length: 18 }, (_, index) => ({ day: index + 1, value: 6800 + index * 720 + (index % 3) * 500 }));
  return <div className="h-[190px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8290a7" }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="#7451e9" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function FunnelChart() {
  const items = [{ label: "Impressions", value: "2,450,000", width: "100%", color: "#6d43e8", change: "9.8%" }, { label: "Clicks", value: "145,389", width: "77%", color: "#2a85e6", change: "12.6%" }, { label: "Conversions", value: "3,753", width: "54%", color: "#35b6ad", change: "18.3%" }, { label: "Customers", value: "1,896", width: "31%", color: "#f3a427", change: "15.2%" }];
  return <div className="space-y-2 py-2">{items.map((item) => <div className="flex items-center gap-3" key={item.label}><div className="flex h-12 flex-1 items-center justify-center" style={{ clipPath: "polygon(0 0, 100% 0, 86% 100%, 14% 100%)", background: item.color, width: item.width }}><span className="text-[10px] font-bold text-white">{item.label}</span></div><div className="w-28"><div className="text-[11px] text-[#7c879b]">{item.label}</div><div className="text-xs font-bold text-[#14213d]">{item.value}</div></div><span className="rounded-full bg-[#e7f8ef] px-1.5 py-0.5 text-[10px] font-bold text-[#159a65]">↑ {item.change}</span></div>)}</div>;
}

export function Heatmap() {
  const cells = useMemo(() => Array.from({ length: 7 * 12 }, (_, index) => ({ index, strength: (index * 7 + 11) % 10 })), []);
  return <div className="grid grid-cols-12 gap-1.5">{cells.map((cell) => <span key={cell.index} className="h-5 rounded-[3px]" style={{ background: `rgba(103, 65, 231, ${0.08 + cell.strength / 12})` }} title={`Performance ${cell.strength + 1}/10`} />)}</div>;
}
