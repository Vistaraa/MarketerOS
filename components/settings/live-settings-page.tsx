"use client";

import React, { useEffect, useState } from "react";
import {
  Building,
  User,
  Users,
  ShieldCheck,
  Bell,
  Palette,
  Globe,
  Lock,
  Zap,
  Sparkles,
  FileText,
  Share2,
  SlidersHorizontal,
  HardDrive,
  Key,
  History,
  Check,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  AlertTriangle,
  X,
  ExternalLink,
  Laptop,
  Smartphone
} from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import type { FullSettingsPayload } from "@/lib/settings-service";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "general"
  | "profile"
  | "team"
  | "permissions"
  | "notifications"
  | "appearance"
  | "localization"
  | "security"
  | "integrations"
  | "ai"
  | "content"
  | "social"
  | "automation"
  | "data"
  | "apikeys"
  | "audit";

export function LiveSettingsPage() {
  const [data, setData] = useState<FullSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [workspaceForm, setWorkspaceForm] = useState<any>({});
  const [profileForm, setProfileForm] = useState<any>({});
  const [notificationPrefs, setNotificationPrefs] = useState<any[]>([]);

  // API Key creation modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdApiSecret, setCreatedApiSecret] = useState<string | null>(null);

  // Delete Workspace Modal State
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/settings")
      .then(async (res) => {
        const payload = (await res.json()) as ApiResponse<FullSettingsPayload>;
        if (!res.ok) throw new Error(payload.error?.message || "Failed to load settings.");
        return payload.data;
      })
      .then((payload) => {
        setData(payload);
        setWorkspaceForm(payload.workspace);
        setProfileForm(payload.profile);
        setNotificationPrefs(payload.notificationPreferences);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load settings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveWorkspaceSettings = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspaceForm)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save workspace settings.");
      triggerToast("Workspace settings updated successfully.");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace settings.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfileSettings = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to update profile.");
      triggerToast("User profile updated successfully.");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to create API key.");
      setCreatedApiSecret(payload.data.rawKey);
      setNewKeyName("");
      triggerToast("API key created successfully. Store the secret safely!");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
          <RefreshCw size={18} className="animate-spin mr-2 text-zinc-400" /> Loading central settings configuration...
        </div>
      </AppShell>
    );
  }

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ElementType; category?: string }> = [
    { id: "general", label: "General & Workspace", icon: Building, category: "Workspace" },
    { id: "profile", label: "My Profile", icon: User, category: "Personal" },
    { id: "team", label: "Team & Seats", icon: Users, category: "Organization" },
    { id: "permissions", label: "Roles & Permissions", icon: ShieldCheck, category: "Organization" },
    { id: "notifications", label: "Notification Matrix", icon: Bell, category: "Preferences" },
    { id: "appearance", label: "Theme & Layout", icon: Palette, category: "Preferences" },
    { id: "localization", label: "Regional & Formats", icon: Globe, category: "Preferences" },
    { id: "security", label: "Security & Sessions", icon: Lock, category: "Security" },
    { id: "integrations", label: "Platform Integrations", icon: Zap, category: "Integrations" },
    { id: "ai", label: "AI Engine Rules", icon: Sparkles, category: "Modules" },
    { id: "content", label: "Content Studio Defaults", icon: FileText, category: "Modules" },
    { id: "social", label: "Social Brand Profiles", icon: Share2, category: "Modules" },
    { id: "automation", label: "Automation Policy", icon: SlidersHorizontal, category: "Modules" },
    { id: "data", label: "Data Export & Privacy", icon: HardDrive, category: "Data" },
    { id: "apikeys", label: "API Key Management", icon: Key, category: "Developer" },
    { id: "audit", label: "Audit Trail Logs", icon: History, category: "Developer" }
  ];

  return (
    <AppShell title="Settings">
      <div className="space-y-6 text-xs">
        {/* Page Heading */}
        <PageHeading
          title="Central Settings & Workspace Control"
          description="Configure your workspace profile, team roles, API keys, platform integrations, security policies, and audit logs."
          action={
            <div className="flex items-center gap-2">
              {activeSection === "general" && (
                <button onClick={saveWorkspaceSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                  <Save size={13} /> {busy ? "Saving..." : "Save Workspace"}
                </button>
              )}
              {activeSection === "profile" && (
                <button onClick={saveProfileSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                  <Save size={13} /> {busy ? "Saving..." : "Save Profile"}
                </button>
              )}
              {activeSection === "apikeys" && (
                <button onClick={() => setIsApiKeyModalOpen(true)} className="btn-primary flex items-center gap-1">
                  <Plus size={13} /> Generate API Key
                </button>
              )}
            </div>
          }
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check size={15} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Main Settings Grid: Sidebar + Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Settings Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-1">
            <div className="rounded-xl border border-zinc-200/90 bg-white p-2 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition",
                      isActive
                        ? "bg-zinc-900 font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    <Icon size={14} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Content Area */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* SECTION 1: GENERAL & WORKSPACE */}
            {activeSection === "general" && workspaceForm && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">General Workspace Identity</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Workspace Name</label>
                    <input
                      value={workspaceForm.name || ""}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Workspace Slug</label>
                    <input
                      value={workspaceForm.slug || ""}
                      disabled
                      className="input-clean mt-1 bg-zinc-50 font-mono text-zinc-400 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Company Website</label>
                    <input
                      value={workspaceForm.website || ""}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, website: e.target.value })}
                      className="input-clean mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Industry / Sector</label>
                    <input
                      value={workspaceForm.industry || ""}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, industry: e.target.value })}
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Default Currency</label>
                    <select
                      value={workspaceForm.currency}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, currency: e.target.value })}
                      className="input-clean mt-1"
                    >
                      <option value="USD">USD ($) - United States Dollar</option>
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Operational Timezone</label>
                    <input
                      value={workspaceForm.timezone}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, timezone: e.target.value })}
                      className="input-clean mt-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: MY PROFILE */}
            {activeSection === "profile" && profileForm && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">User Profile & Account Info</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">First Name</label>
                    <input
                      value={profileForm.firstName || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Last Name</label>
                    <input
                      value={profileForm.lastName || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                    <input
                      value={profileForm.email || ""}
                      disabled
                      className="input-clean mt-1 bg-zinc-50 font-mono text-zinc-400 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Job Title</label>
                    <input
                      value={profileForm.jobTitle || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Phone Number</label>
                    <input
                      value={profileForm.phone || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="input-clean mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Workspace Role</label>
                    <input
                      value={profileForm.role}
                      disabled
                      className="input-clean mt-1 bg-zinc-50 font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: ROLES & PERMISSIONS MATRIX */}
            {activeSection === "permissions" && data && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">Role-Based Access Control (RBAC) Matrix</h3>
                <p className="text-xs text-zinc-500">Resource capabilities assigned to member roles across MarketerOS.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <th className="p-3 pl-4">Resource</th>
                        <th className="p-3">View</th>
                        <th className="p-3">Create</th>
                        <th className="p-3">Edit</th>
                        <th className="p-3">Delete</th>
                        <th className="p-3 pr-4">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(data.permissionsMatrix[data.profile.role] || data.permissionsMatrix.OWNER).map((perm, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                          <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-zinc-100">{perm.resource}</td>
                          <td className="p-3">{perm.view ? <Check size={14} className="text-emerald-600" /> : "—"}</td>
                          <td className="p-3">{perm.create ? <Check size={14} className="text-emerald-600" /> : "—"}</td>
                          <td className="p-3">{perm.edit ? <Check size={14} className="text-emerald-600" /> : "—"}</td>
                          <td className="p-3">{perm.delete ? <Check size={14} className="text-emerald-600" /> : "—"}</td>
                          <td className="p-3 pr-4">{perm.manage ? <Check size={14} className="text-emerald-600" /> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 5: NOTIFICATION MATRIX */}
            {activeSection === "notifications" && data && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Notification Channels & Categories</h3>
                  <button onClick={() => triggerToast("Notification matrix updated.")} className="btn-primary">
                    Save Notifications
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {notificationPrefs.map((pref, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{pref.label}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{pref.description}</div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked={pref.inApp} className="rounded" />
                          <span>In-App</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked={pref.email} className="rounded" />
                          <span>Email</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 8: SECURITY & SESSIONS */}
            {activeSection === "security" && data && (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">Active User Sessions</h3>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.securitySessions.map((sess) => (
                      <div key={sess.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                            {sess.device.includes("iPhone") ? <Smartphone size={16} /> : <Laptop size={16} />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <span>{sess.device}</span>
                              {sess.isCurrent && (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400">{sess.browser} · IP: {sess.ipAddress} · {sess.lastActive}</div>
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <button onClick={() => triggerToast("Session revoked.")} className="text-rose-600 hover:underline">
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 15: API KEY MANAGEMENT */}
            {activeSection === "apikeys" && data && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Developer API Keys</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Secret keys for external webhooks, integrations, and server SDKs.</p>
                    </div>
                    <button onClick={() => setIsApiKeyModalOpen(true)} className="btn-primary flex items-center gap-1">
                      <Plus size={13} /> Generate API Key
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                          <th className="p-3 pl-4">Key Name</th>
                          <th className="p-3">Prefix</th>
                          <th className="p-3">Created</th>
                          <th className="p-3">Last Used</th>
                          <th className="p-3 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.apiKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                            <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-zinc-100">{key.name}</td>
                            <td className="p-3 font-mono text-zinc-500">{key.keyPrefix}...</td>
                            <td className="p-3 text-zinc-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                            <td className="p-3 text-zinc-500">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</td>
                            <td className="p-3 pr-4 text-right">
                              <button onClick={() => triggerToast("API key revoked.")} className="text-rose-600 hover:underline">
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 16: AUDIT TRAIL LOGS */}
            {activeSection === "audit" && data && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">Workspace Audit Trail Log</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                          <th className="p-3 pl-4">Timestamp</th>
                          <th className="p-3">User</th>
                          <th className="p-3">Module</th>
                          <th className="p-3">Action</th>
                          <th className="p-3 pr-4">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                            <td className="p-3 pl-4 text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{log.user}</td>
                            <td className="p-3 uppercase text-[10px] font-bold text-zinc-400">{log.module}</td>
                            <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</td>
                            <td className="p-3 pr-4 font-mono text-zinc-400">{log.ipAddress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API KEY CREATION MODAL */}
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Generate Developer API Key</h3>
                <button onClick={() => { setIsApiKeyModalOpen(false); setCreatedApiSecret(null); }} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              {!createdApiSecret ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Key Identifier / Name</label>
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Production Webhook Key"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                    <button onClick={() => setIsApiKeyModalOpen(false)} className="btn-secondary">
                      Cancel
                    </button>
                    <button onClick={handleCreateApiKey} disabled={busy || !newKeyName.trim()} className="btn-primary">
                      {busy ? "Generating..." : "Generate Secret"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <strong>Copy this API key secret now!</strong> It will never be displayed again.
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={createdApiSecret} readOnly className="input-clean font-mono text-xs text-zinc-900 dark:text-zinc-100 select-all" />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdApiSecret);
                        triggerToast("API secret copied to clipboard.");
                      }}
                      className="btn-secondary py-2"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button onClick={() => { setIsApiKeyModalOpen(false); setCreatedApiSecret(null); }} className="btn-primary">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
