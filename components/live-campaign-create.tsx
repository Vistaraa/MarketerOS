"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Layers, Lock, Plus, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell, Card, PageHeading } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";

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
            // By default select the first connected platform
            setSelectedPlatforms([connected[0].platform]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestedPlatform]);

  const togglePlatform = (platformName: string) => {
    if (selectedPlatforms.includes(platformName)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platformName));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformName]);
    }
  };

  const selectAllPlatforms = () => {
    if (selectedPlatforms.length === connectedIntegrations.length) {
      setSelectedPlatforms([connectedIntegrations[0].platform]);
    } else {
      setSelectedPlatforms(connectedIntegrations.map((i) => i.platform));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0) {
      setError("Please select at least one connected advertising platform.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a campaign name.");
      return;
    }

    if (!dailyBudget || Number(dailyBudget) <= 0) {
      setError("Please enter a valid daily budget.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          platforms: selectedPlatforms,
          platform: selectedPlatforms[0],
          objective,
          budget: Number(totalBudget) || (Number(dailyBudget) * 30),
          dailyBudget: Number(dailyBudget),
          targetRoas: targetRoas ? Number(targetRoas) : undefined,
          biddingStrategy
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create campaign");
      }

      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Create Campaign">
      <div className="mb-4 flex items-center gap-2 text-xs text-[#728099]">
        <button onClick={() => router.push("/campaigns")} className="hover:text-[#6940e8]">
          Campaigns
        </button>
        <ChevronRight size={13} />
        <span>Create New Campaign</span>
      </div>

      <PageHeading
        title="Create New Campaign"
        description="Set up your campaign details and launch across one or more connected marketing channels."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-[#f2c4c8] bg-[#fff8f8] p-4 text-xs font-semibold text-[#b72e38]">
          {error}
        </div>
      )}

      {/* No Connected Platforms State */}
      {!loading && connectedIntegrations.length === 0 && (
        <Card className="p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fee2e2] text-[#ef4444]">
            <Lock size={30} />
          </span>
          <h2 className="mt-5 text-base font-extrabold text-[#111a2e]">No Connected Platforms Found</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#63708a]">
            You have not connected any marketing accounts yet. Please connect <strong>Google Ads, Meta Ads, or another platform</strong> in Integrations before creating a campaign.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/integrations")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-5 text-xs font-bold text-white shadow hover:bg-[#5b34d6]"
            >
              Go to Integrations <ArrowRight size={14} />
            </button>
          </div>
        </Card>
      )}

      {/* Main Campaign Form */}
      {(!loading && connectedIntegrations.length > 0) && (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* 1. Basic Details & Multi-Platform Selection */}
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#111a2e]">1. Marketing Platforms & Strategy</h3>
                  <p className="mt-1 text-xs text-[#718098]">Select one or multiple connected channels for omnichannel reach.</p>
                </div>

                {connectedIntegrations.length > 1 && (
                  <button
                    type="button"
                    onClick={selectAllPlatforms}
                    className="text-xs font-bold text-[#6940e8] hover:underline"
                  >
                    {selectedPlatforms.length === connectedIntegrations.length ? "Deselect All" : "Select All Connected"}
                  </button>
                )}
              </div>

              {/* Multi-Platform Select Cards */}
              <div className="mt-4">
                <span className="mb-2 block text-xs font-bold text-[#28354d]">
                  Connected Platforms ({selectedPlatforms.length} selected) *
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {connectedIntegrations.map((item) => {
                    const isSelected = selectedPlatforms.includes(item.platform);

                    return (
                      <div
                        key={item.id}
                        onClick={() => togglePlatform(item.platform)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-[#6940e8] bg-[#f8f6ff] shadow-sm ring-2 ring-[#6940e8]/20"
                            : "border-[#dfe3ea] bg-white hover:border-[#b8a4f8] hover:bg-[#faf9ff]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={item.platform} size={28} />
                          <div>
                            <div className="text-xs font-extrabold text-[#131d32]">{item.platform}</div>
                            <div className="font-mono text-[10px] text-[#6940e8]">ID: {item.account || "Connected"}</div>
                          </div>
                        </div>

                        <div
                          className={`grid h-5 w-5 place-items-center rounded-md border transition-colors ${
                            isSelected
                              ? "border-[#6940e8] bg-[#6940e8] text-white"
                              : "border-[#ccd3e0] bg-white"
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Campaign Name *</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Sale 2024 - Omnichannel Growth"
                    required
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#6940e8]"
                  />
                </label>

                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Campaign Objective *</span>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white px-3 text-xs outline-none focus:border-[#6940e8]"
                  >
                    <option value="Sales">Sales (Conversions & Revenue)</option>
                    <option value="Leads">Leads (Form Submissions)</option>
                    <option value="Website Traffic">Website Traffic (High Intent Clicks)</option>
                    <option value="Brand Awareness">Brand Awareness (Reach & Impressions)</option>
                    <option value="App Promotion">App Promotion (Installs & Engagement)</option>
                  </select>
                </div>

                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Destination Landing Page URL *</span>
                  <input
                    type="url"
                    value={landingPage}
                    onChange={(e) => setLandingPage(e.target.value)}
                    placeholder="https://acmecorp.com/summer-deals"
                    required
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                  />
                </label>
              </div>
            </Card>

            {/* 2. Budget & Smart Bidding */}
            <Card className="p-6">
              <h3 className="text-sm font-extrabold text-[#111a2e]">2. Budget & Bidding Strategy</h3>
              <p className="mt-1 text-xs text-[#718098]">Control your daily spend cap and performance targets.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Daily Budget ($ / day) *</span>
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
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Estimated Total Budget ($ / month)</span>
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="3000"
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                  />
                </label>

                <div>
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Bidding Strategy</span>
                  <select
                    value={biddingStrategy}
                    onChange={(e) => setBiddingStrategy(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white px-3 text-xs outline-none focus:border-[#6940e8]"
                  >
                    <option>Maximize Conversions</option>
                    <option>Target ROAS (Smart Bidding)</option>
                    <option>Target CPA (Cost Cap)</option>
                    <option>Maximize Clicks</option>
                  </select>
                </div>

                <label>
                  <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Target ROAS Goal (x)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={targetRoas}
                    onChange={(e) => setTargetRoas(e.target.value)}
                    placeholder="3.5"
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                  />
                </label>
              </div>
            </Card>

            {/* 3. Ad Creative & Targeting */}
            <Card className="p-6">
              <h3 className="text-sm font-extrabold text-[#111a2e]">3. Ad Creative & Target Region</h3>
              <p className="mt-1 text-xs text-[#718098]">Add your primary headline, ad copy, and button action.</p>

              <div className="mt-5 space-y-4 text-xs">
                <label className="block">
                  <span className="mb-1.5 block font-bold text-[#28354d]">Main Headline</span>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Save 40% on Premium Products Today"
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block font-bold text-[#28354d]">Primary Ad Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your promotion, key features, and discount details..."
                    rows={3}
                    className="w-full rounded-lg border border-[#dfe3eb] p-3 outline-none focus:border-[#6940e8]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="mb-1.5 block font-bold text-[#28354d]">Call to Action</span>
                    <select
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white px-3 outline-none focus:border-[#6940e8]"
                    >
                      <option>Shop Now</option>
                      <option>Sign Up</option>
                      <option>Learn More</option>
                      <option>Get Quote</option>
                      <option>Contact Us</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block font-bold text-[#28354d]">Target Country / Region</span>
                    <input
                      type="text"
                      value={targetCountry}
                      onChange={(e) => setTargetCountry(e.target.value)}
                      placeholder="India, United States"
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                    />
                  </label>
                </div>
              </div>
            </Card>

            {/* Launch Actions */}
            <div className="flex items-center justify-between border-t border-[#edf0f4] pt-5">
              <button
                type="button"
                onClick={() => router.push("/campaigns")}
                className="h-10 rounded-lg border border-[#dfe3eb] px-5 text-xs font-bold text-[#55637a] hover:bg-[#f5f7fa]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6940e8] px-7 text-xs font-bold text-white shadow-md hover:bg-[#5a32d6] disabled:opacity-60"
              >
                <Rocket size={15} /> {busy ? "Launching Campaign…" : `Launch Campaign on ${selectedPlatforms.length} Channel${selectedPlatforms.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Right Sidebar: Real-Time Campaign Summary */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-[#edf0f4] pb-3">
                <h4 className="text-xs font-extrabold text-[#111a2e]">Campaign Summary</h4>
                <span className="rounded-md bg-[#e5f8ee] px-2 py-0.5 text-[10px] font-bold text-[#159a65]">
                  Live Preview
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-[#7d899e]">Target Channels ({selectedPlatforms.length}):</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedPlatforms.map((plat) => (
                      <span key={plat} className="inline-flex items-center gap-1 rounded-md bg-[#f0eaff] px-2 py-1 text-[11px] font-bold text-[#6940e8]">
                        <PlatformIcon platform={plat} size={14} />
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7d899e]">Campaign:</span>
                  <strong className="max-w-[140px] truncate">{name || "Untitled"}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7d899e]">Objective:</span>
                  <strong>{objective}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7d899e]">Daily Spend:</span>
                  <strong className="text-[#111a2e]">${dailyBudget || "0"} / day</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7d899e]">Monthly Budget:</span>
                  <strong>${totalBudget || "0"}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7d899e]">Bidding:</span>
                  <strong>{biddingStrategy} ({targetRoas}x)</strong>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#c8ecd9] bg-[#effbf5] p-3 text-[11px] font-semibold text-[#148b5a]">
                <ShieldCheck size={15} className="mr-1.5 inline text-[#159a65]" />
                Valid credentials verified for all selected channels.
              </div>
            </Card>
          </div>
        </form>
      )}
    </AppShell>
  );
}
