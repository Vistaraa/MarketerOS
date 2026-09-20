"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building,
  User,
  Users,
  ShieldCheck,
  Bell,
  Palette,
  Lock,
  Zap,
  Key,
  History,
  Check,
  Save,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  AlertTriangle,
  X,
  ExternalLink,
  Laptop,
  Smartphone,
  Download,
  Search,
  Eye,
  EyeOff,
  UserPlus,
  Sun,
  Moon,
  Monitor,
  Calendar,
  Clock,
  Globe,
  Sparkles,
  LogOut
} from "lucide-react";
import { AppShell, PageHeading } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import type { FullSettingsPayload } from "@/lib/settings-service";
import { resetClientSession } from "@/lib/client-session";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "general"
  | "profile"
  | "team"
  | "permissions"
  | "appearance"
  | "notifications"
  | "security"
  | "apikeys"
  | "audit";

export function LiveSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<FullSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    resetClientSession();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth/login");
      router.refresh();
    }
  };

  // Form states
  const [workspaceForm, setWorkspaceForm] = useState<any>({});
  const [profileForm, setProfileForm] = useState<any>({});
  const [notificationPrefs, setNotificationPrefs] = useState<any[]>([]);

  // Password Change state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Invite Team Member modal state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamInviteForm, setTeamInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    role: "MANAGER"
  });

  // Selected RBAC Role tab & permissions state
  const [selectedRbacRole, setSelectedRbacRole] = useState<string>("OWNER");
  const [permissionsState, setPermissionsState] = useState<Record<string, any[]>>({});

  // Security config state
  const [securityConfig, setSecurityConfig] = useState({
    twoFactorEnabled: true,
    sessionTimeout: "12h",
    ipWhitelistEnabled: false
  });

  // API Key creation modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdApiSecret, setCreatedApiSecret] = useState<string | null>(null);

  // Audit Log Search & Filter
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditModuleFilter, setAuditModuleFilter] = useState("all");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const applyThemeMode = (mode: string) => {
    setWorkspaceForm((prev: any) => ({ ...prev, theme: mode }));
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    } else {
      delete localStorage.theme;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const getFormattedSampleDate = (formatStr: string) => {
    if (formatStr === "yyyy-MM-dd") return "2026-09-16";
    if (formatStr === "dd/MM/yyyy") return "16/09/2026";
    if (formatStr === "MM/dd/yyyy") return "09/16/2026";
    return "Sep 16, 2026";
  };

  const getFormattedSampleTime = (formatStr: string) => {
    if (formatStr === "HH:mm") return "14:45";
    return "2:45 PM";
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
        if (payload.permissionsMatrix) {
          setPermissionsState(payload.permissionsMatrix);
        }
        if (payload.profile?.role) {
          setSelectedRbacRole(payload.profile.role);
        }
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Please fill in both current and new password.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to update password.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      triggerToast("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  };

  const handleInviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamInviteForm.firstName || !teamInviteForm.lastName || !teamInviteForm.email) {
      setError("First name, last name, and email are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamInviteForm)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to invite team member.");
      setIsTeamModalOpen(false);
      setTeamInviteForm({ firstName: "", lastName: "", email: "", jobTitle: "", role: "MANAGER" });
      triggerToast(`Invitation sent to ${payload.data.email || teamInviteForm.email}`);
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite team member.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this workspace?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/team/${memberId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to remove team member.");
      triggerToast(`${name} removed from workspace.`);
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team member.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNotifications = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: notificationPrefs })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save notifications.");
      triggerToast("Notification preferences updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification preferences.");
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

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? External tools using this key will be disconnected.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/settings/api-keys/${keyId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to revoke API key.");
      triggerToast("API key revoked.");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key.");
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePermission = (role: string, idx: number, field: string) => {
    setPermissionsState((prev) => {
      const list = [...(prev[role] || [])];
      if (list[idx]) {
        list[idx] = { ...list[idx], [field]: !list[idx][field] };
      }
      return { ...prev, [role]: list };
    });
  };

  const handleSavePermissions = () => {
    triggerToast(`Role-based permissions updated for ${selectedRbacRole}.`);
  };

  const handleToggleGoal = (goal: string) => {
    const currentGoals: string[] = workspaceForm.marketingGoals || [];
    const updated = currentGoals.includes(goal)
      ? currentGoals.filter((g) => g !== goal)
      : [...currentGoals, goal];
    setWorkspaceForm({ ...workspaceForm, marketingGoals: updated });
  };

  const exportAuditLogsCSV = () => {
    if (!data?.auditLogs) return;
    const headers = "Timestamp,User,Module,Action,EntityType,IPAddress\n";
    const rows = data.auditLogs
      .map((l) => `"${l.timestamp}","${l.user}","${l.module}","${l.action}","${l.entityType || ""}","${l.ipAddress || ""}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `audit-logs-${data.workspace.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadAnchor.click();
    URL.revokeObjectURL(url);
    triggerToast("Audit logs exported as CSV.");
  };

  const exportAuditLogs = () => {
    if (!data?.auditLogs) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.auditLogs, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `audit-logs-${data.workspace.slug}-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Audit logs downloaded.");
  };

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
          <RefreshCw size={18} className="animate-spin mr-2 text-zinc-400" /> Loading workspace configuration...
        </div>
      </AppShell>
    );
  }

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ElementType }> = [
    { id: "general", label: "General & Workspace", icon: Building },
    { id: "profile", label: "My Profile & Security", icon: User },
    { id: "team", label: "Team & Seats", icon: Users },
    { id: "permissions", label: "Roles & Permissions", icon: ShieldCheck },
    { id: "appearance", label: "Theme, Layout & Regional", icon: Palette },
    { id: "notifications", label: "Notification Matrix", icon: Bell },
    { id: "security", label: "Security & Sessions", icon: Lock },
    { id: "apikeys", label: "API Key Management", icon: Key },
    { id: "audit", label: "Audit Trail Logs", icon: History }
  ];

  const filteredAuditLogs = (data?.auditLogs || []).filter((log) => {
    if (!auditSearchQuery.trim()) return true;
    const q = auditSearchQuery.toLowerCase();
    return (
      log.user.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q) ||
      (log.ipAddress && log.ipAddress.includes(q))
    );
  });

  return (
    <AppShell title="Settings">
      <div className="space-y-6 text-xs">
        {/* Page Heading */}
        <PageHeading
          title="Workspace Settings & Control Center"
          description="Manage workspace profile, team permissions, notification rules, security parameters, developer API keys, and audit history."
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
              {activeSection === "appearance" && (
                <button onClick={saveWorkspaceSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                  <Save size={13} /> {busy ? "Saving..." : "Save Preferences"}
                </button>
              )}
              {activeSection === "team" && (
                <button onClick={() => setIsTeamModalOpen(true)} className="btn-primary flex items-center gap-1">
                  <UserPlus size={13} /> Invite Team Member
                </button>
              )}
              {activeSection === "apikeys" && (
                <button onClick={() => setIsApiKeyModalOpen(true)} className="btn-primary flex items-center gap-1">
                  <Plus size={13} /> Generate API Key
                </button>
              )}
              {activeSection === "audit" && (
                <button onClick={exportAuditLogs} className="btn-secondary flex items-center gap-1">
                  <Download size={13} /> Export Logs
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
          <div className="col-span-12 lg:col-span-3 space-y-3">
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

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Log Out of Account</span>
                </button>
              </div>
            </div>

            {/* Platform Integrations Link Card */}
            <div className="rounded-xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 shadow-2xs dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <Zap size={15} className="text-amber-500" />
                <span>Marketing Platforms</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Connect Google Ads, Meta, YouTube, Analytics, and social accounts on the Integrations page.
              </p>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Go to Platform Integrations <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Settings Content Area */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* SECTION 1: GENERAL & WORKSPACE */}
            {activeSection === "general" && workspaceForm && (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    General Workspace Identity
                  </h3>
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
                        placeholder="https://example.com"
                        className="input-clean mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Industry / Sector</label>
                      <input
                        value={workspaceForm.industry || ""}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, industry: e.target.value })}
                        placeholder="e.g. E-Commerce, SaaS, Digital Agency"
                        className="input-clean mt-1"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Default Currency</label>
                      <select
                        value={workspaceForm.currency || "USD"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, currency: e.target.value })}
                        className="input-clean mt-1"
                      >
                        <option value="USD">USD ($) - United States Dollar</option>
                        <option value="INR">INR (₹) - Indian Rupee</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                        <option value="CAD">CAD ($) - Canadian Dollar</option>
                        <option value="AUD">AUD ($) - Australian Dollar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Operational Timezone</label>
                      <input
                        value={workspaceForm.timezone || "UTC"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, timezone: e.target.value })}
                        placeholder="America/New_York or UTC"
                        className="input-clean mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Monthly Ad Budget Limit</label>
                      <input
                        type="number"
                        value={workspaceForm.monthlyBudget || 0}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, monthlyBudget: e.target.value })}
                        className="input-clean mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Country / Jurisdiction</label>
                      <input
                        value={workspaceForm.country || "United States"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, country: e.target.value })}
                        className="input-clean mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand & AI Positioning Parameters */}
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    Brand Identity & AI Engine Positioning
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Target Geographies</label>
                      <input
                        value={workspaceForm.targetGeo || ""}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, targetGeo: e.target.value })}
                        placeholder="e.g. North America, Western Europe, India"
                        className="input-clean mt-1"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Target Languages</label>
                      <input
                        value={workspaceForm.targetLanguages || ""}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, targetLanguages: e.target.value })}
                        placeholder="e.g. English, Spanish, French"
                        className="input-clean mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Target Audience Description</label>
                      <textarea
                        rows={2}
                        value={workspaceForm.targetAudience || ""}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, targetAudience: e.target.value })}
                        placeholder="Describe your ideal customer profile, target age, behaviors, or key pain points..."
                        className="input-clean mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Active Marketing Goals</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Sales & ROAS Optimization",
                          "Inbound Lead Generation",
                          "Brand Awareness & Reach",
                          "App Downloads & Installs",
                          "Social Media Engagement",
                          "Customer Retention & LTV"
                        ].map((goal) => {
                          const active = (workspaceForm.marketingGoals || []).includes(goal);
                          return (
                            <button
                              key={goal}
                              type="button"
                              onClick={() => handleToggleGoal(goal)}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-xs font-medium border transition cursor-pointer",
                                active
                                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                              )}
                            >
                              {active ? "✓ " : "+ "} {goal}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={saveWorkspaceSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                      <Save size={13} /> {busy ? "Saving..." : "Save Workspace Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: MY PROFILE & SECURITY */}
            {activeSection === "profile" && profileForm && (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    User Profile Information
                  </h3>
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
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Assigned System Role</label>
                      <input
                        value={profileForm.role || "OWNER"}
                        disabled
                        className="input-clean mt-1 bg-zinc-50 font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={saveProfileSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                      <Save size={13} /> {busy ? "Saving..." : "Save Profile Details"}
                    </button>
                  </div>
                </div>

                {/* Change Password Form */}
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    Account Password & Authentication
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Current Password</label>
                      <div className="relative mt-1">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="input-clean pr-8"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-2.5 text-zinc-400 hover:text-zinc-600"
                        >
                          {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">New Password</label>
                      <div className="relative mt-1">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="input-clean pr-8"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-2.5 text-zinc-400 hover:text-zinc-600"
                        >
                          {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="input-clean mt-1"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <button type="submit" disabled={busy} className="btn-secondary mt-2">
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Session & Account Control */}
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-6 shadow-2xs dark:border-rose-900/60 dark:bg-rose-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-rose-900 dark:text-rose-300 text-sm">Active Workspace Session</h3>
                      <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                        Log out of your active MarketerOS session on this browser window.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <LogOut size={14} />
                      <span>Log Out of Workspace</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: TEAM & SEATS */}
            {activeSection === "team" && data && (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Workspace Team Members</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Manage active users, assign role access levels, and invite new members.
                      </p>
                    </div>
                    <button onClick={() => setIsTeamModalOpen(true)} className="btn-primary flex items-center gap-1">
                      <UserPlus size={13} /> Invite Member
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                          <th className="p-3 pl-4">Member Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Job Title</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {(data.teamMembers || []).map((member) => (
                          <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                            <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-zinc-100">{member.name}</td>
                            <td className="p-3 font-mono text-zinc-500">{member.email}</td>
                            <td className="p-3 text-zinc-500">{member.jobTitle}</td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                                  member.role === "OWNER"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                    : member.role === "ADMIN"
                                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                                )}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                                  member.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                )}
                              >
                                {member.status}
                              </span>
                            </td>
                            <td className="p-3 pr-4 text-right">
                              {member.role !== "OWNER" && (
                                <button
                                  onClick={() => handleRemoveTeamMember(member.id, member.name)}
                                  className="text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: ROLES & PERMISSIONS MATRIX */}
            {activeSection === "permissions" && data && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Role-Based Access Control (RBAC) Matrix</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Capabilities and resource permissions for MarketerOS roles.</p>
                  </div>
                  {/* Role Selector Tabs */}
                  <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
                    {["OWNER", "ADMIN", "MANAGER", "ANALYST", "CONTENT_MANAGER"].map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRbacRole(role)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
                          selectedRbacRole === role
                            ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <th className="p-3 pl-4">Resource</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">View</th>
                        <th className="p-3">Create</th>
                        <th className="p-3">Edit</th>
                        <th className="p-3">Delete</th>
                        <th className="p-3 pr-4">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(permissionsState[selectedRbacRole] || data.permissionsMatrix[selectedRbacRole] || data.permissionsMatrix.OWNER).map((perm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                          <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-zinc-100">{perm.resource}</td>
                          <td className="p-3 uppercase text-[10px] font-bold text-zinc-400">{perm.category}</td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.view)}
                              disabled={selectedRbacRole === "OWNER"}
                              onChange={() => handleTogglePermission(selectedRbacRole, idx, "view")}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.create)}
                              disabled={selectedRbacRole === "OWNER"}
                              onChange={() => handleTogglePermission(selectedRbacRole, idx, "create")}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.edit)}
                              disabled={selectedRbacRole === "OWNER"}
                              onChange={() => handleTogglePermission(selectedRbacRole, idx, "edit")}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.delete)}
                              disabled={selectedRbacRole === "OWNER"}
                              onChange={() => handleTogglePermission(selectedRbacRole, idx, "delete")}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 pr-4">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.manage)}
                              disabled={selectedRbacRole === "OWNER"}
                              onChange={() => handleTogglePermission(selectedRbacRole, idx, "manage")}
                              className="rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-400">
                    {selectedRbacRole === "OWNER" ? "OWNER permissions are full system administrator defaults." : `Customizing access permissions for ${selectedRbacRole}`}
                  </span>
                  {selectedRbacRole !== "OWNER" && (
                    <button onClick={handleSavePermissions} className="btn-primary flex items-center gap-1">
                      <Save size={13} /> Save Role Permissions
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 5: THEME, LAYOUT & REGIONAL */}
            {activeSection === "appearance" && workspaceForm && (
              <div className="space-y-6">
                {/* Theme Visual Selector */}
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Visual Color Theme</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Select interface color theme. Clicking a card applies the theme live.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Light Theme Card */}
                    <button
                      type="button"
                      onClick={() => applyThemeMode("light")}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition cursor-pointer",
                        (workspaceForm.theme || "light") === "light"
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                        <Sun size={20} />
                      </div>
                      <div className="mt-3 font-bold text-zinc-900 dark:text-zinc-100 text-xs">Light Mode</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Clean high-contrast theme</div>
                      {(workspaceForm.theme || "light") === "light" && (
                        <span className="absolute top-2.5 right-2.5 grid h-4 w-4 place-items-center rounded-full bg-zinc-900 text-white text-[9px] dark:bg-zinc-100 dark:text-zinc-900">
                          ✓
                        </span>
                      )}
                    </button>

                    {/* Dark Theme Card */}
                    <button
                      type="button"
                      onClick={() => applyThemeMode("dark")}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition cursor-pointer",
                        workspaceForm.theme === "dark"
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        <Moon size={20} />
                      </div>
                      <div className="mt-3 font-bold text-zinc-900 dark:text-zinc-100 text-xs">Dark Mode</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Sleek obsidian night theme</div>
                      {workspaceForm.theme === "dark" && (
                        <span className="absolute top-2.5 right-2.5 grid h-4 w-4 place-items-center rounded-full bg-zinc-900 text-white text-[9px] dark:bg-zinc-100 dark:text-zinc-900">
                          ✓
                        </span>
                      )}
                    </button>

                    {/* System Theme Card */}
                    <button
                      type="button"
                      onClick={() => applyThemeMode("system")}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition cursor-pointer",
                        workspaceForm.theme === "system"
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <Monitor size={20} />
                      </div>
                      <div className="mt-3 font-bold text-zinc-900 dark:text-zinc-100 text-xs">System Preference</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Auto-switch with OS</div>
                      {workspaceForm.theme === "system" && (
                        <span className="absolute top-2.5 right-2.5 grid h-4 w-4 place-items-center rounded-full bg-zinc-900 text-white text-[9px] dark:bg-zinc-100 dark:text-zinc-900">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Regional Formats & Layout Defaults */}
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    Layout & Regional Preferences
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Default Landing View</label>
                      <select
                        value={workspaceForm.defaultDashboard || "overview"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, defaultDashboard: e.target.value })}
                        className="input-clean mt-1"
                      >
                        <option value="overview">Executive Overview Dashboard (/)</option>
                        <option value="campaigns">Campaigns & Ad Manager (/campaigns)</option>
                        <option value="leads">Leads & CRM Pipeline (/leads)</option>
                        <option value="analytics">Analytics & Reports (/analytics)</option>
                        <option value="content">Content Studio (/content-studio)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Workspace Language</label>
                      <select
                        value={workspaceForm.language || "en"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, language: e.target.value })}
                        className="input-clean mt-1"
                      >
                        <option value="en">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="fr">Français (French)</option>
                        <option value="de">Deutsch (German)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Date Display Format</label>
                      <select
                        value={workspaceForm.dateFormat || "MMM d, yyyy"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, dateFormat: e.target.value })}
                        className="input-clean mt-1 font-mono"
                      >
                        <option value="MMM d, yyyy">MMM d, yyyy (e.g. Sep 16, 2026)</option>
                        <option value="yyyy-MM-dd">yyyy-MM-dd (e.g. 2026-09-16)</option>
                        <option value="dd/MM/yyyy">dd/MM/yyyy (e.g. 16/09/2026)</option>
                        <option value="MM/dd/yyyy">MM/dd/yyyy (e.g. 09/16/2026)</option>
                      </select>
                      <p className="text-[10px] text-zinc-400 mt-1">Sample Preview: {getFormattedSampleDate(workspaceForm.dateFormat)}</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Time Display Format</label>
                      <select
                        value={workspaceForm.timeFormat || "h:mm a"}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, timeFormat: e.target.value })}
                        className="input-clean mt-1 font-mono"
                      >
                        <option value="h:mm a">12-hour clock (e.g. 2:45 PM)</option>
                        <option value="HH:mm">24-hour clock (e.g. 14:45)</option>
                      </select>
                      <p className="text-[10px] text-zinc-400 mt-1">Sample Preview: {getFormattedSampleTime(workspaceForm.timeFormat)}</p>
                    </div>
                  </div>
                </div>

                {/* Live Real-Time Regional Sample Card */}
                <div className="rounded-xl border border-zinc-200/90 bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 text-white shadow-md space-y-3 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-300">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Live Formats & Regional Preview</span>
                    </div>
                    <span className="rounded bg-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                      {workspaceForm.currency || "USD"} · {workspaceForm.timezone || "UTC"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-zinc-800/80 p-2.5">
                      <div className="text-[10px] text-zinc-400 font-medium">Sample Date</div>
                      <div className="font-mono font-bold text-white mt-0.5">{getFormattedSampleDate(workspaceForm.dateFormat)}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-800/80 p-2.5">
                      <div className="text-[10px] text-zinc-400 font-medium">Sample Time</div>
                      <div className="font-mono font-bold text-white mt-0.5">{getFormattedSampleTime(workspaceForm.timeFormat)}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-800/80 p-2.5">
                      <div className="text-[10px] text-zinc-400 font-medium">Active Theme</div>
                      <div className="font-bold text-white mt-0.5 capitalize">{workspaceForm.theme || "light"} Mode</div>
                    </div>
                    <div className="rounded-lg bg-zinc-800/80 p-2.5">
                      <div className="text-[10px] text-zinc-400 font-medium">Default Landing</div>
                      <div className="font-bold text-white mt-0.5 capitalize">{workspaceForm.defaultDashboard || "overview"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={saveWorkspaceSettings} disabled={busy} className="btn-primary flex items-center gap-1">
                    <Save size={13} /> {busy ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 6: NOTIFICATION MATRIX */}
            {activeSection === "notifications" && data && (
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Notification Channels & Matrix</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Select preferred notification channels for system alerts.</p>
                  </div>
                  <button onClick={handleSaveNotifications} disabled={busy} className="btn-primary">
                    {busy ? "Saving..." : "Save Notifications"}
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {notificationPrefs.map((pref, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{pref.label}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{pref.description}</div>
                      </div>
                      <div className="flex items-center gap-6 text-xs font-semibold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.inApp}
                            onChange={(e) => {
                              const updated = [...notificationPrefs];
                              updated[idx].inApp = e.target.checked;
                              setNotificationPrefs(updated);
                            }}
                            className="rounded"
                          />
                          <span>In-App</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.email}
                            onChange={(e) => {
                              const updated = [...notificationPrefs];
                              updated[idx].email = e.target.checked;
                              setNotificationPrefs(updated);
                            }}
                            className="rounded"
                          />
                          <span>Email</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 7: SECURITY & SESSIONS */}
            {activeSection === "security" && data && (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    Active User Sessions
                  </h3>
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
                            <div className="text-[11px] text-zinc-400">
                              {sess.browser} · IP: {sess.ipAddress} · {sess.lastActive}
                            </div>
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

            {/* SECTION 8: API KEY MANAGEMENT */}
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
                              <button onClick={() => handleRevokeApiKey(key.id)} className="text-rose-600 hover:underline">
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

            {/* SECTION 9: AUDIT TRAIL LOGS */}
            {activeSection === "audit" && data && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Workspace Audit Trail Log</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Real-time log of security events and workspace modifications.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="input-clean pl-8 py-1.5 text-xs w-48"
                        />
                      </div>
                      <button onClick={exportAuditLogs} className="btn-secondary flex items-center gap-1 py-1.5">
                        <Download size={13} /> Export JSON
                      </button>
                    </div>
                  </div>

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
                        {filteredAuditLogs.length > 0 ? (
                          filteredAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                              <td className="p-3 pl-4 text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{log.user}</td>
                              <td className="p-3 uppercase text-[10px] font-bold text-zinc-400">{log.module}</td>
                              <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</td>
                              <td className="p-3 pr-4 font-mono text-zinc-400">{log.ipAddress}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-zinc-400">
                              No audit logs match your query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INVITE TEAM MEMBER MODAL */}
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Invite Workspace Team Member</h3>
                <button onClick={() => setIsTeamModalOpen(false)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleInviteTeamMember} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">First Name</label>
                    <input
                      required
                      value={teamInviteForm.firstName}
                      onChange={(e) => setTeamInviteForm({ ...teamInviteForm, firstName: e.target.value })}
                      placeholder="Jane"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Last Name</label>
                    <input
                      required
                      value={teamInviteForm.lastName}
                      onChange={(e) => setTeamInviteForm({ ...teamInviteForm, lastName: e.target.value })}
                      placeholder="Doe"
                      className="input-clean mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={teamInviteForm.email}
                    onChange={(e) => setTeamInviteForm({ ...teamInviteForm, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="input-clean mt-1"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Job Title</label>
                  <input
                    value={teamInviteForm.jobTitle}
                    onChange={(e) => setTeamInviteForm({ ...teamInviteForm, jobTitle: e.target.value })}
                    placeholder="e.g. Senior PPC Specialist"
                    className="input-clean mt-1"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Workspace Role</label>
                  <select
                    value={teamInviteForm.role}
                    onChange={(e) => setTeamInviteForm({ ...teamInviteForm, role: e.target.value })}
                    className="input-clean mt-1"
                  >
                    <option value="ADMIN">ADMIN - Full Workspace Control</option>
                    <option value="MANAGER">MANAGER - Campaign & Content Manager</option>
                    <option value="ANALYST">ANALYST - Analytics & Reports Only</option>
                    <option value="CONTENT_MANAGER">CONTENT_MANAGER - Content & Social</option>
                  </select>
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsTeamModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className="btn-primary">
                    {busy ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* API KEY CREATION MODAL */}
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in">
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
