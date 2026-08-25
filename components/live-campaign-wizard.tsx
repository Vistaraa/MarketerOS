"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ExternalLink, HelpCircle, Layers, Lock, Plus, Rocket, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";

export function LiveCampaignWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlatform = searchParams.get("platform");

  const [step, setStep] = useState(1);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingInts, setLoadingInts] = useState(true);

  // Optimized Form States
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [name, setName] = useState("Summer Sale 2024");
  const [objective, setObjective] = useState("Sales");
  const [landingPage, setLandingPage] = useState("https://acmecorp.com/deals");
  
  // Budget & Bidding States
  const [budget, setBudget] = useState("5000");
  const [dailyBudget, setDailyBudget] = useState("165");
  const [biddingStrategy, setBiddingStrategy] = useState("Maximize Conversions");
  const [targetRoas, setTargetRoas] = useState("3.8");

  // Creatives & Targeting States
  const [headline, setHeadline] = useState("Save 40% on Premium Products");
  const [primaryText, setPrimaryText] = useState("Discover high-quality solutions built for your brand. Limited time offer.");
  const [cta, setCta] = useState("Shop Now");
  const [country, setCountry] = useState("India");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active integrations from DB
  useEffect(() => {
    fetch("/api/v1/integrations")
      .then(async (res) => {
        const json = (await res.json()) as ApiResponse<{ items: Integration[] }>;
        if (res.ok && json.data?.items) {
          const connected = json.data.items.filter((item) => item.status === "Connected");
          setIntegrations(connected);
          
          // Auto-select requested platform if connected, else select first connected platform
          if (connected.length > 0) {
            if (requestedPlatform) {
              const match = connected.find(
                (c) => c.platform.toLowerCase() === requestedPlatform.toLowerCase()
              );
              if (match) {
                setSelectedIntegrationId(match.id);
                return;
              }
            }
            setSelectedIntegrationId(connected[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingInts(false));
  }, [requestedPlatform]);

  const selectedIntegration = integrations.find((item) => item.id === selectedIntegrationId);

  const handleLaunch = async () => {
    if (!selectedIntegration) {
      setError("Please select a connected advertising platform.");
      setStep(1);
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
          platform: selectedIntegration.platform,
          objective,
          budget: Number(budget) || 5000,
          dailyBudget: Number(dailyBudget) || (Number(budget) || 5000) / 30,
          targetRoas: targetRoas ? Number(targetRoas) : undefined,
          biddingStrategy,
          integrationId: selectedIntegration.id
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create campaign");
      }

      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch campaign");
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { num: 1, label: "Platform & Strategy", desc: "Select connected channel & objective" },
    { num: 2, label: "Budget & Bidding", desc: "Spend caps and performance goals" },
    { num: 3, label: "Creatives & Launch", desc: "Ad copy, CTA and final launch" }
  ];

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
        title="Create & Launch Campaign"
        description="Configure and launch high-performing ads strictly on your verified, connected platforms."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-[#f2c4c8] bg-[#fff8f8] p-4 text-xs font-semibold text-[#b72e38]">
          {error}
        </div>
      )}

      {/* When NO platforms are connected */}
      {!loadingInts && integrations.length === 0 && (
        <Card className="p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fee2e2] text-[#ef4444]">
            <Lock size={30} />
          </span>
          <h2 className="mt-5 text-base font-extrabold text-[#111a2e]">No Connected Channels Found</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#63708a]">
            You have not connected any marketing or ad accounts yet. Please connect <strong>Google Ads, Meta Ads, or another platform</strong> in Integrations before creating a campaign.
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

      {/* Main Wizard Flow (When platforms are connected) */}
      {(!loadingInts && integrations.length > 0) && (
        <Card flush>
          {/* Step Indicator Bar */}
          <div className="grid grid-cols-3 border-b border-[#edf0f4] p-4 sm:p-5">
            {steps.map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;

              return (
                <button
                  key={s.num}
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  className={`flex items-center gap-3 text-left transition-colors ${
                    isActive ? "text-[#6940e8]" : isDone ? "text-[#159a65]" : "text-[#7b879c]"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                      isActive
                        ? "border-[#6940e8] bg-[#6940e8] text-white"
                        : isDone
                        ? "border-[#159a65] bg-[#e5f8ee] text-[#159a65]"
                        : "border-[#dfe3ea] bg-white"
                    }`}
                  >
                    {isDone ? <Check size={16} /> : s.num}
                  </span>
                  <div className="hidden sm:block">
                    <div className="text-xs font-extrabold">{s.label}</div>
                    <div className="text-[10px] text-[#818ea2]">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-5 sm:p-7">
            {/* ================= STEP 1: Connected Platform & Basics ================= */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-[#111a2e]">1. Select Connected Platform & Objective</h2>
                  <p className="mt-1 text-xs text-[#6e7b93]">
                    Showing only platforms with active, verified credentials in your workspace.
                  </p>
                </div>

                {/* Connected Platforms Selector */}
                <div>
                  <span className="mb-2.5 block text-xs font-bold text-[#28354d]">Connected Advertising Platform *</span>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {integrations.map((item) => {
                      const isSelected = selectedIntegrationId === item.id;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedIntegrationId(item.id)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            isSelected
                              ? "border-[#6940e8] bg-[#f8f6ff] shadow-md ring-2 ring-[#6940e8]/20"
                              : "border-[#dfe3ea] bg-white hover:border-[#b8a4f8] hover:bg-[#faf9ff]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <PlatformIcon platform={item.platform} size={28} />
                              <div>
                                <div className="text-xs font-extrabold text-[#131d32]">{item.platform}</div>
                                <div className="font-mono text-[10px] text-[#6940e8]">ID: {item.account || "Connected"}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6940e8] text-white">
                                <Check size={12} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Campaign Basics */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Campaign Name *</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer Sale 2024 - High Intent"
                      required
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs outline-none focus:border-[#6940e8]"
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-[#28354d]">Marketing Objective *</span>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                      {["Sales", "Leads", "Website Traffic", "Brand Awareness", "App Promotion"].map((obj) => (
                        <button
                          type="button"
                          key={obj}
                          onClick={() => setObjective(obj)}
                          className={`rounded-xl border p-3 text-center text-xs font-bold transition-all ${
                            objective === obj
                              ? "border-[#6940e8] bg-[#f5f2ff] text-[#6940e8] ring-2 ring-[#6940e8]/20"
                              : "border-[#dfe3eb] bg-white text-[#414f68] hover:bg-[#fafbfe]"
                          }`}
                        >
                          {obj}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Destination Landing Page URL *</span>
                    <input
                      type="url"
                      value={landingPage}
                      onChange={(e) => setLandingPage(e.target.value)}
                      placeholder="https://acmecorp.com/summer-sale"
                      required
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ================= STEP 2: Budget & Bidding ================= */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-[#111a2e]">2. Budget & Smart Bidding</h2>
                  <p className="mt-1 text-xs text-[#6e7b93]">Set your spending limits and algorithmic optimization strategy.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Total Campaign Budget ($) *</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => {
                        setBudget(e.target.value);
                        setDailyBudget(String(Math.round(Number(e.target.value) / 30)));
                      }}
                      placeholder="5000"
                      required
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Daily Spend Cap ($ / day) *</span>
                    <input
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="165"
                      required
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                    />
                  </label>
                </div>

                <div>
                  <span className="mb-2 block text-xs font-bold text-[#28354d]">Bidding Strategy</span>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {["Maximize Conversions", "Target ROAS (Smart Bidding)", "Maximize Clicks"].map((strat) => (
                      <button
                        type="button"
                        key={strat}
                        onClick={() => setBiddingStrategy(strat)}
                        className={`rounded-xl border p-3 text-left text-xs transition-all ${
                          biddingStrategy === strat
                            ? "border-[#6940e8] bg-[#f5f2ff] font-bold text-[#6940e8] ring-2 ring-[#6940e8]/20"
                            : "border-[#dfe3eb] bg-white text-[#414f68] hover:bg-[#fafbfe]"
                        }`}
                      >
                        {strat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#28354d]">Target ROAS Goal (x)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={targetRoas}
                      onChange={(e) => setTargetRoas(e.target.value)}
                      placeholder="3.8"
                      className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono text-xs outline-none focus:border-[#6940e8]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ================= STEP 3: Creatives & Review ================= */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-[#111a2e]">3. Ad Creatives & Launch Review</h2>
                  <p className="mt-1 text-xs text-[#6e7b93]">Configure your ad copy and verify the campaign configuration.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4 text-xs">
                    <label className="block">
                      <span className="mb-1.5 block font-bold text-[#28354d]">Main Ad Headline *</span>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Save 40% on Premium Plans"
                        required
                        className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block font-bold text-[#28354d]">Primary Ad Copy / Description *</span>
                      <textarea
                        value={primaryText}
                        onChange={(e) => setPrimaryText(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-[#dfe3eb] p-3 outline-none focus:border-[#6940e8]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block font-bold text-[#28354d]">Call to Action</span>
                        <select
                          value={cta}
                          onChange={(e) => setCta(e.target.value)}
                          className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                        >
                          <option>Shop Now</option>
                          <option>Sign Up</option>
                          <option>Learn More</option>
                          <option>Get Quote</option>
                          <option>Contact Us</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block font-bold text-[#28354d]">Target Region</span>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="India, United States"
                          className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <Card className="space-y-3.5 bg-[#fafbfe] p-5 text-xs">
                    <div className="flex items-center justify-between border-b border-[#edf0f4] pb-3">
                      <span className="font-extrabold text-[#111a2e]">Configuration Summary</span>
                      <span className="rounded-md bg-[#e5f8ee] px-2 py-0.5 text-[10px] font-bold text-[#159a65]">
                        Ready to Launch
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Connected Channel:</span>
                      <strong className="flex items-center gap-1.5 text-[#6940e8]">
                        <PlatformIcon platform={selectedIntegration?.platform || ""} size={16} />
                        {selectedIntegration?.platform}
                      </strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Connected Account:</span>
                      <span className="font-mono font-bold text-[#131e33]">{selectedIntegration?.account || "Verified"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Campaign Name:</span>
                      <strong className="text-[#131e33]">{name}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Objective:</span>
                      <strong>{objective}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Total Budget:</span>
                      <strong>${Number(budget).toLocaleString()}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Daily Spend Cap:</span>
                      <strong>${Number(dailyBudget).toLocaleString()} / day</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#6e7b93]">Bidding:</span>
                      <strong>{biddingStrategy} ({targetRoas}x)</strong>
                    </div>
                  </Card>
                </div>

                <div className="rounded-xl border border-[#c8ecd9] bg-[#effbf5] p-3.5 text-xs font-semibold text-[#148b5a]">
                  <ShieldCheck size={17} className="mr-1.5 inline text-[#159a65]" />
                  Validated credentials on {selectedIntegration?.platform}. Ready to persist campaign in PostgreSQL database.
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-[#edf0f4] pt-5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3eb] px-4 text-xs font-bold text-[#55637a] hover:bg-[#f5f7fa]"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/campaigns")}
                  className="h-9 rounded-lg border border-[#dfe3eb] px-4 text-xs font-bold text-[#55637a] hover:bg-[#f5f7fa]"
                >
                  Cancel
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !selectedIntegrationId) {
                      setError("Please select a connected platform.");
                      return;
                    }
                    setError(null);
                    setStep(step + 1);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-5 text-xs font-bold text-white shadow hover:bg-[#5b34d6]"
                >
                  Next Step <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-6 text-xs font-bold text-white shadow-md hover:bg-[#5a32d6]"
                >
                  <Rocket size={15} /> {busy ? "Launching Campaign…" : "Launch Campaign"}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
