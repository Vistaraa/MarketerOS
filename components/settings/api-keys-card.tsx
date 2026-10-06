"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; lastUsedAt: string | null; revokedAt: string | null; createdAt: string };

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Never");

/** Settings → API Key Management: read-only developer keys (create, show once, revoke). */
export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/settings/api-keys");
    const json = await res.json().catch(() => null);
    if (res.ok) setKeys(json.data.items);
    else setError(json?.error?.message || "Couldn't load API keys.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Couldn't create the key.");
      setSecret(json.data.secret);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the key.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(key: ApiKey) {
    if (!window.confirm(`Revoke "${key.name}"? Anything using it stops working immediately.`)) return;
    const res = await fetch(`/api/v1/settings/api-keys/${key.id}`, { method: "DELETE" });
    if (!res.ok) setError("Couldn't revoke the key.");
    await load();
  }

  const active = (keys || []).filter((k) => !k.revokedAt);
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 space-y-4">
      <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100"><KeyRound size={15} /> Developer API keys</h3>
        <p className="mt-0.5 text-xs text-zinc-400">
          Read-only access to this workspace&apos;s data for scripts and BI tools: send <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> to <code className="font-mono">GET /api/v1/…</code> (e.g. <code className="font-mono">/api/v1/campaigns</code>). Limited to 300 requests per minute per key.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      {secret && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Copy this key now. For your security it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-sm bg-white px-2 py-1 font-mono text-[11px] dark:bg-zinc-900">{secret}</code>
            <button className="btn-secondary flex items-center gap-1" onClick={() => navigator.clipboard?.writeText(secret)}><Copy size={12} /> Copy</button>
          </div>
          <button className="btn-primary" onClick={() => setSecret(null)}>Done</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" placeholder="Key name, e.g. Looker Studio" value={name} onChange={(e) => setName(e.target.value)} aria-label="Key name" maxLength={80} />
        <button className="btn-primary flex items-center gap-1" disabled={busy || !name.trim()} onClick={create}><Plus size={13} /> Create key</button>
      </div>
      {keys === null ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : active.length === 0 ? (
        <p className="text-xs text-zinc-500">No active keys.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
          {active.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{key.name}</p>
                <p className="text-zinc-500"><code className="font-mono">{key.prefix}…</code> · read-only · created {formatDate(key.createdAt)} · last used {formatDate(key.lastUsedAt)}</p>
              </div>
              <button className="btn-secondary flex items-center gap-1 text-rose-700" onClick={() => revoke(key)}><Trash2 size={12} /> Revoke</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
