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

      const target = returnTo || payload.data?.next || (signup ? "/onboarding/brand" : "/overview");
      router.push(target);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete this request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#faf9ff]">
      {/* Brand Sidebar */}
      <div className="hidden w-[42%] overflow-hidden bg-gradient-to-br from-[#07152f] via-[#111a43] to-[#321a73] p-10 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-white">
            Marketer<span className="text-[#9677ff]">OS</span>
          </div>
          <div className="mt-20 max-w-[480px]">
            <h2 className="text-[38px] font-extrabold leading-[1.12] tracking-[-.05em] text-white">
              The all-in-one platform<br />
              to <span className="text-[#9677ff]">grow your brand</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#c0c7d7]">
              Connect your marketing channels, analyze performance, get AI-powered insights, and scale your growth with full workspace isolation.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Unified Multi-Channel Analytics",
                "Automated Reporting & AI Insights",
                "Live Platform Integrations",
                "Audience & Lead Management",
              ].map((item) => (
                <div className="flex items-center gap-3.5" key={item}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[#9677ff]">
                    <Sparkles size={16} />
                  </span>
                  <div className="text-xs font-bold text-white">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[.05] p-4 text-xs text-[#a5b2cc]">
          🔒 Secure session tokens stored at rest with encrypted provider keys.
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex flex-1 flex-col p-5 sm:p-10">
        <div className="flex items-center justify-between text-xs text-[#65728a]">
          <div className="text-xs font-semibold text-[#65728a] lg:hidden">
            Marketer<span className="text-[#6940e8] font-bold">OS</span>
          </div>
          <div className="ml-auto">
            {signup ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => router.push(signup ? `/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : `/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`)}
              className="ml-1 font-bold text-[#5e3cdb] hover:underline"
            >
              {signup ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-6 w-full max-w-[560px] rounded-2xl border border-[#e7e9f0] bg-white p-6 shadow-[0_12px_35px_rgba(22,31,54,.06)] sm:mt-12 sm:p-9">
          <h1 className="text-[26px] font-extrabold tracking-[-.05em] text-[#111a2e]">{title}</h1>
          <p className="mt-1.5 text-xs text-[#6d7890]">
            {signup
              ? "Start your workspace. Fill in your details below to get started."
              : "Enter your credentials to access your marketing workspace."}
          </p>

          {returnTo && (
            <div className="mt-4 rounded-lg border border-[#e3dcfc] bg-[#f8f5ff] p-3 text-xs text-[#5e3cdb]">
              Please sign in to continue to <strong>{returnTo}</strong>.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {signup && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#28354d]">Full Name *</label>
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Rohan Mehta"
                  className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs text-[#28354d] outline-none placeholder:text-[#a0a9b8] focus:border-[#9d8af5] focus:ring-4 focus:ring-[#f0edff]"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#28354d]">Email Address *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs text-[#28354d] outline-none placeholder:text-[#a0a9b8] focus:border-[#9d8af5] focus:ring-4 focus:ring-[#f0edff]"
              />
            </div>

            {(signup || mode === "login" || mode === "reset-password") && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#28354d]">Password *</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs text-[#28354d] outline-none placeholder:text-[#a0a9b8] focus:border-[#9d8af5] focus:ring-4 focus:ring-[#f0edff]"
                />
              </div>
            )}

            {signup && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#28354d]">Workspace / Company Name *</label>
                <input
                  required
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-10 w-full rounded-lg border border-[#dfe3eb] px-3 text-xs text-[#28354d] outline-none placeholder:text-[#a0a9b8] focus:border-[#9d8af5] focus:ring-4 focus:ring-[#f0edff]"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-[#f2c4c8] bg-[#fff8f8] p-3 text-xs text-[#b72e38]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6937e7] to-[#7445ed] text-xs font-bold text-white shadow-[0_5px_13px_rgba(105,55,231,.2)] transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-[#e8e2ff]",
                busy && "opacity-60 cursor-not-allowed"
              )}
            >
              {busy
                ? "Signing in…"
                : signup
                ? "Create Workspace Account"
                : mode === "verify-email"
                ? "Resend Email"
                : "Sign In to Workspace"}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#718098]">
            <ShieldCheck size={15} /> Your credentials and session tokens are encrypted and secured.
          </div>
        </div>
      </div>
    </div>
  );
}

