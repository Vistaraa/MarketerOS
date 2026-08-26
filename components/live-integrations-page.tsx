"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  KeyRound,
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
import { AppShell, PageHeading, StatusBadge } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    description: "Search, Display, Shopping, and Performance Max ad campaigns.",
    portalName: "Google Ads Manager",
    portalUrl: "https://ads.google.com",
    idLabel: "Customer ID",
    idPlaceholder: "123-456-7890",
    idHelp: "10-digit number formatted as XXX-XXX-XXXX from top-right of your Ads dashboard.",
    keyLabel: "Developer Token / API Key",
    keyPlaceholder: "DevToken_AbC123XyZ7890",
    keyHelp: "Found in Google Ads > Tools & Settings > Setup > API Center.",
    prerequisites: ["Active Google Ads account", "Google Cloud Console project with Google Ads API enabled"],
    guideSteps: [
      {
        step: 1,
        title: "Locate your Customer ID",
        instruction: "Sign in to ads.google.com. Copy the 10-digit Customer ID in the top right corner.",
        tip: "Standard XXX-XXX-XXXX format is accepted."
      },
      {
        step: 2,
        title: "Enable Google Ads API",
        instruction: "In Google Cloud Console (console.cloud.google.com), navigate to APIs & Services > Library and enable 'Google Ads API'.",
        tip: "Create a project named 'MarketerOS Integration' if needed."
      },
      {
        step: 3,
        title: "Copy Developer Token",
        instruction: "In Google Ads Manager, navigate to Tools & Settings > Setup > API Center. Copy your Developer Token.",
        tip: "Paste your Customer ID and Token below to finish setup."
      }
    ]
  },
  {
    id: "Google Analytics",
    name: "Google Analytics 4",
    ecosystem: "Google",
    description: "User behavior, web traffic, and event-level conversions.",
    portalName: "Google Analytics Admin",
    portalUrl: "https://analytics.google.com",
    idLabel: "GA4 Property ID",
    idPlaceholder: "987654321",
    idHelp: "Numeric ID found in Google Analytics > Admin > Property Settings.",
    keyLabel: "API Secret",
    keyPlaceholder: "Sec_Key_98ab76cd54ef32gh",
    keyHelp: "Generated in GA4 Admin > Data Streams > Web Stream > Measurement Protocol API secrets.",
    prerequisites: ["Active GA4 Web Stream", "Measurement Protocol API secret created"],
    guideSteps: [
      {
        step: 1,
        title: "Find Property ID",
        instruction: "Go to analytics.google.com > Admin (gear icon) > Property Settings. Copy Property ID.",
        tip: "Example: 123456789"
      },
      {
        step: 2,
        title: "Create Measurement Secret",
        instruction: "Go to Data Streams > Select your Web Stream > Measurement Protocol API secrets > Create.",
        tip: "Copy the Secret value generated."
      }
    ]
  },
  {
    id: "Google Search Console",
    name: "Google Search Console",
    ecosystem: "Google",
    description: "Organic search ranking, impressions, CTR, and indexing status.",
    portalName: "Search Console Admin",
    portalUrl: "https://search.google.com/search-console",
    idLabel: "Verified Site URL",
    idPlaceholder: "https://example.com/",
    idHelp: "Full site domain or URL prefix as verified in Search Console.",
    keyLabel: "Service Account API Key",
    keyPlaceholder: "AIzaSyD-1234567890abcdef...",
    keyHelp: "API Key or OAuth credentials from Google Cloud Console with Search Console API enabled.",
    prerequisites: ["Verified Domain or URL Prefix property in GSC"],
    guideSteps: [
      {
        step: 1,
        title: "Verify Property",
        instruction: "Sign in to Search Console and confirm your domain property is verified.",
        tip: "Copy the exact URL matching your property."
      },
      {
        step: 2,
        title: "Enable Search Console API",
        instruction: "In Google Cloud Console, enable 'Google Search Console API' and generate an API key.",
        tip: "Paste your Site URL and Key below."
      }
    ]
  },
  {
    id: "YouTube",
    name: "YouTube Brand Channel",
    ecosystem: "Google",
    description: "Video performance, subscribers, view rates, and ad engagement.",
    portalName: "YouTube Studio",
    portalUrl: "https://studio.youtube.com",
    idLabel: "Channel ID",
    idPlaceholder: "UC1234567890abcdef",
    idHelp: "Found in YouTube Studio > Settings > Channel > Advanced Settings > Channel ID.",
    keyLabel: "YouTube Data API v3 Key",
    keyPlaceholder: "AIzaSyC_YouTubeApiSecretKey123",
    keyHelp: "API Key from Google Cloud Console with YouTube Data API v3 enabled.",
    prerequisites: ["Active YouTube Brand Channel"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Channel ID",
        instruction: "Open studio.youtube.com > Settings > Channel > Advanced Settings. Copy Channel ID.",
        tip: "Starts with 'UC'."
      },
      {
        step: 2,
        title: "Generate API Key",
        instruction: "In Google Cloud Console, enable 'YouTube Data API v3' and copy API key.",
        tip: "Paste Channel ID and API Key below."
      }
    ]
  },
  {
    id: "YouTube Ads",
    name: "YouTube Ads",
    ecosystem: "Google",
    description: "Run video ad campaigns on YouTube — track impressions, views, clicks, and conversions for client brands.",
    portalName: "Google Ads / YouTube Ads",
    portalUrl: "https://ads.google.com",
    idLabel: "Channel ID",
    idPlaceholder: "UC1234567890abcdef",
    idHelp: "YouTube Channel ID from YouTube Studio > Settings > Channel > Advanced Settings.",
    keyLabel: "YouTube Data API v3 Key",
    keyPlaceholder: "AIzaSyC_YouTubeApiSecretKey123",
    keyHelp: "API Key from Google Cloud Console with YouTube Data API v3 enabled.",
    prerequisites: ["Active YouTube Brand Channel", "YouTube Data API v3 enabled in Google Cloud Console"],
    guideSteps: [
      {
        step: 1,
        title: "Get YouTube Channel ID",
        instruction: "Open studio.youtube.com > Settings > Channel > Advanced Settings. Copy Channel ID (starts with UC).",
        tip: "This is the same Channel ID used for YouTube Brand Channel."
      },
      {
        step: 2,
        title: "Get YouTube API Key",
        instruction: "In Google Cloud Console, enable 'YouTube Data API v3' and create an API Key.",
        tip: "Copy the AIzaSy... key."
      },
      {
        step: 3,
        title: "Connect YouTube Ads",
        instruction: "Paste Channel ID and API Key below. Your YouTube ad campaigns, video ads, and performance metrics will sync automatically.",
        tip: "Works with any YouTube channel that has videos."
      }
    ]
  },
  {
    name: "Google Business Profile",
    ecosystem: "Google",
    description: "Local search listings, customer reviews, calls, and map views.",
    portalName: "Google Business Profile Manager",
    portalUrl: "https://business.google.com",
    idLabel: "Location ID / Account ID",
    idPlaceholder: "locations/12345678901234567890",
    idHelp: "Location ID from Business Profile settings > Advanced settings.",
    keyLabel: "My Business API Key",
    keyPlaceholder: "AIzaSyA_GoogleBusinessApiKey123",
    keyHelp: "API Key with Google My Business API access enabled.",
    prerequisites: ["Verified Google Business Profile listing"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Location ID",
        instruction: "Go to business.google.com > Select Location > Advanced Settings > Location ID.",
        tip: "Copy the numeric Location ID."
      },
      {
        step: 2,
        title: "Connect Credentials",
        instruction: "Paste Location ID and API Key below to sync reviews and local insights.",
        tip: "Instant sync available upon connection."
      }
    ]
  },
  {
    id: "Firebase",
    name: "Firebase & AdMob",
    ecosystem: "Google",
    description: "Mobile app attribution, in-app event tracking, and ad monetization.",
    portalName: "Firebase Console",
    portalUrl: "https://console.firebase.google.com",
    idLabel: "Firebase Project ID",
    idPlaceholder: "my-app-firebase-12345",
    idHelp: "Project ID from Firebase Console > Project Settings > General.",
    keyLabel: "Web API Key",
    keyPlaceholder: "AIzaSyB_FirebaseWebApiKey123",
    keyHelp: "Found in Firebase Console > Project Settings > General > Web API Key.",
    prerequisites: ["Firebase mobile project configured"],
    guideSteps: [
      {
        step: 1,
        title: "Get Project ID",
        instruction: "Open console.firebase.google.com > Project Settings > General. Copy Project ID.",
        tip: "Example: my-app-prod-123"
      },
      {
        step: 2,
        title: "Copy Web API Key",
        instruction: "On the same page, copy the Web API Key.",
        tip: "Paste Project ID and Web API Key below."
      }
    ]
  },

  // ==================== META ECOSYSTEM ====================
  {
    id: "Meta Ads",
    name: "Meta Ads Manager",
    ecosystem: "Meta",
    description: "Facebook, Instagram, and Audience Network ad campaigns.",
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
      },
      {
        step: 3,
        title: "Paste Credentials",
        instruction: "Paste your Ad Account ID and Permanent Token below to enable instant campaign launching.",
        tip: "Never expires unless manually revoked."
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
      },
      {
        step: 2,
        title: "Generate Access Token",
        instruction: "In developers.facebook.com/tools/explorer, select your App and request `instagram_basic` and `instagram_manage_insights` permissions.",
        tip: "Copy the Access Token and paste below."
      }
    ]
  },
  {
    id: "Facebook",
    name: "Facebook Page",
    ecosystem: "Meta",
    description: "Page engagement, posts, reviews, and community insights.",
    portalName: "Meta Business Suite",
    portalUrl: "https://business.facebook.com",
    idLabel: "Facebook Page ID",
    idPlaceholder: "100012345678901",
    idHelp: "Page ID from Page About tab or Business Suite Settings.",
    keyLabel: "Page Access Token",
    keyPlaceholder: "EAA...",
    keyHelp: "Page access token generated via System User or Graph API Explorer.",
    prerequisites: ["Admin role on target Facebook Page"],
    guideSteps: [
      {
        step: 1,
        title: "Find Page ID",
        instruction: "Open your Facebook Page > About > Page Transparency (or Settings). Copy the Page ID.",
        tip: "Example: 102938475610293"
      },
      {
        step: 2,
        title: "Generate Page Token",
        instruction: "In Business Manager, assign Page to System User and generate token with `pages_show_list` and `pages_read_engagement`.",
        tip: "Paste Page ID and Token below."
      }
    ]
  },
  {
    id: "Messenger",
    name: "Facebook Messenger",
    ecosystem: "Meta",
    description: "Customer conversations, automated lead capture, and support chats.",
    portalName: "Meta Business Suite Inbox",
    portalUrl: "https://business.facebook.com/latest/inbox",
    idLabel: "Page ID",
    idPlaceholder: "100012345678901",
    idHelp: "Same Page ID associated with your Messenger chatbot.",
    keyLabel: "Page Messaging Token",
    keyPlaceholder: "EAA...",
    keyHelp: "Token with `pages_messaging` permission.",
    prerequisites: ["Active Facebook Page with Messenger enabled"],
    guideSteps: [
      {
        step: 1,
        title: "Verify Messenger Access",
        instruction: "Ensure your Facebook Page has messaging enabled under Page Settings > General > Messages.",
        tip: "Required for automated replies."
      },
      {
        step: 2,
        title: "Connect Token",
        instruction: "Generate token with `pages_messaging` permission and paste below.",
        tip: "Enables unified inbox synchronisation."
      }
    ]
  },
  {
    id: "WhatsApp",
    name: "WhatsApp Business Platform",
    ecosystem: "Meta",
    description: "Broadcast campaigns, automated customer alerts, and direct lead messaging.",
    portalName: "Meta Business WhatsApp Manager",
    portalUrl: "https://business.facebook.com/wa/manage",
    idLabel: "Phone Number ID",
    idPlaceholder: "109876543210987",
    idHelp: "Found in WhatsApp > Getting Started > From Phone number ID.",
    keyLabel: "Permanent Cloud API Token",
    keyPlaceholder: "EAA...",
    keyHelp: "System User Token with `whatsapp_business_messaging` permission.",
    secondaryIdLabel: "WhatsApp Business Account ID",
    secondaryIdPlaceholder: "101928374650192",
    secondaryIdHelp: "Found in WhatsApp Account Settings.",
    prerequisites: ["Meta Business Manager with verified phone number"],
    guideSteps: [
      {
        step: 1,
        title: "Locate Phone Number ID",
        instruction: "In developers.facebook.com > Your App > WhatsApp > API Setup, copy the 'Phone number ID'.",
        tip: "Do NOT use your actual phone digits; use the numeric Meta ID."
      },
      {
        step: 2,
        title: "Generate Permanent Token",
        instruction: "In Business Manager > System Users, create token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.",
        tip: "Paste Phone Number ID and Token below."
      }
    ]
  },

  // ==================== OTHER PLATFORMS ====================
  {
    id: "LinkedIn",
    name: "LinkedIn Ads & Pages",
    ecosystem: "Other",
    description: "B2B lead generation, sponsored content, and company page growth.",
    portalName: "LinkedIn Campaign Manager",
    portalUrl: "https://www.linkedin.com/campaignmanager",
    idLabel: "LinkedIn Sponsored Account ID",
    idPlaceholder: "501234567",
    idHelp: "Found in LinkedIn Campaign Manager URL or top-left account switcher.",
    keyLabel: "OAuth Access Token / Client Secret",
    keyPlaceholder: "AQV...",
    keyHelp: "Access Token generated via LinkedIn Developer Portal with `r_ads` and `rw_ads` permissions.",
    prerequisites: ["LinkedIn Campaign Manager admin access", "Developer App created at developer.linkedin.com"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Account ID",
        instruction: "Open linkedin.com/campaignmanager. In top-left account selector, copy the numeric Account ID.",
        tip: "Example: 508492019"
      },
      {
        step: 2,
        title: "Generate Access Token",
        instruction: "In developer.linkedin.com > My Apps > Auth, request `r_ads` and `r_basicprofile` permissions and generate token.",
        tip: "Paste Account ID and Token below."
      }
    ]
  },
  {
    id: "Shopify",
    name: "Shopify Store",
    ecosystem: "Other",
    description: "E-commerce orders, customer lifetime value, and ROAS revenue attribution.",
    portalName: "Shopify Admin",
    portalUrl: "https://admin.shopify.com",
    idLabel: "Shopify Store Domain",
    idPlaceholder: "your-brand.myshopify.com",
    idHelp: "Your myshopify.com domain name (e.g. brand-name.myshopify.com).",
    keyLabel: "Admin API Access Token",
    keyPlaceholder: "shpat_1234567890abcdef1234567890abcdef",
    keyHelp: "Created in Shopify Admin > Settings > Apps > Develop apps > Admin API access token.",
    prerequisites: ["Custom App created in Shopify Admin with `read_orders`, `read_products` scopes"],
    guideSteps: [
      {
        step: 1,
        title: "Enable Custom App Development",
        instruction: "In Shopify Admin, go to Settings > Apps and sales channels > Develop apps > Create an app.",
        tip: "Name the app 'MarketerOS Integration'."
      },
      {
        step: 2,
        title: "Configure Admin API Scopes",
        instruction: "Select `read_orders`, `read_products`, and `read_analytics`. Click Save and Install App.",
        tip: "Copy the Admin API access token (starts with 'shpat_')."
      }
    ]
  },
  {
    id: "TikTok",
    name: "TikTok for Business",
    ecosystem: "Other",
    description: "TikTok short-form video ads, Spark ads, and viral engagement tracking.",
    portalName: "TikTok Ads Manager",
    portalUrl: "https://ads.tiktok.com",
    idLabel: "TikTok Advertiser ID",
    idPlaceholder: "719827364501928374",
    idHelp: "Found in TikTok Ads Manager top-right avatar menu.",
    keyLabel: "Long-Term API Access Token",
    keyPlaceholder: "act.1234567890abcdef...",
    keyHelp: "Access Token from business-api.tiktok.com portal.",
    prerequisites: ["TikTok Ads Manager account", "TikTok for Business Developer account"],
    guideSteps: [
      {
        step: 1,
        title: "Copy Advertiser ID",
        instruction: "Open ads.tiktok.com. Click your avatar in the top right corner and copy your 18-digit Advertiser ID.",
        tip: "Example: 719827364501928374."
      },
      {
        step: 2,
        title: "Generate API Access Token",
        instruction: "Go to business-api.tiktok.com/portal > My Apps > Create App > Generate Long-term Access Token.",
        tip: "Paste your Advertiser ID and Access Token to complete setup."
      }
    ]
  }
];

export function LiveIntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Google" | "Meta" | "Other">("All");

  // Modals state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{ integrationId: string; platformName: string } | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);

  // Form input states
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [secondaryId, setSecondaryId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  }, []);

  const openConnectModal = (config: PlatformConfig, existing?: Integration) => {
    setSelectedPlatform(config);
    setAccountName(existing?.account ? `${config.name} (${existing.account})` : `My ${config.name}`);
    setAccountId(existing?.account || "");
    setSecondaryId("");
    setApiKey("");
    setError(null);
    setSuccessMsg(null);
    setConnectModalOpen(true);
  };

  const openGuideModal = (config: PlatformConfig) => {
    setSelectedPlatform(config);
    setGuideModalOpen(true);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;

    if (!accountId.trim()) {
      setError(`Please enter a valid ${selectedPlatform.idLabel}.`);
      return;
    }

    if (!apiKey.trim()) {
      setError(`Please enter your ${selectedPlatform.keyLabel}. An API Key / Access Token is required to authenticate.`);
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
        setConnectModalOpen(false);
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
      setDisconnectError(null);
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
      setDisconnectError(err instanceof Error ? err.message : "Failed to disconnect platform");
    } finally {
      setBusy(false);
    }
  };

  const getIntegrationForPlatform = (platformId: string) => {
    return integrations.find((item) => {
      const p = item.platform.toLowerCase();
      const target = platformId.toLowerCase();
      if (p === target) return true;
      if (target === "google analytics" && p === "google analytics") return true;
      if (target === "google ads" && p === "google ads") return true;
      if (target === "meta ads" && (p === "meta ads" || p === "meta")) return true;
      if (target === "facebook" && p === "facebook") return true;
      if (target === "instagram" && p === "instagram") return true;
      if (target === "messenger" && (p === "messenger" || p === "facebook messenger")) return true;
      if (target === "whatsapp" && (p === "whatsapp" || p === "whatsapp business")) return true;
      if (target === "firebase" && (p === "firebase" || p === "admob")) return true;
      return false;
    });
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

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <AppShell title="Integrations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
              Integrations
            </h1>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
              Connect your Google, Meta, and third-party marketing platforms to sync live ad metrics.
            </p>
          </div>

          <button
            onClick={fetchIntegrations}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin text-zinc-900 dark:text-zinc-100")} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Minimal Low-Profile Notice */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <div className="flex items-center gap-2.5">
            <KeyRound size={15} className="text-zinc-500 dark:text-zinc-400" />
            <span>Connect using official <strong>API Keys or Access Tokens</strong>. Click <strong>Setup Guide</strong> on any card for instructions.</span>
          </div>
        </div>

        {/* Filter Controls (Tabs + Search) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {(["All", "Google", "Meta", "Other"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition",
                  activeTab === tab
                    ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                {tab === "All" ? "All Platforms" : `${tab} Ecosystem`}
              </button>
            ))}
          </div>

          {/* Search Input */}
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

        {/* Flat 1px Grid Cards (Midday Style) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlatforms.map((platform) => {
            const existing = getIntegrationForPlatform(platform.id);
            const isConnected = existing?.status === "Connected";

            return (
              <div
                key={platform.id}
                className="group flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700"
              >
                <div>
                  {/* Top Row: Logo & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <PlatformIcon platform={platform.id} size={24} />
                    </div>

                    <StatusBadge status={isConnected ? "Connected" : "Not connected"} />
                  </div>

                  {/* Platform Name & Description */}
                  <div className="mt-3">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{platform.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                  <button
                    onClick={() => platform.id === "YouTube" ? router.push("/youtube/guide") : platform.id === "YouTube Ads" ? router.push("/youtube-ads") : openGuideModal(platform)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <BookOpen size={12} />
                    <span>Setup Guide</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isConnected ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/v1/integrations/${existing.id}/sync`, { method: "POST" });
                              const json = await res.json();
                              if (res.ok) alert("Sync queued! Background processing started.");
                              else alert(json.error?.message || "Sync failed");
                            } catch { alert("Sync failed"); }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <RefreshCw size={12} />
                          Sync Now
                        </button>
                        <button
                          onClick={() => openConnectModal(platform, existing)}
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
                        onClick={() => openConnectModal(platform)}
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
         MODAL 1: CONNECT CREDENTIALS
         ========================================================================= */}
      {connectModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={selectedPlatform.id} size={24} />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Connect {selectedPlatform.name}
                  </h2>
                  <p className="text-[11px] text-zinc-500">Provide official API credentials to sync</p>
                </div>
              </div>
              <button onClick={() => setConnectModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-6 space-y-4 text-xs">
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
                <div className="flex items-center justify-between">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">{selectedPlatform.idLabel}</label>
                  <a
                    href={selectedPlatform.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <span>{selectedPlatform.portalName}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="text"
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={selectedPlatform.idPlaceholder}
                  className="input-clean mt-1 font-mono"
                />
                <p className="mt-1 text-[10px] text-zinc-400">{selectedPlatform.idHelp}</p>
              </div>

              {selectedPlatform.secondaryIdLabel && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">{selectedPlatform.secondaryIdLabel}</label>
                  <input
                    type="text"
                    value={secondaryId}
                    onChange={(e) => setSecondaryId(e.target.value)}
                    placeholder={selectedPlatform.secondaryIdPlaceholder}
                    className="input-clean mt-1 font-mono"
                  />
                  {selectedPlatform.secondaryIdHelp && (
                    <p className="mt-1 text-[10px] text-zinc-400">{selectedPlatform.secondaryIdHelp}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">{selectedPlatform.keyLabel}</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedPlatform.keyPlaceholder}
                  className="input-clean mt-1 font-mono"
                />
                <p className="mt-1 text-[10px] text-zinc-400">{selectedPlatform.keyHelp}</p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary"
                >
                  {busy ? "Authenticating…" : "Save & Verify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 2: SETUP GUIDE
         ========================================================================= */}
      {guideModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedPlatform.name} Setup Guide
                </h2>
              </div>
              <button onClick={() => setGuideModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4 text-xs">
              <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Prerequisites</div>
                <ul className="mt-1 list-disc pl-4 text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  {selectedPlatform.prerequisites.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                {selectedPlatform.guideSteps.map((step, idx) => (
                  <div key={step.step} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {step.step}. {step.title}
                      </div>
                      {step.tip && (
                        <button
                          onClick={() => copyToClipboard(step.tip || "", idx)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          {copiedIndex === idx ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{step.instruction}</p>
                    {step.tip && <p className="mt-1 text-[10px] text-zinc-400">Tip: {step.tip}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <a
                  href={selectedPlatform.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <span>Open {selectedPlatform.portalName}</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  onClick={() => {
                    setGuideModalOpen(false);
                    openConnectModal(selectedPlatform);
                  }}
                  className="btn-primary"
                >
                  Enter Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 3: CONFIRM DISCONNECT
         ========================================================================= */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Disconnect {disconnectTarget.platformName}?
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Removing this integration will stop automatic sync and disable launching campaigns to this channel until reconnected.
            </p>

            {disconnectError && (
              <p className="mt-2 text-rose-600">{disconnectError}</p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDisconnectTarget(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={busy}
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700"
              >
                {busy ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
