"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  ContentStatus
} from "../types/content-studio-types";
import {
  MOCK_CONTENT_ITEMS,
  MOCK_TEMPLATES,
  MOCK_MEDIA_ASSETS,
  MOCK_HASHTAGS,
  MOCK_HASHTAG_GROUPS,
  MOCK_SOCIAL_ACCOUNTS,
  MOCK_WORKFLOW_STEPS,
  INITIAL_SETTINGS_STATE,
  MOCK_USERS
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
  workflowSteps: WorkflowStep[];
  settings: ContentStudioSettingsState;

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

  // Actions: Content Items
  createContentItem: (item: Partial<ContentItem>) => ContentItem;
  updateContentStatus: (id: string, status: ContentStatus) => void;
  duplicateContentItem: (id: string) => void;
  deleteContentItem: (id: string) => void;

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

  // Actions: Settings & Workflow
  updateSettings: (newSettings: ContentStudioSettingsState) => void;
  updateWorkflowSteps: (steps: WorkflowStep[]) => void;
  toggleSocialAccountConnect: (id: string) => void;

  // Toast System
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const ContentStudioContext = createContext<ContentStudioContextType | undefined>(undefined);

export function ContentStudioProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>("Content Calendar");

  // Core Datasets
  const [contentItems, setContentItems] = useState<ContentItem[]>(MOCK_CONTENT_ITEMS);
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(MOCK_MEDIA_ASSETS);
  const [hashtags, setHashtags] = useState<Hashtag[]>(MOCK_HASHTAGS);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>(MOCK_HASHTAG_GROUPS);
  const [socialAccounts, setSocialAccounts] = useState<ConnectedSocialAccount[]>(MOCK_SOCIAL_ACCOUNTS);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(MOCK_WORKFLOW_STEPS);
  const [settings, setSettings] = useState<ContentStudioSettingsState>(INITIAL_SETTINGS_STATE);

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

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to open content editor with prefilled state
  const openEditorWithPrefill = (prefill: Partial<ContentItem>) => {
    setEditorPrefill(prefill);
    setIsEditorOpen(true);
  };

  // Sync with backend API
  useEffect(() => {
    fetch("/api/v1/content")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.data?.items?.length) {
          const loaded: ContentItem[] = payload.data.items.map((row: any) => ({
            id: row.id,
            title: row.title || "Untitled Content",
            platform: (row.platform?.toLowerCase() || "instagram") as any,
            contentType: row.type || "Post",
            status: row.status === "PUBLISHED" ? "Published" : row.status === "SCHEDULED" ? "Scheduled" : row.status === "IN_REVIEW" ? "In review" : "Draft",
            caption: row.body || "",
            mediaUrls: ["/summer-sale-banner.png"],
            hashtags: row.keywords || ["#Marketing"],
            campaign: "General Campaign",
            author: { id: row.createdBy?.id || "u1", name: row.createdBy?.name || "Author", email: "author@marketeros.local", role: "Manager", avatar: "/avatar-1.png" },
            scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toLocaleDateString() : "Sep 15, 2026",
            createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "Just now",
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "Just now",
            day: row.scheduledAt ? new Date(row.scheduledAt).getDate() : 15,
            month: row.scheduledAt ? new Date(row.scheduledAt).getMonth() + 1 : 9,
            year: row.scheduledAt ? new Date(row.scheduledAt).getFullYear() : 2026,
            time: "10:00 AM"
          }));
          setContentItems(loaded);
        }
      })
      .catch((err) => console.error("Content API sync error:", err));
  }, []);

  // Content Actions
  const createContentItem = (data: Partial<ContentItem>): ContentItem => {
    const newItem: ContentItem = {
      id: `post-${Date.now()}`,
      title: data.title || "Untitled Social Post",
      platform: data.platform || "instagram",
      contentType: data.contentType || "Post",
      status: data.status || "Scheduled",
      caption: data.caption || "",
      mediaUrls: data.mediaUrls || ["/summer-sale-banner.png"],
      hashtags: data.hashtags || ["#Marketing", "#DigitalGrowth"],
      campaign: data.campaign || "General Campaign",
      author: MOCK_USERS[0],
      scheduledAt: data.scheduledAt || "Sep 15, 2026 · 10:00 AM",
      createdAt: "Sep 8, 2026",
      updatedAt: "Sep 8, 2026",
      day: data.day || 15,
      month: data.month || 9,
      year: data.year || 2026,
      time: data.time || "10:00 AM",
      performance: {
        reach: "10.0K - 15.0K",
        impressions: "12.5K",
        likes: "850",
        comments: "94",
        shares: "45",
        saves: "120",
        clicks: "320",
        engagementRate: "4.2%",
        predictedScore: "90/100"
      }
    };

    // Persist to backend
    fetch("/api/v1/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newItem.title,
        body: newItem.caption,
        type: newItem.contentType,
        platform: newItem.platform
      })
    }).catch((e) => console.error("Failed to save content to backend:", e));

    setContentItems((prev) => [newItem, ...prev]);
    showToast("Content Created", `"${newItem.title}" was added to Content Library and Calendar.`);
    return newItem;
  };

  const updateContentStatus = (id: string, status: ContentStatus) => {
    fetch(`/api/v1/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status.toUpperCase().replace(" ", "_") })
    }).catch((e) => console.error("Failed to update status on backend:", e));

    setContentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, updatedAt: "Just now" } : item))
    );
    showToast("Status Updated", `Post status changed to ${status}.`);
  };

  const duplicateContentItem = (id: string) => {
    const original = contentItems.find((i) => i.id === id);
    if (!original) return;
    const copy: ContentItem = {
      ...original,
      id: `post-${Date.now()}`,
      title: `${original.title} (Copy)`,
      status: "Draft",
      createdAt: "Just now",
      updatedAt: "Just now"
    };
    setContentItems((prev) => [copy, ...prev]);
    showToast("Content Duplicated", `Created a copy in Drafts.`);
  };

  const deleteContentItem = (id: string) => {
    const item = contentItems.find((i) => i.id === id);
    setContentItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedContentItem?.id === id) setSelectedContentItem(null);
    showToast("Item Deleted", item ? `"${item.title}" was removed.` : "Content item deleted.");
  };

  // Template Actions
  const createTemplate = (data: Partial<Template>) => {
    const newTpl: Template = {
      id: `tpl-${Date.now()}`,
      name: data.name || "Custom Branded Template",
      category: data.category || "Social Posts",
      platforms: data.platforms || ["instagram", "facebook"],
      thumbnail: data.thumbnail || "/collection-preview.png",
      width: data.width || 1080,
      height: data.height || 1080,
      author: MOCK_USERS[0],
      usageCount: 0,
      isFavorite: false,
      updatedAt: "Just now",
      headline: data.headline || "Headline Text",
      subheadline: data.subheadline || "Subheadline Text",
      captionTemplate: data.captionTemplate || "Write caption template...",
      variables: data.variables || ["headline", "subheadline"],
      version: "v1.0"
    };
    setTemplates((prev) => [newTpl, ...prev]);
    showToast("Template Created", `"${newTpl.name}" saved to My Templates.`);
  };

  const toggleFavoriteTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const useTemplateToCreateContent = (template: Template) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t))
    );

    // Pre-fill content editor with template variables
    openEditorWithPrefill({
      title: `${template.name} Post`,
      caption: template.captionTemplate || `${template.headline}\n\n${template.subheadline}`,
      platform: template.platforms[0] || "instagram",
      mediaUrls: [template.thumbnail]
    });
    showToast("Using Template", `Loaded template into Content Editor.`);
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
    setTemplates((prev) => [copy, ...prev]);
    showToast("Template Duplicated", `Created a copy of "${orig.name}".`);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplateItem?.id === id) setSelectedTemplateItem(null);
    showToast("Template Deleted", "Template removed from library.");
  };

  const openTemplateCreator = (tpl?: Template) => {
    setTemplatePrefill(tpl || null);
    setIsTemplateModalOpen(true);
  };

  // Media Actions
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
      folderName: "Campaigns",
      tags: ["Uploaded", mediaType],
      uploadedBy: MOCK_USERS[0],
      createdAt: "Just now",
      updatedAt: "Just now",
      isFavorite: false,
      usedInPostsCount: 0
    };

    setMediaAssets((prev) => [newMedia, ...prev]);
    showToast("File Uploaded", `"${newMedia.name}" added to Media Library.`);
  };

  const toggleFavoriteMedia = (id: string) => {
    setMediaAssets((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
  };

  const deleteMediaAsset = (id: string) => {
    setMediaAssets((prev) => prev.filter((m) => m.id !== id));
    if (selectedMediaItem?.id === id) setSelectedMediaItem(null);
    showToast("Media Deleted", "Asset removed from Media Library.");
  };

  // Hashtag Actions
  const createHashtagGroup = (name: string, hashtagsList: string[]) => {
    const formatted = hashtagsList.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
    const newGroup: HashtagGroup = {
      id: `hg-${Date.now()}`,
      name,
      hashtags: formatted,
      usageCount: 0,
      averagePerformance: 5.8,
      lastUsed: "Just now",
      category: "Custom"
    };
    setHashtagGroups((prev) => [newGroup, ...prev]);
    showToast("Hashtag Group Created", `"${name}" with ${formatted.length} hashtags created.`);
  };

  const copyHashtagsToClipboard = (hashtagsText: string) => {
    navigator.clipboard.writeText(hashtagsText);
    showToast("Copied to Clipboard!", hashtagsText.slice(0, 60) + "...");
  };

  const deleteHashtagGroup = (id: string) => {
    setHashtagGroups((prev) => prev.filter((g) => g.id !== id));
    showToast("Group Removed", "Hashtag group deleted.");
  };

  const openHashtagGroupModal = (group?: HashtagGroup) => {
    setSelectedHashtagGroup(group || null);
    setIsHashtagGroupModalOpen(true);
  };

  // Settings Actions
  const updateSettings = (newSettings: ContentStudioSettingsState) => {
    setSettings(newSettings);
    showToast("Settings Saved", "Content Studio configuration updated successfully.");
  };

  const updateWorkflowSteps = (steps: WorkflowStep[]) => {
    setWorkflowSteps(steps);
    showToast("Workflow Updated", "Approval workflow steps re-ordered.");
  };

  const toggleSocialAccountConnect = (id: string) => {
    setSocialAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const isConn = acc.status === "Connected";
          return {
            ...acc,
            status: isConn ? "Disconnected" : "Connected",
            lastSynced: isConn ? "Never" : "Just now"
          };
        }
        return acc;
      })
    );
    showToast("Account Updated", "Social account status modified.");
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
        workflowSteps,
        settings,
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
        createContentItem,
        updateContentStatus,
        duplicateContentItem,
        deleteContentItem,
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
        updateWorkflowSteps,
        toggleSocialAccountConnect,
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
