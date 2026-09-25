"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Target,
  Filter,
  List,
  LayoutGrid,
  RefreshCw,
  Edit3,
  Trash2,
  UserPlus,
  Download,
  Star,
  X,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Globe
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Lead } from "@/lib/types";
import { cn, money } from "@/lib/utils";

const PIPELINE_STAGES = [
  { key: "NEW", label: "New", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900" },
  { key: "CONTACTED", label: "Contacted", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900" },
  { key: "QUALIFIED", label: "Qualified", color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900" },
  { key: "CONVERTED", label: "Converted", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900" },
  { key: "LOST", label: "Lost", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900" }
];

function getSourceStyle(source: string) {
  const s = source.toUpperCase();
  if (s.includes("GOOGLE")) return "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
  if (s.includes("FACEBOOK") || s.includes("META")) return "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900";
  if (s.includes("LINKEDIN")) return "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900";
  if (s.includes("WEBSITE")) return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
}

function getStatusStyle(status: string) {
  const s = status.toUpperCase().replaceAll(" ", "_");
  const stage = PIPELINE_STAGES.find((p) => p.key === s);
  return stage ? stage.color : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300";
}

export function LiveLeadsPage({ detailId }: { detailId?: string }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Toolbar state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    source: "Website",
    status: "New",
    score: "50",
    estimatedValue: "10000",
    owner: "Alex Harrison",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Dialog State
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

  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/leads");
      const payload = (await response.json()) as ApiResponse<{ items: Lead[] }>;
      if (!response.ok) throw new Error(payload.error?.message || "Unable to load leads.");
      setItems(payload.data.items || []);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  function openModal(lead?: Lead) {
    if (lead) {
      setEditingLead(lead);
      const [fName = "", ...lNameParts] = (lead.name || "").split(" ");
      setFormData({
        firstName: lead.firstName || fName,
        lastName: lead.lastName || lNameParts.join(" "),
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company !== "—" ? lead.company : "",
        jobTitle: lead.jobTitle || "",
        source: lead.source || "Website",
        status: lead.status || "New",
        score: String(lead.score || 50),
        estimatedValue: String(lead.revenue || 10000),
        owner: lead.owner || "Alex Harrison",
        notes: lead.notes || ""
      });
    } else {
      setEditingLead(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
        source: "Website",
        status: "New",
        score: "50",
        estimatedValue: "10000",
        owner: "Alex Harrison",
        notes: ""
      });
    }
    setIsModalOpen(true);
  }

  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingLead ? `/api/v1/leads/${editingLead.id}` : "/api/v1/leads";
      const method = editingLead ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          company: formData.company.trim() || undefined,
          jobTitle: formData.jobTitle.trim() || undefined,
          source: formData.source,
          status: formData.status,
          score: Number(formData.score) || 0,
          estimatedValue: Number(formData.estimatedValue) || 0,
          notes: formData.notes.trim() || undefined
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || "Failed to save lead.");

      setIsModalOpen(false);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === leadId
              ? {
                  ...item,
                  status: newStatus.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) as Lead["status"]
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleDeleteLead(id: string, name: string) {
    setDialogConfig({
      isOpen: true,
      title: "Delete Lead Record",
      message: `Are you sure you want to permanently delete lead "${name}"? This action cannot be undone.`,
      type: "confirm",
      confirmText: "Delete Lead",
      confirmTone: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/leads/${id}`, { method: "DELETE" });
          if (res.ok) {
            setItems((prev) => prev.filter((item) => item.id !== id));
          }
        } catch (err) {
          console.error("Failed to delete lead:", err);
        }
      }
    });
  }

  async function handleConvertToClient(lead: Lead) {
    setDialogConfig({
      isOpen: true,
      title: "Convert Lead to Client Workspace",
      message: `Convert lead "${lead.name}" (${lead.company}) into an active Client Workspace? A new client account will be initialized and the lead status updated to Converted.`,
      type: "confirm",
      confirmText: "Convert to Client",
      confirmTone: "primary",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/leads/${lead.id}/convert`, { method: "POST" });
          const payload = await res.json();
          if (res.ok) {
            setDialogConfig({
              isOpen: true,
              title: "Lead Converted!",
              message: `Successfully converted "${lead.name}" to client workspace "${payload.data?.client?.name}".`,
              type: "success"
            });
            await loadLeads();
          } else {
            throw new Error(payload.error?.message || "Failed to convert lead.");
          }
        } catch (err) {
          setDialogConfig({
            isOpen: true,
            title: "Conversion Error",
            message: err instanceof Error ? err.message : "Failed to convert lead.",
            type: "error"
          });
        }
      }
    });
  }

  function handleExportCSV() {
    const headers = ["Lead Name", "Email", "Phone", "Company", "Job Title", "Source", "Status", "Score", "Estimated Value ($)", "Owner", "Created Date"];
    const rows = filtered.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${l.company.replace(/"/g, '""')}"`,
      `"${(l.jobTitle || "").replace(/"/g, '""')}"`,
      `"${l.source.replace(/"/g, '""')}"`,
      `"${l.status.replace(/"/g, '""')}"`,
      l.score,
      l.revenue,
      `"${l.owner.replace(/"/g, '""')}"`,
      `"${l.created.slice(0, 10)}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `marketeros_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered dataset
  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.company.toLowerCase().includes(search.toLowerCase()) ||
      (item.email && item.email.toLowerCase().includes(search.toLowerCase())) ||
      item.source.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      item.status.toUpperCase().replaceAll(" ", "_") === statusFilter.toUpperCase();

    const matchesSource =
      sourceFilter === "ALL" ||
      item.source.toUpperCase().replaceAll(" ", "_") === sourceFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Calculate top KPI statistics
  const totalLeads = items.length;
  const qualifiedLeads = items.filter(
    (i) => i.status.toUpperCase() === "QUALIFIED" || i.status.toUpperCase() === "CONVERTED"
  ).length;
  const totalPipelineValue = items.reduce((acc, i) => acc + (Number(i.revenue) || 0), 0);
  const conversionRate =
    totalLeads > 0
      ? Math.round(
          (items.filter((i) => i.status.toUpperCase() === "CONVERTED").length / totalLeads) * 100
        )
      : 0;

  // Single Detail View (if detailId is provided)
  const detailLead = detailId ? items.find((item) => item.id === detailId) : null;
  if (detailId) {
    return (
      <AppShell title="Lead Details">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          {detailLead ? (
            <>
              <PageHeading title={detailLead.name} description={`${detailLead.company} · Source: ${detailLead.source}`} />
              <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-4 text-xs dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={detailLead.status} />
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400">Lead Score</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">{detailLead.score} / 100</strong>
                </div>
                <div>
                  <span className="text-zinc-400">Lead Owner</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">{detailLead.owner}</strong>
                </div>
                <div>
                  <span className="text-zinc-400">Attributed Revenue</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">{money(detailLead.revenue)}</strong>
                </div>
              </div>
            </>
          ) : (
            <PageHeading title="Lead not found" description={error || "The lead is not available in this workspace."} />
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Leads"
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => openModal()}
            className="btn-primary h-8 px-2.5 sm:px-3.5"
            title="Add Lead"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
          <button onClick={loadLeads} className="btn-secondary grid h-8 w-8 place-items-center p-0" title="Refresh">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Leads Management & Pipeline CRM"
          description="Track, nurture, and convert inbound marketing leads into loyal client accounts."
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
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Leads</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalLeads}</div>
            <div className="mt-1 text-xs text-zinc-400">Inbound lead pipeline</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Qualified Leads</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{qualifiedLeads}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              {totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : 0}% ready for conversion
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Combined Pipeline Value</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(totalPipelineValue)}</div>
            <div className="mt-1 text-xs text-zinc-400">Total estimated deal value</div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Conversion Rate</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Target size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{conversionRate}%</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Lead to client conversion</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Search & Stage Filter Tabs */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Status Filter Tabs in Horizontal Pill Bar */}
              <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5 text-xs overflow-x-auto dark:border-zinc-800 dark:bg-zinc-900 [scrollbar-width:none]">
                {["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "CONVERTED", "LOST"].map((stKey) => {
                  const label = stKey === "ALL" ? "All" : stKey === "PROPOSAL_SENT" ? "Proposal Sent" : stKey.charAt(0) + stKey.slice(1).toLowerCase();
                  const active = statusFilter.toUpperCase() === stKey;
                  return (
                    <button
                      key={stKey}
                      onClick={() => setStatusFilter(stKey)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition",
                        active
                          ? "bg-white text-zinc-900 shadow-2xs font-semibold dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Source Select, Export Button, View Switcher */}
            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 outline-none hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
              >
                <option value="ALL">All Sources</option>
                <option value="WEBSITE">Website</option>
                <option value="GOOGLE_ADS">Google Ads</option>
                <option value="FACEBOOK_ADS">Facebook Ads</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="MANUAL">Manual</option>
                <option value="REFERRAL">Referral</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                title="Export to CSV"
              >
                <Download size={13} className="text-zinc-400" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === "table" ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-700"
                  )}
                  title="Table View"
                >
                  <List size={13} />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === "kanban" ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-700"
                  )}
                  title="Kanban Board View"
                >
                  <LayoutGrid size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode: Perfectly Arranged Sleek Table View */}
        {viewMode === "table" ? (
          <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <th className="px-5 py-3.5 whitespace-nowrap">Lead Contact</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Company</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Source</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Pipeline Stage</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Lead Score</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Est. Deal Value</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Owner</th>
                    <th className="px-5 py-3.5 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-xs text-zinc-400">
                        No leads found matching current filters.{" "}
                        <button onClick={() => openModal()} className="font-semibold text-zinc-900 underline dark:text-zinc-100">
                          Add a lead
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const initials = (item.name || "UN")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr key={item.id} className="transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                          {/* Lead Contact: Avatar Initials + Name + Email */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <a
                                  href={`/leads/${item.id}`}
                                  className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                >
                                  {item.name}
                                </a>
                                <div className="text-[11px] font-normal text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <Mail size={11} className="shrink-0" />
                                  <span>{item.email || "No email"}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Company & Job Title */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                              <Building2 size={13} className="text-zinc-400 shrink-0" />
                              <span>{item.company}</span>
                            </div>
                            {item.jobTitle && (
                              <div className="text-[10px] text-zinc-400 font-normal pl-4.5">
                                {item.jobTitle}
                              </div>
                            )}
                          </td>

                          {/* Source Tag Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getSourceStyle(item.source)}`}>
                              <Globe size={10} />
                              {item.source}
                            </span>
                          </td>

                          {/* Pipeline Stage Custom Pill Selector */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="relative inline-block">
                              <select
                                value={item.status.toUpperCase().replaceAll(" ", "_")}
                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                className={`appearance-none cursor-pointer rounded-full border px-3 py-1 pr-6 text-[11px] font-semibold tracking-tight transition focus:outline-none focus:ring-1 focus:ring-zinc-400 ${getStatusStyle(item.status)}`}
                              >
                                {PIPELINE_STAGES.map((s) => (
                                  <option key={s.key} value={s.key} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2 text-current opacity-70" />
                            </div>
                          </td>

                          {/* Lead Score & Visual Progress */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100">
                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                {item.score}
                              </span>
                              <div className="h-1.5 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Est. Deal Value */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                            {money(item.revenue || 0)}
                          </td>

                          {/* Owner */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                              <div className="grid h-5 w-5 place-items-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {item.owner.slice(0, 1)}
                              </div>
                              <span className="font-medium text-xs">{item.owner}</span>
                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleConvertToClient(item)}
                                disabled={item.status.toUpperCase() === "CONVERTED"}
                                className={`btn-secondary py-1 px-2.5 text-[11px] font-semibold flex items-center gap-1.5 transition ${
                                  item.status.toUpperCase() === "CONVERTED"
                                    ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900"
                                    : "hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                                }`}
                                title="Convert to Client Workspace"
                              >
                                <UserPlus size={12} />
                                <span>{item.status.toUpperCase() === "CONVERTED" ? "Converted" : "Convert"}</span>
                              </button>
                              <button
                                onClick={() => openModal(item)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200/80 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
                                title="Edit Lead Details"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(item.id, item.name)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200/80 text-rose-500 hover:bg-rose-50 dark:border-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                                title="Delete Lead"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Footer Summary */}
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div>
                Showing <strong className="font-bold text-zinc-900 dark:text-zinc-100">{filtered.length}</strong> of{" "}
                <strong className="font-bold text-zinc-900 dark:text-zinc-100">{totalLeads}</strong> leads
              </div>
              <div className="flex items-center gap-3">
                <span>Total Filtered Value: <strong className="font-bold text-emerald-600 dark:text-emerald-400">{money(filtered.reduce((acc, l) => acc + (Number(l.revenue) || 0), 0))}</strong></span>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode: Spacious Kanban Pipeline Board */
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x [scrollbar-width:thin]">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = filtered.filter(
                (l) => l.status.toUpperCase().replaceAll(" ", "_") === stage.key
              );
              const stageValueSum = stageLeads.reduce((acc, l) => acc + (Number(l.revenue) || 0), 0);

              return (
                <div
                  key={stage.key}
                  className="flex flex-col rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50 w-[280px] shrink-0 snap-start shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${stage.color}`}>
                        {stage.label}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">({stageLeads.length})</span>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 shrink-0">{money(stageValueSum)}</span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                    {stageLeads.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200/90 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <a href={`/leads/${lead.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 transition truncate">
                              {lead.name}
                            </a>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 shrink-0 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/60">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              {lead.score}
                            </span>
                          </div>

                          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                            <Building2 size={12} className="shrink-0 text-zinc-400" />
                            <span className="truncate">{lead.company !== "—" ? lead.company : lead.email || "No company"}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800 text-[11px]">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {money(lead.revenue || 0)}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${getSourceStyle(lead.source)}`}>
                              {lead.source}
                            </span>
                          </div>

                          {/* Kanban Card Controls */}
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-50 dark:border-zinc-800/60 text-[11px]">
                            <button
                              onClick={() => openModal(lead)}
                              className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                              title="Edit Lead"
                            >
                              <Edit3 size={13} />
                            </button>

                            <div className="flex items-center gap-1">
                              {stage.key !== "NEW" && (
                                <button
                                  onClick={() => {
                                    const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage.key);
                                    if (currentIdx > 0) {
                                      handleStatusChange(lead.id, PIPELINE_STAGES[currentIdx - 1].key);
                                    }
                                  }}
                                  className="rounded-md border border-zinc-200 p-1 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
                                  title="Move stage back"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                              )}

                              {stage.key !== "LOST" && stage.key !== "CONVERTED" && (
                                <button
                                  onClick={() => {
                                    const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage.key);
                                    if (currentIdx < PIPELINE_STAGES.length - 1) {
                                      handleStatusChange(lead.id, PIPELINE_STAGES[currentIdx + 1].key);
                                    }
                                  }}
                                  className="rounded-md border border-zinc-200 p-1 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
                                  title="Advance stage forward"
                                >
                                  <ArrowRight size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Lead Modal */}
        {isModalOpen && mounted && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
                <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-zinc-700 dark:text-zinc-300" />
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {editingLead ? "Edit Lead Profile" : "Add New Inbound Lead"}
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveLead} className="flex flex-col flex-1 overflow-hidden">
                    <div className="overflow-y-auto p-5 space-y-4 flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">First Name *</label>
                          <input
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="e.g. John"
                            className="input-clean mt-1"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Last Name *</label>
                          <input
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="e.g. Doe"
                            className="input-clean mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Email Address *</label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@company.com"
                            className="input-clean mt-1"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Phone Number</label>
                          <input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                            className="input-clean mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Company Name</label>
                          <input
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="Acme Inc."
                            className="input-clean mt-1"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Job Title</label>
                          <input
                            value={formData.jobTitle}
                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                            placeholder="VP of Marketing"
                            className="input-clean mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Acquisition Source</label>
                          <select
                            value={formData.source}
                            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            className="input-clean mt-1"
                          >
                            <option value="Website">Website</option>
                            <option value="Google Ads">Google Ads</option>
                            <option value="Facebook Ads">Facebook Ads</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Manual">Manual Entry</option>
                            <option value="Referral">Referral</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Pipeline Stage</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="input-clean mt-1"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Lead Score (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.score}
                            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                            className="input-clean mt-1"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-zinc-700 dark:text-zinc-300">Estimated Deal Value ($)</label>
                          <input
                            type="number"
                            value={formData.estimatedValue}
                            onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                            placeholder="10000"
                            className="input-clean mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 dark:text-zinc-300">Notes &amp; Interaction Context</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Initial discovery notes, requirements, or meeting outcome…"
                          className="input-clean mt-1 h-20 resize-none font-normal"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800 shrink-0">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" disabled={submitting} className="btn-primary">
                        {submitting ? "Saving…" : editingLead ? "Save Lead Profile" : "Create Lead"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )
          : null}

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
