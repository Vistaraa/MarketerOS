"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Key,
  Loader2,
  MousePointerClick,
  Play,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  X,
  Youtube,
  Video,
  Users,
  BarChart3,
  Eye,
  Clock,
  TrendingUp
} from "lucide-react";
import { AppShell, PageHeading, StatusBadge } from "@/components/ui/marketeros-shell";
import type { YouTubeChannelInfo, YouTubeVideo, YouTubeAnalyticsData } from "@/lib/youtube/types";

interface YouTubeIntegrationStatus {
  connected: boolean;
  channelId?: string;
  channelName?: string;
  subscriberCount?: number;
  viewCount?: number;
  videoCount?: number;
  lastSynced?: string;
  hasOAuth?: boolean;
}

const SETUP_STEPS = [
  {
    id: 1,
    title: "Create a YouTube Brand Account",
    description: "Create a dedicated Brand Account channel for your business (not personal).",
    details: "A Brand Account lets multiple team members manage the channel, use any channel name, and keeps business ownership separate from personal accounts.",
    link: "https://support.google.com/youtube/answer/6180215",
    linkText: "YouTube Create Channel Guide",
    substeps: [
      "Go to youtube.com and sign in with your Google Account",
      "Click your profile icon (top-right) → \"Create a channel\"",
      "Choose \"Use a custom name\" to create a Brand Account",
      "Enter your brand/channel name"
    ]
  },
  {
    id: 2,
    title: "Customize Your Channel",
    description: "Upload branding assets and optimize channel description.",
    details: "Professional branding increases viewer trust and subscription rates by 35%.",
    link: "https://support.google.com/youtube/answer/2972003",
    linkText: "Channel Customization Guide",
    substeps: [
      "Upload Profile Picture (800x800px min — logo recommended)",
      "Upload Banner Art (2560x1440px — safe zone: 1546x423px center)",
      "Write Channel Description with keywords",
      "Add website and social media links",
      "Add contact email for business inquiries"
    ]
  },
  {
    id: 3,
    title: "Verify Your Channel",
    description: "Phone verification unlocks custom thumbnails, longer videos, and live streaming.",
    details: "Required for YouTube Partner Program eligibility and advanced features.",
    link: "https://support.google.com/youtube/answer/17109431",
    linkText: "Verify Your Channel",
    substeps: [
      "Go to YouTube Studio → Settings → Channel → Feature eligibility",
      "Click \"Verify phone number\"",
      "Enter your phone number and verification code",
      "Unlock custom thumbnails, videos >15 min, and live streaming"
    ]
  },
  {
    id: 4,
    title: "Enable 2-Step Verification",
    description: "Protect your account and enable YouTube Partner Program eligibility.",
    details: "Required for monetization and advanced security.",
    link: "https://support.google.com/accounts/answer/185839",
    linkText: "2-Step Verification Setup",
    substeps: [
      "Go to myaccount.google.com/security",
      "Enable 2-Step Verification",
      "Use phone prompt or authenticator app",
      "Keep backup codes safe"
    ]
  },
  {
    id: 5,
    title: "Set Upload Defaults",
    description: "Configure default settings for all future uploads.",
    details: "Saves time and ensures consistency across all uploads.",
    link: "https://support.google.com/youtube/answer/6180220",
    linkText: "Upload Defaults Guide",
    substeps: [
      "YouTube Studio → Settings → Upload defaults",
      "Set default title suffix, description template",
      "Add default tags for your niche",
      "Set default visibility (Public/Unlisted/Private)"
    ]
  },
  {
    id: 6,
    title: "Get Your YouTube API Key",
    description: "Create a Google Cloud project and generate an API key for data access.",
    details: "Required for MarketerOS to fetch your channel data and analytics.",
    link: "https://console.cloud.google.com",
    linkText: "Google Cloud Console",
    substeps: [
      "Go to console.cloud.google.com",
      "Create new project (or select existing)",
      "Enable \"YouTube Data API v3\" and \"YouTube Analytics API\"",
      "Go to APIs & Services → Credentials",
      "Create API Key → Copy it",
      "Create OAuth 2.0 Client ID (Web application) for analytics"
    ]
  },
  {
    id: 7,
    title: "Find Your Channel ID",
    description: "Locate your unique YouTube Channel ID (starts with UC...).",
    details: "This 24-character ID uniquely identifies your channel.",
    link: "https://studio.youtube.com",
    linkText: "YouTube Studio",
    substeps: [
      "Go to YouTube Studio → Settings → Channel → Basic info",
      "Copy your Channel ID (starts with UC...)",
      "OR: Go to youtube.com/account_advanced"
    ]
  }
];

export function YouTubeBrandChannelSetup() {
  const [status, setStatus] = useState<YouTubeIntegrationStatus>({ connected: false });
  const [showGuide, setShowGuide] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch("/api/v1/integrations");
      const json = await res.json();
      const integrations = json.data?.items || [];
      const yt = integrations.find((i: Record<string, unknown>) => i.platform === "YOUTUBE" || i.platform === "YouTube");
      if (yt && yt.status === "Connected") {
        const meta = (yt.metadata || {}) as Record<string, unknown>;
        setStatus({
          connected: true,
          channelId: String(yt.accountId || ""),
          channelName: String(yt.accountName || ""),
          subscriberCount: Number(meta.subscriberCount || 0),
          viewCount: Number(meta.viewCount || 0),
          videoCount: Number(meta.videoCount || 0),
          lastSynced: String(yt.lastSyncedAt || ""),
          hasOAuth: false
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {status.connected ? (
        <YouTubeConnectedDashboard status={status} onRefresh={loadStatus} />
      ) : (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 dark:bg-red-950/30">
                <Youtube className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">YouTube Brand Channel</h3>
                <p className="text-xs text-zinc-500">Connect your YouTube channel to sync analytics, videos, and audience data.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowGuide(!showGuide)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
                <Settings size={14} />
                {showGuide ? "Hide" : "Show"} Setup Guide
              </button>
              <button onClick={() => { setShowGuide(true); setShowConnect(true); }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">
                <Youtube size={14} />
                Connect Channel
              </button>
            </div>
          </div>

          {showGuide && <SetupGuide step={showConnect ? 6 : undefined} />}
          {showConnect && <ConnectYouTubeForm onSuccess={loadStatus} onClose={() => { setShowConnect(false); setShowGuide(false); }} />}
        </>
      )}
    </div>
  );
}

function SetupGuide({ step }: { step?: number }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(step || 1);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">YouTube Brand Channel Setup Guide</h3>
      <p className="mt-1 text-xs text-zinc-500">Follow these steps to set up your YouTube Brand Channel properly before connecting.</p>

      <div className="mt-4 space-y-3">
        {SETUP_STEPS.map((s) => (
          <div key={s.id} className={`rounded-lg border ${s.id === step ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-zinc-100 dark:border-zinc-800"}`}>
            <button onClick={() => setExpandedStep(expandedStep === s.id ? null : s.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${s.id === step ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                {s.id}
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{s.title}</h4>
                <p className="text-[11px] text-zinc-500">{s.description}</p>
              </div>
              {expandedStep === s.id ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
            </button>
            {expandedStep === s.id && (
              <div className="border-t border-zinc-100 px-3 pb-3 pt-3 dark:border-zinc-800">
                <p className="mb-2 text-[11px] text-zinc-600 dark:text-zinc-400">{s.details}</p>
                <ul className="mb-3 space-y-1.5">
                  {s.substeps.map((sub, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-700 dark:text-zinc-300">
                      <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                      {sub}
                    </li>
                  ))}
                </ul>
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700">
                  <ExternalLink size={10} />
                  {s.linkText}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectYouTubeForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    channelName: "",
    channelId: "",
    apiKey: "",
    oauthClientId: "",
    oauthClientSecret: "",
    country: "",
    defaultLanguage: "en",
    ga4PropertyId: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifiedChannel, setVerifiedChannel] = useState<YouTubeChannelInfo | null>(null);
  const [step, setStep] = useState<"api" | "channel" | "details" | "done">("api");

  async function validateApiKey() {
    if (!formData.apiKey.trim()) return setError("Enter your YouTube API Key.");
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/v1/youtube/validate-api-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: formData.apiKey }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Invalid API Key");
      setStep("channel");
    } catch (e) { setError(e instanceof Error ? e.message : "Validation failed"); }
    setBusy(false);
  }

  async function validateChannel() {
    if (!formData.channelId.trim()) return setError("Enter your YouTube Channel ID.");
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/v1/youtube/validate-channel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: formData.channelId, apiKey: formData.apiKey }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Channel not found");
      setVerifiedChannel(json.data.channel);
      setFormData((p) => ({ ...p, channelName: json.data.channel.title, country: json.data.channel.country || "" }));
      setStep("details");
    } catch (e) { setError(e instanceof Error ? e.message : "Channel validation failed"); }
    setBusy(false);
  }

  async function connect() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/v1/youtube/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Connection failed");
      setSuccess(json.data.message || "Connected successfully!");
      setStep("done");
      setTimeout(() => onSuccess(), 1500);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube className="h-5 w-5 text-red-600" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect YouTube Brand Channel</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={16} /></button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
          <Shield size={14} className="mt-0.5 shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span className="text-xs">{success}</span>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-500">
        {(["api", "channel", "details", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${step === s || (["api", "channel", "details", "done"].indexOf(step) > i) ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
              {(["api", "channel", "details", "done"].indexOf(step) > i) ? <Check size={10} /> : i + 1}
            </div>
            <span className={step === s ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}>{s === "api" ? "API Key" : s === "channel" ? "Channel" : s === "details" ? "Details" : "Done"}</span>
            {i < 3 && <div className="h-px w-4 bg-zinc-200 dark:bg-zinc-700" />}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {step === "api" && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">YouTube API Key *</label>
              <input value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} placeholder="AIzaSy..." className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
              <p className="mt-1 text-[10px] text-zinc-400">Get from Google Cloud Console → APIs & Services → Credentials</p>
            </div>
            <button onClick={validateApiKey} disabled={busy || !formData.apiKey.trim()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              Validate & Continue
            </button>
          </>
        )}

        {step === "channel" && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">YouTube Channel ID *</label>
              <input value={formData.channelId} onChange={(e) => setFormData({ ...formData, channelId: e.target.value })} placeholder="UC..." className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
              <p className="mt-1 text-[10px] text-zinc-400">Find in YouTube Studio → Settings → Channel → Basic info</p>
            </div>
            <button onClick={validateChannel} disabled={busy || !formData.channelId.trim()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Youtube size={14} />}
              Verify Channel
            </button>
          </>
        )}

        {step === "details" && verifiedChannel && (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{verifiedChannel.title}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{verifiedChannel.subscriberCount.toLocaleString()} subscribers · {verifiedChannel.viewCount.toLocaleString()} views · {verifiedChannel.videoCount} videos</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Display Name</label>
                <input value={formData.channelName} onChange={(e) => setFormData({ ...formData, channelName: e.target.value })} className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Country</label>
                <input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">OAuth Client ID <span className="text-zinc-400">(optional — for analytics)</span></label>
              <input value={formData.oauthClientId} onChange={(e) => setFormData({ ...formData, oauthClientId: e.target.value })} placeholder="xxxx.apps.googleusercontent.com" className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">OAuth Client Secret <span className="text-zinc-400">(optional)</span></label>
              <input type="password" value={formData.oauthClientSecret} onChange={(e) => setFormData({ ...formData, oauthClientSecret: e.target.value })} placeholder="GOCSPX-..." className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">GA4 Property ID <span className="text-zinc-400">(optional)</span></label>
              <input value={formData.ga4PropertyId} onChange={(e) => setFormData({ ...formData, ga4PropertyId: e.target.value })} placeholder="123456789" className="mt-1 h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <button onClick={connect} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save & Connect
            </button>
          </>
        )}

        {step === "done" && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Connected Successfully!</p>
              <p className="text-xs text-emerald-600">Redirecting to dashboard...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function YouTubeConnectedDashboard({ status, onRefresh }: { status: YouTubeIntegrationStatus; onRefresh: () => void }) {
  const [dashboardData, setDashboardData] = useState<{ channel: YouTubeChannelInfo; recentVideos: YouTubeVideo[]; integration: Record<string, unknown> } | null>(null);
  const [analytics, setAnalytics] = useState<YouTubeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "videos" | "analytics" | "ads">("overview");

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/youtube/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (res.ok) setDashboardData(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadAnalytics() {
    try {
      const res = await fetch("/api/v1/youtube/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (res.ok) setAnalytics(json.data);
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      <PageHeading title="YouTube Brand Channel Analytics" description={`Connected: ${status.channelName || status.channelId}`} />

      {dashboardData && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Users size={16} />} label="Subscribers" value={dashboardData.channel.subscriberCount.toLocaleString()} color="red" />
            <StatCard icon={<Eye size={16} />} label="Total Views" value={dashboardData.channel.viewCount.toLocaleString()} color="blue" />
            <StatCard icon={<Video size={16} />} label="Videos" value={String(dashboardData.channel.videoCount)} color="purple" />
            <StatCard icon={<Clock size={16} />} label="Watch Time" value={analytics ? `${Math.round(analytics.engagement.estimatedMinutesWatched / 60).toLocaleString()} hrs` : "Loading..."} color="emerald" />
          </div>

          <div className="flex gap-2">
            {(["overview", "videos", "analytics", "ads"] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "analytics" && !analytics) loadAnalytics(); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeTab === tab ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                {tab === "ads" ? "YouTube Ads" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Recent Videos</h4>
                <div className="mt-3 space-y-2">
                  {dashboardData.recentVideos.slice(0, 5).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800">
                      <img src={v.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{v.title}</p>
                        <p className="text-[10px] text-zinc-500">{v.viewCount.toLocaleString()} views · {v.likeCount.toLocaleString()} likes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "videos" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {dashboardData.recentVideos.map((v) => (
                <div key={v.id} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <img src={v.thumbnailUrl} alt="" className="h-24 w-40 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{v.title}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">{v.viewCount.toLocaleString()} views · {v.likeCount.toLocaleString()} likes · {v.commentCount.toLocaleString()} comments</p>
                    <p className="text-[10px] text-zinc-400">{new Date(v.publishedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "analytics" && analytics && (
            <YouTubeAnalyticsPanel analytics={analytics} />
          )}

          {activeTab === "analytics" && !analytics && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
              <BarChart3 className="mx-auto h-8 w-8 text-zinc-400" />
              <p className="mt-2 text-xs text-zinc-500">OAuth not configured. Add OAuth Client ID and Secret to view analytics.</p>
            </div>
          )}

          {activeTab === "ads" && (
            <YouTubeAdsTab />
          )}
        </>
      )}
    </div>
  );
}

function YouTubeAdsTab() {
  const [adsDashboard, setAdsDashboard] = useState<{
    totalViews: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageCTR: number;
    averageViewRate: number;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
      impressions: number;
      views: number;
      clicks: number;
      conversions: number;
      ctr: number;
    }>;
    recentAds: Array<{
      id: string;
      name: string;
      videoTitle: string;
      thumbnailUrl: string;
      impressions: number;
      views: number;
      clicks: number;
      viewRate: number;
    }>;
  } | null>(null);
  const [adsMetrics, setAdsMetrics] = useState<Array<{
    date: string;
    views: number;
    impressions: number;
    clicks: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAdsData(); }, []);

  async function loadAdsData() {
    setLoading(true);
    try {
      const [dashRes, metricsRes] = await Promise.all([
        fetch("/api/v1/youtube-ads/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/v1/youtube-ads/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      ]);
      if (dashRes.ok) { const data = await dashRes.json(); setAdsDashboard(data.data?.dashboard || data.dashboard); }
      if (metricsRes.ok) { const data = await metricsRes.json(); setAdsMetrics(data.data?.metrics || data.metrics || []); }
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  if (!adsDashboard) return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
      <Youtube className="mx-auto h-8 w-8 text-zinc-400" />
      <p className="mt-2 text-xs text-zinc-500">YouTube Ads data not available. Connect YouTube Ads from Integrations page.</p>
    </div>
  );

  const formatNumber = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Views", value: formatNumber(adsDashboard.totalViews), icon: <Eye size={14} />, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Impressions", value: formatNumber(adsDashboard.totalImpressions), icon: <BarChart3 size={14} />, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
          { label: "Clicks", value: formatNumber(adsDashboard.totalClicks), icon: <MousePointerClick size={14} />, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
          { label: "Conversions", value: formatNumber(adsDashboard.totalConversions), icon: <Target size={14} />, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" }
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className={`inline-flex rounded-lg p-1.5 ${s.color}`}>{s.icon}</div>
            <p className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {adsMetrics.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Views Trend (Last 30 Days)</h4>
          <div className="mt-2 flex items-end gap-px" style={{ height: 60 }}>
            {adsMetrics.slice(-30).map((m, i) => {
              const maxViews = Math.max(...adsMetrics.map(x => x.views));
              const height = maxViews > 0 ? (m.views / maxViews) * 100 : 0;
              return <div key={i} className="flex-1 rounded-t bg-red-400 dark:bg-red-600" style={{ height: `${height}%` }} title={`${m.date}: ${m.views} views`} />;
            })}
          </div>
        </div>
      )}

      {adsDashboard.recentAds.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Recent Video Ads</h4>
          <div className="mt-2 space-y-2">
            {adsDashboard.recentAds.slice(0, 5).map(ad => (
              <div key={ad.id} className="flex items-center gap-3 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800">
                {ad.thumbnailUrl && <img src={ad.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{ad.videoTitle}</p>
                  <p className="text-[10px] text-zinc-500">{formatNumber(ad.views)} views · {formatNumber(ad.clicks)} clicks · {ad.viewRate.toFixed(1)}% view rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function YouTubeAnalyticsPanel({ analytics }: { analytics: YouTubeAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Views & Engagement (Last 90 Days)</h4>
        <div className="mt-3 grid grid-cols-4 gap-3">
          <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{analytics.engagement.estimatedMinutesWatched.toLocaleString()}</p><p className="text-[10px] text-zinc-500">Minutes Watched</p></div>
          <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{Math.round(analytics.engagement.averageViewDuration)}s</p><p className="text-[10px] text-zinc-500">Avg View Duration</p></div>
          <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{Math.round(analytics.engagement.averageViewPercentage)}%</p><p className="text-[10px] text-zinc-500">Avg View %</p></div>
          <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">+{analytics.engagement.subscriberGainsTotal.toLocaleString()}</p><p className="text-[10px] text-zinc-500">New Subscribers</p></div>
        </div>
      </div>

      {analytics.dailyViews.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Daily Views Trend</h4>
          <div className="mt-3 flex items-end gap-px" style={{ height: 80 }}>
            {analytics.dailyViews.slice(-30).map((d, i) => {
              const max = Math.max(...analytics.dailyViews.map((x) => x.views));
              const h = max > 0 ? (d.views / max) * 100 : 0;
              return <div key={i} className="flex-1 bg-red-500/70 rounded-t" style={{ height: `${h}%`, minHeight: 2 }} title={`${d.date}: ${d.views} views`} />;
            })}
          </div>
        </div>
      )}

      {analytics.topCountries.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Top Countries</h4>
          <div className="mt-3 space-y-2">
            {analytics.topCountries.slice(0, 5).map((c, i) => {
              const max = analytics.topCountries[0]?.views || 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] text-zinc-600 dark:text-zinc-400">{c.country}</span>
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${(c.views / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-[10px] text-zinc-500">{c.views.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analytics.trafficSources.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Traffic Sources</h4>
          <div className="mt-3 space-y-2">
            {analytics.trafficSources.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-[10px] text-zinc-600 dark:text-zinc-400">{t.source}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${t.percentage}%` }} />
                </div>
                <span className="w-10 text-right text-[10px] text-zinc-500">{t.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-600 dark:bg-red-950/30",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/30",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colors[color]}`}>{icon}</div>
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
