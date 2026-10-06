"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  ContentItem,
  Template,
  MediaAsset,
  Hashtag,
  HashtagGroup,
  ConnectedSocialAccount,
  WorkflowStep,
  ContentStudioSettingsState,
  Platform,
  ContentType,
  ContentStatus,
  User
} from "../types/content-studio-types";
import { INITIAL_SETTINGS_STATE } from "../data/default-settings";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ContentStudioContextType {
  // Navigation & Active Sub-page
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Data Collections
  contentItems: ContentItem[];
  templates: Template[];
  mediaAssets: MediaAsset[];
  hashtags: Hashtag[];
  hashtagGroups: HashtagGroup[];
  socialAccounts: ConnectedSocialAccount[];
  settings: ContentStudioSettingsState;
  isLoadingContent: boolean;
  isLoadingAccounts: boolean;

  // Selected Detail Item for Drawers
  selectedContentItem: ContentItem | null;
  setSelectedContentItem: (item: ContentItem | null) => void;
  selectedTemplateItem: Template | null;
  setSelectedTemplateItem: (template: Template | null) => void;
  selectedMediaItem: MediaAsset | null;
  setSelectedMediaItem: (media: MediaAsset | null) => void;

  // Modal Triggers & Form Prefill
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  editorPrefill: Partial<ContentItem> | null;
  openEditorWithPrefill: (prefill: Partial<ContentItem>) => void;

  isTemplateModalOpen: boolean;
  setIsTemplateModalOpen: (open: boolean) => void;
  templatePrefill: Template | null;
  openTemplateCreator: (tpl?: Template) => void;

  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;

  isHashtagGroupModalOpen: boolean;
  setIsHashtagGroupModalOpen: (open: boolean) => void;
  selectedHashtagGroup: HashtagGroup | null;
  openHashtagGroupModal: (group?: HashtagGroup) => void;

  // Social Connect Modal
  isConnectModalOpen: boolean;
  setIsConnectModalOpen: (open: boolean) => void;
  connectModalDefaultPlatform: Platform | string;
  openConnectModal: (platform?: Platform | string) => void;
  closeConnectModal: () => void;

  // Actions: Content Items
  createContentItem: (item: Partial<ContentItem>) => Promise<ContentItem>;
  updateContentStatus: (id: string, status: ContentStatus) => Promise<void>;
  duplicateContentItem: (id: string) => void;
  deleteContentItem: (id: string) => Promise<void>;
  refreshContentItems: () => Promise<void>;

  // Actions: Social Accounts
  refreshSocialAccounts: () => Promise<void>;
  disconnectSocialAccount: (id: string) => Promise<void>;

  // Actions: Templates
  createTemplate: (template: Partial<Template>) => void;
  toggleFavoriteTemplate: (id: string) => void;
  useTemplateToCreateContent: (template: Template) => void;
  duplicateTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;

  // Actions: Media Assets
  uploadMediaAsset: (file: File, options?: { folder?: string; onProgress?: (percent: number) => void }) => Promise<MediaAsset | null>;
  toggleFavoriteMedia: (id: string) => void;
  deleteMediaAsset: (id: string) => void;

  // Actions: Hashtags & Groups
  createHashtagGroup: (name: string, hashtagsList: string[]) => void;
  copyHashtagsToClipboard: (hashtagsText: string) => void;
  deleteHashtagGroup: (id: string) => void;

  // Actions: Settings
  updateSettings: (newSettings: ContentStudioSettingsState) => void;

  // AI Generation
  generateAiText: (prompt: string, kind?: string) => Promise<string>;

  // Toast System
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const ContentStudioContext = createContext<ContentStudioContextType | undefined>(undefined);


const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

async function apiJson<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status}).`);
  return json?.data as T;
}

/** Fields the templates API accepts, from a (possibly legacy) Template object. */
function templatePayload(t: Partial<Template>) {
  return {
    name: t.name || "Untitled template",
    category: t.category,
    platforms: t.platforms,
    // Legacy templates pointed at bundled demo images; only keep real thumbnails.
    thumbnail: t.thumbnail && (t.thumbnail.startsWith("/api/media/") || t.thumbnail.startsWith("https://")) ? t.thumbnail : undefined,
    width: t.width,
    height: t.height,
    headline: t.headline,
    subheadline: t.subheadline,
    captionTemplate: t.captionTemplate,
    variables: t.variables,
    isFavorite: t.isFavorite,
    usageCount: t.usageCount
  };
}

/** Uploads with real progress events (fetch can't report upload progress). */
function uploadWithProgress(method: string, url: string, body: FormData | File, headers: Record<string, string>, onProgress?: (percent: number) => void) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: any = null;
      try { json = JSON.parse(xhr.responseText); } catch {}
      resolve({ status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(body);
  });
}

/**
 * Direct upload: get a presigned URL, PUT the file straight to storage, then ask the server to verify and
 * register it. Returns null when the server has no direct-upload storage, so the caller can fall back.
 */
async function uploadDirect(file: File, folder: string | undefined, measured: { width?: number; height?: number; duration?: number }, onProgress?: (percent: number) => void): Promise<MediaAsset | null> {
  const res = await fetch("/api/v1/content-studio/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size, folder: folder || null, width: measured.width ?? null, height: measured.height ?? null, duration: measured.duration ?? null })
  });
  const json = await res.json().catch(() => null);
  if (res.status === 409 && json?.error?.code === "DIRECT_UPLOAD_UNAVAILABLE") return null;
  if (!res.ok) throw new Error(json?.error?.message || `Upload failed (${res.status}).`);

  const { uploadUrl, headers, token } = json.data as { uploadUrl: string; headers: Record<string, string>; token: string };
  const put = await uploadWithProgress("PUT", uploadUrl, file, headers, onProgress);
  if (put.status < 200 || put.status >= 300) throw new Error(`Upload to storage failed (${put.status}).`);

  return apiJson<MediaAsset>("/api/v1/content-studio/media/complete", "POST", { token });
}

/** Reads real dimensions/duration in the browser; returns {} when the file can't be decoded. */
async function measureMedia(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; video.src = url; });
      return { width: video.videoWidth || undefined, height: video.videoHeight || undefined, duration: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined };
    }
  } catch {
    // Unreadable in this browser: leave measurements empty rather than guessing.
  } finally {
    URL.revokeObjectURL(url);
  }
  return {};
}

const LEGACY_KEYS = { templates: "cs_templates", media: "cs_media", groups: "cs_hashtag_groups", settings: "cs_settings" };

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Older versions stored templates, hashtag groups and settings only in localStorage. Copy them to the
 * workspace once, then clear them. Templates and groups are always imported (clearing them unimported would
 * lose work); settings are workspace-wide, so they're only imported if the workspace has none yet. Legacy
 * "media" entries were placeholders that never held an uploaded file, so they are discarded.
 */
async function importLegacyBrowserData(settingsEmpty: boolean) {
  const result: { templates: Template[]; groups: HashtagGroup[]; settings: ContentStudioSettingsState | null } = { templates: [], groups: [], settings: null };
  if (typeof window === "undefined") return result;

  const legacyTemplates = readLegacy<Template[]>(LEGACY_KEYS.templates);
  if (Array.isArray(legacyTemplates) && legacyTemplates.length) {
    for (const t of legacyTemplates.slice().reverse()) {
      try { result.templates.unshift(await apiJson<Template>("/api/v1/content-studio/templates", "POST", templatePayload(t))); } catch {}
    }
  }
  const legacyGroups = readLegacy<HashtagGroup[]>(LEGACY_KEYS.groups);
  if (Array.isArray(legacyGroups) && legacyGroups.length) {
    for (const g of legacyGroups.slice().reverse()) {
      if (!g?.name || !Array.isArray(g.hashtags) || !g.hashtags.length) continue;
      try { result.groups.unshift(await apiJson<HashtagGroup>("/api/v1/content-studio/hashtag-groups", "POST", { name: g.name, hashtags: g.hashtags, category: g.category, usageCount: g.usageCount })); } catch {}
    }
  }
  const legacySettings = readLegacy<ContentStudioSettingsState>(LEGACY_KEYS.settings);
  if (settingsEmpty && legacySettings && typeof legacySettings === "object") {
    try {
      await apiJson("/api/v1/content-studio/settings", "PUT", { settings: legacySettings });
      result.settings = legacySettings;
    } catch {}
  }
  try { Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key)); } catch {}
  return result;
}

export function ContentStudioProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>("Content Calendar");

  // Core Datasets
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<ConnectedSocialAccount[]>([]);
  const [settings, setSettings] = useState<ContentStudioSettingsState>(INITIAL_SETTINGS_STATE);

  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Drawers
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [selectedTemplateItem, setSelectedTemplateItem] = useState<Template | null>(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaAsset | null>(null);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorPrefill, setEditorPrefill] = useState<Partial<ContentItem> | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templatePrefill, setTemplatePrefill] = useState<Template | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [isHashtagGroupModalOpen, setIsHashtagGroupModalOpen] = useState(false);
  const [selectedHashtagGroup, setSelectedHashtagGroup] = useState<HashtagGroup | null>(null);

  // Social Connect Modal
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectModalDefaultPlatform, setConnectModalDefaultPlatform] = useState<Platform | string>("instagram");

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openEditorWithPrefill = (prefill: Partial<ContentItem>) => {
    setEditorPrefill(prefill);
    setIsEditorOpen(true);
  };

  const openConnectModal = (plat: Platform | string = "instagram") => {
    setConnectModalDefaultPlatform(plat);
    setIsConnectModalOpen(true);
  };

  const closeConnectModal = () => {
    setIsConnectModalOpen(false);
  };

  // 1. Fetch Dynamic Content Items from /api/v1/content
  const refreshContentItems = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch("/api/v1/content");
      const json = await res.json();
      if (json.data?.items) {
        const loaded: ContentItem[] = json.data.items.map((row: any) => {
          const meta = row.metadata || {};
          const schedDate = row.scheduledAt ? new Date(row.scheduledAt) : null;
          const pubDate = row.publishedAt ? new Date(row.publishedAt) : null;
          const createDate = row.createdAt ? new Date(row.createdAt) : new Date();

          const targetDate = schedDate || pubDate || createDate;

          let normalizedStatus: ContentStatus = "Draft";
          if (row.status === "PUBLISHED") normalizedStatus = "Published";
          else if (row.status === "SCHEDULED") normalizedStatus = "Scheduled";
          else if (row.status === "IN_REVIEW") normalizedStatus = "In Review";
          else if (row.status === "ARCHIVED") normalizedStatus = "Archived";

          return {
            id: row.id,
            title: row.title || "Untitled Content",
            platform: (row.platform?.toLowerCase() || "instagram") as Platform,
            contentType: meta.contentType || row.type || "Post",
            status: normalizedStatus,
            caption: row.body || "",
            mediaUrls: meta.mediaUrls || (meta.imageUrl ? [meta.imageUrl] : []),
            hashtags: row.keywords?.length ? row.keywords : meta.hashtags || [],
            campaign: meta.campaign || "General Campaign",
            author: {
              id: row.createdBy?.id || "u-workspace",
              name: row.createdBy?.name || "Workspace Member",
              role: "Creator",
              email: "member@workspace.local"
            },
            scheduledAt: schedDate ? schedDate.toLocaleString() : undefined,
            publishedAt: pubDate ? pubDate.toLocaleString() : undefined,
            createdAt: createDate.toLocaleDateString(),
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "Today",
            day: targetDate.getDate(),
            month: targetDate.getMonth() + 1,
            year: targetDate.getFullYear(),
            time: meta.time || (schedDate ? schedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM"),
            performance: meta.performance || {
              reach: "0",
              impressions: "0",
              likes: "0",
              comments: "0",
              shares: "0",
              saves: "0",
              clicks: "0",
              engagementRate: "0%"
            }
          };
        });
        setContentItems(loaded);
      }
    } catch (err) {
      console.error("Failed to load content from backend:", err);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  // 2. Fetch Dynamic Connected Social Accounts from /api/v1/social/accounts
  const refreshSocialAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch("/api/v1/social/accounts");
      const json = await res.json();
      if (json.data?.items) {
        const loaded: ConnectedSocialAccount[] = json.data.items.map((acc: any) => ({
          id: acc.id,
          platform: (acc.platform?.toLowerCase() || "instagram") as Platform,
          accountName: acc.displayName || acc.accountName || acc.username || "Social Account",
          handle: acc.username?.startsWith("@") ? acc.username : `@${acc.username || "account"}`,
          avatarUrl: acc.avatarUrl || undefined,
          status: acc.isActive ? "Connected" : "Disconnected",
          lastSynced: acc.updatedAt ? new Date(acc.updatedAt).toLocaleDateString() : "Recently",
          followersCount: acc.followerCount ? `${acc.followerCount}` : undefined
        }));
        setSocialAccounts(loaded);
      }
    } catch (err) {
      console.error("Failed to load social accounts from backend:", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  // Initialize on mount

  // Templates, media, hashtag groups and settings are stored per workspace on the server.
  const loadLibrary = useCallback(async () => {
    try {
      const [tplRes, mediaRes, groupRes, settingsRes] = await Promise.all([
        fetch("/api/v1/content-studio/templates"),
        fetch("/api/v1/content-studio/media"),
        fetch("/api/v1/content-studio/hashtag-groups"),
        fetch("/api/v1/content-studio/settings")
      ]);
      const [tplJson, mediaJson, groupJson, settingsJson] = await Promise.all([tplRes, mediaRes, groupRes, settingsRes].map((r) => r.json().catch(() => null)));
      let serverTemplates: Template[] = tplRes.ok ? tplJson?.data?.items || [] : [];
      let serverGroups: HashtagGroup[] = groupRes.ok ? groupJson?.data?.items || [] : [];
      let serverSettings = settingsRes.ok ? settingsJson?.data?.settings ?? null : null;

      // One-time import of data that older versions kept only in this browser.
      const imported = await importLegacyBrowserData(serverSettings === null);
      serverTemplates = [...imported.templates, ...serverTemplates];
      serverGroups = [...imported.groups, ...serverGroups];
      if (imported.settings) serverSettings = imported.settings;

      setTemplates(serverTemplates);
      setMediaAssets(mediaRes.ok ? mediaJson?.data?.items || [] : []);
      setHashtagGroups(serverGroups);
      if (serverSettings) setSettings({ ...INITIAL_SETTINGS_STATE, ...serverSettings });
    } catch (err) {
      console.error("[ContentStudio] Failed to load library:", err);
    }
  }, []);

  useEffect(() => {
    refreshContentItems();
    refreshSocialAccounts();

    loadLibrary();
  }, [refreshContentItems, refreshSocialAccounts, loadLibrary]);

  // Actions: Content Items
  const createContentItem = async (data: Partial<ContentItem>): Promise<ContentItem> => {
    let schedIso: string | undefined;
    if (data.scheduledAt) {
      const parsed = new Date(data.scheduledAt);
      if (!isNaN(parsed.getTime())) schedIso = parsed.toISOString();
    } else if (data.year && data.month && data.day) {
      const timeParts = (data.time || "10:00 AM").split(/[:\s]/);
      let hours = parseInt(timeParts[0] || "10", 10);
      const minutes = parseInt(timeParts[1] || "0", 10);
      const isPm = (data.time || "").toLowerCase().includes("pm");
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
      const d = new Date(data.year, data.month - 1, data.day, hours, minutes);
      schedIso = d.toISOString();
    }

    const payload = {
      title: data.title || "Untitled Social Post",
      body: data.caption || "",
      type: data.contentType || "SOCIAL_POST",
      platform: (data.platform || "instagram").toUpperCase(),
      status: (data.status || "Scheduled").toUpperCase().replace(/\s+/g, "_"),
      scheduledAt: schedIso,
      keywords: data.hashtags || [],
      metadata: {
        contentType: data.contentType || "Post",
        mediaUrls: data.mediaUrls || [],
        hashtags: data.hashtags || [],
        campaign: data.campaign || "General Campaign",
        time: data.time || "10:00 AM"
      }
    };

    try {
      const res = await fetch("/api/v1/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create content.");
      }

      const createdRow = json.data;
      const now = new Date();
      const newItem: ContentItem = {
        id: createdRow.id,
        title: createdRow.title,
        platform: (createdRow.platform?.toLowerCase() || data.platform || "instagram") as Platform,
        contentType: data.contentType || "Post",
        status: data.status || "Scheduled",
        caption: data.caption || "",
        mediaUrls: data.mediaUrls || [],
        hashtags: data.hashtags || [],
        campaign: data.campaign || "General Campaign",
        author: { id: "u-curr", name: "You", role: "Creator", email: "" },
        scheduledAt: data.scheduledAt || (schedIso ? new Date(schedIso).toLocaleString() : undefined),
        createdAt: "Just now",
        updatedAt: "Just now",
        day: data.day || now.getDate(),
        month: data.month || now.getMonth() + 1,
        year: data.year || now.getFullYear(),
        time: data.time || "10:00 AM",
        performance: {
          reach: "0",
          impressions: "0",
          likes: "0",
          comments: "0",
          shares: "0",
          saves: "0",
          clicks: "0",
          engagementRate: "0%"
        }
      };

      setContentItems((prev) => [newItem, ...prev]);
      showToast("Content Created", `"${newItem.title}" was saved to Content Studio.`);
      return newItem;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving post";
      showToast("Create Failed", msg, "error");
      throw err;
    }
  };

  const updateContentStatus = async (id: string, status: ContentStatus) => {
    try {
      await fetch(`/api/v1/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status.toUpperCase().replace(/\s+/g, "_") })
      });

      setContentItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, updatedAt: "Just now" } : item))
      );
      showToast("Status Updated", `Post status changed to ${status}.`);
    } catch (err) {
      showToast("Update Failed", "Could not update status on server.", "error");
    }
  };

  const duplicateContentItem = (id: string) => {
    const original = contentItems.find((i) => i.id === id);
    if (!original) return;
    createContentItem({
      ...original,
      title: `${original.title} (Copy)`,
      status: "Draft"
    });
  };

  const deleteContentItem = async (id: string) => {
    try {
      await fetch(`/api/v1/content/${id}`, { method: "DELETE" });
      setContentItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedContentItem?.id === id) setSelectedContentItem(null);
      showToast("Item Deleted", "Content item was removed from database.");
    } catch (err) {
      showToast("Delete Failed", "Could not delete content item.", "error");
    }
  };

  // Actions: Social Accounts
  const disconnectSocialAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/social/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to disconnect account.");
      }
      await refreshSocialAccounts();
      showToast("Account Disconnected", "Social account was unlinked.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      showToast("Disconnect Error", msg, "error");
    }
  };

  // Actions: Templates
  const createTemplate = async (data: Partial<Template>) => {
    try {
      const created = await apiJson<Template>("/api/v1/content-studio/templates", "POST", templatePayload({ name: "Untitled template", ...data }));
      setTemplates((prev) => [created, ...prev]);
      showToast("Template Created", `"${created.name}" saved to your templates.`);
    } catch (err) {
      showToast("Template Not Saved", errorText(err), "error");
    }
  };

  const toggleFavoriteTemplate = async (id: string) => {
    const current = templates.find((t) => t.id === id);
    if (!current) return;
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isFavorite: !current.isFavorite } : t)));
    try {
      await apiJson(`/api/v1/content-studio/templates/${id}`, "PATCH", { isFavorite: !current.isFavorite });
    } catch (err) {
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isFavorite: current.isFavorite } : t)));
      showToast("Update Failed", errorText(err), "error");
    }
  };

  const useTemplateToCreateContent = (template: Template) => {
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t)));
    apiJson(`/api/v1/content-studio/templates/${template.id}`, "PATCH", { incrementUsage: true }).catch(() => {});

    openEditorWithPrefill({
      title: `${template.name} Post`,
      caption: template.captionTemplate || `${template.headline || ""}\n\n${template.subheadline || ""}`,
      platform: template.platforms[0] || "instagram",
      mediaUrls: template.thumbnail ? [template.thumbnail] : []
    });
    showToast("Template Loaded", `Loaded into Content Editor.`);
  };

  const duplicateTemplate = async (id: string) => {
    const orig = templates.find((t) => t.id === id);
    if (!orig) return;
    try {
      const copy = await apiJson<Template>("/api/v1/content-studio/templates", "POST", templatePayload({ ...orig, name: `${orig.name} (Copy)`, isFavorite: false }));
      setTemplates((prev) => [copy, ...prev]);
      showToast("Template Duplicated", `Created a copy of "${orig.name}".`);
    } catch (err) {
      showToast("Duplicate Failed", errorText(err), "error");
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiJson(`/api/v1/content-studio/templates/${id}`, "DELETE");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateItem?.id === id) setSelectedTemplateItem(null);
      showToast("Template Deleted", "Template removed from library.");
    } catch (err) {
      showToast("Delete Failed", errorText(err), "error");
    }
  };

  const openTemplateCreator = (tpl?: Template) => {
    setTemplatePrefill(tpl || null);
    setIsTemplateModalOpen(true);
  };

  // Actions: Media Assets
  const uploadMediaAsset = async (file: File, options?: { folder?: string; onProgress?: (percent: number) => void }) => {
    try {
      const form = new FormData();
      form.append("file", file);
      if (options?.folder) form.append("folder", options.folder);
      const measured = await measureMedia(file);
      if (measured.width) form.append("width", String(measured.width));
      if (measured.height) form.append("height", String(measured.height));
      if (measured.duration) form.append("duration", String(measured.duration));

      // Prefer a direct upload to storage (no app-server size limits); fall back to uploading through the app.
      let asset = await uploadDirect(file, options?.folder, measured, options?.onProgress);
      if (!asset) {
        const { status, json } = await uploadWithProgress("POST", "/api/v1/content-studio/media", form, {}, options?.onProgress);
        if (status < 200 || status >= 300) throw new Error(json?.error?.message || `Upload failed (${status}).`);
        asset = json.data as MediaAsset;
      }
      setMediaAssets((prev) => [asset, ...prev]);
      showToast("Media Uploaded", `"${asset.name}" added to Media Library.`);
      return asset;
    } catch (err) {
      showToast("Upload Failed", errorText(err), "error");
      return null;
    }
  };

  const toggleFavoriteMedia = async (id: string) => {
    const current = mediaAssets.find((m) => m.id === id);
    if (!current) return;
    setMediaAssets((prev) => prev.map((m) => (m.id === id ? { ...m, isFavorite: !current.isFavorite } : m)));
    try {
      await apiJson(`/api/v1/content-studio/media/${id}`, "PATCH", { isFavorite: !current.isFavorite });
    } catch (err) {
      setMediaAssets((prev) => prev.map((m) => (m.id === id ? { ...m, isFavorite: current.isFavorite } : m)));
      showToast("Update Failed", errorText(err), "error");
    }
  };

  const deleteMediaAsset = async (id: string) => {
    try {
      await apiJson(`/api/v1/content-studio/media/${id}`, "DELETE");
      setMediaAssets((prev) => prev.filter((m) => m.id !== id));
      if (selectedMediaItem?.id === id) setSelectedMediaItem(null);
      showToast("Media Deleted", "Asset removed from Media Library.");
    } catch (err) {
      showToast("Delete Failed", errorText(err), "error");
    }
  };

  // Actions: Hashtags & Groups
  const createHashtagGroup = async (name: string, hashtagsList: string[]) => {
    try {
      const group = await apiJson<HashtagGroup>("/api/v1/content-studio/hashtag-groups", "POST", { name, hashtags: hashtagsList });
      setHashtagGroups((prev) => [group, ...prev]);
      showToast("Hashtag Group Created", `"${name}" with ${group.hashtags.length} hashtags created.`);
    } catch (err) {
      showToast("Group Not Saved", errorText(err), "error");
    }
  };

  const copyHashtagsToClipboard = (hashtagsText: string) => {
    navigator.clipboard.writeText(hashtagsText);
    showToast("Copied to Clipboard!", hashtagsText.slice(0, 60) + (hashtagsText.length > 60 ? "..." : ""));
  };

  const deleteHashtagGroup = async (id: string) => {
    try {
      await apiJson(`/api/v1/content-studio/hashtag-groups/${id}`, "DELETE");
      setHashtagGroups((prev) => prev.filter((g) => g.id !== id));
      showToast("Group Removed", "Hashtag group deleted.");
    } catch (err) {
      showToast("Delete Failed", errorText(err), "error");
    }
  };

  const openHashtagGroupModal = (group?: HashtagGroup) => {
    setSelectedHashtagGroup(group || null);
    setIsHashtagGroupModalOpen(true);
  };

  // Actions: Settings
  const updateSettings = async (newSettings: ContentStudioSettingsState) => {
    const previous = settings;
    setSettings(newSettings);
    try {
      await apiJson("/api/v1/content-studio/settings", "PUT", { settings: newSettings });
      showToast("Settings Saved", "Content Studio configuration updated successfully.");
    } catch (err) {
      setSettings(previous);
      showToast("Settings Not Saved", errorText(err), "error");
    }
  };

  // AI Text Generation via live API
  const generateAiText = async (prompt: string, kind = "content"): Promise<string> => {
    const res = await fetch("/api/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, kind })
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "AI generation failed.");
    }
    return json.data?.text || json.data?.content || json.data || "";
  };

  return (
    <ContentStudioContext.Provider
      value={{
        activeTab,
        setActiveTab,
        contentItems,
        templates,
        mediaAssets,
        hashtags,
        hashtagGroups,
        socialAccounts,
        settings,
        isLoadingContent,
        isLoadingAccounts,
        selectedContentItem,
        setSelectedContentItem,
        selectedTemplateItem,
        setSelectedTemplateItem,
        selectedMediaItem,
        setSelectedMediaItem,
        isEditorOpen,
        setIsEditorOpen,
        editorPrefill,
        openEditorWithPrefill,
        isTemplateModalOpen,
        setIsTemplateModalOpen,
        templatePrefill,
        openTemplateCreator,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isHashtagGroupModalOpen,
        setIsHashtagGroupModalOpen,
        selectedHashtagGroup,
        openHashtagGroupModal,
        isConnectModalOpen,
        setIsConnectModalOpen,
        connectModalDefaultPlatform,
        openConnectModal,
        closeConnectModal,
        createContentItem,
        updateContentStatus,
        duplicateContentItem,
        deleteContentItem,
        refreshContentItems,
        refreshSocialAccounts,
        disconnectSocialAccount,
        createTemplate,
        toggleFavoriteTemplate,
        useTemplateToCreateContent,
        duplicateTemplate,
        deleteTemplate,
        uploadMediaAsset,
        toggleFavoriteMedia,
        deleteMediaAsset,
        createHashtagGroup,
        copyHashtagsToClipboard,
        deleteHashtagGroup,
        updateSettings,
        generateAiText,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </ContentStudioContext.Provider>
  );
}

export function useContentStudio() {
  const context = useContext(ContentStudioContext);
  if (!context) {
    throw new Error("useContentStudio must be used within a ContentStudioProvider");
  }
  return context;
}
