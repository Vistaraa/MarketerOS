"use client";

import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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

/** Human-readable file size (small files no longer show as "0.0 MB"). */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

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
  // Folders are stored as a name on each asset. A new folder stays listed for this visit and persists
  // once something is uploaded into it.
  const [createdFolders, setCreatedFolders] = useState<string[]>([]);
  const folders = useMemo(() => {
    const names = ["Campaigns", "Social Posts", "Product Images", "Brand Assets", "Videos", "Logos", ...createdFolders];
    for (const asset of mediaAssets) if (asset.folderName) names.push(asset.folderName);
    return Array.from(new Set(names)).map((name) => ({ id: name, name }));
  }, [createdFolders, mediaAssets]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
    const usedMb = formatBytes(totalBytes);
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
        if (sortBy === "newest") return b.createdAt.localeCompare(a.createdAt);
        if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "size") return b.size - a.size;
        return 0;
      });
  }, [mediaAssets, activeNavTab, activeFolderId, searchQuery, sortBy]);

  // Folder Creation
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFld = { id: newFolderName.trim(), name: newFolderName.trim() };
    setCreatedFolders((prev) => [...prev, newFld.name]);
    setNewFolderName("");
    setShowCreateFolderModal(false);
    showToast("Folder Created", `"${newFld.name}" added to Media Library.`);
  };

  // Upload Handling
  const handleStartUpload = async (file: File | undefined, allowDuplicateName = false) => {
    if (!file) return;
    setDuplicateWarning(false);
    if (!allowDuplicateName && mediaAssets.some((m) => m.name.toLowerCase() === file.name.toLowerCase())) {
      setPendingFile(file);
      setDuplicateWarning(true);
      return;
    }
    setPendingFile(null);
    setIsUploading(true);
    setUploadProgress(0);
    const uploaded = await uploadMediaAsset(file, {
      folder: activeFolderId !== "all" ? activeFolderId : undefined,
      onProgress: setUploadProgress
    });
    setIsUploading(false);
    if (uploaded) setIsUploadModalOpen(false);
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
        <KpiCard title="Images" value={storageMetrics.images} subtitle={`${storageMetrics.images} assets`} icon={ImageIcon} />
        <KpiCard title="Videos" value={storageMetrics.videos} subtitle={`${storageMetrics.videos} assets`} icon={Film} />
        <KpiCard title="Documents" value={storageMetrics.documents} subtitle={`${storageMetrics.documents} assets`} icon={FileText} />

        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <span>Storage Used</span>
            <HardDrive size={14} className="text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">{storageMetrics.usedMb}</div>
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
                className="text-zinc-600 hover:bg-zinc-100 p-1 rounded-sm dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {mediaAssets.filter((m) => m.folderId === fld.id).length}
                  </span>
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
                        <span>{formatBytes(asset.size)}</span>
                        <span>{asset.folderName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-500 dark:border-zinc-800">
                    <span className="font-semibold">{new Date(asset.createdAt).toLocaleDateString()}</span>
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
                      <td className="py-3.5 px-3 font-mono">{formatBytes(asset.size)}</td>
                      <td className="py-3.5 px-3 text-zinc-400">{new Date(asset.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => deleteMediaAsset(asset.id)} className="text-rose-500 p-1 hover:bg-rose-50 rounded-sm">
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
      {selectedMediaItem && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-100 flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
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
                <div>Dimensions: {selectedMediaItem.width && selectedMediaItem.height ? `${selectedMediaItem.width} × ${selectedMediaItem.height}` : "—"}</div>
                <div>Size: {formatBytes(selectedMediaItem.size)}</div>
                <div>Folder: {selectedMediaItem.folderName || "—"}</div>
                <div>Uploaded: {new Date(selectedMediaItem.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <a href={`${selectedMediaItem.url}?download=1`} className="flex-1 btn-primary py-2 text-center">
                Download Asset
              </a>
              <button onClick={() => deleteMediaAsset(selectedMediaItem.id)} className="btn-secondary py-2 text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* UPLOAD MEDIA MODAL */}
      {isUploadModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 shrink-0 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upload Media Assets</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                  handleStartUpload(e.dataTransfer.files[0]);
                }}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragOver ? "border-zinc-900 bg-zinc-100/50 dark:border-zinc-100" : "border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-950"
                }`}
              >
                <Upload size={32} className="text-zinc-700 dark:text-zinc-300" />
                <h4 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">Drag and drop files here</h4>
                <p className="mt-1 text-[11px] text-zinc-400">Supports JPG, PNG, GIF, WEBP, MP4, MOV, WEBM and PDF up to 25MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    handleStartUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-4 btn-primary"
                >
                  {isUploading ? `Uploading... ${uploadProgress}%` : "Choose File"}
                </button>
                {isUploading && (
                  <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>

              {/* Duplicate Detection Warning */}
              {duplicateWarning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <div className="flex-1">
                    <div className="font-bold">Similar file already exists</div>
                    <div className="text-[11px]">A file with the same name exists in Media Library. What would you like to do?</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleStartUpload(pendingFile ?? undefined, true)} className="rounded-sm bg-amber-600 text-white px-2 py-1 font-bold">
                        Keep Both
                      </button>
                      <button onClick={() => setIsUploadModalOpen(false)} className="rounded-sm border border-amber-400 px-2 py-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE FOLDER MODAL */}
      {showCreateFolderModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-4">
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
        </div>,
        document.body
      )}
    </div>
  );
}
