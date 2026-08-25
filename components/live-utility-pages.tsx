"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn } from "@/lib/utils";

type Result = { type: string; name: string; href: string };
type Notice = { id: string; title: string; message: string; read: boolean; link?: string; createdAt?: string };

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppShell title="Search">
      <div className="space-y-6">
        <PageHeading
          title="Workspace Search"
          description="Search campaigns, leads, clients, and platform integrations."
        />

        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your workspace…"
              className="input-clean pl-9"
            />
          </div>

          {error && <p className="mt-4 text-xs text-rose-600">{error}</p>}

          <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <a
                href={item.href}
                className="flex items-center justify-between py-3 text-xs text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                key={`${item.type}-${item.href}`}
              >
                <span className="font-semibold">{item.name}</span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono">{item.type}</span>
              </a>
            ))}
            {query && !items.length && !error && (
              <p className="py-8 text-center text-xs text-zinc-400">No matching records found.</p>
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

  useEffect(() => {
    fetch("/api/v1/notifications")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<{ items: Notice[] }>;
        if (!response.ok) throw new Error(payload.error?.message || "Unable to load notifications.");
        return payload.data.items;
      })
      .then(setItems)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load notifications."));
  }, []);

  return (
    <AppShell title="Notifications">
      <div className="space-y-6">
        <PageHeading
          title="Notifications & Activity"
          description="Workspace alerts, API sync statuses, and ad trigger events."
        />

        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <a
                href={item.link || "#"}
                className="flex items-start gap-3 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                key={item.id}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <Bell size={14} />
                </span>
                <div>
                  <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{item.message}</span>
                </div>
              </a>
            ))}
            {error && <p className="p-8 text-center text-xs text-rose-600">{error}</p>}
            {!items.length && !error && (
              <p className="p-8 text-center text-xs text-zinc-400">No new notifications.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
