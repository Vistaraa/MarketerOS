"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UserCheck, Users, X } from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LiveLeadsPage({ detailId }: { detailId?: string }) {
  const [items, setItems] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    source: "Manual"
  });

  async function load() {
    const response = await fetch("/api/v1/leads");
    const payload = (await response.json()) as ApiResponse<{ items: Lead[] }>;
    if (!response.ok) throw new Error(payload.error?.message || "Unable to load leads.");
    setItems(payload.data.items || []);
  }

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load leads."));
  }, []);

  async function create() {
    const response = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || "Unable to create lead.");
    setOpen(false);
    setForm({ firstName: "", lastName: "", email: "", company: "", source: "Manual" });
    await load();
  }

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.company.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase())
  );

  const lead = detailId ? items.find((item) => item.id === detailId) : null;

  if (detailId) {
    return (
      <AppShell title="Lead Details">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          {lead ? (
            <>
              <PageHeading title={lead.name} description={`${lead.company} · Source: ${lead.source}`} />
              <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-4 text-xs dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={lead.status} />
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400">Lead Score</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">{lead.score} / 100</strong>
                </div>
                <div>
                  <span className="text-zinc-400">Lead Owner</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">{lead.owner}</strong>
                </div>
                <div>
                  <span className="text-zinc-400">Attributed Revenue</span>
                  <strong className="mt-1 block text-zinc-900 dark:text-zinc-100">${lead.revenue.toLocaleString()}</strong>
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
        <button
          onClick={() => setOpen(true)}
          className="btn-primary h-8 px-2.5 sm:px-3.5"
          title="Add Lead"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeading title="Leads Management" description="Track, manage and convert inbound marketing leads." />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search leads by name, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-clean pl-8 py-1.5"
          />
        </div>

        {/* Leads Table */}
        <div className="rounded-xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <th className="px-5 py-3">Lead Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-xs text-zinc-400">
                      No leads found.{" "}
                      <button onClick={() => setOpen(true)} className="font-semibold text-zinc-900 underline dark:text-zinc-100">
                        Add a lead
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                      <td className="px-5 py-3.5">
                        <a href={`/leads/${item.id}`} className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">
                          {item.name}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{item.company}</td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{item.source}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">{item.score}</td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{item.owner}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Lead Modal */}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Lead</h2>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={15} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["firstName", "First name"],
                  ["lastName", "Last name"],
                  ["email", "Email"],
                  ["company", "Company"],
                  ["source", "Source"]
                ].map(([key, label]) => (
                  <label key={key} className={key === "email" ? "sm:col-span-2" : ""}>
                    <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="input-clean"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() =>
                    create().catch((cause: unknown) =>
                      setError(cause instanceof Error ? cause.message : "Unable to create lead.")
                    )
                  }
                  className="btn-primary"
                >
                  Create Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
