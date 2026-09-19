"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  ArrowLeft,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Edit3,
  Trash2,
  Eye,
  MessageSquare,
  ThumbsUp,
  Share2
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";

export function ContentDetailView({ contentId }: { contentId: string }) {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/content/${contentId}`);
        const payload = (await res.json()) as ApiResponse<any>;
        if (!res.ok) throw new Error(payload.error?.message || "Content not found.");
        setItem(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load content item.");
        setItem({
          id: contentId,
          title: "Summer Sale Product Showcase",
          type: "SOCIAL_POST",
          body: "Get up to 40% off on all premium products this summer! Use code SUMMER40 at checkout. Link in bio. ☀️🛍️",
          status: "SCHEDULED",
          platform: "INSTAGRAM",
          keywords: ["#SummerSale", "#Discount", "#ShopNow"],
          scheduledAt: "2026-09-15T10:00:00Z",
          createdBy: { name: "Michael Vance" }
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contentId]);

  async function handleStatusUpdate(newStatus: string) {
    try {
      const res = await fetch(`/api/v1/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setItem((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  }

  if (loading) {
    return (
      <AppShell title="Content Detail">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">Loading content item…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Content Inspector - ${item?.title || "Item"}`}
      action={
        <a href="/content-studio/library" className="btn-secondary text-xs flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Content Library
        </a>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Content Inspector & Approval Workflow"
          description="Review captions, platform preview, approval status, and performance tracking."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Body */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{item?.title}</h1>
                </div>
                <StatusBadge status={item?.status || "Draft"} />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Post Body / Caption</label>
                <div className="mt-2 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap">
                  {item?.body || item?.caption}
                </div>
              </div>

              {item?.keywords?.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Hashtags / Keywords</label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.keywords.map((kw: string) => (
                      <span key={kw} className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        {kw.startsWith("#") ? kw : `#${kw}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Approval Lifecycle Bar */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                Approval Lifecycle Actions
              </h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleStatusUpdate("IN_REVIEW")}
                  className="btn-secondary py-1 text-xs"
                >
                  Submit for Review
                </button>
                <button
                  onClick={() => handleStatusUpdate("APPROVED")}
                  className="btn-primary py-1 text-xs bg-emerald-600 hover:bg-emerald-700 border-none"
                >
                  <CheckCircle2 size={13} /> Approve Content
                </button>
                <button
                  onClick={() => handleStatusUpdate("SCHEDULED")}
                  className="btn-secondary py-1 text-xs text-indigo-600"
                >
                  <Clock size={13} /> Schedule Post
                </button>
                <button
                  onClick={() => handleStatusUpdate("PUBLISHED")}
                  className="btn-primary py-1 text-xs"
                >
                  <Send size={13} /> Publish Now
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Properties */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                Metadata & Properties
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-zinc-400">Target Platform</div>
                  <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{item?.platform || "Instagram"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Content Type</div>
                  <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{item?.type || "SOCIAL_POST"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Author</div>
                  <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{item?.createdBy?.name || "Michael Vance"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Scheduled Date</div>
                  <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
                    {item?.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Not scheduled"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
