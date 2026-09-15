"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  Share2,
  Send,
  GitPullRequest,
  Bell,
  Users,
  Palette,
  Sparkles,
  Network,
  ShieldCheck,
  Check,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ChevronRight,
  Upload,
  Zap,
  Lock,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import { useContentStudio } from "../context/content-studio-context";
import { PlatformIcon, SubPageHeader } from "../components/common-ui";
import { Platform, WorkflowStep, ContentStudioSettingsState } from "../types/content-studio-types";

type SettingsCategory =
  | "General"
  | "Social Accounts"
  | "Publishing"
  | "Approval Workflow"
  | "Notifications"
  | "Team & Permissions"
  | "Branding"
  | "AI Settings"
  | "Integrations"
  | "Security";

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    socialAccounts,
    toggleSocialAccountConnect,
    workflowSteps,
    updateWorkflowSteps,
    setActiveTab,
    showToast
  } = useContentStudio();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("General");
  const [localSettings, setLocalSettings] = useState<ContentStudioSettingsState>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Workflow builder local state
  const [localWorkflow, setLocalWorkflow] = useState<WorkflowStep[]>(workflowSteps);

  const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
    { id: "General", label: "General Workspace", icon: Globe },
    { id: "Social Accounts", label: "Social Accounts", icon: Share2 },
    { id: "Publishing", label: "Publishing & Timing", icon: Send },
    { id: "Approval Workflow", label: "Approval Workflow", icon: GitPullRequest },
    { id: "Notifications", label: "Notifications", icon: Bell },
    { id: "Team & Permissions", label: "Team & Permissions", icon: Users },
    { id: "Branding", label: "Brand Kit & Styles", icon: Palette },
    { id: "AI Settings", label: "AI Copilot Config", icon: Sparkles },
    { id: "Integrations", label: "Integrations", icon: Network },
    { id: "Security", label: "Security & Sessions", icon: ShieldCheck }
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
    updateWorkflowSteps(localWorkflow);
    setHasUnsavedChanges(false);
  };

  const handleDiscardChanges = () => {
    setLocalSettings(settings);
    setLocalWorkflow(workflowSteps);
    setHasUnsavedChanges(false);
    showToast("Changes Discarded", "Reverted to previously saved settings.", "info");
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header with Navigation Tabs */}
      <SubPageHeader
        title="Content Studio Settings"
        subtitle="Configure publishing rules, connected social channels, team roles, and AI behaviors."
        secondaryActionLabel="← Back to Calendar"
        onSecondaryAction={() => setActiveTab("Content Calendar")}
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
        </div>

        {/* RIGHT PANEL CONTENT (9 cols) */}
        <div className="lg:col-span-9 rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-6">
          {/* PANEL 1: GENERAL */}
          {activeCategory === "General" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">General Workspace Configuration</h3>
                <p className="text-[11px] text-zinc-400">Set regional standards, default timezones, and display preferences.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={localSettings.general.workspaceName}
                    onChange={(e) => handleFieldChange("general", "workspaceName", e.target.value)}
                    className="input-clean"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Default Timezone</label>
                  <select
                    value={localSettings.general.defaultTimezone}
                    onChange={(e) => handleFieldChange("general", "defaultTimezone", e.target.value)}
                    className="input-clean"
                  >
                    <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                    <option>(GMT-08:00) Pacific Time (US & Canada)</option>
                    <option>(GMT+00:00) UTC / London</option>
                    <option>(GMT+05:30) India Standard Time (IST)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Language</label>
                  <select
                    value={localSettings.general.defaultLanguage}
                    onChange={(e) => handleFieldChange("general", "defaultLanguage", e.target.value)}
                    className="input-clean"
                  >
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Hindi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Default Landing View</label>
                  <select
                    value={localSettings.general.defaultLandingPage}
                    onChange={(e) => handleFieldChange("general", "defaultLandingPage", e.target.value)}
                    className="input-clean"
                  >
                    <option>Content Calendar</option>
                    <option>Content Library</option>
                    <option>Templates</option>
                    <option>Media Library</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 2: SOCIAL ACCOUNTS */}
          {activeCategory === "Social Accounts" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connected Social Media Accounts</h3>
                <p className="text-[11px] text-zinc-400">Authorize API permissions for auto-publishing and analytics tracking.</p>
              </div>

              <div className="grid gap-3">
                {socialAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <PlatformIcon platform={acc.platform} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{acc.accountName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{acc.handle} · Last synced: {acc.lastSynced}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        acc.status === "Connected"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {acc.status}
                      </span>
                      <button
                        onClick={() => toggleSocialAccountConnect(acc.id)}
                        className="btn-secondary py-1 text-xs"
                      >
                        {acc.status === "Connected" ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 3: PUBLISHING SETTINGS */}
          {activeCategory === "Publishing" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Publishing & Auto-Scheduling Rules</h3>
                <p className="text-[11px] text-zinc-400">Configure global defaults for scheduling and auto-publication.</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "autoPublish", label: "Auto Publish Scheduled Posts", desc: "Automatically publish posts when scheduled timestamp is reached" },
                  { key: "scheduleConfirmation", label: "Schedule Confirmation Dialog", desc: "Require double confirmation before committing posts to calendar" },
                  { key: "retryFailedPosts", label: "Auto Retry Failed Publications", desc: "Attempt up to 3 automatic retries if platform API drops connection" },
                  { key: "crossPlatformPublishing", label: "Cross-Platform Single Click Publish", desc: "Allow simultaneous broadcast to Instagram, Facebook, and LinkedIn" }
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

          {/* PANEL 4: APPROVAL WORKFLOW */}
          {activeCategory === "Approval Workflow" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Multi-Stage Content Approval Workflow</h3>
                <p className="text-[11px] text-zinc-400">Require multi-step review before content goes live.</p>
              </div>

              <div className="space-y-2">
                {localWorkflow.map((step, idx) => (
                  <div key={step.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{step.name}</div>
                        <div className="text-[10px] text-zinc-400">Role: {step.role} · Assignee: {step.assignee}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Required</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 5: NOTIFICATIONS */}
          {activeCategory === "Notifications" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Notification Preferences</h3>
                <p className="text-[11px] text-zinc-400">Manage alerts across In-App, Email, and Mobile Push channels.</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "postPublishedInApp", label: "Post Published Notification" },
                  { key: "postScheduledInApp", label: "Post Scheduled Alert" },
                  { key: "postFailedEmail", label: "Publication Failure Email Warning" },
                  { key: "approvalRequestedInApp", label: "Content Review Requested Alert" }
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
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

          {/* PANEL 6: AI SETTINGS */}
          {activeCategory === "AI Settings" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AI Copilot & Generation Tone</h3>
                <p className="text-[11px] text-zinc-400">Configure default voice, tone, and automated caption generation parameters.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">AI Voice Tone</label>
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
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Creativity Temperature</label>
                  <select
                    value={localSettings.ai.creativity}
                    onChange={(e) => handleFieldChange("ai", "creativity", e.target.value)}
                    className="input-clean"
                  >
                    <option value="Low">Low (Factual & Direct)</option>
                    <option value="Medium">Medium (Balanced)</option>
                    <option value="High">High (Highly Creative & Engaging)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 7: INTEGRATIONS */}
          {activeCategory === "Integrations" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connected Third-Party Integrations</h3>
                <p className="text-[11px] text-zinc-400">Sync with cloud storage, design tools, and messaging channels.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "Canva", desc: "Design graphics directly in Content Studio", status: "Connected" },
                  { name: "Google Drive", desc: "Import images & videos from Drive", status: "Connected" },
                  { name: "Slack", desc: "Receive approval alerts in Slack", status: "Connected" },
                  { name: "Dropbox", desc: "Sync media assets with Dropbox", status: "Not Connected" }
                ].map((ig) => (
                  <div key={ig.name} className="rounded-xl border border-zinc-200 p-4 space-y-2 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{ig.name}</span>
                      <span className={`text-[10px] font-bold ${ig.status === "Connected" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>{ig.status}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">{ig.desc}</div>
                  </div>
                ))}
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
