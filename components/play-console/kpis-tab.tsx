"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, Check, RefreshCw, Smartphone, Search, Filter, Sparkles, X, CheckSquare, Square, Layers, TrendingUp, AlertTriangle } from "lucide-react";

interface KpiData {
  hasData?: boolean;
  app: { id: string; packageName: string; appTitle: string; category?: string } | null;
  googlePlayTelemetry?: {
    connected: boolean;
    accountName: string | null;
    packageName: string | null;
  };
  googleAdsTelemetry?: {
    connected: boolean;
    accountName: string | null;
    totalSpend: number;
    totalConversions: number;
    totalClicks: number;
  };
  latestDateLabel: string | null;
  rolling28: {
    userAcquisitions?: number | null;
    storeListingVisitors?: number | null;
    storeListingAcquisitions?: number | null;
    storeListingConversionRate?: number | null;
    totalAudienceSize?: number | null;
    audienceGrowthRate?: number | null;
    activeDevices?: number | null;
    totalInstalls?: number | null;
    dailyActiveUsers?: number | null;
    monthlyActiveUsers?: number | null;
    returningUsers?: number | null;
    userEngagementMins?: number | null;
    newUserRetention?: number | null;
    userLoss?: number | null;
    uninstallRate?: number | null;
    acquisitionSource?: string | null;
    cpi?: number | null;
    adSpend?: number | null;
    paidInstalls?: number | null;
    organicInstalls?: number | null;
    roas?: number | null;
    arpu?: number | null;
    crashesAndAnrs?: number | null;
    [key: string]: any;
  };
  latest: {
    userAcquisitions?: number | null;
    storeListingVisitors?: number | null;
    storeListingAcquisitions?: number | null;
    storeListingConversionRate?: number | null;
    totalAudienceSize?: number | null;
    audienceGrowthRate?: number | null;
    activeDevices?: number | null;
    totalInstalls?: number | null;
    dailyActiveUsers?: number | null;
    monthlyActiveUsers?: number | null;
    returningUsers?: number | null;
    userEngagementMins?: number | null;
    newUserRetention?: number | null;
    userLoss?: number | null;
    uninstallRate?: number | null;
    acquisitionSource?: string | null;
    cpi?: number | null;
    adSpend?: number | null;
    paidInstalls?: number | null;
    organicInstalls?: number | null;
    roas?: number | null;
    arpu?: number | null;
    crashesAndAnrs?: number | null;
    [key: string]: any;
  };
  timeSeries: Array<Record<string, any>>;
  userPreferences: {
    pinnedKpis: string[];
    kpiOrder: string[];
  };
}

interface SparklineProps {
  metricKey: string;
  timeSeries: Array<Record<string, any>>;
  getValue: (d: any) => number;
  isWarning?: boolean;
  category?: string;
  latestDateLabel?: string | null;
}

function KpiSparklineChart({ metricKey, timeSeries, getValue, isWarning, category, latestDateLabel }: SparklineProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!timeSeries || timeSeries.length === 0) return null;

  const values = timeSeries.map(getValue);
  if (values.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || (max || 1);

  const width = 500;
  const height = 65;
  const paddingY = 8;
  const chartHeight = height - paddingY * 2;

  const pts = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const normalizedY = (val - min) / range;
    const y = height - paddingY - normalizedY * chartHeight;
    return { x, y, val, label: timeSeries[idx]?.label || "" };
  });

  // Construct smooth cubic Bezier path
  let pathD = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Color selection
  let strokeColor = "#3b82f6"; // Blue default
  if (isWarning) {
    strokeColor = "#f43f5e"; // Rose / Red
  } else if (category === "Engagement") {
    strokeColor = "#8b5cf6"; // Purple
  } else if (category === "Audience" || category === "Acquisition") {
    strokeColor = "#10b981"; // Emerald
  } else if (category === "Marketing") {
    strokeColor = "#06b6d4"; // Cyan
  }

  const formatY = (val: number) => {
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const firstLabel = timeSeries[0]?.label || "Day 1";
  const lastLabel = timeSeries[timeSeries.length - 1]?.label || latestDateLabel || "Today";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
    const idx = Math.round(ratio * (pts.length - 1));
    setHoverIndex(idx);
  };

  const activePoint = hoverIndex !== null ? pts[hoverIndex] : pts[pts.length - 1];

  return (
    <div className="w-full mt-4 space-y-1 select-none">
      <div className="relative w-full h-[70px] group cursor-crosshair">
        {/* Min / Max Labels */}
        <div className="absolute left-0 top-0 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
          {formatY(max)}
        </div>
        <div className="absolute left-0 bottom-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
          {formatY(min)}
        </div>

        {/* Floating Tooltip */}
        {hoverIndex !== null && activePoint && (
          <div
            className="absolute z-20 top-0 transform -translate-x-1/2 -translate-y-8 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-md pointer-events-none whitespace-nowrap transition-all"
            style={{ left: `${(activePoint.x / width) * 100}%` }}
          >
            {activePoint.label}: {activePoint.val.toLocaleString()}
          </div>
        )}

        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`sparkline-grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted Gridlines */}
          <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/80" strokeDasharray="3 3" />
          <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/80" strokeDasharray="3 3" />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#sparkline-grad-${metricKey})`} />

          {/* Smooth Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Vertical Guideline */}
          {hoverIndex !== null && activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={height - paddingY}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Active Point Circle */}
          {activePoint && (
            <>
              <circle cx={activePoint.x} cy={activePoint.y} r="6" fill={strokeColor} opacity="0.3" className="animate-ping" />
              <circle cx={activePoint.x} cy={activePoint.y} r="4" fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </div>

      {/* Axis Date Range Labels */}
      <div className="flex justify-between items-center text-[11px] text-zinc-400 dark:text-zinc-500 font-medium px-0.5">
        <span>{firstLabel}</span>
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">30-day Trend</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}

export function PlayConsoleKpisTab({ data, onRefresh }: { data: KpiData | null; onRefresh: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultPinned = useMemo(() => [
    "user_acquisitions",
    "store_visitors",
    "conversion_rate",
    "total_audience",
    "active_devices",
    "crashes_anrs"
  ], []);

  useEffect(() => {
    if (data?.userPreferences?.pinnedKpis && data.userPreferences.pinnedKpis.length > 0) {
      setPinned(data.userPreferences.pinnedKpis);
    } else {
      setPinned(defaultPinned);
    }
  }, [data, defaultPinned]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading Google Play KPIs...</p>
      </div>
    );
  }

  if (data.hasData === false || !data.app) {
    return <PlayKpisEmptyState data={data} />;
  }

  const { latestDateLabel, rolling28, latest, timeSeries } = data;
  const app = data.app;
  // Metrics the stored data can't support arrive as null and show as "—", never as a misleading 0.
  const fmt = (value: number | null | undefined, unit: "num" | "pct" | "money" = "num", suffix = "") =>
    value == null ? "—" : `${unit === "money" ? "$" : ""}${unit === "pct" ? value : value.toLocaleString()}${unit === "pct" ? "%" : ""}${suffix}`;

  const allMetricsMeta: Record<string, {
    key: string;
    title: string;
    category: "Acquisition" | "Audience" | "Engagement" | "Retention & Loss" | "Marketing" | "Quality";
    description: string;
    rollingVal: string;
    latestVal: string;
    formatSeries: (d: any) => number;
    isWarning?: boolean;
    isText?: boolean;
  }> = {
    // 1. Acquisition
    user_acquisitions: {
      key: "user_acquisitions",
      title: "User acquisitions",
      category: "Acquisition",
      description: "Number of new users who installed the app",
      rollingVal: fmt(rolling28.userAcquisitions),
      latestVal: fmt(latest.userAcquisitions),
      formatSeries: (d) => d.userAcquisitions
    },
    store_visitors: {
      key: "store_visitors",
      title: "Store listing visitors",
      category: "Acquisition",
      description: "Users who visited your Play Store listing without already having the app",
      rollingVal: fmt(rolling28.storeListingVisitors),
      latestVal: fmt(latest.storeListingVisitors),
      formatSeries: (d) => d.storeListingVisitors
    },
    store_acquisitions: {
      key: "store_acquisitions",
      title: "Store listing acquisitions",
      category: "Acquisition",
      description: "Users who installed after visiting your Play Store listing",
      rollingVal: fmt(rolling28.storeListingAcquisitions),
      latestVal: fmt(latest.storeListingAcquisitions),
      formatSeries: (d) => d.storeListingAcquisitions
    },
    conversion_rate: {
      key: "conversion_rate",
      title: "Store listing conversion rate",
      category: "Acquisition",
      description: "Percentage of store visitors who installed the app",
      rollingVal: fmt(rolling28.storeListingConversionRate, "pct"),
      latestVal: fmt(latest.storeListingConversionRate, "pct"),
      formatSeries: (d) => d.storeListingConversionRate
    },

    // 2. Audience
    total_audience: {
      key: "total_audience",
      title: "Total audience size",
      category: "Audience",
      description: "Users who have used/had the app active within the last 30 days",
      rollingVal: fmt(rolling28.totalAudienceSize),
      latestVal: fmt(latest.totalAudienceSize),
      formatSeries: (d) => d.totalAudienceSize
    },
    audience_growth_rate: {
      key: "audience_growth_rate",
      title: "Audience growth rate",
      category: "Audience",
      description: "Percentage change in your audience over time",
      rollingVal: fmt(rolling28.audienceGrowthRate, "pct"),
      latestVal: fmt(latest.audienceGrowthRate, "pct"),
      formatSeries: (d) => d.audienceGrowthRate
    },
    active_devices: {
      key: "active_devices",
      title: "Active devices",
      category: "Audience",
      description: "Number of devices currently active with the app installed",
      rollingVal: fmt(rolling28.activeDevices),
      latestVal: fmt(latest.activeDevices),
      formatSeries: (d) => d.activeDevices
    },
    total_installs: {
      key: "total_installs",
      title: "Total installs",
      category: "Audience",
      description: "Cumulative number of app installations",
      rollingVal: fmt(rolling28.totalInstalls),
      latestVal: fmt(latest.totalInstalls),
      formatSeries: (d) => d.totalInstalls
    },

    // 3. Engagement
    daily_active: {
      key: "daily_active",
      title: "Daily active users (DAU)",
      category: "Engagement",
      description: "Average number of users active each day",
      rollingVal: fmt(rolling28.dailyActiveUsers),
      latestVal: fmt(latest.dailyActiveUsers),
      formatSeries: (d) => d.dailyActiveUsers
    },
    mau: {
      key: "mau",
      title: "Monthly active users (MAU)",
      category: "Engagement",
      description: "Users active at least once within the last 28 days",
      rollingVal: fmt(rolling28.monthlyActiveUsers),
      latestVal: fmt(latest.monthlyActiveUsers),
      formatSeries: (d) => d.monthlyActiveUsers
    },
    returning_users: {
      key: "returning_users",
      title: "Returning users",
      category: "Engagement",
      description: "Existing users who come back and use the app again",
      rollingVal: fmt(rolling28.returningUsers),
      latestVal: fmt(latest.returningUsers),
      formatSeries: (d) => d.returningUsers
    },
    user_engagement: {
      key: "user_engagement",
      title: "User engagement",
      category: "Engagement",
      description: "How frequently and consistently users interact with the app",
      rollingVal: fmt(rolling28.userEngagementMins, "num", " mins / day"),
      latestVal: fmt(latest.userEngagementMins, "num", " mins"),
      formatSeries: (d) => d.userEngagementMins
    },

    // 4. Retention & Loss
    new_user_retention: {
      key: "new_user_retention",
      title: "New user retention",
      category: "Retention & Loss",
      description: "Percentage of newly acquired users who return/use the app",
      rollingVal: fmt(rolling28.newUserRetention, "pct"),
      latestVal: fmt(latest.newUserRetention, "pct"),
      formatSeries: (d) => d.newUserRetention
    },
    user_loss: {
      key: "user_loss",
      title: "User loss",
      category: "Retention & Loss",
      description: "Number of users who uninstalled or stopped using the app",
      rollingVal: fmt(rolling28.userLoss, "num", " / day"),
      latestVal: fmt(latest.userLoss),
      formatSeries: (d) => d.userLoss,
      isWarning: true
    },
    uninstall_rate: {
      key: "uninstall_rate",
      title: "Uninstall rate",
      category: "Retention & Loss",
      description: "Percentage/rate of users who uninstall the app",
      rollingVal: fmt(rolling28.uninstallRate, "pct"),
      latestVal: fmt(latest.uninstallRate, "pct"),
      formatSeries: (d) => d.uninstallRate,
      isWarning: true
    },

    // 5. Marketing & Attribution
    cpi: {
      key: "cpi",
      title: "Cost Per Install (CPI)",
      category: "Marketing",
      description: "Average advertising cost incurred per paid App Campaign installation",
      rollingVal: fmt(rolling28.cpi, "money"),
      latestVal: fmt(latest.cpi, "money"),
      formatSeries: (d) => d.cpi
    },
    ad_spend: {
      key: "ad_spend",
      title: "Google Ads App Campaign Spend",
      category: "Marketing",
      description: "Total advertising budget spent driving Google Play store acquisitions",
      rollingVal: fmt(rolling28.adSpend, "money", " / day"),
      latestVal: fmt(latest.adSpend, "money"),
      formatSeries: (d) => d.adSpend
    },
    paid_installs: {
      key: "paid_installs",
      title: "Paid vs Organic Acquisitions",
      category: "Marketing",
      description: "Ratio of installs acquired via paid Google Ads vs organic search",
      rollingVal: (rolling28.paidInstalls == null || rolling28.organicInstalls == null ? "—" : `${rolling28.paidInstalls} Paid / ${rolling28.organicInstalls} Org`),
      latestVal: (latest.paidInstalls == null || latest.organicInstalls == null ? "—" : `${latest.paidInstalls} Paid / ${latest.organicInstalls} Org`),
      formatSeries: (d) => d.paidInstalls
    },
    roas: {
      key: "roas",
      title: "Return On Ad Spend (ROAS)",
      category: "Marketing",
      description: "Percentage return of gross app revenue generated relative to ad spend",
      rollingVal: fmt(rolling28.roas, "pct"),
      latestVal: fmt(latest.roas, "pct"),
      formatSeries: (d) => d.roas
    },
    arpu: {
      key: "arpu",
      title: "Average Revenue Per User (ARPU)",
      category: "Marketing",
      description: "Gross in-app purchase and subscription revenue generated per active device",
      rollingVal: fmt(rolling28.arpu, "money"),
      latestVal: fmt(latest.arpu, "money"),
      formatSeries: (d) => d.arpu
    },
    acquisition_source: {
      key: "acquisition_source",
      title: "Acquisition source / channel",
      category: "Marketing",
      description: "Top source where users came from (Play Store search, ads, referrals)",
      rollingVal: rolling28.acquisitionSource || "—",
      latestVal: latest.acquisitionSource || "—",
      formatSeries: () => 0,
      isText: true
    },

    // 6. Quality & Stability
    crashes_anrs: {
      key: "crashes_anrs",
      title: "Crashes & ANR rate",
      category: "Quality",
      description: "Technical crash and application not responding rate",
      rollingVal: fmt(rolling28.crashesAndAnrs, "num", " / day"),
      latestVal: fmt(latest.crashesAndAnrs),
      formatSeries: (d) => d.crashesAndAnrs,
      isWarning: true
    }
  };

  const categoriesList = [
    { id: "ALL", name: "All Metrics", count: 21 },
    { id: "Acquisition", name: "Acquisition", count: 4 },
    { id: "Audience", name: "Audience", count: 4 },
    { id: "Engagement", name: "Engagement", count: 4 },
    { id: "Retention & Loss", name: "Retention & Loss", count: 3 },
    { id: "Marketing", name: "Marketing & Ad CPI/ROAS", count: 5 },
    { id: "Quality", name: "Stability & Quality", count: 1 }
  ];

  const handleTogglePinned = (key: string) => {
    if (pinned.includes(key)) {
      if (pinned.length <= 1) return;
      setPinned(pinned.filter((k) => k !== key));
    } else {
      setPinned([...pinned, key]);
    }
  };

  const handleSelectAll = () => {
    setPinned(Object.keys(allMetricsMeta));
  };

  const handleSelectRecommended = () => {
    setPinned(defaultPinned);
  };

  const handleClearAll = () => {
    setPinned([defaultPinned[0]]);
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

  const filteredModalMetrics = Object.values(allMetricsMeta).filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Acquisition":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
      case "Audience":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40";
      case "Engagement":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40";
      case "Retention & Loss":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
      case "Marketing":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40";
      case "Quality":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* App Header & Edit KPIs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug truncate">{app.appTitle}</h2>
              {data.googlePlayTelemetry?.connected ? (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Live Play API Connected</span>
                </span>
              ) : data.googleAdsTelemetry?.connected ? (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Google Ads Telemetry Active</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800/40 shrink-0">
                  Play API Ready
                </span>
              )}

            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">{app.packageName}</p>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors px-3.5 py-2 rounded-xl border border-zinc-200/90 dark:border-zinc-700 shadow-2xs cursor-pointer w-full sm:w-auto shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Edit KPIs</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            {pinned.length} / {Object.keys(allMetricsMeta).length}
          </span>
        </button>
      </div>

      {/* Connection Alert Banner ONLY when NEITHER Google Play NOR Google Ads is linked */}
      {!data.googlePlayTelemetry?.connected && !data.googleAdsTelemetry?.connected && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl p-4 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">No Advertising or Developer Telemetry Connected</p>
              <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">
                Connect your Google Ads account or Google Play Service Account JSON to start tracking live app store listing visitors, acquisitions, and campaign telemetry.
              </p>
            </div>
          </div>
          <a
            href="/integrations"
            className="btn-primary text-xs shrink-0 whitespace-nowrap bg-amber-600 hover:bg-amber-700 border-none text-white font-medium"
          >
            Connect Integration
          </a>
        </div>
      )}

      {/* KPI Cards Feed */}
      <div className="space-y-4">
        {pinned.map((key) => {
          const meta = allMetricsMeta[key];
          if (!meta) return null;

          return (
            <div
              key={key}
              className="bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-200 text-zinc-900 dark:text-zinc-100"
            >
              {/* Card Header with Category Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3 sm:mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meta.title}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{meta.description}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 w-fit ${getCategoryBadgeColor(meta.category)}`}>
                  {meta.category}
                </span>
              </div>

              {/* Values grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 truncate">28 days rolling avg</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{meta.rollingVal}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 truncate">{latestDateLabel}</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{meta.latestVal}</p>
                </div>
              </div>

              {/* Sparkline Chart */}
              {!meta.isText && (
                <KpiSparklineChart
                  metricKey={meta.key}
                  timeSeries={timeSeries}
                  getValue={meta.formatSeries}
                  isWarning={meta.isWarning}
                  category={meta.category}
                  latestDateLabel={latestDateLabel}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Beautifully Arranged Edit Play Console KPIs Modal */}
      {showEditModal && mounted && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/75 dark:bg-black/85 p-3 sm:p-6 backdrop-blur-2xl backdrop-saturate-150 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
                
                {/* 1. Modal Top Bar */}
                <div className="p-4 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-xs">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight">Edit Play Console KPIs</h3>
                      <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Select performance metrics to pin</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shrink-0">
                      {pinned.length} / {Object.keys(allMetricsMeta).length}
                    </span>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Controls Bar: Search & Quick Selection Buttons */}
                <div className="p-3 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search KPIs by name or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium"
                      />
                    </div>

                    {/* Quick Selection Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Select All ({Object.keys(allMetricsMeta).length})
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectRecommended}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Recommended (6)
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1.5 transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedCategory === cat.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                            : "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80"
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          selectedCategory === cat.id
                            ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Metric Items Scrollable Feed */}
                <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1 min-h-[250px]">
                  {filteredModalMetrics.map((item) => {
                    const isSelected = pinned.includes(item.key);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleTogglePinned(item.key)}
                        className={`group w-full flex items-start justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                            : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="pr-3 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs">{item.title}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                              isSelected
                                ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900 border-transparent"
                                : getCategoryBadgeColor(item.category)
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${
                            isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"
                          }`}>
                            {item.description}
                          </p>
                        </div>

                        {/* Checkbox Icon */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white border-transparent shadow-2xs"
                            : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 group-hover:border-zinc-400"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                        </div>
                      </div>
                    );
                  })}

                  {filteredModalMetrics.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400">
                      <Filter className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                      <p className="text-xs font-medium">No Google Play KPIs match your search or filter.</p>
                      <button
                        onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); }}
                        className="mt-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold underline cursor-pointer"
                      >
                        Clear search filters
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Modal Footer Controls */}
                <div className="p-4 sm:px-6 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold truncate">
                      {pinned.length} of 17 KPIs selected
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      disabled={savingPrefs}
                      className="px-5 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {savingPrefs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function PlayKpisEmptyState({ data }: { data: KpiData }) {
  const connected = data.googlePlayTelemetry?.connected;
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-3 bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-8 shadow-2xs">
      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
        <Smartphone className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No app KPIs yet</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {connected
            ? `Google Play is connected${data.googlePlayTelemetry?.packageName ? ` (${data.googlePlayTelemetry.packageName})` : ""}, but importing Play Console metrics isn't available yet, so there's nothing to show.`
            : "Connect your Android app's Google Play Console to see store visitors, acquisitions, audience and stability metrics here."}
        </p>
      </div>
      {!connected && (
        <a href="/play-console" className="btn-primary text-xs">
          Connect Google Play
        </a>
      )}
    </div>
  );
}
