"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Heart,
  Copy,
  Trash2,
  Edit,
  Share2,
  SlidersHorizontal,
  Layers,
  FileCode,
  History,
  Check,
  X,
  Play,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Eye,
  ArrowRight
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { Template, Platform } from "../types/content-studio-types";
import {
  SubPageHeader,
  SearchBar,
  PlatformBadge,
  PlatformIcon,
  EmptyState
} from "../components/common-ui";

export function TemplatesPage() {
  const {
    templates,
    selectedTemplateItem,
    setSelectedTemplateItem,
    useTemplateToCreateContent: applyTemplateToCreateContent,
    toggleFavoriteTemplate,
    duplicateTemplate,
    deleteTemplate,
    openTemplateCreator,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    templatePrefill,
    createTemplate,
    showToast
  } = useContentStudio();

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"most_used" | "newest" | "name">("most_used");

  // Template Creator State
  const [canvasElements, setCanvasElements] = useState([
    { id: "el-1", type: "headline", text: "{{headline}}", fontSize: 28, color: "#0f172a", font: "Inter" },
    { id: "el-2", type: "subheadline", text: "{{subheadline}}", fontSize: 16, color: "#64748b", font: "Inter" }
  ]);
  const [templateName, setTemplateName] = useState("New Branded Template");
  const [templateCat, setTemplateCat] = useState<any>("Social Posts");

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((tpl) => {
        if (activeCategory === "Brand Templates" && !tpl.isBrand) return false;
        if (activeCategory === "My Templates" && tpl.isBrand) return false;
        if (activeCategory !== "All" && activeCategory !== "Brand Templates" && activeCategory !== "My Templates") {
          if (tpl.category !== activeCategory) return false;
        }

        if (selectedPlatform !== "all" && !tpl.platforms.includes(selectedPlatform as Platform)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = tpl.name.toLowerCase().includes(q);
          const matchesCat = tpl.category.toLowerCase().includes(q);
          return matchesName || matchesCat;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "most_used") return b.usageCount - a.usageCount;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b.id.localeCompare(a.id);
      });
  }, [templates, activeCategory, selectedPlatform, searchQuery, sortBy]);

  const featuredTemplates = useMemo(() => {
    return templates.filter((t) => t.isFeatured).slice(0, 4);
  }, [templates]);

  const handleSaveTemplateCreator = () => {
    createTemplate({
      name: templateName,
      category: templateCat,
      platforms: ["instagram", "facebook"],
      headline: canvasElements[0]?.text || "Headline",
      subheadline: canvasElements[1]?.text || "Subheadline"
    });
    setIsTemplateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Templates"
        subtitle="Create, manage, and reuse branded content templates."
        primaryActionLabel="+ Create Template"
        onPrimaryAction={() => openTemplateCreator()}
        secondaryActionLabel="Import Template"
        onSecondaryAction={() => showToast("Import Template", "Select a template JSON or Figma link to import.")}
      />

      {/* FEATURED TEMPLATES SECTION */}
      {activeCategory === "All" && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles size={15} className="text-zinc-500" />
              <span>Featured Templates</span>
            </h3>
            <span className="text-xs text-zinc-400 font-medium">Top performing design frameworks</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplateItem(tpl)}
                className="group relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 cursor-pointer"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  <img src={tpl.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-2xs dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300">
                    <Sparkles size={12} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {tpl.category}
                  </div>
                  <h4 className="font-bold text-zinc-900 truncate dark:text-zinc-100 mt-0.5">{tpl.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Used {tpl.usageCount} times</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyTemplateToCreateContent(tpl);
                      }}
                      className="font-bold text-zinc-900 hover:underline flex items-center gap-0.5 dark:text-zinc-100"
                    >
                      Use Now <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
        {[
          "All",
          "Social Posts",
          "Carousels",
          "Stories",
          "Reels",
          "Ads",
          "Campaigns",
          "Brand Templates",
          "My Templates"
        ].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search templates by name or category..." />

        <div className="flex items-center gap-2 text-xs font-medium shrink-0 overflow-x-auto">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="input-clean !w-auto min-w-[130px] shrink-0"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input-clean !w-auto min-w-[140px] shrink-0"
          >
            <option value="most_used">Sort by: Most Used</option>
            <option value="newest">Sort by: Recently Created</option>
            <option value="name">Sort by: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Template Gallery Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          title="No Templates Found"
          description="Create your first branded template or adjust filters."
          actionLabel="Create Template"
          onAction={() => openTemplateCreator()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplateItem(tpl)}
              className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 cursor-pointer"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  <img src={tpl.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteTemplate(tpl.id);
                    }}
                    className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full shadow-2xs backdrop-blur-xs transition ${
                      tpl.isFavorite
                        ? "bg-rose-500 text-white"
                        : "bg-white/80 text-zinc-400 hover:text-rose-500 dark:bg-zinc-900/80"
                    }`}
                  >
                    <Heart size={13} fill={tpl.isFavorite ? "currentColor" : "none"} />
                  </button>

                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {tpl.platforms.map((plat) => (
                      <div key={plat} className="rounded-full bg-black/60 p-1 text-white backdrop-blur-xs">
                        <PlatformIcon platform={plat} className="w-3 h-3" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                    <span>{tpl.category}</span>
                    <span>{tpl.width} × {tpl.height}</span>
                  </div>
                  <h4 className="mt-1 font-bold text-zinc-900 truncate dark:text-zinc-100">{tpl.name}</h4>
                  <p className="mt-0.5 text-[11px] text-zinc-500 truncate dark:text-zinc-400">
                    By {tpl.author.name} · Used {tpl.usageCount} times
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800 flex items-center justify-between gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    applyTemplateToCreateContent(tpl);
                  }}
                  className="flex-1 btn-primary py-1.5 text-[11px]"
                >
                  Use Template
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateTemplate(tpl.id);
                  }}
                  className="btn-secondary py-1.5 text-[11px]"
                  title="Duplicate"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(tpl.id);
                  }}
                  className="rounded-lg border border-zinc-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-zinc-800 dark:hover:bg-rose-950/40"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATE DETAIL DRAWER */}
      {selectedTemplateItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-md">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Template Details</h3>
              <button onClick={() => setSelectedTemplateItem(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <img src={selectedTemplateItem.thumbnail} alt="" className="h-full w-full object-cover" />
            </div>

            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{selectedTemplateItem.category}</div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedTemplateItem.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-semibold dark:bg-zinc-800">
                  {selectedTemplateItem.width} × {selectedTemplateItem.height} px
                </span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-semibold dark:bg-zinc-800">
                  Used {selectedTemplateItem.usageCount} times
                </span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Version {selectedTemplateItem.version || "v1.0"}
                </span>
              </div>
            </div>

            {/* Dynamic Template Variables */}
            {selectedTemplateItem.variables && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <FileCode size={14} className="text-zinc-500" /> Dynamic Variables
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplateItem.variables.map((varName) => (
                    <span key={varName} className="rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {`{{${varName}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Version History */}
            {selectedTemplateItem.versionHistory && (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <History size={14} className="text-zinc-500" /> Version History
                </div>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden dark:divide-zinc-800 dark:border-zinc-800">
                  {selectedTemplateItem.versionHistory.map((ver) => (
                    <div key={ver.version} className="p-2.5 bg-white dark:bg-zinc-900">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{ver.version}</span>
                        <span className="text-[10px] text-zinc-400">{ver.date}</span>
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-0.5 dark:text-zinc-400">{ver.changes}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                onClick={() => {
                  applyTemplateToCreateContent(selectedTemplateItem);
                  setSelectedTemplateItem(null);
                }}
                className="flex-1 btn-primary py-2"
              >
                Use Template
              </button>
              <button
                onClick={() => {
                  duplicateTemplate(selectedTemplateItem.id);
                  setSelectedTemplateItem(null);
                }}
                className="btn-secondary py-2"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE CREATOR MODAL / CANVAS EDITOR */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl h-[85vh] rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-zinc-900 dark:text-zinc-100" />
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="font-bold text-sm text-zinc-900 bg-transparent outline-none border-b border-dashed border-zinc-300 focus:border-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                />
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            {/* Canvas Editor Layout */}
            <div className="grid flex-1 grid-cols-12 gap-4 mt-4 overflow-hidden">
              {/* Left Toolbar */}
              <div className="col-span-3 border-r border-zinc-100 pr-3 dark:border-zinc-800 space-y-3">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Add Elements</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCanvasElements([...canvasElements, { id: `el-${Date.now()}`, type: "headline", text: "{{headline}}", fontSize: 24, color: "#000", font: "Inter" }])}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 p-3 hover:border-zinc-400 dark:border-zinc-800"
                  >
                    <Type size={16} className="text-zinc-700 dark:text-zinc-300" />
                    <span className="mt-1 text-[10px] font-semibold">Headline</span>
                  </button>
                  <button
                    onClick={() => setCanvasElements([...canvasElements, { id: `el-${Date.now()}`, type: "image", text: "{{image_url}}", fontSize: 14, color: "#000", font: "Inter" }])}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 p-3 hover:border-zinc-400 dark:border-zinc-800"
                  >
                    <ImageIcon size={16} className="text-zinc-700 dark:text-zinc-300" />
                    <span className="mt-1 text-[10px] font-semibold">Image Box</span>
                  </button>
                </div>
              </div>

              {/* Center Canvas */}
              <div className="col-span-6 bg-zinc-100 p-6 flex items-center justify-center rounded-xl dark:bg-zinc-950 overflow-auto">
                <div className="w-[320px] h-[320px] bg-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center space-y-4 border border-zinc-200 relative dark:bg-zinc-900 dark:border-zinc-800">
                  {canvasElements.map((el) => (
                    <div key={el.id} className="text-center font-bold text-zinc-800 dark:text-zinc-100 p-2 border border-dashed border-zinc-300 rounded cursor-move w-full dark:border-zinc-700">
                      {el.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Properties Panel */}
              <div className="col-span-3 border-l border-zinc-100 pl-3 dark:border-zinc-800 space-y-3">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Properties</div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Category</label>
                  <select
                    value={templateCat}
                    onChange={(e) => setTemplateCat(e.target.value)}
                    className="input-clean mt-1"
                  >
                    <option>Social Posts</option>
                    <option>Carousels</option>
                    <option>Stories</option>
                    <option>Reels</option>
                    <option>Ads</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button onClick={() => setIsTemplateModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveTemplateCreator} className="btn-primary">
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
