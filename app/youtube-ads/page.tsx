"use client";

import { YouTubeAdsDashboard } from "@/components/integrations/youtube-ads-dashboard";
import { AppShell } from "@/components/ui/marketeros-shell";

export default function YouTubeAdsPage() {
  return (
    <AppShell title="YouTube Ads">
      <div className="p-6">
        <YouTubeAdsDashboard />
      </div>
    </AppShell>
  );
}
