"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Grid,
  List,
  Edit3,
  Trash2,
  Archive,
  RefreshCw
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import { money } from "@/lib/utils";

interface ClientRow {
  id: string;
  name: string;
  slug?: string;
  industry?: string | null;
  website?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currency?: string;
  timezone?: string;
  monthlyBudget?: number | null;
  campaigns?: Array<{ id: string; name: string; spend?: number; roas?: number }>;
  leads?: Array<{ id: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    website: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    currency: "USD",
    timezone: "UTC",
    monthlyBudget: "5000",
    status: "ACTIVE"
  });
  const [submitting, setSubmitting] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
    confirmText?: string;
    cancelText?: string;
    confirmTone?: "primary" | "danger" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "" });

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/clients");
      const payload = (await res.json()) as ApiResponse<{ items: ClientRow[] }>;
      if (!res.ok) throw new Error(payload.error?.message || "Failed to load clients.");
      setClients(payload.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load clients.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function openModal(client?: ClientRow) {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || "",
        industry: client.industry || "",
        website: client.website || "",
        contactName: client.contactName || "",
        contactEmail: client.contactEmail || "",
        contactPhone: client.contactPhone || "",
        currency: client.currency || "USD",
        timezone: client.timezone || "UTC",
        monthlyBudget: client.monthlyBudget ? String(client.monthlyBudget) : "5000",
        status: client.status || "ACTIVE"
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        industry: "E-Commerce",
        website: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        currency: "USD",
        timezone: "UTC",
        monthlyBudget: "5000",
        status: "ACTIVE"
      });
    }
    setIsModalOpen(true);
  }

  const openCreateModal = () => openModal();
  const openEditModal = (client: ClientRow) => openModal(client);

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingClient ? `/api/v1/clients/${editingClient.id}` : "/api/v1/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          industry: formData.industry || undefined,
          website: formData.website || undefined,
          contactName: formData.contactName || undefined,
          contactEmail: formData.contactEmail || undefined,
          contactPhone: formData.contactPhone || undefined,
          currency: formData.currency,
          timezone: formData.timezone,
          monthlyBudget: Number(formData.monthlyBudget) || 0,
          status: formData.status
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save client.");

      setIsModalOpen(false);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClient(id: string) {
    setDialogConfig({
      isOpen: true,
      title: "Delete Client Workspace",
      message: "Are you sure you want to delete this client workspace?",
      type: "confirm",
      confirmText: "Delete Workspace",
      confirmTone: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/clients/${id}`, { method: "DELETE" });
          if (res.ok) {
            setClients((prev) => prev.filter((c) => c.id !== id));
          }
        } catch (err) {
          console.error("Failed to delete client:", err);
        }
      }
    });
  }

  const filtered = clients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.industry?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "ALL" && c.status.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    return true;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status.toUpperCase() === "ACTIVE").length;
  const totalBudgetSum = clients.reduce((acc, c) => acc + (Number(c.monthlyBudget) || 0), 0);

  return (
    <AppShell
      title="Clients"
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={openCreateModal}
            className="btn-primary h-8 px-2.5 sm:px-3.5"
            title="Add Client"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Client</span>
          </button>
          <button onClick={loadClients} className="btn-secondary grid h-8 w-8 place-items-center p-0" title="Refresh">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Client Workspaces & Accounts"
          description="Manage client brands, budget allocation, multi-tenant performance, and isolated accounts."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Clients</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Building2 size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalClients}</div>
            <div className="mt-1 text-xs text-zinc-400">Managed in workspace</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Workspaces</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeClients}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">100% active campaigns</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Combined Monthly Budget</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(totalBudgetSum)}</div>
            <div className="mt-1 text-xs text-zinc-400">Monthly ad spend budget</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Blended Avg ROAS</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Target size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">4.35x</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">+0.8x vs last month</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Search size={14} className="text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name or industry…"
              className="input-clean py-1 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-clean py-1 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-white shadow-2xs dark:bg-zinc-800" : "text-zinc-400"}`}
              >
                <Grid size={13} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1.5 ${viewMode === "table" ? "bg-white shadow-2xs dark:bg-zinc-800" : "text-zinc-400"}`}
              >
                <List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{client.name}</h3>
                        <span className="text-[11px] text-zinc-400">{client.industry || "General Business"}</span>
                      </div>
                    </div>

                    <StatusBadge status={client.status || "Active"} />
                  </div>

                  {client.website && (
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <span>{client.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900/60">
                    <div>
                      <div className="text-[10px] text-zinc-400">Monthly Budget</div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{money(Number(client.monthlyBudget) || 0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400">Campaigns</div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{client.campaigns?.length || 0} active</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(client)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-rose-500 hover:bg-rose-50 dark:border-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <a href={`/clients/${client.id}`} className="btn-primary py-1 text-xs">
                    Open Workspace <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}

            {!filtered.length && (
              <div className="col-span-3 rounded-xl border border-zinc-200/90 bg-white p-12 text-center text-xs text-zinc-400 dark:border-zinc-800">
                No client workspaces found. Click &quot;Add Client&quot; to create one.
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <th className="px-5 py-3">Client Name</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Monthly Budget</th>
                    <th className="px-4 py-3">Campaigns</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                  {filtered.map((client) => (
                    <tr key={client.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                      <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        <a href={`/clients/${client.id}`} className="hover:underline flex items-center gap-2">
                          <Building2 size={14} className="text-zinc-400" />
                          <span>{client.name}</span>
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">{client.industry || "—"}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={client.status || "Active"} />
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        {money(Number(client.monthlyBudget) || 0)}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">{client.campaigns?.length || 0} active</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(client)} className="btn-secondary py-1 text-[11px]">
                            Edit
                          </button>
                          <a href={`/clients/${client.id}`} className="btn-primary py-1 text-[11px]">
                            Open
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add / Edit Client Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-zinc-700 dark:text-zinc-300" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {editingClient ? "Edit Client Workspace" : "Add New Client Workspace"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="mt-4 space-y-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Client Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acme Corporation"
                    className="input-clean mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Industry</label>
                    <input
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. E-Commerce"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Website</label>
                    <input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://acme.com"
                      className="input-clean mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Contact Name</label>
                    <input
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="John Doe"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="john@acme.com"
                      className="input-clean mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Monthly Budget ($)</label>
                    <input
                      type="number"
                      value={formData.monthlyBudget}
                      onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                      placeholder="5000"
                      className="input-clean mt-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-clean mt-1"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? "Saving…" : editingClient ? "Save Changes" : "Create Workspace"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <CustomDialog
          isOpen={dialogConfig.isOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          confirmText={dialogConfig.confirmText}
          cancelText={dialogConfig.cancelText}
          confirmTone={dialogConfig.confirmTone}
          onConfirm={dialogConfig.onConfirm}
          onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </AppShell>
  );
}

const DEMO_CLIENTS: ClientRow[] = [
  {
    id: "client-1",
    name: "Acme Retail Inc.",
    industry: "E-Commerce",
    website: "https://acmeretail.example.com",
    status: "ACTIVE",
    monthlyBudget: 15000,
    contactName: "Sarah Jenkins",
    contactEmail: "sarah@acmeretail.com",
    campaigns: [{ id: "c1", name: "Summer Promo" }, { id: "c2", name: "Search Ads" }]
  },
  {
    id: "client-2",
    name: "Apex Global Tech",
    industry: "SaaS & Software",
    website: "https://apextech.example.com",
    status: "ACTIVE",
    monthlyBudget: 25000,
    contactName: "Mark Robinson",
    contactEmail: "mark@apextech.com",
    campaigns: [{ id: "c3", name: "Enterprise Leads" }]
  },
  {
    id: "client-3",
    name: "Luxe Fashion House",
    industry: "Apparel & Retail",
    website: "https://luxefashion.example.com",
    status: "ACTIVE",
    monthlyBudget: 8000,
    contactName: "Elena Vance",
    contactEmail: "elena@luxefashion.com",
    campaigns: [{ id: "c4", name: "Instagram Reels Campaign" }]
  }
];
