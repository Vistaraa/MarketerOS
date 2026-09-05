"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Key,
  Layers,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { SiGoogleads } from "react-icons/si";
import { cn } from "@/lib/utils";

interface GoogleAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  isManager: boolean;
  resourceName: string;
}

interface GoogleAdsConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (connectedData: any) => void;
  currentAccountId?: string | null;
  currentAccountName?: string | null;
}

export function GoogleAdsConnectModal({
  open,
  onClose,
  onSuccess,
  currentAccountId,
  currentAccountName
}: GoogleAdsConnectModalProps) {
  const [step, setStep] = useState<"oauth" | "select_account" | "success">("oauth");
  const [accountName, setAccountName] = useState(currentAccountName || "Acme Primary Google Ads");
  const [accessibleAccounts, setAccessibleAccounts] = useState<GoogleAccount[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(currentAccountId || "");
  const [loginCustomerId, setLoginCustomerId] = useState<string>("");
  const [showMccInput, setShowMccInput] = useState(false);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("oauth") === "success" && params.get("provider") === "google_ads") {
        fetchAccessibleAccounts();
      }
    }
  }, [open]);

  // Fetch accounts list after OAuth authorization
  const fetchAccessibleAccounts = async () => {
    setLoadingAccounts(true);
    setError(null);
    try {
      const res = await fetch("/api/google-ads/accounts");
      const json = await res.json();
      if (res.ok && json.data) {
        setAccessibleAccounts(json.data);
        if (json.data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(json.data[0].customerId);
        }
        setStep("select_account");
      } else {
        setError(json.error || "Failed to load accessible Google Ads accounts.");
      }
    } catch (err) {
      setError("Network error fetching accounts. Please try again.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Trigger OAuth Consent
  const handleInitiateOAuth = async () => {
    setError(null);
    try {
      const res = await fetch("/api/google-ads/oauth-url");
      const json = await res.json();
      if (res.ok && json.url) {
        if (json.configured) {
          // Redirect to real Google OAuth Consent screen
          window.location.href = json.url;
        } else {
          // Sandbox / demo mode
          await fetchAccessibleAccounts();
        }
      } else {
        setError(json.error || "Failed to get Google OAuth URL.");
      }
    } catch (err) {
      setError("Could not initialize Google OAuth.");
    }
  };

  // Save connection with selected Customer ID
  const handleSaveConnection = async () => {
    if (!selectedCustomerId) {
      setError("Please select a Google Ads Customer ID.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/google-ads/save-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: accountName.trim() || `Google Ads (${selectedCustomerId})`,
          customerId: selectedCustomerId,
          loginCustomerId: showMccInput ? loginCustomerId.trim() : null
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStep("success");
        setTimeout(() => {
          onSuccess(json.data);
          onClose();
        }, 1200);
      } else {
        setError(json.error || "Failed to save Google Ads connection.");
      }
    } catch (err) {
      setError("Network error while saving connection.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-[#F4B400] dark:bg-amber-950/40">
              <SiGoogleads size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Connect Google Ads
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Sync Search, Display, YouTube, and Performance Max ad accounts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: OAUTH SIGN-IN */}
        {step === "oauth" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Account / Display Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Acme Corp (Primary Ads)"
                className="input-clean mt-1.5"
              />
              <span className="mt-1 block text-[10px] text-zinc-400">
                A friendly label to identify this ad account inside MarketerOS.
              </span>
            </div>

            {/* OAuth Explainer Note */}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero-API-Key OAuth Flow</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                You never need to manually enter API keys or developer tokens. Clicking below will open Google's official consent screen where you grant secure read access.
              </p>
            </div>

            {/* Sign in with Google Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleInitiateOAuth}
                disabled={loadingAccounts}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-300 bg-white py-2.5 px-4 text-xs font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.99] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {loadingAccounts ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-zinc-500" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google & Select Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT CUSTOMER ID DROPDOWN */}
        {step === "select_account" && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Google Authentication Verified! Pick an account below:</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Google Ads Account (Customer ID)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="input-clean mt-1.5"
              >
                {accessibleAccounts.map((acc) => (
                  <option key={acc.customerId} value={acc.customerId}>
                    {acc.descriptiveName} ({acc.customerId}) · {acc.currencyCode}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] text-zinc-400">
                Fetched directly from Google Ads <code className="text-zinc-600 dark:text-zinc-300">listAccessibleCustomers</code> API.
              </span>
            </div>

            {/* Optional Manager (MCC) ID */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowMccInput(!showMccInput)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <span>{showMccInput ? "− Hide" : "+ Optional:"} Manager (MCC) Login Customer ID</span>
              </button>

              {showMccInput && (
                <div className="mt-2.5 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={loginCustomerId}
                    onChange={(e) => setLoginCustomerId(e.target.value)}
                    placeholder="e.g. 991-820-3341 (MCC Customer ID)"
                    className="input-clean"
                  />
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    Only required if you access this ad account through a Manager (MCC) account. Leave empty if connecting directly.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep("oauth")}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving Connection...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Save & Sync Ad Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS ANIMATION */}
        {step === "success" && (
          <div className="mt-6 py-6 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 animate-in zoom-in-50">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Google Ads Connected Successfully!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Importing live campaign performance metrics and initializing sync...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
