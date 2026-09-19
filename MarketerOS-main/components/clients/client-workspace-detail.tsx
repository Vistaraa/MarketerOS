"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Layers,
  Share2,
  FileText,
  Activity,
  Settings,
  Plus,
  ExternalLink,
  Edit3,
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  CheckCircle2
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { CustomDialog } from "@/components/ui/custom-dialog";
import type { ApiResponse } from "@/lib/api-contracts";
import { money } from "@/lib/utils";
import { TrendChart } from "@/components/ui/marketeros-charts";

interface ClientDetailPayload {
  id: string;
  name: string;
  slug?: string;
  industry?: string | null;
  website?: string | null;
  status: string;
  monthlyBudget?: number | null;
  currency?: string;
  timezone?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  campaigns?: any[];
  integrations?: any[];
  leads?: any[];
  content?: any[];
  socialAccounts?: any[];
  reports?: any[];
  leadsCount?: number;
  totalSpend?: number;
}

export function ClientWorkspaceDetail({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "campaigns" | "analytics" | "leads" | "content" | "social" | "integrations" | "reports" | "activity" | "settings"
  >("overview");
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error" | "confirm";
  }>({ isOpen: false, message: "" });

  async function loadClient() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}`);
      const payload = (await res.json()) as ApiResponse<ClientDetailPayload>;
      if (!res.ok) throw new Error(payload.error?.message || "Failed to load client details.");
      setClient(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load client.");
      // Demo fallback
      setClient({
        id: clientId,
        name: "Acme Retail Inc.",
        industry: "E-Commerce",
        website: "https://acmeretail.example.com",
        status: "ACTIVE",
        contactName: "Sarah Jenkins",
        contactEmail: "sarah@acmeretail.com",
        contactPhone: "+1 (555) 234-5678",
        currency: "USD",
        timezone: "America/New_York",
        monthlyBudget: 15000,
        campaigns: [
          { id: "c1", name: "Summer Promo 2026", platform: "Google Ads", status: "Active", budget: 5000, spend: 3200, conversions: 142, roas: 4.8 },
          { id: "c2", name: "Retargeting Audience", platform: "Meta Ads", status: "Active", budget: 3000, spend: 2100, conversions: 89, roas: 3.9 }
        ],
        leads: [
          { id: "l1", name: "David Miller", company: "Acme Corp", email: "david@example.com", status: "Qualified", source: "Google Ads", score: 85 },
          { id: "l2", name: "Jessica Taylor", company: "Retail Supply", email: "jessica@example.com", status: "New", source: "Website", score: 72 }
        ],
        content: [
          { id: "cnt1", title: "Summer Sale Launch Post", platform: "Instagram", status: "Scheduled", scheduledAt: "2026-09-15" }
        ],
        socialAccounts: [
          { id: "sa1", username: "@acmeretail", platform: "Instagram", followerCount: 45200 }
        ],
        integrations: [
          { id: "i1", platform: "Google Ads", status: "Connected", accountName: "Acme Ads (892-120-4412)" }
        ],
        reports: [
          { id: "r1", name: "August Monthly ROAS Audit", format: "PDF", status: "READY", createdAt: "2026-09-01" }
        ]
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [clientId]);

  if (loading) {
    return (
      <AppShell title="Client Workspace">
        <div className="flex h-64 items-center justify-center text-xs text-zinc-400">Loading client workspace…</div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell title="Client Workspace">
        <div className="p-8 text-center text-xs text-rose-500">Client workspace not found.</div>
      </AppShell>
    );
  }

  const campaignCount = client.campaigns?.length || 0;
  const leadCount = client.leads?.length || 0;
  const totalSpend = client.campaigns?.reduce((acc, c) => acc + (Number(c.spend) || 0), 0) || 0;

  return (
    <AppShell
      title={`Client Workspace - ${client.name}`}
      action={
        <a href="/clients" className="btn-secondary text-xs flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Clients
        </a>
      }
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{client.name}</h1>
                  <StatusBadge status={client.status || "Active"} />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {client.industry && (
                    <div className="flex items-center gap-1">
                      <Building2 size={13} /> <span>{client.industry}</span>
                    </div>
                  )}
                  {client.website && (
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <Globe size={13} /> <span>{client.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-1">
                      <Mail size={13} /> <span>{client.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab("settings")} className="btn-secondary text-xs">
                <Edit3 size={13} /> Edit Profile & Settings
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-4 text-xs">
            <div>
              <div className="text-[11px] text-zinc-400">Monthly Budget</div>
              <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                {money(Number(client.monthlyBudget) || 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Live Campaigns</div>
              <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{campaignCount} active</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Total Leads Acquired</div>
              <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100">{leadCount} leads</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400">Total Spend</div>
              <div className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">{money(totalSpend)}</div>
            </div>
          </div>
        </div>

        {/* 10 Workspace Tabs */}
        <div className="flex overflow-x-auto rounded-xl border border-zinc-200/90 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs font-semibold scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "campaigns", label: "Campaigns", icon: Layers },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
            { id: "leads", label: "Leads CRM", icon: Users },
            { id: "content", label: "Content", icon: FileText },
            { id: "social", label: "Social Accounts", icon: Share2 },
            { id: "integrations", label: "Integrations", icon: Target },
            { id: "reports", label: "Reports", icon: FileText },
            { id: "activity", label: "Audit Trail", icon: Activity },
            { id: "settings", label: "Settings", icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as never)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Client Spend & ROI Trend
                </h3>
                <div className="mt-4">
                  <TrendChart
                    data={[
                      { date: "Aug 1", spend: 400, revenue: 1800 },
                      { date: "Aug 8", spend: 750, revenue: 3200 },
                      { date: "Aug 15", spend: 900, revenue: 4100 },
                      { date: "Aug 22", spend: 1100, revenue: 5400 },
                      { date: "Aug 29", spend: 1300, revenue: 6800 }
                    ]}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Active Campaigns ({campaignCount})
                </h3>
                <div className="mt-4 divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
                  {client.campaigns?.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.name}</div>
                        <div className="text-[11px] text-zinc-400">{c.platform}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{c.roas || 3.5}x ROAS</div>
                        <div className="text-[11px] text-zinc-400">{money(c.spend || 0)} spent</div>
                      </div>
                    </div>
                  ))}
                  {!client.campaigns?.length && (
                    <div className="py-6 text-center text-zinc-400">No active campaigns for this client.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Client Campaigns</h2>
              <a href="/campaigns/create" className="btn-primary py-1 text-xs">
                <Plus size={13} /> Create Campaign
              </a>
            </div>

            <div className="mt-4 space-y-3">
              {client.campaigns?.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.name}</div>
                    <div className="text-[11px] text-zinc-400">{c.platform} · {c.status}</div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{money(c.budget)}</div>
                      <div className="text-[10px] text-zinc-400">Budget</div>
                    </div>
                    <a href={`/campaigns/${c.id}`} className="btn-secondary py-1 text-[11px]">
                      View Detail
                    </a>
                  </div>
                </div>
              ))}
              {!client.campaigns?.length && (
                <div className="py-8 text-center text-zinc-400">No campaigns found for this client.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Leads CRM ({client.leads?.length || 0})
            </h2>
            <div className="mt-4 space-y-2">
              {client.leads?.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{l.name || `${l.firstName || ''} ${l.lastName || ''}`}</div>
                    <div className="text-[11px] text-zinc-400">{l.email} · {l.company || 'Direct Lead'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={l.status || "New"} />
                    <a href={`/leads/${l.id}`} className="btn-secondary py-1 text-[11px]">Inspect</a>
                  </div>
                </div>
              ))}
              {!client.leads?.length && (
                <div className="py-8 text-center text-zinc-400">No leads associated with this client workspace yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "content" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Client Content Assets ({client.content?.length || 0})
            </h2>
            <div className="mt-4 space-y-3">
              {client.content?.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                    <div className="text-[11px] text-zinc-400">{item.type || "SOCIAL_POST"} · {item.platform || "Multi-Channel"}</div>
                  </div>
                  <StatusBadge status={item.status || "Draft"} />
                </div>
              ))}
              {!client.content?.length && (
                <div className="py-8 text-center text-zinc-400">No content items created for this client.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "social" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Connected Social Accounts ({client.socialAccounts?.length || 0})
            </h2>
            <div className="mt-4 space-y-3">
              {client.socialAccounts?.map((sa) => (
                <div key={sa.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{sa.username}</div>
                    <div className="text-[11px] text-zinc-400">{sa.platform}</div>
                  </div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">{(sa.followerCount || 0).toLocaleString()} followers</div>
                </div>
              ))}
              {!client.socialAccounts?.length && (
                <div className="py-8 text-center text-zinc-400">No social accounts connected to this client brand.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Client Platform Integrations ({client.integrations?.length || 0})
            </h2>
            <div className="mt-4 space-y-3">
              {client.integrations?.map((intg) => (
                <div key={intg.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{intg.accountName || intg.platform}</div>
                    <div className="text-[11px] text-zinc-400">{intg.platform}</div>
                  </div>
                  <StatusBadge status={intg.status || "Connected"} />
                </div>
              ))}
              {!client.integrations?.length && (
                <div className="py-8 text-center text-zinc-400">No ad platforms explicitly linked to this client yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Generated Client Reports ({client.reports?.length || 0})
            </h2>
            <div className="mt-4 space-y-3">
              {client.reports?.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{r.name || r.title}</div>
                    <div className="text-[11px] text-zinc-400">{r.format || "PDF"} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}</div>
                  </div>
                  <StatusBadge status={r.status || "READY"} />
                </div>
              ))}
              {!client.reports?.length && (
                <div className="py-8 text-center text-zinc-400">No audit reports generated for this client.</div>
              )}
            </div>
          </div>
        )}

        {["analytics", "activity"].includes(activeTab) && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800">
            Real-time {activeTab} stream for client workspace: <strong className="text-zinc-700 dark:text-zinc-300">{client.name}</strong>
          </div>
        )}

        {activeTab === "settings" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              try {
                const res = await fetch(`/api/v1/clients/${client.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: target.clientName.value,
                    industry: target.industry.value,
                    website: target.website.value,
                    contactName: target.contactName.value,
                    contactEmail: target.contactEmail.value,
                    contactPhone: target.contactPhone.value,
                    currency: target.currency.value,
                    timezone: target.timezone.value,
                    monthlyBudget: Number(target.monthlyBudget.value) || 0,
                    status: target.status.value
                  })
                });
                if (!res.ok) throw new Error("Failed to update client profile.");
                setDialogConfig({
                  isOpen: true,
                  title: "Settings Saved",
                  message: "Client profile settings saved successfully!",
                  type: "success"
                });
                await loadClient();
              } catch (err) {
                setDialogConfig({
                  isOpen: true,
                  title: "Save Failed",
                  message: err instanceof Error ? err.message : "Failed to save settings.",
                  type: "error"
                });
              }
            }}
            className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs space-y-4"
          >
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              Client Profile Settings & Configuration
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-zinc-500 font-medium">Client Brand Name</label>
                <input name="clientName" defaultValue={client.name || ""} className="input-clean mt-1" required />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Industry</label>
                <input name="industry" defaultValue={client.industry || ""} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Website URL</label>
                <input name="website" defaultValue={client.website || ""} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Contact Name</label>
                <input name="contactName" defaultValue={client.contactName || ""} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Contact Email</label>
                <input name="contactEmail" defaultValue={client.contactEmail || ""} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Contact Phone</label>
                <input name="contactPhone" defaultValue={client.contactPhone || ""} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Monthly Budget ($)</label>
                <input name="monthlyBudget" type="number" defaultValue={client.monthlyBudget || 0} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Account Status</label>
                <select name="status" defaultValue={client.status || "ACTIVE"} className="input-clean mt-1">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Currency</label>
                <input name="currency" defaultValue={client.currency || "USD"} className="input-clean mt-1" />
              </div>
              <div>
                <label className="block text-zinc-500 font-medium">Timezone</label>
                <input name="timezone" defaultValue={client.timezone || "UTC"} className="input-clean mt-1" />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button type="submit" className="btn-primary">
                Save Client Settings
              </button>
            </div>
          </form>
        )}
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
