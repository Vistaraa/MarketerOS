"use client";

import { useState, useEffect } from "react";
import { Sparkles, SlidersHorizontal, Check, RefreshCw, Smartphone, TrendingUp, AlertTriangle, Eye, ArrowUpRight } from "lucide-react";

interface KpiData {
  app: { id: string; packageName: string; appTitle: string; category?: string };
  latestDateLabel: string;
  rolling28: {
    totalAudienceSize: number;
    storeListingVisitors: number;
    storeListingConversionRate: number;
    activeDevices: number;
    crashesAndAnrs: number;
  };
  latest: {
    totalAudienceSize: number;
    storeListingVisitors: number;
    storeListingConversionRate: number;
    activeDevices: number;
    crashesAndAnrs: number;
  };
  timeSeries: Array<{
    date: string;
    label: string;
    totalAudienceSize: number;
    storeListingVisitors: number;
    storeListingConversionRate: number;
    activeDevices: number;
    crashesAndAnrs: number;
  }>;
  userPreferences: {
    pinnedKpis: string[];
    kpiOrder: string[];
  };
}

export function PlayConsoleKpisTab({ data, onRefresh }: { data: KpiData | null; onRefresh: () => void }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (data?.userPreferences?.pinnedKpis) {
      setPinned(data.userPreferences.pinnedKpis);
    } else {
      setPinned(["total_audience", "store_visitors", "conversion_rate", "crashes_anrs", "daily_active"]);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading Google Play KPIs...</p>
      </div>
    );
  }

  const { latestDateLabel, rolling28, latest, timeSeries } = data;

  const allMetricsMeta: Record<string, { title: string; rollingVal: string; latestVal: string; formatSeries: (d: any) => number; suffix?: string; isWarning?: boolean }> = {
    total_audience: {
      title: "Total audience size",
      rollingVal: rolling28.totalAudienceSize.toLocaleString(),
      latestVal: latest.totalAudienceSize.toLocaleString(),
      formatSeries: (d) => d.totalAudienceSize
    },
    store_visitors: {
      title: "Store listing visitors",
      rollingVal: rolling28.storeListingVisitors.toLocaleString(),
      latestVal: latest.storeListingVisitors.toLocaleString(),
      formatSeries: (d) => d.storeListingVisitors
    },
    conversion_rate: {
      title: "Store listing conversion rate",
      rollingVal: `${rolling28.storeListingConversionRate}%`,
      latestVal: `${latest.storeListingConversionRate}%`,
      formatSeries: (d) => d.storeListingConversionRate,
      suffix: "%"
    },
    crashes_anrs: {
      title: "Crashes & ANR rate",
      rollingVal: `${rolling28.crashesAndAnrs} / day`,
      latestVal: `${latest.crashesAndAnrs}`,
      formatSeries: (d) => d.crashesAndAnrs,
      isWarning: true
    },
    daily_active: {
      title: "Active device audience",
      rollingVal: rolling28.activeDevices.toLocaleString(),
      latestVal: latest.activeDevices.toLocaleString(),
      formatSeries: (d) => d.activeDevices
    }
  };

  const handleTogglePinned = (key: string) => {
    if (pinned.includes(key)) {
      if (pinned.length <= 1) return; // Keep at least one
      setPinned(pinned.filter((k) => k !== key));
    } else {
      setPinned([...pinned, key]);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/v1/play-console/kpis/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedKpis: pinned, kpiOrder: pinned })
      });
      setShowEditModal(false);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setSavingPrefs(false);
    }
  };

  // SVG Sparkline Generator
  const renderSparkline = (getValue: (d: any) => number, colorClass: string) => {
    if (!timeSeries || timeSeries.length === 0) return null;
    const values = timeSeries.map(getValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 300;
    const height = 50;

    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    }).join(" ");

    const firstLabel = timeSeries[0]?.label || "Jul 12";
    const lastLabel = timeSeries[timeSeries.length - 1]?.label || latestDateLabel;
    const formatY = (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString());

    return (
      <div className="w-full mt-4">
        <div className="relative w-full h-[60px]">
          {/* Y Axis Grid line labels */}
          <div className="absolute left-0 top-0 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            {formatY(max)}
          </div>
          <div className="absolute left-0 bottom-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            {formatY(min)}
          </div>

          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Horizontal guide line */}
            <line x1="0" y1="1" x2={width} y2="1" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 3" />
            <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 3" />

            <polyline
              fill="none"
              stroke={colorClass}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
        <div className="flex justify-between items-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
          <span>{firstLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* App Header & Edit KPIs Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-2xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{data.app.appTitle}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{data.app.packageName}</p>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Edit KPIs</span>
        </button>
      </div>

      {/* KPI Cards Feed (Matching Image 1 Google Play Console Layout) */}
      <div className="space-y-4">
        {pinned.map((key) => {
          const meta = allMetricsMeta[key];
          if (!meta) return null;

          const strokeColor = meta.isWarning ? "#e11d48" : "currentColor";

          return (
            <div
              key={key}
              className="bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all duration-200 text-zinc-900 dark:text-zinc-100"
            >
              {/* Card Title */}
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{meta.title}</h3>

              {/* 28 days rolling average & Target Date values */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">28 days rolling average</p>
                  <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{meta.rollingVal}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">{latestDateLabel}</p>
                  <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{meta.latestVal}</p>
                </div>
              </div>

              {/* Sparkline Chart */}
              {renderSparkline(meta.formatSeries, strokeColor)}
            </div>
          );
        })}
      </div>

      {/* Edit KPIs Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Edit KPIs</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Select which performance metrics to pin on your feed</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {Object.keys(allMetricsMeta).map((key) => {
                const isSelected = pinned.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTogglePinned(key)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{allMetricsMeta[key].title}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white border-transparent"
                        : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                className="px-5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {savingPrefs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
