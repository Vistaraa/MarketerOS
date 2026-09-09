"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart2,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Filter,
  Grid,
  Heart,
  List,
  MoreVertical,
  MousePointer,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  FileText,
  Copy,
  Archive,
  ArrowUpRight
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { ContentItem, Platform, ContentStatus, ContentType } from "../types/content-studio-types";
import {
  SubPageHeader,
  KpiCard,
  SearchBar,
  ViewToggle,
  PlatformBadge,
  StatusBadge,
  PlatformIcon,
  EmptyState
} from "../components/common-ui";

export function ContentLibraryPage() {
  const {
    contentItems,
    selectedContentItem,
    setSelectedContentItem,
    openEditorWithPrefill,
    updateContentStatus,
    duplicateContentItem,
    deleteContentItem,
    showToast
  } = useContentStudio();

  // Filters & State
  const [activeFilterTab, setActiveFilterTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "performance" | "title">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Summary Metrics
  const counts = useMemo(() => {
    const published = contentItems.filter((i) => i.status === "Published").length;
    const scheduled = contentItems.filter((i) => i.status === "Scheduled").length;
    const drafts = contentItems.filter((i) => i.status === "Draft").length;
    const archived = contentItems.filter((i) => i.status === "Archived").length;
    return {
      total: contentItems.length,
      published,
      scheduled,
      drafts,
      archived
    };
  }, [contentItems]);

  // Filtered & Sorted Content Items
  const filteredItems = useMemo(() => {
    return contentItems
      .filter((item) => {
        // Tab Filter
        if (activeFilterTab === "Published" && item.status !== "Published") return false;
        if (activeFilterTab === "Scheduled" && item.status !== "Scheduled") return false;
        if (activeFilterTab === "Drafts" && item.status !== "Draft") return false;
        if (activeFilterTab === "In Review" && item.status !== "In Review") return false;
        if (activeFilterTab === "Archived" && item.status !== "Archived") return false;

        // Platform Filter
        if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;

        // Content Type Filter
        if (selectedType !== "all" && item.contentType !== selectedType) return false;

        // Search Query (title, caption, hashtags, campaign, author)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesCaption = item.caption.toLowerCase().includes(q);
          const matchesHashtags = item.hashtags.some((h) => h.toLowerCase().includes(q));
          const matchesCampaign = item.campaign?.toLowerCase().includes(q);
          const matchesAuthor = item.author.name.toLowerCase().includes(q);
          return matchesTitle || matchesCaption || matchesHashtags || matchesCampaign || matchesAuthor;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return b.id.localeCompare(a.id);
        if (sortBy === "oldest") return a.id.localeCompare(b.id);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "performance") {
          const rateA = parseFloat(a.performance?.engagementRate || "0");
          const rateB = parseFloat(b.performance?.engagementRate || "0");
          return rateB - rateA;
        }
        return 0;
      });
  }, [contentItems, activeFilterTab, selectedPlatform, selectedType, searchQuery, sortBy]);

  // Bulk Actions
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  const handleBulkStatusChange = (status: ContentStatus) => {
    selectedItemIds.forEach((id) => updateContentStatus(id, status));
    showToast("Bulk Action Complete", `Updated ${selectedItemIds.length} items to ${status}.`);
    setSelectedItemIds([]);
  };

  const handleBulkDelete = () => {
    selectedItemIds.forEach((id) => deleteContentItem(id));
    setSelectedItemIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Content Library"
        subtitle="Create, organize, find, and manage all your content in one place."
        primaryActionLabel="+ Create Content"
        onPrimaryAction={() => openEditorWithPrefill({})}
      />

      {/* KPI Cards Summary */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <KpiCard title="Total Content" value={counts.total} subtitle="All time repository" icon={FileText} onClick={() => setActiveFilterTab("All")} />
        <KpiCard title="Published" value={counts.published} subtitle="Live on platforms" trend="+14.2%" icon={Check} onClick={() => setActiveFilterTab("Published")} />
        <KpiCard title="Scheduled" value={counts.scheduled} subtitle="Pending release" trend="74 upcoming" icon={Clock} onClick={() => setActiveFilterTab("Scheduled")} />
        <KpiCard title="Drafts" value={counts.drafts} subtitle="Work in progress" icon={Edit} onClick={() => setActiveFilterTab("Drafts")} />
        <KpiCard title="Archived" value={counts.archived} subtitle="Inactive posts" icon={Archive} onClick={() => setActiveFilterTab("Archived")} />
      </div>

      {/* Filter Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-2 dark:border-zinc-800 text-xs font-semibold">
        <div className="flex gap-1 overflow-x-auto">
          {["All", "Published", "Scheduled", "Drafts", "In Review", "Archived"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilterTab(tab)}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeFilterTab === tab
                  ? "bg-zinc-900 font-bold text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Search Bar & Filters Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search content by title, caption, hashtag, author..." />

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input-clean min-w-[140px]"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="performance">Sort by: Best Performing</option>
            <option value="title">Sort by: Title (A-Z)</option>
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="input-clean min-w-[130px]"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">X (Twitter)</option>
          </select>

          {/* Content Format Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-clean min-w-[130px]"
          >
            <option value="all">All Formats</option>
            <option value="Post">Standard Post</option>
            <option value="Carousel">Carousel</option>
            <option value="Story">Story</option>
            <option value="Reel">Reel / Video</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (When Items Selected) */}
      {selectedItemIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-zinc-900 p-3 text-xs text-white shadow-lg animate-in fade-in dark:bg-zinc-800">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-bold dark:bg-zinc-700">{selectedItemIds.length} Selected</span>
            <span>Perform action on selected posts:</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStatusChange("Published")} className="rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold hover:bg-emerald-700">
              Publish
            </button>
            <button onClick={() => handleBulkStatusChange("Scheduled")} className="rounded-lg bg-purple-600 px-2.5 py-1 font-semibold hover:bg-purple-700">
              Schedule
            </button>
            <button onClick={() => handleBulkStatusChange("Draft")} className="rounded-lg bg-amber-600 px-2.5 py-1 font-semibold hover:bg-amber-700">
              Move to Draft
            </button>
            <button onClick={() => handleBulkStatusChange("Archived")} className="rounded-lg bg-zinc-700 px-2.5 py-1 font-semibold hover:bg-zinc-800">
              Archive
            </button>
            <button onClick={handleBulkDelete} className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold hover:bg-rose-700 flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Content Rendering: Grid vs List View */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No Content Items Found"
          description="Try modifying your search or filters to find what you are looking for."
          actionLabel="Create New Post"
          onAction={() => openEditorWithPrefill({})}
        />
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedContentItem(item)}
              className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 cursor-pointer"
            >
              <div>
                {/* Media Preview Box */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  <img
                    src={item.mediaUrls[0] || "/summer-sale-banner.png"}
                    alt={item.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute left-2 top-2">
                    <PlatformBadge platform={item.platform} />
                  </div>
                  <div className="absolute right-2 top-2">
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* Content Details */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                    <span>{item.contentType}</span>
                    <span>{item.scheduledAt || item.publishedAt || item.createdAt}</span>
                  </div>
                  <h4 className="mt-1 font-bold text-zinc-900 line-clamp-1 dark:text-zinc-100">{item.title}</h4>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2 dark:text-zinc-400">&quot;{item.caption}&quot;</p>
                </div>
              </div>

              {/* Card Footer: Campaign & Performance */}
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {item.campaign || "General"}
                  </span>
                  <div className="flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100 text-[11px]">
                    <Sparkles size={11} className="text-zinc-500" />
                    <span>{item.performance?.engagementRate || "4.8%"}</span>
                  </div>
                </div>

                {/* Card Quick Actions */}
                <div className="mt-3 flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditorWithPrefill(item);
                    }}
                    className="flex flex-1 items-center justify-center gap-1 btn-secondary py-1 text-[11px]"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateContentItem(item.id);
                    }}
                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    title="Duplicate"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContentItem(item.id);
                    }}
                    className="rounded-lg border border-zinc-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-zinc-800 dark:hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="p-3.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded accent-zinc-900 dark:accent-zinc-100"
                    />
                  </th>
                  <th className="py-3.5 px-3">Content</th>
                  <th className="py-3.5 px-3">Platform</th>
                  <th className="py-3.5 px-3">Format</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Campaign</th>
                  <th className="py-3.5 px-3">Author</th>
                  <th className="py-3.5 px-3">Performance</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedContentItem(item)}
                    className="transition hover:bg-zinc-50 cursor-pointer dark:hover:bg-zinc-900/60"
                  >
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="rounded accent-zinc-900 dark:accent-zinc-100"
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-zinc-100 shrink-0 dark:bg-zinc-800">
                          <img src={item.mediaUrls[0] || "/summer-sale-banner.png"} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                          <div className="text-[11px] text-zinc-400 line-clamp-1">{item.caption}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <PlatformBadge platform={item.platform} />
                    </td>
                    <td className="py-3.5 px-3 text-zinc-500 font-semibold">{item.contentType}</td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-3 text-zinc-600 dark:text-zinc-400">{item.campaign || "—"}</td>
                    <td className="py-3.5 px-3 text-zinc-600 dark:text-zinc-400">{item.author.name}</td>
                    <td className="py-3.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {item.performance?.engagementRate || "4.8%"}
                    </td>
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditorWithPrefill(item)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => duplicateContentItem(item.id)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => deleteContentItem(item.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT DETAIL DRAWER */}
      {selectedContentItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Content Details</h3>
              <button
                onClick={() => setSelectedContentItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Media Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 shadow-2xs dark:bg-zinc-800">
              <img
                src={selectedContentItem.mediaUrls[0] || "/summer-sale-banner.png"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            {/* Content Meta */}
            <div>
              <div className="flex items-center justify-between">
                <PlatformBadge platform={selectedContentItem.platform} />
                <StatusBadge status={selectedContentItem.status} />
              </div>
              <h2 className="mt-2 text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedContentItem.title}</h2>
              <p className="mt-1 text-xs text-zinc-500 font-mono">Format: {selectedContentItem.contentType}</p>
            </div>

            {/* Caption Text Box */}
            <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 leading-relaxed dark:bg-zinc-800/60 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
              &quot;{selectedContentItem.caption}&quot;
            </div>

            {/* Hashtags */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Hashtags</div>
              <div className="flex flex-wrap gap-1">
                {selectedContentItem.hashtags.map((tag) => (
                  <span key={tag} className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Performance Breakdown */}
            {selectedContentItem.performance && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950/40 text-xs">
                <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center gap-1">
                    <Sparkles size={14} className="text-zinc-500" /> Performance Analytics
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{selectedContentItem.performance.predictedScore}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                    <div className="text-[9px] uppercase text-zinc-400">Reach</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedContentItem.performance.reach}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                    <div className="text-[9px] uppercase text-zinc-400">Engagement</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedContentItem.performance.engagementRate}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                    <div className="text-[9px] uppercase text-zinc-400">Likes</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedContentItem.performance.likes}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                    <div className="text-[9px] uppercase text-zinc-400">Clicks</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedContentItem.performance.clicks}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                onClick={() => {
                  openEditorWithPrefill(selectedContentItem);
                  setSelectedContentItem(null);
                }}
                className="flex-1 btn-primary py-2"
              >
                Edit Post
              </button>
              <button
                onClick={() => {
                  duplicateContentItem(selectedContentItem.id);
                  setSelectedContentItem(null);
                }}
                className="btn-secondary py-2"
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => {
                  updateContentStatus(selectedContentItem.id, "Archived");
                  setSelectedContentItem(null);
                }}
                className="btn-secondary py-2"
                title="Archive"
              >
                <Archive size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
