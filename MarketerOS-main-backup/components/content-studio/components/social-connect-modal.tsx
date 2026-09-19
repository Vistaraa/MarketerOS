"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  Lock,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";
import { PlatformIcon } from "./common-ui";
import { Platform } from "../types/content-studio-types";

interface PlatformConfig {
  id: Platform | "youtube";
  name: string;
  badge: string;
  accountLabel: string;
  accountPlaceholder: string;
  accountHelp: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelp: string;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  guideUrl?: string;
  docsHelp: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    id: "instagram",
    name: "Instagram Professional",
    badge: "Meta Graph API",
    accountLabel: "Instagram Business Account ID",
    accountPlaceholder: "e.g. 17841400000000000",
    accountHelp: "Found in Meta Business Suite or Graph API Explorer (me/accounts → instagram_business_account.id).",
    tokenLabel: "System User or Page Access Token",
    tokenPlaceholder: "EAA...",
    tokenHelp: "Token requires instagram_basic, instagram_content_publish, and pages_show_list permissions.",
    usernameLabel: "Instagram Handle",
    usernamePlaceholder: "@yourbrand",
    docsHelp: "Connect your Instagram Professional or Creator account to auto-publish reels, carousels, and stories."
  },
  facebook: {
    id: "facebook",
    name: "Facebook Page",
    badge: "Meta Pages API",
    accountLabel: "Facebook Page ID",
    accountPlaceholder: "e.g. 102938475610293",
    accountHelp: "Numeric Facebook Page ID located in your Page's 'About' section or Page Settings.",
    tokenLabel: "Page Access Token",
    tokenPlaceholder: "EAA...",
    tokenHelp: "Generated in Meta Business Manager with pages_manage_posts and pages_read_engagement scopes.",
    usernameLabel: "Page Display Name",
    usernamePlaceholder: "Brand Official Page",
    docsHelp: "Enables direct feed posting, video scheduling, and engagement analytics for your Facebook Page."
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn Company / Profile",
    badge: "LinkedIn v2 API",
    accountLabel: "LinkedIn Organization ID / Member URN",
    accountPlaceholder: "e.g. 94827103",
    accountHelp: "Numeric organization ID from your LinkedIn Company Page admin URL or member URN.",
    tokenLabel: "OAuth 2.0 Access Token",
    tokenPlaceholder: "AQV...",
    tokenHelp: "Token with w_member_social, w_organization_social, and r_liteprofile permissions.",
    usernameLabel: "Company / Profile Name",
    usernamePlaceholder: "Brand Inc.",
    docsHelp: "Post thought leadership articles, company news, and B2B carousels directly to LinkedIn."
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok for Business",
    badge: "TikTok Open API",
    accountLabel: "TikTok Advertiser ID / Account ID",
    accountPlaceholder: "e.g. 7019283746192837461",
    accountHelp: "19-digit Advertiser ID from your TikTok for Business Ads Manager profile.",
    tokenLabel: "Long-Term Access Token",
    tokenPlaceholder: "act.XXXXXXXXXXXX...",
    tokenHelp: "Developer token generated in TikTok for Business Developer portal.",
    usernameLabel: "TikTok Username / Handle",
    usernamePlaceholder: "@brand_tiktok",
    docsHelp: "Schedule short-form video content and monitor organic video metrics."
  },
  twitter: {
    id: "twitter",
    name: "X (Twitter)",
    badge: "X API v2",
    accountLabel: "X Handle / User ID",
    accountPlaceholder: "e.g. @BrandOfficial",
    accountHelp: "Your X / Twitter handle or numeric account ID from developer portal.",
    tokenLabel: "API Key / Bearer Token",
    tokenPlaceholder: "AAAAAAAAAAAAAAAAAAAAA...",
    tokenHelp: "Bearer Token or User OAuth 2.0 token with Read and Write permissions.",
    usernameLabel: "Display Name",
    usernamePlaceholder: "Brand Official",
    docsHelp: "Publish tweets, threads, and track impression analytics on X."
  }
};

export function SocialConnectModal({
  open,
  onClose,
  onSuccess,
  defaultPlatform = "instagram"
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPlatform?: Platform | string;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    PLATFORM_CONFIGS[defaultPlatform] ? defaultPlatform : "instagram"
  );
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountName, setAccountName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const currentConfig = PLATFORM_CONFIGS[selectedPlatform] || PLATFORM_CONFIGS.instagram;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform.toUpperCase(),
          accountId: accountId.trim(),
          apiKey: apiKey.trim(),
          accountName: accountName.trim() || undefined,
          username: username.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to connect social account.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setAccountId("");
        setApiKey("");
        setAccountName("");
        setUsername("");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform={selectedPlatform as any} className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Connect Social Media Channel
              </h3>
              <p className="text-[11px] text-zinc-400">
                Authorize publishing permissions with secure API credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          {Object.entries(PLATFORM_CONFIGS).map(([key, cfg]) => {
            const isSelected = selectedPlatform === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedPlatform(key);
                  setError(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  isSelected
                    ? "bg-white text-zinc-900 shadow-2xs font-bold dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <PlatformIcon platform={key as any} className="w-3.5 h-3.5" />
                <span>{cfg.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold">Connection Validation Failed</div>
              <div className="text-[11px] leading-relaxed">{error}</div>
            </div>
          </div>
        )}

        {success ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 animate-bounce" />
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {currentConfig.name} Connected!
            </h4>
            <p className="text-xs text-zinc-500">
              Your account has been securely verified and added to Content Studio.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Platform Information Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <Info size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{currentConfig.name}</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    {currentConfig.badge}
                  </span>
                </div>
                <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80">
                  {currentConfig.docsHelp}
                </p>
              </div>
            </div>

            {/* Account ID / Page ID */}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {currentConfig.accountLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={currentConfig.accountPlaceholder}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900 font-mono dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">
                {currentConfig.accountHelp}
              </span>
            </div>

            {/* Access Token / API Key */}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {currentConfig.tokenLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentConfig.tokenPlaceholder}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900 font-mono dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">
                {currentConfig.tokenHelp}
              </span>
            </div>

            {/* Optional Handle / Display Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Account Display Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Acme Primary"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {currentConfig.usernameLabel || "Username / Handle"}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={currentConfig.usernamePlaceholder || "@brand"}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50 flex items-center gap-2 text-[10px] text-zinc-500">
              <Lock size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Tokens are encrypted with AES-256 before storage and never exposed in client payloads.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-1.5 text-xs flex items-center gap-1.5"
              >
                {loading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>{loading ? "Verifying Credentials..." : "Verify & Connect"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
