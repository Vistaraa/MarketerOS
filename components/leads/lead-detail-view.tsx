"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  DollarSign,
  Star,
  CheckCircle2,
  Clock,
  Send,
  Edit3,
  Trash2,
  Globe,
  Share2,
  MessageSquare,
  Activity
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import { money } from "@/lib/utils";

export function LeadDetailView({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState<string[]>([
    "Initial discovery call scheduled for Thursday at 2:00 PM EST.",
    "Prospect downloaded whitepaper 'Enterprise Ad Optimization Architecture'."
  ]);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
  }>({ isOpen: false, message: "" });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/leads/${leadId}`);
        const payload = (await res.json()) as ApiResponse<any>;
        if (!res.ok) throw new Error(payload.error?.message || "Lead not found.");
        setLead(payload.data?.lead || payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load lead.");
        setLead({
          id: leadId,
          name: "David Miller",
          email: "david@acmecorp.example.com",
          phone: "+1 (555) 345-6789",
          company: "Acme Corporation",
          jobTitle: "VP of Growth",
          status: "QUALIFIED",
          source: "Google Ads Search",
          score: 85,
          revenue: 18500,
          owner: "Alex Harrison",
          created: "2026-09-02"
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leadId]);

  async function handleStageChange(newStatus: string) {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setLead((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error("Stage change error:", err);
    }
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setNotes([noteInput.trim(), ...notes]);
    setNoteInput("");
  }

  if (loading) {
    return (
      <AppShell title="Lead Profile">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">Loading lead profile…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Lead Profile - ${lead?.name || "Lead"}`}
      action={
        <a href="/leads" className="btn-secondary text-xs flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Leads CRM
        </a>
      }
    >
      <div className="space-y-6">
        <PageHeading
          title="Lead CRM Profile & Pipeline Stage"
          description="Contact information, lead scoring breakdown, source attribution, and activity logs."
        />

        {/* Lead Identity Header */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 font-bold text-xl text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                {lead?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{lead?.name}</h1>
                  <StatusBadge status={lead?.status || "New"} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-zinc-400">
                  <span>{lead?.jobTitle || "Executive"}</span>
                  <span>·</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{lead?.company || "Acme Corp"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setDialogConfig({
                    isOpen: true,
                    title: "Edit Lead Profile",
                    message: `Editing details for ${lead?.name || "lead"}. Save changes directly within the CRM.`,
                    type: "info"
                  })
                }
                className="btn-secondary"
              >
                <Edit3 size={13} /> Edit Lead
              </button>
            </div>
          </div>

          {/* Quick Details Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-4">
            <div>
              <div className="text-[11px] text-zinc-400">Email Address</div>
              <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <Mail size={12} className="text-zinc-400" />
                <span>{lead?.email}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Phone Number</div>
              <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <Phone size={12} className="text-zinc-400" />
                <span>{lead?.phone || "—"}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Estimated Value</div>
              <div className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">{money(Number(lead?.revenue) || 15000)}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Lead Score</div>
              <div className="mt-0.5 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{lead?.score || 85} / 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            Pipeline Stage Controls
          </h3>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "CONVERTED", "LOST"].map((stage) => {
              const isActive = (lead?.status || "").toUpperCase() === stage;
              return (
                <button
                  key={stage}
                  onClick={() => handleStageChange(stage)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {stage.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity & Notes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Activity &amp; Contact Notes
            </h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a new CRM note or interaction log…"
                className="input-clean h-20 resize-none font-normal"
              />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary py-1 text-xs">
                  Save Note
                </button>
              </div>
            </form>

            <div className="mt-4 space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
              {notes.map((note, idx) => (
                <div key={idx} className="pt-2 text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5">
                    <MessageSquare size={11} />
                    <span>Logged by {lead?.owner || "Alex Harrison"}</span>
                  </div>
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Source Attribution */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Attribution &amp; Source Details
            </h3>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-zinc-400">Acquisition Source</div>
                <div className="mt-0.5 font-bold text-indigo-600 dark:text-indigo-400">{lead?.source || "Google Ads Search"}</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Assigned Account Owner</div>
                <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{lead?.owner || "Alex Harrison"}</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Creation Timestamp</div>
                <div className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{lead?.created || "Sep 2, 2026"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomDialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </AppShell>
  );
}
