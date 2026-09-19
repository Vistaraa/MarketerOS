"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, MousePointerClick, TrendingUp, DollarSign, Target, Users, Play, Loader2, RefreshCw, AlertCircle, CheckCircle2, Youtube } from "lucide-react";

interface YouTubeAdsDashboardData {
  totalSpend: number;
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  averageCPV: number;
  averageCPM: number;
  averageCTR: number;
  averageViewRate: number;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    budget: number;
    impressions: number;
    views: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    viewRate: number;
  }>;
  recentAds: Array<{
    id: string;
    name: string;
    videoTitle: string;
    thumbnailUrl: string;
    headline: string;
    impressions: number;
    views: number;
    clicks: number;
    spend: number;
    viewRate: number;
  }>;
}

interface YouTubeAdsMetricsData {
  date: string;
  impressions: number;
  views: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export function YouTubeAdsDashboard() {
  const [dashboard, setDashboard] = useState<YouTubeAdsDashboardData | null>(null);
  const [metrics, setMetrics] = useState<YouTubeAdsMetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "ads" | "metrics">("overview");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, metricsRes] = await Promise.all([
        fetch("/api/v1/youtube-ads/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/v1/youtube-ads/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      ]);
      if (dashRes.ok) { const data = await dashRes.json(); setDashboard(data.dashboard); }
      if (metricsRes.ok) { const data = await metricsRes.json(); setMetrics(data.metrics); }
    } catch { setError("Failed to load YouTube Ads data"); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      <span className="ml-3 text-sm text-zinc-500">Loading YouTube Ads...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
      <button onClick={loadData} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">Retry</button>
    </div>
  );

  if (!dashboard) return null;

  const formatNumber = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">YouTube Ads Dashboard</h2>
          <p className="text-xs text-zinc-500">Video ad campaigns, impressions, views, and conversions</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
        {(["overview", "campaigns", "ads", "metrics"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === tab ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total Views", value: formatNumber(dashboard.totalViews), icon: <Eye size={16} />, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
              { label: "Impressions", value: formatNumber(dashboard.totalImpressions), icon: <BarChart3 size={16} />, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
              { label: "Clicks", value: formatNumber(dashboard.totalClicks), icon: <MousePointerClick size={16} />, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
              { label: "Conversions", value: formatNumber(dashboard.totalConversions), icon: <Target size={16} />, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" }
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className={`inline-flex rounded-lg p-2 ${stat.color}`}>{stat.icon}</div>
                <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                <p className="text-[10px] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Avg CTR", value: `${dashboard.averageCTR.toFixed(1)}%` },
              { label: "Avg View Rate", value: `${dashboard.averageViewRate.toFixed(1)}%` },
              { label: "Avg CPV", value: dashboard.averageCPV > 0 ? `₹${dashboard.averageCPV.toFixed(2)}` : "N/A" },
              { label: "Avg CPM", value: dashboard.averageCPM > 0 ? `₹${dashboard.averageCPM.toFixed(2)}` : "N/A" }
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Views Trend */}
          {metrics.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Views Trend (Last 30 Days)</h3>
              <div className="flex items-end gap-px" style={{ height: 80 }}>
                {metrics.slice(-30).map((m, i) => {
                  const maxViews = Math.max(...metrics.map(x => x.views));
                  const height = maxViews > 0 ? (m.views / maxViews) * 100 : 0;
                  return <div key={i} className="flex-1 rounded-t bg-red-400 dark:bg-red-600" style={{ height: `${height}%` }} title={`${m.date}: ${m.views} views`} />;
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
                <span>{metrics[0]?.date}</span>
                <span>{metrics[metrics.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-3">
          {dashboard.campaigns.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
              <Youtube className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-xs text-zinc-500">No campaigns found</p>
            </div>
          ) : dashboard.campaigns.map(campaign => (
            <div key={campaign.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{campaign.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${campaign.status === "ENABLED" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                      <CheckCircle2 size={10} /> {campaign.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[
                  { label: "Views", value: formatNumber(campaign.views) },
                  { label: "Impressions", value: formatNumber(campaign.impressions) },
                  { label: "Clicks", value: formatNumber(campaign.clicks) },
                  { label: "CTR", value: `${campaign.ctr.toFixed(1)}%` }
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[10px] text-zinc-500">{s.label}</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === "ads" && (
        <div className="space-y-3">
          {dashboard.recentAds.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
              <Play className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-xs text-zinc-500">No video ads found</p>
            </div>
          ) : dashboard.recentAds.map(ad => (
            <div key={ad.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="flex gap-3">
                {ad.thumbnailUrl && <img src={ad.thumbnailUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />}
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ad.videoTitle}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{ad.headline}</p>
                  <div className="mt-2 flex gap-4">
                    <span className="text-[10px] text-zinc-500"><Eye size={10} className="inline mr-0.5" />{formatNumber(ad.views)} views</span>
                    <span className="text-[10px] text-zinc-500"><MousePointerClick size={10} className="inline mr-0.5" />{formatNumber(ad.clicks)} clicks</span>
                    <span className="text-[10px] text-zinc-500"><TrendingUp size={10} className="inline mr-0.5" />{ad.viewRate.toFixed(1)}% view rate</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Views</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Impressions</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Clicks</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metrics.slice(-14).reverse().map(m => (
                  <tr key={m.date}>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{m.date}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{formatNumber(m.views)}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{formatNumber(m.impressions)}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{formatNumber(m.clicks)}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{formatNumber(m.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
