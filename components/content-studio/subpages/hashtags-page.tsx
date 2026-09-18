"use client";

import React, { useState, useMemo } from "react";
import {
  Hash,
  Search,
  Plus,
  Copy,
  TrendingUp,
  Bookmark,
  Check,
  Trash2,
  Sparkles,
  Zap,
  X
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { HashtagGroup } from "../types/content-studio-types";
import {
  SubPageHeader,
  SearchBar,
  EmptyState
} from "../components/common-ui";

const TRENDING_HASHTAGS = [
  { tag: "#growthmarketing", reach: "45.2K", score: "98/100", reason: "Viral Peak" },
  { tag: "#contentcreator", reach: "82.4K", score: "96/100", reason: "High Engagement" },
  { tag: "#socialmediastrategy", reach: "34.1K", score: "94/100", reason: "Trending" },
  { tag: "#martech", reach: "19.2K", score: "90/100", reason: "Low Competition" },
  { tag: "#b2bmarketing", reach: "22.5K", score: "88/100", reason: "High Reach" },
  { tag: "#digitalstrategy", reach: "29.8K", score: "87/100", reason: "Steady Volume" },
  { tag: "#brandgrowth", reach: "31.0K", score: "89/100", reason: "High Conversion" },
  { tag: "#videomarketing", reach: "56.4K", score: "92/100", reason: "Rising Fast" }
];

export function HashtagsPage() {
  const {
    hashtagGroups,
    copyHashtagsToClipboard,
    createHashtagGroup,
    deleteHashtagGroup,
    isHashtagGroupModalOpen,
    setIsHashtagGroupModalOpen,
    openEditorWithPrefill
  } = useContentStudio();

  const [activeTab, setActiveTab] = useState<"Groups" | "Discover">("Groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTags, setNewGroupTags] = useState("");

  // Search Results preview
  const searchResult = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().replace("#", "");
    return {
      tag: `#${query}`,
      popularity: "High Volume",
      competition: "Moderate",
      reachPotential: "15.0K - 30.0K",
      related: [`#${query}tips`, `#${query}strategy`, `#${query}hacks`, `#growwith${query}`]
    };
  }, [searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return hashtagGroups;
    const q = searchQuery.toLowerCase();
    return hashtagGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.hashtags.some((t) => t.toLowerCase().includes(q))
    );
  }, [hashtagGroups, searchQuery]);

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupTags.trim()) return;
    const tagArray = newGroupTags.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    createHashtagGroup(newGroupName.trim(), tagArray);
    setNewGroupName("");
    setNewGroupTags("");
    setIsHashtagGroupModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Hashtags"
        subtitle="Discover, organize, and optimize hashtag presets to maximize organic social reach."
        primaryActionLabel="+ Create Hashtag Group"
        onPrimaryAction={() => setIsHashtagGroupModalOpen(true)}
      />

      {/* TOP HASHTAG SEARCH & DISCOVERY BAR */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Hashtag Discovery & Volume Estimator</h3>
          <p className="text-[11px] text-zinc-400">Search keywords to preview popularity, competition, and related high-reach tags.</p>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by keyword (e.g. ecommerce, growth, branding)..."
          className="max-w-xl"
        />

        {searchResult && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">{searchResult.tag}</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {searchResult.popularity}
                </span>
              </div>
              <button
                onClick={() => copyHashtagsToClipboard(searchResult.tag)}
                className="btn-secondary py-1 text-xs"
              >
                Copy Tag
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="text-zinc-500">Related Tags:</span>
              {searchResult.related.map((rt) => (
                <button
                  key={rt}
                  onClick={() => copyHashtagsToClipboard(rt)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-zinc-700 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {rt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2 text-xs font-semibold dark:border-zinc-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("Groups")}
            className={`pb-2 transition ${
              activeTab === "Groups"
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Saved Hashtag Groups ({hashtagGroups.length})
          </button>
          <button
            onClick={() => setActiveTab("Discover")}
            className={`pb-2 transition ${
              activeTab === "Discover"
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Trending & Suggested ({TRENDING_HASHTAGS.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SAVED HASHTAG GROUPS */}
      {activeTab === "Groups" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No Hashtag Groups Found"
                description="Create custom hashtag groups to quickly apply curated tags to posts."
                actionLabel="+ Create Hashtag Group"
                onAction={() => setIsHashtagGroupModalOpen(true)}
              />
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {group.category || "Custom"}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{group.hashtags.length} tags</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">{group.name}</h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.hashtags.map((tag) => (
                      <span key={tag} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => copyHashtagsToClipboard(group.hashtags.join(" "))}
                    className="flex-1 btn-primary py-1.5 text-xs flex items-center justify-center gap-1"
                  >
                    <Copy size={12} /> Copy All
                  </button>
                  <button
                    onClick={() => {
                      openEditorWithPrefill({ hashtags: group.hashtags });
                    }}
                    className="btn-secondary py-1.5 text-xs"
                  >
                    Use in Post
                  </button>
                  <button
                    onClick={() => deleteHashtagGroup(group.id)}
                    className="rounded-lg border border-zinc-200 p-1.5 text-rose-500 hover:bg-rose-50 dark:border-zinc-800"
                    title="Delete Group"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: TRENDING & SUGGESTED */}
      {activeTab === "Discover" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRENDING_HASHTAGS.map((rec) => (
            <div key={rec.tag} className="rounded-xl border border-zinc-200/90 bg-white p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{rec.tag}</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {rec.reason}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Est. Reach: <strong className="text-zinc-900 dark:text-zinc-100">{rec.reach}</strong>
              </div>
              <button
                onClick={() => copyHashtagsToClipboard(rec.tag)}
                className="w-full btn-secondary py-1 text-[11px] text-center"
              >
                Copy Tag
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CREATE HASHTAG GROUP MODAL */}
      {isHashtagGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Create Hashtag Group</h3>
              <button
                onClick={() => setIsHashtagGroupModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Summer Growth Presets"
                  className="input-clean"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Hashtags (comma or space separated)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newGroupTags}
                  onChange={(e) => setNewGroupTags(e.target.value)}
                  placeholder="#growth, #marketing, #ecommerce, #brand"
                  className="input-clean font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsHashtagGroupModalOpen(false)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 text-xs">
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
