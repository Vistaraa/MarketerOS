"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Layers, Lock, Plus, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LiveCampaignCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlatform = searchParams.get("platform");

  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [objective, setObjective] = useState("Sales");
  const [dailyBudget, setDailyBudget] = useState("100");
  const [totalBudget, setTotalBudget] = useState("3000");
  const [biddingStrategy, setBiddingStrategy] = useState("Maximize Conversions");
  const [targetRoas, setTargetRoas] = useState("3.5");
  const [landingPage, setLandingPage] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("Shop Now");
  const [targetCountry, setTargetCountry] = useState("India");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch only connected integrations from DB
  useEffect(() => {
    fetch("/api/v1/integrations")
      .then(async (res) => {
        const json = (await res.json()) as ApiResponse<{ items: Integration[] }>;
        if (res.ok && json.data?.items) {
          const connected = json.data.items.filter((item) => item.status === "Connected");
          setConnectedIntegrations(connected);

          if (connected.length > 0) {
            if (requestedPlatform) {
              const matched = connected.find((c) => c.platform.toLowerCase() === requestedPlatform.toLowerCase());
              if (matched) {
                setSelectedPlatforms([matched.platform]);
                return;
              }
            }
            setSelectedPlatforms([connected[0].platform]);
          }
        }
      })
      .catch(() => setConnectedIntegrations([]))
      .finally(() => setLoading(false));
  }, [requestedPlatform]);

  const togglePlatform = (platformName: string) => {
    if (selectedPlatforms.includes(platformName)) {
      if (selectedPlatforms.length === 1) return; // keep at least 1
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platformName));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformName]);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a campaign name.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("Please select at least one connected advertising platform.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const budgetNum = Number(totalBudget) || Number(dailyBudget) * 30 || 3000;
      const dailyBudgetNum = Number(dailyBudget) || budgetNum / 30;

      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          platform: selectedPlatforms[0],
          platforms: selectedPlatforms,
          objective: objective.toUpperCase().replace(/\s+/g, "_"),
          budget: budgetNum,
          dailyBudget: dailyBudgetNum,
          targetRoas: Number(targetRoas) || 3.0,
          biddingStrategy,
          metadata: {
            landingPage: landingPage.trim(),
            headline: headline.trim(),
            description: description.trim(),
            cta,
            targetCountry,
            selectedPlatforms
          }
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to launch campaign");

      const createdId = json.data?.id || json.data?.campaign?.id;

      // If Google Ads is selected, trigger live Google Ads API mutation immediately
      if (createdId && selectedPlatforms.includes("Google Ads")) {
        fetch("/api/google-ads/publish-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: createdId })
        })
          .then(async (r) => {
            const rJson = await r.json();
            if (!r.ok) {
              console.warn("Google Ads mutate on create:", rJson.error);
            }
          })
          .catch((err) => console.error("Google Ads publish error:", err));
      }

      if (createdId) {
        router.push(`/campaigns/${createdId}`);
      } else {
        router.push("/campaigns");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign creation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Create Campaign">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
              Create New Campaign
            </h1>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
              Launch dynamic ads across Google Ads, Meta Ads, and connected channels.
            </p>
          </div>

          <button
            onClick={() => router.push("/campaigns")}
            className="btn-secondary"
          >
            <ArrowLeft size={13} /> Back to Campaigns
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* If no platforms connected, show blocker */}
        {!loading && connectedIntegrations.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 text-center text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">No Connected Platforms Found</h3>
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              You must connect at least one verified advertising platform before launching campaigns.
            </p>
            <button
              onClick={() => router.push("/integrations")}
              className="btn-primary mt-4"
            >
              Go to Integrations
            </button>
          </div>
        ) : (
          <form onSubmit={handleLaunch} className="grid gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Form Sections */}
            <div className="space-y-6 lg:col-span-2">
              {/* 1. Target Platforms & Basic Info */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">1. Destination Platforms & Objective</h3>
                <p className="mt-0.5 text-xs text-zinc-400">Choose connected channels to publish this campaign.</p>

                {/* Platforms selection cards */}
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Select Target Channels ({selectedPlatforms.length} selected)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {connectedIntegrations.map((item) => {
                      const isSelected = selectedPlatforms.includes(item.platform);

                      return (
                        <div
                          key={item.id}
                          onClick={() => togglePlatform(item.platform)}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all",
                            isSelected
                              ? "border-zinc-900 bg-zinc-50 shadow-2xs dark:border-zinc-100 dark:bg-zinc-800/80"
                              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={item.platform} size={24} />
                            <div>
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.platform}</div>
                              <div className="font-mono text-[10px] text-zinc-400">{item.account || "Connected"}</div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "grid h-5 w-5 place-items-center rounded-md border transition-colors",
                              isSelected
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                            )}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Campaign Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer Sale 2024 - Omnichannel Growth"
                      required
                      className="input-clean mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Campaign Objective *</label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="input-clean mt-1"
                    >
                      <option value="Sales">Sales (Conversions & Revenue)</option>
                      <option value="Leads">Leads (Form Submissions)</option>
                      <option value="Website Traffic">Website Traffic (High Intent Clicks)</option>
                      <option value="Brand Awareness">Brand Awareness (Reach & Impressions)</option>
                      <option value="App Promotion">App Promotion (Installs & Engagement)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Destination Landing Page URL *</label>
                    <input
                      type="url"
                      value={landingPage}
                      onChange={(e) => setLandingPage(e.target.value)}
                      placeholder="https://example.com/summer-deals"
                      required
                      className="input-clean mt-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Budget & Smart Bidding */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">2. Budget & Bidding Strategy</h3>
                <p className="mt-0.5 text-zinc-400">Control your daily spend cap and performance targets.</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Daily Budget ($ / day) *</label>
                    <input
                      type="number"
                      min="1"
                      value={dailyBudget}
                      onChange={(e) => {
                        setDailyBudget(e.target.value);
                        setTotalBudget(String(Number(e.target.value) * 30));
                      }}
                      placeholder="100"
                      required
                      className="input-clean mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Estimated Total Budget ($ / mo)</label>
                    <input
                      type="number"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      placeholder="3000"
                      className="input-clean mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Bidding Strategy</label>
                    <select
                      value={biddingStrategy}
                      onChange={(e) => setBiddingStrategy(e.target.value)}
                      className="input-clean mt-1"
                    >
                      <option>Maximize Conversions</option>
                      <option>Target ROAS (Smart Bidding)</option>
                      <option>Target CPA (Cost Cap)</option>
                      <option>Maximize Clicks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Target ROAS Goal (x)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetRoas}
                      onChange={(e) => setTargetRoas(e.target.value)}
                      placeholder="3.5"
                      className="input-clean mt-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Ad Creative & Targeting */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 text-xs">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">3. Ad Creative & Target Region</h3>
                <p className="mt-0.5 text-zinc-400">Primary headline, ad copy, and button action.</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Main Headline</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Elevate Your Marketing with AI Automation"
                      className="input-clean mt-1"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">Ad Copy / Body Text</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your offer, features, and key value proposition."
                      className="input-clean mt-1 resize-none"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300">Call to Action (CTA)</label>
                      <select
                        value={cta}
                        onChange={(e) => setCta(e.target.value)}
                        className="input-clean mt-1"
                      >
                        <option>Shop Now</option>
                        <option>Sign Up</option>
                        <option>Learn More</option>
                        <option>Get Quote</option>
                        <option>Contact Us</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300">Target Region</label>
                      <select
                        value={targetCountry}
                        onChange={(e) => setTargetCountry(e.target.value)}
                        className="input-clean mt-1"
                      >
                        <option>India</option>
                        <option>United States</option>
                        <option>United Kingdom</option>
                        <option>Global / Worldwide</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Summary & Launch CTA */}
            <div className="space-y-5 text-xs">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Launch Summary</h3>

                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between pt-2">
                    <span>Name:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{name || "Untitled"}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Channels:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedPlatforms.length} platforms</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Objective:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{objective}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Daily Budget:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">${dailyBudget}/day</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Target ROAS:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{targetRoas}x</span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-primary w-full py-2.5"
                  >
                    <Rocket size={14} />
                    <span>{busy ? "Launching…" : "Launch Campaign"}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
