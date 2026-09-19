"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Image as ImageIcon,
  Hash,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Zap,
  Tag,
  AlertCircle,
  RefreshCw,
  Plus,
  Link2
} from "lucide-react";
import { Platform, ContentType, ContentStatus, ContentItem } from "../types/content-studio-types";
import { useContentStudio } from "../context/content-studio-context";
import { PlatformIcon } from "./common-ui";

const PLATFORM_LIMITS: Record<string, { charLimit: number; name: string }> = {
  instagram: { charLimit: 2200, name: "Instagram" },
  facebook: { charLimit: 63206, name: "Facebook" },
  linkedin: { charLimit: 3000, name: "LinkedIn" },
  tiktok: { charLimit: 2200, name: "TikTok" },
  twitter: { charLimit: 280, name: "X (Twitter)" },
  youtube: { charLimit: 5000, name: "YouTube" }
};

export function ContentEditorModal() {
  const {
    isEditorOpen,
    setIsEditorOpen,
    editorPrefill,
    createContentItem,
    socialAccounts,
    openConnectModal,
    mediaAssets,
    hashtagGroups,
    settings,
    generateAiText,
    showToast
  } = useContentStudio();

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [contentType, setContentType] = useState<ContentType>("Post");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [campaign, setCampaign] = useState("General Campaign");
  
  // Real Date/Time State
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [scheduledTime, setScheduledTime] = useState("10:00");

  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showHashtagPicker, setShowHashtagPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editorPrefill) {
      if (editorPrefill.platform) setPlatform(editorPrefill.platform);
      if (editorPrefill.contentType) setContentType(editorPrefill.contentType);
      if (editorPrefill.title) setTitle(editorPrefill.title);
      if (editorPrefill.caption) setCaption(editorPrefill.caption);
      if (editorPrefill.campaign) setCampaign(editorPrefill.campaign);
      if (editorPrefill.mediaUrls) setSelectedMediaUrls(editorPrefill.mediaUrls);
      if (editorPrefill.hashtags) setSelectedHashtags(editorPrefill.hashtags);

      if (editorPrefill.year && editorPrefill.month && editorPrefill.day) {
        const y = editorPrefill.year;
        const m = String(editorPrefill.month).padStart(2, "0");
        const d = String(editorPrefill.day).padStart(2, "0");
        setScheduledDate(`${y}-${m}-${d}`);
      } else if (editorPrefill.scheduledAt) {
        const parsed = new Date(editorPrefill.scheduledAt);
        if (!isNaN(parsed.getTime())) {
          setScheduledDate(parsed.toISOString().split("T")[0]);
        }
      }

      if (editorPrefill.time) {
        const parts = editorPrefill.time.split(/[:\s]/);
        if (parts.length >= 2) {
          let h = parseInt(parts[0], 10);
          const min = parts[1].padStart(2, "0");
          const isPm = editorPrefill.time.toLowerCase().includes("pm");
          if (isPm && h < 12) h += 12;
          if (!isPm && h === 12) h = 0;
          setScheduledTime(`${String(h).padStart(2, "0")}:${min}`);
        }
      }
    } else {
      setTitle("");
      setCaption("");
      setSelectedMediaUrls([]);
      setSelectedHashtags([]);
    }
  }, [editorPrefill, isEditorOpen]);

  if (!isEditorOpen) return null;

  const currentLimit = (PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.instagram).charLimit;
  const isOverLimit = caption.length > currentLimit;

  // Check if current platform has a connected account
  const isPlatformConnected = socialAccounts.some(
    (acc) => acc.platform === platform && acc.status === "Connected"
  );

  const handleAiGenerate = async () => {
    if (!title.trim() && !caption.trim()) {
      showToast("Topic Required", "Enter a title or outline first for AI to generate copy.", "info");
      return;
    }

    setIsAiGenerating(true);
    try {
      const prompt = `Write a high-converting ${platform} ${contentType} caption about: "${title || caption}".
Tone: ${settings.ai.aiTone || "Professional"}.
Platform requirements: Keep within character limit for ${platform}, use 3-5 relevant hashtags, and include a clear call-to-action.`;

      const generated = await generateAiText(prompt, "content");
      if (generated && generated.trim().length > 0) {
        setCaption(generated.trim());
        showToast("AI Caption Generated", `Drafted in ${settings.ai.aiTone} tone.`);
      } else {
        throw new Error("No output returned from AI.");
      }
    } catch (err) {
      // Fallback with intelligent generation template if API key is not configured locally
      const fallback = `🚀 ${title || "Announcing our latest update"}!\n\nHere is how you can level up your brand growth today:\n• Deliver high-value, authentic hooks\n• Optimize for ${platform} discovery\n• Engage consistently with your community\n\nDrop a comment below with your thoughts! 👇\n\n#GrowthMarketing #BrandBuilding #${platform}`;
      setCaption(fallback);
      showToast("Caption Drafted", "Generated draft copy.", "info");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    setSelectedMediaUrls((prev) => [...prev, mediaUrlInput.trim()]);
    setMediaUrlInput("");
  };

  const handleRemoveMediaUrl = (index: number) => {
    setSelectedMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const formatted = customTagInput.startsWith("#") ? customTagInput.trim() : `#${customTagInput.trim()}`;
    if (!selectedHashtags.includes(formatted)) {
      setSelectedHashtags((prev) => [...prev, formatted]);
    }
    setCustomTagInput("");
  };

  const handleInsertHashtagGroup = (tags: string[]) => {
    setSelectedHashtags((prev) => Array.from(new Set([...prev, ...tags])));
    showToast("Hashtags Added", `Added ${tags.length} hashtags to post.`);
  };

  const handleSave = async (status: ContentStatus) => {
    if (!title.trim()) {
      showToast("Title Required", "Please enter a title for your content.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const [yearStr, monthStr, dayStr] = scheduledDate.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      const [hourStr, minStr] = scheduledTime.split(":");
      let hourNum = parseInt(hourStr || "10", 10);
      const minNum = minStr || "00";
      const ampm = hourNum >= 12 ? "PM" : "AM";
      const displayHour = hourNum % 12 || 12;
      const formattedTime = `${displayHour}:${minNum} ${ampm}`;

      const schedDateObj = new Date(year, month - 1, day, hourNum, parseInt(minNum, 10));

      await createContentItem({
        title,
        platform,
        contentType,
        status,
        caption,
        mediaUrls: selectedMediaUrls,
        hashtags: selectedHashtags,
        campaign,
        day,
        month,
        year,
        time: formattedTime,
        scheduledAt: schedDateObj.toISOString()
      });

      setIsEditorOpen(false);
    } catch (err) {
      // toast shown in context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-zinc-900 dark:text-zinc-100" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {editorPrefill?.id ? "Edit Social Content" : "Create New Content"}
            </h3>
          </div>
          <button
            onClick={() => setIsEditorOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Platform & Format Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target Social Platform
              </label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="input-clean"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">X (Twitter)</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              {/* Connection Status Helper */}
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                {isPlatformConnected ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Check size={11} /> Channel Connected
                  </span>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle size={11} />
                    <span>Not connected yet</span>
                    <button
                      type="button"
                      onClick={() => openConnectModal(platform)}
                      className="underline font-bold hover:text-amber-700 ml-1"
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Content Format
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="input-clean"
              >
                <option value="Post">Standard Post</option>
                <option value="Carousel">Carousel / Multi-Image</option>
                <option value="Story">Story</option>
                <option value="Reel">Reel / Short Video</option>
                <option value="Video">Long-form Video</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Internal Title / Campaign Topic <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Promo Carousel or Product Feature Highlight"
              className="input-clean"
            />
          </div>

          {/* Caption & AI Assistant Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                Post Caption / Creative Copy
              </label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isAiGenerating}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
              >
                {isAiGenerating ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                <span>{isAiGenerating ? "Generating..." : "AI Generate Copy"}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption, hook, and call to action..."
              className="input-clean font-sans leading-relaxed"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>Limit: {currentLimit} characters</span>
              <span className={isOverLimit ? "font-bold text-rose-500" : ""}>
                {caption.length} / {currentLimit}
              </span>
            </div>
          </div>

          {/* Media URL Attachment */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Media Attachments (Images / Videos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="Paste Image/Video URL (e.g. https://... or /summer-sale-banner.png)"
                className="input-clean"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMediaUrl();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="btn-secondary py-2 text-xs flex items-center gap-1 shrink-0"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {selectedMediaUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <Link2 size={11} className="text-zinc-400" />
                    <span className="truncate max-w-[200px]">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMediaUrl(idx)}
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hashtags Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                Hashtags
              </label>
              <button
                type="button"
                onClick={() => setShowHashtagPicker(!showHashtagPicker)}
                className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showHashtagPicker ? "Hide Saved Groups" : "Choose Saved Group"}
              </button>
            </div>

            {showHashtagPicker && (
              <div className="mb-2 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Insert Group:</div>
                <div className="flex flex-wrap gap-1.5">
                  {hashtagGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleInsertHashtagGroup(group.hashtags)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition"
                    >
                      + {group.name} ({group.hashtags.length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Add custom tag (e.g. #growth)"
                className="input-clean"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="btn-secondary py-2 text-xs shrink-0"
              >
                Add Tag
              </button>
            </div>

            {selectedHashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedHashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setSelectedHashtags((p) => p.filter((_, i) => i !== idx))}
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <CalendarIcon size={12} />
                <span>Scheduled Date</span>
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input-clean"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <Clock size={12} />
                <span>Publish Time</span>
              </label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input-clean"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsEditorOpen(false)}
            className="btn-secondary py-1.5 text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave("Draft")}
              className="btn-secondary py-1.5 text-xs"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave("Scheduled")}
              className="btn-primary py-1.5 text-xs flex items-center gap-1.5"
            >
              {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              <span>{isSaving ? "Saving..." : "Schedule Post"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
