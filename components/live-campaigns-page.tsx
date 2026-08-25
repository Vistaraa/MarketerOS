"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Filter,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShoppingCart,
  TrendingUp
} from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LiveCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [objectiveFilter, setObjectiveFilter] = useState("All");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/campaigns");
      const json = (await res.json()) as ApiResponse<{ items: Campaign[] }>;
      if (!res.ok) throw new Error(json.error?.message || "Failed to load campaigns");
      setCampaigns(json.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
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
      if (!res.ok) throw new Error("Failed to update status");
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.objective.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesObjective = objectiveFilter === "All" || c.objective.toLowerCase() === objectiveFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesObjective;
  });

  // Calculate high-level KPIs
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "Active").length;
  const avgRoas =
    campaigns.length > 0
      ? (campaigns.reduce((acc, c) => acc + (c.roas || 0), 0) / campaigns.length).toFixed(2)
      : "0.00";

  return (
    <AppShell
      title="Campaigns"
      action={
        <button
          onClick={() => router.push("/campaigns/create")}
          className="btn-primary"
        >
          <Plus size={14} /> Create Campaign
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Campaigns Management"
          description="Monitor performance, manage daily budgets, and control ads across Google and connected platforms."
        />

        {/* KPI Stat Cards (Midday Style) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Campaigns</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeCount}</span>
              <span className="text-xs text-zinc-400">/ {campaigns.length} total</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Ad Spend</span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalSpend.toLocaleString()}</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Clicks</span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalClicks.toLocaleString()}</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average ROAS</span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{avgRoas}x</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
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
                        ? "bg-white text-zinc-900 shadow-2xs font-semibold dark:bg-zinc-800 dark:text-zinc-100"
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

        {/* Campaigns Table */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Platform</th>
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
                      <td colSpan={9} className="px-5 py-4">
                        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-xs text-zinc-400">
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
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={campaign.platform} size={18} />
                          <span className="text-zinc-600 dark:text-zinc-400">{campaign.platform}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{campaign.objective}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                        ${campaign.budget?.toLocaleString() || "0"}/day
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${campaign.spend?.toLocaleString() || "0"}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {campaign.conversions?.toLocaleString() || "0"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {(campaign.roas || 0).toFixed(2)}x
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
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            Details
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
