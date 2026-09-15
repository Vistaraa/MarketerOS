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
  Tag
} from "lucide-react";
import { Platform, ContentType, ContentStatus, ContentItem } from "../types/content-studio-types";
import { useContentStudio } from "../context/content-studio-context";
import { PlatformIcon } from "./common-ui";

const PLATFORM_LIMITS: Record<Platform, { charLimit: number; name: string }> = {
  instagram: { charLimit: 2200, name: "Instagram" },
  facebook: { charLimit: 63206, name: "Facebook" },
  linkedin: { charLimit: 3000, name: "LinkedIn" },
  tiktok: { charLimit: 2200, name: "TikTok" },
  twitter: { charLimit: 280, name: "X (Twitter)" }
};

export function ContentEditorModal() {
  const {
    isEditorOpen,
    setIsEditorOpen,
    editorPrefill,
    createContentItem,
    mediaAssets,
    hashtagGroups,
    settings,
    showToast
  } = useContentStudio();

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [contentType, setContentType] = useState<ContentType>("Post");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [campaign, setCampaign] = useState("Summer Growth Blast");
  const [scheduledDay, setScheduledDay] = useState(15);
  const [scheduledTime, setScheduledTime] = useState("10:00 AM");
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>("/summer-sale-banner.png");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>(["#Marketing", "#DigitalGrowth"]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showHashtagPicker, setShowHashtagPicker] = useState(false);

  useEffect(() => {
    if (editorPrefill) {
      if (editorPrefill.platform) setPlatform(editorPrefill.platform);
      if (editorPrefill.contentType) setContentType(editorPrefill.contentType);
      if (editorPrefill.title) setTitle(editorPrefill.title);
      if (editorPrefill.caption) setCaption(editorPrefill.caption);
      if (editorPrefill.campaign) setCampaign(editorPrefill.campaign);
      if (editorPrefill.mediaUrls && editorPrefill.mediaUrls.length > 0) {
        setSelectedMediaUrl(editorPrefill.mediaUrls[0]);
      }
      if (editorPrefill.hashtags) setSelectedHashtags(editorPrefill.hashtags);
    } else {
      setTitle("");
      setCaption("");
    }
  }, [editorPrefill, isEditorOpen]);

  if (!isEditorOpen) return null;

  const currentLimit = PLATFORM_LIMITS[platform].charLimit;
  const isOverLimit = caption.length > currentLimit;

  const handleAiGenerate = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      const generated = `🚀 Unlocking exponential growth for your brand with ${title || "our new offer"}! Here are 3 game-changing steps to level up your social ROI today:\n\n1. Target the right audience\n2. Deliver high-value carousel hooks\n3. Leverage automated publishing\n\nDrop a comment below if you want early access! 👇`;
      setCaption(generated);
      showToast("AI Caption Generated", `Generated in ${settings.ai.aiTone} tone.`);
    }, 800);
  };

  const handleSave = (status: ContentStatus) => {
    if (!title.trim()) {
      showToast("Title Required", "Please enter a title for your content.", "error");
      return;
    }

    createContentItem({
      title,
      platform,
      contentType,
      status,
      caption,
      mediaUrls: [selectedMediaUrl],
      hashtags: selectedHashtags,
      campaign,
      day: Number(scheduledDay),
      time: scheduledTime,
      scheduledAt: `May ${scheduledDay}, 2024 · ${scheduledTime}`
    });

    setIsEditorOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
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

        {/* Content Form */}
        <div className="mt-4 space-y-4">
          {/* Target Social Platform */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Target Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {(["instagram", "facebook", "linkedin", "tiktok", "twitter"] as Platform[]).map((plat) => (
                <button
                  type="button"
                  key={plat}
                  onClick={() => setPlatform(plat)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    platform === plat
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <PlatformIcon platform={plat} className="w-3.5 h-3.5" />
                  <span className="capitalize">{plat === "twitter" ? "X / Twitter" : plat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Type & Campaign */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Content Format</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="input-clean"
              >
                <option value="Post">Standard Post</option>
                <option value="Carousel">Carousel Slides</option>
                <option value="Story">Story</option>
                <option value="Reel">Reel / Short Video</option>
                <option value="Video">Full Video</option>
                <option value="Ad">Sponsored Ad</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Campaign</label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. Summer Growth Blast"
                className="input-clean"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Post Title / Internal Topic</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale Launch Announcement"
              className="input-clean"
            />
          </div>

          {/* Caption with AI Button & Character Count */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Caption / Copy</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  <Sparkles size={12} />
                  <span>{isAiGenerating ? "Generating..." : `AI Draft (${settings.ai.aiTone})`}</span>
                </button>
                <span className={`text-[10px] font-mono ${isOverLimit ? "text-rose-600 font-bold" : "text-zinc-400"}`}>
                  {caption.length} / {currentLimit}
                </span>
              </div>
            </div>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption here or generate with AI..."
              className={`input-clean h-28 resize-none font-normal ${
                isOverLimit ? "border-rose-500 focus:ring-1 focus:ring-rose-500" : ""
              }`}
            />
            {isOverLimit && (
              <p className="mt-1 text-[10px] font-semibold text-rose-600">
                Warning: Character count exceeds {PLATFORM_LIMITS[platform].name} limit of {currentLimit} characters.
              </p>
            )}
          </div>

          {/* Media Asset Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Media Asset</label>
              <button
                type="button"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="text-[11px] font-semibold text-zinc-900 hover:underline flex items-center gap-1 dark:text-zinc-100"
              >
                <ImageIcon size={12} />
                <span>{showMediaPicker ? "Hide Media Picker" : "Select from Media Library"}</span>
              </button>
            </div>

            {showMediaPicker ? (
              <div className="grid grid-cols-4 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
                {mediaAssets.slice(0, 8).map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setSelectedMediaUrl(asset.url);
                      setShowMediaPicker(false);
                    }}
                    className={`group relative aspect-square overflow-hidden rounded-lg border cursor-pointer ${
                      selectedMediaUrl === asset.url ? "border-zinc-900 ring-2 ring-zinc-500 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <img src={asset.url || "/summer-sale-banner.png"} alt={asset.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">
                      Select
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-zinc-200 shrink-0 dark:bg-zinc-800">
                  <img src={selectedMediaUrl} alt="Selected" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-zinc-900 truncate dark:text-zinc-100">{selectedMediaUrl.split("/").pop()}</div>
                  <div className="text-[10px] text-zinc-400">Attached from Media Library</div>
                </div>
              </div>
            )}
          </div>

          {/* Hashtags Group Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Hashtags</label>
              <button
                type="button"
                onClick={() => setShowHashtagPicker(!showHashtagPicker)}
                className="text-[11px] font-semibold text-zinc-900 hover:underline flex items-center gap-1 dark:text-zinc-100"
              >
                <Hash size={12} />
                <span>{showHashtagPicker ? "Hide Hashtag Groups" : "Attach Hashtag Group"}</span>
              </button>
            </div>

            {showHashtagPicker ? (
              <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                {hashtagGroups.map((group) => (
                  <button
                    type="button"
                    key={group.id}
                    onClick={() => {
                      setSelectedHashtags(group.hashtags);
                      setShowHashtagPicker(false);
                      showToast("Attached Hashtag Group", `Loaded ${group.name}`);
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{group.name}</div>
                      <div className="text-[10px] text-zinc-400">{group.hashtags.join(" ")}</div>
                    </div>
                    <Tag size={12} className="text-zinc-500" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedHashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Schedule Day (May 2024)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={scheduledDay}
                onChange={(e) => setScheduledDay(Number(e.target.value))}
                className="input-clean"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Time</label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="10:00 AM"
                className="input-clean"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleSave("Draft")}
            className="btn-secondary"
          >
            Save Draft
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave("Scheduled")}
              className="btn-primary"
            >
              Schedule Content
            </button>
            <button
              type="button"
              onClick={() => handleSave("Published")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
