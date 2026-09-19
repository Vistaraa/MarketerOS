"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Lock, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import type { ApiResponse } from "@/lib/api-contracts";
import { safeFetchJson } from "@/lib/utils";

interface InviteInfo {
  valid: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  workspaceName?: string;
  role?: string;
}

export function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Invitation token is missing from the URL. Please click the link directly from your invitation email.");
      setLoading(false);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/auth/set-password?token=${encodeURIComponent(token as string)}`);
        const payload = await safeFetchJson<ApiResponse<InviteInfo>>(res);

        if (!res.ok || !payload.data?.valid) {
          throw new Error(payload.error?.message || "Invalid or expired invitation link.");
        }

        setInviteInfo(payload.data);
      } catch (err: any) {
        setLoadError(err?.message || "Unable to verify this invitation link.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const hasMinLength = password.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasNumberOrSpecial && passwordsMatch;

  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const payload = await safeFetchJson<ApiResponse<{ success: boolean; next?: string }>>(res);
      if (!res.ok) {
        throw new Error(payload.error?.message || "Failed to set password. Please try again.");
      }

      const target = payload.data?.next || "/overview";
      setRedirectUrl(target);
      setSuccess(true);
      setTimeout(() => {
        router.push(target);
      }, 700);
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-zinc-950">
      {/* Brand Sidebar */}
      <div className="hidden w-[40%] overflow-hidden bg-zinc-950 p-10 lg:flex lg:flex-col lg:justify-between text-zinc-100 border-r border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white font-black text-xs text-zinc-950">
              M
            </div>
            <span className="text-sm font-bold tracking-tight text-white">MarketerOS</span>
          </div>

          <div className="mt-24 max-w-sm">
            <h2 className="text-2xl font-bold leading-snug tracking-tight text-white">
              Welcome to the team.
            </h2>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Set up your secure password to activate your account and start collaborating with your team on marketing campaigns, analytics, and ROI tracking.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "End-to-end encrypted workspace access",
                "Unified ad management & analytics",
                "Granular role-based security",
                "Real-time team collaboration"
              ].map((item) => (
                <div className="flex items-center gap-2.5" key={item}>
                  <Check size={13} className="text-zinc-300" />
                  <span className="text-xs font-medium text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono">
          Security policy: SHA-256 HMAC tokens · AES-256 vault
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 lg:hidden mb-8">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 font-bold text-white text-[10px] dark:bg-zinc-100 dark:text-zinc-900">
              M
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">MarketerOS</span>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-7 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:t-zinc-100" />
                <p className="mt-4 text-xs text-zinc-500">Verifying invitation link…</p>
              </div>
            ) : loadError ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={24} />
                  <h1 className="text-lg font-bold">Invitation Invalid or Expired</h1>
                </div>
                <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  {loadError}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="btn-secondary w-full py-2 text-xs"
                  >
                    Go to Sign In
                  </button>
                </div>
              </div>
            ) : success ? (
              <div className="space-y-5 text-center py-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 animate-bounce">
                  <Check size={24} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Account Activated!
                  </h1>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Your password has been saved. Opening your <span className="font-semibold text-zinc-700 dark:text-zinc-300">{inviteInfo?.role?.replace(/_/g, " ") || "Role"}</span> workspace interface now…
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => router.push(redirectUrl || "/overview")}
                    className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
                  >
                    Entering Workspace <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 mb-3">
                  <span>Workspace:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {inviteInfo?.workspaceName || "MarketerOS"}
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                    {inviteInfo?.role || "MANAGER"}
                  </span>
                </div>

                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Set Your Password
                </h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Welcome aboard, <strong className="text-zinc-700 dark:text-zinc-300">{inviteInfo?.firstName || "Team Member"}</strong>! Choose a secure password for <span className="font-mono text-zinc-700 dark:text-zinc-300">{inviteInfo?.email}</span>.
                </p>

                {submitError && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                      Work Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={inviteInfo?.email || ""}
                      className="input-clean mt-1 font-mono opacity-75 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        New Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="input-clean mt-1 font-mono"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="input-clean mt-1 font-mono"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="space-y-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3 text-[11px] dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <div className={`grid h-4 w-4 place-items-center rounded-full ${hasMinLength ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500"}`}>
                        <Check size={10} />
                      </div>
                      <span className={hasMinLength ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-zinc-500"}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`grid h-4 w-4 place-items-center rounded-full ${hasNumberOrSpecial ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500"}`}>
                        <Check size={10} />
                      </div>
                      <span className={hasNumberOrSpecial ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-zinc-500"}>
                        Contains a number or symbol
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`grid h-4 w-4 place-items-center rounded-full ${passwordsMatch ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500"}`}>
                        <Check size={10} />
                      </div>
                      <span className={passwordsMatch ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-zinc-500"}>
                        Passwords match
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!isFormValid || submitting}
                      className="btn-primary w-full py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Setting Password…" : "Set Password & Activate Account"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
