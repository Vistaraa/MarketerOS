"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { PlatformIcon } from "@/components/ui/marketeros-icons";

export type GooglePlatformType =
  | "GOOGLE_ADS"
  | "GOOGLE_ANALYTICS"
  | "GOOGLE_SEARCH_CONSOLE"
  | "FIREBASE_ADMOB";

interface GoogleDynamicModalProps {
  open: boolean;
  platform: GooglePlatformType;
  onClose: () => void;
  onSuccess: (result: { platform: string; message: string }) => void;
  initialAccountId?: string;
  initialAccountName?: string;
}

const PLATFORM_INFO: Record<
  GooglePlatformType,
  {
    title: string;
    description: string;
    idLabel: string;
    idPlaceholder: string;
    idHelp: string;
    portalName: string;
    portalUrl: string;
  }
> = {
  GOOGLE_ADS: {
    title: "Google Ads (BYOK)",
    description: "Connect your personal or manager Google Ads account with your Developer Token and OAuth credentials.",
    idLabel: "Customer ID",
    idPlaceholder: "123-456-7890",
    idHelp: "10-digit Google Ads account ID found in the top right corner of ads.google.com.",
    portalName: "Google Ads Console",
    portalUrl: "https://ads.google.com"
  },
  GOOGLE_ANALYTICS: {
    title: "Google Analytics 4 (BYOK)",
    description: "Connect your GA4 Property using either your Google Cloud Service Account or OAuth credentials.",
    idLabel: "GA4 Property ID",
    idPlaceholder: "123456789",
    idHelp: "9-digit numeric Property ID from GA4 Admin > Property Settings.",
    portalName: "Google Analytics Admin",
    portalUrl: "https://analytics.google.com"
  },
  GOOGLE_SEARCH_CONSOLE: {
    title: "Google Search Console (BYOK)",
    description: "Monitor organic keywords, search clicks, impressions, and ranking positions directly.",
    idLabel: "Site URL / Domain Resource",
    idPlaceholder: "https://yourdomain.com or sc-domain:yourdomain.com",
    idHelp: "The exact URL prefix or Domain property registered in your Search Console.",
    portalName: "Search Console",
    portalUrl: "https://search.google.com/search-console"
  },
  FIREBASE_ADMOB: {
    title: "Firebase & AdMob (BYOK)",
    description: "Track mobile app monetization, impression RPM, ad fill rate, and publisher earnings.",
    idLabel: "AdMob Publisher ID",
    idPlaceholder: "pub-1234567890123456",
    idHelp: "Your 16-digit AdMob publisher ID starting with 'pub-'.",
    portalName: "AdMob Console",
    portalUrl: "https://admob.google.com"
  }
};

export function GoogleDynamicModal({
  open,
  platform,
  onClose,
  onSuccess,
  initialAccountId = "",
  initialAccountName = ""
}: GoogleDynamicModalProps) {
  const info = PLATFORM_INFO[platform];

  const [accountName, setAccountName] = useState(initialAccountName || "");
  const [accountId, setAccountId] = useState(initialAccountId || "");

  // Auth Mode for GA4, GSC, AdMob
  const [authMethod, setAuthMethod] = useState<"service_account" | "oauth">(
    platform === "GOOGLE_ADS" ? "oauth" : "service_account"
  );

  // Google Ads Credentials
  const [developerToken, setDeveloperToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [loginCustomerId, setLoginCustomerId] = useState("");

  // Service Account JSON
  const [serviceAccountJson, setServiceAccountJson] = useState("");

  // GA4 Optional Measurement Secret
  const [measurementSecret, setMeasurementSecret] = useState("");

  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useState(() => {
    if (initialAccountId) setAccountId(initialAccountId);
    if (initialAccountName) setAccountName(initialAccountName);
  });

  if (!open) return null;

  const buildPayload = (testOnly = false) => {
    const creds: Record<string, unknown> = {};

    if (platform === "GOOGLE_ADS") {
      creds.developerToken = developerToken.trim();
      creds.clientId = clientId.trim();
      creds.clientSecret = clientSecret.trim();
      creds.refreshToken = refreshToken.trim();
      if (loginCustomerId.trim()) creds.loginCustomerId = loginCustomerId.trim();
    } else {
      if (authMethod === "service_account") {
        creds.serviceAccountJson = serviceAccountJson.trim();
      } else {
        creds.clientId = clientId.trim();
        creds.clientSecret = clientSecret.trim();
        creds.refreshToken = refreshToken.trim();
      }
      if (platform === "GOOGLE_ANALYTICS" && measurementSecret.trim()) {
        creds.measurementSecret = measurementSecret.trim();
      }
    }

    return {
      platform,
      accountName: accountName.trim() || `${info.title} Account`,
      accountId: accountId.trim(),
      credentials: creds,
      testOnly
    };
  };

  const handleTestConnection = async () => {
    setErrorMsg(null);
    setTestSuccess(null);
    setTesting(true);

    try {
      const res = await fetch("/api/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(true))
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestSuccess(json.message || "Connection verified successfully with Google servers!");
      } else {
        setErrorMsg(json.error || "Connection test failed. Please verify your credentials.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error during connection test.");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setErrorMsg(null);
    setTestSuccess(null);
    setSaving(true);

    try {
      const res = await fetch("/api/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(false))
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onSuccess({ platform, message: json.message });
        onClose();
      } else {
        setErrorMsg(json.error || "Failed to save integration. Please check credentials.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Network error saving integration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <PlatformIcon platform={platform} className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{info.title}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Strict BYOK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{info.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BYOK Guarantee Banner */}
        <div className="px-6 py-3 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Zero server-side API keys used. Encrypted with AES-256-GCM.</span>
          </div>
          <a
            href={info.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            {info.portalName} <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* Friendly Account Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Account Label / Friendly Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Acme Marketing Production"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Account ID / Property ID / Site URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {info.idLabel} <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{info.idHelp}</span>
            </div>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder={info.idPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Authentication Method Selector (for GA4, GSC, AdMob) */}
          {platform !== "GOOGLE_ADS" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Authentication Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMethod("service_account")}
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    authMethod === "service_account"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <KeyRound className="w-4 h-4" /> Service Account JSON
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Recommended. Direct Google Cloud service account key.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMethod("oauth")}
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    authMethod === "oauth"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Layers className="w-4 h-4" /> OAuth 2.0 Credentials
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Client ID, Client Secret & Refresh Token.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Conditional Form: Service Account JSON */}
          {platform !== "GOOGLE_ADS" && authMethod === "service_account" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Service Account Key (JSON) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Paste raw JSON downloaded from Google Cloud</span>
              </div>
              <textarea
                rows={5}
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...",\n  "client_email": "...@...iam.gserviceaccount.com"\n}'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          )}

          {/* Conditional Form: Google Ads or OAuth Fields */}
          {(platform === "GOOGLE_ADS" || authMethod === "oauth") && (
            <div className="space-y-4">
              {platform === "GOOGLE_ADS" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Developer Token <span className="text-rose-500">*</span>
                    </label>
                    <a
                      href="https://developers.google.com/google-ads/api/docs/first-call/overview#developer_token"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      How to get Developer Token <HelpCircle className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={developerToken}
                      onChange={(e) => setDeveloperToken(e.target.value)}
                      placeholder="e.g. abcd1234efgh5678"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    OAuth Client ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    OAuth Client Secret <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  OAuth Refresh Token <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="1//04xxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              {platform === "GOOGLE_ADS" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Login Customer ID (Optional MCC Manager)
                    </label>
                    <span className="text-[11px] text-slate-400">Only needed if accessing client accounts via MCC</span>
                  </div>
                  <input
                    type="text"
                    value={loginCustomerId}
                    onChange={(e) => setLoginCustomerId(e.target.value)}
                    placeholder="e.g. 987-654-3210"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* GA4 Measurement API Secret */}
          {platform === "GOOGLE_ANALYTICS" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Measurement Protocol API Secret (Optional)
                </label>
                <span className="text-[11px] text-slate-400">From GA4 Admin &gt; Data Streams &gt; Measurement Secret</span>
              </div>
              <input
                type={showSecrets ? "text" : "password"}
                value={measurementSecret}
                onChange={(e) => setMeasurementSecret(e.target.value)}
                placeholder="e.g. aBcDeFgHiJkLmNoP"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          )}

          {/* Status Feedback Banners */}
          {testSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Live Connection Verified!</p>
                <p className="mt-0.5">{testSuccess}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Error</p>
                <p className="mt-0.5 font-mono">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Credentials encrypted locally before storage.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || !accountId}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Test Live Connection
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveAndConnect}
              disabled={testing || saving || !accountId}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Save & Connect
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
