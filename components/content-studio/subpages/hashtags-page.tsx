"use client";

import React, { useState, useMemo } from "react";
import {
  Hash,
  Search,
  Plus,
  Copy,
  TrendingUp,
  BarChart2,
  Bookmark,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  Zap,
  Tag,
  X,
  Layers,
  Flame,
  Target
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useContentStudio } from "../context/content-studio-context";
import { Hashtag, HashtagGroup } from "../types/content-studio-types";
import {
  SubPageHeader,
  KpiCard,
  SearchBar,
  EmptyState
} from "../components/common-ui";

const PERFORMANCE_CHART_DATA = [
  { day: "Mon", reach: 12400, engagement: 4.8 },
  { day: "Tue", reach: 15800, engagement: 5.2 },
  { day: "Wed", reach: 18400, engagement: 6.1 },
  { day: "Thu", reach: 14200, engagement: 5.0 },
  { day: "Fri", reach: 22100, engagement: 7.2 },
  { day: "Sat", reach: 19800, engagement: 6.8 },
  { day: "Sun", reach: 24500, engagement: 8.1 }
];

export function HashtagsPage() {
  const {
    hashtags,
    hashtagGroups,
    copyHashtagsToClipboard,
    createHashtagGroup,
    deleteHashtagGroup,
    openHashtagGroupModal,
    isHashtagGroupModalOpen,
    setIsHashtagGroupModalOpen,
    selectedHashtagGroup,
    openEditorWithPrefill,
    showToast
  } = useContentStudio();

  const [activeTab, setActiveTab] = useState<string>("Groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTags, setNewGroupTags] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Search Results preview
  const searchResult = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().replace("#", "");
    return {
      tag: `#${query}`,
      popularity: "High (2.4M posts)",
      competition: "Medium",
      reachPotential: "18.4K - 25.0K",
      related: [`#${query}tips`, `#${query}strategy`, `#${query}hacks`, `#growwith${query}`]
    };
  }, [searchQuery]);

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupTags.trim()) return;
    const tagArray = newGroupTags.split(",").map((t) => t.trim()).filter(Boolean);
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
        subtitle="Discover, organize, and optimize hashtags for better content reach."
        primaryActionLabel="+ Create Hashtag Group"
        onPrimaryAction={() => {
          setIsHashtagGroupModalOpen(true);
        }}
      />

      {/* TOP HASHTAG SEARCH & DISCOVERY BAR */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
        <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
          <Sparkles size={16} className="text-zinc-700 dark:text-zinc-300" />
          <span>Hashtag Intelligence & Discovery</span>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any hashtag (e.g. #digitalmarketing, #b2b)..."
            className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 py-2.5 text-xs text-zinc-900 outline-none shadow-2xs focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 font-semibold"
          />
        </div>

        {/* Live Search Result Breakdown */}
        {searchResult && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">{searchResult.tag}</span>
              <button
                onClick={() => copyHashtagsToClipboard(searchResult.tag)}
                className="btn-secondary py-1 text-[11px]"
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                <div className="text-[10px] text-zinc-400 uppercase">Usage Volume</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{searchResult.popularity}</div>
              </div>
              <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                <div className="text-[10px] text-zinc-400 uppercase">Competition</div>
                <div className="font-bold text-emerald-600">{searchResult.competition}</div>
              </div>
              <div className="rounded-lg bg-white p-2 dark:bg-zinc-950">
                <div className="text-[10px] text-zinc-400 uppercase">Reach Potential</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{searchResult.reachPotential}</div>
              </div>
            </div>

            <div className="text-xs">
              <span className="font-semibold text-zinc-500">Related Hashtags: </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {searchResult.related.map((rel) => (
                  <button
                    key={rel}
                    onClick={() => setSearchQuery(rel)}
                    className="rounded bg-white border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <KpiCard title="Saved Hashtags" value="284" subtitle="In repository" icon={Bookmark} />
        <KpiCard title="Hashtag Groups" value={hashtagGroups.length} subtitle="Active presets" icon={Layers} />
        <KpiCard title="Most Used" value="#marketing" subtitle="Used 42 times" icon={Flame} />
        <KpiCard title="Best Performing" value="#digitalmarketing" subtitle="6.4% avg engagement" trend="+24.1%" icon={TrendingUp} />
        <KpiCard title="Average Reach" value="18.4K" subtitle="Per post" icon={Target} />
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
        {["Groups", "All Hashtags", "Discover", "Performance"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: HASHTAG GROUPS */}
      {activeTab === "Groups" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hashtagGroups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {group.category || "General"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Used {group.usageCount} times</span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">{group.name}</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.hashtags.map((tag) => (
                    <span key={tag} className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
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
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: ALL HASHTAGS TABLE */}
      {activeTab === "All Hashtags" && (
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                <th className="py-3.5 px-4">Hashtag</th>
                <th className="py-3.5 px-3">Volume</th>
                <th className="py-3.5 px-3">Est. Reach</th>
                <th className="py-3.5 px-3">Avg. Engagement</th>
                <th className="py-3.5 px-3">Competition</th>
                <th className="py-3.5 px-3">Growth Rate</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
              {hashtags.map((tag) => (
                <tr key={tag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 font-mono">#{tag.name}</td>
                  <td className="py-3.5 px-3">{(tag.usageCount / 1000000).toFixed(1)}M</td>
                  <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{(tag.reach / 1000).toFixed(1)}K</td>
                  <td className="py-3.5 px-3">{tag.engagementRate}%</td>
                  <td className="py-3.5 px-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      tag.competition === "low" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : tag.competition === "medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {tag.competition}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-emerald-600 font-bold dark:text-emerald-400">+{tag.growthRate}%</td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => copyHashtagsToClipboard(`#${tag.name}`)} className="btn-secondary py-1 text-[11px]">
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: DISCOVER & RECOMMENDATIONS */}
      {activeTab === "Discover" && (
        <div className="space-y-4">
          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">AI Recommended Hashtags for Current Campaign</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { tag: "#growthmarketing", reach: "28.4K", score: "96/100", reason: "Highly Relevant" },
              { tag: "#socialmediastrategy", reach: "34.1K", score: "94/100", reason: "Trending" },
              { tag: "#martech", reach: "19.2K", score: "90/100", reason: "Low Competition" },
              { tag: "#b2bmarketing", reach: "22.5K", score: "88/100", reason: "High Reach" }
            ].map((rec) => (
              <div key={rec.tag} className="rounded-xl border border-zinc-200/90 bg-white p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{rec.tag}</span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{rec.reason}</span>
                </div>
                <div className="text-[11px] text-zinc-500">Est. Reach: <strong className="text-zinc-900 dark:text-zinc-100">{rec.reach}</strong></div>
                <button onClick={() => copyHashtagsToClipboard(rec.tag)} className="w-full btn-secondary py-1 text-[11px] text-center">
                  Copy Hashtag
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HASHTAG PERFORMANCE ANALYTICS */}
      {activeTab === "Performance" && (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Hashtag Reach & Performance Over Time</h3>
            <div className="flex gap-1 text-xs">
              <button onClick={() => setTimeRange("7d")} className={`px-2.5 py-1 rounded font-semibold ${timeRange === "7d" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "btn-secondary"}`}>7 Days</button>
              <button onClick={() => setTimeRange("30d")} className={`px-2.5 py-1 rounded font-semibold ${timeRange === "30d" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "btn-secondary"}`}>30 Days</button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_CHART_DATA}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
                <Tooltip />
                <Area type="monotone" dataKey="reach" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CREATE HASHTAG GROUP MODAL */}
      {isHashtagGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Create Hashtag Group</h3>
              <button onClick={() => setIsHashtagGroupModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Summer Growth Presets"
                  className="input-clean mt-1"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Hashtags (Comma-separated)</label>
                <textarea
                  rows={3}
                  required
                  value={newGroupTags}
                  onChange={(e) => setNewGroupTags(e.target.value)}
                  placeholder="e.g. #marketing, #digitalgrowth, #socialmedia"
                  className="input-clean mt-1 resize-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsHashtagGroupModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
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
