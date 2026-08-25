"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Info,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Share2,
  ShieldCheck,
  Trash2,
  TrendingUp
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign, ChartPoint } from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { PlatformIcon } from "@/components/marketeros-icons";
import { AppShell, StatusBadge } from "@/components/marketeros-shell";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type PlatformItem = {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: "Active" | "Paused" | "Draft";
  budget: number;
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpa: number;
  startDate: string;
  endDate: string;
  objective: string;
  targetRoas: number;
  biddingStrategy: string;
  location: string;
  devices: string;
  description: string;
};

const DEFAULT_PLATFORMS_TABLE: PlatformItem[] = [
  {
    id: "p-google-search",
    name: "Google Ads Search",
    type: "Search Campaign",
    platform: "Google Ads",
    status: "Active",
    budget: 5000,
    spend: 5420,
    clicks: 32145,
    conversions: 832,
    roas: 3.82,
    cpa: 6.51,
    startDate: "May 01, 2024",
    endDate: "May 31, 2024",
    objective: "Sales",
    targetRoas: 4.0,
    biddingStrategy: "Maximize Conversions",
    location: "India",
    devices: "All Devices",
    description: "This campaign targets high-intent keywords to drive sales during our summer sale event."
  },
  {
    id: "p-meta",
    name: "Meta Ads Dynamic",
    type: "Catalog Sales",
    platform: "Meta Ads",
    status: "Active",
    budget: 4000,
    spend: 4230,
    clicks: 28945,
    conversions: 721,
    roas: 4.15,
    cpa: 5.86,
    startDate: "May 01, 2024",
    endDate: "May 31, 2024",
    objective: "Conversions",
    targetRoas: 4.2,
    biddingStrategy: "Target ROAS",
    location: "India, US",
    devices: "Mobile & Desktop",
    description: "Dynamic retargeting catalog ads targeting previous cart abandoners and store visitors."
  },
  {
    id: "p-instagram",
    name: "Instagram Reels Viral",
    type: "Engagement Campaign",
    platform: "Instagram",
    status: "Active",
    budget: 3000,
    spend: 3250,
    clicks: 18562,
    conversions: 512,
    roas: 2.91,
    cpa: 6.34,
    startDate: "May 05, 2024",
    endDate: "May 31, 2024",
    objective: "Brand Awareness",
    targetRoas: 3.0,
    biddingStrategy: "Maximize Clicks",
    location: "India",
    devices: "Mobile Only",
    description: "Influencer partnership reels highlighting premium product features and discounts."
  },
  {
    id: "p-google-display",
    name: "Google Display Network",
    type: "Banner Retargeting",
    platform: "Google Ads",
    status: "Paused",
    budget: 3500,
    spend: 2980,
    clicks: 16245,
    conversions: 492,
    roas: 3.12,
    cpa: 6.05,
    startDate: "May 01, 2024",
    endDate: "May 31, 2024",
    objective: "Retargeting",
    targetRoas: 3.5,
    biddingStrategy: "Target CPA",
    location: "Global",
    devices: "All Devices",
    description: "Responsive display banners across Google Publisher Network and top news publishers."
  },
  {
    id: "p-linkedin",
    name: "LinkedIn B2B Sponsored",
    type: "Lead Gen Campaign",
    platform: "LinkedIn",
    status: "Active",
    budget: 2500,
    spend: 2450,
    clicks: 15623,
    conversions: 312,
    roas: 2.08,
    cpa: 7.85,
    startDate: "May 08, 2024",
    endDate: "May 31, 2024",
    objective: "Lead Generation",
    targetRoas: 2.5,
    biddingStrategy: "Maximize Leads",
    location: "Tier 1 Metros",
    devices: "Desktop Preferred",
    description: "Targeting CMOs, marketing directors, and growth leads with automated lead gen forms."
  },
  {
    id: "p-youtube",
    name: "YouTube Bumper & In-Stream",
    type: "Video Ads",
    platform: "YouTube",
    status: "Active",
    budget: 2000,
    spend: 1820,
    clicks: 25632,
    conversions: 234,
    roas: 1.95,
    cpa: 7.77,
    startDate: "May 10, 2024",
    endDate: "May 31, 2024",
    objective: "Video Views",
    targetRoas: 2.0,
    biddingStrategy: "Target CPV",
    location: "India",
    devices: "Mobile & Connected TV",
    description: "15-second non-skippable pre-roll ads targeting high-affinity tech audiences."
  },
  {
    id: "p-tiktok",
    name: "TikTok Spark Ads",
    type: "Short-Form Video",
    platform: "TikTok",
    status: "Draft",
    budget: 1500,
    spend: 0,
    clicks: 0,
    conversions: 0,
    roas: 0.0,
    cpa: 0,
    startDate: "May 25, 2024",
    endDate: "Jun 25, 2024",
    objective: "Conversions",
    targetRoas: 3.0,
    biddingStrategy: "Maximize Conversions",
    location: "International",
    devices: "Mobile Only",
    description: "Viral creator spark ads draft scheduled for next international launch phase."
  }
];

const PLATFORM_DAILY_SERIES = [
  { date: "May 1", spend: 3800, clicks: 1900, conversions: 480 },
  { date: "May 3", spend: 4200, clicks: 2200, conversions: 590 },
  { date: "May 6", spend: 5800, clicks: 3100, conversions: 950 },
  { date: "May 8", spend: 5400, clicks: 2900, conversions: 890 },
  { date: "May 11", spend: 5100, clicks: 2600, conversions: 790 },
  { date: "May 13", spend: 6400, clicks: 3500, conversions: 1100 },
  { date: "May 16", spend: 6900, clicks: 3800, conversions: 1280 },
  { date: "May 18", spend: 6200, clicks: 3400, conversions: 1050 },
  { date: "May 21", spend: 7500, clicks: 4100, conversions: 1390 },
  { date: "May 23", spend: 6800, clicks: 3700, conversions: 1210 },
  { date: "May 26", spend: 8400, clicks: 4800, conversions: 1650 },
  { date: "May 28", spend: 7600, clicks: 4300, conversions: 1420 },
  { date: "May 31", spend: 8100, clicks: 4500, conversions: 1510 }
];

export function LiveCampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("p-google-search");
  const [granularity, setGranularity] = useState("Daily");
  const [currentPage, setCurrentPage] = useState(1);

  const selectedPlatform = useMemo(() => {
    return (
      DEFAULT_PLATFORMS_TABLE.find((p) => p.id === selectedPlatformId) ||
      DEFAULT_PLATFORMS_TABLE[0]
    );
  }, [selectedPlatformId]);

  return (
    <AppShell
      title="Campaign Details"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/campaigns")} className="btn-secondary">
            <ArrowLeft size={13} /> Back
          </button>
          <button className="btn-secondary">
            <Share2 size={13} /> Share
          </button>
          <button className="btn-primary">
            <Edit3 size={13} /> Edit Campaign
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* =========================================================================
           TOP SECTION: CONNECTED PLATFORMS TABLE (IMAGE 1 REFERENCE)
           ========================================================================= */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="py-2.5 pl-4 pr-3">Platform</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Budget</th>
                  <th className="px-3 py-2.5">Spend</th>
                  <th className="px-3 py-2.5">Clicks</th>
                  <th className="px-3 py-2.5">Conversions</th>
                  <th className="px-3 py-2.5">ROAS ↕</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {DEFAULT_PLATFORMS_TABLE.map((item) => {
                  const isSelected = selectedPlatformId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedPlatformId(item.id)}
                      className={cn(
                        "cursor-pointer transition",
                        isSelected
                          ? "bg-zinc-100/90 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      )}
                    >
                      {/* Platform Icon & Name */}
                      <td className="py-2.5 pl-4 pr-3">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={item.platform} size={18} />
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                            <div className="text-[10px] text-zinc-400">{item.type}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-2.5">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Daily Budget */}
                      <td className="px-3 py-2.5 text-zinc-900 dark:text-zinc-100">
                        ${item.budget.toLocaleString()}{" "}
                        <span className="text-[10px] text-zinc-400">/day</span>
                      </td>

                      {/* Spend */}
                      <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${item.spend.toLocaleString()}
                      </td>

                      {/* Clicks */}
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {item.clicks.toLocaleString()}
                      </td>

                      {/* Conversions */}
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {item.conversions.toLocaleString()}
                      </td>

                      {/* ROAS with Green Up Arrow */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.roas > 0 ? (
                            <>
                              <span>{item.roas.toFixed(2)}</span>
                              <ArrowUpRight size={12} className="text-emerald-500" />
                            </>
                          ) : (
                            <span className="text-zinc-400">0.00</span>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 pl-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 text-zinc-400">
                          <button
                            onClick={() => setSelectedPlatformId(item.id)}
                            className={cn(
                              "grid h-6 w-6 place-items-center rounded border transition",
                              isSelected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            )}
                            title="Inspect Platform Chart"
                          >
                            <BarChart2 size={12} />
                          </button>
                          <button
                            onClick={() => alert(`Edit ${item.name}`)}
                            className="grid h-6 w-6 place-items-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            className="grid h-6 w-6 place-items-center rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            title="More"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-end gap-1 border-t border-zinc-100 p-2.5 text-xs dark:border-zinc-800">
            <button className="grid h-5 w-5 place-items-center rounded border border-zinc-200 text-zinc-400 hover:bg-zinc-50 dark:border-zinc-800">
              <ChevronLeft size={11} />
            </button>
            {[1, 2, 3, 4].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "grid h-5 w-5 place-items-center rounded text-[11px] font-semibold transition",
                  currentPage === page
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                )}
              >
                {page}
              </button>
            ))}
            <button className="grid h-5 w-5 place-items-center rounded border border-zinc-200 text-zinc-400 hover:bg-zinc-50 dark:border-zinc-800">
              <ChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* =========================================================================
           BOTTOM SECTION: SELECTED PLATFORM DETAILS & CHART (IMAGE 2 REFERENCE)
           ========================================================================= */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-start">
          {/* LEFT CARD: PLATFORM ATTRIBUTES & DESCRIPTION */}
          <div className="xl:col-span-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <PlatformIcon platform={selectedPlatform.platform} size={24} />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedPlatform.name}
                  </h2>
                  <div className="text-[11px] text-zinc-400">{selectedPlatform.type}</div>
                </div>
              </div>

              {/* 4x2 Detail Attributes Grid */}
              <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Budget</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">
                    ${selectedPlatform.budget.toLocaleString()} <span className="font-normal text-zinc-400">/day</span>
                  </strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Start Date</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.startDate}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">End Date</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.endDate}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Objective</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.objective}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Target ROAS</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.targetRoas.toFixed(1)}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Bidding Strategy</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100 truncate">{selectedPlatform.biddingStrategy}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Location</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.location}</strong>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Devices</span>
                  <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{selectedPlatform.devices}</strong>
                </div>
              </div>

              {/* Campaign Description Box */}
              <div className="mt-4 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Campaign Description</span>
                <p className="mt-1 leading-relaxed text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedPlatform.description}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: 5 STAT TILES + MULTI-LINE PERFORMANCE OVER TIME CHART */}
          <div className="xl:col-span-8 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            {/* Top 5 KPI Tiles */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-zinc-100 pb-3.5 dark:border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Spend</span>
                <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">${selectedPlatform.spend.toLocaleString()}</div>
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={10} /> 8.4%
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Clicks</span>
                <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedPlatform.clicks.toLocaleString()}</div>
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={10} /> 12.6%
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Conversions</span>
                <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedPlatform.conversions.toLocaleString()}</div>
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={10} /> 18.3%
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Cost / Conv.</span>
                <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">${selectedPlatform.cpa.toFixed(2)}</div>
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                  <ArrowDownRight size={10} /> 3.2%
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">ROAS</span>
                <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedPlatform.roas.toFixed(2)}</div>
                <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={10} /> 16.7%
                </div>
              </div>
            </div>

            {/* Performance Over Time Section */}
            <div className="mt-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Performance Over Time
                </h3>

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

              {/* Chart */}
              <div className="mt-3 h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PLATFORM_DAILY_SERIES} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
                      dot={{ r: 2, fill: "#6366f1" }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#0ea5e9" }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversions"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#10b981" }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
