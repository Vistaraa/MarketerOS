"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdMobSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConnect: () => void;
}

export function AdMobSetupGuide({ isOpen, onClose, onOpenConnect }: AdMobSetupGuideProps) {
  const [activeTab, setActiveTab] = useState<"user" | "owner" | "scopes">("user");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <Smartphone className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Google AdMob Setup Guide
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  OAuth 2.0 Ready
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Architecture, permissions, and zero-manual-key OAuth connection flow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher - Standard MarketerOS Segmented Control */}
        <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("user")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
                activeTab === "user"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <UserCheck size={13} />
              <span>1. End-User Flow</span>
            </button>
            <button
              onClick={() => setActiveTab("owner")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
                activeTab === "owner"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <ShieldCheck size={13} />
              <span>2. Owner Setup</span>
            </button>
            <button
              onClick={() => setActiveTab("scopes")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition",
                activeTab === "scopes"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <BookOpen size={13} />
              <span>3. OAuth Scopes</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-h-[55vh] overflow-y-auto p-6 space-y-4 text-xs text-zinc-600 dark:text-zinc-400">
          {/* TAB 1: USER FLOW */}
          {activeTab === "user" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  <Sparkles size={14} className="text-zinc-500" />
                  <span>How End-Users Connect AdMob in MarketerOS</span>
                </div>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  End users never need to copy API keys or upload service account JSON files. The entire connection happens through a standard, 2-click Google OAuth consent prompt.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    1
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">Click &quot;Connect AdMob&quot;</h5>
                    <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                      Open the AdMob card in Integrations and click the connection button.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    2
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">Sign in with Google & Grant Consent</h5>
                    <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                      Google displays the permission screen requesting read-only access to your AdMob reporting metrics. Click <strong>Allow</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    3
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">Automatic Publisher ID Discovery</h5>
                    <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                      Our backend automatically discovers your Publisher ID (<code className="font-mono text-zinc-800 dark:text-zinc-200">pub-XXXXXXXXXXXXXXXX</code>) from Google&apos;s API. Click <strong>Save & Connect</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OWNER SETUP */}
          {activeTab === "owner" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  One-Time Setup in Google Cloud Console
                </h4>
                <p className="mt-1 leading-relaxed text-zinc-500">
                  As the platform owner, ensure the AdMob API is enabled in your Google Cloud Project:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Step 1: Enable AdMob API</span>
                    <a
                      href="https://console.cloud.google.com/apis/library/admob.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      <span>Open Cloud Console</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    Navigate to <strong>APIs & Services &rarr; Library</strong> and search for <strong>Google AdMob API</strong>. Click <strong>ENABLE</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Step 2: Configure Redirect URI</span>
                  <p className="mt-1 text-zinc-500">
                    In your OAuth 2.0 Web Application credentials, add this Authorized Redirect URI:
                  </p>
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 font-mono text-[11px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    <span>http://localhost:3000/api/admob/callback</span>
                    <button
                      onClick={() => copyToClipboard("http://localhost:3000/api/admob/callback", "redirect_uri")}
                      className="flex items-center gap-1 text-zinc-600 hover:underline dark:text-zinc-300"
                    >
                      <Copy size={12} />
                      <span>{copiedText === "redirect_uri" ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Step 3: Environment Variables</span>
                  <p className="mt-1 text-zinc-500">
                    You can reuse your existing <code className="font-mono text-zinc-700 dark:text-zinc-300">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-zinc-700 dark:text-zinc-300">GOOGLE_CLIENT_SECRET</code> or configure dedicated ones in <code className="font-mono text-zinc-700 dark:text-zinc-300">.env</code>:
                  </p>
                  <div className="mt-2 rounded-lg bg-zinc-900 p-3 font-mono text-[11px] text-zinc-200">
                    <div>ADMOB_OAUTH_CLIENT_ID=&quot;your-client-id&quot;</div>
                    <div>ADMOB_OAUTH_CLIENT_SECRET=&quot;your-client-secret&quot;</div>
                    <div>ADMOB_OAUTH_REDIRECT_URI=&quot;http://localhost:3000/api/admob/callback&quot;</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCOPES & ARCHITECTURE */}
          {activeTab === "scopes" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  AdMob OAuth 2.0 Scopes & Security Architecture
                </h4>
                <p className="mt-1 leading-relaxed text-zinc-500">
                  The Google AdMob API provides targeted scopes for secure, read-only performance monitoring:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>https://www.googleapis.com/auth/admob.report</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    Provides access to ad performance reports (Impressions, Clicks, Estimated Earnings, eCPM, Match Rate) without modifying account settings.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>https://www.googleapis.com/auth/admob.readonly</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                      Full Read
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    Read-only access to all AdMob publisher data, ad units, mediation groups, and app metadata.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                    <Lock size={14} />
                    <span>Service Account Limitation</span>
                  </div>
                  <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                    Google AdMob API does not support background service accounts. Authentication requires per-user OAuth with refresh tokens, ensuring end users retain full control over their ad revenue data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with standard buttons */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close Guide
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenConnect();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span>Connect AdMob</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
