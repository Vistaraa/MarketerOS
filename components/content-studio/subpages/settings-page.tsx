"use client";

import React, { useState } from "react";
import {
  Globe,
  Share2,
  Send,
  Bell,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { PlatformIcon, SubPageHeader, StatusBadge } from "../components/common-ui";
import { Platform, ContentStudioSettingsState } from "../types/content-studio-types";

type SettingsCategory =
  | "Social Accounts"
  | "Publishing"
  | "AI Settings"
  | "Notifications"
  | "General";

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    socialAccounts,
    disconnectSocialAccount,
    openConnectModal,
    setActiveTab,
    showToast
  } = useContentStudio();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("Social Accounts");
  const [localSettings, setLocalSettings] = useState<ContentStudioSettingsState>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
    { id: "Social Accounts", label: "Connected Channels", icon: Share2 },
    { id: "Publishing", label: "Publishing & Timing", icon: Send },
    { id: "AI Settings", label: "AI Copilot Config", icon: Sparkles },
    { id: "Notifications", label: "Alerts & Notifications", icon: Bell },
    { id: "General", label: "General Workspace", icon: Globe }
  ];

  const handleFieldChange = (section: keyof ContentStudioSettingsState, field: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    updateSettings(localSettings);
    setHasUnsavedChanges(false);
  };

  const handleDiscardChanges = () => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
    showToast("Changes Discarded", "Reverted to previously saved settings.", "info");
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect "${name}"? You will need to re-enter credentials to publish to this account.`)) {
      return;
    }
    setDisconnectingId(id);
    try {
      await disconnectSocialAccount(id);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header with Navigation Tabs */}
      <SubPageHeader
        title="Content Studio Settings"
        subtitle="Manage authenticated social channels, publishing rules, AI tone, and global defaults."
        secondaryActionLabel="← Back to Calendar"
        onSecondaryAction={() => setActiveTab("Content Calendar")}
        primaryActionLabel="+ Connect Channel"
        onPrimaryAction={() => openConnectModal()}
      />

      {hasUnsavedChanges && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="font-bold">You have unsaved changes in your settings</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardChanges}
              className="btn-secondary py-1 text-xs"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSaveChanges}
              className="btn-primary py-1 text-xs"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: Left Category Nav + Right Selected Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT SETTINGS SIDEBAR (3 cols) */}
        <div className="lg:col-span-3 space-y-1">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-2 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs font-medium space-y-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                    isActive
                      ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"} />
                    <span>{cat.label}</span>
                  </div>
                  <ChevronRight size={13} className={isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300"} />
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 text-[11px] text-zinc-500 space-y-1 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
              <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>Encrypted Storage</span>
            </div>
            <p className="leading-relaxed">
              API tokens are encrypted with AES-256 and synced across MarketerOS workspace modules.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL CONTENT (9 cols) */}
        <div className="lg:col-span-9 rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-6">
          {/* PANEL 1: CONNECTED SOCIAL ACCOUNTS */}
          {activeCategory === "Social Accounts" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Connected Social Media Channels
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Manage API access tokens and connected pages for direct publishing and scheduling.
                  </p>
                </div>
                <button
                  onClick={() => openConnectModal()}
                  className="btn-primary py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Connect Social Account</span>
                </button>
              </div>

              {socialAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center space-y-3 dark:border-zinc-800">
                  <div className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Share2 size={20} className="text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">No Connected Channels</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-0.5">
                      Connect your Instagram, Facebook, LinkedIn, TikTok, or X accounts to begin publishing and scheduling posts.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {(["instagram", "facebook", "linkedin", "tiktok", "twitter"] as Platform[]).map((plat) => (
                      <button
                        key={plat}
                        onClick={() => openConnectModal(plat)}
                        className="btn-secondary py-1 text-xs capitalize flex items-center gap-1.5"
                      >
                        <PlatformIcon platform={plat} className="w-3.5 h-3.5" />
                        <span>Connect {plat === "twitter" ? "X" : plat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {socialAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white shadow-2xs border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800">
                          <PlatformIcon platform={acc.platform} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                              {acc.accountName}
                            </span>
                            <StatusBadge status={acc.status} />
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>{acc.handle}</span>
                            {acc.followersCount && (
                              <>
                                <span>•</span>
                                <span>{acc.followersCount} Followers</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Last synced: {acc.lastSynced}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openConnectModal(acc.platform)}
                          className="btn-secondary py-1.5 text-xs flex items-center gap-1"
                        >
                          <RefreshCw size={12} />
                          <span>Update Token</span>
                        </button>
                        <button
                          onClick={() => handleDisconnect(acc.id, acc.accountName)}
                          disabled={disconnectingId === acc.id}
                          className="btn-secondary py-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 flex items-center gap-1"
                        >
                          {disconnectingId === acc.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PANEL 2: PUBLISHING SETTINGS */}
          {activeCategory === "Publishing" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Publishing & Auto-Scheduling Rules
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Configure default scheduling behavior, platform defaults, and automated dispatch.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "autoPublish", label: "Auto Publish Scheduled Posts", desc: "Automatically publish posts when the scheduled date and time is reached." },
                  { key: "scheduleConfirmation", label: "Schedule Confirmation Dialog", desc: "Require confirmation before committing posts to the production calendar." },
                  { key: "retryFailedPosts", label: "Auto Retry Failed Publications", desc: "Attempt up to 3 automatic retries if platform API drops connection." },
                  { key: "crossPlatformPublishing", label: "Cross-Platform Publishing Allowed", desc: "Allow publishing the same creative simultaneously across multiple channels." }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.label}</div>
                      <div className="text-[11px] text-zinc-400">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(localSettings.publishing as any)[item.key]}
                      onChange={(e) => handleFieldChange("publishing", item.key, e.target.checked)}
                      className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 3: AI SETTINGS */}
          {activeCategory === "AI Settings" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  AI Copilot & Generation Parameters
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Configure default voice tone and creativity temperature used by the live AI generator.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    AI Voice Tone
                  </label>
                  <select
                    value={localSettings.ai.aiTone}
                    onChange={(e) => handleFieldChange("ai", "aiTone", e.target.value)}
                    className="input-clean"
                  >
                    <option value="Professional">Professional & Authoritative</option>
                    <option value="Friendly">Friendly & Conversational</option>
                    <option value="Creative">Creative & Bold</option>
                    <option value="Educational">Educational & Informative</option>
                    <option value="Luxury">Luxury & Premium</option>
                    <option value="Minimal">Minimalist & Direct</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Creativity Temperature
                  </label>
                  <select
                    value={localSettings.ai.creativity}
                    onChange={(e) => handleFieldChange("ai", "creativity", e.target.value)}
                    className="input-clean"
                  >
                    <option value="Low">Low (Factual & Direct)</option>
                    <option value="Medium">Medium (Balanced)</option>
                    <option value="High">High (Engaging & Imaginative)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 4: NOTIFICATIONS */}
          {activeCategory === "Notifications" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Notification Alerts
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Control system alerts when posts are published, scheduled, or fail.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "postPublishedInApp", label: "Post Published Notification" },
                  { key: "postScheduledInApp", label: "Post Scheduled Alert" },
                  { key: "postFailedEmail", label: "Publication Failure Alert" },
                  { key: "performanceReportsEmail", label: "Weekly Performance Digest" }
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{n.label}</span>
                    <input
                      type="checkbox"
                      checked={(localSettings.notifications as any)[n.key]}
                      onChange={(e) => handleFieldChange("notifications", n.key, e.target.checked)}
                      className="accent-zinc-900 dark:accent-zinc-100 h-4 w-4"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 5: GENERAL WORKSPACE */}
          {activeCategory === "General" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  General Workspace Settings
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Configure default view preferences for Content Studio.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={localSettings.general.workspaceName}
                    onChange={(e) => handleFieldChange("general", "workspaceName", e.target.value)}
                    className="input-clean"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Default Landing View
                  </label>
                  <select
                    value={localSettings.general.defaultLandingPage}
                    onChange={(e) => handleFieldChange("general", "defaultLandingPage", e.target.value)}
                    className="input-clean"
                  >
                    <option>Content Calendar</option>
                    <option>Content Library</option>
                    <option>Templates</option>
                    <option>Media Library</option>
                    <option>Hashtags</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Save Action Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button onClick={handleDiscardChanges} className="btn-secondary">
              Reset Defaults
            </button>
            <button onClick={handleSaveChanges} className="btn-primary">
              Save All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
