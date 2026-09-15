"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck
} from "lucide-react";
import { SiGoogleads } from "react-icons/si";
import { cn } from "@/lib/utils";

export function GoogleAdsSetupGuide() {
  const [tab, setTab] = useState<"platform_owner" | "end_user" | "gaql">("platform_owner");
  const [copied, setCopied] = useState(false);

  const gaqlSample = `SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign_budget.amount_micros,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.conversions_value,
  metrics.ctr,
  metrics.average_cpc,
  metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC`;

  const copyCode = () => {
    navigator.clipboard.writeText(gaqlSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-[#F4B400] dark:bg-amber-950/40">
            <SiGoogleads size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Google Ads API Setup Guide & Architecture
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                OAuth 2.0 Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Complete onboarding workflow based on official Google Ads API documentation.
            </p>
          </div>
        </div>

        <a
          href="https://developers.google.com/google-ads/api/docs/get-started/onboarding"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <span>Official Google Docs</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setTab("platform_owner")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
            tab === "platform_owner"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <ShieldCheck size={13} />
          <span>1. Platform Owner Setup (One-Time)</span>
        </button>

        <button
          onClick={() => setTab("end_user")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
            tab === "end_user"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <UserCheck size={13} />
          <span>2. End-User Connect Experience</span>
        </button>

        <button
          onClick={() => setTab("gaql")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
            tab === "gaql"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
          )}
        >
          <Code2 size={13} />
          <span>3. GAQL Backend Query Spec</span>
        </button>
      </div>

      {/* TAB 1: PLATFORM OWNER SETUP */}
      {tab === "platform_owner" && (
        <div className="mt-5 space-y-4 text-xs">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Platform Owner Responsibility (Never ask end-users for Developer Tokens)</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">
              As the SaaS platform owner, you obtain a single Developer Token and Google Cloud OAuth Client. End-users simply authenticate via Google OAuth in 1-click.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  1
                </span>
                <span>Enable Google Ads API</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                In <a href="https://console.cloud.google.com" target="_blank" className="font-semibold underline">Google Cloud Console</a> &gt; <strong>APIs & Services</strong> &gt; <strong>Library</strong>, search for <em>&quot;Google Ads API&quot;</em> and click <strong>Enable</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  2
                </span>
                <span>Create OAuth Client ID</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                In Cloud Console &gt; <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth client ID (Web application)</strong>. Add redirect URI: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/api/google-ads/callback</code>.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  3
                </span>
                <span>Apply for Developer Token</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                In your Google Ads Manager (MCC) account &gt; <strong>Tools & Settings</strong> &gt; <strong>Setup</strong> &gt; <strong>API Center</strong> &gt; Apply for your Developer Token.
              </p>
            </div>
          </div>

          {/* Environment Variables Table */}
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Backend Environment Variables (.env)
            </h4>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr>
                    <td className="py-1.5 pr-3 font-semibold text-indigo-600 dark:text-indigo-400">GOOGLE_ADS_DEVELOPER_TOKEN</td>
                    <td className="py-1.5 text-zinc-500">Your Google Ads Manager MCC Developer Token (header: developer-token)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-semibold text-indigo-600 dark:text-indigo-400">GOOGLE_OAUTH_CLIENT_ID</td>
                    <td className="py-1.5 text-zinc-500">Google Cloud Web Application Client ID</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-semibold text-indigo-600 dark:text-indigo-400">GOOGLE_OAUTH_CLIENT_SECRET</td>
                    <td className="py-1.5 text-zinc-500">Google Cloud Web Application Client Secret</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-semibold text-indigo-600 dark:text-indigo-400">GOOGLE_OAUTH_REDIRECT_URI</td>
                    <td className="py-1.5 text-zinc-500">https://your-domain.com/api/google-ads/callback</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: END-USER CONNECT EXPERIENCE */}
      {tab === "end_user" && (
        <div className="mt-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">Step 1: Sign in with Google</div>
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                User clicks &quot;Connect Google Ads&quot; and is redirected to Google&apos;s official consent prompt.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">Step 2: Grant Access</div>
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                User approves AdWords read access. Google returns an authorization code with offline access.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">Step 3: Refresh Token Exchange</div>
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Backend exchanges code for long-lived refresh token and queries accessible accounts list.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">Step 4: Pick Customer ID</div>
              <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                User selects their Customer ID from the populated dropdown. Sync begins automatically.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Friction UX</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">
              End-users never have to hunt for Developer Tokens or copy complex API credentials.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: GAQL BACKEND QUERY SPEC */}
      {tab === "gaql" && (
        <div className="mt-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Google Ads Query Language (GAQL) used by <code className="text-indigo-600 dark:text-indigo-400">/api/google-ads/performance</code>:
            </span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copied ? "Copied!" : "Copy GAQL"}</span>
            </button>
          </div>

          <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-[11px] text-zinc-100 dark:border-zinc-800">
            <code>{gaqlSample}</code>
          </pre>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Calls endpoint: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">https://googleads.googleapis.com/v18/customers/{"{customerId}"}/googleAds:searchStream</code> with <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Authorization: Bearer {"{accessToken}"}</code> and <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">developer-token: {"{developerToken}"}</code>.
          </p>
        </div>
      )}
    </div>
  );
}
