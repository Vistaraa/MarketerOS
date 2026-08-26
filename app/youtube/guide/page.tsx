"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Key,
  Lock,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Youtube,
  Zap
} from "lucide-react";
import { AppShell } from "@/components/marketeros-shell";

type Section = "setup" | "connect" | "backend" | "analytics";

const SETUP_STEPS = [
  {
    id: 1,
    title: "Create Google Account",
    icon: <Globe size={16} />,
    description: "Create a Google Account for your business (or use existing).",
    source: "https://support.google.com/youtube/answer/6180215",
    sourceText: "YouTube Create Channel Guide",
    details: "Use a business email (name@yourbrand.com recommended). This Google Account will own your Brand Channel.",
    substeps: [
      "Go to https://accounts.google.com/signup",
      "Create a new Google Account or use existing business account",
      "Use a business email (name@yourbrand.com recommended)",
      "Enable 2-Step Verification for security"
    ]
  },
  {
    id: 2,
    title: "Create Brand Account Channel",
    icon: <Youtube size={16} />,
    description: "Create a dedicated Brand Account channel (not personal).",
    source: "https://support.google.com/youtube/answer/6180215",
    sourceText: "YouTube Create Channel Guide",
    details: "A Brand Account lets multiple team members manage the channel, use any channel name, and keeps business ownership separate from personal accounts.",
    substeps: [
      "Go to youtube.com and sign in with your Google Account",
      "Click your profile icon (top-right) → \"Create a channel\"",
      "Choose \"Use a custom name\" to create a Brand Account",
      "Enter your brand/channel name",
      "Agree to YouTube Terms of Service"
    ]
  },
  {
    id: 3,
    title: "Customize Channel",
    icon: <Settings size={16} />,
    description: "Upload branding assets and optimize channel description.",
    source: "https://support.google.com/youtube/answer/2972003",
    sourceText: "Channel Customization Guide",
    details: "Professional branding increases viewer trust and subscription rates by 35%. Consistent branding makes your channel look professional and trustworthy.",
    substeps: [
      "Upload Profile Picture (800x800px min — logo recommended)",
      "Upload Banner Art (2560x1440px — safe zone: 1546x423px center)",
      "Write Channel Description with keywords + brand story",
      "Add website and social media links",
      "Add contact email for business inquiries",
      "Set channel keywords for discoverability"
    ]
  },
  {
    id: 4,
    title: "Verify Channel (Phone)",
    icon: <Shield size={16} />,
    description: "Phone verification unlocks custom thumbnails, longer videos, and live streaming.",
    source: "https://support.google.com/youtube/answer/17109431",
    sourceText: "Verify Your Channel",
    details: "Required for YouTube Partner Program eligibility and advanced features. Unlocks custom thumbnails, videos >15 min, and live streaming.",
    substeps: [
      "Go to YouTube Studio → Settings → Channel → Feature eligibility",
      "Click \"Verify phone number\"",
      "Enter your phone number and verification code",
      "Unlock custom thumbnails, videos >15 min, and live streaming"
    ]
  },
  {
    id: 5,
    title: "Enable 2-Step Verification",
    icon: <Lock size={16} />,
    description: "Protect your account and enable YouTube Partner Program eligibility.",
    source: "https://support.google.com/accounts/answer/185839",
    sourceText: "2-Step Verification Setup",
    details: "Required for monetization and advanced security. Protects your channel from unauthorized access.",
    substeps: [
      "Go to myaccount.google.com/security",
      "Enable 2-Step Verification",
      "Use phone prompt or authenticator app",
      "Keep backup codes safe"
    ]
  },
  {
    id: 6,
    title: "Set Channel Defaults",
    icon: <FileText size={16} />,
    description: "Configure default settings for all future uploads.",
    source: "https://support.google.com/youtube/answer/6180220",
    sourceText: "Upload Defaults Guide",
    details: "Saves time and ensures consistency across all uploads. Set default title, description, tags, visibility.",
    substeps: [
      "YouTube Studio → Settings → Upload defaults",
      "Set default title suffix, description template",
      "Add default tags for your niche",
      "Set default visibility (Public/Unlisted/Private)",
      "Set language and category"
    ]
  },
  {
    id: 7,
    title: "Create Channel Sections",
    icon: <Zap size={16} />,
    description: "Organize videos into sections/playlists and set channel layout.",
    source: "https://support.google.com/youtube/answer/2972003",
    sourceText: "Channel Customization Guide",
    details: "Organized channels keep viewers engaged longer. Create sections for Featured, Latest, Popular, and topic-specific playlists.",
    substeps: [
      "Go to YouTube Studio → Customization → Layout",
      "Add sections: Featured, Latest, Popular",
      "Create topic-specific playlists",
      "Set channel trailer for new visitors",
      "Set featured video for returning subscribers"
    ]
  },
  {
    id: 8,
    title: "Link Google Analytics (Optional)",
    icon: <Eye size={16} />,
    description: "Track channel traffic and audience behavior with GA4.",
    source: "https://support.google.com/youtube/answer/9276740",
    sourceText: "Link Analytics",
    details: "Optional but recommended. Links your YouTube channel to Google Analytics 4 for deeper audience insights.",
    substeps: [
      "YouTube Studio → Settings → Channel → Advanced",
      "Click \"Link Google Analytics\"",
      "Enter your GA4 Property ID",
      "Save changes"
    ]
  }
];

const CONNECT_FIELDS = [
  { field: "Display Name", required: true, description: "UI display name for your channel in MarketerOS", example: "My Brand Channel" },
  { field: "YouTube Channel ID", required: true, description: "Unique 24-character identifier (starts with UC...)", example: "UCxxxxxxxxxxxxxxxxxxxxxxxx" },
  { field: "Channel URL", required: false, description: "Auto-generated preview of your channel URL", example: "youtube.com/channel/UCxxx" },
  { field: "YouTube API Key", required: true, description: "For fetching public channel data, videos, and metadata", example: "AIzaSyC_YouTubeApiSecretKey123" },
  { field: "OAuth Client ID", required: true, description: "For YouTube Analytics API access (private data)", example: "xxxx.apps.googleusercontent.com" },
  { field: "OAuth Client Secret", required: true, description: "For token exchange and OAuth authentication", example: "GOCSPX-xxxxxxxxxxxxxxxx" },
  { field: "GA4 Property ID", required: false, description: "Google Analytics 4 property linked to channel", example: "123456789" },
  { field: "Country", required: false, description: "Regional analytics filtering and audience insights", example: "IN / US / GB" },
  { field: "Default Language", required: false, description: "Content language for categorization", example: "en / hi / gu" }
];

const BACKEND_STEPS = [
  {
    id: "A",
    title: "YouTube API Key (for public data)",
    icon: <Key size={16} />,
    steps: [
      "Go to https://console.cloud.google.com",
      "Create new project (or select existing)",
      "Enable \"YouTube Data API v3\"",
      "Go to APIs & Services → Credentials",
      "Create API Key → Copy it"
    ],
    source: "https://console.cloud.google.com"
  },
  {
    id: "B",
    title: "OAuth 2.0 Credentials (for private analytics)",
    icon: <Lock size={16} />,
    steps: [
      "Same Cloud Console → Credentials",
      "Create OAuth Client ID",
      "Application type: Web application",
      "Authorized redirect URIs: https://yourdomain.com/api/v1/youtube/oauth/callback",
      "Copy Client ID + Client Secret"
    ],
    source: "https://console.cloud.google.com"
  },
  {
    id: "C",
    title: "YouTube Analytics API (enabled separately)",
    icon: <Eye size={16} />,
    steps: [
      "APIs & Services → Enable APIs",
      "Search \"YouTube Analytics API\"",
      "Enable it"
    ],
    source: "https://console.cloud.google.com"
  },
  {
    id: "D",
    title: "YouTube Channel ID",
    icon: <Youtube size={16} />,
    steps: [
      "Go to https://studio.youtube.com",
      "Settings → Channel → Basic info",
      "Copy Channel ID (starts with UC...)"
    ],
    source: "https://studio.youtube.com"
  }
];

const BACKEND_FLOW = [
  "User enters credentials",
  "Backend validates API Key → GET channels.list (verify channel exists)",
  "Backend validates OAuth credentials → Exchange code for tokens",
  "Store encrypted: API Key, OAuth tokens, Channel ID",
  "Start background sync → Fetch channel stats, videos, analytics",
  "Display in dashboard"
];

const ANALYTICS_APIS = [
  {
    name: "YouTube Data API v3 (Public Data)",
    endpoints: [
      {
        url: "GET /youtube/v3/channels?part=snippet,statistics,contentDetails&id={channelId}&key={apiKey}",
        returns: "title, description, subscriberCount, viewCount, videoCount, thumbnail, uploadsPlaylistId"
      },
      {
        url: "GET /youtube/v3/search?channelId={channelId}&order=date&part=snippet&type=video&maxResults=10&key={apiKey}",
        returns: "Recent videos with titles, thumbnails, publish dates"
      },
      {
        url: "GET /youtube/v3/videos?part=statistics,contentDetails&id={videoIds}&key={apiKey}",
        returns: "viewCount, likeCount, commentCount, duration per video"
      }
    ]
  },
  {
    name: "YouTube Analytics API (Private Analytics)",
    endpoints: [
      {
        url: "GET /youtube/analytics/v2/reports?ids=channel==MINE&metrics=views,likes,estimatedMinutesWatched,averageViewDuration,subscriberGains&dimensions=day&startDate=2026-01-01&endDate=2026-08-26&access_token={token}",
        returns: "Daily views, likes, comments, subscriber gains, watch time, engagement"
      }
    ]
  }
];

const DASHBOARD_SECTIONS = [
  { name: "Overview Cards", description: "Subscribers, Total Views, Videos, Watch Hours with trend indicators", icon: <ShieldCheck size={16} /> },
  { name: "Views Over Time", description: "Daily views line chart for last 30/90 days", icon: <Eye size={16} /> },
  { name: "Top Videos", description: "Bar chart of best performing videos by views/likes", icon: <Youtube size={16} /> },
  { name: "Audience Demographics", description: "Age groups, gender distribution, top countries", icon: <Globe size={16} /> },
  { name: "Traffic Sources", description: "Search, Suggested, External, Direct traffic breakdown", icon: <Zap size={16} /> },
  { name: "Recent Uploads", description: "Last 10 videos with stats (views, likes, comments)", icon: <FileText size={16} /> },
  { name: "Engagement Metrics", description: "Average View Duration, CTR, Like Ratio, Shares", icon: <CheckCircle2 size={16} /> }
];

const METRICS_TABLE = [
  { category: "Overview", metrics: "Subscribers, Total Views, Video Count, Watch Hours", source: "Data API v3" },
  { category: "Growth", metrics: "Subscriber Gains (daily), View Trends", source: "Analytics API" },
  { category: "Videos", metrics: "Per-video views, likes, comments, duration", source: "Data API v3" },
  { category: "Audience", metrics: "Age, Gender, Country, Language", source: "Analytics API" },
  { category: "Traffic", metrics: "Search, Suggested, External, Direct", source: "Analytics API" },
  { category: "Engagement", metrics: "Average View Duration, CTR, Like Ratio", source: "Analytics API" },
  { category: "Revenue", metrics: "Estimated Revenue, RPM, CPM (if monetized)", source: "Analytics API" }
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="ml-2 inline-flex items-center gap-1 rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
      {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  );
}

export default function YouTubeGuidePage() {
  const [activeSection, setActiveSection] = useState<Section>("setup");

  const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "setup", label: "Setup Guide", icon: <Settings size={14} /> },
    { id: "connect", label: "Connect Form", icon: <Key size={14} /> },
    { id: "backend", label: "Backend Setup", icon: <Server size={14} /> },
    { id: "analytics", label: "Analytics & Dashboard", icon: <Eye size={14} /> }
  ];

  return (
    <AppShell title="YouTube Brand Channel Guide">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/30">
              <Youtube className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">YouTube Brand Channel — Complete Guide</h1>
              <p className="text-xs text-zinc-500">Everything you need to set up, connect, and analyze your YouTube Brand Channel in MarketerOS.</p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all ${activeSection === s.id ? "bg-red-600 text-white shadow-md" : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}>
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* ===================== SECTION 1: SETUP GUIDE ===================== */}
        {activeSection === "setup" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Step-by-Step YouTube Brand Channel Setup</h2>
              <p className="mt-1 text-xs text-zinc-500">Follow these 8 official steps to set up your YouTube Brand Channel properly before connecting to MarketerOS.</p>
            </div>

            {SETUP_STEPS.map((step) => (
              <SetupStepCard key={step.id} step={step} />
            ))}
          </div>
        )}

        {/* ===================== SECTION 2: CONNECT FORM ===================== */}
        {activeSection === "connect" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect YouTube Brand Channel — Form Fields</h2>
              <p className="mt-1 text-xs text-zinc-500">These are the fields users see when connecting their YouTube Brand Channel in MarketerOS.</p>
            </div>

            {/* Form Preview */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Form Preview</h3>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-2 mb-3">
                  <Youtube className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Connect YouTube Brand Channel</span>
                </div>
                <div className="space-y-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">Display Name*</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">My Brand Channel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">YouTube Channel ID*</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">UCxxxxxxxxxxxxxxxxxxxxxxxx</span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-2 pt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Google Cloud Credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">OAuth Client ID*</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">xxxx.apps.googleusercontent.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">OAuth Client Secret*</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">••••••••••••</span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-2 pt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">OR Manual API Key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">YouTube API Key*</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">AIzaSy...</span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-2 pt-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Advanced Options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">GA4 Property ID</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">123456789</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">Country</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 text-zinc-500">Default Language</span>
                    <span className="rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">en</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fields Table */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Field Explanation</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="pb-2 text-left font-medium text-zinc-500">Field</th>
                      <th className="pb-2 text-left font-medium text-zinc-500">Required</th>
                      <th className="pb-2 text-left font-medium text-zinc-500">Why</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {CONNECT_FIELDS.map((f) => (
                      <tr key={f.field}>
                        <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">{f.field}</td>
                        <td className="py-2">{f.required ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/30">Required</span> : <span className="rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">Optional</span>}</td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-400">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SECTION 3: BACKEND SETUP ===================== */}
        {activeSection === "backend" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Backend Setup — What Values from User</h2>
              <p className="mt-1 text-xs text-zinc-500">Required values from Google Cloud Console and YouTube Studio to enable full integration.</p>
            </div>

            {BACKEND_STEPS.map((step) => (
              <BackendStepCard key={step.id} step={step} />
            ))}

            {/* Backend Flow */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Backend Flow</h3>
              <div className="space-y-2">
                {BACKEND_FLOW.map((flow, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">{i + 1}</div>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{flow}</span>
                    {i < BACKEND_FLOW.length - 1 && <ArrowRight size={12} className="text-zinc-400" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== SECTION 4: ANALYTICS & DASHBOARD ===================== */}
        {activeSection === "analytics" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Analytics Fetching & Dashboard Display</h2>
              <p className="mt-1 text-xs text-zinc-500">APIs used, metrics fetched, and dashboard sections for YouTube Brand Channel analytics.</p>
            </div>

            {/* APIs */}
            {ANALYTICS_APIS.map((api) => (
              <div key={api.name} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
                <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">{api.name}</h3>
                <div className="space-y-3">
                  {api.endpoints.map((ep, i) => (
                    <div key={i} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-start gap-2">
                        <code className="flex-1 break-all text-[10px] text-zinc-700 dark:text-zinc-300">{ep.url}</code>
                        <CopyButton text={ep.url} />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500">Returns: {ep.returns}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Dashboard Sections */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Dashboard Sections</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {DASHBOARD_SECTIONS.map((sec) => (
                  <div key={sec.name} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30">{sec.icon}</div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{sec.name}</p>
                      <p className="text-[10px] text-zinc-500">{sec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Dashboard Layout Preview</h3>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-3 text-[10px] font-bold text-zinc-500 uppercase">YouTube Brand Channel Analytics</div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[{ l: "Subscribers", v: "12.5K", t: "↑ 2.3%" }, { l: "Total Views", v: "1.2M", t: "↑ 12%" }, { l: "Videos", v: "89", t: "↑ 5" }, { l: "Watch Time", v: "45K hrs", t: "↑ 8%" }].map((s) => (
                    <div key={s.l} className="rounded border border-zinc-200 bg-white p-2 text-center dark:border-zinc-700 dark:bg-zinc-800">
                      <p className="text-[9px] text-zinc-500">{s.l}</p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.v}</p>
                      <p className="text-[9px] text-emerald-500">{s.t}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-2 text-[9px] font-bold text-zinc-500 uppercase">Views Over Time</div>
                <div className="flex items-end gap-px mb-3" style={{ height: 40 }}>
                  {[30, 45, 35, 60, 50, 70, 55, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-red-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Top Countries</div>
                    {["India 45%", "US 22%", "UK 12%"].map((c) => (
                      <div key={c} className="text-[9px] text-zinc-600 dark:text-zinc-400">{c}</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Traffic Sources</div>
                    {["Search 40%", "Suggested 35%", "External 15%"].map((s) => (
                      <div key={s} className="text-[9px] text-zinc-600 dark:text-zinc-400">{s}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="mb-3 text-xs font-bold text-zinc-900 dark:text-zinc-100">Metrics to Fetch</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="pb-2 text-left font-medium text-zinc-500">Category</th>
                      <th className="pb-2 text-left font-medium text-zinc-500">Metrics</th>
                      <th className="pb-2 text-left font-medium text-zinc-500">API Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {METRICS_TABLE.map((m) => (
                      <tr key={m.category}>
                        <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">{m.category}</td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-400">{m.metrics}</td>
                        <td className="py-2"><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/30">{m.source}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SetupStepCard({ step }: { step: typeof SETUP_STEPS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30">{step.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-600">STEP {step.id}</span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
          </div>
          <p className="text-xs text-zinc-500">{step.description}</p>
        </div>
        {expanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">{step.details}</p>
          <ul className="mb-3 space-y-1.5">
            {step.substeps.map((sub, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                {sub}
              </li>
            ))}
          </ul>
          <a href={step.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
            <ExternalLink size={10} />
            {step.sourceText}
          </a>
        </div>
      )}
    </div>
  );
}

function BackendStepCard({ step }: { step: typeof BACKEND_STEPS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">{step.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-600">STEP {step.id}</span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
          </div>
        </div>
        {expanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <ul className="mb-3 space-y-1.5">
            {step.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                {s}
              </li>
            ))}
          </ul>
          <a href={step.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
            <ExternalLink size={10} />
            Open Google Cloud Console
          </a>
        </div>
      )}
    </div>
  );
}
