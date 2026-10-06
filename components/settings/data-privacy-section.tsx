"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileJson, LogOut, RotateCcw, Trash2 } from "lucide-react";

type ExportItem = { id: string; status: "PENDING" | "READY" | "FAILED"; sizeBytes: number | null; createdAt: string; expiresAt: string | null; errorMessage: string | null; downloadUrl: string | null };
type Privacy = { workspaceName: string; isOwner: boolean; workspaceDeletion: { purgeAt: string } | null; graceDays: number; termsAcceptedAt: string | null; termsVersion: string | null };

const card = "rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4";
const heading = "font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-100 pb-3 dark:border-zinc-800";
const input = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900";
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const formatSize = (bytes: number | null) => (bytes === null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** After leaving or deleting the account the session is gone: a full page load to sign-in clears all client state. */
const signOutRedirect = () => window.location.assign(new URL("/auth/login", window.location.origin).toString());

async function post(path: string, body?: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Something went wrong. Please try again.");
  return json?.data;
}

/** Settings → Data & privacy: export, leave, and delete (workspace or account), each confirmed explicitly. */
export function DataPrivacySection() {
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [wsConfirm, setWsConfirm] = useState({ name: "", password: "" });
  const [accountConfirm, setAccountConfirm] = useState({ text: "", password: "" });

  const load = useCallback(async () => {
    const p = await fetch("/api/v1/settings/privacy").then((r) => r.json()).catch(() => null);
    if (p?.data) setPrivacy(p.data);
    if (p?.data?.isOwner) {
      const e = await fetch("/api/v1/settings/export").then((r) => r.json()).catch(() => null);
      setExports(e?.data?.items || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(key: string, action: () => Promise<string | void>) {
    setBusy(key);
    setMessage(null);
    try {
      const text = await action();
      if (text) setMessage({ tone: "ok", text });
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  if (!privacy) return <div className={card}><p className="text-zinc-500">Loading…</p></div>;
  const pendingExport = exports.some((e) => e.status === "PENDING");

  return (
    <div className="space-y-6">
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "rounded-lg bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}>
          {message.text}
        </p>
      )}

      {privacy.isOwner && (
        <section className={card}>
          <h3 className={heading}>Export workspace data</h3>
          <p className="text-zinc-500">Download everything in &ldquo;{privacy.workspaceName}&rdquo; as one JSON file: clients, leads, campaigns, metrics, content, reports, team and billing history. Credentials are never included. We email you when it&apos;s ready; the file is deleted after 7 days.</p>
          <button
            className="btn-secondary flex items-center gap-1"
            disabled={busy === "export" || pendingExport}
            onClick={() => run("export", async () => { await post("/api/v1/settings/export"); return "Export requested. We'll email you when it's ready to download."; })}
          >
            <FileJson size={13} /> {pendingExport ? "Export in progress…" : "Request export"}
          </button>
          {exports.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {exports.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <span>
                    {formatDate(e.createdAt)} · {e.status === "READY" ? `Ready (${formatSize(e.sizeBytes)}), available until ${formatDate(e.expiresAt)}` : e.status === "PENDING" ? "Preparing…" : e.errorMessage || "Failed"}
                  </span>
                  {e.downloadUrl && <a href={e.downloadUrl} className="btn-secondary flex items-center gap-1"><Download size={13} /> Download</a>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {privacy.isOwner ? (
        <section className={`${card} border-rose-200 dark:border-rose-900/60`}>
          <h3 className={heading}>Delete workspace</h3>
          {privacy.workspaceDeletion ? (
            <>
              <p className="text-rose-700 dark:text-rose-300">&ldquo;{privacy.workspaceName}&rdquo; is scheduled for permanent deletion on {formatDate(privacy.workspaceDeletion.purgeAt)}.</p>
              <button className="btn-secondary flex items-center gap-1" disabled={busy === "restore"} onClick={() => run("restore", async () => { await post("/api/v1/settings/workspace/restore"); return "Deletion cancelled. Your workspace is safe."; })}>
                <RotateCcw size={13} /> Cancel deletion
              </button>
            </>
          ) : (
            <>
              <p className="text-zinc-500">Deletes the workspace, its data, uploaded files and team access after a {privacy.graceDays}-day grace period, during which you can cancel. Export your data first if you need it.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder={`Type "${privacy.workspaceName}" to confirm`} value={wsConfirm.name} onChange={(e) => setWsConfirm({ ...wsConfirm, name: e.target.value })} aria-label="Workspace name" />
                <input className={input} type="password" placeholder="Your password" value={wsConfirm.password} onChange={(e) => setWsConfirm({ ...wsConfirm, password: e.target.value })} aria-label="Password" autoComplete="current-password" />
              </div>
              <button
                className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={busy === "deleteWs" || wsConfirm.name.trim().toLowerCase() !== privacy.workspaceName.trim().toLowerCase() || !wsConfirm.password}
                onClick={() => run("deleteWs", async () => {
                  const data = await post("/api/v1/settings/workspace/delete", { confirmName: wsConfirm.name, password: wsConfirm.password });
                  setWsConfirm({ name: "", password: "" });
                  return `Workspace scheduled for deletion on ${formatDate(data.purgeAt)}. You can cancel until then.`;
                })}
              >
                <Trash2 size={13} /> Delete workspace
              </button>
            </>
          )}
        </section>
      ) : (
        <section className={card}>
          <h3 className={heading}>Leave workspace</h3>
          <p className="text-zinc-500">Removes your access to &ldquo;{privacy.workspaceName}&rdquo;. Leads assigned to you become unassigned. You&apos;ll be signed out.</p>
          <button
            className="btn-secondary flex items-center gap-1"
            disabled={busy === "leave"}
            onClick={() => {
              if (!window.confirm(`Leave "${privacy.workspaceName}"?`)) return;
              run("leave", async () => { await post("/api/v1/team/leave"); signOutRedirect(); });
            }}
          >
            <LogOut size={13} /> Leave workspace
          </button>
        </section>
      )}

      <section className={`${card} border-rose-200 dark:border-rose-900/60`}>
        <h3 className={heading}>Delete my account</h3>
        <p className="text-zinc-500">
          Signs you out everywhere and deletes your account{privacy.isOwner ? " and the workspaces you own" : ""} after {privacy.graceDays} days. Signing in again before then cancels it.
          {privacy.termsAcceptedAt && <> You accepted the Terms (version {privacy.termsVersion}) on {formatDate(privacy.termsAcceptedAt)}.</>}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={input} placeholder='Type "DELETE" to confirm' value={accountConfirm.text} onChange={(e) => setAccountConfirm({ ...accountConfirm, text: e.target.value })} aria-label="Confirmation" />
          <input className={input} type="password" placeholder="Your password" value={accountConfirm.password} onChange={(e) => setAccountConfirm({ ...accountConfirm, password: e.target.value })} aria-label="Password" autoComplete="current-password" />
        </div>
        <button
          className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          disabled={busy === "deleteAccount" || accountConfirm.text !== "DELETE" || !accountConfirm.password}
          onClick={() => run("deleteAccount", async () => {
            await post("/api/v1/settings/account/delete", { confirm: "DELETE", password: accountConfirm.password });
            signOutRedirect();
          })}
        >
          <Trash2 size={13} /> Delete my account
        </button>
      </section>
    </div>
  );
}
