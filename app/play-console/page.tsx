"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeading } from "@/components/ui/marketeros-shell";
import { PlayConsoleKpisTab } from "@/components/play-console/kpis-tab";
import { PlayConsoleReleasesTab } from "@/components/play-console/releases-tab";
import { PlayConsoleInboxTab } from "@/components/play-console/inbox-tab";
import { GooglePlayConnectModal } from "@/components/integrations/google-play-connect-modal";
import { RefreshCw, Smartphone, Layers, Inbox, LineChart, KeyRound, ArrowLeft, Building2 } from "lucide-react";

export default function PlayConsolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"kpis" | "releases" | "inbox">("kpis");

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  const [kpiData, setKpiData] = useState<any>(null);
  const [releasesData, setReleasesData] = useState<any>(null);
  const [inboxData, setInboxData] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/v1/clients");
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.items || data.clients || [];
          setClients(items);
        }
      } catch {
        // optional
      }
    }
    loadClients();
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const clientQuery = selectedClientId ? `?clientId=${selectedClientId}` : "";
      const [kRes, rRes, iRes] = await Promise.all([
        fetch(`/api/v1/play-console/kpis${clientQuery}`),
        fetch(`/api/v1/play-console/releases${clientQuery}`),
        fetch(`/api/v1/play-console/inbox${clientQuery}`)
      ]);

      if (kRes.ok) setKpiData(await kRes.json());
      if (rRes.ok) setReleasesData(await rRes.json());
      if (iRes.ok) setInboxData(await iRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSyncLive = async () => {
    setSyncing(true);
    try {
      const clientQuery = selectedClientId ? `?clientId=${selectedClientId}` : "";
      await fetch(`/api/v1/play-console/sync${clientQuery}`, { method: "POST" });
      await fetchAllData();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/integrations");
    }
  };

  return (
    <AppShell title="Google Play Console">
      <div className="space-y-6">
        {/* Navigation Breadcrumb Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
            <Smartphone className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span>BYOK Direct API</span>
          </div>
        </div>

        {/* Page Heading matching MarketerOS Design System */}
        <PageHeading
          title="Google Play Console"
          description="Live Android app KPIs, 28-day rolling averages, production releases & developer inbox."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Agency Client Selector */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="">All Agency Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowConnectModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                <span>BYOK Keys</span>
              </button>

              <button
                onClick={handleSyncLive}
                disabled={syncing}
                className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Syncing..." : "Sync Live"}</span>
              </button>
            </div>
          }
        />

        {/* Console Navigation Tab Switcher matching MarketerOS Aesthetics */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={() => setActiveTab("kpis")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "kpis"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>KPIs</span>
            </button>

            <button
              onClick={() => setActiveTab("releases")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "releases"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Releases</span>
            </button>

            <button
              onClick={() => setActiveTab("inbox")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === "inbox"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
              {inboxData?.unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-6 ring-2 ring-white dark:ring-zinc-900" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
              <p className="text-sm font-medium">Fetching Google Play Console data...</p>
            </div>
          ) : (
            <>
              {activeTab === "kpis" && <PlayConsoleKpisTab data={kpiData} onRefresh={fetchAllData} />}
              {activeTab === "releases" && <PlayConsoleReleasesTab data={releasesData} />}
              {activeTab === "inbox" && <PlayConsoleInboxTab data={inboxData} onRefresh={fetchAllData} />}
            </>
          )}
        </div>

        {/* BYOK Connect Modal */}
        <GooglePlayConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onSuccess={fetchAllData}
          initialData={{
            packageName: kpiData?.app?.packageName,
            accountName: kpiData?.app?.appTitle,
            clientId: selectedClientId
          }}
        />
      </div>
    </AppShell>
  );
}

