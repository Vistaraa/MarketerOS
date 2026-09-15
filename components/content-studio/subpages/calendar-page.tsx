"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Edit,
  List,
  Check,
  Clock,
  ExternalLink,
  Trash2,
  Copy
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { SubPageHeader, PlatformIcon, PlatformBadge, StatusBadge } from "../components/common-ui";
import { Platform } from "../types/content-studio-types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarPage() {
  const {
    contentItems,
    selectedContentItem,
    setSelectedContentItem,
    openEditorWithPrefill,
    duplicateContentItem,
    deleteContentItem
  } = useContentStudio();

  // Dynamic Date Engine state
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("all");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const activeSelectedPost = selectedContentItem || contentItems[0] || null;

  // Calendar Math
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon, etc.
  }, [currentYear, currentMonth]);

  const prevMonthDays = useMemo(() => {
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
    const ghostCount = firstDayOfWeek;
    const days: number[] = [];
    for (let i = ghostCount - 1; i >= 0; i--) {
      days.push(daysInPrev - i);
    }
    return days;
  }, [currentYear, currentMonth, firstDayOfWeek]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const filteredPosts = useMemo(() => {
    return contentItems.filter((post) => {
      if (selectedPlatformFilter === "all") return true;
      return post.platform === selectedPlatformFilter;
    });
  }, [contentItems, selectedPlatformFilter]);

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Content Studio Calendar"
        subtitle="Plan, schedule, and orchestrate omnichannel social campaigns across connected platforms."
        primaryActionLabel="+ Create Content"
        onPrimaryAction={() => openEditorWithPrefill({
          year: currentYear,
          month: currentMonth + 1,
          day: today.getDate()
        })}
      />

      {/* Studio Canvas (Calendar Grid + Right Inspector) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT: CALENDAR CANVAS (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            {/* Dynamic Month Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
              </div>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={handleToday}
                className="ml-2 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition"
              >
                Today
              </button>
            </div>

            {/* Filter by Platform */}
            <div className="flex items-center gap-2">
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
                  <span>Platform</span>
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
                    {["all", "instagram", "facebook", "linkedin", "tiktok", "twitter", "youtube"].map((plat) => (
                      <button
                        key={plat}
                        onClick={() => {
                          setSelectedPlatformFilter(plat);
                          setShowFilterPopover(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-1.5">
                          {plat !== "all" && <PlatformIcon platform={plat as any} className="w-3.5 h-3.5" />}
                          <span>{plat === "all" ? "All Platforms" : plat === "twitter" ? "X (Twitter)" : plat}</span>
                        </div>
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
                {prevMonthDays.map((gDay) => (
                  <div key={`ghost-${gDay}`} className="min-h-[110px] p-1.5 bg-zinc-50/30 dark:bg-zinc-950/30">
                    <span className="text-[11px] text-zinc-300 dark:text-zinc-700">{gDay}</span>
                  </div>
                ))}

                {/* Current Month Days */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const dayPosts = filteredPosts.filter((p) => {
                    if (p.year && p.month && p.day) {
                      return p.year === currentYear && p.month === currentMonth + 1 && p.day === dayNum;
                    }
                    if (p.scheduledAt) {
                      const d = new Date(p.scheduledAt);
                      if (!isNaN(d.getTime())) {
                        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === dayNum;
                      }
                    }
                    return false;
                  });

                  const isToday =
                    currentYear === today.getFullYear() &&
                    currentMonth === today.getMonth() &&
                    dayNum === today.getDate();

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
                            if (post.platform === "youtube") bgClass = "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200";

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
                          onClick={() => openEditorWithPrefill({
                            year: currentYear,
                            month: currentMonth + 1,
                            day: dayNum
                          })}
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
              {filteredPosts.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  No content scheduled for this period. Click &quot;+ Create Content&quot; to begin.
                </div>
              ) : (
                filteredPosts.map((post) => (
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
                        {post.scheduledAt || `${MONTH_NAMES[currentMonth]} ${post.day || 1}, ${currentYear}`}
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge status={post.status} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT: INSPECTOR SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {activeSelectedPost ? (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800 text-xs">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Post Inspector</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditorWithPrefill(activeSelectedPost)}
                    className="btn-secondary py-1 text-[11px] flex items-center gap-1"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={() => duplicateContentItem(activeSelectedPost.id)}
                    title="Duplicate Post"
                    className="btn-secondary py-1 text-[11px] p-1.5"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => deleteContentItem(activeSelectedPost.id)}
                    title="Delete Post"
                    className="btn-secondary py-1 text-[11px] p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={activeSelectedPost.platform} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                    {activeSelectedPost.title}
                  </span>
                </div>
                <StatusBadge status={activeSelectedPost.status} />
              </div>

              <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 leading-relaxed dark:bg-zinc-900/60 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
                &quot;{activeSelectedPost.caption || "No caption provided."}&quot;
              </div>

              {activeSelectedPost.hashtags && activeSelectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activeSelectedPost.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activeSelectedPost.contentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Campaign:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activeSelectedPost.campaign || "General"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {activeSelectedPost.scheduledAt || `${MONTH_NAMES[currentMonth]} ${activeSelectedPost.day || 1}, ${currentYear}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400 dark:border-zinc-800">
              Select a post on the calendar to view its details and metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
