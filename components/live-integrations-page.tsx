"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, BookOpen, Check, Copy, ExternalLink, HelpCircle, Key, KeyRound, Link2, Lock, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Unlink, X } from "lucide-react";
import { AppShell, Card, PageHeading, StatusBadge } from "@/components/marketeros-shell";
import { PlatformIcon } from "@/components/marketeros-icons";
import type { ApiResponse } from "@/lib/api-contracts";
import type { Integration } from "@/lib/types";

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
  features: string[];
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
  color: string;
  prerequisites: string[];
  guideSteps: StepGuide[];
  scopes: string[];
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  // ==================== GOOGLE ECOSYSTEM ====================
  {
    id: "Google Ads",
    name: "Google Ads",
    ecosystem: "Google",
    description: "Manage Search, Display, Shopping, and Performance Max ad campaigns.",
    features: ["Search Ads", "P-Max Campaigns", "Smart Bidding", "Conversion Tracking"],
    portalName: "Google Ads Manager & Cloud Console",
    portalUrl: "https://ads.google.com",
    idLabel: "Google Ads Customer ID",
    idPlaceholder: "123-456-7890",
    idHelp: "10-digit number formatted as XXX-XXX-XXXX from top-right of your Ads dashboard.",
    keyLabel: "Developer Token / API Key",
    keyPlaceholder: "DevToken_AbC123XyZ7890",
    keyHelp: "Found in Google Ads > Tools & Settings > Setup > API Center (or Google Cloud API Key).",
    color: "#4285f4",
    prerequisites: [
      "Active Google Ads Account or MCC Manager Account",
      "Google Cloud Console project with 'Google Ads API' enabled"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Locate your Customer ID",
        instruction: "Sign in to your Google Ads account at ads.google.com. In the top right corner near your profile icon, copy the 10-digit Customer ID (e.g. 123-456-7890).",
        tip: "Do not include the dashes if copying from URL, but standard XXX-XXX-XXXX format is accepted."
      },
      {
        step: 2,
        title: "Enable Google Ads API",
        instruction: "Go to console.cloud.google.com > APIs & Services > Library. Search for 'Google Ads API' and click 'Enable'.",
        tip: "Create a new project named 'MarketerOS Integration' if you don't have one."
      },
      {
        step: 3,
        title: "Generate Developer Token / API Key",
        instruction: "In Google Ads Manager, navigate to Tools & Settings > Setup > API Center. Copy your Developer Token. Alternatively, in Cloud Console create an API Key under Credentials.",
        tip: "Test accounts can use Standard Access or Test Access developer tokens."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/adwords"]
  },
  {
    id: "Google Analytics",
    name: "Google Analytics 4",
    ecosystem: "Google",
    description: "Track user behavior, web traffic, and event-level conversions.",
    features: ["GA4 Property", "Traffic Attribution", "Real-Time Events", "Audience Insights"],
    portalName: "Google Analytics Admin",
    portalUrl: "https://analytics.google.com",
    idLabel: "GA4 Property ID",
    idPlaceholder: "987654321",
    idHelp: "Numeric ID found in Google Analytics > Admin > Property Settings.",
    keyLabel: "Measurement Protocol API Secret",
    keyPlaceholder: "Sec_Key_98ab76cd54ef32gh",
    keyHelp: "Generated in GA4 Admin > Data Streams > Web Stream > Measurement Protocol API secrets.",
    color: "#f9ab00",
    prerequisites: [
      "Active GA4 Web or App Data Stream",
      "Admin or Editor role on the GA4 Property"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Find your Property ID",
        instruction: "Open Google Analytics (analytics.google.com). Click the Admin gear icon at the bottom left. Under the Property column, click 'Property Settings' and copy the 9-digit Property ID.",
        tip: "Note: GA4 Property IDs are numbers (e.g. 302918273), unlike old Universal Analytics (UA-XXXXX)."
      },
      {
        step: 2,
        title: "Create Measurement Protocol API Secret",
        instruction: "In Admin > Property column, click 'Data Streams' > Select your active Web Stream. Scroll down and click 'Measurement Protocol API secrets'.",
        tip: "Click 'Create' in the top right, name it 'MarketerOS Integration', and copy the generated Secret Value."
      },
      {
        step: 3,
        title: "Paste Credentials",
        instruction: "Paste your 9-digit Property ID and the Measurement Protocol API Secret Value into the connection form.",
        tip: "This secret enables real-time conversion and event streaming directly into your database."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
  },
  {
    id: "Google Search Console",
    name: "Google Search Console",
    ecosystem: "Google",
    description: "Monitor organic search rankings, impression volume, and keyword CTR.",
    features: ["Organic Clicks", "Search Queries", "Index Coverage", "Keyword CTR"],
    portalName: "Search Console & Cloud Console",
    portalUrl: "https://search.google.com/search-console",
    idLabel: "Verified Site / Property URL",
    idPlaceholder: "https://acmecorp.com",
    idHelp: "The exact URL prefix or domain property verified in Google Search Console.",
    keyLabel: "Search Console API Key / Service Token",
    keyPlaceholder: "AIzaSyD_8392019482019382019382",
    keyHelp: "API Key or Service Account credentials from Google Cloud Console with Search Console API enabled.",
    color: "#4285f4",
    prerequisites: [
      "Verified Ownership in Google Search Console",
      "Google Cloud Project with 'Google Search Console API' enabled"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Verify Property URL",
        instruction: "Sign in to search.google.com/search-console. Select your property from the top-left dropdown and copy the exact Property URL (e.g. https://acmecorp.com or sc-domain:acmecorp.com).",
        tip: "Make sure to include https:// if it is a URL-prefix property."
      },
      {
        step: 2,
        title: "Enable Search Console API",
        instruction: "Go to console.cloud.google.com > APIs & Services > Library. Search for 'Google Search Console API' and click 'Enable'.",
        tip: "Under Credentials, click 'Create Credentials' > 'API Key' to generate your key."
      },
      {
        step: 3,
        title: "Grant User Permissions",
        instruction: "In Search Console > Settings > Users and permissions, ensure your Google account has Full or Owner permissions.",
        tip: "This allows MarketerOS to query top search keywords, click counts, and average ranking positions."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  },
  {
    id: "YouTube",
    name: "YouTube",
    ecosystem: "Google",
    description: "Analyze video performance, watch time, and YouTube video ad reach.",
    features: ["Video Views", "Watch Time", "Subscriber Growth", "Video Ads"],
    portalName: "YouTube Studio & Google Cloud",
    portalUrl: "https://studio.youtube.com",
    idLabel: "YouTube Channel ID",
    idPlaceholder: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    idHelp: "24-character ID starting with 'UC' from YouTube Studio > Settings > Channel > Advanced.",
    keyLabel: "YouTube Data API v3 Key",
    keyPlaceholder: "AIzaSyC_1928374650192837465",
    keyHelp: "Generated in Google Cloud Console > Credentials with 'YouTube Data API v3' enabled.",
    color: "#ff0000",
    prerequisites: [
      "YouTube Channel with public or unlisted video content",
      "Google Cloud Project with 'YouTube Data API v3' enabled"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Copy Channel ID",
        instruction: "Go to studio.youtube.com. In the left menu click Settings > Channel > Advanced settings. Scroll to 'Manage YouTube account' > Advanced settings and copy your 'Channel ID'.",
        tip: "Channel IDs always start with 'UC' (e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw)."
      },
      {
        step: 2,
        title: "Enable YouTube Data API v3",
        instruction: "Go to console.cloud.google.com > APIs & Services > Library. Search for 'YouTube Data API v3' and click 'Enable'.",
        tip: "Navigate to Credentials > Create Credentials > API Key and copy your generated API Key."
      },
      {
        step: 3,
        title: "Save in MarketerOS",
        instruction: "Paste your Channel ID and YouTube API Key into the form below.",
        tip: "Enables instant video view aggregation, subscriber velocity, and YouTube ad campaign tracking."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"]
  },
  {
    id: "Google Business Profile",
    name: "Google Business Profile",
    ecosystem: "Google",
    description: "Optimize local map visibility, reviews, and store direction requests.",
    features: ["Local Search", "Customer Reviews", "Map Clicks", "Call Requests"],
    portalName: "Google Business Profile Manager",
    portalUrl: "https://business.google.com",
    idLabel: "Location / Store ID",
    idPlaceholder: "locations/102938475610293",
    idHelp: "Found in Business Profile > Three dots menu > Business Profile settings > Advanced settings.",
    keyLabel: "Business Profile API Key / Access Token",
    keyPlaceholder: "AIzaSyA_9876543210987654321",
    keyHelp: "API credentials from Google Cloud Console with Google Business Profile APIs enabled.",
    color: "#34a853",
    prerequisites: [
      "Verified Google Business Profile listing",
      "Google Cloud Console with Business Profile Performance API enabled"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Find your Location ID",
        instruction: "Go to business.google.com. Click on your business location > click the Three dots (⋮) menu in search > Business Profile settings > Advanced settings > copy the Business Profile ID.",
        tip: "Also known as Store code or Location ID."
      },
      {
        step: 2,
        title: "Enable Business Profile APIs",
        instruction: "In Google Cloud Console, enable 'Google Business Profile Performance API' and 'My Business Account Management API'.",
        tip: "Generate an API Key under Credentials."
      },
      {
        step: 3,
        title: "Connect & Sync",
        instruction: "Enter your Location ID and API Key to start tracking map direction requests, calls, and review ratings.",
        tip: "Local campaigns in MarketerOS will use this profile for localized ad extensions."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/business.manage"]
  },
  {
    id: "Firebase",
    name: "Firebase & AdMob",
    ecosystem: "Google",
    description: "Track mobile app analytics, in-app purchases, and AdMob monetization.",
    features: ["App Installs", "In-App Events", "Ad Revenue", "Retention"],
    portalName: "Firebase & AdMob Console",
    portalUrl: "https://console.firebase.google.com",
    idLabel: "Firebase Project ID / AdMob App ID",
    idPlaceholder: "ca-app-pub-3940256099942544~3347511713",
    idHelp: "Found in Firebase Console > Project Settings or AdMob > Apps > App Settings.",
    keyLabel: "Firebase Web API Key / Server Token",
    keyPlaceholder: "AIzaSyB_1029384756102938475",
    keyHelp: "Found under Firebase Console > Project Settings > General > Web API Key.",
    color: "#ffa000",
    prerequisites: [
      "Firebase project with iOS/Android app registered",
      "Google AdMob account linked to Firebase"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Get Project ID & Web API Key",
        instruction: "Open console.firebase.google.com > Click the Gear icon > Project Settings > General tab. Copy 'Project ID' and 'Web API Key'.",
        tip: "If connecting AdMob, find your App ID in admob.google.com > Apps > App Settings."
      },
      {
        step: 2,
        title: "Enable AdMob Reporting API",
        instruction: "In Google Cloud Console for the same Firebase project, enable 'AdMob API'.",
        tip: "Allows pulling real-time eCPM, ad impressions, and user lifetime value (LTV)."
      },
      {
        step: 3,
        title: "Save Credentials",
        instruction: "Paste your Project/App ID and API Key into the connection modal.",
        tip: "App campaigns can now track in-app purchases and installs."
      }
    ],
    scopes: ["https://www.googleapis.com/auth/admob.report"]
  },

  // ==================== META ECOSYSTEM ====================
  {
    id: "Meta Ads",
    name: "Meta Ads (Facebook & Instagram)",
    ecosystem: "Meta",
    description: "Run and optimize ads across Facebook Feed, Instagram Stories, and Reels.",
    features: ["Feed Ads", "Instagram Reels", "Pixel Tracking", "Custom Audiences"],
    portalName: "Meta Business Suite & Ads Manager",
    portalUrl: "https://business.facebook.com/settings",
    idLabel: "Meta Ad Account ID",
    idPlaceholder: "act_102938475610293",
    idHelp: "Your Ad Account ID starting with 'act_' from Meta Ads Manager dropdown.",
    keyLabel: "System User Permanent Access Token",
    keyPlaceholder: "EAAK... (Permanent Marketing API Token)",
    keyHelp: "Generated in Meta Business Settings > System Users with ads_management permission.",
    color: "#1877f2",
    prerequisites: [
      "Meta Business Account (Business Manager)",
      "System User with Admin access in Business Settings"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Copy your Ad Account ID",
        instruction: "Open adsmanager.facebook.com. Look at the top-left account selector dropdown and copy your Ad Account ID (e.g. act_1234567890).",
        tip: "Make sure to include the 'act_' prefix if present."
      },
      {
        step: 2,
        title: "Create System User in Business Settings",
        instruction: "Go to business.facebook.com/settings > Users > System Users. Click 'Add', name it 'MarketerOS Integration', and set role to 'Admin'.",
        tip: "System User tokens never expire, so your integration will remain permanently connected."
      },
      {
        step: 3,
        title: "Generate Permanent Access Token",
        instruction: "Click 'Generate New Token' on the System User. Select your Meta App, choose 'Never' expiration, and select scopes: ads_management, ads_read, business_management. Copy the token.",
        tip: "Store this token securely — Meta will only display it once."
      }
    ],
    scopes: ["ads_management", "ads_read", "business_management"]
  },
  {
    id: "Facebook",
    name: "Facebook Pages",
    ecosystem: "Meta",
    description: "Manage Facebook Pages, post content, and analyze organic engagement.",
    features: ["Page Posts", "Audience Reach", "Page Insights", "Comment Management"],
    portalName: "Meta Business Suite",
    portalUrl: "https://business.facebook.com",
    idLabel: "Facebook Page ID",
    idPlaceholder: "102938475610293",
    idHelp: "Numeric Page ID found in Facebook Page > About > Page transparency.",
    keyLabel: "Page Access Token (Permanent)",
    keyPlaceholder: "EAAB... (Page Access Token)",
    keyHelp: "Generated from Meta for Developers Graph API Explorer or System User token.",
    color: "#1877f2",
    prerequisites: [
      "Admin role on the target Facebook Page",
      "Meta for Developers App with Pages API enabled"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Find your Facebook Page ID",
        instruction: "Navigate to your Facebook Page > Click 'About' > 'Page transparency' (or Business Suite > Settings > Pages). Copy the numeric Page ID.",
        tip: "Example: 102938475610293."
      },
      {
        step: 2,
        title: "Generate Page Access Token",
        instruction: "Go to developers.facebook.com/tools/explorer. Under 'User or Page', select your Facebook Page. Grant permissions: pages_show_list, pages_read_engagement, pages_manage_posts. Click 'Generate Access Token'.",
        tip: "Exchange this for a long-lived page token via your System User."
      },
      {
        step: 3,
        title: "Connect Page",
        instruction: "Enter your Page ID and Page Access Token into the form to sync organic post reach and engagements.",
        tip: "Enables multi-platform content publishing from the Content Studio."
      }
    ],
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"]
  },
  {
    id: "Instagram",
    name: "Instagram Professional",
    ecosystem: "Meta",
    description: "Publish Reels, carousels, and monitor profile analytics.",
    features: ["Reels & Stories", "Profile Visits", "Engagement Rate", "Follower Growth"],
    portalName: "Meta Business Suite & Instagram App",
    portalUrl: "https://business.facebook.com/settings/instagram-accounts",
    idLabel: "Instagram Business Account ID",
    idPlaceholder: "17841405822345678",
    idHelp: "17-digit ID from Meta Business Suite > Business Settings > Instagram Accounts.",
    keyLabel: "Instagram Graph API Access Token",
    keyPlaceholder: "EAAC... (Instagram Graph Token)",
    keyHelp: "System User token with instagram_basic, instagram_content_publish permissions.",
    color: "#e4405f",
    prerequisites: [
      "Instagram account switched to Professional (Business or Creator)",
      "Instagram account connected to your Facebook Page in Meta Business Suite"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Switch to Professional Account",
        instruction: "In Instagram mobile app > Settings > Account > Switch to Professional Account. Connect it to your Facebook Business Page.",
        tip: "Personal Instagram accounts cannot access the Graph API."
      },
      {
        step: 2,
        title: "Locate Instagram Account ID",
        instruction: "Go to business.facebook.com/settings > Accounts > Instagram Accounts. Click your account to view the numeric Instagram ID.",
        tip: "Example: 17841405822345678."
      },
      {
        step: 3,
        title: "Generate Graph API Token",
        instruction: "In Meta Business Settings > System Users, generate a token with instagram_basic, instagram_content_publish, instagram_manage_insights, and pages_show_list.",
        tip: "Paste the Instagram ID and Access Token to complete connection."
      }
    ],
    scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"]
  },
  {
    id: "Messenger",
    name: "Messenger",
    ecosystem: "Meta",
    description: "Automate direct customer conversations and click-to-messenger ads.",
    features: ["Click-to-Message Ads", "Lead Qualification", "Auto-Replies", "Customer Chat"],
    portalName: "Meta for Developers Messenger Setup",
    portalUrl: "https://developers.facebook.com",
    idLabel: "Facebook Page ID for Messenger",
    idPlaceholder: "102938475610293",
    idHelp: "The Facebook Page ID associated with your Messenger chatbot / inbox.",
    keyLabel: "Messenger Send API Access Token",
    keyPlaceholder: "EAAD... (Messenger API Token)",
    keyHelp: "Generated under Meta for Developers > Your App > Messenger > Settings > Access Tokens.",
    color: "#0084ff",
    prerequisites: [
      "Facebook Page with messaging enabled",
      "Meta Developer App with 'Messenger' product added"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Add Messenger Product to Meta App",
        instruction: "Go to developers.facebook.com > Your App > Add Product > select 'Messenger'.",
        tip: "Click 'Set Up' to access the Messenger settings panel."
      },
      {
        step: 2,
        title: "Generate Messenger Page Token",
        instruction: "In Messenger > Settings > 'Access Tokens' section, click 'Add or Remove Pages' > select your Page > click 'Generate Token'.",
        tip: "Copy the token and your numeric Page ID."
      },
      {
        step: 3,
        title: "Enable Webhooks & Save",
        instruction: "Subscribe to 'messages' and 'messaging_postbacks' webhook events. Paste credentials into the connection form.",
        tip: "Lead campaigns will now route new prospects into Messenger conversational funnels."
      }
    ],
    scopes: ["pages_messaging", "pages_messaging_subscriptions"]
  },
  {
    id: "WhatsApp",
    name: "WhatsApp Business",
    ecosystem: "Meta",
    description: "Send automated notifications, marketing broadcasts, and lead follow-ups via WhatsApp Cloud API.",
    features: ["Marketing Broadcasts", "Template Messages", "OTP & Order Alerts", "2-Way Chat"],
    portalName: "Meta for Developers WhatsApp Portal",
    portalUrl: "https://developers.facebook.com",
    idLabel: "WhatsApp Business Account ID (WABA ID)",
    idPlaceholder: "109283746501928",
    idHelp: "WABA ID found in Meta for Developers > WhatsApp > API Setup or WhatsApp Manager.",
    secondaryIdLabel: "Phone Number ID",
    secondaryIdPlaceholder: "105948372615243",
    secondaryIdHelp: "The Phone number ID displayed under 'Step 1: Select phone number' in WhatsApp API Setup.",
    keyLabel: "Permanent System User Access Token",
    keyPlaceholder: "EAAW... (WhatsApp Permanent Token)",
    keyHelp: "Generated from Meta Business Settings > System Users with whatsapp_business_messaging scope.",
    color: "#25d366",
    prerequisites: [
      "Meta Business Account verified",
      "A valid phone number not currently used on a standard WhatsApp app"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Set up WhatsApp in Meta Developer Portal",
        instruction: "Go to developers.facebook.com > Your App > Add 'WhatsApp' product > API Setup. Copy your 'Phone number ID' and 'WhatsApp Business Account ID'.",
        tip: "Meta provides a free test number to start testing immediately."
      },
      {
        step: 2,
        title: "Create Permanent Token for Production",
        instruction: "Go to business.facebook.com/settings > Users > System Users. Select your system user > click 'Generate New Token' > choose your App > select 'Never' expiration > check 'whatsapp_business_messaging' and 'whatsapp_business_management'.",
        tip: "Temporary 24h tokens from the developer console can be used for initial testing."
      },
      {
        step: 3,
        title: "Save in MarketerOS",
        instruction: "Paste your WABA ID, Phone Number ID, and Permanent Access Token into the form below.",
        tip: "Automated campaign lead capture will instantly trigger WhatsApp follow-up messages."
      }
    ],
    scopes: ["whatsapp_business_messaging", "whatsapp_business_management"]
  },

  // ==================== OTHER NETWORKS ====================
  {
    id: "LinkedIn",
    name: "LinkedIn Ads",
    ecosystem: "Other",
    description: "B2B professional targeted advertising and lead generation campaigns.",
    features: ["Sponsored Content", "InMail Ads", "Lead Gen Forms", "Job Title Targeting"],
    portalName: "LinkedIn Campaign Manager",
    portalUrl: "https://www.linkedin.com/campaignmanager",
    idLabel: "LinkedIn Ad Account ID",
    idPlaceholder: "504938271",
    idHelp: "Found in LinkedIn Campaign Manager next to your account name.",
    keyLabel: "OAuth 2.0 Access Token / API Secret",
    keyPlaceholder: "AQV... (LinkedIn Access Token)",
    keyHelp: "Generated in LinkedIn Developer Portal under your App's Auth tab.",
    color: "#0a66c2",
    prerequisites: [
      "LinkedIn Company Page",
      "LinkedIn Campaign Manager Ad Account"
    ],
    guideSteps: [
      {
        step: 1,
        title: "Copy Ad Account ID",
        instruction: "Sign in to linkedin.com/campaignmanager. In the top-left account list, copy the numeric Account ID (e.g. 504938271).",
        tip: "Make sure your LinkedIn user profile has Account Manager or Campaign Manager permissions."
      },
      {
        step: 2,
        title: "Generate Access Token",
        instruction: "Open linkedin.com/developers > Your App > Auth. Request 'r_ads' and 'rw_ads' scopes and generate an OAuth access token.",
        tip: "Enter both the Account ID and Token to activate sync."
      }
    ],
    scopes: ["r_ads", "rw_ads"]
  },
  {
    id: "TikTok",
    name: "TikTok Ads",
    ecosystem: "Other",
    description: "Short-form video and spark ad promotions reaching high-engagement audiences.",
    features: ["In-Feed Ads", "Spark Ads", "TikTok Pixel", "Catalog Sales"],
    portalName: "TikTok for Business Developer Center",
    portalUrl: "https://ads.tiktok.com",
    idLabel: "TikTok Advertiser ID",
    idPlaceholder: "719827364501928374",
    idHelp: "Found under your avatar profile menu in TikTok Ads Manager.",
    keyLabel: "Marketing API Access Token",
    keyPlaceholder: "act.987654321... (TikTok Secret Token)",
    keyHelp: "Generated in TikTok for Business Developer Portal under your App settings.",
    color: "#111827",
    prerequisites: [
      "TikTok Ads Manager account",
      "TikTok for Business Developer account"
    ],
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
    ],
    scopes: ["ads_read", "ads_write"]
  }
];

export function LiveIntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      }, 900);
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

  const googlePlatforms = SUPPORTED_PLATFORMS.filter((p) => p.ecosystem === "Google");
  const metaPlatforms = SUPPORTED_PLATFORMS.filter((p) => p.ecosystem === "Meta");
  const otherPlatforms = SUPPORTED_PLATFORMS.filter((p) => p.ecosystem === "Other");

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <AppShell title="Integrations">
      <PageHeading
        title="Marketing Platform Integrations"
        description="Connect your Google & Meta marketing accounts with verified API credentials. Connected platforms can immediately launch campaigns."
        action={
          <button
            onClick={fetchIntegrations}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e1e4ec] bg-white px-3.5 text-xs font-bold text-[#5b687f] shadow-sm hover:bg-[#f8f9fc]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Status
          </button>
        }
      />

      {/* Info Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe3fa] bg-gradient-to-r from-[#f2f0ff] via-[#f7f5ff] to-[#fbf9ff] p-5">
        <div className="flex items-center gap-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6940e8] text-white shadow-sm">
            <KeyRound size={22} />
          </span>
          <div>
            <div className="text-sm font-extrabold text-[#111a2e]">API Key & Token Authentication Required</div>
            <p className="text-xs text-[#63708a]">
              Every platform requires a genuine <strong>API Key, Developer Token, or Permanent Access Token</strong> for verified synchronization. Click <strong>"Setup Guide"</strong> on any card for exact instructions.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/campaigns/create")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-4 text-xs font-bold text-white shadow hover:bg-[#5b34d6]"
        >
          Create Campaign <ArrowRight size={14} />
        </button>
      </div>

      {/* ================= SECTION 1: GOOGLE ECOSYSTEM ================= */}
      <div className="mb-9">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#4285f4] text-xs font-black text-white shadow-sm">G</span>
            <h2 className="text-base font-extrabold text-[#111a2e]">Google Marketing Ecosystem</h2>
            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-[11px] font-bold text-[#1967d2]">
              {googlePlatforms.filter((p) => getIntegrationForPlatform(p.id)?.status === "Connected").length} / {googlePlatforms.length} Connected
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {googlePlatforms.map((platform) => {
            const live = getIntegrationForPlatform(platform.id);
            const isConnected = live?.status === "Connected";

            return (
              <Card key={platform.id} className="relative flex flex-col justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#edf0f5] bg-[#fafbfe]">
                        <PlatformIcon platform={platform.name} size={30} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#111a2e]">{platform.name}</h3>
                        <div className="mt-1">
                          <StatusBadge status={isConnected ? "Active" : "Draft"} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openGuideModal(platform)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e2e6f0] bg-white px-2 py-1 text-[11px] font-bold text-[#55637d] hover:border-[#6940e8] hover:text-[#6940e8]"
                      title="View step-by-step setup guide"
                    >
                      <BookOpen size={12} /> Guide
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#63708a]">{platform.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {platform.features.map((feat) => (
                      <span key={feat} className="rounded-md bg-[#f2f4f8] px-2 py-0.5 text-[10px] font-semibold text-[#54627a]">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#edf0f5] pt-4">
                  {isConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[#1f2d47]">
                          ID: <span className="font-mono text-[#5b3cd6]">{live?.account || "Connected"}</span>
                        </div>
                        <div className="text-[10px] text-[#8290a4]">Active & synced</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/campaigns/create?platform=${encodeURIComponent(platform.id)}`)}
                          className="rounded-lg bg-[#f0eaff] px-2.5 py-1.5 text-xs font-bold text-[#6940e8] hover:bg-[#e4daff]"
                          title="Create campaign with this platform"
                        >
                          Launch Ad
                        </button>
                        <button
                          onClick={() => live?.id && setDisconnectTarget({ integrationId: live.id, platformName: platform.name })}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#f0dede] text-[#cf3341] hover:bg-[#fff5f5]"
                          title="Disconnect account"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openConnectModal(platform, live)}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6940e8] text-xs font-bold text-white shadow-sm hover:bg-[#5a32d6]"
                      >
                        <Plus size={14} /> Connect Credentials
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================= SECTION 2: META ECOSYSTEM ================= */}
      <div className="mb-9">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#1877f2] text-xs font-black text-white shadow-sm">M</span>
            <h2 className="text-base font-extrabold text-[#111a2e]">Meta Marketing Ecosystem</h2>
            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-[11px] font-bold text-[#1877f2]">
              {metaPlatforms.filter((p) => getIntegrationForPlatform(p.id)?.status === "Connected").length} / {metaPlatforms.length} Connected
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metaPlatforms.map((platform) => {
            const live = getIntegrationForPlatform(platform.id);
            const isConnected = live?.status === "Connected";

            return (
              <Card key={platform.id} className="relative flex flex-col justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#edf0f5] bg-[#fafbfe]">
                        <PlatformIcon platform={platform.name} size={30} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#111a2e]">{platform.name}</h3>
                        <div className="mt-1">
                          <StatusBadge status={isConnected ? "Active" : "Draft"} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openGuideModal(platform)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e2e6f0] bg-white px-2 py-1 text-[11px] font-bold text-[#55637d] hover:border-[#6940e8] hover:text-[#6940e8]"
                      title="View step-by-step setup guide"
                    >
                      <BookOpen size={12} /> Guide
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#63708a]">{platform.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {platform.features.map((feat) => (
                      <span key={feat} className="rounded-md bg-[#f2f4f8] px-2 py-0.5 text-[10px] font-semibold text-[#54627a]">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#edf0f5] pt-4">
                  {isConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[#1f2d47]">
                          ID: <span className="font-mono text-[#5b3cd6]">{live?.account || "Connected"}</span>
                        </div>
                        <div className="text-[10px] text-[#8290a4]">Active & synced</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/campaigns/create?platform=${encodeURIComponent(platform.id)}`)}
                          className="rounded-lg bg-[#f0eaff] px-2.5 py-1.5 text-xs font-bold text-[#6940e8] hover:bg-[#e4daff]"
                          title="Create campaign with this platform"
                        >
                          Launch Ad
                        </button>
                        <button
                          onClick={() => live?.id && setDisconnectTarget({ integrationId: live.id, platformName: platform.name })}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#f0dede] text-[#cf3341] hover:bg-[#fff5f5]"
                          title="Disconnect account"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openConnectModal(platform, live)}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6940e8] text-xs font-bold text-white shadow-sm hover:bg-[#5a32d6]"
                      >
                        <Plus size={14} /> Connect Credentials
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================= SECTION 3: OTHER NETWORKS ================= */}
      <div className="mb-8">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#111a2e]">Additional Ad Networks</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otherPlatforms.map((platform) => {
            const live = getIntegrationForPlatform(platform.id);
            const isConnected = live?.status === "Connected";

            return (
              <Card key={platform.id} className="relative flex flex-col justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#edf0f5] bg-[#fafbfe]">
                        <PlatformIcon platform={platform.name} size={30} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#111a2e]">{platform.name}</h3>
                        <div className="mt-1">
                          <StatusBadge status={isConnected ? "Active" : "Draft"} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openGuideModal(platform)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e2e6f0] bg-white px-2 py-1 text-[11px] font-bold text-[#55637d] hover:border-[#6940e8] hover:text-[#6940e8]"
                      title="View step-by-step setup guide"
                    >
                      <BookOpen size={12} /> Guide
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#63708a]">{platform.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {platform.features.map((feat) => (
                      <span key={feat} className="rounded-md bg-[#f2f4f8] px-2 py-0.5 text-[10px] font-semibold text-[#54627a]">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#edf0f5] pt-4">
                  {isConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[#1f2d47]">
                          ID: <span className="font-mono text-[#5b3cd6]">{live?.account || "Connected"}</span>
                        </div>
                        <div className="text-[10px] text-[#8290a4]">Active & synced</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/campaigns/create?platform=${encodeURIComponent(platform.id)}`)}
                          className="rounded-lg bg-[#f0eaff] px-2.5 py-1.5 text-xs font-bold text-[#6940e8] hover:bg-[#e4daff]"
                          title="Create campaign with this platform"
                        >
                          Launch Ad
                        </button>
                        <button
                          onClick={() => live?.id && setDisconnectTarget({ integrationId: live.id, platformName: platform.name })}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#f0dede] text-[#cf3341] hover:bg-[#fff5f5]"
                          title="Disconnect account"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openConnectModal(platform, live)}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#6940e8] text-xs font-bold text-white shadow-sm hover:bg-[#5a32d6]"
                    >
                      <Plus size={14} /> Connect Credentials
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================= CONNECT CREDENTIALS MODAL ================= */}
      {connectModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-2xl border border-[#e2e5ec] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#edf0f4] pb-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={selectedPlatform.name} size={32} />
                <div>
                  <h3 className="text-base font-extrabold text-[#111a2e]">Connect {selectedPlatform.name}</h3>
                  <p className="text-xs text-[#718098]">Enter your genuine platform API credentials</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openGuideModal(selectedPlatform)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#f0eaff] px-2.5 py-1 text-xs font-bold text-[#6940e8] hover:bg-[#e4daff]"
                >
                  <BookOpen size={13} /> View Guide
                </button>
                <button onClick={() => setConnectModalOpen(false)} className="rounded-lg p-1.5 text-[#8895ab] hover:bg-[#f1f3f7]">
                  <X size={18} />
                </button>
              </div>
            </div>

            {error && <div className="mt-4 rounded-xl border border-[#f2c4c8] bg-[#fff8f8] p-3 text-xs font-semibold text-[#b72e38]">{error}</div>}
            {successMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#c8ecd9] bg-[#effbf5] p-3 text-xs font-bold text-[#148b5a]">
                <Check size={16} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleConnect} className="mt-5 space-y-4 text-xs">
              <label className="block">
                <span className="mb-1.5 block font-bold text-[#27344d]">Account Nickname / Identifier</span>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={`My ${selectedPlatform.name} Main Account`}
                  required
                  className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 outline-none focus:border-[#6940e8]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-bold text-[#27344d]">{selectedPlatform.idLabel} *</span>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={selectedPlatform.idPlaceholder}
                  required
                  className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono outline-none focus:border-[#6940e8]"
                />
                <p className="mt-1.5 text-[11px] text-[#7a879e]">{selectedPlatform.idHelp}</p>
              </label>

              {selectedPlatform.secondaryIdLabel && (
                <label className="block">
                  <span className="mb-1.5 block font-bold text-[#27344d]">{selectedPlatform.secondaryIdLabel} *</span>
                  <input
                    type="text"
                    value={secondaryId}
                    onChange={(e) => setSecondaryId(e.target.value)}
                    placeholder={selectedPlatform.secondaryIdPlaceholder}
                    required
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono outline-none focus:border-[#6940e8]"
                  />
                  <p className="mt-1.5 text-[11px] text-[#7a879e]">{selectedPlatform.secondaryIdHelp}</p>
                </label>
              )}

              {/* MANDATORY API KEY / ACCESS TOKEN FIELD */}
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-bold text-[#27344d]">{selectedPlatform.keyLabel} *</span>
                  <span className="rounded bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-bold text-[#b91c1c]">Required</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedPlatform.keyPlaceholder}
                    required
                    className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 font-mono outline-none focus:border-[#6940e8]"
                  />
                  <Key size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa6bb]" />
                </div>
                <p className="mt-1.5 text-[11px] text-[#7a879e]">{selectedPlatform.keyHelp}</p>
              </label>

              <div className="rounded-xl border border-[#e4e7ee] bg-[#fafbfe] p-3.5 text-[11px] leading-5 text-[#67758d]">
                <ShieldCheck size={16} className="mr-1.5 inline text-[#20ad78]" />
                Credentials are validated and encrypted securely in PostgreSQL. Only authenticated accounts can launch ad campaigns.
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  disabled={busy}
                  className="h-9 rounded-lg border border-[#dfe3eb] px-4 font-bold text-[#55637a] hover:bg-[#f5f7fa]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-5 font-bold text-white shadow hover:bg-[#5b34d6]"
                >
                  {busy ? "Validating & Saving…" : "Save & Verify Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STEP-BY-STEP SETUP GUIDE MODAL ================= */}
      {guideModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-[650px] flex-col rounded-2xl border border-[#e2e5ec] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#edf0f4] p-5">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={selectedPlatform.name} size={36} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#111a2e]">{selectedPlatform.name} Setup Guide</h3>
                    <span className="rounded-md bg-[#f0eaff] px-2 py-0.5 text-[10px] font-bold text-[#6940e8]">
                      {selectedPlatform.ecosystem} Ecosystem
                    </span>
                  </div>
                  <p className="text-xs text-[#718098]">Step-by-step instructions to get your genuine API credentials</p>
                </div>
              </div>
              <button onClick={() => setGuideModalOpen(false)} className="rounded-lg p-1.5 text-[#8895ab] hover:bg-[#f1f3f7]">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs">
              {/* Developer Portal Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0e5f2] bg-[#f8f9fd] p-4">
                <div>
                  <span className="text-[11px] font-bold text-[#718098]">Official Management Portal:</span>
                  <div className="text-xs font-extrabold text-[#1a253c]">{selectedPlatform.portalName}</div>
                </div>
                <a
                  href={selectedPlatform.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-bold text-[#6940e8] shadow-sm ring-1 ring-[#e2e5ec] hover:bg-[#f3f0ff]"
                >
                  Open Portal <ExternalLink size={13} />
                </a>
              </div>

              {/* Prerequisites */}
              <div>
                <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#526079]">Prerequisites</h4>
                <div className="space-y-1.5 rounded-xl border border-[#edf0f5] bg-[#fafbfe] p-3.5">
                  {selectedPlatform.prerequisites.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#33425b]">
                      <Check size={14} className="mt-0.5 shrink-0 text-[#159a65]" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-[#526079]">Step-by-Step Setup Process</h4>
                <div className="space-y-4">
                  {selectedPlatform.guideSteps.map((s) => (
                    <div key={s.step} className="flex items-start gap-3.5 rounded-xl border border-[#e7ebf3] p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#6940e8] text-xs font-extrabold text-white shadow-sm">
                        {s.step}
                      </span>
                      <div className="flex-1">
                        <div className="font-extrabold text-[#111a2e]">{s.title}</div>
                        <p className="mt-1 leading-5 text-[#4e5d77]">{s.instruction}</p>
                        {s.tip && (
                          <div className="mt-2 rounded-lg bg-[#f0f4ff] p-2.5 text-[11px] leading-4 text-[#2a4e9b]">
                            <strong>💡 Tip:</strong> {s.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scopes Required */}
              {selectedPlatform.scopes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#526079]">Required Permission Scopes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlatform.scopes.map((scope, idx) => (
                      <span key={idx} className="rounded-md bg-[#eef2f8] px-2.5 py-1 font-mono text-[10px] font-bold text-[#3d4b63]">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#edf0f4] p-4">
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="h-9 rounded-lg border border-[#dfe3eb] px-4 text-xs font-bold text-[#55637a] hover:bg-[#f5f7fa]"
              >
                Close Guide
              </button>

              <button
                type="button"
                onClick={() => {
                  setGuideModalOpen(false);
                  openConnectModal(selectedPlatform);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6940e8] px-5 text-xs font-bold text-white shadow hover:bg-[#5b34d6]"
              >
                Enter Credentials Now <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= CONFIRM DISCONNECT MODAL ================= */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-2xl border border-[#e2e5ec] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fee2e2] text-[#ef4444]">
                <AlertTriangle size={24} />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-[#111a2e]">Disconnect {disconnectTarget.platformName}?</h3>
                <p className="text-xs text-[#718098]">Revoke platform connection</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#55637a]">
              Are you sure you want to disconnect <strong>{disconnectTarget.platformName}</strong>? Active campaigns will not be able to pull new metrics until reconnected with verified credentials.
            </p>

            {disconnectError && (
              <div className="mt-3 rounded-xl border border-[#f2c4c8] bg-[#fff8f8] p-3 text-xs font-semibold text-[#b72e38]">
                {disconnectError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDisconnectTarget(null);
                  setDisconnectError(null);
                }}
                disabled={busy}
                className="h-9 rounded-lg border border-[#dfe3eb] px-4 text-xs font-bold text-[#55637a] hover:bg-[#f5f7fa]"
              >
                Keep Connected
              </button>
              <button
                type="button"
                onClick={confirmDisconnect}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ef4444] px-5 text-xs font-bold text-white shadow hover:bg-[#dc2626]"
              >
                {busy ? "Disconnecting…" : "Yes, Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
