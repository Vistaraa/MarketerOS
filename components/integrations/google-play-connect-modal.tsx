"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, CheckCircle2, ShieldAlert, Sparkles, KeyRound, FileJson, Smartphone, Building2 } from "lucide-react";

interface GooglePlayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    accountName?: string;
    packageName?: string;
    clientId?: string;
  };
}

export function GooglePlayConnectModal({ isOpen, onClose, onSuccess, initialData }: GooglePlayConnectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [accountLabel, setAccountLabel] = useState(initialData?.accountName || "Main Android App");
  const [packageName, setPackageName] = useState(initialData?.packageName || "com.marketeros.app");
  const [authMethod, setAuthMethod] = useState<"service_account" | "oauth">("service_account");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [targetClientId, setTargetClientId] = useState<string>(initialData?.clientId || "");
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    async function loadClients() {
      try {
        const res = await fetch("/api/v1/clients");
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.items || data.clients || [];
          setClients(items);
        }
      } catch {
        // optional
      }
    }
    loadClients();
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch("/api/v1/integrations/google-play/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountLabel,
          packageName,
          authMethod,
          serviceAccountJson,
          targetClientId: targetClientId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, message: data.message || data.error || "Connection test failed." });
      } else {
        setTestResult({ success: true, message: data.message || "Live Connection Verified!" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Failed to reach backend API." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/integrations/google-play/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountLabel,
          packageName,
          authMethod,
          serviceAccountJson,
          targetClientId: targetClientId || undefined,
          clientId: targetClientId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect Google Play Console.");
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 dark:bg-black/85 p-3 sm:p-6 backdrop-blur-2xl backdrop-saturate-150 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">Google Play Console (BYOK)</h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Connect Google Play Developer API to access live KPIs & releases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold p-1 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-zinc-900 dark:text-zinc-100" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Account Label / App Nickname
            </label>
            <input
              type="text"
              required
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="e.g. My Production App"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Package Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. com.company.appname"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
            />
          </div>

          {/* Agency Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Assign to Agency Client (Optional)</span>
            </label>
            <select
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none cursor-pointer"
            >
              <option value="">Workspace Default / All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Client: {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Authentication Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod("service_account")}
                className={`p-2.5 sm:p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authMethod === "service_account"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <FileJson className="w-4 h-4 shrink-0" />
                <span>Service Account JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod("oauth")}
                className={`p-2.5 sm:p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authMethod === "oauth"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>OAuth2 Refresh Token</span>
              </button>
            </div>
          </div>

          {authMethod === "service_account" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Service Account Key (JSON)
              </label>
              <textarea
                rows={5}
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder='Paste your downloaded Google Cloud Service Account JSON key content here...'
                className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Testing..." : "Test Live Connection"}</span>
            </button>

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

