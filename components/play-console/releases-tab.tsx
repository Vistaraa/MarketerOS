"use client";

import { useState } from "react";
import { CheckCircle2, MinusCircle, RefreshCw, Smartphone, Watch, Tv, Layers, ArrowUpRight, Play, Pause, Check } from "lucide-react";

interface ReleaseItem {
  id: string;
  track: string;
  versionCode: number;
  versionName: string;
  rolloutPercentage: number;
  status: "IN_PROGRESS" | "HALTED" | "COMPLETED" | "DRAFT";
  targetDevices: string[];
  notes?: string;
  timeAgo: string;
}

interface ReleasesData {
  app: { id: string; packageName: string; appTitle: string };
  tracks: {
    production: ReleaseItem[];
    openTesting: ReleaseItem[];
    closedTesting: ReleaseItem[];
    internalTesting: ReleaseItem[];
  };
  allReleases: ReleaseItem[];
}

export function PlayConsoleReleasesTab({ data, onRefresh }: { data: ReleasesData | null; onRefresh?: () => void }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading release tracks...</p>
      </div>
    );
  }

  const handleUpdateRollout = async (releaseId: string, nextRollout: number, nextStatus?: string) => {
    setUpdatingId(releaseId);
    try {
      const res = await fetch("/api/v1/play-console/releases/rollout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId,
          rolloutPercentage: nextRollout,
          status: nextStatus
        })
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const renderDeviceBadge = (device: string) => {
    let icon = <Smartphone className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />;
    if (device.toLowerCase().includes("wear")) {
      icon = <Watch className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />;
    } else if (device.toLowerCase().includes("tv")) {
      icon = <Tv className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />;
    }

    return (
      <div key={device} className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-medium text-zinc-900 dark:text-zinc-100">
        {icon}
        <span>{device}</span>
      </div>
    );
  };

  const renderStatusBadge = (item: ReleaseItem) => {
    const isUpdating = updatingId === item.id;

    if (item.status === "IN_PROGRESS") {
      return (
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 mt-1 sm:mt-0">
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-zinc-900 dark:text-white shrink-0">
            <span>{item.rolloutPercentage}% Staged</span>
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 animate-spin" />
          </div>
          
          <div className="flex items-center gap-1 flex-wrap shrink-0">
            <button
              onClick={() => handleUpdateRollout(item.id, Math.min(100, item.rolloutPercentage + 25))}
              disabled={isUpdating}
              className="px-2 py-0.5 text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 rounded-md cursor-pointer transition"
            >
              +25% Rollout
            </button>
            <button
              onClick={() => handleUpdateRollout(item.id, 100, "COMPLETED")}
              disabled={isUpdating}
              className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md cursor-pointer transition flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              100%
            </button>
            <button
              onClick={() => handleUpdateRollout(item.id, item.rolloutPercentage, "HALTED")}
              disabled={isUpdating}
              className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 rounded-md cursor-pointer transition flex items-center gap-0.5"
            >
              <Pause className="w-2.5 h-2.5" />
              Halt
            </button>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono shrink-0">{item.timeAgo}</span>
        </div>
      );
    }

    if (item.status === "HALTED") {
      return (
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 mt-1 sm:mt-0">
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 shrink-0">
            <span>Halted ({item.rolloutPercentage}%)</span>
            <MinusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleUpdateRollout(item.id, item.rolloutPercentage, "IN_PROGRESS")}
              disabled={isUpdating}
              className="px-2 py-0.5 text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 rounded-md cursor-pointer transition flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5" /> Resume Staged
            </button>
            <span className="text-[10px] text-zinc-400 font-mono shrink-0">{item.timeAgo}</span>
          </div>
        </div>
      );
    }

    // COMPLETED
    return (
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 mt-1 sm:mt-0">
        <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white shrink-0">
          <span>100% Complete</span>
          <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500 shrink-0" />
        </div>
        <span className="text-[10px] text-zinc-400 font-mono shrink-0">{item.timeAgo}</span>
      </div>
    );
  };

  const renderTrackGroup = (title: string, releases: ReleaseItem[]) => {
    if (releases.length === 0) return null;

    // Group items by target device group
    const deviceGroups: Record<string, ReleaseItem[]> = {};
    releases.forEach((r) => {
      const devKey = r.targetDevices.join(", ");
      if (!deviceGroups[devKey]) deviceGroups[devKey] = [];
      deviceGroups[devKey].push(r);
    });

    return (
      <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Track Title */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{title} Track</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {releases.length} Build{releases.length > 1 ? "s" : ""}
            </span>
          </h3>
        </div>

        {Object.entries(deviceGroups).map(([devLabel, items]) => (
          <div key={devLabel} className="space-y-3 pt-1">
            {/* Device Pill Header */}
            <div className="flex items-center">
              {renderDeviceBadge(devLabel)}
            </div>

            {/* Release Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 first:pt-1 last:pb-0">
                  <div className="space-y-1.5 w-full sm:max-w-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                        v{item.versionName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        (Code: {item.versionCode})
                      </span>
                    </div>

                    {/* Rollout Progress Bar */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.status === "HALTED"
                            ? "bg-rose-500"
                            : item.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-zinc-900 dark:bg-zinc-100"
                        }`}
                        style={{ width: `${item.rolloutPercentage}%` }}
                      />
                    </div>

                    {item.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{item.notes}</p>
                    )}
                  </div>

                  <div className="w-full sm:w-auto">
                    {renderStatusBadge(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Live Track Releases & Staged Rollouts</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage production releases, staged rollout percentages (25% → 50% → 100%), and beta tracks</p>
        </div>
        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0 w-fit">
          <Layers className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        </div>
      </div>

      {/* Production Track */}
      {renderTrackGroup("Production", data.tracks.production)}

      {/* Open Testing Track */}
      {renderTrackGroup("Open testing", data.tracks.openTesting)}

      {/* Closed Testing Track */}
      {renderTrackGroup("Closed testing", data.tracks.closedTesting)}

      {/* Internal Testing Track */}
      {renderTrackGroup("Internal testing", data.tracks.internalTesting)}
    </div>
  );
}
