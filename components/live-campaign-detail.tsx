"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  Edit3,
  Pause,
  Play,
  Rocket,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign, ChartPoint } from "@/lib/types";
import { cn, money } from "@/lib/utils";
import { TrendChart } from "@/components/marketeros-charts";
import { PlatformIcon } from "@/components/marketeros-icons";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";

type CampaignResponse = {
  campaign: Campaign;
  detail?: {
    externalData?: {
      selectedPlatforms?: string[];
      integrationIds?: string[];
      landingPage?: string;
      headline?: string;
      description?: string;
      cta?: string;
      targetCountry?: string;
    } | null;
    biddingStrategy?: string | null;
    dailyBudget?: number | null;
    targetRoas?: number | null;
    createdAt?: string;
    metrics?: Array<{ date: string; spend: unknown; clicks: number; conversions: number; roas: unknown }>;
  };
};

export function LiveCampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Selected Platform row for bottom breakdown
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("Daily");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<CampaignResponse>;
        if (!response.ok) throw new Error(payload.error?.message || "Campaign not found.");
        return payload.data;
      })
      .then((resData) => {
        setData(resData);
        if (resData?.campaign) {
          const detail = resData.detail || {};
          const externalPlatforms = (detail.externalData as { selectedPlatforms?: string[] })?.selectedPlatforms;
          const initialPlatforms =
            externalPlatforms && externalPlatforms.length > 0 ? externalPlatforms : [resData.campaign.platform];
          setSelectedPlatform(initialPlatforms[0] || "Google Ads");
        }
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Unable to load campaign.");
        }
      });
    return () => controller.abort();
  }, [campaignId]);

  if (error) {
    return (
      <AppShell title="Campaigns">
        <Card className="border-[#f2c4c8] text-xs text-[#b72e38]">{error}</Card>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Campaigns">
        <Card>
          <PageHeading title="Loading campaign…" description="Loading campaign details from database." />
        </Card>
      </AppShell>
    );
  }

  const { campaign } = data;
  const detail = data.detail || {};
  const externalData = detail.externalData || {};
  const externalPlatforms = externalData.selectedPlatforms;
  const targetPlatforms: string[] =
    externalPlatforms && externalPlatforms.length > 0 ? externalPlatforms : [campaign.platform];

  // Dynamic series from real database metrics
  const chartSeries: ChartPoint[] = (detail.metrics || []).map((m) => ({
    date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    spend: Number(m.spend || 0),
    clicks: Number(m.clicks || 0),
    conversions: Number(m.conversions || 0),
    roas: Number(m.roas || 0)
  }));

  const handleToggleStatus = async () => {
    const nextStatus = campaign.status === "Active" ? "PAUSED" : "ACTIVE";
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        setData({
          ...data,
          campaign: { ...campaign, status: nextStatus === "ACTIVE" ? "Active" : "Paused" }
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/campaigns/${campaign.id}`, { method: "DELETE" });
      if (response.ok) router.push("/campaigns");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Campaign Details"
      action={
        <button
          onClick={() => router.push("/campaigns/create")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6940e8] px-3.5 text-xs font-bold text-white shadow hover:bg-[#5a32d6]"
        >
          <Rocket size={14} /> Create Similar
        </button>
      }
    >
      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-2 text-xs text-[#718098]">
        <button onClick={() => router.push("/campaigns")} className="hover:text-[#6940e8]">
          Campaigns
        </button>
        <ChevronRight size={13} />
        <span>{campaign.name}</span>
      </div>

      {/* Main Campaign Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              campaign.status === "Active" ? "bg-[#159a65]" : "bg-[#f29924]"
            }`}
          />
          <h1 className="text-[26px] font-extrabold tracking-[-.05em] text-[#10192d]">{campaign.name}</h1>
          <StatusBadge status={campaign.status} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3ea] bg-white px-4 text-xs font-bold text-[#34415b] shadow-sm hover:bg-[#f8f9fc]"
          >
            {campaign.status === "Active" ? (
              <>
                <Pause size={14} className="text-[#e29323]" /> Pause Campaign
              </>
            ) : (
              <>
                <Play size={14} className="text-[#14a369]" /> Run Campaign
              </>
            )}
          </button>

          <button
            onClick={handleArchive}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#f2c4c8] bg-white px-3.5 text-xs font-bold text-[#b72e38] hover:bg-[#fff8f8]"
          >
            Archive
          </button>
        </div>
      </div>

      {/* ================= PLATFORMS TABLE FOR THIS CAMPAIGN ================= */}
      <Card flush className="mt-5">
        <div className="border-b border-[#edf0f4] px-5 py-4">
          <h2 className="text-sm font-extrabold text-[#111a2e]">Connected Platforms ({targetPlatforms.length})</h2>
          <p className="mt-0.5 text-xs text-[#718098]">Select a platform to view its live statistics and performance breakdown underneath.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#edf0f4] bg-[#fafbfe] text-[11px] font-bold text-[#718099]">
                <th className="py-3.5 pl-5 pr-3">Platform</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-3 py-3.5">Budget</th>
                <th className="px-3 py-3.5">Spend</th>
                <th className="px-3 py-3.5">Clicks</th>
                <th className="px-3 py-3.5">Conversions</th>
                <th className="px-3 py-3.5">ROAS ↕</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {targetPlatforms.map((plat) => {
                const isSelected = selectedPlatform === plat;

                return (
                  <tr
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#f5f2ff] ring-1 ring-inset ring-[#6940e8]/30"
                        : "hover:bg-[#fafbfe]"
                    }`}
                  >
                    <td className="py-4 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platform={plat} size={28} />
                        <div>
                          <div className="font-extrabold text-[#111a2e]">{plat}</div>
                          <div className="text-[10px] text-[#718098]">
                            {isSelected ? "● Selected Platform" : "Click to view stats"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={campaign.status} />
                    </td>

                    <td className="px-3 py-4 font-semibold text-[#27344d]">
                      ${campaign.budget ? campaign.budget.toLocaleString() : "0"}{" "}
                      <span className="text-[10px] font-normal text-[#718098]">/day</span>
                    </td>

                    <td className="px-3 py-4 font-semibold text-[#27344d]">
                      ${(campaign.spend || 0).toLocaleString()}
                    </td>

                    <td className="px-3 py-4 font-semibold text-[#27344d]">
                      {(campaign.clicks || 0).toLocaleString()}
                    </td>

                    <td className="px-3 py-4 font-semibold text-[#27344d]">
                      {(campaign.conversions || 0).toLocaleString()}
                    </td>

                    <td className="px-3 py-4">
                      <span className="font-mono text-xs font-bold text-[#148b5a]">
                        {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : "0.00x"}
                      </span>
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[#738096]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlatform(plat);
                          }}
                          className={`grid h-7 w-7 place-items-center rounded-lg ${
                            isSelected ? "bg-[#6940e8] text-white" : "hover:bg-[#eef1f6]"
                          }`}
                          title="View Statistics"
                        >
                          <BarChart3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/integrations");
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg hover:bg-[#eef1f6]"
                          title="Integration Settings"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ================= UNDERNEATH: SELECTED PLATFORM DATA & STATS ================= */}
      {selectedPlatform && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          {/* Left Card: Platform Attributes */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={selectedPlatform} size={36} />
              <div>
                <h2 className="text-base font-extrabold text-[#111a2e]">
                  {selectedPlatform} {campaign.objective || "Campaign"}
                </h2>
                <div className="text-xs text-[#718098]">{campaign.objective || "Standard"} Campaign · Connected</div>
              </div>
            </div>

            {/* 4x2 Detail Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#edf0f4] pt-5 text-xs sm:grid-cols-4">
              <div>
                <span className="text-[10px] text-[#7d899e]">Budget</span>
                <strong className="mt-1 block text-[#111a2e]">
                  ${campaign.budget ? campaign.budget.toLocaleString() : "0"} /day
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Start Date</span>
                <strong className="mt-1 block text-[#111a2e]">
                  {campaign.startDate && campaign.startDate !== "Not started"
                    ? campaign.startDate
                    : "Not started"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">End Date</span>
                <strong className="mt-1 block text-[#111a2e]">Ongoing</strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Objective</span>
                <strong className="mt-1 block text-[#111a2e]">{campaign.objective || "Sales"}</strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Target ROAS</span>
                <strong className="mt-1 block text-[#111a2e]">
                  {detail.targetRoas ? `${detail.targetRoas}x` : campaign.roas > 0 ? `${campaign.roas.toFixed(1)}x` : "Not set"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Bidding Strategy</span>
                <strong className="mt-1 block text-[#111a2e]">
                  {detail.biddingStrategy || "Maximize Conversions"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Location</span>
                <strong className="mt-1 block text-[#111a2e]">{externalData.targetCountry || "All Regions"}</strong>
              </div>

              <div>
                <span className="text-[10px] text-[#7d899e]">Devices</span>
                <strong className="mt-1 block text-[#111a2e]">All Devices</strong>
              </div>
            </div>

            {/* Campaign Description */}
            <div className="mt-6 border-t border-[#edf0f4] pt-5">
              <span className="text-xs font-bold text-[#111a2e]">Campaign Description</span>
              <p className="mt-1 text-xs leading-5 text-[#6c788f]">
                {externalData.description || externalData.headline || "No campaign description has been provided."}
              </p>
            </div>
          </Card>

          {/* Right Card: Platform-Specific Statistics & Trend Chart */}
          <Card className="p-5 sm:p-6">
            {/* Top 5 Dynamic KPI Metrics */}
            <div className="grid grid-cols-2 gap-3 border-b border-[#edf0f4] pb-4 sm:grid-cols-5">
              <div>
                <span className="text-[11px] text-[#718098]">Spend</span>
                <div className="mt-1 text-base font-extrabold text-[#111a2e]">
                  ${(campaign.spend || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#718098]">Clicks</span>
                <div className="mt-1 text-base font-extrabold text-[#111a2e]">
                  {(campaign.clicks || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#718098]">Conversions</span>
                <div className="mt-1 text-base font-extrabold text-[#111a2e]">
                  {(campaign.conversions || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#718098]">Cost / Conv.</span>
                <div className="mt-1 text-base font-extrabold text-[#111a2e]">
                  {campaign.cpa > 0 ? money(campaign.cpa) : "$0.00"}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#718098]">ROAS</span>
                <div className="mt-1 text-base font-extrabold text-[#111a2e]">
                  {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : "0.00x"}
                </div>
              </div>
            </div>

            {/* Performance Over Time Chart */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111a2e]">
                    Performance Over Time
                  </span>
                  <span className="rounded bg-[#f0eaff] px-2 py-0.5 text-[10px] font-bold text-[#6940e8]">
                    {selectedPlatform}
                  </span>
                </div>

                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="h-7 rounded border border-[#dfe3eb] bg-white px-2 text-[11px] font-semibold text-[#55637a] outline-none"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <div className="mt-3">
                {chartSeries.length > 0 ? (
                  <TrendChart data={chartSeries} />
                ) : (
                  <div className="grid h-48 place-items-center rounded-xl border border-dashed border-[#dfe3eb] text-center text-xs text-[#718098]">
                    <div>
                      <BarChart3 size={28} className="mx-auto text-[#b0bac9]" />
                      <p className="mt-2 font-medium">No live performance metrics synced yet for {selectedPlatform}.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
