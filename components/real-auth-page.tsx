"use client";

import { useState } from "react";
import { ArrowRight, Check, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ApiResponse } from "@/lib/api-contracts";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password" | "verify-email";

export function RealAuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const signup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title =
    mode === "login"
      ? "Welcome back"
      : mode === "signup"
      ? "Create your account"
      : mode === "verify-email"
      ? "Check your inbox"
      : "Reset your password";

  async function submit(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const names = fullName.trim().split(/\s+/);
      const body = signup
        ? {
            email,
            password,
            firstName: names[0] || "User",
            lastName: names.slice(1).join(" ") || names[0] || "Admin",
            workspaceName: workspaceName || (fullName ? `${fullName}'s Workspace` : "My Workspace"),
          }
        : { email, password };

      const response = await fetch(`/api/auth/${signup ? "signup" : mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<{ next?: string }>;
      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to complete this request.");
      }

      const target = returnTo || payload.data?.next || "/";
      router.push(target);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete this request.");
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
                "Automated Performance Reporting"
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
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 font-bold text-white text-[10px] dark:bg-zinc-100 dark:text-zinc-900">
                M
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">MarketerOS</span>
            </div>

            <div className="ml-auto">
              {signup ? "Already have an account?" : "Don't have an account?"}
              <button
                onClick={() =>
                  router.push(
                    signup
                      ? `/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                      : `/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                  )
                }
                className="ml-1 font-semibold text-zinc-900 underline dark:text-zinc-100"
              >
                {signup ? "Sign in" : "Sign up"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-7 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {signup
                ? "Start your workspace. Enter your credentials below."
                : "Enter your credentials to access your workspace."}
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4 text-xs">
              {signup && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Heet Patel"
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

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Password</label>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-clean mt-1 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-2.5"
                >
                  {busy ? "Signing in…" : signup ? "Create Account" : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
