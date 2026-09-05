"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  KeyRound,
  Layers,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlink,
  X
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import { PlatformIcon } from "@/components/ui/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoogleAdsConnectModal } from "@/components/integrations/google-ads-connect-modal";
import { GoogleAdsSetupGuide } from "@/components/integrations/google-ads-setup-guide";
import { AdMobConnectModal } from "@/components/integrations/admob-connect-modal";
import { AdMobSetupGuide } from "@/components/integrations/admob-setup-guide";

interface StepGuide {
  step: number;
  title: string;
  instruction: string;
  tip?: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  ecosystem: "Google" | "Meta" | "Other";
  description: string;
  portalName: string;
  portalUrl: string;
  idLabel: string;
  idPlaceholder: string;
  idHelp: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyHelp: string;
  secondaryIdLabel?: string;
  secondaryIdPlaceholder?: string;
  secondaryIdHelp?: string;
  prerequisites: string[];
  guideSteps: StepGuide[];
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  // ==================== GOOGLE ECOSYSTEM ====================
  {
    id: "Google Ads",
    name: "Google Ads",
    ecosystem: "Google",
    description: "Search, Display, Shopping, YouTube, and Performance Max ad campaigns.",
    portalName: "Google Ads Manager",
    portalUrl: "https://ads.google.com",
    idLabel: "Customer ID",
    idPlaceholder: "123-456-7890",
    idHelp: "10-digit number formatted as XXX-XXX-XXXX.",
    keyLabel: "OAuth Authorization",
    keyPlaceholder: "Sign in with Google OAuth",
    keyHelp: "OAuth 2.0 with AdWords read/write scope.",
    prerequisites: ["Active Google Ads account", "Google Cloud Console project with Google Ads API enabled"],
    guideSteps: [
      {
        step: 1,
        title: "Click 'Sign in with Google'",
        instruction: "Initiate OAuth consent flow to securely connect your ad account without manual API tokens.",
        tip: "Requires offline access to refresh metrics."
      },
      {
        step: 2,
        title: "Select Customer ID",
        instruction: "Choose your target ad account from the dynamically populated accounts list.",
        tip: "Manager (MCC) accounts are supported via login-customer-id."
      }
    ]
  },
  {
    id: "Google Analytics",
    name: "Google Analytics 4",
    ecosystem: "Google",
    description: "Web and app traffic, event streams, audience funnels, and real-time active users.",
    portalName: "Google Analytics Admin",
    portalUrl: "https://analytics.google.com",
    idLabel: "GA4 Property ID",
    idPlaceholder: "123456789",
    idHelp: "9-digit numeric Property ID from Admin > Property Settings.",
    keyLabel: "Service Account JSON / Measurement API Secret",
    keyPlaceholder: "Paste service account private key or API secret",
    keyHelp: "API Secret generated in GA4 Admin > Data Streams > Measurement Protocol API secrets.",
    prerequisites: ["GA4 Property created", "Editor or Administrator role on Property"],
    guideSteps: [
      {
        step: 1,
        title: "Locate GA4 Property ID",
        instruction: "Open analytics.google.com. Navigate to Admin (gear icon) > Property Settings. Copy the numeric Property ID.",
        tip: "Example: 312984712"
      },
      {
        step: 2,
        title: "Create Measurement API Secret",
        instruction: "Under Data Collection and modification > Data Streams > click your Web stream > Measurement Protocol API secrets > Create new secret.",
        tip: "Copy the Secret Value and paste below."
      }
    ]
  },
  {
    id: "Google Search Console",
    name: "Google Search Console",
    ecosystem: "Google",
    description: "Organic search impressions, click-through rates, indexing status, and keyword rankings.",
    portalName: "Google Search Console",
    portalUrl: "https://search.google.com/search-console",
    idLabel: "Site URL / Domain Resource",
    idPlaceholder: "https://yourdomain.com or sc-domain:yourdomain.com",
    idHelp: "Exact URL prefix or Domain property name registered in GSC.",
    keyLabel: "OAuth Token / Service Account Key",
    keyPlaceholder: "Paste Service Account email or API Token",
    keyHelp: "Service account with 'webmasters.readonly' permission.",
    prerequisites: ["Verified ownership of Domain or URL-prefix property in Search Console"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Verified Property URL",
        instruction: "In Search Console top-left property selector, copy the exact site address.",
        tip: "Prefix properties start with https://, domain properties start with sc-domain:"
      },
      {
        step: 2,
        title: "Add Service Account as User",
        instruction: "Navigate to Settings > Users and permissions > Add User. Grant 'Restricted' or 'Full' read permission.",
        tip: "Enables automated daily keyword ranking sync."
      }
    ]
  },
  {
    id: "YouTube",
    name: "YouTube Channel",
    ecosystem: "Google",
    description: "Video views, subscriber growth, retention curves, and engagement analytics.",
    portalName: "YouTube Studio",
    portalUrl: "https://studio.youtube.com",
    idLabel: "YouTube Channel ID",
    idPlaceholder: "UC1234567890abcdef",
    idHelp: "24-character Channel ID from YouTube Studio > Settings > Channel > Advanced settings.",
    keyLabel: "YouTube Data API v3 Key",
    keyPlaceholder: "AIzaSy...",
    keyHelp: "API Key from Google Cloud Console with YouTube Data API v3 enabled.",
    prerequisites: ["YouTube Channel with public or unlisted video uploads"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Channel ID",
        instruction: "Sign in to studio.youtube.com. In left menu click Customization > Basic info (or Settings > Channel > Advanced). Copy Channel ID.",
        tip: "Starts with 'UC'."
      },
      {
        step: 2,
        title: "Enable YouTube Data API v3",
        instruction: "In Google Cloud Console, enable 'YouTube Data API v3' and generate an API key restricted to your domain.",
        tip: "Paste your Channel ID and API Key below."
      }
    ]
  },
  {
    id: "Firebase",
    name: "Firebase & AdMob",
    ecosystem: "Google",
    description: "App analytics, mobile crash monitoring, user retention, and AdMob ad revenue.",
    portalName: "Firebase Console",
    portalUrl: "https://console.firebase.google.com",
    idLabel: "Firebase Project ID",
    idPlaceholder: "my-mobile-app-12345",
    idHelp: "Project ID from Firebase Console > Project Settings > General.",
    keyLabel: "Web API Key / Server Token",
    keyPlaceholder: "AIzaSy...",
    keyHelp: "Found in Firebase Console > Project Settings > General > Web API Key.",
    prerequisites: ["Active Firebase project connected to iOS / Android app"],
    guideSteps: [
      {
        step: 1,
        title: "Locate Project ID",
        instruction: "Open console.firebase.google.com > Click gear icon > Project settings. Copy the Project ID string.",
        tip: "Example: app-production-84920"
      },
      {
        step: 2,
        title: "Copy Web API Key",
        instruction: "In the same Project settings page, copy the 'Web API Key'.",
        tip: "Paste Project ID and Web API Key below."
      }
    ]
  },
  // ==================== META ECOSYSTEM ====================
  {
    id: "Meta Ads",
    name: "Meta Ads (Facebook & Instagram)",
    ecosystem: "Meta",
    description: "Meta Ads Manager, custom audiences, dynamic catalog sales, and conversion tracking.",
    portalName: "Meta Business Suite & Developers",
    portalUrl: "https://adsmanager.facebook.com",
    idLabel: "Ad Account ID",
    idPlaceholder: "act_123456789012345",
    idHelp: "Format: act_XXXXXXXXXXXXXXX from top left of Ads Manager.",
    keyLabel: "System User Permanent Access Token",
    keyPlaceholder: "EAA...",
    keyHelp: "Generated in Meta Business Manager > System Users > Generate New Token.",
    secondaryIdLabel: "Meta Pixel ID (Optional)",
    secondaryIdPlaceholder: "123456789012345",
    secondaryIdHelp: "Dataset / Pixel ID for conversion tracking.",
    prerequisites: ["Meta Business Manager admin access", "System User with ads_management permissions"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Ad Account ID",
        instruction: "Open adsmanager.facebook.com. In the top-left account dropdown, copy the numeric ID (prefix with 'act_').",
        tip: "Example: act_987654321012345"
      },
      {
        step: 2,
        title: "Generate System User Token",
        instruction: "Go to business.facebook.com/settings > Users > System Users. Create a System User, assign your Ad Account with Full Control, and click 'Generate New Token'.",
        tip: "Select 'ads_management', 'ads_read', and 'business_management' scopes."
      }
    ]
  },
  {
    id: "Instagram",
    name: "Instagram Professional",
    ecosystem: "Meta",
    description: "Post publishing, Story metrics, Reels analytics, and follower growth.",
    portalName: "Instagram & Meta Business Suite",
    portalUrl: "https://business.facebook.com",
    idLabel: "Instagram Professional Account ID",
    idPlaceholder: "17841400000000000",
    idHelp: "Numeric Instagram Business ID connected to your Facebook Page.",
    keyLabel: "Graph API Access Token",
    keyPlaceholder: "EAA...",
    keyHelp: "Token with instagram_basic, instagram_manage_insights permissions.",
    prerequisites: ["Instagram Business or Creator account connected to a Facebook Page"],
    guideSteps: [
      {
        step: 1,
        title: "Connect to Facebook Page",
        instruction: "In Instagram mobile app, navigate to Settings > Account > Switch to Professional Account, then connect to your Facebook Page.",
        tip: "Required for Meta Graph API access."
      }
    ]
  },
  // ==================== OTHER PLATFORMS ====================
  {
    id: "LinkedIn",
    name: "LinkedIn Ads & Pages",
    ecosystem: "Other",
    description: "B2B campaign manager, lead gen forms, company page engagement.",
    portalName: "LinkedIn Campaign Manager",
    portalUrl: "https://www.linkedin.com/campaignmanager",
    idLabel: "LinkedIn Ad Account ID",
    idPlaceholder: "501234567",
    idHelp: "Numeric Account ID from LinkedIn Campaign Manager.",
    keyLabel: "OAuth Access Token / API Secret",
    keyPlaceholder: "Paste OAuth token",
    keyHelp: "Generated in LinkedIn Developer Portal for your app.",
    prerequisites: ["LinkedIn Ad Account with Administrator or Campaign Manager access"],
    guideSteps: [
      {
        step: 1,
        title: "Locate Account ID",
        instruction: "Sign in to linkedin.com/campaignmanager. In account list, copy the 9-digit numeric ID.",
        tip: "Example: 508291049"
      }
    ]
  },
  {
    id: "TikTok",
    name: "TikTok Ads Manager",
    ecosystem: "Other",
    description: "TikTok for Business ad campaigns, video views, and Spark ads.",
    portalName: "TikTok Ads Manager",
    portalUrl: "https://ads.tiktok.com",
    idLabel: "Advertiser ID",
    idPlaceholder: "6912345678901234567",
    idHelp: "Numeric Advertiser ID from top right of TikTok Ads Manager.",
    keyLabel: "Long-Term Access Token",
    keyPlaceholder: "Paste Access Token",
    keyHelp: "Generated in TikTok Developer Center with 'ads.read' scope.",
    prerequisites: ["TikTok Business Account with active Ads Manager"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Advertiser ID",
        instruction: "Sign in to ads.tiktok.com. In top-right profile menu, copy the 19-digit Advertiser ID.",
        tip: "Example: 7019283746192837461"
      }
    ]
  },
  {
    id: "Shopify",
    name: "Shopify Store",
    ecosystem: "Other",
    description: "E-commerce orders, customer lifetime value, store revenue, and cart drop-offs.",
    portalName: "Shopify Admin",
    portalUrl: "https://admin.shopify.com",
    idLabel: "Shopify Store Domain",
    idPlaceholder: "your-store.myshopify.com",
    idHelp: "Your unique .myshopify.com domain handle.",
    keyLabel: "Admin API Access Token",
    keyPlaceholder: "shpat_...",
    keyHelp: "Generated in Shopify Admin > Settings > Apps and sales channels > Develop apps.",
    prerequisites: ["Shopify Store Admin permissions to develop apps"],
    guideSteps: [
      {
        step: 1,
        title: "Create Custom App",
        instruction: "In Shopify Admin > Settings > Apps and sales channels > Develop apps > Create an app.",
        tip: "Configure Admin API scopes for read_orders, read_products, read_analytics."
      }
    ]
  }
];

export function LiveIntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Google" | "Meta" | "Other">("All");

  // Google Ads Modals
  const [googleAdsConnectOpen, setGoogleAdsConnectOpen] = useState(false);
  const [googleAdsGuideOpen, setGoogleAdsGuideOpen] = useState(false);

  // AdMob Modals
  const [admobConnectOpen, setAdMobConnectOpen] = useState(false);
  const [admobGuideOpen, setAdMobGuideOpen] = useState(false);

  // Generic Modals for other platforms
  const [genericConnectModalOpen, setGenericConnectModalOpen] = useState(false);
  const [genericGuideModalOpen, setGenericGuideModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);

  // Generic Form inputs
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [secondaryId, setSecondaryId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Disconnect target
  const [disconnectTarget, setDisconnectTarget] = useState<{ integrationId: string; platformName: string } | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/integrations");
      const json = (await res.json()) as ApiResponse<{ items: Integration[] }>;
      if (!res.ok) throw new Error(json.error?.message || "Failed to load integrations");
      setIntegrations(json.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("oauth") === "success") {
        const prov = params.get("provider");
        if (prov === "google_ads") {
          setGoogleAdsConnectOpen(true);
        } else if (prov === "admob" || prov === "google_admob") {
          setAdMobConnectOpen(true);
        }
      }
    }
  }, []);

  const getIntegrationForPlatform = (platformId: string) => {
    if (!platformId) return undefined;
    return integrations.find((item) => {
      const p = item.platform.toLowerCase();
      const target = platformId.toLowerCase();
      if (p === target) return true;
      if (target === "google ads" && p === "google ads") return true;
      if (target === "google analytics" && p === "google analytics") return true;
      if ((target === "firebase" || target === "admob" || target === "firebase & admob") &&
          (p.includes("firebase") || p.includes("admob") || item.providerKey === "google_admob" || item.providerKey === "admob")) return true;
      if (target === "meta ads" && (p === "meta ads" || p === "meta")) return true;
      if (target === "instagram" && p === "instagram") return true;
      if (target === "linkedin" && p === "linkedin") return true;
      if (target === "tiktok" && p === "tiktok") return true;
      if (target === "shopify" && p === "shopify") return true;
      return false;
    });
  };

  const handleOpenConnect = (platform: PlatformConfig, existing?: Integration) => {
    if (platform.id === "Google Ads") {
      setGoogleAdsConnectOpen(true);
      return;
    }
    if (platform.id === "Firebase" || platform.name.toLowerCase().includes("admob")) {
      setAdMobConnectOpen(true);
      return;
    }
    setSelectedPlatform(platform);
    setAccountName(existing?.account ? `${platform.name} (${existing.account})` : `My ${platform.name}`);
    setAccountId(existing?.account || "");
    setSecondaryId("");
    setApiKey("");
    setError(null);
    setSuccessMsg(null);
    setGenericConnectModalOpen(true);
  };

  const handleOpenGuide = (platform: PlatformConfig) => {
    if (platform.id === "Google Ads") {
      setGoogleAdsGuideOpen(true);
      return;
    }
    if (platform.id === "Firebase" || platform.name.toLowerCase().includes("admob")) {
      setAdMobGuideOpen(true);
      return;
    }
    setSelectedPlatform(platform);
    setGenericGuideModalOpen(true);
  };

  const handleGenericConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;

    if (!accountId.trim()) {
      setError(`Please enter a valid ${selectedPlatform.idLabel}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations/connect-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform.id,
          accountName: accountName.trim() || selectedPlatform.name,
          accountId: accountId.trim(),
          apiKey: apiKey.trim(),
          metadata: secondaryId.trim() ? { secondaryId: secondaryId.trim() } : undefined
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Connection failed");

      setSuccessMsg(`Successfully connected ${selectedPlatform.name}!`);
      setTimeout(() => {
        setGenericConnectModalOpen(false);
        fetchIntegrations();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;

    try {
      setBusy(true);
      const res = await fetch("/api/v1/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: disconnectTarget.integrationId })
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Disconnect failed");
      }
      setDisconnectTarget(null);
      await fetchIntegrations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect platform");
    } finally {
      setBusy(false);
    }
  };

  const filteredPlatforms = useMemo(() => {
    return SUPPORTED_PLATFORMS.filter((p) => {
      const matchesTab = activeTab === "All" || p.ecosystem === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const googleAdsIntegration = getIntegrationForPlatform("Google Ads");
  const isGoogleAdsConnected = googleAdsIntegration?.status === "Connected";

  return (
    <AppShell title="Integrations & Ad Accounts">
      <div className="space-y-5">
        <PageHeading
          title="Platform Integrations"
          description="Connect advertising accounts and analytics properties with zero-API-key OAuth and live data synchronization."
        />

        {/* Global Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {(["All", "Google", "Meta", "Other"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-semibold transition",
                  activeTab === tab
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                )}
              >
                {tab === "All" ? "All Platforms" : `${tab} Ecosystem`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platforms…"
              className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* =========================================================================
           GRID OF ALL SUPPORTED PLATFORMS
           ========================================================================= */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlatforms.map((platform) => {
              const existing = getIntegrationForPlatform(platform.id);
              const isConnected = existing?.status === "Connected";
              const isGoogleAds = platform.id === "Google Ads";
              const isAdMob = platform.id === "Firebase" || platform.name.toLowerCase().includes("admob");

              return (
                <div
                  key={platform.id}
                  className="group flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700"
                >
                  <div>
                    {/* Top Row: Logo & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                        <PlatformIcon platform={platform.id} size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        {(isGoogleAds || isAdMob) && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            OAuth 2.0
                          </span>
                        )}
                        <StatusBadge status={isConnected ? "Connected" : "Not connected"} />
                      </div>
                    </div>

                    {/* Platform Name & Description */}
                    <div className="mt-3">
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{platform.name}</h2>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {platform.description}
                      </p>
                    </div>

                    {isConnected && existing?.account && (
                      <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                        Account ID: <strong className="font-mono text-zinc-900 dark:text-zinc-200">{existing.account}</strong>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                    <button
                      onClick={() => handleOpenGuide(platform)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      <BookOpen size={12} />
                      <span>Setup Guide</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {isGoogleAds ? (
                        isConnected ? (
                          <>
                            <button
                              onClick={() => setGoogleAdsConnectOpen(true)}
                              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                            >
                              Configure
                            </button>

                            <button
                              onClick={() => setDisconnectTarget({ integrationId: existing.id, platformName: platform.name })}
                              className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Disconnect Google Ads"
                            >
                              <Unlink size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setGoogleAdsConnectOpen(true)}
                            className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Connect
                          </button>
                        )
                      ) : isAdMob ? (
                        isConnected ? (
                          <>
                            <button
                              onClick={() => setAdMobConnectOpen(true)}
                              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                            >
                              Configure
                            </button>

                            <button
                              onClick={() => setDisconnectTarget({ integrationId: existing.id, platformName: platform.name })}
                              className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Disconnect AdMob"
                            >
                              <Unlink size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setAdMobConnectOpen(true)}
                            className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Connect
                          </button>
                        )
                      ) : isConnected ? (
                        <>
                          <button
                            onClick={() => handleOpenConnect(platform, existing)}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => setDisconnectTarget({ integrationId: existing.id, platformName: platform.name })}
                            className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Disconnect"
                          >
                            <Unlink size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenConnect(platform)}
                          className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* =========================================================================
         GOOGLE ADS OAUTH CONNECT MODAL
         ========================================================================= */}
      <GoogleAdsConnectModal
        open={googleAdsConnectOpen}
        onClose={() => setGoogleAdsConnectOpen(false)}
        onSuccess={() => {
          fetchIntegrations();
        }}
        currentAccountId={googleAdsIntegration?.account}
        currentAccountName={googleAdsIntegration?.account || "Acme Primary Google Ads"}
      />

      {/* =========================================================================
         ADMOB OAUTH CONNECT MODAL
         ========================================================================= */}
      <AdMobConnectModal
        isOpen={admobConnectOpen}
        onClose={() => setAdMobConnectOpen(false)}
        onSuccess={() => {
          fetchIntegrations();
        }}
        existingAccountId={getIntegrationForPlatform("Firebase")?.account}
        existingAccountName={getIntegrationForPlatform("Firebase")?.account}
      />

      {/* =========================================================================
         ADMOB SETUP GUIDE MODAL
         ========================================================================= */}
      <AdMobSetupGuide
        isOpen={admobGuideOpen}
        onClose={() => setAdMobGuideOpen(false)}
        onOpenConnect={() => setAdMobConnectOpen(true)}
      />

      {/* =========================================================================
         GOOGLE ADS SETUP GUIDE MODAL / DRAWER
         ========================================================================= */}
      {googleAdsGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Google Ads Setup Guide & Documentation
              </h3>
              <button
                onClick={() => setGoogleAdsGuideOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4">
              <GoogleAdsSetupGuide />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         GENERIC PLATFORM CONNECT MODAL
         ========================================================================= */}
      {genericConnectModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={selectedPlatform.id} size={22} />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Connect {selectedPlatform.name}
                  </h2>
                  <p className="text-[11px] text-zinc-500">Provide official credentials to sync</p>
                </div>
              </div>
              <button onClick={() => setGenericConnectModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenericConnect} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                  <Shield size={14} className="mt-0.5 shrink-0" />
                  <span className="text-xs">{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  <span className="text-xs">{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">Account / Display Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={`My ${selectedPlatform.name}`}
                  className="input-clean mt-1"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">{selectedPlatform.idLabel}</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={selectedPlatform.idPlaceholder}
                  className="input-clean mt-1 font-mono"
                />
                <span className="mt-1 block text-[11px] text-zinc-400">{selectedPlatform.idHelp}</span>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">{selectedPlatform.keyLabel}</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedPlatform.keyPlaceholder}
                  className="input-clean mt-1 font-mono"
                />
                <span className="mt-1 block text-[11px] text-zinc-400">{selectedPlatform.keyHelp}</span>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button type="button" onClick={() => setGenericConnectModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Modal */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Disconnect {disconnectTarget.platformName}?
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Are you sure you want to disconnect? Live metrics and automated sync will be paused.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setDisconnectTarget(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={confirmDisconnect} disabled={busy} className="btn-danger">
                {busy ? <RefreshCw size={13} className="animate-spin" /> : <Unlink size={13} />}
                <span className="whitespace-nowrap">Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
