"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Bell,
  List,
  Grid,
  Search,
  X,
  Sparkles,
  Check,
  ArrowUpRight,
  Share2,
  Clock,
  Heart
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { SubPageHeader, PlatformIcon, PlatformBadge, StatusBadge } from "../components/common-ui";
import { Platform } from "../types/content-studio-types";

export function CalendarPage() {
  const {
    contentItems,
    selectedContentItem,
    setSelectedContentItem,
    openEditorWithPrefill,
    duplicateContentItem,
    deleteContentItem
  } = useContentStudio();

  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("all");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const activeSelectedPost = selectedContentItem || contentItems[0];

  const filteredPosts = contentItems.filter((post) => {
    if (selectedPlatformFilter === "all") return true;
    return post.platform === selectedPlatformFilter;
  });

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Content Studio Calendar"
        subtitle="Plan, schedule, and orchestrate omnichannel social campaigns."
        primaryActionLabel="+ Create Content"
        onPrimaryAction={() => openEditorWithPrefill({})}
      />

      {/* Studio Canvas (Calendar Grid + Right Inspector) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT: CALENDAR CANVAS (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            {/* Month Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100">
                <span>May 2024</span>
                <ChevronRight size={14} className="rotate-90 text-zinc-400" />
              </div>
              <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronRight size={16} />
              </button>
              <button className="ml-2 rounded-lg border border-zinc-200 px-2.5 py-1 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300">
                Today
              </button>
            </div>

            {/* Filter by Platform */}
            <div className="relative text-xs">
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
                  selectedPlatformFilter !== "all"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                }`}
              >
                <Filter size={13} />
                <span>Filters</span>
                {selectedPlatformFilter !== "all" && (
                  <span className="rounded-full bg-zinc-700 px-1.5 text-[9px] font-bold text-white uppercase dark:bg-zinc-300 dark:text-zinc-900">
                    {selectedPlatformFilter}
                  </span>
                )}
              </button>

              {showFilterPopover && (
                <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase">
                    Filter Platform
                  </div>
                  {["all", "instagram", "facebook", "linkedin", "tiktok", "twitter"].map((plat) => (
                    <button
                      key={plat}
                      onClick={() => {
                        setSelectedPlatformFilter(plat);
                        setShowFilterPopover(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-xs font-semibold capitalize hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span>{plat === "all" ? "All Platforms" : plat}</span>
                      {selectedPlatformFilter === plat && <Check size={13} className="text-zinc-900 dark:text-zinc-100" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800 text-xs font-medium">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === "calendar" ? "bg-white text-zinc-900 shadow-2xs font-semibold dark:bg-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                }`}
              >
                <CalendarIcon size={13} />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === "list" ? "bg-white text-zinc-900 shadow-2xs font-semibold dark:bg-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Calendar Grid Mode */}
          {viewMode === "calendar" ? (
            <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
              <div className="grid grid-cols-7 border-b border-zinc-200/80 bg-zinc-50/50 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {/* Previous Month Ghost Days */}
                {[28, 29, 30].map((gDay) => (
                  <div key={`ghost-${gDay}`} className="min-h-[110px] p-1.5 bg-zinc-50/30 dark:bg-zinc-950/30">
                    <span className="text-[11px] text-zinc-300 dark:text-zinc-700">{gDay}</span>
                  </div>
                ))}

                {/* May 1 - 31 */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                  const dayPosts = filteredPosts.filter((p) => p.day === dayNum);
                  const isToday = dayNum === 15;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      className={`min-h-[110px] p-1.5 transition-colors relative flex flex-col justify-between ${
                        isToday ? "bg-zinc-100/50 dark:bg-zinc-900/50" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[11px] font-semibold rounded-full h-5 w-5 flex items-center justify-center ${
                              isToday ? "bg-zinc-900 text-white font-bold dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {dayPosts.map((post) => {
                            const isSelected = activeSelectedPost?.id === post.id;
                            let bgClass = "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/50 dark:text-purple-200";
                            if (post.platform === "instagram") bgClass = "bg-pink-50 text-pink-900 border-pink-200 dark:bg-pink-950/50 dark:text-pink-200";
                            if (post.platform === "linkedin") bgClass = "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200";
                            if (post.platform === "facebook") bgClass = "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200";
                            if (post.platform === "tiktok" || post.platform === "twitter") bgClass = "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100";

                            return (
                              <div
                                key={post.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContentItem(post);
                                }}
                                className={`group rounded-md border p-1.5 text-[10px] cursor-pointer transition shadow-2xs hover:shadow-xs ${bgClass} ${
                                  isSelected ? "ring-2 ring-zinc-900 font-bold dark:ring-zinc-100" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <PlatformIcon platform={post.platform} className="w-3 h-3 shrink-0" />
                                    <span className="truncate font-semibold leading-tight">{post.title}</span>
                                  </div>
                                </div>
                                <div className="text-[9px] opacity-75 font-mono">{post.time || "10:00 AM"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {dayPosts.length === 0 && (
                        <button
                          onClick={() => openEditorWithPrefill({ day: dayNum })}
                          className="mt-2 w-full py-1 rounded border border-dashed border-zinc-200 text-[10px] text-zinc-400 font-medium hover:border-zinc-400 hover:text-zinc-900 transition flex items-center justify-center gap-0.5 opacity-0 hover:opacity-100 dark:border-zinc-800 dark:hover:text-zinc-100"
                        >
                          <Plus size={10} /> Create
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List Mode */
            <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedContentItem(post)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                    activeSelectedPost?.id === post.id ? "bg-zinc-100/70 dark:bg-zinc-900/80" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <PlatformIcon platform={post.platform} className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{post.title}</h4>
                      <p className="text-zinc-400 text-[11px] line-clamp-1">{post.caption}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      May {post.day || 1}, 2024 · {post.time || "10:00 AM"}
                    </span>
                    <div className="mt-0.5">
                      <StatusBadge status={post.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: INSPECTOR SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Post Details Inspector */}
          {activeSelectedPost && (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800 text-xs">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Post Inspector</h3>
                <button
                  onClick={() => openEditorWithPrefill(activeSelectedPost)}
                  className="btn-secondary py-1 text-[11px]"
                >
                  <Edit size={12} /> Edit
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={activeSelectedPost.platform} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{activeSelectedPost.title}</span>
                </div>
                <StatusBadge status={activeSelectedPost.status} />
              </div>

              <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 leading-relaxed dark:bg-zinc-900/60 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
                &quot;{activeSelectedPost.caption}&quot;
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-2xs dark:border-zinc-800">
                <img
                  src={activeSelectedPost.mediaUrls?.[0] || "/summer-sale-banner.png"}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-2.5 dark:border-zinc-800 dark:bg-zinc-900/50 text-xs">
                <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} className="text-zinc-500" /> Engagement Prediction
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                    <div className="text-[9px] uppercase text-zinc-400">Reach</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{activeSelectedPost.performance?.reach || "14.2K"}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                    <div className="text-[9px] uppercase text-zinc-400">Engagement</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{activeSelectedPost.performance?.engagementRate || "4.8%"}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                    <div className="text-[9px] uppercase text-zinc-400">Clicks</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{activeSelectedPost.performance?.clicks || "520"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
