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
import {
  INITIAL_SETTINGS_STATE
} from "../data/mock-content-studio-data";

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
  uploadMediaAsset: (file: { name: string; type: string; size: number; url?: string; folderId?: string }) => void;
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

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "tpl-1",
    name: "Minimalist Product Spotlight",
    category: "Social Posts",
    platforms: ["instagram", "facebook"],
    thumbnail: "/summer-sale-banner.png",
    width: 1080,
    height: 1080,
    author: { id: "u-1", name: "Content Lead", role: "Creator", email: "team@marketeros.io" },
    usageCount: 12,
    isFavorite: true,
    isFeatured: true,
    updatedAt: "Today",
    headline: "Transform Your Workflow Today",
    subheadline: "Accelerate organic reach with our smart marketing engine.",
    captionTemplate: "Elevate your strategy with {{headline}}! ✨\n\n{{subheadline}}\n\nLearn more via link in bio.",
    variables: ["headline", "subheadline"],
    version: "v1.2"
  },
  {
    id: "tpl-2",
    name: "B2B Carousel Slide Deck",
    category: "Carousels",
    platforms: ["linkedin"],
    thumbnail: "/b2b-trends-carousel.png",
    width: 1080,
    height: 1350,
    author: { id: "u-1", name: "Content Lead", role: "Creator", email: "team@marketeros.io" },
    usageCount: 8,
    isFavorite: false,
    isFeatured: true,
    updatedAt: "Yesterday",
    headline: "5 Lessons in High-Growth Marketing",
    subheadline: "Swipe through to discover key tactics from top CMOs.",
    captionTemplate: "Here is what we learned scaling brand campaigns this quarter:\n\n1. Focus on core value\n2. Iterate quickly\n3. Engage authentic audiences\n\nFull breakdown below 👇",
    variables: ["headline", "subheadline"],
    version: "v1.0"
  },
  {
    id: "tpl-3",
    name: "Quick Tip Short Video",
    category: "Reels",
    platforms: ["tiktok", "instagram"],
    thumbnail: "/tiktok-tip-video.mp4",
    width: 1080,
    height: 1920,
    author: { id: "u-1", name: "Content Lead", role: "Creator", email: "team@marketeros.io" },
    usageCount: 15,
    isFavorite: true,
    isFeatured: true,
    updatedAt: "2 days ago",
    headline: "Growth Hack #12",
    subheadline: "30-second pattern interrupt strategy",
    captionTemplate: "Stop scrolling! 🛑 Here is how to double retention in 30 seconds:\n\n{{subheadline}}\n\nTry this on your next post!",
    variables: ["headline", "subheadline"],
    version: "v1.0"
  }
];

const DEFAULT_HASHTAG_GROUPS: HashtagGroup[] = [
  {
    id: "hg-1",
    name: "Growth & Scaling",
    hashtags: ["#GrowthMarketing", "#ScaleBusiness", "#MarketingTips", "#DigitalStrategy", "#B2BGrowth"],
    usageCount: 42,
    averagePerformance: 7.4,
    lastUsed: "Today",
    category: "Marketing"
  },
  {
    id: "hg-2",
    name: "E-commerce Boost",
    hashtags: ["#EcommerceTips", "#ShopifyStore", "#OnlineSales", "#RetailMarketing", "#BrandGrowth"],
    usageCount: 28,
    averagePerformance: 6.8,
    lastUsed: "Yesterday",
    category: "E-commerce"
  },
  {
    id: "hg-3",
    name: "Social Media Strategy",
    hashtags: ["#SocialMediaStrategy", "#ContentCreator", "#InstagramTips", "#LinkedInStrategy", "#OrganicGrowth"],
    usageCount: 54,
    averagePerformance: 8.2,
    lastUsed: "3 days ago",
    category: "Social"
  }
];

export function ContentStudioProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>("Content Calendar");

  // Core Datasets
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>(DEFAULT_HASHTAG_GROUPS);
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
  useEffect(() => {
    refreshContentItems();
    refreshSocialAccounts();

    // Load persisted local collections
    try {
      const savedTemplates = localStorage.getItem("cs_templates");
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));

      const savedMedia = localStorage.getItem("cs_media");
      if (savedMedia) setMediaAssets(JSON.parse(savedMedia));

      const savedHashtags = localStorage.getItem("cs_hashtag_groups");
      if (savedHashtags) setHashtagGroups(JSON.parse(savedHashtags));

      const savedSettings = localStorage.getItem("cs_settings");
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch {
      // ignore localStorage errors in non-browser environments
    }
  }, [refreshContentItems, refreshSocialAccounts]);

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
  const createTemplate = (data: Partial<Template>) => {
    const newTpl: Template = {
      id: `tpl-${Date.now()}`,
      name: data.name || "Custom Post Template",
      category: data.category || "Social Posts",
      platforms: data.platforms || ["instagram", "facebook"],
      thumbnail: data.thumbnail || "/summer-sale-banner.png",
      width: data.width || 1080,
      height: data.height || 1080,
      author: { id: "u-curr", name: "You", role: "Creator", email: "" },
      usageCount: 0,
      isFavorite: false,
      updatedAt: "Just now",
      headline: data.headline || "Headline",
      subheadline: data.subheadline || "Subheadline",
      captionTemplate: data.captionTemplate || "Write caption template...",
      variables: data.variables || ["headline", "subheadline"],
      version: "v1.0"
    };

    setTemplates((prev) => {
      const updated = [newTpl, ...prev];
      try { localStorage.setItem("cs_templates", JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast("Template Created", `"${newTpl.name}" saved to your templates.`);
  };

  const toggleFavoriteTemplate = (id: string) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
      try { localStorage.setItem("cs_templates", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const useTemplateToCreateContent = (template: Template) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => (t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t));
      try { localStorage.setItem("cs_templates", JSON.stringify(updated)); } catch {}
      return updated;
    });

    openEditorWithPrefill({
      title: `${template.name} Post`,
      caption: template.captionTemplate || `${template.headline || ""}\n\n${template.subheadline || ""}`,
      platform: template.platforms[0] || "instagram",
      mediaUrls: [template.thumbnail]
    });
    showToast("Template Loaded", `Loaded into Content Editor.`);
  };

  const duplicateTemplate = (id: string) => {
    const orig = templates.find((t) => t.id === id);
    if (!orig) return;
    const copy: Template = {
      ...orig,
      id: `tpl-${Date.now()}`,
      name: `${orig.name} (Copy)`,
      usageCount: 0,
      updatedAt: "Just now"
    };
    setTemplates((prev) => {
      const updated = [copy, ...prev];
      try { localStorage.setItem("cs_templates", JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast("Template Duplicated", `Created a copy of "${orig.name}".`);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try { localStorage.setItem("cs_templates", JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (selectedTemplateItem?.id === id) setSelectedTemplateItem(null);
    showToast("Template Deleted", "Template removed from library.");
  };

  const openTemplateCreator = (tpl?: Template) => {
    setTemplatePrefill(tpl || null);
    setIsTemplateModalOpen(true);
  };

  // Actions: Media Assets
  const uploadMediaAsset = (file: { name: string; type: string; size: number; url?: string; folderId?: string }) => {
    const isVid = file.type.includes("video") || file.name.endsWith(".mp4");
    const isGif = file.name.endsWith(".gif");
    const isDoc = file.name.endsWith(".pdf") || file.name.endsWith(".doc");
    const mediaType = isVid ? "Video" : isGif ? "GIF" : isDoc ? "Document" : "Image";

    const newMedia: MediaAsset = {
      id: `med-${Date.now()}`,
      name: file.name,
      type: mediaType,
      url: file.url || (isVid ? "/tiktok-tip-video.mp4" : "/summer-sale-banner.png"),
      thumbnail: isVid ? undefined : file.url || "/summer-sale-banner.png",
      size: file.size,
      width: isVid ? 1080 : 1200,
      height: isVid ? 1920 : 1200,
      duration: isVid ? 30 : undefined,
      folderId: file.folderId || "fld-1",
      folderName: "Campaign Assets",
      tags: ["Uploaded", mediaType],
      uploadedBy: { id: "u-curr", name: "You", role: "Creator", email: "" },
      createdAt: "Just now",
      updatedAt: "Just now",
      isFavorite: false,
      usedInPostsCount: 0
    };

    setMediaAssets((prev) => {
      const updated = [newMedia, ...prev];
      try { localStorage.setItem("cs_media", JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast("Media Uploaded", `"${newMedia.name}" added to Media Library.`);
  };

  const toggleFavoriteMedia = (id: string) => {
    setMediaAssets((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
      try { localStorage.setItem("cs_media", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const deleteMediaAsset = (id: string) => {
    setMediaAssets((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try { localStorage.setItem("cs_media", JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (selectedMediaItem?.id === id) setSelectedMediaItem(null);
    showToast("Media Deleted", "Asset removed from Media Library.");
  };

  // Actions: Hashtags & Groups
  const createHashtagGroup = (name: string, hashtagsList: string[]) => {
    const formatted = hashtagsList.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
    const newGroup: HashtagGroup = {
      id: `hg-${Date.now()}`,
      name,
      hashtags: formatted,
      usageCount: 0,
      averagePerformance: 6.5,
      lastUsed: "Just now",
      category: "Custom"
    };
    setHashtagGroups((prev) => {
      const updated = [newGroup, ...prev];
      try { localStorage.setItem("cs_hashtag_groups", JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast("Hashtag Group Created", `"${name}" with ${formatted.length} hashtags created.`);
  };

  const copyHashtagsToClipboard = (hashtagsText: string) => {
    navigator.clipboard.writeText(hashtagsText);
    showToast("Copied to Clipboard!", hashtagsText.slice(0, 60) + (hashtagsText.length > 60 ? "..." : ""));
  };

  const deleteHashtagGroup = (id: string) => {
    setHashtagGroups((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      try { localStorage.setItem("cs_hashtag_groups", JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast("Group Removed", "Hashtag group deleted.");
  };

  const openHashtagGroupModal = (group?: HashtagGroup) => {
    setSelectedHashtagGroup(group || null);
    setIsHashtagGroupModalOpen(true);
  };

  // Actions: Settings
  const updateSettings = (newSettings: ContentStudioSettingsState) => {
    setSettings(newSettings);
    try { localStorage.setItem("cs_settings", JSON.stringify(newSettings)); } catch {}
    showToast("Settings Saved", "Content Studio configuration updated successfully.");
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
