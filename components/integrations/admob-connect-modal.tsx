"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  Smartphone,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdMobAccount {
  publisherId: string;
  descriptiveName: string;
  currencyCode: string;
  reportingTimeZone: string;
  resourceName: string;
}

interface AdMobConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingAccountId?: string;
  existingAccountName?: string;
}

export function AdMobConnectModal({
  isOpen,
  onClose,
  onSuccess,
  existingAccountId,
  existingAccountName
}: AdMobConnectModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<AdMobAccount[]>([]);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>(existingAccountId || "");
  const [customPublisherId, setCustomPublisherId] = useState<string>(existingAccountId || "");
  const [accountName, setAccountName] = useState<string>(existingAccountName || "AdMob Mobile Apps Network");
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Fetch accounts on modal open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchAccounts();
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    setFetchingAccounts(true);
    try {
      const res = await fetch("/api/admob/accounts");
      const json = await res.json();
      if (res.ok && json.data) {
        setAccounts(json.data);
        if (json.data.length > 0 && !selectedPublisherId) {
          setSelectedPublisherId(json.data[0].publisherId);
          setCustomPublisherId(json.data[0].publisherId);
          if (json.data[0].descriptiveName) {
            setAccountName(json.data[0].descriptiveName);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load AdMob accounts:", e);
    } finally {
      setFetchingAccounts(false);
    }
  };

  const handleStartOAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admob/oauth-url?returnTo=${encodeURIComponent(window.location.pathname)}`);
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to generate Google AdMob OAuth URL");
      }

      // Redirect user to Google OAuth consent screen
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Google OAuth.");
      setLoading(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPublisherId = isManualEntry ? customPublisherId.trim() : selectedPublisherId.trim();

    if (!finalPublisherId) {
      setError("Please select or enter your AdMob Publisher ID (pub-XXXXXXXXXXXXXXXX).");
      return;
    }

    if (!finalPublisherId.startsWith("pub-") && !finalPublisherId.startsWith("accounts/pub-")) {
      setError("Publisher ID must follow the standard format (e.g. pub-1234567890123456).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admob/save-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId: finalPublisherId.replace("accounts/", ""),
          accountName: accountName.trim() || `AdMob (${finalPublisherId})`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save AdMob connection.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <Smartphone className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Connect Google AdMob
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Secure OAuth 2.0 connection for mobile app ad revenue & metrics
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

          {/* Stepper Indicator */}
          <div className="mt-5 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 font-semibold transition",
                step === 1
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                1
              </span>
              <span>Sign in with Google</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 font-semibold transition",
                step === 2
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                2
              </span>
              <span>Select Account</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Google OAuth Sign-in */}
          {step === 1 && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Zero-Manual-Key Authentication
                </h4>
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                  MarketerOS connects directly to Google AdMob via secure per-user OAuth 2.0.
                  No API keys or service account uploads required.
                </p>

                <div className="mt-3 flex flex-col gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Real-time AdMob Earnings, Impressions & eCPM reporting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Ad unit and mobile app performance breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Encrypted token storage with automatic AES-256 refresh</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOAuth}
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.99] disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {loading ? (
                  <RefreshCw size={14} className="animate-spin text-zinc-500" />
                ) : (
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
                )}
                <span>Sign in with Google & Authorize AdMob</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 underline dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Already authenticated? Select Publisher Account &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Publisher Account */}
          {step === 2 && (
            <form onSubmit={handleSaveConnection} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Account Display Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Acme Mobile Gaming Apps"
                  className="input-clean mt-1 text-xs"
                />
              </div>

              {!isManualEntry ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      AdMob Publisher Account (Auto-Discovered)
                    </label>
                    <button
                      type="button"
                      onClick={fetchAccounts}
                      disabled={fetchingAccounts}
                      className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      <RefreshCw size={11} className={cn(fetchingAccounts && "animate-spin")} />
                      Refresh
                    </button>
                  </div>

                  <div className="mt-1.5 space-y-2 max-h-48 overflow-y-auto">
                    {accounts.map((acc) => (
                      <div
                        key={acc.publisherId}
                        onClick={() => {
                          setSelectedPublisherId(acc.publisherId);
                          setCustomPublisherId(acc.publisherId);
                          if (acc.descriptiveName) setAccountName(acc.descriptiveName);
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg border p-3 text-xs transition-all",
                          selectedPublisherId === acc.publisherId
                            ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-900"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {acc.descriptiveName}
                          </span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {acc.currencyCode}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{acc.publisherId}</span>
                          <span>{acc.reportingTimeZone}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(true)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-700 underline dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      Enter custom Publisher ID manually
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      AdMob Publisher ID
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(false)}
                      className="text-[11px] text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      Switch to account list
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customPublisherId}
                    onChange={(e) => setCustomPublisherId(e.target.value)}
                    placeholder="pub-8492041839401823"
                    className="input-clean mt-1 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Format: <code className="font-mono text-zinc-700 dark:text-zinc-300">pub-XXXXXXXXXXXXXXXX</code> (16 digits).
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  &larr; Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
