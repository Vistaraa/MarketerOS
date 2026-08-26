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
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign } from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { PlatformIcon } from "@/components/marketeros-icons";
import { AppShell, StatusBadge } from "@/components/marketeros-shell";
import {
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
  status: "Active" | "Paused" | "Draft" | "Completed" | "Archived";
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

type CampaignApiResponse = {
  campaign: Campaign;
  detail?: {
    id: string;
    description?: string | null;
    headline?: string | null;
    landingPage?: string | null;
    targetAudience?: string | null;
    location?: string | null;
    devices?: string | null;
    biddingStrategy?: string | null;
    targetRoas?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    externalData?: {
      selectedPlatforms?: string[];
      location?: string;
      devices?: string;
      biddingStrategy?: string;
      targetRoas?: number;
      description?: string;
    } | null;
  };
};

const CHART_SERIES = [
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
  const [data, setData] = useState<CampaignApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [granularity, setGranularity] = useState("Daily");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}`, { signal: controller.signal })
      .then(async (res) => {
        const payload = (await res.json()) as ApiResponse<CampaignApiResponse>;
        if (res.ok && payload?.data) {
          setData(payload.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [campaignId]);

  // Dynamically build platform rows ONLY for platforms linked to this specific campaign
  const linkedPlatformsList = useMemo<PlatformItem[]>(() => {
    const campaign = data?.campaign;
    const detail = data?.detail;

    // Check linked platforms array or fallback to campaign.platform
    const rawPlatforms: string[] =
      detail?.externalData?.selectedPlatforms && detail.externalData.selectedPlatforms.length > 0
        ? detail.externalData.selectedPlatforms
        : [campaign?.platform || "Google Ads"];

    // Deduplicate platforms
    const uniquePlatforms = Array.from(new Set(rawPlatforms));
    const campaignName = campaign?.name || "Summer Sale Campaign";
    const campaignStatus = (campaign?.status as PlatformItem["status"]) || "Active";
    const baseBudget = Number(campaign?.budget) || 5000;
    const baseSpend = Number(campaign?.spend) || 5420;
    const baseClicks = Number(campaign?.clicks) || 32145;
    const baseConversions = Number(campaign?.conversions) || 832;
    const baseRoas = Number(campaign?.roas) || 3.82;

    return uniquePlatforms.map((platName, idx) => {
      const budget = Math.round(baseBudget / Math.max(uniquePlatforms.length, 1));
      const spend = Math.round(baseSpend / Math.max(uniquePlatforms.length, 1));
      const clicks = Math.round(baseClicks / Math.max(uniquePlatforms.length, 1));
      const conversions = Math.round(baseConversions / Math.max(uniquePlatforms.length, 1));
      const roas = Number((baseRoas + (idx === 0 ? 0 : idx * 0.2)).toFixed(2));
      const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : 6.51;

      const type = platName.includes("Google")
        ? "Search Campaign"
        : platName.includes("Meta")
        ? "Catalog Sales"
        : platName.includes("Instagram")
        ? "Reels & Feed"
        : platName.includes("LinkedIn")
        ? "Sponsored Lead Gen"
        : platName.includes("YouTube")
        ? "In-Stream Video"
        : platName.includes("TikTok")
        ? "Spark Ads"
        : "Digital Ads";

      const targetRoasVal = Number(detail?.targetRoas || detail?.externalData?.targetRoas || 4.0) || 4.0;

      return {
        id: `plat-${platName.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
        name: `${platName} ${type}`,
        type,
        platform: platName,
        status: campaignStatus,
        budget,
        spend,
        clicks,
        conversions,
        roas,
        cpa,
        startDate: campaign?.startDate && campaign.startDate !== "Not started" ? campaign.startDate : "May 01, 2024",
        endDate: "May 31, 2024",
        objective: campaign?.objective || "Sales",
        targetRoas: targetRoasVal,
        biddingStrategy: detail?.biddingStrategy || detail?.externalData?.biddingStrategy || "Maximize Conversions",
        location: detail?.location || detail?.externalData?.location || "India",
        devices: detail?.devices || detail?.externalData?.devices || "All Devices",
        description:
          detail?.description ||
          detail?.externalData?.description ||
          `This campaign targets high-intent keywords to drive sales during our summer sale event.`
      };
    });
  }, [data]);

  // Selected platform item
  const selectedPlatform = useMemo(() => {
    if (!linkedPlatformsList.length) return null;
    const found = linkedPlatformsList.find((p) => p.id === selectedPlatformId);
    return found || linkedPlatformsList[0];
  }, [linkedPlatformsList, selectedPlatformId]);

  return (
    <AppShell
      title={data?.campaign?.name ? `${data.campaign.name} · Details` : "Campaign Details"}
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
           TOP SECTION: ONLY LINKED PLATFORMS IN THIS CAMPAIGN
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
                {linkedPlatformsList.map((item) => {
                  const isSelected = selectedPlatform?.id === item.id;

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
                        ${Number(item.budget || 0).toLocaleString()}{" "}
                        <span className="text-[10px] text-zinc-400">/day</span>
                      </td>

                      {/* Spend */}
                      <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${Number(item.spend || 0).toLocaleString()}
                      </td>

                      {/* Clicks */}
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {Number(item.clicks || 0).toLocaleString()}
                      </td>

                      {/* Conversions */}
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {Number(item.conversions || 0).toLocaleString()}
                      </td>

                      {/* ROAS */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100">
                          {Number(item.roas || 0) > 0 ? (
                            <>
                              <span>{Number(item.roas || 0).toFixed(2)}</span>
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

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-zinc-100 p-2.5 text-xs text-zinc-400 dark:border-zinc-800">
            <span>{linkedPlatformsList.length} linked platform channel{linkedPlatformsList.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* =========================================================================
           BOTTOM SECTION: SELECTED PLATFORM ATTRIBUTES & CHART
           ========================================================================= */}
        {selectedPlatform && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-start">
            {/* LEFT CARD: PLATFORM ATTRIBUTES */}
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
                      ${Number(selectedPlatform.budget || 0).toLocaleString()} <span className="font-normal text-zinc-400">/day</span>
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
                    <strong className="mt-0.5 block text-xs text-zinc-900 dark:text-zinc-100">{Number(selectedPlatform.targetRoas || 4.0).toFixed(1)}</strong>
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

            {/* RIGHT CARD: 5 STAT TILES + MULTI-LINE CHART */}
            <div className="xl:col-span-8 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
              {/* Top 5 KPI Tiles */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-zinc-100 pb-3.5 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Spend</span>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">${Number(selectedPlatform.spend || 0).toLocaleString()}</div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight size={10} /> 8.4%
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Clicks</span>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{Number(selectedPlatform.clicks || 0).toLocaleString()}</div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight size={10} /> 12.6%
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Conversions</span>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{Number(selectedPlatform.conversions || 0).toLocaleString()}</div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight size={10} /> 18.3%
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Cost / Conv.</span>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">${Number(selectedPlatform.cpa || 0).toFixed(2)}</div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                    <ArrowDownRight size={10} /> 3.2%
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">ROAS</span>
                  <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{Number(selectedPlatform.roas || 0).toFixed(2)}</div>
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
                    <LineChart data={CHART_SERIES} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
        )}
      </div>
    </AppShell>
  );
}
