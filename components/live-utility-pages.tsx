"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";

type Result = { type: string; name: string; href: string };
type Notice = { id: string; title: string; message: string; read: boolean; link?: string; createdAt?: string };

export function SearchPage() {
  const [query, setQuery] = useState(""); const [items, setItems] = useState<Result[]>([]); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!query.trim()) { setItems([]); return; } const controller = new AbortController(); fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then(async (response) => { const payload = await response.json() as ApiResponse<{ items: Result[] }>; if (!response.ok) throw new Error(payload.error?.message || "Search failed."); return payload.data.items; }).then(setItems).catch((cause: unknown) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Search failed."); }); return () => controller.abort(); }, [query]);
  return <AppShell title="Search"><PageHeading title="Search" description="Search campaigns, leads, clients, and content in your workspace." /><Card><div className="relative"><Search size={15} className="absolute left-3 top-3 text-[#8490a4]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your workspace…" className="h-10 w-full rounded-lg border border-[#dfe3eb] pl-9 pr-3 text-xs outline-none focus:border-[#9d8af5]" /></div>{error && <p className="mt-4 text-xs text-[#b72e38]">{error}</p>}<div className="mt-4 divide-y divide-[#edf0f4]">{items.map((item) => <a href={item.href} className="flex items-center justify-between py-3 text-xs hover:text-[#6940e8]" key={`${item.type}-${item.href}`}><span className="font-bold">{item.name}</span><span className="text-[#8490a4]">{item.type}</span></a>)}{query && !items.length && !error && <p className="py-8 text-center text-xs text-[#7d899e]">No matching records.</p>}</div></Card></AppShell>;
}

export function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]); const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch("/api/v1/notifications").then(async (response) => { const payload = await response.json() as ApiResponse<{ items: Notice[] }>; if (!response.ok) throw new Error(payload.error?.message || "Unable to load notifications."); return payload.data.items; }).then(setItems).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load notifications.")); }, []);
  return <AppShell title="Notifications"><PageHeading title="Notifications" description="Workspace alerts, sync results, and activity updates." /><Card><div className="divide-y divide-[#edf0f4]">{items.map((item) => <a href={item.link || "#"} className="flex gap-3 py-4" key={item.id}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-[#6940e8]"><Bell size={15} /></span><span><span className="block text-xs font-bold">{item.title}</span><span className="mt-1 block text-[11px] text-[#7d899e]">{item.message}</span></span></a>)}{error && <p className="p-8 text-center text-xs text-[#b72e38]">{error}</p>}{!items.length && !error && <p className="p-8 text-center text-xs text-[#7d899e]">No notifications yet.</p>}</div></Card></AppShell>;
}
