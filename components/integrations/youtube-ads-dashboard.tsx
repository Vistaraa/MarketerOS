"use client";

import { useEffect, useState } from "react";
import { Eye, Users, Play, Loader2, RefreshCw, AlertCircle, Info, ThumbsUp, MessageCircle } from "lucide-react";
import type { YouTubeChannelPerformance } from "@/lib/youtube/ads-types";

type LoadState =
  | { status: "loading" }
  | { status: "not-connected"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; dashboard: YouTubeChannelPerformance };

const formatNumber = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

export function YouTubeAdsDashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadData = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/v1/youtube-ads/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.data?.dashboard) {
        setState({ status: "ready", dashboard: payload.data.dashboard });
      } else if (payload?.error?.code === "YOUTUBE_ADS_NOT_CONNECTED" || payload?.error?.code === "YOUTUBE_ADS_API_KEY_REQUIRED") {
        setState({ status: "not-connected", message: payload.error.message });
      } else {
        setState({ status: "error", message: payload?.error?.message || "Failed to load YouTube data." });
      }
    } catch {
      setState({ status: "error", message: "Failed to load YouTube data." });
    }
  };

  useEffect(() => { loadData(); }, []);

  if (state.status === "loading") return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      <span className="ml-3 text-sm text-zinc-500">Loading YouTube data...</span>
    </div>
  );

  if (state.status === "not-connected") return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Play className="h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">YouTube isn&apos;t connected</p>
      <p className="mt-1 max-w-sm text-xs text-zinc-500">Connect your YouTube channel with an API key and channel ID to see its views, subscribers and recent videos.</p>
      <a href="/integrations" className="btn-primary mt-4 text-xs">Connect YouTube</a>
    </div>
  );

  if (state.status === "error") return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{state.message}</p>
      <button onClick={loadData} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">Retry</button>
    </div>
  );

  const { dashboard } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{dashboard.channelTitle}</h2>
          <p className="text-xs text-zinc-500">Organic channel performance from the YouTube Data API</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {dashboard.adMetricsAvailable && dashboard.ads ? (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            YouTube ads (Google Ads video campaigns, {dashboard.ads.period.from} to {dashboard.ads.period.to})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Impressions", value: formatNumber(dashboard.ads.summary.impressions) },
              { label: "Views", value: formatNumber(dashboard.ads.summary.views) },
              { label: "Clicks", value: formatNumber(dashboard.ads.summary.clicks) },
              { label: "Spend", value: `$${dashboard.ads.summary.spend.toLocaleString()}` },
              { label: "Cost per view", value: dashboard.ads.summary.cpv == null ? "—" : `$${dashboard.ads.summary.cpv}` }
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                <p className="text-[10px] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
          {dashboard.ads.campaigns.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
                  <tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Impressions</th><th className="px-3 py-2 text-right">Views</th><th className="px-3 py-2 text-right">Clicks</th><th className="px-3 py-2 text-right">Spend</th></tr>
                </thead>
                <tbody>
                  {dashboard.ads.campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.status}</td>
                      <td className="px-3 py-2 text-right">{c.impressions.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{dashboard.ads?.summary.views == null ? "—" : c.views.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{c.clicks.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">${c.spend.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            {dashboard.adMetricsUnavailableReason ||
              "Ad metrics for YouTube video campaigns come from Google Ads, not the YouTube Data API."}{" "}
            The numbers below are your channel&apos;s organic statistics.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total views", value: formatNumber(dashboard.totalViews), icon: <Eye size={16} />, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Subscribers", value: formatNumber(dashboard.subscribers), icon: <Users size={16} />, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
          { label: "Videos", value: formatNumber(dashboard.videoCount), icon: <Play size={16} />, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" }
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className={`inline-flex rounded-lg p-2 ${stat.color}`}>{stat.icon}</div>
            <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
            <p className="text-[10px] text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Recent videos</h3>
        {dashboard.recentVideos.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
            <Play className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-xs text-zinc-500">No videos found on this channel</p>
          </div>
        ) : dashboard.recentVideos.map(video => (
          <div key={video.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex gap-3">
              {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{video.title}</h4>
                {video.publishedAt && (
                  <p className="mt-0.5 text-[10px] text-zinc-500">Published {new Date(video.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-4">
                  <span className="text-[10px] text-zinc-500"><Eye size={10} className="inline mr-0.5" />{formatNumber(video.views)} views</span>
                  <span className="text-[10px] text-zinc-500"><ThumbsUp size={10} className="inline mr-0.5" />{formatNumber(video.likes)} likes</span>
                  <span className="text-[10px] text-zinc-500"><MessageCircle size={10} className="inline mr-0.5" />{formatNumber(video.comments)} comments</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
