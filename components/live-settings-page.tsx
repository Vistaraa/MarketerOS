"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";

type Settings = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  businessType?: string | null;
  description?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  monthlyBudget?: number | string | null;
  marketingGoals?: string[];
  targetAudience?: string | null;
  targetAgeRange?: string | null;
  targetGeo?: string | null;
  targetLanguages?: string | null;
  dateFormat: string;
  timeFormat: string;
  language: string;
  theme: string;
  defaultDashboard: string;
};

export function LiveSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<{ workspace: Settings }>;
        if (!response.ok) throw new Error(payload.error?.message || "Unable to load settings.");
        return payload.data.workspace;
      })
      .then(setSettings)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load settings."));
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...settings,
          monthlyBudget: settings.monthlyBudget ? Number(String(settings.monthlyBudget).replace(/[^0-9.]/g, "")) : undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to save settings.");
      }
      setSettings(payload.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <AppShell title="Settings">
        <Card>
          <PageHeading title="Settings" description={error || "Loading workspace settings…"} />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <PageHeading
        title="Workspace & Brand Settings"
        description="Manage your persisted brand profile, audience targets, and regional preferences."
        action={
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#6937e7] to-[#7445ed] px-4 text-xs font-bold text-white shadow hover:brightness-105"
          >
            <Save size={14} />
            {busy ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {error && <div className="mb-4 rounded-xl border border-[#f2c4c8] bg-[#fff8f8] p-3 text-xs text-[#b72e38]">{error}</div>}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#c8ecd9] bg-[#effbf5] p-3 text-xs font-bold text-[#148b5a]">
          <Check size={16} /> Changes successfully saved to PostgreSQL database.
        </div>
      )}

      <div className="space-y-6">
        {/* Brand Information */}
        <Card>
          <h3 className="mb-4 text-sm font-extrabold text-[#111a2e]">Brand & Company Profile</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Brand / Workspace Name</span>
              <input
                value={settings.name || ""}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Website</span>
              <input
                value={settings.website || ""}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                placeholder="https://acmecorp.com"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Industry</span>
              <input
                value={settings.industry || ""}
                onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Business Type</span>
              <input
                value={settings.businessType || ""}
                onChange={(e) => setSettings({ ...settings, businessType: e.target.value })}
                placeholder="B2B, B2C, D2C"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Brand Description</span>
              <textarea
                value={settings.description || ""}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="h-20 w-full rounded-lg border border-[#dfe3eb] p-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
          </div>
        </Card>

        {/* Regional & Financial Preferences */}
        <Card>
          <h3 className="mb-4 text-sm font-extrabold text-[#111a2e]">Regional & Budget Preferences</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Country</span>
              <input
                value={settings.country || ""}
                onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Currency Code</span>
              <input
                value={settings.currency || ""}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Time Zone</span>
              <input
                value={settings.timezone || ""}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Monthly Marketing Budget ($)</span>
              <input
                value={String(settings.monthlyBudget || "")}
                onChange={(e) => setSettings({ ...settings, monthlyBudget: e.target.value })}
                placeholder="10000"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
          </div>
        </Card>

        {/* Target Audience Profile */}
        <Card>
          <h3 className="mb-4 text-sm font-extrabold text-[#111a2e]">Target Audience & Goals</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Target Audience Persona</span>
              <input
                value={settings.targetAudience || ""}
                onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })}
                placeholder="e.g. Marketing leaders & digital consumers"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Age Range</span>
              <input
                value={settings.targetAgeRange || ""}
                onChange={(e) => setSettings({ ...settings, targetAgeRange: e.target.value })}
                placeholder="25–44"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Geographies</span>
              <input
                value={settings.targetGeo || ""}
                onChange={(e) => setSettings({ ...settings, targetGeo: e.target.value })}
                placeholder="India, United States, UK"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#7445ed]"
              />
            </label>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

