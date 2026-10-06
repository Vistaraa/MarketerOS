"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn } from "@/lib/utils";
import { resetClientSession } from "@/lib/client-session";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password" | "verify-email";

export function RealAuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const queryEmail = searchParams.get("email") || "";
  const urlToken = searchParams.get("token") || "";

  const signup = mode === "signup";
  const login = mode === "login";
  const forgotPassword = mode === "forgot-password";
  const resetPassword = mode === "reset-password";
  const verifyEmail = mode === "verify-email";

  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  // Set when the password was right but the account also needs an authenticator (or recovery) code.
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const missingTokenMessage = "This reset link is invalid or incomplete. Please request a new one.";
  const [error, setError] = useState<string | null>(resetPassword && !urlToken ? missingTokenMessage : null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = login
    ? "Welcome back"
    : signup
      ? "Create your account"
      : forgotPassword
        ? "Forgot your password?"
        : resetPassword
          ? "Reset your password"
          : "Check your inbox";

  const subtitle = login
    ? "Enter your credentials to access your workspace."
    : signup
      ? "Start your workspace. Enter your credentials below."
      : forgotPassword
        ? "Enter your email address and we'll send you instructions to reset your password."
        : resetPassword
          ? "Create a new secure password for your account."
          : urlToken
            ? "Confirming your email address..."
            : "We sent a verification link to your email address. Click it to confirm your account.";

  function finishSignIn(next?: string) {
    resetClientSession();
    router.push(returnTo || next || "/");
    router.refresh();
  }

  async function submit(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side validations
    if ((signup || resetPassword) && password !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
      return;
    }

    if ((signup || resetPassword) && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (resetPassword && !urlToken) {
      setError(missingTokenMessage);
      return;
    }

    setBusy(true);

    try {
      if (forgotPassword) {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const payload = (await response.json()) as ApiResponse<{ message?: string }>;
        if (!response.ok) {
          throw new Error(payload.error?.message || "Failed to process password reset request.");
        }
        setSuccessMessage(
          payload.data?.message ||
          `If an account exists for ${email}, password reset instructions have been sent.`
        );
        return;
      }

      if (resetPassword) {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: urlToken, password }),
        });
        const payload = (await response.json()) as ApiResponse<{ message?: string }>;
        if (!response.ok) {
          throw new Error(payload.error?.message || "Failed to reset password.");
        }
        setSuccessMessage(payload.data?.message || "Password reset successfully!");
        setTimeout(() => {
          router.push(`/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
        }, 2000);
        return;
      }

      const names = fullName.trim().split(/\s+/);
      const normalizedEmail = email.trim().toLowerCase();
      const body = signup
        ? {
          email: normalizedEmail,
          password,
          firstName: names[0] || "User",
          lastName: names.slice(1).join(" ") || names[0] || "Admin",
          workspaceName: workspaceName || (fullName ? `${fullName}'s Workspace` : "My Workspace"),
          acceptTerms,
        }
        : { email: normalizedEmail, password };

      const endpoint = `/api/auth/${signup ? "signup" : "login"}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<{ next?: string; twoFactorRequired?: boolean; challenge?: string }>;
      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to complete authentication request.");
      }

      if (!response.ok) {
        throw new Error(payload?.error?.message || `Server error (${response.status}): Database tables may not be created yet or connection failed.`);
      }

      if (payload?.data?.twoFactorRequired && payload.data.challenge) {
        setTwoFactorChallenge(payload.data.challenge);
        return;
      }
      finishSignIn(payload?.data?.next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-zinc-950">
      {/* Brand Sidebar (Midday Dark/Zinc Style) */}
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
              The operating system for modern marketing teams.
            </h2>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Connect advertising channels, track cross-platform ROI, and launch high-converting multi-channel campaigns.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "Unified Google & Meta Analytics",
                "Real-Time Multi-Channel Campaign Launcher",
                "Direct API Sync & Lead Attribution",
                "Automated Performance Reporting",
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
          Encrypted token vault · Workspace isolation
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-12">
        <div className="mx-auto w-full max-w-md">
          {/* Header Switcher */}
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 font-bold text-white text-[10px] dark:bg-zinc-100 dark:text-zinc-900">
                M
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">MarketerOS</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {signup ? (
                <>
                  <span>Already have an account?</span>
                  <button
                    onClick={() =>
                      router.push(
                        `/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                      )
                    }
                    className="font-semibold text-zinc-900 underline dark:text-zinc-100"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  <span>Don&apos;t have an account?</span>
                  <button
                    onClick={() =>
                      router.push(
                        `/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                      )
                    }
                    className="font-semibold text-zinc-900 underline dark:text-zinc-100"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-7 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>

            {verifyEmail ? <VerifyEmailPanel token={urlToken} /> : <>
            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-2">
                    <p>{successMessage}</p>
                    {forgotPassword && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                            )
                          }
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {twoFactorChallenge && (
              <TwoFactorStep
                challenge={twoFactorChallenge}
                onDone={finishSignIn}
                onRestart={() => { setTwoFactorChallenge(null); setPassword(""); setError(null); }}
              />
            )}
            <form onSubmit={submit} className={twoFactorChallenge ? "hidden" : "mt-6 space-y-4 text-xs"}>
              {signup && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="input-clean mt-1"
                  />
                </div>
              )}

              {signup && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Workspace / Agency Name</label>
                  <input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Growth Marketing Labs"
                    className="input-clean mt-1"
                  />
                </div>
              )}

              {!resetPassword && (
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-clean mt-1 font-mono"
                />
              </div>
              )}

              {!forgotPassword && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      {resetPassword ? "New Password" : "Password"}
                    </label>

                    {/* Forgot Password Link on Sign In page */}
                    {login && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/auth/forgot-password${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
                            }`
                          )
                        }
                        className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline transition"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-clean pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-hidden"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation Password input for Sign Up & Reset Password */}
              {(signup || resetPassword) && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-clean pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-hidden"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {signup && (
                <label className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded-sm border-zinc-300"
                  />
                  <span>
                    I agree to the{" "}
                    <a href="/legal/terms" target="_blank" rel="noopener" className="font-semibold underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="/legal/privacy" target="_blank" rel="noopener" className="font-semibold underline">Privacy Policy</a>.
                  </span>
                </label>
              )}

              <div className="pt-2">
                <button type="submit" disabled={busy || (signup && !acceptTerms)} className="btn-primary w-full py-2.5">
                  {busy
                    ? "Processing..."
                    : signup
                      ? "Create Account"
                      : forgotPassword
                        ? "Send Reset Instructions"
                        : resetPassword
                          ? "Reset Password"
                          : "Sign In"}
                </button>
              </div>

              {(forgotPassword || resetPassword) && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                      )
                    }
                    className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline transition"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </form>
            </>}
            <p className="mt-6 text-center text-[11px] text-zinc-400">
              <a href="/legal/terms" className="hover:underline">Terms</a>
              {" · "}
              <a href="/legal/privacy" className="hover:underline">Privacy</a>
              {" · "}
              <a href="/legal/cookies" className="hover:underline">Cookies</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailPanel({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "verifying" | "verified" | "failed">(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so guard against React running this effect twice.
    if (!token || started.current) return;
    started.current = true;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<{ message?: string }>;
        if (!response.ok) throw new Error(payload.error?.message || "Verification failed.");
        setState("verified");
        setMessage(payload.data?.message || "Your email address has been verified.");
      })
      .catch((cause) => {
        setState("failed");
        setMessage(cause instanceof Error ? cause.message : "Verification failed.");
      });
  }, [token]);

  async function resend() {
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      const payload = (await response.json()) as ApiResponse<{ message?: string }>;
      if (response.status === 401) {
        router.push(`/auth/login?returnTo=${encodeURIComponent("/auth/verify-email")}`);
        return;
      }
      if (!response.ok) throw new Error(payload.error?.message || "Could not resend the verification email.");
      setState("idle");
      setMessage(payload.data?.message || "We've sent you a new verification link.");
    } catch (cause) {
      setState("failed");
      setMessage(cause instanceof Error ? cause.message : "Could not resend the verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 text-xs">
      {state === "verifying" && <p className="text-zinc-500 dark:text-zinc-400">Verifying your email address...</p>}
      {message && (
        <div
          className={cn(
            "rounded-lg border p-3",
            state === "failed"
              ? "border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
              : "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          )}
        >
          {message}
        </div>
      )}
      {state === "verified" ? (
        <button type="button" onClick={() => router.push("/overview")} className="btn-primary w-full py-2.5">
          Continue to MarketerOS
        </button>
      ) : state !== "verifying" && (
        <button type="button" onClick={resend} disabled={resending} className="btn-secondary w-full py-2.5">
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      )}
    </div>
  );
}

/** Second sign-in step for accounts with two-factor authentication: a 6-digit app code or a recovery code. */
function TwoFactorStep({ challenge, onDone, onRestart }: { challenge: string; onDone: (next?: string) => void; onRestart: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login/2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challenge, code }) });
      const payload = await res.json().catch(() => null);
      if (res.status === 401 && payload?.error?.code === "CHALLENGE_EXPIRED") return onRestart();
      if (!res.ok) throw new Error(payload?.error?.message || "That code isn't valid.");
      onDone(payload?.data?.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code isn't valid.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={verify} className="mt-6 space-y-4 text-xs">
      <div>
        <label htmlFor="two-factor-code" className="block font-medium text-zinc-700 dark:text-zinc-300">Authentication code</label>
        <p className="mt-1 text-zinc-500">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
        <input
          id="two-factor-code"
          autoFocus
          required
          autoComplete="one-time-code"
          inputMode="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm tracking-widest dark:border-zinc-800 dark:bg-zinc-900"
          placeholder="123456"
        />
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      <button type="submit" disabled={busy || code.trim().length < 6} className="btn-primary w-full py-2.5">{busy ? "Verifying..." : "Verify and sign in"}</button>
      <button type="button" onClick={onRestart} className="w-full text-center text-xs font-semibold text-zinc-600 underline dark:text-zinc-400">Use a different account</button>
    </form>
  );
}
