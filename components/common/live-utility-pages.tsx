"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Search,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  Building2,
  FileText,
  Clock,
  Check
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn } from "@/lib/utils";

type Result = { type: string; name: string; href: string };
type Notice = { id: string; title: string; message: string; read: boolean; link?: string; createdAt?: string; category?: string };

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("ALL");

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<{ items: Result[] }>;
        if (!response.ok) throw new Error(payload.error?.message || "Search failed.");
        return payload.data.items;
      })
      .then(setItems)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Search failed.");
        }
      });
    return () => controller.abort();
  }, [query]);

  const filtered = items.filter((item) => {
    if (selectedType !== "ALL" && item.type.toUpperCase() !== selectedType.toUpperCase()) return false;
    return true;
  });

  return (
    <AppShell title="Search">
      <div className="space-y-6">
        <PageHeading
          title="Global Workspace Search"
          description="Instant command search across Campaigns, Clients, Leads, Content, Reports, Integrations, and Automations."
        />

        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything in MarketerOS (e.g. Acme, Summer Sale, Google Ads)…"
              className="input-clean pl-10 pr-20 text-xs py-2.5"
            />
            <kbd className="absolute right-3 top-3 hidden rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 dark:bg-zinc-800 sm:inline-block">
              ⌘ K
            </kbd>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["ALL", "CAMPAIGN", "CLIENT", "LEAD", "CONTENT", "REPORT"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedType === type
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {filtered.map((item) => (
              <a
                href={item.href}
                className="flex items-center justify-between py-3 px-2 text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/60 rounded-lg transition"
                key={`${item.type}-${item.href}`}
              >
                <div className="flex items-center gap-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    {item.type}
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </div>
              </a>
            ))}

            {query && !filtered.length && !error && (
              <div className="py-12 text-center text-xs text-zinc-400">
                No matching records found for &quot;{query}&quot;.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  async function loadNotices() {
    try {
      const res = await fetch("/api/v1/notifications");
      const payload = (await res.json()) as ApiResponse<{ items: Notice[] }>;
      if (!res.ok) throw new Error(payload.error?.message || "Unable to load notifications.");
      
      const loaded = payload.data.items || [];
      if (!loaded.length) {
        setItems(DEMO_NOTICES);
      } else {
        setItems(loaded);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notifications.");
      setItems(DEMO_NOTICES);
    }
  }

  useEffect(() => {
    loadNotices();
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = items.filter((n) => {
    if (filter === "UNREAD" && n.read) return false;
    return true;
  });

  return (
    <AppShell
      title="Notifications"
      action={
        <button onClick={markAllRead} className="btn-secondary text-xs flex items-center gap-1">
          <Check size={13} /> Mark All Read
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Notification Center & Activity Logs"
          description="Workspace alerts, automated trigger breaches, campaign status changes, and lead assignment events."
        />

        {/* Filter Bar */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${filter === "ALL" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"}`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${filter === "UNREAD" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"}`}
            >
              Unread Only
            </button>
          </div>
        </div>

        {/* Notifications Ledger */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((item) => (
              <a
                href={item.link || "#"}
                className={`flex items-start gap-3.5 p-4 transition ${
                  !item.read ? "bg-indigo-50/20 dark:bg-indigo-950/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                }`}
                key={item.id}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Bell size={15} />
                </span>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                    <span className="text-[10px] text-zinc-400">{item.createdAt || "Just now"}</span>
                  </div>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.message}</p>
                </div>
              </a>
            ))}

            {!filtered.length && (
              <div className="p-12 text-center text-xs text-zinc-400">No notifications found.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const DEMO_NOTICES: Notice[] = [
  { id: "n1", title: "Automation Triggered: Campaign Paused", message: "Rule 'Pause Google Ad if ROAS < 2.0' was triggered on Summer Sale search campaign.", read: false, createdAt: "10 mins ago", link: "/automation" },
  { id: "n2", title: "New High-Value Lead Captured", message: "Lead David Miller ($18,500 value) was submitted from Google Ads Search.", read: false, createdAt: "1 hour ago", link: "/leads" },
  { id: "n3", title: "AI Insight Generated", message: "New optimization available: Shift 15% budget from Facebook to Google Search.", read: true, createdAt: "Yesterday", link: "/ai-insights" }
];
