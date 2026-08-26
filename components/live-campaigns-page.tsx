"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-01",
    name: "Summer Sale 2024",
    platform: "Google Ads",
    status: "Active",
    budget: 5000,
    spend: 5420,
    clicks: 32145,
    conversions: 832,
    roas: 3.82,
    ctr: 2.58,
    cpa: 6.51,
    objective: "Sales",
    startDate: "May 01, 2024"
  },
  {
    id: "camp-02",
    name: "Retargeting Catalog Ads",
    platform: "Meta Ads",
    status: "Active",
    budget: 4000,
    spend: 4230,
    clicks: 28945,
    conversions: 721,
    roas: 4.15,
    ctr: 3.12,
    cpa: 5.86,
    objective: "Conversions",
    startDate: "May 01, 2024"
  },
  {
    id: "camp-03",
    name: "Instagram Engagement Viral",
    platform: "Instagram",
    status: "Active",
    budget: 3000,
    spend: 3250,
    clicks: 18562,
    conversions: 512,
    roas: 2.91,
    ctr: 4.25,
    cpa: 6.34,
    objective: "Engagement",
    startDate: "May 05, 2024"
  },
  {
    id: "camp-04",
    name: "B2B Lead Generation - Q2",
    platform: "LinkedIn",
    status: "Active",
    budget: 2500,
    spend: 2450,
    clicks: 15623,
    conversions: 312,
    roas: 2.08,
    ctr: 1.85,
    cpa: 7.85,
    objective: "Leads",
    startDate: "May 08, 2024"
  },
  {
    id: "camp-05",
    name: "New Product Search & Display",
    platform: "Google Ads",
    status: "Paused",
    budget: 3500,
    spend: 2980,
    clicks: 16245,
    conversions: 492,
    roas: 3.12,
    ctr: 2.15,
    cpa: 6.05,
    objective: "Awareness",
    startDate: "May 01, 2024"
  }
];

export function LiveCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEFAULT_CAMPAIGNS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [objectiveFilter, setObjectiveFilter] = useState("All");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/campaigns");
      const payload = await res.json();
      if (res.ok && payload?.data) {
        if (Array.isArray(payload.data)) {
          setCampaigns(payload.data.length > 0 ? payload.data : DEFAULT_CAMPAIGNS);
        } else if (Array.isArray(payload.data.items)) {
          setCampaigns(payload.data.items.length > 0 ? payload.data.items : DEFAULT_CAMPAIGNS);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleToggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === "Active" ? "PAUSED" : "ACTIVE";
    setTogglingId(campaign.id);
    try {
      const res = await fetch(`/api/v1/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setCampaigns((prev) =>
          (Array.isArray(prev) ? prev : DEFAULT_CAMPAIGNS).map((c) =>
            c.id === campaign.id
              ? { ...c, status: nextStatus === "ACTIVE" ? "Active" : "Paused" }
              : c
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const list = Array.isArray(campaigns) ? campaigns : DEFAULT_CAMPAIGNS;

  // Filter campaigns
  const filtered = list.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.objective || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesObjective = objectiveFilter === "All" || c.objective === objectiveFilter;
    return matchesSearch && matchesStatus && matchesObjective;
  });

  // Calculate high-level KPIs
  const totalSpend = list.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
  const totalClicks = list.reduce((acc, c) => acc + (Number(c.clicks) || 0), 0);
  const totalConversions = list.reduce((acc, c) => acc + (Number(c.conversions) || 0), 0);
  const activeCount = list.filter((c) => c.status === "Active").length;
  const avgRoas =
    list.length > 0
      ? (list.reduce((acc, c) => acc + (Number(c.roas) || 0), 0) / list.length).toFixed(2)
      : "0.00";

  return (
    <AppShell
      title="Campaigns"
      action={
        <button
          onClick={() => router.push("/campaigns/create")}
          className="btn-primary"
        >
          <Plus size={13} /> Create Campaign
        </button>
      }
    >
      <div className="space-y-5">
        <PageHeading
          title="Campaigns Management"
          description="Monitor performance, manage daily budgets, and control ads across all connected platforms."
        />

        {/* KPI Stat Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Campaigns</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{activeCount}</span>
              <span className="text-xs text-zinc-400">/ {list.length} total</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Ad Spend</span>
            <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">${totalSpend.toLocaleString()}</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Clicks</span>
            <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalClicks.toLocaleString()}</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average ROAS</span>
            <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{avgRoas}x</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                {["All", "Active", "Paused", "Draft"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition",
                      statusFilter === st
                        ? "bg-white text-zinc-900 shadow-sm font-semibold dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={objectiveFilter}
                onChange={(e) => setObjectiveFilter(e.target.value)}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="All">All Objectives</option>
                <option value="Sales">Sales</option>
                <option value="Leads">Leads</option>
                <option value="Traffic">Traffic</option>
                <option value="Awareness">Awareness</option>
                <option value="Engagement">Engagement</option>
                <option value="App Installs">App Installs</option>
              </select>

              <button
                onClick={fetchCampaigns}
                className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Campaigns Table (No Platform Column) */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Objective</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Daily Budget</th>
                  <th className="px-4 py-3">Spend</th>
                  <th className="px-4 py-3">Conversions</th>
                  <th className="px-4 py-3">ROAS</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-xs text-zinc-400">
                      No campaigns match your filters.{" "}
                      <button
                        onClick={() => router.push("/campaigns/create")}
                        className="font-semibold text-zinc-900 underline dark:text-zinc-100"
                      >
                        Create a campaign
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((campaign) => (
                    <tr
                      key={campaign.id}
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</div>
                        <div className="text-[10px] text-zinc-400">ID: {campaign.id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{campaign.objective}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                        ${Number(campaign.budget || 0).toLocaleString()}/day
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${Number(campaign.spend || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {Number(campaign.conversions || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {Number(campaign.roas || 0).toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(campaign)}
                            disabled={togglingId === campaign.id}
                            title={campaign.status === "Active" ? "Pause Campaign" : "Resume Campaign"}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            {campaign.status === "Active" ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          <button
                            onClick={() => router.push(`/campaigns/${campaign.id}`)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
