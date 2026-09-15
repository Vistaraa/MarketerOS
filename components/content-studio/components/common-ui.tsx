"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Sparkles,
  X,
  AlertTriangle,
  Grid,
  List,
  Info,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  LinkedinIcon,
  TiktokIcon,
  TwitterXIcon
} from "../content-studio-dashboard";
import { Platform, ContentStatus } from "../types/content-studio-types";
import { useContentStudio } from "../context/content-studio-context";

// 1. PLATFORM BADGE & ICON
export function PlatformIcon({ platform, className = "w-4 h-4" }: { platform: Platform; className?: string }) {
  switch (platform) {
    case "instagram":
      return <InstagramIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "linkedin":
      return <LinkedinIcon className={className} />;
    case "tiktok":
      return <TiktokIcon className={className} />;
    case "twitter":
      return <TwitterXIcon className={className} />;
    default:
      return <InstagramIcon className={className} />;
  }
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  const styles: Record<Platform, string> = {
    instagram: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-900",
    facebook: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900",
    linkedin: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900",
    tiktok: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
    twitter: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
  };

  const labels: Record<Platform, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
    twitter: "X (Twitter)"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${styles[platform]}`}>
      <PlatformIcon platform={platform} className="w-3 h-3" />
      <span>{labels[platform]}</span>
    </span>
  );
}

// 2. STATUS BADGE (Matching MarketerOS Shell)
export function StatusBadge({ status }: { status: ContentStatus | string }) {
  let badgeStyle = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  let dotStyle = "bg-zinc-400";

  if (status === "Published" || status === "Active" || status === "Connected") {
    badgeStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    dotStyle = "bg-emerald-500";
  } else if (status === "Scheduled") {
    badgeStyle = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";
    dotStyle = "bg-purple-500";
  } else if (status === "Draft" || status === "In Review" || status === "Needs Reconnect") {
    badgeStyle = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    dotStyle = "bg-amber-500";
  } else if (status === "Archived" || status === "Disconnected") {
    badgeStyle = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
    dotStyle = "bg-zinc-400";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight ${badgeStyle}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
      <span>{status}</span>
    </span>
  );
}

// 3. KPI CARD (Aligned with Midday Card Style)
export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
        {trend && (
          <span
            className={`text-[10px] font-bold ${
              trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && <div className="mt-0.5 text-[10px] text-zinc-400">{subtitle}</div>}
    </div>
  );
}

// 4. SEARCH BAR (Matching input-clean)
export function SearchBar({
  value,
  onChange,
  placeholder = "Search..."
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-8 py-1.5 text-xs text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// 5. VIEW TOGGLE (Grid / List)
export function ViewToggle({
  mode,
  onChange
}: {
  mode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800 text-xs font-medium">
      <button
        onClick={() => onChange("grid")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
          mode === "grid"
            ? "bg-white font-bold text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
        }`}
        title="Grid View"
      >
        <Grid size={13} />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onChange("list")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
          mode === "list"
            ? "bg-white font-bold text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
        }`}
        title="List View"
      >
        <List size={13} />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

// 6. EMPTY STATE
export function EmptyState({
  title = "No Content Found",
  description = "No items match your current filter criteria.",
  icon: Icon = Info,
  actionLabel,
  onAction
}: {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 btn-primary"
        >
          <Plus size={14} />
          <span>{actionLabel.replace(/^\+\s*/, "")}</span>
        </button>
      )}
    </div>
  );
}

// 7. LOADING SKELETON
export function LoadingSkeleton({ type = "card", count = 4 }: { type?: "card" | "table"; count?: number }) {
  if (type === "table") {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex h-12 animate-pulse items-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="h-40 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// 8. TOAST CONTAINER
export function ToastContainer() {
  const { toasts, removeToast } = useContentStudio();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {toast.type === "success" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === "error" && <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />}
          {toast.type === "info" && <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">{toast.title}</div>
            {toast.description && <div className="text-[11px] text-zinc-500 mt-0.5">{toast.description}</div>}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// 9. COMMON HEADER BAR FOR CONTENT STUDIO SUB-PAGES
export function SubPageHeader({
  title,
  subtitle,
  primaryActionLabel = "Create Content",
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction
}: {
  title: string;
  subtitle: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const { activeTab, setActiveTab, openEditorWithPrefill } = useContentStudio();

  const tabs: { label: string; slug: string }[] = [
    { label: "Content Calendar", slug: "/content-studio/calendar" },
    { label: "Content Library", slug: "/content-studio/library" },
    { label: "Templates", slug: "/content-studio/templates" },
    { label: "Media Library", slug: "/content-studio/media" },
    { label: "Hashtags", slug: "/content-studio/hashtags" },
    { label: "Settings", slug: "/content-studio/settings" }
  ];

  const handleTabClick = (tabLabel: string, slug: string) => {
    setActiveTab(tabLabel);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", slug);
    }
  };

  const cleanPrimaryLabel = primaryActionLabel.replace(/^\+\s*/, "");

  return (
    <div className="space-y-4">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">{title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Notifications */}
          <button className="relative grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <Bell size={14} />
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              3
            </span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 pl-2 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-6 w-6 overflow-hidden rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              RM
            </div>
            <div className="hidden sm:block text-left pr-1">
              <div className="text-[11px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">Rohan Mehta</div>
              <div className="text-[9px] text-zinc-400 leading-tight">Agency Admin</div>
            </div>
          </div>

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="btn-secondary"
            >
              <span>{secondaryActionLabel.replace(/^\+\s*/, "")}</span>
            </button>
          )}

          {primaryActionLabel && (
            <button
              onClick={onPrimaryAction || (() => openEditorWithPrefill({}))}
              className="btn-primary"
            >
              <Plus size={14} />
              <span>{cleanPrimaryLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.label, tab.slug)}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === tab.label
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
