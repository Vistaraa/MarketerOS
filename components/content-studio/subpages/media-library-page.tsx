"use client";

import React, { useState, useMemo } from "react";
import {
  Upload,
  FolderPlus,
  Folder,
  Image as ImageIcon,
  Film,
  FileText,
  Music,
  Star,
  Search,
  Grid,
  List,
  Filter,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Tag,
  Copy,
  FolderInput,
  Edit2,
  X,
  Plus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HardDrive
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { MediaAsset, MediaType } from "../types/content-studio-types";
import {
  SubPageHeader,
  KpiCard,
  SearchBar,
  ViewToggle,
  EmptyState
} from "../components/common-ui";

export function MediaLibraryPage() {
  const {
    mediaAssets,
    selectedMediaItem,
    setSelectedMediaItem,
    uploadMediaAsset,
    toggleFavoriteMedia,
    deleteMediaAsset,
    isUploadModalOpen,
    setIsUploadModalOpen,
    showToast
  } = useContentStudio();

  const [activeNavTab, setActiveNavTab] = useState<string>("All");
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [folders, setFolders] = useState([
    { id: "fld-1", name: "Campaigns", count: 24 },
    { id: "fld-2", name: "Social Posts", count: 58 },
    { id: "fld-3", name: "Product Images", count: 42 },
    { id: "fld-4", name: "Brand Assets", count: 18 },
    { id: "fld-5", name: "Videos", count: 12 },
    { id: "fld-6", name: "Logos", count: 8 }
  ]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Upload State
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Storage Stats
  const storageMetrics = useMemo(() => {
    const images = mediaAssets.filter((m) => m.type === "Image").length;
    const videos = mediaAssets.filter((m) => m.type === "Video").length;
    const documents = mediaAssets.filter((m) => m.type === "Document").length;
    const totalBytes = mediaAssets.reduce((acc, m) => acc + m.size, 0);
    const usedMb = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      total: mediaAssets.length,
      images,
      videos,
      documents,
      usedMb
    };
  }, [mediaAssets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return mediaAssets
      .filter((asset) => {
        // Tab Filter
        if (activeNavTab === "Images" && asset.type !== "Image") return false;
        if (activeNavTab === "Videos" && asset.type !== "Video") return false;
        if (activeNavTab === "GIFs" && asset.type !== "GIF") return false;
        if (activeNavTab === "Documents" && asset.type !== "Document") return false;
        if (activeNavTab === "Favorites" && !asset.isFavorite) return false;

        // Folder Filter
        if (activeFolderId !== "all" && asset.folderId !== activeFolderId) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = asset.name.toLowerCase().includes(q);
          const matchesTag = asset.tags.some((t) => t.toLowerCase().includes(q));
          return matchesName || matchesTag;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return b.id.localeCompare(a.id);
        if (sortBy === "oldest") return a.id.localeCompare(b.id);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "size") return b.size - a.size;
        return 0;
      });
  }, [mediaAssets, activeNavTab, activeFolderId, searchQuery, sortBy]);

  // Folder Creation
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFld = { id: `fld-${Date.now()}`, name: newFolderName.trim(), count: 0 };
    setFolders([...folders, newFld]);
    setNewFolderName("");
    setShowCreateFolderModal(false);
    showToast("Folder Created", `"${newFld.name}" added to Media Library.`);
  };

  // Upload Handling
  const handleStartUpload = (fileObj?: any) => {
    setIsUploading(true);
    setUploadProgress(20);
    setDuplicateWarning(false);

    const fileName = fileObj?.name || "new-brand-asset.png";
    const exists = mediaAssets.some((m) => m.name.toLowerCase() === fileName.toLowerCase());

    if (exists) {
      setDuplicateWarning(true);
      setIsUploading(false);
      return;
    }

    setTimeout(() => setUploadProgress(60), 400);
    setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);
      uploadMediaAsset({
        name: fileName,
        type: fileObj?.type || "image/png",
        size: fileObj?.size || 2150000,
        folderId: activeFolderId !== "all" ? activeFolderId : "fld-1"
      });
      setIsUploadModalOpen(false);
    }, 900);
  };

  const toggleSelectAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <SubPageHeader
        title="Media Library"
        subtitle="Store, organize, search, and manage all your creative assets."
        primaryActionLabel="+ Upload Media"
        onPrimaryAction={() => setIsUploadModalOpen(true)}
        secondaryActionLabel="Create Folder"
        onSecondaryAction={() => setShowCreateFolderModal(true)}
      />

      {/* Summary KPI Bar */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <KpiCard title="Total Assets" value={storageMetrics.total} subtitle="In library" icon={ImageIcon} />
        <KpiCard title="Images" value={storageMetrics.images} subtitle="824 optimized" icon={ImageIcon} />
        <KpiCard title="Videos" value={storageMetrics.videos} subtitle="286 MP4/Reels" icon={Film} />
        <KpiCard title="Documents" value={storageMetrics.documents} subtitle="92 Brand PDFs" icon={FileText} />

        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <span>Storage Used</span>
            <HardDrive size={14} className="text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">6.4 GB / 20 GB</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 w-[32%]" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200/80 overflow-x-auto dark:border-zinc-800 text-xs font-semibold">
        {["All", "Images", "Videos", "GIFs", "Audio", "Documents", "Favorites"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveNavTab(tab)}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeNavTab === tab
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Folders Sidebar + Right Asset Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT FOLDER SIDEBAR (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
              <span>Folder Directory</span>
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="text-zinc-600 hover:bg-zinc-100 p-1 rounded dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <FolderPlus size={14} />
              </button>
            </div>

            <div className="space-y-0.5 font-medium">
              <button
                onClick={() => setActiveFolderId("all")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                  activeFolderId === "all"
                    ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-zinc-500" />
                  <span>All Assets</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">{mediaAssets.length}</span>
              </button>

              {folders.map((fld) => (
                <button
                  key={fld.id}
                  onClick={() => setActiveFolderId(fld.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                    activeFolderId === fld.id
                      ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={14} className="text-zinc-400" />
                    <span>{fld.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">{fld.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT ASSET CANVAS (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search assets by file name or tag..." />

            <div className="flex items-center gap-2 text-xs font-medium">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-clean min-w-[140px]"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="name">Sort by: File Name</option>
                <option value="size">Sort by: File Size</option>
              </select>

              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedAssetIds.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-zinc-900 p-3 text-xs text-white shadow-lg dark:bg-zinc-800">
              <span className="font-bold">{selectedAssetIds.length} Assets Selected</span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg bg-zinc-800 px-3 py-1 font-semibold hover:bg-zinc-700 flex items-center gap-1 dark:bg-zinc-700">
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={() => {
                    selectedAssetIds.forEach((id) => deleteMediaAsset(id));
                    setSelectedAssetIds([]);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1 font-semibold hover:bg-rose-700 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Assets Grid / List */}
          {filteredAssets.length === 0 ? (
            <EmptyState
              title="No Media Assets Found"
              description="Upload creative assets to get started or clear filters."
              actionLabel="Upload Media"
              onAction={() => setIsUploadModalOpen(true)}
            />
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedMediaItem(asset)}
                  className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 cursor-pointer"
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                      {asset.type === "Image" || asset.type === "GIF" ? (
                        <img src={asset.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-400">
                          {asset.type === "Video" ? <Film size={32} /> : <FileText size={32} />}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMedia(asset.id);
                        }}
                        className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full shadow-2xs backdrop-blur-xs ${
                          asset.isFavorite ? "bg-amber-400 text-zinc-900" : "bg-white/80 text-zinc-400 hover:text-amber-400 dark:bg-zinc-900/80"
                        }`}
                      >
                        <Star size={12} fill={asset.isFavorite ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="mt-2.5">
                      <div className="font-bold text-zinc-900 truncate text-xs dark:text-zinc-100">{asset.name}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span>{(asset.size / (1024 * 1024)).toFixed(1)} MB</span>
                        <span>{asset.folderName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-500 dark:border-zinc-800">
                    <span className="font-semibold">{asset.usedInPostsCount || 0} posts</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMediaAsset(asset.id);
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW TABLE */
            <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <th className="p-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0}
                        onChange={() => {
                          if (selectedAssetIds.length === filteredAssets.length) setSelectedAssetIds([]);
                          else setSelectedAssetIds(filteredAssets.map((a) => a.id));
                        }}
                        className="accent-zinc-900 dark:accent-zinc-100"
                      />
                    </th>
                    <th className="py-3.5 px-3">File Name</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Folder</th>
                    <th className="py-3.5 px-3">Size</th>
                    <th className="py-3.5 px-3">Uploaded</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} onClick={() => setSelectedMediaItem(asset)} className="hover:bg-zinc-50 cursor-pointer dark:hover:bg-zinc-900/60">
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={() => toggleSelectAsset(asset.id)}
                          className="accent-zinc-900 dark:accent-zinc-100"
                        />
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">{asset.name}</td>
                      <td className="py-3.5 px-3">{asset.type}</td>
                      <td className="py-3.5 px-3 text-zinc-500">{asset.folderName}</td>
                      <td className="py-3.5 px-3 font-mono">{(asset.size / (1024 * 1024)).toFixed(1)} MB</td>
                      <td className="py-3.5 px-3 text-zinc-400">{asset.createdAt}</td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => deleteMediaAsset(asset.id)} className="text-rose-500 p-1 hover:bg-rose-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MEDIA PREVIEW DRAWER */}
      {selectedMediaItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-zinc-900 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Media Preview</h3>
              <button onClick={() => setSelectedMediaItem(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {selectedMediaItem.type === "Image" || selectedMediaItem.type === "GIF" ? (
                <img src={selectedMediaItem.url} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="text-zinc-400 flex flex-col items-center">
                  <Film size={48} />
                  <span className="mt-2 font-bold">{selectedMediaItem.name}</span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedMediaItem.name}</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 text-zinc-500 font-mono">
                <div>Dimensions: {selectedMediaItem.width || 1080} × {selectedMediaItem.height || 1080}</div>
                <div>Size: {(selectedMediaItem.size / (1024 * 1024)).toFixed(1)} MB</div>
                <div>Folder: {selectedMediaItem.folderName}</div>
                <div>Used in: {selectedMediaItem.usedInPostsCount || 0} posts</div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button onClick={() => showToast("Download Started", selectedMediaItem.name)} className="flex-1 btn-primary py-2">
                Download Asset
              </button>
              <button onClick={() => deleteMediaAsset(selectedMediaItem.id)} className="btn-secondary py-2 text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MEDIA MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upload Media Assets</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleStartUpload({ name: e.dataTransfer.files[0]?.name });
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragOver ? "border-zinc-900 bg-zinc-100/50 dark:border-zinc-100" : "border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-950"
              }`}
            >
              <Upload size={32} className="text-zinc-700 dark:text-zinc-300" />
              <h4 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">Drag and drop files here</h4>
              <p className="mt-1 text-[11px] text-zinc-400">Supports JPG, PNG, GIF, MP4, MOV up to 100MB</p>
              <button
                onClick={() => handleStartUpload()}
                className="mt-4 btn-primary"
              >
                Choose File
              </button>
            </div>

            {/* Duplicate Detection Warning */}
            {duplicateWarning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <div className="font-bold">Similar file already exists</div>
                  <div className="text-[11px]">A file with the same name exists in Media Library. What would you like to do?</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleStartUpload({ name: `copy_${Date.now()}.png` })} className="rounded bg-amber-600 text-white px-2 py-1 font-bold">
                      Keep Both
                    </button>
                    <button onClick={() => setIsUploadModalOpen(false)} className="rounded border border-amber-400 px-2 py-1">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name (e.g. Q3 Campaigns)"
              className="input-clean"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateFolderModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateFolder} className="btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
