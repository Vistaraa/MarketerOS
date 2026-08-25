"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn } from "@/lib/utils";

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

  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <PageHeading
          title="Workspace Settings"
          description="Configure your business profile, default currency, and operational timezone."
          action={
            <button
              onClick={save}
              disabled={busy}
              className="btn-primary"
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? "Saved" : busy ? "Saving…" : "Save Changes"}
            </button>
          }
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            Settings updated successfully.
          </div>
        )}

        {settings && (
          <div className="space-y-6 text-xs max-w-3xl">
            {/* General Workspace Info */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">General Information</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Workspace Name</label>
                  <input
                    value={settings.name || ""}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="input-clean mt-1"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Company Website</label>
                  <input
                    value={settings.website || ""}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    placeholder="https://example.com"
                    className="input-clean mt-1 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Industry</label>
                  <input
                    value={settings.industry || ""}
                    onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
                    className="input-clean mt-1"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Default Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="input-clean mt-1"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Timezone</label>
                  <input
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="input-clean mt-1 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Monthly Ad Budget Cap ($)</label>
                  <input
                    type="number"
                    value={settings.monthlyBudget || ""}
                    onChange={(e) => setSettings({ ...settings, monthlyBudget: e.target.value })}
                    className="input-clean mt-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
