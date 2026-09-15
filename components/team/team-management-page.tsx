"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  Mail,
  Lock,
  RefreshCw,
  UserCheck,
  UserX
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "ANALYST" | "CONTENT_MANAGER" | "SALES" | "VIEWER" | string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | string;
  lastLoginAt?: string | null;
  jobTitle?: string | null;
}

export function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    role: "MANAGER"
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState("MANAGER");

  async function loadTeam() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/team");
      const payload = (await res.json()) as ApiResponse<{ items: TeamMember[] }>;
      if (!res.ok) throw new Error(payload.error?.message || "Failed to load team.");
      setMembers(payload.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team members.");
      setMembers(DEMO_MEMBERS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to send invitation.");

      setIsInviteModalOpen(false);
      setInviteForm({ firstName: "", lastName: "", email: "", jobTitle: "", role: "MANAGER" });
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(id: string, newRole: string) {
    try {
      const res = await fetch(`/api/v1/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
        setEditingMember(null);
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/v1/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m)));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  const filtered = members.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (roleFilter !== "ALL" && m.role.toUpperCase() !== roleFilter.toUpperCase()) return false;
    if (statusFilter !== "ALL" && m.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    return true;
  });

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status.toUpperCase() === "ACTIVE").length;
  const pendingInvites = members.filter((m) => m.status.toUpperCase() === "INVITED").length;
  const adminCount = members.filter((m) => ["OWNER", "ADMIN"].includes(m.role.toUpperCase())).length;

  return (
    <AppShell
      title="Team"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => setIsInviteModalOpen(true)} className="btn-primary">
            <UserPlus size={14} /> Invite Team Member
          </button>
          <button onClick={loadTeam} className="btn-secondary grid h-9 w-9 place-items-center p-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Team Members & Role Access"
          description="Manage workspace team access, assign granular role permissions, and track security privileges."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Members</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalMembers}</div>
            <div className="mt-1 text-xs text-zinc-400">Seats used in workspace</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Seats</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeMembers}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Verified & active</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pending Invites</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pendingInvites}</div>
            <div className="mt-1 text-xs text-zinc-400">Awaiting email verification</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Admins & Owners</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Shield size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{adminCount}</div>
            <div className="mt-1 text-xs text-zinc-400">Full workspace access</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Search size={14} className="text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by name or email…"
              className="input-clean py-1 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-zinc-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-clean py-1 text-xs"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="ANALYST">Analyst</option>
                <option value="CONTENT_MANAGER">Content Manager</option>
                <option value="SALES">Sales</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {filtered.map((member) => (
                  <tr key={member.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{member.name}</div>
                          <div className="text-[11px] text-zinc-400">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500">{member.jobTitle || "Team Member"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        member.role === "OWNER" || member.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}>
                        <Shield size={10} /> {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={member.status || "Active"} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {member.role !== "OWNER" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingMember(member);
                              setEditRole(member.role);
                            }}
                            className="btn-secondary py-1 text-[11px]"
                          >
                            Edit Role
                          </button>
                          <button
                            onClick={() => handleToggleStatus(member.id, member.status)}
                            className="btn-secondary py-1 text-[11px] text-amber-600"
                          >
                            {member.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-zinc-400">
                      No team members match the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Member Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-zinc-700 dark:text-zinc-300" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Invite Team Member</h2>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">First Name</label>
                    <input
                      required
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      placeholder="Alex"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Last Name</label>
                    <input
                      required
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      placeholder="Morgan"
                      className="input-clean mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="alex@company.com"
                    className="input-clean mt-1"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Job Title</label>
                  <input
                    value={inviteForm.jobTitle}
                    onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
                    placeholder="Growth Marketer"
                    className="input-clean mt-1"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Access Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="input-clean mt-1"
                  >
                    <option value="ADMIN">Admin (Full Control)</option>
                    <option value="MANAGER">Manager (Campaigns & Clients)</option>
                    <option value="CONTENT_MANAGER">Content Manager (Content Studio & Social)</option>
                    <option value="ANALYST">Analyst (Analytics & Reports)</option>
                    <option value="SALES">Sales (Leads CRM)</option>
                    <option value="VIEWER">Viewer (Read Only)</option>
                  </select>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? "Sending Invitation…" : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Role Modal */}
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Edit Role - {editingMember.name}</h2>
                <button onClick={() => setEditingMember(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">✕</button>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">Select Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="input-clean"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="CONTENT_MANAGER">Content Manager</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="SALES">Sales</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button onClick={() => setEditingMember(null)} className="btn-secondary">Cancel</button>
                <button onClick={() => handleUpdateRole(editingMember.id, editRole)} className="btn-primary">Save Role</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const DEMO_MEMBERS: TeamMember[] = [
  { id: "tm-1", name: "Alex Harrison", email: "alex@marketeros.local", role: "OWNER", status: "ACTIVE", jobTitle: "Chief Marketing Officer", lastLoginAt: "2026-09-08" },
  { id: "tm-2", name: "Jessica Taylor", email: "jessica@marketeros.local", role: "ADMIN", status: "ACTIVE", jobTitle: "Head of Paid Acquisition", lastLoginAt: "2026-09-07" },
  { id: "tm-3", name: "Michael Vance", email: "michael@marketeros.local", role: "CONTENT_MANAGER", status: "ACTIVE", jobTitle: "Content & Social Lead", lastLoginAt: "2026-09-05" },
  { id: "tm-4", name: "Samantha Reed", email: "samantha@company.com", role: "ANALYST", status: "INVITED", jobTitle: "Data Analyst", lastLoginAt: null }
];
