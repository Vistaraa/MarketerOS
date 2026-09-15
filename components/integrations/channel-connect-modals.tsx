"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  Lock,
  ShieldCheck,
  Layers,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { PlatformIcon } from "@/components/ui/marketeros-icons";

// ==================== 1. META ADS CONNECT MODAL ====================
export function MetaAdsConnectModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accountName, setAccountName] = useState("Acme Corp · Meta Ads");
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [pixelId, setPixelId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta-ads/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountId, accessToken, pixelId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to connect Meta Ads.");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform="Meta Ads" size={20} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect Meta Ads (Facebook & IG)</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Meta Ads Connected Successfully!</h4>
            <p className="text-xs text-zinc-500">Syncing campaigns and pixel analytics...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Account Display Name</label>
              <input
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Acme Primary Meta Ads"
                className="input-clean font-normal mt-1"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Ad Account ID</label>
              <input
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="act_123456789012345"
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">Format: act_XXXXXXXXXXXXXXX from Meta Ads Manager.</span>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">System User Access Token</label>
              <input
                required
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA..."
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">System User token generated in Meta Business Manager with ads_management scope.</span>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Meta Pixel ID (Optional)</label>
              <input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="123456789012345"
                className="input-clean font-mono mt-1"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{loading ? "Connecting..." : "Connect Meta Ads"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== 2. LINKEDIN ADS CONNECT MODAL ====================
export function LinkedinConnectModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accountName, setAccountName] = useState("Acme Corp · LinkedIn Ads");
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountId, accessToken })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to connect LinkedIn Ads.");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform="LinkedIn" size={20} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect LinkedIn Ads</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">LinkedIn Ads Connected!</h4>
            <p className="text-xs text-zinc-500">Syncing B2B lead gen metrics...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Account Display Name</label>
              <input
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Enterprise B2B Ads"
                className="input-clean font-normal mt-1"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">LinkedIn Ad Account ID</label>
              <input
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="508291049"
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">9-digit numeric Account ID from LinkedIn Campaign Manager.</span>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">OAuth Access Token</label>
              <input
                required
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste Access Token"
                className="input-clean font-mono mt-1"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{loading ? "Connecting..." : "Connect LinkedIn Ads"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== 3. TIKTOK ADS CONNECT MODAL ====================
export function TiktokConnectModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accountName, setAccountName] = useState("Acme Corp · TikTok Spark Ads");
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tiktok/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountId, accessToken })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to connect TikTok Ads.");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform="TikTok" size={20} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect TikTok Ads Manager</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">TikTok Ads Connected!</h4>
            <p className="text-xs text-zinc-500">Syncing video views and Spark Ads campaigns...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Account Display Name</label>
              <input
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. TikTok Spark Ads"
                className="input-clean font-normal mt-1"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">TikTok Advertiser ID</label>
              <input
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="7019283746192837461"
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">19-digit numeric Advertiser ID from TikTok Ads Manager profile.</span>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Long-Term Access Token</label>
              <input
                required
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste Access Token"
                className="input-clean font-mono mt-1"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{loading ? "Connecting..." : "Connect TikTok Ads"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== 4. SHOPIFY STORE CONNECT MODAL ====================
export function ShopifyConnectModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accountName, setAccountName] = useState("Acme Store · Shopify");
  const [accountId, setAccountId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountId, apiKey })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to connect Shopify store.");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <PlatformIcon platform="Shopify" size={20} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Connect Shopify Store</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Shopify Store Connected!</h4>
            <p className="text-xs text-zinc-500">Syncing revenue, order volume, and AOV analytics...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Store Name</label>
              <input
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Acme E-commerce Store"
                className="input-clean font-normal mt-1"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Shopify Store Domain</label>
              <input
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="acme-brand.myshopify.com"
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">Your unique .myshopify.com store domain.</span>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">Admin API Access Token</label>
              <input
                required
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="shpat_..."
                className="input-clean font-mono mt-1"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">Admin API access token generated in Shopify Admin &gt; Develop apps.</span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{loading ? "Connecting..." : "Connect Shopify Store"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
