"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, ChevronDown, CircleDollarSign, Filter, MousePointer2, Pause, Play, Plus, RefreshCw, Rocket, Search, ShoppingCart, TrendingUp } from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Campaign } from "@/lib/types";

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
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
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
  const avgRoas = campaigns.length > 0 ? (campaigns.reduce((acc, c) => acc + (c.roas || 0), 0) / campaigns.length).toFixed(2) : "0.00";

  return (
    <AppShell
      title="Campaigns"
      action={
        <button
          onClick={() => router.push("/campaigns/create")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-4 text-xs font-bold text-white shadow hover:bg-[#5a32d6]"
        >
          <Plus size={15} /> Create Campaign
        </button>
      }
    >
      <PageHeading
        title="Campaigns Management"
        description="Monitor performance, manage daily budgets, and control ads across Google and connected platforms."
      />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0eaff] text-[#6940e8]">
            <Rocket size={20} />
          </span>
          <div>
            <div className="text-[11px] font-bold text-[#718098]">Active Campaigns</div>
            <div className="text-xl font-extrabold text-[#111a2e]">{activeCount} <span className="text-xs text-[#718098]">/ {campaigns.length} total</span></div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f2ff] text-[#2384e5]">
            <CircleDollarSign size={20} />
          </span>
          <div>
            <div className="text-[11px] font-bold text-[#718098]">Total Spend</div>
            <div className="text-xl font-extrabold text-[#111a2e]">${totalSpend.toLocaleString()}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e4f8ed] text-[#13a36b]">
            <MousePointer2 size={20} />
          </span>
          <div>
            <div className="text-[11px] font-bold text-[#718098]">Total Clicks</div>
            <div className="text-xl font-extrabold text-[#111a2e]">{totalClicks.toLocaleString()}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0df] text-[#f19a25]">
            <TrendingUp size={20} />
          </span>
          <div>
            <div className="text-[11px] font-bold text-[#718098]">Average ROAS</div>
            <div className="text-xl font-extrabold text-[#111a2e]">{avgRoas}x</div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8592a6]" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-60 rounded-lg border border-[#dfe3eb] pl-9 pr-3 text-xs outline-none focus:border-[#6940e8]"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              {["All", "Active", "Paused", "Draft"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${statusFilter === st
                      ? "bg-[#6940e8] text-white"
                      : "bg-[#f2f4f8] text-[#55637a] hover:bg-[#e7ebf2]"
                    }`}
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
              className="h-9 rounded-lg border border-[#dfe3eb] px-3 text-xs font-semibold outline-none focus:border-[#6940e8]"
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
              className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe3eb] text-[#5d6b82] hover:bg-[#f8f9fc]"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </Card>

      {/* Campaigns Table */}
      <Card flush>
        {error && <div className="p-4 text-xs font-bold text-[#c7323e]">{error}</div>}
        {loading && <div className="p-8 text-center text-xs text-[#728099]">Loading campaigns from database…</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f0eaff] text-[#6940e8]">
              <Rocket size={24} />
            </span>
            <h3 className="mt-4 text-sm font-extrabold text-[#111a2e]">No campaigns found</h3>
            <p className="mt-1 text-xs text-[#718098]">
              {search || statusFilter !== "All" || objectiveFilter !== "All"
                ? "Try clearing your filters to see more results."
                : "Create your first campaign to get started."}
            </p>
            <button
              onClick={() => router.push("/campaigns/create")}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-4 text-xs font-bold text-white shadow"
            >
              <Plus size={14} /> Create Campaign
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#edf0f4] bg-[#fafbfe] text-[11px] font-bold text-[#718099]">
                  <th className="py-3.5 pl-5 pr-3">Campaign</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Objective</th>
                  <th className="px-3 py-3.5">Budget & Spend</th>
                  <th className="px-3 py-3.5">ROAS</th>
                  <th className="px-3 py-3.5">Clicks / Conv.</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f4]">
                {filtered.map((c) => {
                  const spendPct = c.budget ? Math.min(100, Math.round((c.spend / c.budget) * 100)) : 0;
                  const isToggling = togglingId === c.id;

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-[#fafbfe]">
                      <td className="py-4 pl-5 pr-3">
                        <button
                          onClick={() => router.push(`/campaigns/${c.id}`)}
                          className="text-left font-extrabold text-[#111a2e] hover:text-[#6940e8]"
                        >
                          {c.name}
                        </button>
                        <div className="mt-0.5 text-[10px] text-[#7d8ba1]">
                          Started {c.startDate || "Recently"}
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-md bg-[#f2f4f8] px-2 py-0.5 text-[10px] font-semibold text-[#54627a]">
                          {c.objective}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="text-xs font-bold text-[#111a2e]">
                          ${c.spend.toLocaleString()} <span className="text-[10px] font-normal text-[#718098]">/ ${c.budget.toLocaleString()}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#e8ebf2]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#6940e8] to-[#9b7aff]"
                            style={{ width: `${spendPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <span className={`font-mono text-xs font-extrabold ${c.roas >= 3 ? "text-[#148b5a]" : "text-[#2e3b52]"}`}>
                          {c.roas.toFixed(2)}x
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="font-bold text-[#111a2e]">{c.clicks.toLocaleString()} clicks</div>
                        <div className="text-[10px] text-[#718098]">{c.conversions.toLocaleString()} conversions</div>
                      </td>

                      <td className="py-4 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(c)}
                            disabled={isToggling}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition-all ${c.status === "Active"
                                ? "border-[#f1d0d0] bg-white text-[#cf3341] hover:bg-[#fff5f5]"
                                : "border-[#c8ecd9] bg-white text-[#159a65] hover:bg-[#f0faf5]"
                              }`}
                            title={c.status === "Active" ? "Pause campaign" : "Activate campaign"}
                          >
                            {c.status === "Active" ? (
                              <>
                                <Pause size={12} /> Pause
                              </>
                            ) : (
                              <>
                                <Play size={12} /> Run
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
