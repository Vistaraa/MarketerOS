"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  DollarSign,
  Globe,
  Layers,
  Rocket,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { PlatformIcon } from "@/components/ui/marketeros-icons";
import { cn } from "@/lib/utils";

type OnboardingStep = "brand" | "goals" | "platforms" | "complete";

export function ModernOnboardingWizard({ initialStep = "brand" }: { initialStep?: OnboardingStep }) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(initialStep);

  // Form State
  const [brandName, setBrandName] = useState("Acme Corp");
  const [website, setWebsite] = useState("https://acme.com");
  const [industry, setIndustry] = useState("E-commerce");
  const [monthlyBudget, setMonthlyBudget] = useState("$10,000 - $50,000");

  const [selectedGoal, setSelectedGoal] = useState("Maximize ROAS & Sales");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    "Google Ads",
    "Meta Ads",
    "Instagram"
  ]);

  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const toggleConnected = (platform: string) => {
    setConnectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      router.push("/overview");
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { id: "brand", label: "Brand Details" },
    { id: "goals", label: "Marketing Goals" },
    { id: "platforms", label: "Ad Channels" },
    { id: "complete", label: "Launch" }
  ];

  const currentStepIndex = stepsList.findIndex((s) => s.id === step);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#fafafa] p-4 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 sm:p-8">
      {/* Top Header & Step Progress Bar */}
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-zinc-900 font-black text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm text-sm">
              M
            </span>
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Marketer<span className="text-zinc-500">OS</span>
            </span>
          </div>

          <span className="text-xs font-semibold text-zinc-400">
            Step {currentStepIndex + 1} of {stepsList.length}
          </span>
        </div>

        {/* Progress bar line */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {stepsList.map((s, idx) => (
            <div
              key={s.id}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                idx <= currentStepIndex
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : "bg-zinc-200 dark:bg-zinc-800"
              )}
            />
          ))}
        </div>
      </div>

      {/* Main Form Container */}
      <div className="mt-6 w-full max-w-xl rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        {/* STEP 1: BRAND DETAILS */}
        {step === "brand" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Setup your brand & workspace
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Let&apos;s configure your marketing operating system workspace.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Brand or Company Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="input-clean mt-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbrand.com"
                  className="input-clean mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="input-clean mt-1.5"
                  >
                    <option>E-commerce / Retail</option>
                    <option>SaaS / Tech</option>
                    <option>Marketing Agency</option>
                    <option>Healthcare & Wellness</option>
                    <option>Finance & Fintech</option>
                    <option>Education</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Est. Monthly Ad Spend
                  </label>
                  <select
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="input-clean mt-1.5"
                  >
                    <option>&lt; $5,000 /mo</option>
                    <option>$5,000 - $10,000</option>
                    <option>$10,000 - $50,000</option>
                    <option>$50,000 - $200,000</option>
                    <option>$200,000+</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end pt-3">
              <button
                onClick={() => setStep("goals")}
                className="btn-primary w-full sm:w-auto"
              >
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MARKETING GOALS */}
        {step === "goals" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                What are your primary marketing goals?
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                MarketerOS will optimize AI insights and tracking specifically for this objective.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: "Maximize ROAS & Sales",
                  desc: "Scale conversion campaigns profitably across multi-platform ad spend."
                },
                {
                  title: "Lead Generation & B2B Pipeline",
                  desc: "Capture high-intent enterprise and inbound prospects."
                },
                {
                  title: "Brand Awareness & Reach",
                  desc: "Dominate search impression share and social video engagement."
                },
                {
                  title: "Omnichannel Retargeting",
                  desc: "Re-engage website drop-offs and dynamic catalog cart abandoners."
                }
              ].map((goal) => {
                const isSelected = selectedGoal === goal.title;
                return (
                  <div
                    key={goal.title}
                    onClick={() => setSelectedGoal(goal.title)}
                    className={cn(
                      "flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition",
                      isSelected
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {goal.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {goal.desc}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition",
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 text-transparent dark:border-zinc-700"
                      )}
                    >
                      <Check size={11} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button onClick={() => setStep("brand")} className="btn-secondary">
                <ArrowLeft size={13} /> Back
              </button>
              <button onClick={() => setStep("platforms")} className="btn-primary">
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PLATFORMS */}
        {step === "platforms" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Select your advertising platforms
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select the channels you run ads on. You can connect API credentials now or later.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                "Google Ads",
                "Meta Ads",
                "Instagram",
                "LinkedIn",
                "YouTube",
                "TikTok",
                "Google Analytics",
                "Shopify"
              ].map((plat) => {
                const isSelected = selectedChannels.includes(plat);
                const isConnected = connectedPlatforms.includes(plat);

                return (
                  <div
                    key={plat}
                    onClick={() => toggleChannel(plat)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border p-3 transition",
                      isSelected
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <PlatformIcon platform={plat} size={18} />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {plat}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleConnected(plat);
                      }}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-semibold transition",
                        isConnected
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}
                    >
                      {isConnected ? "Connected ✓" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button onClick={() => setStep("goals")} className="btn-secondary">
                <ArrowLeft size={13} /> Back
              </button>
              <button onClick={() => setStep("complete")} className="btn-primary">
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LAUNCH & COMPLETE */}
        {step === "complete" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                You&apos;re ready to scale, {brandName}!
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Your unified marketing operating workspace is ready.
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 text-left text-xs space-y-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Workspace:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{brandName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Primary Objective:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{selectedGoal}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Connected Platforms:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {selectedChannels.length} Channels Selected
                </strong>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              {loading ? (
                <span>Launching Workspace...</span>
              ) : (
                <>
                  <Rocket size={14} /> Launch Dashboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
