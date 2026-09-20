"use client";

import { CheckCircle2, MinusCircle, RefreshCw, Smartphone, Watch, Tv, HelpCircle, Layers } from "lucide-react";

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

export function PlayConsoleReleasesTab({ data }: { data: ReleasesData | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading release tracks...</p>
      </div>
    );
  }

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
    if (item.status === "IN_PROGRESS") {
      return (
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-white">
            <span>{item.rolloutPercentage}%</span>
            <RefreshCw className="w-4 h-4 text-zinc-700 dark:text-zinc-300 animate-spin" />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{item.timeAgo}</span>
        </div>
      );
    }

    if (item.status === "HALTED") {
      return (
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-white">
            <span>Halted</span>
            <MinusCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{item.timeAgo}</span>
        </div>
      );
    }

    // COMPLETED
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-white">
          <span>100%</span>
          <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
        </div>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{item.timeAgo}</span>
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
      <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-4">
        {/* Track Title */}
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>

        {Object.entries(deviceGroups).map(([devLabel, items]) => (
          <div key={devLabel} className="space-y-3 pt-1">
            {/* Device Pill Header */}
            <div className="flex items-center">
              {renderDeviceBadge(devLabel)}
            </div>

            {/* Release Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between first:pt-1 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                      {item.versionName}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{item.notes}</p>
                    )}
                  </div>
                  <div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Releases</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Track build versions across production, open, and closed testing tracks</p>
        </div>
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
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
