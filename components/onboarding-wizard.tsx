"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Globe,
  Lightbulb,
  Rocket,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProductLogo, PlatformIcon } from "@/components/marketeros-icons";

type OnboardingStep = "brand" | "platforms" | "goals" | "audience" | "complete";

const STEPS: { id: OnboardingStep; title: string; subtitle: string }[] = [
  { id: "brand", title: "Create Brand", subtitle: "Tell us about your brand" },
  { id: "platforms", title: "Connect Platforms", subtitle: "Add your marketing accounts" },
  { id: "goals", title: "Marketing Goals", subtitle: "Set your objectives" },
  { id: "audience", title: "Audience & Industry", subtitle: "Define your target audience" },
  { id: "complete", title: "Complete", subtitle: "You're all set to go!" },
];

const INDUSTRIES = [
  "E-commerce",
  "SaaS & Technology",
  "Healthcare & Wellness",
  "Financial Services & FinTech",
  "Real Estate",
  "Education & EdTech",
  "Retail & Fashion",
  "Media & Entertainment",
  "Marketing & Advertising Agency",
  "Hospitality & Travel",
  "Automotive",
  "Other"
];

const BUSINESS_TYPES = ["B2C", "B2B", "D2C", "Marketplace", "Non-profit", "Other"];

const COUNTRIES = [
  { label: "India", flag: "🇮🇳" },
  { label: "United States", flag: "🇺🇸" },
  { label: "United Kingdom", flag: "🇬🇧" },
  { label: "Canada", flag: "🇨🇦" },
  { label: "Australia", flag: "🇦🇺" },
  { label: "Germany", flag: "🇩🇪" },
  { label: "Singapore", flag: "🇸🇬" },
  { label: "United Arab Emirates", flag: "🇦🇪" },
  { label: "France", flag: "🇫🇷" },
  { label: "Other", flag: "🌐" }
];

const CURRENCIES = [
  { code: "USD", label: "USD - US Dollar ($)" },
  { code: "INR", label: "INR - Indian Rupee (₹)" },
  { code: "EUR", label: "EUR - Euro (€)" },
  { code: "GBP", label: "GBP - British Pound (£)" },
  { code: "CAD", label: "CAD - Canadian Dollar (C$)" },
  { code: "AUD", label: "AUD - Australian Dollar (A$)" }
];

const TIMEZONES = [
  "(GMT+05:30) Asia/Kolkata",
  "(GMT-05:00) America/New_York",
  "(GMT-08:00) America/Los_Angeles",
  "(GMT-06:00) America/Chicago",
  "(GMT+00:00) UTC",
  "(GMT+01:00) Europe/London",
  "(GMT+01:00) Europe/Paris",
  "(GMT+04:00) Asia/Dubai",
  "(GMT+08:00) Asia/Singapore",
  "(GMT+09:00) Asia/Tokyo",
  "(GMT+10:00) Australia/Sydney"
];

const GOALS = [
  { id: "Increase sales", title: "Increase Sales & Revenue", desc: "Drive online purchases and checkout conversions" },
  { id: "Generate more leads", title: "Generate Qualified Leads", desc: "Capture high-intent B2B or B2C contact inquiries" },
  { id: "Improve ROAS", title: "Improve ROAS & Efficiency", desc: "Maximize revenue per advertising dollar spent" },
  { id: "Grow brand awareness", title: "Grow Brand Awareness", desc: "Reach new impressions and expand brand footprint" },
  { id: "Increase engagement", title: "Increase Social Engagement", desc: "Boost followers, likes, comments, and shares" },
  { id: "Reduce acquisition cost", title: "Lower Customer Acquisition Cost", desc: "Optimize funnel to acquire customers for less" }
];

const PLATFORMS_LIST = [
  { name: "Google Ads", desc: "Search, Shopping & YouTube Campaigns", connected: false },
  { name: "Meta Ads", desc: "Facebook & Instagram Ads Manager", connected: false },
  { name: "LinkedIn", desc: "B2B Sponsored Content & InMail", connected: false },
  { name: "TikTok", desc: "TikTok Video & Spark Ads", connected: false },
  { name: "Google Analytics", desc: "GA4 Traffic & Attribution Tracking", connected: false }
];

export function OnboardingWizard({ initialStep = "brand" }: { initialStep?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    (STEPS.some((s) => s.id === initialStep) ? initialStep : "brand") as OnboardingStep
  );

  const [saving, setSaving] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ name?: string; email?: string } | null>(null);

  // Form State
  const [brandName, setBrandName] = useState("Acme Corp");
  const [website, setWebsite] = useState("https://acmecorp.com");
  const [industry, setIndustry] = useState("E-commerce");
  const [businessType, setBusinessType] = useState("B2C");
  const [description, setDescription] = useState("We sell premium lifestyle products online.");
  const [country, setCountry] = useState("India");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("(GMT+05:30) Asia/Kolkata");
  const [monthlyBudget, setMonthlyBudget] = useState("10000");

  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "Increase sales",
    "Generate more leads",
    "Improve ROAS"
  ]);

  const [primaryAudience, setPrimaryAudience] = useState("Marketing leaders & digital consumers");
  const [ageRange, setAgeRange] = useState("25–44");
  const [geography, setGeography] = useState("India, United States, UK");
  const [languages, setLanguages] = useState("English");
  const [customerType, setCustomerType] = useState("Digital shopper & brand enthusiast");

  // Load existing workspace settings and user
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.data?.user) setSessionUser(payload.data.user);
      })
      .catch(() => {});

    fetch("/api/v1/settings")
      .then((res) => res.json())
      .then((payload) => {
        const ws = payload.data?.workspace;
        if (ws) {
          if (ws.name) setBrandName(ws.name);
          if (ws.website) setWebsite(ws.website);
          if (ws.industry) setIndustry(ws.industry);
          if (ws.businessType) setBusinessType(ws.businessType);
          if (ws.description) setDescription(ws.description);
          if (ws.country) setCountry(ws.country);
          if (ws.currency) setCurrency(ws.currency);
          if (ws.timezone) setTimezone(ws.timezone);
          if (ws.monthlyBudget) setMonthlyBudget(String(ws.monthlyBudget));
          if (Array.isArray(ws.marketingGoals) && ws.marketingGoals.length) {
            setSelectedGoals(ws.marketingGoals);
          }
          if (ws.targetAudience) setPrimaryAudience(ws.targetAudience);
          if (ws.targetAgeRange) setAgeRange(ws.targetAgeRange);
          if (ws.targetGeo) setGeography(ws.targetGeo);
          if (ws.targetLanguages) setLanguages(ws.targetLanguages);
        }
      })
      .catch(() => {});
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progressPercent = Math.round(((currentIndex + 1) / STEPS.length) * 100);

  // Save current step data to database
  const saveCurrentState = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: brandName,
          website: website || undefined,
          industry,
          businessType,
          description,
          country,
          currency,
          timezone,
          monthlyBudget: monthlyBudget ? Number(monthlyBudget.replace(/[^0-9.]/g, "")) : undefined,
          marketingGoals: selectedGoals,
          targetAudience: primaryAudience,
          targetAgeRange: ageRange,
          targetGeo: geography,
          targetLanguages: languages
        })
      });
    } catch {
      // Non-blocking save
    } finally {
      setSaving(false);
    }
  };

  const goToStep = async (step: OnboardingStep) => {
    await saveCurrentState();
    setCurrentStep(step);
    router.replace(`/onboarding/${step}`);
  };

  const handleNext = async () => {
    if (currentIndex < STEPS.length - 1) {
      await goToStep(STEPS[currentIndex + 1].id);
    } else {
      await saveCurrentState();
      router.push("/overview");
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevStep = STEPS[currentIndex - 1].id;
      setCurrentStep(prevStep);
      router.replace(`/onboarding/${prevStep}`);
    }
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const initials = (sessionUser?.name || "Rohan Mehta")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-[#fafbfe]">
      {/* Left Sidebar */}
      <aside className="hidden w-[260px] flex-col bg-[#07132b] p-6 lg:flex lg:justify-between">
        <div>
          <ProductLogo />

          <div className="mt-10 space-y-2">
            {STEPS.map((stepItem, idx) => {
              const isCurrent = stepItem.id === currentStep;
              const isDone = idx < currentIndex;

              return (
                <div
                  key={stepItem.id}
                  onClick={() => goToStep(stepItem.id)}
                  className={cn(
                    "relative cursor-pointer rounded-xl p-3 transition",
                    isCurrent ? "bg-[#5433ce]" : "hover:bg-white/[.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                        isDone
                          ? "bg-[#6d45f0] text-white"
                          : isCurrent
                          ? "bg-[#805cf5] text-white ring-2 ring-white/30"
                          : "border border-white/20 text-[#a0acc5]"
                      )}
                    >
                      {isDone ? <Check size={14} /> : idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">{stepItem.title}</div>
                      <div className="mt-0.5 text-[10px] text-[#b0bbd3]">{stepItem.subtitle}</div>
                    </div>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "absolute left-[27px] top-[46px] h-5 w-px",
                        idx < currentIndex ? "bg-[#6d45f0]" : "bg-white/10"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Almost there banner */}
        <div className="rounded-2xl border border-white/10 bg-[#0f2146] p-5 text-center shadow-lg">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-[#9a7dff]">
            <Rocket size={28} />
          </div>
          <div className="mt-3 text-sm font-bold text-white">Almost there!</div>
          <p className="mt-1.5 text-[11px] leading-5 text-[#a8b5ce]">
            This quick setup helps us personalize your dashboard and AI insights.
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex min-h-[72px] items-center justify-between border-b border-[#e7eaf0] bg-white px-5 sm:px-10">
          <div>
            <div className="text-base font-extrabold text-[#10192d]">
              Welcome to MarketerOS 👋
            </div>
            <div className="text-xs text-[#717e96]">Let's set up your workspace</div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/settings")}
              className="hidden items-center gap-1 text-xs font-medium text-[#65728a] hover:text-[#10192d] sm:flex"
            >
              <CircleHelp size={15} /> Need help?
            </button>
            <div className="flex items-center gap-2.5 border-l border-[#e4e7ee] pl-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dce7ff] text-[10px] font-extrabold text-[#2a4d85]">
                {initials}
              </span>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-[#10192d]">
                  {sessionUser?.name || "Rohan Mehta"}
                </span>
                <span className="block text-[10px] text-[#79869e]">Workspace Owner</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-10">
          <div className="mx-auto max-w-[1240px]">
            {/* Step 1: Create Brand */}
            {currentStep === "brand" && (
              <>
                <div className="mb-6">
                  <h1 className="text-[28px] font-extrabold tracking-[-.05em] text-[#10192d]">
                    Create Your Brand
                  </h1>
                  <p className="mt-1 text-xs text-[#6e7b93]">
                    Let's start with some basic information about your brand or business.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  {/* Form Box */}
                  <div className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_4px_20px_rgba(20,29,51,.04)] sm:p-8">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Brand Name */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Brand / Business Name *
                        </label>
                        <div className="relative">
                          <Building2
                            size={16}
                            className="absolute left-3 top-3 text-[#8794aa]"
                          />
                          <input
                            required
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] pl-9 pr-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          />
                        </div>
                      </div>

                      {/* Website */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Website <span className="font-normal text-[#7b889f]">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Globe size={16} className="absolute left-3 top-3 text-[#8794aa]" />
                          <input
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://acmecorp.com"
                            className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] pl-9 pr-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          />
                        </div>
                      </div>

                      {/* Industry */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Industry *
                        </label>
                        <div className="relative">
                          <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3.5 text-xs font-medium text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          >
                            {INDUSTRIES.map((ind) => (
                              <option key={ind} value={ind}>
                                {ind}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-3.5 text-[#8794aa]"
                          />
                        </div>
                      </div>

                      {/* Business Type */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Business Type *
                        </label>
                        <div className="relative">
                          <select
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3.5 text-xs font-medium text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          >
                            {BUSINESS_TYPES.map((bt) => (
                              <option key={bt} value={bt}>
                                {bt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-3.5 text-[#8794aa]"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-[#202e48]">
                            Description <span className="font-normal text-[#7b889f]">(Optional)</span>
                          </span>
                          <span className="text-[11px] text-[#8692a7]">
                            {description.length}/500
                          </span>
                        </div>
                        <textarea
                          maxLength={500}
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Briefly describe what your company does and who you serve..."
                          className="w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] p-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                        />
                      </div>

                      {/* Country */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Country *
                        </label>
                        <div className="relative">
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3.5 text-xs font-medium text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.label} value={c.label}>
                                {c.flag} {c.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-3.5 text-[#8794aa]"
                          />
                        </div>
                      </div>

                      {/* Currency */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Currency *
                        </label>
                        <div className="relative">
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3.5 text-xs font-medium text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          >
                            {CURRENCIES.map((cur) => (
                              <option key={cur.code} value={cur.code}>
                                {cur.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-3.5 text-[#8794aa]"
                          />
                        </div>
                      </div>

                      {/* Time Zone */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Time Zone *
                        </label>
                        <div className="relative">
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3.5 text-xs font-medium text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          >
                            {TIMEZONES.map((tz) => (
                              <option key={tz} value={tz}>
                                {tz}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-3.5 text-[#8794aa]"
                          />
                        </div>
                      </div>

                      {/* Monthly Budget */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                          Monthly Marketing Budget{" "}
                          <span className="font-normal text-[#7b889f]">(Optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-xs font-bold text-[#717e96]">
                            $
                          </span>
                          <input
                            value={monthlyBudget}
                            onChange={(e) => setMonthlyBudget(e.target.value)}
                            placeholder="10,000"
                            className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] pl-8 pr-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notice Banner */}
                    <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#e6defe] bg-[#f8f5ff] p-3.5 text-xs font-medium text-[#5f38d4]">
                      <Sparkles size={16} className="shrink-0 text-[#7a4df0]" />
                      <span>
                        Don't worry, you can always update these details later from{" "}
                        <strong className="underline">settings</strong>.
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex items-center justify-between border-t border-[#edf0f4] pt-6">
                      <button
                        type="button"
                        onClick={() => goToStep("platforms")}
                        className="rounded-xl border border-[#dce0ea] px-5 py-2.5 text-xs font-bold text-[#45546f] hover:bg-[#f6f8fb]"
                      >
                        Skip for now
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => router.push("/overview")}
                          className="rounded-xl border border-[#dce0ea] px-5 py-2.5 text-xs font-bold text-[#6a7890] hover:bg-[#f6f8fb]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving || !brandName.trim()}
                          onClick={handleNext}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6937e7] to-[#7949ee] px-6 py-2.5 text-xs font-bold text-white shadow-[0_5px_15px_rgba(105,55,231,.25)] hover:brightness-105"
                        >
                          {saving ? "Saving…" : "Next: Connect Platforms"}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Why We Need This Sidebar */}
                  <div className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_4px_20px_rgba(20,29,51,.04)]">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#111a2e]">
                      <span className="text-[#6940e8]">📋</span> Why we need this?
                    </div>

                    <div className="mt-5 space-y-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-[#1f2d47]">
                          <Check size={15} className="text-[#1cb377]" /> Personalized dashboard
                        </div>
                        <p className="ml-6 mt-1 text-[11px] leading-5 text-[#738097]">
                          Get data and insights tailored specifically to your industry and business model.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 font-bold text-[#1f2d47]">
                          <Check size={15} className="text-[#1cb377]" /> Better AI recommendations
                        </div>
                        <p className="ml-6 mt-1 text-[11px] leading-5 text-[#738097]">
                          Our AI engine analyzes your target audience to suggest high-ROAS creative angles.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 font-bold text-[#1f2d47]">
                          <Check size={15} className="text-[#1cb377]" /> Smarter reporting
                        </div>
                        <p className="ml-6 mt-1 text-[11px] leading-5 text-[#738097]">
                          We'll automatically surface the metrics, KPIs, and currency formats that matter most.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 rounded-xl border border-[#f3ecc2] bg-[#fffdf0] p-3 text-[11px] text-[#7d6719]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lightbulb size={14} className="text-[#d89f07]" /> Tip
                      </div>
                      <p className="mt-1">
                        You can create and manage multiple brands and client accounts inside your workspace later.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Connect Platforms */}
            {currentStep === "platforms" && (
              <>
                <div className="mb-6">
                  <h1 className="text-[28px] font-extrabold tracking-[-.05em] text-[#10192d]">
                    Connect Your Marketing Channels
                  </h1>
                  <p className="mt-1 text-xs text-[#6e7b93]">
                    Link your advertising and analytics accounts to enable automatic sync and cross-platform reports.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_4px_20px_rgba(20,29,51,.04)] sm:p-8">
                  <div className="space-y-3">
                    {PLATFORMS_LIST.map((platform) => (
                      <div
                        key={platform.name}
                        className="flex items-center justify-between rounded-xl border border-[#e7eaf2] p-4 transition hover:border-[#ccd4e5]"
                      >
                        <div className="flex items-center gap-3.5">
                          <PlatformIcon platform={platform.name} size={36} />
                          <div>
                            <div className="text-xs font-bold text-[#142036]">{platform.name}</div>
                            <div className="text-[11px] text-[#717e96]">{platform.desc}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => router.push("/integrations")}
                          className="rounded-xl border border-[#dfe3ed] bg-white px-4 py-2 text-xs font-bold text-[#5536da] hover:bg-[#f6f4fe]"
                        >
                          Connect Account
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#edf0f4] pt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce0ea] px-5 py-2.5 text-xs font-bold text-[#45546f] hover:bg-[#f6f8fb]"
                    >
                      <ChevronLeft size={14} /> Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6937e7] to-[#7949ee] px-6 py-2.5 text-xs font-bold text-white shadow-[0_5px_15px_rgba(105,55,231,.25)] hover:brightness-105"
                    >
                      Next: Marketing Goals <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Marketing Goals */}
            {currentStep === "goals" && (
              <>
                <div className="mb-6">
                  <h1 className="text-[28px] font-extrabold tracking-[-.05em] text-[#10192d]">
                    What are your primary marketing goals?
                  </h1>
                  <p className="mt-1 text-xs text-[#6e7b93]">
                    Select the key outcomes your team wants to optimize for over the next 90 days.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_4px_20px_rgba(20,29,51,.04)] sm:p-8">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {GOALS.map((goal) => {
                      const selected = selectedGoals.includes(goal.id);
                      return (
                        <div
                          key={goal.id}
                          onClick={() => toggleGoal(goal.id)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition",
                            selected
                              ? "border-[#7752f2] bg-[#f8f5ff] shadow-[0_4px_14px_rgba(119,82,242,.1)]"
                              : "border-[#e5e8f0] hover:border-[#ccd4e5]"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleGoal(goal.id)}
                            className="mt-0.5 h-4 w-4 rounded accent-[#6940e8]"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#142036]">{goal.title}</div>
                            <div className="mt-0.5 text-[11px] text-[#717e96]">{goal.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#edf0f4] pt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce0ea] px-5 py-2.5 text-xs font-bold text-[#45546f] hover:bg-[#f6f8fb]"
                    >
                      <ChevronLeft size={14} /> Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6937e7] to-[#7949ee] px-6 py-2.5 text-xs font-bold text-white shadow-[0_5px_15px_rgba(105,55,231,.25)] hover:brightness-105"
                    >
                      Next: Audience & Industry <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Audience & Industry */}
            {currentStep === "audience" && (
              <>
                <div className="mb-6">
                  <h1 className="text-[28px] font-extrabold tracking-[-.05em] text-[#10192d]">
                    Define Your Target Audience
                  </h1>
                  <p className="mt-1 text-xs text-[#6e7b93]">
                    Help our AI generator and reporting suite understand the exact profiles you target.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_4px_20px_rgba(20,29,51,.04)] sm:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                        Primary Audience Description
                      </label>
                      <input
                        value={primaryAudience}
                        onChange={(e) => setPrimaryAudience(e.target.value)}
                        placeholder="e.g. Young professionals interested in fitness and wellness"
                        className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                        Target Age Range
                      </label>
                      <input
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        placeholder="e.g. 21–45"
                        className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                        Target Geographies
                      </label>
                      <input
                        value={geography}
                        onChange={(e) => setGeography(e.target.value)}
                        placeholder="e.g. United States, India, UK"
                        className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                        Target Languages
                      </label>
                      <input
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        placeholder="e.g. English, Spanish"
                        className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-[#202e48]">
                        Primary Customer Persona
                      </label>
                      <input
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        placeholder="e.g. Direct Consumer, Enterprise Decision Maker"
                        className="h-11 w-full rounded-xl border border-[#dfe4ed] bg-[#fbfcfe] px-3 text-xs text-[#202e48] outline-none transition focus:border-[#8d72f7] focus:bg-white focus:ring-4 focus:ring-[#f0ecff]"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#edf0f4] pt-6">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce0ea] px-5 py-2.5 text-xs font-bold text-[#45546f] hover:bg-[#f6f8fb]"
                    >
                      <ChevronLeft size={14} /> Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6937e7] to-[#7949ee] px-6 py-2.5 text-xs font-bold text-white shadow-[0_5px_15px_rgba(105,55,231,.25)] hover:brightness-105"
                    >
                      Complete Setup <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Complete */}
            {currentStep === "complete" && (
              <div className="mx-auto max-w-[620px] rounded-3xl border border-[#e5e8f0] bg-white p-8 text-center shadow-[0_12px_40px_rgba(20,29,51,.08)] sm:p-12">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#e5f8ee] text-[#14a36b] shadow-[0_8px_20px_rgba(20,163,107,.2)]">
                  <Check size={36} strokeWidth={2.6} />
                </span>

                <h1 className="mt-6 text-[28px] font-extrabold tracking-[-.05em] text-[#10192d]">
                  Your Workspace is Ready! 🎉
                </h1>
                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#67748c]">
                  We have successfully configured <strong>{brandName}</strong> with your industry,
                  currency ({currency}), time zone ({timezone}), and marketing goals.
                </p>

                <div className="mt-6 rounded-2xl border border-[#edf0f5] bg-[#f9fafc] p-4 text-left text-xs">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-[#7d8aa0]">Brand Name:</span>
                      <strong className="text-[#10192d]">{brandName}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#7d8aa0]">Industry:</span>
                      <strong className="text-[#10192d]">{industry} ({businessType})</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#7d8aa0]">Budget:</span>
                      <strong className="text-[#10192d]">${monthlyBudget} / month</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#7d8aa0]">Active Goals:</span>
                      <strong className="text-[#10192d]">{selectedGoals.length} Selected</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/overview")}
                  className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6937e7] to-[#7949ee] text-xs font-bold text-white shadow-[0_8px_20px_rgba(105,55,231,.3)] hover:brightness-105"
                >
                  Go to Dashboard <ArrowRight size={15} />
                </button>
              </div>
            )}

            {/* Setup Progress Bar */}
            <div className="mt-12 rounded-xl border border-[#e8ebf2] bg-white p-4">
              <div className="flex items-center justify-between text-xs text-[#6e7b93]">
                <span className="font-bold text-[#1f2d47]">
                  Setup Progress: <span className="font-normal">{currentIndex + 1} of 5 completed</span>
                </span>
                <span className="font-bold text-[#5c37d8]">{progressPercent}%</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#eef0f6]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6937e7] to-[#7e4ff2] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
