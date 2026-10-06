"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

type Status = { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number };
type Setup = { secret: string; otpauthUrl: string; qrCode: string };

const card = "rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4";
const input = "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900";

async function post(path: string, body?: unknown) {
  const res = await fetch(`/api/v1/settings/2fa/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Something went wrong. Please try again.");
  return json?.data;
}

/** Settings → Security: authenticator-app (TOTP) two-factor authentication. Recommended for owners and admins. */
export function TwoFactorCard({ role }: { role?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/settings/2fa").then((r) => r.json()).catch(() => null);
    if (res?.data) setStatus(res.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const privileged = ["OWNER", "ADMIN"].includes((role || "").toUpperCase());

  return (
    <div className={card}>
      <h3 className="flex items-center gap-2 border-b border-zinc-100 pb-3 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
        <KeyRound size={15} /> Two-factor authentication
        {status?.enabled && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">On</span>}
      </h3>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {recoveryCodes && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Save these recovery codes now. They won&apos;t be shown again.</p>
          <p className="text-amber-900/80 dark:text-amber-200/80">Each code signs you in once if you lose your phone.</p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-5">{recoveryCodes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}>Copy</button>
            <button className="btn-primary" onClick={() => setRecoveryCodes(null)}>I&apos;ve saved them</button>
          </div>
        </div>
      )}

      {!status ? (
        <p className="text-zinc-500">Loading…</p>
      ) : status.enabled ? (
        <>
          <p className="text-zinc-500">
            Signing in needs your password and a code from your authenticator app. {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? "" : "s"} left.
          </p>
          <div className="flex flex-wrap gap-2">
            <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" autoComplete="current-password" />
            <input className={`${input} w-32 font-mono`} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Authentication code" autoComplete="one-time-code" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={busy || !password || code.length < 6} onClick={() => run(async () => { const d = await post("recovery-codes", { password, code }); setRecoveryCodes(d.recoveryCodes); setPassword(""); setCode(""); })}>
              New recovery codes
            </button>
            <button className="btn-secondary flex items-center gap-1 text-rose-700" disabled={busy || !password || code.length < 6} onClick={() => run(async () => { await post("disable", { password, code }); setPassword(""); setCode(""); })}>
              <ShieldOff size={13} /> Turn off
            </button>
          </div>
        </>
      ) : setup ? (
        <>
          <p className="text-zinc-500">Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.</p>
          <div className="flex flex-wrap items-center gap-4">
            <img src={setup.qrCode} alt="QR code for your authenticator app" width={180} height={180} className="rounded-lg border border-zinc-200 bg-white p-1" />
            <div className="space-y-1">
              <p className="text-zinc-500">Can&apos;t scan? Enter this key:</p>
              <code className="block break-all font-mono text-sm">{setup.secret.match(/.{1,4}/g)?.join(" ")}</code>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className={`${input} w-32 font-mono`} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Authentication code" autoComplete="one-time-code" inputMode="numeric" />
            <button className="btn-primary" disabled={busy || code.length < 6} onClick={() => run(async () => { const d = await post("enable", { code }); setRecoveryCodes(d.recoveryCodes); setSetup(null); setCode(""); })}>
              Verify and turn on
            </button>
            <button className="btn-secondary" onClick={() => { setSetup(null); setCode(""); }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-zinc-500">
            Protect your account with a code from your phone in addition to your password.
            {privileged && " Strongly recommended for owners and admins, who can manage billing, members and integrations."}
          </p>
          <button className="btn-primary flex items-center gap-1" disabled={busy} onClick={() => run(async () => setSetup(await post("setup")))}>
            <ShieldCheck size={13} /> Set up two-factor authentication
          </button>
        </>
      )}
    </div>
  );
}
