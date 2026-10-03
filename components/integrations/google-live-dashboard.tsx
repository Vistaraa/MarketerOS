"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Globe,
  Layers,
  Loader2,
  MousePointerClick,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { PlatformIcon } from "@/components/ui/marketeros-icons";
import { GoogleDynamicModal, GooglePlatformType } from "./google-dynamic-modal";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type ActiveTab = "overview" | "ads" | "analytics" | "search_console" | "admob";

export function GoogleLiveDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Data States
  const [adsData, setAdsData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [searchConsoleData, setSearchConsoleData] = useState<any>(null);
  const [admobData, setAdmobData] = useState<any>(null);

  // Modals
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedConnectPlatform, setSelectedConnectPlatform] = useState<GooglePlatformType>("GOOGLE_ADS");
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);

  // New Campaign Form
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignBudget, setNewCampaignBudget] = useState("50");
  const [newCampaignType, setNewCampaignType] = useState<"SEARCH" | "DISPLAY">("SEARCH");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Load live data from all 4 routes
  const fetchAllData = async () => {
    try {
      const [adsRes, gaRes, gscRes, admobRes] = await Promise.allSettled([
        fetch("/api/google/ads").then((r) => r.json()),
        fetch("/api/google/analytics").then((r) => r.json()),
        fetch("/api/google/search-console").then((r) => r.json()),
        fetch("/api/google/admob").then((r) => r.json())
      ]);

      if (adsRes.status === "fulfilled" && !adsRes.value.error) {
        setAdsData(adsRes.value);
      } else {
        setAdsData(null);
      }

      if (gaRes.status === "fulfilled" && !gaRes.value.error) {
        setAnalyticsData(gaRes.value);
      } else {
        setAnalyticsData(null);
      }

      if (gscRes.status === "fulfilled" && !gscRes.value.error) {
        setSearchConsoleData(gscRes.value);
      } else {
        setSearchConsoleData(null);
      }

      if (admobRes.status === "fulfilled" && !admobRes.value.error) {
        setAdmobData(admobRes.value);
      } else {
        setAdmobData(null);
      }
    } catch (err) {
      console.error("[FETCH_GOOGLE_DATA_ERROR]", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleOpenConnect = (plat: GooglePlatformType) => {
    setSelectedConnectPlatform(plat);
    setConnectModalOpen(true);
  };

  const handleCreateLiveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCampaign(true);
    setCampaignError(null);
    setCampaignSuccess(null);

    try {
      const res = await fetch("/api/google/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaignName,
          dailyBudget: Number(newCampaignBudget),
          channelType: newCampaignType
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCampaignSuccess(json.message || "Campaign created live on Google Ads!");
        setNewCampaignName("");
        fetchAllData();
        setTimeout(() => {
          setCreateCampaignOpen(false);
          setCampaignSuccess(null);
        }, 2000);
      } else {
        setCampaignError(json.error || "Failed to create campaign");
      }
    } catch (err: unknown) {
      setCampaignError(err instanceof Error ? err.message : "Error creating campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const isAnyConnected = !!(adsData?.connected || analyticsData?.connected || searchConsoleData?.connected || admobData?.connected);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Querying live Google APIs directly...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Channel Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950/60 p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Live Google Ecosystem Hub</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              100% BYOK Live Telemetry
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time live synchronization directly into and from your personal Google account.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary py-2 px-3 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Live</span>
          </button>

          {adsData?.connected && (
            <button
              onClick={() => setCreateCampaignOpen(true)}
              className="btn-primary py-2 px-4 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mutate Live Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Channel Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Unified Overview", icon: Layers },
          { id: "ads", label: "Google Ads", icon: DollarSign, connected: !!adsData?.connected },
          { id: "analytics", label: "Google Analytics (GA4)", icon: BarChart3, connected: !!analyticsData?.connected },
          { id: "search_console", label: "Search Console", icon: Search, connected: !!searchConsoleData?.connected },
          { id: "admob", label: "Firebase & AdMob", icon: Smartphone, connected: !!admobData?.connected }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.connected !== undefined && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    tab.connected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: UNIFIED OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Google Ads Card */}
            <div className="midday-card relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Google Ads Spend</span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <PlatformIcon platform="GOOGLE_ADS" className="w-4 h-4" />
                </span>
              </div>
              {adsData?.connected ? (
                <div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    $
                    {(
                      adsData.campaigns?.reduce((acc: number, c: any) => acc + (c.costDollars || 0), 0) || 0
                    ).toFixed(2)}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {adsData.campaigns?.length || 0} active/paused live campaigns
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Not connected</p>
                  <button
                    onClick={() => handleOpenConnect("GOOGLE_ADS")}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Connect Ads <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* GA4 Real-time Card */}
            <div className="midday-card relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">GA4 Real-Time Users</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </div>
              </div>
              {analyticsData?.connected ? (
                <div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {analyticsData.realtime?.activeUsersNow || 0}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Active visitors right now (last 30 min)
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Not connected</p>
                  <button
                    onClick={() => handleOpenConnect("GOOGLE_ANALYTICS")}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Connect GA4 <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* GSC Organic Clicks Card */}
            <div className="midday-card relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Organic Clicks</span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Search className="w-4 h-4" />
                </span>
              </div>
              {searchConsoleData?.connected ? (
                <div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {searchConsoleData.performance?.totalClicks?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {searchConsoleData.performance?.totalImpressions?.toLocaleString() || 0} organic impressions
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Not connected</p>
                  <button
                    onClick={() => handleOpenConnect("GOOGLE_SEARCH_CONSOLE")}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Connect Search Console <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* AdMob Earnings Card */}
            <div className="midday-card relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">AdMob Ad Revenue</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </span>
              </div>
              {admobData?.connected ? (
                <div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    ${(admobData.report?.totalEarningsDollars || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    RPM: ${(admobData.report?.averageRpm || 0).toFixed(2)} / 1k impressions
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Not connected</p>
                  <button
                    onClick={() => handleOpenConnect("FIREBASE_ADMOB")}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Connect AdMob <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* GA4 Traffic Timeline Chart if Connected */}
          {analyticsData?.traffic?.dailyTimeline && (
            <div className="midday-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    GA4 Sessions & Active Visitors (Past 28 Days)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Live property: {analyticsData.propertyId}</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.traffic.dailyTimeline}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sessions" stroke="#6366f1" fillOpacity={1} fill="url(#colorSessions)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GOOGLE ADS */}
      {activeTab === "ads" && (
        <div className="space-y-6">
          {!adsData?.connected ? (
            <div className="midday-card border-dashed text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <PlatformIcon platform="GOOGLE_ADS" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Google Ads Not Connected</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                  Connect your Developer Token, Customer ID, and OAuth credentials to synchronize and mutate campaigns live.
                </p>
              </div>
              <button
                onClick={() => handleOpenConnect("GOOGLE_ADS")}
                className="btn-primary py-2.5 px-5 text-xs"
              >
                Connect Google Ads (BYOK)
              </button>
            </div>
          ) : (
            <div className="midday-card p-0 overflow-hidden">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Live Campaigns ({adsData.campaigns?.length || 0})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Customer ID: {adsData.account?.accountId}</p>
                </div>
                <button
                  onClick={() => setCreateCampaignOpen(true)}
                  className="btn-primary py-2 px-3.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Mutate New Campaign
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Campaign Name</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Channel</th>
                      <th className="px-6 py-3.5">Budget</th>
                      <th className="px-6 py-3.5">Clicks</th>
                      <th className="px-6 py-3.5">Cost</th>
                      <th className="px-6 py-3.5">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {adsData.campaigns?.map((camp: any) => (
                      <tr key={camp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">{camp.name}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              camp.status === "ENABLED" || camp.status === "2"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {camp.status === "2" ? "ENABLED" : camp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{camp.channelType}</td>
                        <td className="px-6 py-4 font-mono">${camp.budgetDollars?.toFixed(2)}/day</td>
                        <td className="px-6 py-4 font-mono">{camp.clicks?.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">${camp.costDollars?.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono">{camp.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GA4 */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {!analyticsData?.connected ? (
            <div className="midday-card border-dashed text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Google Analytics 4 Not Connected</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                  Connect your GA4 Property ID and Service Account JSON to unlock real-time visitors and funnel telemetry.
                </p>
              </div>
              <button
                onClick={() => handleOpenConnect("GOOGLE_ANALYTICS")}
                className="btn-primary py-2.5 px-5 text-xs"
              >
                Connect GA4 (BYOK)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Real-time telemetry card */}
              <div className="midday-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Active Users by Device</h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Now
                  </div>
                </div>
                <div className="space-y-3">
                  {analyticsData.realtime?.devices?.map((dev: any) => (
                    <div key={dev.category} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400 capitalize">{dev.category}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{dev.users} users</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traffic Channels Breakdown */}
              <div className="midday-card space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Traffic Acquisition Channels</h3>
                <div className="space-y-3">
                  {analyticsData.traffic?.channels?.map((ch: any) => (
                    <div key={ch.channel} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">{ch.channel}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{ch.sessions} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SEARCH CONSOLE */}
      {activeTab === "search_console" && (
        <div className="space-y-6">
          {!searchConsoleData?.connected ? (
            <div className="midday-card border-dashed text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Search Console Not Connected</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                  Connect your verified Site URL and Service Account to track organic Google search rankings.
                </p>
              </div>
              <button
                onClick={() => handleOpenConnect("GOOGLE_SEARCH_CONSOLE")}
                className="btn-primary py-2.5 px-5 text-xs"
              >
                Connect Search Console (BYOK)
              </button>
            </div>
          ) : (
            <div className="midday-card p-0 overflow-hidden">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Top Ranking Search Queries</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Site: {searchConsoleData.siteUrl}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Query Keyword</th>
                      <th className="px-6 py-3.5">Clicks</th>
                      <th className="px-6 py-3.5">Impressions</th>
                      <th className="px-6 py-3.5">CTR</th>
                      <th className="px-6 py-3.5">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {searchConsoleData.performance?.topQueries?.map((q: any) => (
                      <tr key={q.query} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">{q.query}</td>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{q.clicks}</td>
                        <td className="px-6 py-4 font-mono">{q.impressions}</td>
                        <td className="px-6 py-4 font-mono">{q.ctr}%</td>
                        <td className="px-6 py-4 font-mono font-semibold">#{q.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMOB */}
      {activeTab === "admob" && (
        <div className="space-y-6">
          {!admobData?.connected ? (
            <div className="midday-card border-dashed text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">AdMob & Firebase Not Connected</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                  Connect your Publisher ID (pub-...) and credentials to monitor live mobile app ad revenue and RPM.
                </p>
              </div>
              <button
                onClick={() => handleOpenConnect("FIREBASE_ADMOB")}
                className="btn-primary py-2.5 px-5 text-xs"
              >
                Connect AdMob (BYOK)
              </button>
            </div>
          ) : (
            <div className="midday-card space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Publisher Mobile Apps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {admobData.report?.apps?.map((app: any) => (
                  <div key={app.appId} className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{app.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{app.appId}</p>
                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {app.platform} - {app.approvalState}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC CONNECT MODAL */}
      <GoogleDynamicModal
        open={connectModalOpen}
        platform={selectedConnectPlatform}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => {
          setConnectModalOpen(false);
          fetchAllData();
        }}
      />

      {/* CREATE LIVE CAMPAIGN MODAL (MUTATES DIRECTLY TO USER GOOGLE ADS ACCOUNT) */}
      {createCampaignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create Live Google Ads Campaign</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Direct mutation into your connected Google Ads account ({adsData?.account?.accountId})
                </p>
              </div>
              <button
                onClick={() => setCreateCampaignOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateLiveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g. Summer Search Promo"
                  className="input-clean font-normal text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300 mb-1">
                  Daily Budget (USD)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={newCampaignBudget}
                  onChange={(e) => setNewCampaignBudget(e.target.value)}
                  className="input-clean font-normal text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-700 dark:text-zinc-300 mb-1">
                  Campaign Channel Type
                </label>
                <select
                  value={newCampaignType}
                  onChange={(e) => setNewCampaignType(e.target.value as "SEARCH" | "DISPLAY")}
                  className="input-clean font-normal text-sm"
                >
                  <option value="SEARCH">Google Search Network</option>
                  <option value="DISPLAY">Google Display Network</option>
                </select>
              </div>

              {campaignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{campaignSuccess}</span>
                </div>
              )}

              {campaignError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{campaignError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateCampaignOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCampaign}
                  className="btn-primary py-2.5 px-5 text-xs"
                >
                  {creatingCampaign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Mutate into Google Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BYOK Connect Modal */}
      <GoogleDynamicModal
        open={connectModalOpen}
        platform={selectedConnectPlatform}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => {
          setConnectModalOpen(false);
          fetchAllData();
        }}
      />
    </div>
  );
}
